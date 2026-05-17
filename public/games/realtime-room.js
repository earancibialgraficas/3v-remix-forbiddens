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
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 30 } },
    });

    let channel = null;
    let activeRoom = "";
    const playerId = options.playerId || Math.random().toString(36).slice(2, 10);

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
        options.onMessage?.(payload);
      });
      channel.on("presence", { event: "sync" }, () => {
        const count = Object.keys(channel.presenceState()).length;
        options.onPeers?.(count);
      });
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("No se pudo conectar a la sala.")), 8000);
        channel.subscribe(async (status) => {
          options.onStatus?.(status);
          if (status === "SUBSCRIBED") {
            clearTimeout(timeout);
            await channel.track({ playerId, joinedAt: Date.now() });
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

    return { connect, disconnect, send, playerId, get room() { return activeRoom; } };
  };
})();
