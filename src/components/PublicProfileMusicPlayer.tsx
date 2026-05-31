import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronUp, ListMusic, Pause, Play, Plus, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Song = {
  id: string;
  title: string;
  url: string;
  type: "youtube" | "local";
  category?: string;
};

type SavedPlaylist = {
  id: string;
  name: string;
  songs: Song[];
};

const MUSIC_OWNER_EVENT = "forbiddens-music-owner-play";
const PUBLIC_PROFILE_MUSIC_OWNER = "public-profile";

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
    const match = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{6,})/);
    return match?.[1] || "";
  }
  return "";
};

const formatTime = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function PublicProfileMusicPlayer({ userId, displayName }: { userId: string; displayName: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playlistButtonRef = useRef<HTMLButtonElement>(null);
  const compactPlaylistRef = useRef<HTMLDivElement>(null);
  const volumeButtonRef = useRef<HTMLDivElement>(null);
  const volumeHideTimerRef = useRef<number | null>(null);
  const [playlist, setPlaylist] = useState<SavedPlaylist | null>(null);
  const [myPlaylists, setMyPlaylists] = useState<SavedPlaylist[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(58);
  const [volumePopoverOpen, setVolumePopoverOpen] = useState(false);
  const [volumePopoverPosition, setVolumePopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [compactPlaylistOpen, setCompactPlaylistOpen] = useState(false);
  const [compactPlaylistPosition, setCompactPlaylistPosition] = useState<{ top: number; left: number } | null>(null);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  const [addBubblePosition, setAddBubblePosition] = useState<{ top: number; left: number } | null>(null);
  const [targetPlaylistId, setTargetPlaylistId] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addingSong, setAddingSong] = useState(false);

  const songs = useMemo(
    () => playlist?.songs.filter((song) => song.type === "youtube" && getYoutubeId(song.url)) || [],
    [playlist],
  );
  const current = songs[index];
  const currentYoutubeId = current ? getYoutubeId(current.url) : "";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const updateCompactPlaylistPosition = () => {
    if (typeof window === "undefined" || !playlistButtonRef.current) return;
    const rect = playlistButtonRef.current.getBoundingClientRect();
    const width = Math.min(310, window.innerWidth - 24);
    setCompactPlaylistPosition({
      top: Math.max(12, Math.min(rect.top, window.innerHeight - 180)),
      left: Math.max(12, Math.min(rect.right + 8, window.innerWidth - width - 12)),
    });
  };

  const postYoutubeCommand = (func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  };

  useEffect(() => {
    const handleOtherMusic = (event: Event) => {
      const owner = (event as CustomEvent<{ owner?: string }>).detail?.owner;
      if (owner && owner !== PUBLIC_PROFILE_MUSIC_OWNER) setIsPlaying(false);
    };
    window.addEventListener(MUSIC_OWNER_EVENT, handleOtherMusic);
    return () => window.removeEventListener(MUSIC_OWNER_EVENT, handleOtherMusic);
  }, []);

  useEffect(() => {
    if (!isPlaying || !currentYoutubeId) return;
    window.dispatchEvent(new CustomEvent(MUSIC_OWNER_EVENT, { detail: { owner: PUBLIC_PROFILE_MUSIC_OWNER } }));
  }, [currentYoutubeId, isPlaying]);

  useEffect(() => {
    if (!compactPlaylistOpen) return;
    updateCompactPlaylistPosition();
    window.addEventListener("resize", updateCompactPlaylistPosition);
    window.addEventListener("scroll", updateCompactPlaylistPosition, true);
    return () => {
      window.removeEventListener("resize", updateCompactPlaylistPosition);
      window.removeEventListener("scroll", updateCompactPlaylistPosition, true);
    };
  }, [compactPlaylistOpen]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("user_music_playlists")
        .select("id, name, songs, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(3);

      if (cancelled) return;
      const firstPlayable = (data || []).find((item: any) => (
        Array.isArray(item.songs) && item.songs.some((song: Song) => song.type === "youtube" && getYoutubeId(song.url))
      ));
      setPlaylist(firstPlayable ? { id: firstPlayable.id, name: firstPlayable.name, songs: firstPlayable.songs } : null);
      setIndex(0);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!user) {
      setMyPlaylists([]);
      return;
    }
    let cancelled = false;
    const loadMine = async () => {
      const { data } = await (supabase as any)
        .from("user_music_playlists")
        .select("id, name, songs, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (cancelled) return;
      const items = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        songs: Array.isArray(item.songs) ? item.songs : [],
      }));
      setMyPlaylists(items);
      setTargetPlaylistId((currentId) => currentId || items[0]?.id || "");
    };
    void loadMine();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);
    setCompactPlaylistOpen(false);
  }, [currentYoutubeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      postYoutubeCommand("setVolume", [volume]);
      postYoutubeCommand(volume <= 0 ? "mute" : "unMute");
      postYoutubeCommand(isPlaying ? "playVideo" : "pauseVideo");
    }, 250);
    return () => window.clearTimeout(timer);
  }, [currentYoutubeId, isPlaying, volume]);

  useEffect(() => {
    if (!currentYoutubeId) return;
    const poll = window.setInterval(() => {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "public-profile-music" }), "*");
    }, 650);
    return () => window.clearInterval(poll);
  }, [currentYoutubeId]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || !currentYoutubeId) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data.event !== "infoDelivery" || !data.info) return;
        if (typeof data.info.currentTime === "number") setCurrentTime(data.info.currentTime);
        if (typeof data.info.duration === "number" && data.info.duration > 0) setDuration(data.info.duration);
        if (data.info.playerState === 0 && songs.length > 1) setIndex((value) => (value + 1) % songs.length);
        if (data.info.playerState === 1) setIsPlaying(true);
        if (data.info.playerState === 2) setIsPlaying(false);
      } catch {
        // Ignore unrelated postMessage traffic.
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [currentYoutubeId, songs.length]);

  useEffect(() => {
    if (!compactPlaylistOpen) return;
    const active = compactPlaylistRef.current?.querySelector<HTMLElement>("[data-current='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [compactPlaylistOpen, index]);

  const toggle = () => {
    setIsPlaying((value) => {
      const next = !value;
      postYoutubeCommand(next ? "playVideo" : "pauseVideo");
      return next;
    });
  };

  const jump = (delta: number) => {
    if (!songs.length) return;
    setIndex((value) => (value + delta + songs.length) % songs.length);
  };

  const changeVolume = (nextVolume: number) => {
    const safeVolume = Math.max(0, Math.min(100, nextVolume));
    setVolume(safeVolume);
    postYoutubeCommand("setVolume", [safeVolume]);
    postYoutubeCommand(safeVolume <= 0 ? "mute" : "unMute");
    updateVolumePopoverPosition();
    setVolumePopoverOpen(true);
    if (volumeHideTimerRef.current) window.clearTimeout(volumeHideTimerRef.current);
    volumeHideTimerRef.current = window.setTimeout(() => setVolumePopoverOpen(false), 1700);
  };

  const updateVolumePopoverPosition = () => {
    if (typeof window === "undefined") return;
    const rect = volumeButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 36;
    const height = 112;
    const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8);
    const preferredTop = rect.top - height + 2;
    const top = preferredTop < 8 ? rect.bottom + 8 : preferredTop;
    setVolumePopoverPosition({ top, left });
  };

  const showVolumePopover = () => {
    if (volumeHideTimerRef.current) window.clearTimeout(volumeHideTimerRef.current);
    updateVolumePopoverPosition();
    setVolumePopoverOpen(true);
  };

  const hideVolumePopoverSoon = () => {
    if (volumeHideTimerRef.current) window.clearTimeout(volumeHideTimerRef.current);
    volumeHideTimerRef.current = window.setTimeout(() => setVolumePopoverOpen(false), 350);
  };

  useEffect(() => () => {
    if (volumeHideTimerRef.current) window.clearTimeout(volumeHideTimerRef.current);
  }, []);

  useEffect(() => {
    if (!volumePopoverOpen) return;
    const update = () => updateVolumePopoverPosition();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [volumePopoverOpen]);

  const seekTo = (nextTime: number) => {
    const safeTime = Math.max(0, Math.min(duration || 0, nextTime));
    setCurrentTime(safeTime);
    postYoutubeCommand("seekTo", [safeTime, true]);
  };

  useEffect(() => {
    if (!songToAdd) return;
    const closeBubble = () => {
      setSongToAdd(null);
      setAddBubblePosition(null);
    };
    window.addEventListener("scroll", closeBubble, true);
    window.addEventListener("resize", closeBubble);
    return () => {
      window.removeEventListener("scroll", closeBubble, true);
      window.removeEventListener("resize", closeBubble);
    };
  }, [songToAdd]);

  const openAddBubble = (song: Song, event: MouseEvent<HTMLButtonElement>) => {
    if (!user) {
      toast({ title: "Inicia sesion", description: "Necesitas una cuenta para guardar canciones.", variant: "destructive" });
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const bubbleWidth = Math.min(280, window.innerWidth - 24);
    const bubbleHeight = 224;
    const left = Math.min(Math.max(12, rect.right - bubbleWidth), window.innerWidth - bubbleWidth - 12);
    const preferredTop = rect.bottom + 8;
    const top = preferredTop + bubbleHeight > window.innerHeight
      ? Math.max(12, rect.top - bubbleHeight - 8)
      : preferredTop;

    setSongToAdd((currentSong) => {
      const closing = currentSong?.url === song.url;
      setAddBubblePosition(closing ? null : { top, left });
      return closing ? null : song;
    });
    setNewPlaylistName("");
  };

  const addSongToOwnPlaylist = async () => {
    if (!user || !songToAdd) return;
    const cleanedName = newPlaylistName.trim();
    const target = myPlaylists.find((item) => item.id === targetPlaylistId);
    if (!target && !cleanedName) {
      toast({ title: "Ponle nombre", description: "Elige una playlist o escribe una nueva.", variant: "destructive" });
      return;
    }

    setAddingSong(true);
    try {
      const song: Song = {
        ...songToAdd,
        id: songToAdd.id || `yt_${getYoutubeId(songToAdd.url) || Date.now()}`,
        category: "Personal",
      };

      if (target) {
        if (target.songs.some((item) => item.url === song.url)) {
          toast({ title: "Ya estaba guardada", description: "Esa cancion ya existe en tu playlist." });
          setSongToAdd(null);
          return;
        }
        const nextSongs = [...target.songs, song];
        const { error } = await (supabase as any)
          .from("user_music_playlists")
          .update({ songs: nextSongs })
          .eq("id", target.id)
          .eq("user_id", user.id);
        if (error) throw error;
        setMyPlaylists((items) => items.map((item) => item.id === target.id ? { ...item, songs: nextSongs } : item));
        toast({ title: "Cancion agregada", description: `Guardada en ${target.name}.` });
      } else {
        const { data, error } = await (supabase as any)
          .from("user_music_playlists")
          .insert({ user_id: user.id, name: cleanedName, songs: [song] })
          .select("id, name, songs")
          .single();
        if (error) throw error;
        const created = { id: data.id, name: data.name, songs: data.songs || [song] };
        setMyPlaylists((items) => [created, ...items]);
        setTargetPlaylistId(created.id);
        toast({ title: "Playlist creada", description: `Guardamos la cancion en ${created.name}.` });
      }

      setSongToAdd(null);
      setNewPlaylistName("");
    } catch (error: any) {
      toast({ title: "No se pudo guardar", description: error?.message || "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setAddingSong(false);
    }
  };

  const playlistRows = (compact = false) => (
    <div ref={compact ? compactPlaylistRef : undefined} className={cn("space-y-1 overflow-y-auto retro-scrollbar", compact ? "max-h-[118px]" : "max-h-[198px]")}>
      {songs.map((song, songIndex) => (
        <div
          key={`${song.id}-${songIndex}`}
          data-current={songIndex === index ? "true" : undefined}
          onClick={() => {
            setIndex(songIndex);
            setCompactPlaylistOpen(false);
          }}
          className={cn(
            "relative flex w-full cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors",
            songIndex === index
              ? "border-neon-cyan/55 bg-neon-cyan/15 text-neon-cyan"
              : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
          )}
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-black/35 font-pixel text-[8px]">{songIndex + 1}</span>
          <span className="min-w-0 flex-1 truncate text-[11px]">{song.title || `Cancion ${songIndex + 1}`}</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openAddBubble(song, event);
            }}
            className="grid h-7 w-7 shrink-0 place-items-center rounded border border-neon-green/30 bg-neon-green/10 text-neon-green transition-colors hover:bg-neon-green/20"
            title="Agregar a mi playlist"
            aria-label="Agregar a mi playlist"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );

  if (!playlist || !current || !currentYoutubeId) return null;

  const addBubble = songToAdd && addBubblePosition && typeof document !== "undefined"
    ? createPortal(
      <div
        className="fixed z-[10000] w-[min(280px,calc(100vw-24px))] rounded border border-neon-green/40 bg-[#030704]/95 p-3 text-foreground shadow-[0_0_36px_rgba(57,255,20,0.22)] backdrop-blur-xl"
        style={{ top: addBubblePosition.top, left: addBubblePosition.left }}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="mb-2 line-clamp-2 text-[11px] font-semibold">{songToAdd.title || "Cancion de YouTube"}</p>
        {myPlaylists.length > 0 && (
          <select
            value={targetPlaylistId}
            onChange={(event) => setTargetPlaylistId(event.target.value)}
            className="mb-2 h-8 w-full rounded border border-white/10 bg-black/85 px-2 text-[11px] text-foreground outline-none focus:border-neon-green/50"
          >
            {myPlaylists.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
            <option value="">Crear nueva playlist</option>
          </select>
        )}
        {(!targetPlaylistId || myPlaylists.length === 0) && (
          <input
            value={newPlaylistName}
            onChange={(event) => setNewPlaylistName(event.target.value)}
            placeholder="Nombre de tu playlist"
            className="mb-2 h-8 w-full rounded border border-white/10 bg-black/85 px-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-neon-green/50"
          />
        )}
        <button
          type="button"
          onClick={addSongToOwnPlaylist}
          disabled={addingSong}
          className="inline-flex h-8 w-full items-center justify-center gap-2 rounded border border-neon-green/40 bg-neon-green/15 font-pixel text-[8px] uppercase tracking-widest text-neon-green transition-colors hover:bg-neon-green/25 disabled:cursor-wait disabled:opacity-60"
        >
          <Check className="h-3.5 w-3.5" />
          {addingSong ? "Guardando..." : "Agregar"}
        </button>
      </div>,
      document.body,
    )
    : null;

  const volumePopover = volumePopoverOpen && volumePopoverPosition && typeof document !== "undefined"
    ? createPortal(
      <div
        className="public-profile-volume-popover fixed z-[10000] flex h-28 w-9 flex-col items-center justify-center rounded-full border border-neon-green/30 bg-black/90 px-1.5 py-2 opacity-100 shadow-[0_0_18px_rgba(57,255,20,0.16)] backdrop-blur-md"
        style={{ top: volumePopoverPosition.top, left: volumePopoverPosition.left }}
        onMouseEnter={showVolumePopover}
        onMouseLeave={hideVolumePopoverSoon}
      >
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(event) => changeVolume(Number(event.target.value))}
          className="h-20 w-4 accent-neon-green"
          style={{ writingMode: "vertical-lr", direction: "rtl" }}
          aria-label="Volumen"
          title={`Volumen ${volume}%`}
        />
        <span className="mt-1 font-pixel text-[7px] text-neon-green tabular-nums">{volume}%</span>
      </div>,
      document.body,
    )
    : null;

  const compactPlaylistPopover = compactPlaylistOpen && compactPlaylistPosition && typeof document !== "undefined"
    ? createPortal(
      <div
        className="public-profile-playlist-popover fixed z-[10000] w-[min(310px,calc(100vw-24px))] rounded border border-neon-cyan/30 bg-black/80 p-2 shadow-[0_18px_42px_rgba(0,0,0,0.55),0_0_24px_rgba(34,211,238,0.16)] backdrop-blur-xl"
        style={{ top: compactPlaylistPosition.top, left: compactPlaylistPosition.left }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-1.5 flex items-center justify-between gap-3 border-b border-white/10 pb-1.5">
          <div className="min-w-0">
            <p className="font-pixel text-[8px] uppercase tracking-widest text-neon-cyan">Playlist de {displayName}</p>
            <p className="truncate text-[10px] text-muted-foreground">{playlist.name}</p>
          </div>
          <span className="shrink-0 font-pixel text-[8px] text-neon-green">{songs.length}</span>
        </div>
        {playlistRows(true)}
      </div>,
      document.body,
    )
    : null;

  return (
    <section className="public-profile-music-player relative overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div
        className="public-profile-video-layer pointer-events-none relative z-0 aspect-[16/7] overflow-hidden bg-black sm:absolute sm:inset-y-0 sm:right-0 sm:h-auto sm:w-[48%] sm:aspect-auto"
      >
        <iframe
          key={currentYoutubeId}
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${currentYoutubeId}?enablejsapi=1&autoplay=1&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&origin=${encodeURIComponent(origin)}`}
          title={current.title || "Video de la cancion"}
          allow="autoplay; encrypted-media; picture-in-picture"
          className="absolute left-1/2 top-1/2 h-[calc(100%+88px)] w-[calc(100%+156px)] -translate-x-1/2 -translate-y-1/2 sm:h-[calc(100%+118px)] sm:w-[calc(100%+210px)]"
          tabIndex={-1}
        />
      </div>



      <button
        ref={playlistButtonRef}
        type="button"
        onClick={() => {
          updateCompactPlaylistPosition();
          setCompactPlaylistOpen((value) => !value);
        }}
        className="public-profile-playlist-toggle absolute left-2 top-2 z-30 grid h-9 w-9 place-items-center rounded-full border border-neon-cyan/35 bg-black/60 text-neon-cyan shadow-[0_0_18px_rgba(34,211,238,0.22)] backdrop-blur-md transition-colors hover:bg-neon-cyan/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-cyan/70"
        title={compactPlaylistOpen ? "Ocultar playlist" : "Abrir playlist"}
        aria-label={compactPlaylistOpen ? "Ocultar playlist" : "Abrir playlist"}
      >
        {compactPlaylistOpen ? <ChevronUp className="h-4 w-4" /> : <ListMusic className="h-4 w-4" />}
      </button>

      <div className="relative z-10 p-3 sm:w-[35%] sm:max-w-[35%]">
        <div className="flex min-h-[188px] min-w-0 flex-col justify-between">
          <div className="flex items-center gap-2 pl-11 sm:pl-10">
            <div className="min-w-0 leading-none">
              <p className="font-pixel text-[11px] uppercase tracking-widest text-neon-cyan">FORBIDDENS</p>
              <p className="mt-1 font-pixel text-[8px] uppercase tracking-[0.34em] text-white/55">PLAYER</p>
            </div>
          </div>

          <div className="py-3">
            <p className="mb-1 truncate text-[10px] text-muted-foreground">Playlist de {displayName}</p>
            <div
              className="relative h-8 overflow-hidden"
              style={{
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
                maskImage:
                  'linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)',
              }}
            >
              <div className="flex w-max animate-marquee-x whitespace-nowrap">
                {[0, 1, 2].map((copy) => (
                  <span
                    key={copy}
                    className="pr-8 font-pixel text-[10px] uppercase leading-8 text-neon-cyan drop-shadow-[0_0_7px_rgba(34,211,238,0.75)]"
                  >
                    {current.title || "Cancion de YouTube"} / 
                  </span>
                ))}
              </div>
            </div>
          </div>


          <div className="flex items-center justify-center gap-3 py-1">
            <button type="button" onClick={() => jump(-1)} className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/5 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-cyan/60" aria-label="Anterior">
              <SkipBack className="h-5 w-5" />
            </button>
            <button type="button" onClick={toggle} className="grid h-12 w-12 place-items-center rounded-full border border-neon-cyan/45 bg-neon-cyan/15 text-neon-cyan shadow-[0_0_22px_rgba(34,211,238,0.28)] transition-colors hover:bg-neon-cyan/25" aria-label={isPlaying ? "Pausar" : "Reproducir"}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button type="button" onClick={() => jump(1)} className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/5 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-cyan/60" aria-label="Siguiente">
              <SkipForward className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded border border-white/5 bg-muted/20 px-2 py-1.5">
              <div
                className="public-profile-volume-control relative shrink-0"
                ref={volumeButtonRef}
                onMouseEnter={showVolumePopover}
                onMouseLeave={hideVolumePopoverSoon}
                onFocus={showVolumePopover}
                onBlur={hideVolumePopoverSoon}
              >
                <button
                  type="button"
                  onClick={() => changeVolume(volume <= 0 ? 58 : 0)}
                  className="grid h-8 w-8 place-items-center rounded-full text-neon-green transition-colors hover:bg-neon-green/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon-green/60"
                  aria-label={volume <= 0 ? "Activar volumen" : "Silenciar"}
                  title={volume <= 0 ? "Activar volumen" : "Silenciar"}
                >
                  {volume <= 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(1, duration)}
                value={Math.min(currentTime, Math.max(1, duration))}
                onChange={(event) => seekTo(Number(event.target.value))}
                className="h-1.5 min-w-0 flex-1 accent-neon-green"
                aria-label="Tiempo de la cancion"
              />
              <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      </div>
      {addBubble}
      {volumePopover}
      {compactPlaylistPopover}
    </section>
  );
}
