import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, Music, Pause, Play, Plus, SkipBack, SkipForward, Trash2, Users, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SharedSong {
  id: string;
  title: string;
  url: string;
  type?: "audio" | "youtube";
  youtubeId?: string;
}

interface SharedMusicState {
  playlist: SharedSong[];
  currentIndex: number;
  isPlaying: boolean;
  position: number;
  startedAt: number;
}

interface MultiplayerSharedMusicPlayerProps {
  gameId: string;
  roomCode: string;
  userName: string;
  showListeners?: boolean;
}

interface MusicListener {
  id: string;
  userName: string;
  joinedAt: number;
}

const MUSIC_ROOMS = [
  { id: "table", label: "Mesa" },
  { id: "shared-1", label: "Sala 1" },
  { id: "shared-2", label: "Sala 2" },
  { id: "shared-3", label: "Sala 3" },
];

const formatTime = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
};

const titleFromUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname;
    return decodeURIComponent(last).replace(/\.[^/.]+$/, "") || parsed.hostname;
  } catch {
    return "Cancion compartida";
  }
};

const getYoutubeId = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "").slice(0, 32) || null;
    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/")[2] || null;
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/")[2] || null;
      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
};

export default function MultiplayerSharedMusicPlayer({ gameId, roomCode, userName, showListeners = false }: MultiplayerSharedMusicPlayerProps) {
  const [selectedRoom, setSelectedRoom] = useState("table");
  const [expanded, setExpanded] = useState(false);
  const [playlist, setPlaylist] = useState<SharedSong[]>([]);
  const [listeners, setListeners] = useState<MusicListener[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [newSongUrl, setNewSongUrl] = useState("");
  const [newSongTitle, setNewSongTitle] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const channelRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clientIdRef = useRef(`music_${Math.random().toString(36).slice(2, 10)}`);
  const pendingSeekRef = useRef<{ position: number; startedAt: number; isPlaying: boolean } | null>(null);
  const stateRef = useRef<SharedMusicState>({
    playlist: [],
    currentIndex: 0,
    isPlaying: false,
    position: 0,
    startedAt: Date.now(),
  });

  const current = playlist[currentIndex];
  const currentYoutubeId = current?.youtubeId || (current?.url ? getYoutubeId(current.url) : null);
  const currentIsYoutube = Boolean(currentYoutubeId);
  const activeRoomId = selectedRoom === "table" ? `${gameId}:${roomCode}` : selectedRoom;
  const effectiveVolume = muted ? 0 : volume;

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setListeners([]);
    pendingSeekRef.current = null;
  }, [activeRoomId]);

  useEffect(() => {
    stateRef.current = {
      playlist,
      currentIndex,
      isPlaying,
      position: currentIsYoutube ? currentTime : audioRef.current?.currentTime || currentTime,
      startedAt: Date.now(),
    };
  }, [playlist, currentIndex, isPlaying, currentTime, currentIsYoutube]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = effectiveVolume / 100;
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [effectiveVolume] }), "*");
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: effectiveVolume <= 0 ? "mute" : "unMute" }), "*");
  }, [effectiveVolume, currentIsYoutube, currentYoutubeId]);

  const applyRemoteState = useCallback((state: SharedMusicState) => {
    const safePlaylist = Array.isArray(state.playlist) ? state.playlist : [];
    const safeIndex = Math.min(Math.max(0, Number(state.currentIndex || 0)), Math.max(0, safePlaylist.length - 1));
    const safePlaying = Boolean(state.isPlaying && safePlaylist.length);
    const basePosition = Math.max(0, Number(state.position || 0));
    const startedAt = Number(state.startedAt || Date.now());

    pendingSeekRef.current = { position: basePosition, startedAt, isPlaying: safePlaying };
    setPlaylist(safePlaylist);
    setCurrentIndex(safeIndex);
    setIsPlaying(safePlaying);
    setCurrentTime(basePosition);
  }, []);

  const publishState = useCallback((next: Partial<SharedMusicState> = {}) => {
    const audio = audioRef.current;
    const state: SharedMusicState = {
      playlist,
      currentIndex,
      isPlaying,
      position: currentIsYoutube ? currentTime : audio?.currentTime || currentTime,
      startedAt: Date.now(),
      ...next,
    };
    stateRef.current = state;
    void channelRef.current?.send({
      type: "broadcast",
      event: "music",
      payload: {
        type: "state",
        sender: clientIdRef.current,
        userName,
        state,
      },
    });
  }, [currentIndex, currentIsYoutube, currentTime, isPlaying, playlist, userName]);

  useEffect(() => {
    if (!gameId || !roomCode) return;
    const channel = supabase.channel(`forbiddens:multiplayer-music:${activeRoomId}`, {
      config: { presence: { key: clientIdRef.current } },
    });
    channelRef.current = channel;

    const readListeners = () => {
      const latest = new Map<string, MusicListener>();
      Object.entries(channel.presenceState()).forEach(([key, presences]: any) => {
        const presence = Array.isArray(presences) ? presences[0] : presences;
        const id = String(presence?.clientId || key);
        if (!id) return;
        latest.set(id, {
          id,
          userName: String(presence?.userName || "Jugador"),
          joinedAt: Number(presence?.joinedAt || 0),
        });
      });
      setListeners(Array.from(latest.values()).sort((a, b) => a.joinedAt - b.joinedAt));
    };

    channel.on("broadcast", { event: "music" }, ({ payload }: any) => {
      if (!payload || payload.sender === clientIdRef.current) return;
      if (payload.type === "request_state") {
        void channel.send({
          type: "broadcast",
          event: "music",
          payload: {
            type: "state",
            sender: clientIdRef.current,
            userName,
            state: stateRef.current,
          },
        });
        return;
      }
      if (payload.type === "state" && payload.state) {
        applyRemoteState(payload.state);
      }
    });
    channel.on("presence", { event: "sync" }, readListeners);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ clientId: clientIdRef.current, userName, joinedAt: Date.now() });
        readListeners();
        void channel.send({
          type: "broadcast",
          event: "music",
          payload: { type: "request_state", sender: clientIdRef.current, userName },
        });
      }
    });

    return () => {
      if (channelRef.current === channel) channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [activeRoomId, applyRemoteState, gameId, roomCode, userName]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (currentIsYoutube) {
      audio.pause();
      return;
    }
    if (!current) {
      audio.pause();
      return;
    }

    const pending = pendingSeekRef.current;
    if (pending) {
      const elapsed = pending.isPlaying ? Math.max(0, (Date.now() - pending.startedAt) / 1000) : 0;
      const target = pending.position + elapsed;
      const seek = () => {
        if (Number.isFinite(target)) audio.currentTime = Math.min(target, audio.duration || target);
        if (pending.isPlaying) {
          void audio.play().catch(() => setIsPlaying(false));
        } else {
          audio.pause();
        }
        pendingSeekRef.current = null;
      };
      if (audio.readyState >= 1) seek();
      else audio.addEventListener("loadedmetadata", seek, { once: true });
      return;
    }

    if (isPlaying) {
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [current?.id, current?.url, currentIsYoutube, isPlaying]);

  useEffect(() => {
    if (!currentIsYoutube || !currentYoutubeId) return;
    const pending = pendingSeekRef.current;
    const basePosition = pending ? pending.position + (pending.isPlaying ? Math.max(0, (Date.now() - pending.startedAt) / 1000) : 0) : currentTime;
    const shouldPlay = pending ? pending.isPlaying : isPlaying;
    const timer = window.setTimeout(() => {
      if (!iframeRef.current?.contentWindow) return;
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: "command", func: "seekTo", args: [basePosition, true] }), "*");
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: "command", func: shouldPlay ? "playVideo" : "pauseVideo" }), "*");
      pendingSeekRef.current = null;
    }, 350);
    return () => window.clearTimeout(timer);
  }, [currentIsYoutube, currentTime, currentYoutubeId, isPlaying]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!currentIsYoutube || !event.data) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.event !== "infoDelivery" || !data.info) return;
        if (typeof data.info.currentTime === "number") setCurrentTime(data.info.currentTime);
        if (typeof data.info.duration === "number") setDuration(data.info.duration);
        if (data.info.playerState === 0) jumpTo(currentIndex + 1);
      } catch {
        // Ignore non-YouTube postMessage traffic.
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [currentIndex, currentIsYoutube]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (currentIsYoutube && iframeRef.current?.contentWindow) {
      pollRef.current = setInterval(() => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*");
      }, 1000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentIsYoutube, currentYoutubeId]);

  const addSong = () => {
    const url = newSongUrl.trim();
    if (!url) return;
    const youtubeId = getYoutubeId(url);
    const nextSong: SharedSong = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: newSongTitle.trim() || titleFromUrl(url),
      url,
      type: youtubeId ? "youtube" : "audio",
      youtubeId: youtubeId || undefined,
    };
    const nextPlaylist = [...playlist, nextSong];
    const nextIndex = playlist.length ? currentIndex : 0;
    const nextPlaying = playlist.length ? isPlaying : true;
    setPlaylist(nextPlaylist);
    setCurrentIndex(nextIndex);
    setIsPlaying(nextPlaying);
    setNewSongUrl("");
    setNewSongTitle("");
    publishState({
      playlist: nextPlaylist,
      currentIndex: nextIndex,
      isPlaying: nextPlaying,
      position: playlist.length ? currentTime : 0,
      startedAt: Date.now(),
    });
  };

  const playPause = () => {
    if (!current) return;
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    publishState({
      isPlaying: nextPlaying,
      position: currentIsYoutube ? currentTime : audioRef.current?.currentTime || currentTime,
      startedAt: Date.now(),
    });
  };

  const jumpTo = (index: number) => {
    if (!playlist.length) return;
    const nextIndex = (index + playlist.length) % playlist.length;
    setCurrentIndex(nextIndex);
    setCurrentTime(0);
    setIsPlaying(true);
    publishState({
      currentIndex: nextIndex,
      isPlaying: true,
      position: 0,
      startedAt: Date.now(),
    });
  };

  const removeCurrent = () => {
    if (!current) return;
    const nextPlaylist = playlist.filter((song) => song.id !== current.id);
    const nextIndex = Math.min(currentIndex, Math.max(0, nextPlaylist.length - 1));
    const nextPlaying = Boolean(nextPlaylist.length && isPlaying);
    setPlaylist(nextPlaylist);
    setCurrentIndex(nextIndex);
    setIsPlaying(nextPlaying);
    setCurrentTime(0);
    publishState({
      playlist: nextPlaylist,
      currentIndex: nextIndex,
      isPlaying: nextPlaying,
      position: 0,
      startedAt: Date.now(),
    });
  };

  const roomLabel = useMemo(() => MUSIC_ROOMS.find((room) => room.id === selectedRoom)?.label || "Mesa", [selectedRoom]);

  return (
    <div className="bg-black/35 p-2">
      <audio
        ref={audioRef}
        src={current && !currentIsYoutube ? current.url : undefined}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onEnded={() => jumpTo(currentIndex + 1)}
      />
      {currentIsYoutube && currentYoutubeId && (
        <iframe
          ref={iframeRef}
          title="YouTube compartido"
          src={`https://www.youtube.com/embed/${currentYoutubeId}?enablejsapi=1&autoplay=${isPlaying ? 1 : 0}&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`}
          allow="autoplay; encrypted-media"
          onLoad={() => {
            iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "setVolume", args: [effectiveVolume] }), "*");
            iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: effectiveVolume <= 0 ? "mute" : "unMute" }), "*");
          }}
          className="sr-only"
        />
      )}

      <div className="flex items-center gap-1.5">
        <Music className="h-3.5 w-3.5 shrink-0 text-neon-cyan" />
        <select
          value={selectedRoom}
          onChange={(event) => setSelectedRoom(event.target.value)}
          className="h-7 min-w-0 flex-1 rounded border border-white/10 bg-black/60 px-1 font-pixel text-[7px] text-white outline-none"
          aria-label="Sala de musica"
          title={`Musica: ${roomLabel}`}
        >
          {MUSIC_ROOMS.map((room) => (
            <option key={room.id} value={room.id}>{room.label}</option>
          ))}
        </select>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={playPause} disabled={!current} title={isPlaying ? "Pausar" : "Reproducir"} aria-label={isPlaying ? "Pausar" : "Reproducir"}>
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={() => setMuted((value) => !value)}
          title={muted || volume <= 0 ? "Activar volumen" : "Silenciar"}
          aria-label={muted || volume <= 0 ? "Activar volumen" : "Silenciar"}
        >
          {muted || volume <= 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setExpanded((value) => !value)} title={expanded ? "Ocultar musica" : "Agregar musica"} aria-label={expanded ? "Ocultar musica" : "Agregar musica"}>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>

      <div className="mt-1 min-w-0">
        <p className={cn("truncate text-[9px]", current ? "text-white" : "text-muted-foreground")}>
          {current?.title || "Sin canciones"}
        </p>
        <p className="font-pixel text-[5px] text-neon-cyan">
          {currentIsYoutube ? "YouTube - " : ""}{formatTime(currentTime)} / {duration ? formatTime(duration) : "0:00"}
        </p>
      </div>

      {showListeners && (
        <div className="mt-2 rounded border border-white/10 bg-black/35 p-1.5">
          <div className="mb-1 flex items-center gap-1">
            <Users className="h-3 w-3 text-neon-magenta" />
            <p className="font-pixel text-[6px] uppercase tracking-widest text-neon-magenta">
              Escuchando {roomLabel}
            </p>
            <span className="ml-auto font-pixel text-[6px] text-neon-cyan">{listeners.length}</span>
          </div>
          {listeners.length > 0 ? (
            <div className="space-y-1">
              {listeners.slice(0, 8).map((listener) => (
                <div key={listener.id} className="flex min-w-0 items-center gap-1.5">
                  <span className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    listener.id === clientIdRef.current ? "bg-neon-cyan shadow-[0_0_8px_rgba(34,211,238,0.85)]" : "bg-neon-green"
                  )} />
                  <p className="truncate text-[8px] text-white" title={listener.userName}>
                    {listener.userName}{listener.id === clientIdRef.current ? " (tu)" : ""}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[8px] text-muted-foreground">Esperando oyentes...</p>
          )}
        </div>
      )}

      {expanded && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => jumpTo(currentIndex - 1)} disabled={!playlist.length} title="Anterior" aria-label="Anterior">
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => jumpTo(currentIndex + 1)} disabled={!playlist.length} title="Siguiente" aria-label="Siguiente">
              <SkipForward className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={removeCurrent} disabled={!current} title="Quitar cancion" aria-label="Quitar cancion">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded border border-white/10 bg-black/35 px-2 py-1.5">
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-white"
              title={muted || volume <= 0 ? "Activar volumen" : "Silenciar"}
              aria-label={muted || volume <= 0 ? "Activar volumen" : "Silenciar"}
            >
              {muted || volume <= 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
            <Slider
              value={[volume]}
              min={0}
              max={100}
              step={1}
              onValueChange={([next]) => {
                const safeNext = Number(next || 0);
                setVolume(safeNext);
                if (safeNext > 0) setMuted(false);
              }}
              className="min-w-0 flex-1"
              aria-label="Volumen local"
            />
            <span className="w-7 text-right font-pixel text-[6px] text-neon-cyan">{effectiveVolume}</span>
          </div>
          <Input
            value={newSongTitle}
            onChange={(event) => setNewSongTitle(event.target.value)}
            placeholder="Titulo"
            className="h-7 border-white/10 bg-black/60 px-2 text-[10px]"
          />
          <div className="flex gap-1">
            <Input
              value={newSongUrl}
              onChange={(event) => setNewSongUrl(event.target.value)}
              placeholder="URL YouTube/mp3/ogg"
              className="h-7 min-w-0 border-white/10 bg-black/60 px-2 text-[10px]"
              onKeyDown={(event) => {
                if (event.key === "Enter") addSong();
              }}
            />
            <Button size="icon" variant="secondary" className="h-7 w-7 shrink-0" onClick={addSong} title="Agregar" aria-label="Agregar">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
