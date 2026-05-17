(function () {
  const CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  function loadSupabase() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-supabase-realtime="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.supabase));
        existing.addEventListener("error", reject);
        return;
      }
      const script = document.createElement("script");
      script.src = CDN;
      script.async = true;
      script.dataset.supabaseRealtime = "true";
      script.onload = () => resolve(window.supabase);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  window.createRealtimeRoom = async function createRealtimeRoom(options) {
    const params = new URLSearchParams(location.search);
    const supabaseUrl = params.get("sbUrl");
    const supabaseKey = params.get("sbKey");
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Faltan credenciales publicas de Supabase.");
    }

    const supabaseGlobal = await loadSupabase();
    const client = supabaseGlobal.createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 30 } },
    });
    const maxPlayers = Math.max(2, Number(params.get("maxPlayers") || options.maxPlayers || 10));

    let channel = null;
    let activeRoom = "";
    const playerId = options.playerId || Math.random().toString(36).slice(2, 10);
    const profile = options.profile || {};
    const localWins = {};
    const localPoints = {};

    function getPlayers() {
      return channel
        ? Object.values(channel.presenceState())
            .flat()
            .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0))
        : [];
    }

    function syncPlayersPanel() {
      const players = getPlayers().slice(0, maxPlayers);
      const leaderboard = players.map((p) => {
        const playerKey = p.userId || p.playerId;
        return {
          userId: playerKey,
          name: p.displayName || "Jugador",
          avatarUrl: p.avatarUrl || "",
          wins: localWins[playerKey] || p.wins || 0,
          points: localPoints[playerKey] ?? p.points ?? 0,
          playerId: p.playerId || playerKey,
          joinedAt: p.joinedAt || 0,
        };
      });

      window.parent?.postMessage({ type: "game:updateLeaderboard", players: leaderboard }, "*");
    }

    const disconnect = async () => {
      if (channel) await client.removeChannel(channel);
      channel = null;
      activeRoom = "";
      window.parent?.postMessage({ type: "game:updateLeaderboard", players: [] }, "*");
    };

    const connect = async (room) => {
      const nextRoom = String(room || "").trim().toUpperCase();
      if (!nextRoom) throw new Error("Sala vacia.");
      await disconnect();
      activeRoom = nextRoom;
      channel = client.channel(`forbiddens:${options.game}:${nextRoom}`, {
        config: { broadcast: { self: false }, presence: { key: playerId } },
      });
      channel.on("broadcast", { event: "game" }, ({ payload }) => {
        if (payload?.from === playerId) return;
        if (payload?.type === "win" && payload.payload?.userId) {
          localWins[payload.payload.userId] = (localWins[payload.payload.userId] || 0) + 1;
          localPoints[payload.payload.userId] = (localPoints[payload.payload.userId] || 0) + (payload.payload.awarded || 0);
          syncPlayersPanel();
        }
        options.onMessage?.(payload);
      });
      channel.on("presence", { event: "sync" }, () => {
        const players = getPlayers();
        const count = players.length;
        syncPlayersPanel();
        options.onPeers?.(count, players);
      });
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("No se pudo conectar a la sala.")), 8000);
        channel.subscribe(async (status) => {
          options.onStatus?.(status);
          if (status === "SUBSCRIBED") {
            clearTimeout(timeout);
            await channel.track({
              playerId,
              userId: profile.userId || playerId,
            displayName: profile.displayName || "Jugador",
            avatarUrl: profile.avatarUrl || "",
            wins: localWins[profile.userId || playerId] || 0,
            points: localPoints[profile.userId || playerId] || 0,
            joinedAt: Date.now(),
          });
            resolve(nextRoom);
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            clearTimeout(timeout);
            reject(new Error("Realtime no esta disponible."));
          }
        });
      });
    };

    const send = (type, payload) => {
      if (!channel || !activeRoom) return;
      channel.send({
        type: "broadcast",
        event: "game",
        payload: { from: playerId, type, payload, sentAt: Date.now() },
      });
    };

    const awardWin = async (gameSlug) => {
      const userId = profile.userId;
      if (!userId) return { awarded: 0, reason: "anonymous" };
      let result = { awarded: 0, reason: "rpc_missing" };
      try {
        const { data, error } = await client.rpc("award_multiplayer_win", {
          p_game_slug: gameSlug || options.game,
          p_room_code: activeRoom,
          p_points: 25,
        });
        if (error) {
          result = { awarded: 0, reason: error.message };
        } else {
          result = data || { awarded: 0, reason: "empty_response" };
        }
      } catch (e) {
        result = { awarded: 0, reason: e?.message || "rpc_missing" };
      }
      localWins[userId] = (localWins[userId] || 0) + 1;
      localPoints[userId] = (localPoints[userId] || 0) + (result.awarded || 0);
      if (channel && activeRoom) {
        await channel.track({
          playerId,
          userId,
          displayName: profile.displayName || "Jugador",
          avatarUrl: profile.avatarUrl || "",
          wins: localWins[userId],
          points: localPoints[userId],
          joinedAt: Date.now(),
        });
      }
      syncPlayersPanel();
      if ((result.awarded || 0) > 0) {
        window.parent?.postMessage({ type: "game:pointsAwarded", awarded: result.awarded || 0, total: result.leaderboard_score || 0 }, "*");
      }
      send("win", { userId, displayName: profile.displayName || "Jugador", gameSlug, room: activeRoom, awarded: result.awarded || 0 });
      return result;
    };

    return { connect, disconnect, send, awardWin, playerId, getPlayers, get room() { return activeRoom; } };
  };
})();
