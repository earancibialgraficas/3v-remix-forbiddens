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

    let channel = null;
    let activeRoom = "";
    const playerId = options.playerId || Math.random().toString(36).slice(2, 10);
    const profile = options.profile || {};
    const localWins = {};
    const localPoints = {};

    function escapeHtml(value) {
      return String(value || "").replace(/[&<>"']/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch]));
    }

    function renderPlayers() {
      let panel = document.getElementById("forbiddens-players");
      if (!panel) {
        panel = document.createElement("aside");
        panel.id = "forbiddens-players";
        panel.innerHTML = '<div class="fp-title">JUGADORES</div><div class="fp-list"></div>';
        const style = document.createElement("style");
        style.textContent = `
          #forbiddens-players{position:fixed;left:10px;top:54px;z-index:20;width:170px;max-width:34vw;border:1px solid rgba(34,211,238,.35);border-radius:12px;background:rgba(2,6,23,.78);backdrop-filter:blur(10px);box-shadow:0 12px 32px rgba(0,0,0,.35);padding:8px;color:#f8fafc;font-family:Inter,Arial,sans-serif}
          #forbiddens-players .fp-title{font-size:9px;letter-spacing:.12em;color:#67e8f9;margin-bottom:7px;font-weight:800}
          #forbiddens-players .fp-row{display:flex;align-items:center;gap:8px;padding:6px;border-radius:9px;background:rgba(15,23,42,.74);margin-top:6px;border:1px solid rgba(148,163,184,.15)}
          #forbiddens-players .fp-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover;background:#111827;border:1px solid rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;overflow:hidden}
          #forbiddens-players .fp-name{font-size:11px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          #forbiddens-players .fp-points{font-size:9px;color:#86efac;margin-top:2px}
          @media (max-width:700px){#forbiddens-players{top:auto;bottom:10px;left:10px;right:10px;width:auto;max-width:none}.fp-list{display:grid;grid-template-columns:1fr 1fr;gap:6px}#forbiddens-players .fp-row{margin-top:0}}
        `;
        document.head.appendChild(style);
        document.body.appendChild(panel);
      }
      const list = panel.querySelector(".fp-list");
      const players = channel ? Object.values(channel.presenceState()).flat().slice(0, 4) : [];
      list.innerHTML = players.map((p) => {
        const name = escapeHtml(p.displayName || "Jugador");
        const avatarUrl = escapeHtml(p.avatarUrl || "");
        const avatar = avatarUrl ? `<img src="${avatarUrl}" alt="" class="fp-avatar" />` : `<div class="fp-avatar">${name.slice(0, 1).toUpperCase()}</div>`;
        const wins = localWins[p.userId || p.playerId] || p.wins || 0;
        const points = localPoints[p.userId || p.playerId] ?? p.points ?? 0;
        return `<div class="fp-row">${avatar}<div style="min-width:0"><div class="fp-name">${name}</div><div class="fp-points">${wins} victorias · ${points} pts</div></div></div>`;
      }).join("");
    }

    const disconnect = async () => {
      if (channel) await client.removeChannel(channel);
      channel = null;
      activeRoom = "";
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
          renderPlayers();
        }
        options.onMessage?.(payload);
      });
      channel.on("presence", { event: "sync" }, () => {
        const count = Object.keys(channel.presenceState()).length;
        renderPlayers();
        options.onPeers?.(count);
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
              wins: 0,
              points: 0,
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
      renderPlayers();
      send("win", { userId, displayName: profile.displayName || "Jugador", gameSlug, room: activeRoom, awarded: result.awarded || 0 });
      return result;
    };

    return { connect, disconnect, send, awardWin, playerId, get room() { return activeRoom; } };
  };
})();
