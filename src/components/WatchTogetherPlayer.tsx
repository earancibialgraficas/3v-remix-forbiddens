import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, ListVideo, Pause, Play, Plus, Settings, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface WatchSong {
  id: string;
  title: string;
  url: string;
  youtubeId: string;
}

interface WatchState {
  playlist: WatchSong[];
  currentIndex: number;
  isPlaying: boolean;
  position: number;
  startedAt: number;
}

interface WatchTogetherPlayerProps {
  roomCode: string;
  userName: string;
  controlsTargetId?: string;
}

const formatTime = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
};

const getYoutubeId = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "").slice(0, 32) || "";
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/")[2] || "";
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2] || "";
      return parsed.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }
  return "";
};

const titleFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname);
  } catch {
    return "Video compartido";
  }
};

const fetchYoutubeTitle = async (url: string) => {
  for (const endpoint of [
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
    `https://noembed.com/embed?url=${encodeURIComponent(url)}`,
  ]) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) continue;
      const data = await response.json();
      if (typeof data?.title === "string" && data.title.trim()) return data.title.trim();
    } catch {
      // Try the next public metadata endpoint.
    }
  }
  return "";
};

const emptyState = (): WatchState => ({
  playlist: [],
  currentIndex: 0,
  isPlaying: false,
  position: 0,
  startedAt: Date.now(),
});

