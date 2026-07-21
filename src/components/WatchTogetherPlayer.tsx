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
  userId?: string;
  playerId?: string;
  avatarUrl?: string;
  controlsTargetId?: string;
  fullscreen?: boolean;
  hideDetachedControls?: boolean;
  onPresencePlayers?: (players: Array<{ userId: string; playerId: string; name: string; avatarUrl: string; joinedAt: number; updatedAt: number }>) => void;
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

const VIDEO_QUALITIES = [
  { value: "auto", label: "Auto" },
  { value: "small", label: "240p" },
  { value: "medium", label: "360p" },
  { value: "large", label: "480p" },
  { value: "hd720", label: "720p" },
  { value: "hd1080", label: "1080p" },
  { value: "highres", label: "Max" },
];

const CAPTION_LANGUAGES = [
  { value: "es", label: "Espanol" },
  { value: "en", label: "Ingles" },
  { value: "pt", label: "Portugues" },
  { value: "fr", label: "Frances" },
  { value: "it", label: "Italiano" },
  { value: "ja", label: "Japones" },
];

const WATCH_PLAYLIST_OPEN_KEY = "forbiddens.watchTogether.playlistOpen";

export default function WatchTogetherPlayer({ roomCode, userName, userId, playerId, avatarUrl = "", controlsTargetId, fullscreen = false, hideDetachedControls = false, onPresencePlayers }: WatchTogetherPlayerProps) {
  const [playlist, setPlaylist] = useState<WatchSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(WATCH_PLAYLIST_OPEN_KEY) !== "0";
  });
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [videoHudVisible, setVideoHudVisible] = useState(true);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [captionLanguage, setCaptionLanguage] = useState("es");
  const [videoQuality, setVideoQuality] = useState("auto");
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [controlsElement, setControlsElement] = useState<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playlistListRef = useRef<HTMLDivElement>(null);
  const activeVideoRef = useRef<HTMLButtonElement>(null);
  const hudTimerRef = useRef<number | null>(null);
  const volumeHideTimerRef = useRef<number | null>(null);
  const channelRef = useRef<any>(null);
  const pollRef = useRef<number | null>(null);
  const stateRef = useRef<WatchState>(emptyState());
  const effectiveVolumeRef = useRef(80);
  const captionsEnabledRef = useRef(false);
  const captionLanguageRef = useRef("es");
  const videoQualityRef = useRef("auto");
  const durationByVideoRef = useRef<Record<string, number>>({});
  const applyingRemoteStateRef = useRef(false);
  const nativeStateBroadcastRef = useRef(0);
  const hasAuthoritativeRoomStateRef = useRef(false);
  const clientIdRef = useRef(`watch_${Math.random().toString(36).slice(2, 10)}`);
  const watchJoinedAtRef = useRef(Date.now());
  const titleFetchRef = useRef(0);

  const current = playlist[currentIndex];
  const effectiveVolume = muted ? 0 : volume;
  const localWatchPlayerId = playerId || clientIdRef.current;
  const localWatchUserId = userId || localWatchPlayerId;
  const effectiveDuration = duration || (current?.youtubeId ? durationByVideoRef.current[current.youtubeId] || 0 : 0);

  useEffect(() => {
    if (!playlistOpen) return;
    window.requestAnimationFrame(() => {
      activeVideoRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [playlistOpen, currentIndex, playlist.length]);

  useEffect(() => {
    window.localStorage.setItem(WATCH_PLAYLIST_OPEN_KEY, playlistOpen ? "1" : "0");
  }, [playlistOpen]);

  const clearVolumeHideTimer = useCallback(() => {
    if (volumeHideTimerRef.current) {
      window.clearTimeout(volumeHideTimerRef.current);
      volumeHideTimerRef.current = null;
    }
  }, []);

  const scheduleVolumeHide = useCallback((delay = 2000) => {
    clearVolumeHideTimer();
    volumeHideTimerRef.current = window.setTimeout(() => {
      setVolumeOpen(false);
      volumeHideTimerRef.current = null;
    }, delay);
  }, [clearVolumeHideTimer]);

  const closeTransientPanels = useCallback(() => {
    clearVolumeHideTimer();
    setVolumeOpen(false);
    setAddOpen(false);
    setSettingsOpen(false);
  }, [clearVolumeHideTimer]);

  const revealVideoHud = useCallback(() => {
    setVideoHudVisible(true);
    if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
    hudTimerRef.current = window.setTimeout(() => {
      closeTransientPanels();
      setVideoHudVisible(false);
    }, 2600);
  }, [closeTransientPanels]);
  const showVolumeControls = useCallback(() => {
    setVolumeOpen(true);
    setSettingsOpen(false);
    revealVideoHud();
    scheduleVolumeHide(2000);
  }, [revealVideoHud, scheduleVolumeHide]);

  const handleVolumeChange = useCallback(([next]: number[]) => {
    clearVolumeHideTimer();
    revealVideoHud();
    const safeNext = Number(next || 0);
    setVolume(safeNext);
    if (safeNext > 0) setMuted(false);
  }, [clearVolumeHideTimer, revealVideoHud]);

  const handleVolumeCommit = useCallback(() => {
    scheduleVolumeHide(900);
  }, [scheduleVolumeHide]);

  const toggleMute = useCallback(() => {
    setMuted((value) => !value);
    revealVideoHud();
    scheduleVolumeHide(1200);
  }, [revealVideoHud, scheduleVolumeHide]);

  useEffect(() => () => clearVolumeHideTimer(), [clearVolumeHideTimer]);

  useEffect(() => {
    revealVideoHud();
    return () => {
      if (hudTimerRef.current) window.clearTimeout(hudTimerRef.current);
      hudTimerRef.current = null;
    };
  }, [current?.youtubeId, revealVideoHud]);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-watch-controls-root='true']")) return;
      closeTransientPanels();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [closeTransientPanels]);

  useEffect(() => {
    effectiveVolumeRef.current = effectiveVolume;
  }, [effectiveVolume]);

  useEffect(() => {
    captionsEnabledRef.current = captionsEnabled;
  }, [captionsEnabled]);

  useEffect(() => {
    captionLanguageRef.current = captionLanguage;
  }, [captionLanguage]);

  useEffect(() => {
    videoQualityRef.current = videoQuality;
  }, [videoQuality]);

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

  const forceCaptionsOff = useCallback(() => {
    sendCommand("setOption", ["captions", "track", {}]);
    sendCommand("unloadModule", ["captions"]);
  }, [sendCommand]);

  const requestYoutubeStatus = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: clientIdRef.current }), "*");
    sendCommand("getCurrentTime");
    sendCommand("getDuration");
    sendCommand("getPlaybackQuality");
  }, [sendCommand]);

  const applyYoutubePreferences = useCallback(() => {
    const localVolume = effectiveVolumeRef.current;
    const localQuality = videoQualityRef.current;
    const localCaptionsEnabled = captionsEnabledRef.current;
    const localCaptionLanguage = captionLanguageRef.current;
    sendCommand("setVolume", [localVolume]);
    sendCommand(localVolume <= 0 ? "mute" : "unMute");
    if (localQuality !== "auto") sendCommand("setPlaybackQuality", [localQuality]);
    if (localCaptionsEnabled) {
      sendCommand("loadModule", ["captions"]);
      sendCommand("setOption", ["captions", "track", { languageCode: localCaptionLanguage }]);
    } else {
      forceCaptionsOff();
    }
  }, [forceCaptionsOff, sendCommand]);

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
      applyYoutubePreferences();
      requestYoutubeStatus();
    };
    drive();
    window.setTimeout(drive, 450);
    window.setTimeout(() => {
      applyingRemoteStateRef.current = false;
    }, 900);
  }, [applyYoutubePreferences, requestYoutubeStatus, sendCommand]);

  const publishState = useCallback((next: Partial<WatchState> = {}) => {
    const state = { ...getSnapshot(), ...next };
    hasAuthoritativeRoomStateRef.current = true;
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
    hasAuthoritativeRoomStateRef.current = false;

    const buildPresencePayload = () => ({
      userName,
      name: userName,
      userId: localWatchUserId,
      playerId: localWatchPlayerId,
      avatarUrl,
      joinedAt: watchJoinedAtRef.current,
      updatedAt: Date.now(),
    });

    const readPresencePlayers = () => {
      const players = Object.values(channel.presenceState())
        .flat()
        .map((presence: any) => {
          const seenPlayerId = String(presence?.playerId || presence?.userId || "");
          const seenUserId = String(presence?.userId || seenPlayerId);
          if (!seenUserId) return null;
          return {
            userId: seenUserId,
            playerId: seenPlayerId || seenUserId,
            name: String(presence?.name || presence?.userName || "Jugador"),
            avatarUrl: String(presence?.avatarUrl || ""),
            joinedAt: Number(presence?.joinedAt || 0),
            updatedAt: Number(presence?.updatedAt || Date.now()),
          };
        })
        .filter(Boolean) as Array<{ userId: string; playerId: string; name: string; avatarUrl: string; joinedAt: number; updatedAt: number }>;
      onPresencePlayers?.(players);
    };

    channel.on("broadcast", { event: "watch" }, ({ payload }: any) => {
      if (!payload || payload.sender === clientIdRef.current || payload.room !== roomCode) return;
      if (payload.type === "request_state") {
        if (!hasAuthoritativeRoomStateRef.current || !stateRef.current.playlist.length) return;
        void channel.send({
          type: "broadcast",
          event: "watch",
          payload: { type: "state", sender: clientIdRef.current, room: roomCode, userName, state: stateRef.current },
        });
      }
      if (payload.type === "state" && payload.state) {
        hasAuthoritativeRoomStateRef.current = true;
        applyState(payload.state);
      }
    });
    channel.on("presence", { event: "sync" }, readPresencePlayers);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track(buildPresencePayload());
        readPresencePlayers();
        void channel.send({
          type: "broadcast",
          event: "watch",
          payload: { type: "request_state", sender: clientIdRef.current, room: roomCode, userName },
        });
        window.setTimeout(() => {
          void channel.send({
            type: "broadcast",
            event: "watch",
            payload: { type: "request_state", sender: clientIdRef.current, room: roomCode, userName },
          });
        }, 1200);
      }
    });

    const presenceHeartbeat = window.setInterval(() => {
      void channel.track(buildPresencePayload()).then(readPresencePlayers);
    }, 10000);

    return () => {
      window.clearInterval(presenceHeartbeat);
      if (channelRef.current === channel) channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [applyState, avatarUrl, localWatchPlayerId, localWatchUserId, onPresencePlayers, roomCode, userName]);

  useEffect(() => {
    stateRef.current = getSnapshot();
  }, [getSnapshot]);

  useEffect(() => {
    sendCommand("setVolume", [effectiveVolume]);
    sendCommand(effectiveVolume <= 0 ? "mute" : "unMute");
  }, [effectiveVolume, sendCommand]);

  useEffect(() => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    if (!current?.youtubeId) return;
    requestYoutubeStatus();
    pollRef.current = window.setInterval(() => {
      requestYoutubeStatus();
    }, 1000);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [current?.youtubeId, requestYoutubeStatus]);

  useEffect(() => {
    if (!current?.youtubeId) return;
    setDuration(durationByVideoRef.current[current.youtubeId] || 0);
    const first = window.setTimeout(requestYoutubeStatus, 250);
    const second = window.setTimeout(requestYoutubeStatus, 900);
    const third = window.setTimeout(requestYoutubeStatus, 1800);
    const fourth = window.setTimeout(requestYoutubeStatus, 3200);
    const fifth = window.setTimeout(requestYoutubeStatus, 5200);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(second);
      window.clearTimeout(third);
      window.clearTimeout(fourth);
      window.clearTimeout(fifth);
    };
  }, [current?.youtubeId, requestYoutubeStatus]);

  useEffect(() => {
    applyYoutubePreferences();
  }, [applyYoutubePreferences]);

  useEffect(() => {
    if (!current?.youtubeId || captionsEnabled) return;
    forceCaptionsOff();
    const timers = [350, 1100, 2400].map((delay) => window.setTimeout(forceCaptionsOff, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [captionsEnabled, current?.youtubeId, forceCaptionsOff]);

  const playPause = () => {
    if (!current) return;
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    sendCommand(nextPlaying ? "playVideo" : "pauseVideo");
    publishState({ isPlaying: nextPlaying, position: currentTime, startedAt: Date.now() });
  };

  const seekVideo = useCallback((seconds: number) => {
    if (!current) return;
    const maxTime = effectiveDuration > 0 ? effectiveDuration : Math.max(currentTime, seconds, 0);
    const target = Math.min(Math.max(0, Number(seconds || 0)), maxTime);
    setCurrentTime(target);
    sendCommand("seekTo", [target, true]);
    publishState({ isPlaying, position: target, startedAt: Date.now() });
    requestYoutubeStatus();
  }, [current, currentTime, effectiveDuration, isPlaying, publishState, requestYoutubeStatus, sendCommand]);

  const seekRelative = useCallback((delta: number) => {
    if (!current) return;
    seekVideo(currentTime + delta);
  }, [current, currentTime, seekVideo]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) return;
      if (event.key === "ArrowLeft" || event.key === "<" || event.key === ",") {
        event.preventDefault();
        seekRelative(-10);
        revealVideoHud();
      }
      if (event.key === "ArrowRight" || event.key === ">" || event.key === ".") {
        event.preventDefault();
        seekRelative(10);
        revealVideoHud();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealVideoHud, seekRelative]);

  const toggleCaptions = () => {
    const next = !captionsEnabled;
    setCaptionsEnabled(next);
    if (next) {
      sendCommand("loadModule", ["captions"]);
      sendCommand("setOption", ["captions", "track", { languageCode: captionLanguage }]);
    } else {
      forceCaptionsOff();
    }
  };

  const changeCaptionLanguage = (language: string) => {
    setCaptionLanguage(language);
    setCaptionsEnabled(true);
    sendCommand("loadModule", ["captions"]);
    sendCommand("setOption", ["captions", "track", { languageCode: language }]);
  };

  const forceVideoQuality = useCallback((quality: string) => {
    if (!current || quality === "auto") {
      sendCommand("setPlaybackQualityRange", ["small", "highres"]);
      requestYoutubeStatus();
      return;
    }
    const startSeconds = Math.max(0, Math.floor(currentTime || 0));
    sendCommand("setPlaybackQualityRange", [quality, quality]);
    sendCommand("setPlaybackQuality", [quality]);
    sendCommand("loadVideoById", [{ videoId: current.youtubeId, startSeconds, suggestedQuality: quality }]);
    window.setTimeout(() => {
      sendCommand("seekTo", [startSeconds, true]);
      sendCommand(isPlaying ? "playVideo" : "pauseVideo");
      applyYoutubePreferences();
      requestYoutubeStatus();
    }, 350);
  }, [applyYoutubePreferences, current, currentTime, isPlaying, requestYoutubeStatus, sendCommand]);

  const changeVideoQuality = (quality: string) => {
    setVideoQuality(quality);
    forceVideoQuality(quality);
  };

  const jumpTo = useCallback((index: number) => {
    if (!playlist.length) return;
    const nextIndex = (index + playlist.length) % playlist.length;
    const nextVideo = playlist[nextIndex];
    setCurrentIndex(nextIndex);
    setCurrentTime(0);
    setDuration(nextVideo?.youtubeId ? durationByVideoRef.current[nextVideo.youtubeId] || 0 : 0);
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
        if (typeof data.info.duration === "number" && data.info.duration > 0) {
          setDuration(data.info.duration);
          if (current?.youtubeId) durationByVideoRef.current[current.youtubeId] = data.info.duration;
        }
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
    setAddOpen(false);
    setPlaylistOpen(true);
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

  const playlistList = (
    <div ref={playlistListRef} className="max-h-full space-y-1 overflow-y-auto rounded border border-white/10 bg-black/35 p-1 retro-scrollbar">
      {playlist.length > 0 ? playlist.map((song, index) => (
        <button key={song.id} ref={index === currentIndex ? activeVideoRef : undefined} type="button" onClick={() => jumpTo(index)} className={cn("flex w-full min-w-0 items-center gap-1.5 rounded px-1.5 py-1 text-left transition-colors", index === currentIndex ? "bg-neon-cyan/15 text-neon-cyan" : "text-muted-foreground hover:bg-white/10 hover:text-white")} title={song.title}>
          <span className="w-4 shrink-0 font-pixel text-[6px]">{index + 1}</span>
          <span className="min-w-0 flex-1 truncate text-[8px]">{song.title}</span>
          <span className="shrink-0 font-pixel text-[5px] text-red-300">YT</span>
        </button>
      )) : (
        <div className="flex min-h-24 flex-col items-center justify-center gap-2 px-3 py-5 text-center">
          <ListVideo className="h-5 w-5 text-neon-cyan/70" />
          <p className="text-[10px] text-muted-foreground">Agrega un video para iniciar la sala.</p>
        </div>
      )}
    </div>
  );

  const addVideoForm = (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <Input value={newUrl} onChange={(event) => handleUrlChange(event.target.value)} placeholder="URL YouTube" className="h-8 min-w-0 border-white/10 bg-black/60 px-2 text-[10px]" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Enter") void addVideo(); }} />
        <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); void addVideo(); }} title="Agregar" aria-label="Agregar"><Plus className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );

  const settingsPanel = (
    <div className="space-y-1 rounded border border-white/10 bg-black/75 p-2 shadow-2xl shadow-black/40 backdrop-blur-md">
      <button type="button" onClick={toggleCaptions} className="w-full rounded border border-white/10 px-2 py-1 text-left text-[10px] text-muted-foreground hover:bg-white/10 hover:text-white">
        Subtitulos: {captionsEnabled ? "ON" : "OFF"}
      </button>
      <label className="block text-[9px] uppercase text-muted-foreground">
        Calidad
        <select
          value={videoQuality}
          onChange={(event) => changeVideoQuality(event.target.value)}
          className="mt-1 h-7 w-full rounded border border-white/10 bg-black/70 px-2 text-[10px] text-white outline-none"
        >
          {VIDEO_QUALITIES.map((quality) => (
            <option key={quality.value} value={quality.value}>{quality.label}</option>
          ))}
        </select>
      </label>
      <label className="block text-[9px] uppercase text-muted-foreground">
        Idioma subtitulos
        <select
          value={captionLanguage}
          onChange={(event) => changeCaptionLanguage(event.target.value)}
          className="mt-1 h-7 w-full rounded border border-white/10 bg-black/70 px-2 text-[10px] text-white outline-none"
        >
          {CAPTION_LANGUAGES.map((language) => (
            <option key={language.value} value={language.value}>{language.label}</option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => applyState(stateRef.current)} className="w-full rounded border border-white/10 px-2 py-1 text-left text-[10px] text-muted-foreground hover:bg-white/10 hover:text-white">
        Re-sincronizar video
      </button>
      {current && (
        <button type="button" onClick={() => window.open(current.url, "_blank", "noopener,noreferrer")} className="w-full rounded border border-white/10 px-2 py-1 text-left text-[10px] text-muted-foreground hover:bg-white/10 hover:text-white">
          Abrir en YouTube
        </button>
      )}
    </div>
  );

  const sideControls = (
    <div data-watch-controls-root="true" className="bg-black/35 p-2">
      <div
        className="relative mb-2 flex h-9 min-w-0 items-center overflow-hidden rounded border border-neon-cyan/20 bg-black/45 px-2"
        title={current?.title || "Sin video activo"}
      >
        <div className="flex w-max animate-marquee-x whitespace-nowrap">
          {[0, 1].map((copy) => (
            <span
              key={copy}
              className="font-pixel leading-none px-2"
              style={{ color: "#00f2fe", fontSize: "9px", letterSpacing: "1px", textShadow: "0 0 3px rgba(34,211,238,.9), 0 0 6px rgba(34,211,238,.55)" }}
            >
              {current?.title ? `> ${current.title}` : "> Sin video activo"} &nbsp;-&nbsp;
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setPlaylistOpen((value) => !value); setVolumeOpen(false); setAddOpen(false); setSettingsOpen(false); }} title={playlistOpen ? "Ocultar lista" : "Ver lista"} aria-label={playlistOpen ? "Ocultar lista" : "Ver lista"}>{playlistOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ListVideo className="h-3.5 w-3.5" />}</Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setAddOpen((value) => !value); setVolumeOpen(false); setSettingsOpen(false); }} title="Agregar video" aria-label="Agregar video">{addOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}</Button>
      </div>

      {playlistOpen && (
        <div className="mt-2 max-h-56 min-h-0">
          {playlistList}
        </div>
      )}

      {addOpen && (
        <div className="mt-2">
          {addVideoForm}
        </div>
      )}
    </div>
  );

  const bottomHud = current ? (
    <div
      data-watch-controls-root="true"
      className={cn(
        "absolute bottom-5 left-1/2 z-30 w-[min(560px,50%)] -translate-x-1/2 rounded-full border border-white/10 bg-black/55 px-3 py-2 shadow-2xl shadow-black/50 backdrop-blur-md transition-opacity duration-300 max-[720px]:w-[calc(100%-24px)]",
        videoHudVisible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      onMouseMove={revealVideoHud}
      onClick={(event) => event.stopPropagation()}
    >
      {settingsOpen && (
        <div className="absolute bottom-full left-1/2 mb-2 w-[260px] -translate-x-1/2">
          {settingsPanel}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <div className="flex shrink-0 items-center gap-0.5">
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => jumpTo(currentIndex - 1)} disabled={!playlist.length} title="Anterior" aria-label="Anterior"><SkipBack className="h-3 w-3" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-full" onClick={playPause} disabled={!current} title={isPlaying ? "Pausar" : "Reproducir"} aria-label={isPlaying ? "Pausar" : "Reproducir"}>{isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => jumpTo(currentIndex + 1)} disabled={!playlist.length} title="Siguiente" aria-label="Siguiente"><SkipForward className="h-3 w-3" /></Button>
          <div
            className="relative shrink-0"
            onMouseEnter={showVolumeControls}
            onFocus={showVolumeControls}
          >
            {volumeOpen && (
              <div
                className="absolute bottom-full left-1/2 mb-2 flex h-36 w-12 -translate-x-1/2 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-black/75 px-2 py-2 shadow-2xl shadow-black/50 backdrop-blur-md"
                onPointerDown={clearVolumeHideTimer}
                onClick={(event) => event.stopPropagation()}
              >
                <span className="font-pixel text-[6px] leading-none text-neon-cyan">{effectiveVolume}</span>
                <Slider
                  orientation="vertical"
                  value={[volume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={handleVolumeChange}
                  onValueCommit={handleVolumeCommit}
                  className="h-24"
                  aria-label="Volumen local"
                />
                <button type="button" onClick={toggleMute} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-white" title="Silenciar" aria-label="Silenciar">{muted || volume <= 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}</button>
              </div>
            )}
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={toggleMute} title="Volumen" aria-label="Volumen">{muted || volume <= 0 ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}</Button>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full" onClick={() => { setSettingsOpen((value) => !value); setVolumeOpen(false); }} title="Configuracion YouTube" aria-label="Configuracion YouTube"><Settings className="h-3 w-3" /></Button>
        </div>
        <span className="w-8 shrink-0 font-pixel text-[6px] text-neon-cyan">{formatTime(currentTime)}</span>
        <Slider
          value={[Math.min(currentTime, effectiveDuration || Math.max(currentTime, 1))]}
          min={0}
          max={Math.max(effectiveDuration, currentTime, 1)}
          step={1}
          onValueChange={([next]) => setCurrentTime(Number(next || 0))}
          onValueCommit={([next]) => seekVideo(Number(next || 0))}
          className="min-w-0 flex-1"
          aria-label="Tiempo del video sincronizado"
        />
        <span className="w-9 shrink-0 text-right font-pixel text-[6px] text-muted-foreground">{effectiveDuration ? formatTime(effectiveDuration) : "--:--"}</span>
      </div>
    </div>
  ) : null;

  const controls = sideControls;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-black">
      <div className="relative min-h-0 flex-1 bg-black" onMouseMove={revealVideoHud} onPointerMove={revealVideoHud} onPointerDown={revealVideoHud}>
        {current ? (
          <iframe
            key={current.youtubeId}
            ref={iframeRef}
            title={current.title}
            src={`https://www.youtube.com/embed/${current.youtubeId}?enablejsapi=1&autoplay=0&playsinline=1&controls=0&disablekb=1&fs=0&rel=0&modestbranding=1&cc_load_policy=0&iv_load_policy=3&cc_lang_pref=${encodeURIComponent(captionLanguage)}&origin=${encodeURIComponent(window.location.origin)}`}
            allow="autoplay; encrypted-media; fullscreen"
            className="h-full w-full"
            onLoad={() => {
              requestYoutubeStatus();
              applyYoutubePreferences();
              if (!captionsEnabledRef.current) forceCaptionsOff();
              if (hasAuthoritativeRoomStateRef.current) applyState(stateRef.current);
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.16),transparent_45%)] p-6 text-center">
            <ListVideo className="h-10 w-10 text-neon-cyan" />
            <p className="font-pixel text-[12px] uppercase text-neon-cyan">Watch Together</p>
            <p className="max-w-md text-xs text-muted-foreground">Agrega un link de YouTube para iniciar una lista sincronizada con la sala.</p>
            <div data-watch-controls-root="true" className="mt-2 w-full max-w-md rounded border border-neon-cyan/20 bg-black/55 p-3 backdrop-blur-md">
              {addVideoForm}
            </div>
          </div>
        )}
        {current && (
          <button
            type="button"
            className="absolute inset-0 z-10 cursor-default bg-transparent"
            title="Usa los controles sincronizados"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
            onClick={() => {
              closeTransientPanels();
              playPause();
            }}
          />
        )}
        {bottomHud}
      </div>

      {controlsElement ? createPortal(controls, controlsElement) : hideDetachedControls ? null : (
        <div className="absolute right-3 top-3 z-30 w-[min(300px,calc(100%-24px))] overflow-hidden rounded border border-white/10 bg-black/70 backdrop-blur-md">
          {controls}
        </div>
      )}
    </div>
  );
}

