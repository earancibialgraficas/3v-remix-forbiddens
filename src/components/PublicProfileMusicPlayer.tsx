import { useEffect, useMemo, useRef, useState } from "react";
import { Music, Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const loadYoutubeApi = () =>
  new Promise<void>((resolve) => {
    if (typeof window === "undefined") return resolve();
    if (window.YT?.Player) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.body.appendChild(script);
    }
  });

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

export default function PublicProfileMusicPlayer({ userId, displayName }: { userId: string; displayName: string }) {
  const [playlist, setPlaylist] = useState<SavedPlaylist | null>(null);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0);
  const playerRef = useRef<any>(null);
  const hostId = useMemo(() => `public-profile-player-${userId}`, [userId]);

  const songs = playlist?.songs.filter((song) => song.type === "youtube" && getYoutubeId(song.url)) || [];
  const current = songs[index];
  const currentYoutubeId = current ? getYoutubeId(current.url) : "";

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
      const firstPlayable = (data || []).find((item: any) => Array.isArray(item.songs) && item.songs.some((song: Song) => song.type === "youtube" && getYoutubeId(song.url)));
      setPlaylist(firstPlayable ? { id: firstPlayable.id, name: firstPlayable.name, songs: firstPlayable.songs } : null);
      setIndex(0);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!currentYoutubeId) return;
    let cancelled = false;
    let fadeTimer: ReturnType<typeof window.setInterval> | null = null;

    loadYoutubeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;
      playerRef.current?.destroy?.();
      setVolume(0);
      playerRef.current = new window.YT.Player(hostId, {
        videoId: currentYoutubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(0);
            event.target.mute();
            event.target.playVideo();
            window.setTimeout(() => {
              event.target.unMute();
              fadeTimer = window.setInterval(() => {
                setVolume((value) => {
                  const next = Math.min(58, value + 6);
                  event.target.setVolume(next);
                  if (next >= 58 && fadeTimer) window.clearInterval(fadeTimer);
                  return next;
                });
              }, 170);
            }, 350);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED && songs.length > 1) {
              setIndex((value) => (value + 1) % songs.length);
            }
            if (event.data === window.YT.PlayerState.PLAYING) setIsPlaying(true);
            if (event.data === window.YT.PlayerState.PAUSED) setIsPlaying(false);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (fadeTimer) window.clearInterval(fadeTimer);
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [currentYoutubeId, hostId, songs.length]);

  const toggle = () => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pauseVideo();
      setIsPlaying(false);
    } else {
      player.playVideo();
      setIsPlaying(true);
    }
  };

  const jump = (delta: number) => {
    if (!songs.length) return;
    setIndex((value) => (value + delta + songs.length) % songs.length);
  };

  if (!playlist || !current) return null;

  return (
    <section className="relative overflow-hidden rounded border border-neon-cyan/25 bg-black/45 p-3 shadow-[0_0_28px_rgba(34,211,238,0.08)] backdrop-blur-md">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/70 to-transparent" />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded border border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan">
              <Music className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-pixel text-[9px] uppercase tracking-widest text-neon-cyan">Chill player de {displayName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{playlist.name}</p>
            </div>
          </div>
          <p className="truncate text-sm font-semibold text-foreground">{current.title || "Canción de YouTube"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => jump(-1)} className="grid h-8 w-8 place-items-center rounded border border-white/10 bg-white/5 text-white hover:bg-white/10" aria-label="Anterior">
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={toggle} className="grid h-9 w-9 place-items-center rounded-full border border-neon-cyan/45 bg-neon-cyan/15 text-neon-cyan shadow-[0_0_18px_rgba(34,211,238,0.22)] hover:bg-neon-cyan/25" aria-label={isPlaying ? "Pausar" : "Reproducir"}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => jump(1)} className="grid h-8 w-8 place-items-center rounded border border-white/10 bg-white/5 text-white hover:bg-white/10" aria-label="Siguiente">
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            <span className="ml-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Volume2 className="h-3.5 w-3.5 text-neon-green" />
              {volume}%
            </span>
          </div>
        </div>
        <div className="min-h-[124px] overflow-hidden rounded border border-white/10 bg-black/60">
          <div id={hostId} className={cn("h-[124px] w-full", !currentYoutubeId && "hidden")} />
        </div>
      </div>
      <div className="mt-3 flex gap-1 overflow-x-auto pb-1 retro-scrollbar">
        {songs.map((song, songIndex) => (
          <button
            key={`${song.id}-${songIndex}`}
            type="button"
            onClick={() => setIndex(songIndex)}
            className={cn(
              "max-w-[180px] shrink-0 truncate rounded border px-2 py-1 text-[10px] transition-colors",
              songIndex === index
                ? "border-neon-cyan/55 bg-neon-cyan/15 text-neon-cyan"
                : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
            )}
          >
            {song.title || `Canción ${songIndex + 1}`}
          </button>
        ))}
      </div>
    </section>
  );
}