export default function WatchTogetherPlayer({ roomCode, userName, controlsTargetId }: WatchTogetherPlayerProps) {
  const [playlist, setPlaylist] = useState<WatchSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [controlsElement, setControlsElement] = useState<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const channelRef = useRef<any>(null);
  const stateRef = useRef<WatchState>(emptyState());
  const effectiveVolumeRef = useRef(80);
  const applyingRemoteStateRef = useRef(false);
  const nativeStateBroadcastRef = useRef(0);
  const clientIdRef = useRef(`watch_${Math.random().toString(36).slice(2, 10)}`);
  const titleFetchRef = useRef(0);

  const current = playlist[currentIndex];
  const effectiveVolume = muted ? 0 : volume;

  useEffect(() => {
    effectiveVolumeRef.current = effectiveVolume;
  }, [effectiveVolume]);

  useEffect(() => {
    if (!controlsTargetId || typeof document === "undefined") {
      setControlsElement(null);
      return;
    }
    const readTarget = () => setControlsElement(document.getElementById(controlsTargetId));
    readTarget();
    const frame = window.requestAnimationFrame(readTarget);
    return () => window.cancelAnimationFrame(frame);
  }, [controlsTargetId]);

  const sendCommand = useCallback((func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  }, []);

  const getSnapshot = useCallback((): WatchState => ({
    playlist,
    currentIndex,
    isPlaying,
    position: currentTime,
    startedAt: Date.now(),
  }), [currentIndex, currentTime, isPlaying, playlist]);

  const applyState = useCallback((state: WatchState) => {
    const safePlaylist = Array.isArray(state.playlist) ? state.playlist : [];
    const safeIndex = Math.min(Math.max(0, Number(state.currentIndex || 0)), Math.max(0, safePlaylist.length - 1));
    const playing = Boolean(state.isPlaying && safePlaylist.length);
    const position = Math.max(0, Number(state.position || 0));
    const startedAt = Number(state.startedAt || Date.now());
    const target = position + (playing ? Math.max(0, (Date.now() - startedAt) / 1000) : 0);

    stateRef.current = { playlist: safePlaylist, currentIndex: safeIndex, isPlaying: playing, position, startedAt };
    setPlaylist(safePlaylist);
    setCurrentIndex(safeIndex);
    setIsPlaying(playing);
    setCurrentTime(target);
    applyingRemoteStateRef.current = true;

    const drive = () => {
      const localVolume = effectiveVolumeRef.current;
      sendCommand("seekTo", [target, true]);
      sendCommand(playing ? "playVideo" : "pauseVideo");
      sendCommand("setVolume", [localVolume]);
      sendCommand(localVolume <= 0 ? "mute" : "unMute");
    };
    drive();
    window.setTimeout(drive, 450);
    window.setTimeout(() => {
      applyingRemoteStateRef.current = false;
    }, 900);
  }, [sendCommand]);

  const publishState = useCallback((next: Partial<WatchState> = {}) => {
    const state = { ...getSnapshot(), ...next };
    stateRef.current = state;
    void channelRef.current?.send({
      type: "broadcast",
      event: "watch",
      payload: { type: "state", sender: clientIdRef.current, room: roomCode, userName, state },
    });
  }, [getSnapshot, roomCode, userName]);

  useEffect(() => {
    const channel = supabase.channel(`forbiddens:watch-together:${roomCode}`, {
      config: { presence: { key: clientIdRef.current } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "watch" }, ({ payload }: any) => {
      if (!payload || payload.sender === clientIdRef.current || payload.room !== roomCode) return;
      if (payload.type === "request_state") {
        if (!stateRef.current.playlist.length) return;
        void channel.send({
          type: "broadcast",
          event: "watch",
          payload: { type: "state", sender: clientIdRef.current, room: roomCode, userName, state: stateRef.current },
        });
      }
      if (payload.type === "state" && payload.state) applyState(payload.state);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ userName, joinedAt: Date.now() });
        void channel.send({
          type: "broadcast",
          event: "watch",
          payload: { type: "request_state", sender: clientIdRef.current, room: roomCode, userName },
        });
      }
    });

    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [applyState, roomCode, userName]);

  useEffect(() => {
    stateRef.current = getSnapshot();
  }, [getSnapshot]);

  useEffect(() => {
    sendCommand("setVolume", [effectiveVolume]);
    sendCommand(effectiveVolume <= 0 ? "mute" : "unMute");
  }, [effectiveVolume, sendCommand]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: clientIdRef.current }), "*");
      sendCommand("getCurrentTime");
      sendCommand("getDuration");
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sendCommand]);

  const playPause = () => {
    if (!current) return;
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    sendCommand(nextPlaying ? "playVideo" : "pauseVideo");
    publishState({ isPlaying: nextPlaying, position: currentTime, startedAt: Date.now() });
  };

  const toggleCaptions = () => {
    const next = !captionsEnabled;
    setCaptionsEnabled(next);
    sendCommand("setOption", ["captions", "track", next ? {} : null]);
    sendCommand(next ? "loadModule" : "unloadModule", ["captions"]);
  };

  const jumpTo = useCallback((index: number) => {
    if (!playlist.length) return;
    const nextIndex = (index + playlist.length) % playlist.length;
    setCurrentIndex(nextIndex);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);
    publishState({ currentIndex: nextIndex, isPlaying: true, position: 0, startedAt: Date.now() });
  }, [playlist.length, publishState]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.event !== "infoDelivery" || !data.info) return;
        const reportedTime = typeof data.info.currentTime === "number" ? data.info.currentTime : currentTime;
        if (typeof data.info.currentTime === "number") setCurrentTime(data.info.currentTime);
        if (typeof data.info.duration === "number" && data.info.duration > 0) setDuration(data.info.duration);
        if ((data.info.playerState === 1 || data.info.playerState === 2) && current) {
          const nextPlaying = data.info.playerState === 1;
          const shouldBroadcast = nextPlaying !== isPlaying && !applyingRemoteStateRef.current && Date.now() - nativeStateBroadcastRef.current > 600;
          setIsPlaying(nextPlaying);
          if (shouldBroadcast) {
            nativeStateBroadcastRef.current = Date.now();
            publishState({ isPlaying: nextPlaying, position: reportedTime, startedAt: Date.now() });
          }
        }
        if (data.info.playerState === 0 && playlist.length > 1) jumpTo(currentIndex + 1);
      } catch {
        // Ignore unrelated postMessage traffic.
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [current, currentIndex, currentTime, isPlaying, jumpTo, playlist.length, publishState]);

  const addVideo = async () => {
    const url = newUrl.trim();
    const youtubeId = getYoutubeId(url);
    if (!youtubeId) return;
    const title = newTitle.trim() || await fetchYoutubeTitle(url) || titleFromUrl(url);
    const nextVideo = { id: `${Date.now()}_${youtubeId}`, title, url, youtubeId };
    const nextPlaylist = [...playlist, nextVideo];
    const nextIndex = playlist.length ? currentIndex : 0;
    const nextPlaying = playlist.length ? isPlaying : true;
    setPlaylist(nextPlaylist);
    setCurrentIndex(nextIndex);
    setIsPlaying(nextPlaying);
    setNewUrl("");
    setNewTitle("");
    publishState({ playlist: nextPlaylist, currentIndex: nextIndex, isPlaying: nextPlaying, position: playlist.length ? currentTime : 0, startedAt: Date.now() });
  };

  const handleUrlChange = (url: string) => {
    setNewUrl(url);
    const youtubeId = getYoutubeId(url.trim());
    if (!youtubeId) return;
    const fetchId = titleFetchRef.current + 1;
    titleFetchRef.current = fetchId;
    void fetchYoutubeTitle(url.trim()).then((title) => {
      if (!title || titleFetchRef.current !== fetchId) return;
      setNewTitle((currentTitle) => currentTitle.trim() ? currentTitle : title);
    });
  };

  const controls = (
    <div className="bg-black/35 p-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <div
          className="relative flex h-9 min-w-0 flex-1 flex-col justify-center overflow-hidden rounded border border-neon-cyan/25 bg-black/60 px-2"
          style={{ boxShadow: "inset 0 0 6px rgba(34,211,238,0.18)" }}
        >
          <div className="flex w-max animate-marquee-x whitespace-nowrap">
            {[0, 1].map((copy) => (
              <span
                key={copy}
                className="font-pixel leading-none px-2"
                style={{ color: "#00f2fe", fontSize: "9px", letterSpacing: "1px", textShadow: "0 0 3px rgba(34,211,238,.9), 0 0 6px rgba(34,211,238,.55)" }}
              >
                {current?.title ? `> ${current.title}` : "> Sin video"} &nbsp;-&nbsp;
              </span>
            ))}
          </div>
          <p className="mt-0.5 truncate font-pixel text-[7px] text-neon-cyan/90">
            YouTube - {formatTime(currentTime)} / {duration ? formatTime(duration) : "0:00"}
          </p>
        </div>
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-1.5">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => jumpTo(currentIndex - 1)} disabled={!playlist.length} title="Anterior" aria-label="Anterior"><SkipBack className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={playPause} disabled={!current} title={isPlaying ? "Pausar" : "Reproducir"} aria-label={isPlaying ? "Pausar" : "Reproducir"}>{isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => jumpTo(currentIndex + 1)} disabled={!playlist.length} title="Siguiente" aria-label="Siguiente"><SkipForward className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setVolumeOpen((v) => !v); setPlaylistOpen(false); setAddOpen(false); setSettingsOpen(false); }} title="Volumen" aria-label="Volumen">{muted || volume <= 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}</Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setPlaylistOpen((v) => !v); setVolumeOpen(false); setAddOpen(false); setSettingsOpen(false); }} disabled={!playlist.length} title="Lista" aria-label="Lista">{playlistOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ListVideo className="h-3.5 w-3.5" />}</Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setSettingsOpen((v) => !v); setVolumeOpen(false); setPlaylistOpen(false); setAddOpen(false); }} title="Configuracion YouTube" aria-label="Configuracion YouTube"><Settings className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAddOpen((v) => !v); setVolumeOpen(false); setPlaylistOpen(false); setSettingsOpen(false); }} title="Agregar video" aria-label="Agregar video">{addOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</Button>
      </div>

      {volumeOpen && (
        <div className="mt-2 flex items-center gap-2 rounded border border-white/10 bg-black/35 px-2 py-1.5">
          <button type="button" onClick={() => setMuted((value) => !value)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-white" title="Silenciar" aria-label="Silenciar">{muted || volume <= 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}</button>
          <Slider value={[volume]} min={0} max={100} step={1} onValueChange={([next]) => { const safeNext = Number(next || 0); setVolume(safeNext); if (safeNext > 0) setMuted(false); }} className="min-w-0 flex-1" aria-label="Volumen local" />
          <span className="w-7 text-right font-pixel text-[6px] text-neon-cyan">{effectiveVolume}</span>
        </div>
      )}

      {settingsOpen && (
        <div className="mt-2 space-y-1 rounded border border-white/10 bg-black/35 p-2">
          <button type="button" onClick={toggleCaptions} className="w-full rounded border border-white/10 px-2 py-1 text-left text-[10px] text-muted-foreground hover:bg-white/10 hover:text-white">
            Subtitulos: {captionsEnabled ? "ON" : "OFF"}
          </button>
          <button type="button" onClick={() => applyState(stateRef.current)} className="w-full rounded border border-white/10 px-2 py-1 text-left text-[10px] text-muted-foreground hover:bg-white/10 hover:text-white">
            Re-sincronizar video
          </button>
          {current && (
            <button type="button" onClick={() => window.open(current.url, "_blank", "noopener,noreferrer")} className="w-full rounded border border-white/10 px-2 py-1 text-left text-[10px] text-muted-foreground hover:bg-white/10 hover:text-white">
              Abrir en YouTube
            </button>
          )}
        </div>
      )}

      {playlistOpen && playlist.length > 0 && (
        <div className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded border border-white/10 bg-black/35 p-1 retro-scrollbar">
          {playlist.map((song, index) => (
            <button key={song.id} type="button" onClick={() => jumpTo(index)} className={cn("flex w-full min-w-0 items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors", index === currentIndex ? "bg-neon-cyan/15 text-neon-cyan" : "text-muted-foreground hover:bg-white/10 hover:text-white")} title={song.title}>
              <span className="w-4 shrink-0 font-pixel text-[6px]">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[8px]">{song.title}</span>
              <span className="shrink-0 font-pixel text-[5px] text-red-300">YT</span>
            </button>
          ))}
        </div>
      )}

      {addOpen && (
        <div className="mt-2 space-y-1.5">
          <Input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Titulo" className="h-7 border-white/10 bg-black/60 px-2 text-[10px]" />
          <div className="flex gap-1">
            <Input value={newUrl} onChange={(event) => handleUrlChange(event.target.value)} placeholder="URL YouTube" className="h-7 min-w-0 border-white/10 bg-black/60 px-2 text-[10px]" onKeyDown={(event) => { if (event.key === "Enter") void addVideo(); }} />
            <Button size="icon" variant="secondary" className="h-7 w-7 shrink-0" onClick={() => void addVideo()} title="Agregar" aria-label="Agregar"><Plus className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-black">
      <div className="relative min-h-0 flex-1 bg-black">
        {current ? (
          <iframe
            key={current.youtubeId}
            ref={iframeRef}
            title={current.title}
            src={`https://www.youtube.com/embed/${current.youtubeId}?enablejsapi=1&autoplay=0&playsinline=1&controls=0&disablekb=1&fs=0&rel=0&modestbranding=1&origin=${encodeURIComponent(window.location.origin)}`}
            allow="autoplay; encrypted-media; fullscreen"
            className="h-full w-full"
            onLoad={() => applyState(stateRef.current)}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_45%)] p-6 text-center">
            <ListVideo className="h-10 w-10 text-neon-cyan" />
            <p className="font-pixel text-[12px] uppercase text-neon-cyan">Watch Together</p>
            <p className="max-w-md text-xs text-muted-foreground">Agrega un link de YouTube para iniciar una lista sincronizada con la sala.</p>
          </div>
        )}
        {current && <div className="absolute inset-0 z-10 cursor-default bg-transparent" title="Usa los controles sincronizados de la derecha" />}
      </div>

      {controlsElement ? createPortal(controls, controlsElement) : <div className="border-t border-neon-cyan/20 bg-black/85">{controls}</div>}
    </div>
  );
}
