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
  const visualizerRef = useRef<HTMLCanvasElement>(null);
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

  useEffect(() => {
    let animationId = 0;
    const heights = new Array(38).fill(0);

    const draw = () => {
      const canvas = visualizerRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      const bars = heights.length;
      const barWidth = canvas.width / bars;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        if (isPlaying && volume > 0) {
          const wave = Math.sin(Date.now() / 190 + i * 0.62) * 0.28 + 0.72;
          const pulse = Math.random() * canvas.height * 0.48 + canvas.height * 0.12;
          const target = Math.min(canvas.height * 0.9, pulse * wave);
          heights[i] += (target - heights[i]) * 0.16;
        } else {
          heights[i] *= 0.9;
        }

        const h = Math.max(3, heights[i]);
        const x = i * barWidth + 1;
        const y = canvas.height - h;
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
        gradient.addColorStop(0, "rgba(34, 211, 238, 0.95)");
        gradient.addColorStop(0.55, "rgba(57, 255, 20, 0.55)");
        gradient.addColorStop(1, "rgba(34, 211, 238, 0.12)");
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, Math.max(2, barWidth - 3), h);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, volume]);

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

  const changeVolume = (nextVolume: number) => {
    const safeVolume = Math.max(0, Math.min(100, nextVolume));
    setVolume(safeVolume);
    playerRef.current?.setVolume?.(safeVolume);
    if (safeVolume > 0) playerRef.current?.unMute?.();
  };

  if (!playlist || !current) return null;

  return (
    <section className="relative overflow-hidden rounded border border-neon-cyan/30 bg-[#05070d]/80 p-3 shadow-[0_0_32px_rgba(34,211,238,0.12)] backdrop-blur-md">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/70 to-transparent" />
      <div className="grid gap-3 lg:grid-cols-[220px_minmax(220px,1fr)_240px] lg:items-stretch">
        <div className="flex min-w-0 flex-col justify-between rounded border border-white/10 bg-black/35 p-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded border border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan">
                <Music className="h-4 w-4" />
              </span>
              <div className="min-w-0 leading-none">
                <p className="font-pixel text-[11px] uppercase tracking-widest text-neon-cyan">FORBIDDENS</p>
                <p className="mt-1 font-pixel text-[8px] uppercase tracking-[0.34em] text-white/55">PLAYER</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => jump(-1)} className="grid h-8 w-8 place-items-center rounded border border-white/10 bg-white/5 text-white hover:bg-white/10" aria-label="Anterior">
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={toggle} className="grid h-9 w-9 place-items-center rounded-full border border-neon-cyan/45 bg-neon-cyan/15 text-neon-cyan shadow-[0_0_18px_rgba(34,211,238,0.22)] hover:bg-neon-cyan/25" aria-label={isPlaying ? "Pausar" : "Reproducir"}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => jump(1)} className="grid h-8 w-8 place-items-center rounded border border-white/10 bg-white/5 text-white hover:bg-white/10" aria-label="Siguiente">
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Volume2 className="h-3.5 w-3.5 text-neon-green" />
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              className="h-1.5 min-w-0 flex-1 accent-neon-green"
              aria-label="Volumen"
            />
            <span className="w-8 text-right text-[10px] text-muted-foreground">{volume}%</span>
          </div>
        </div>

        <div className="min-h-[142px] overflow-hidden rounded border border-white/10 bg-black/35">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
            <div className="min-w-0">
              <p className="font-pixel text-[9px] uppercase tracking-widest text-neon-cyan">Playlist de {displayName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{playlist.name}</p>
            </div>
            <span className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-muted-foreground">{songs.length}</span>
          </div>
          <div className="max-h-[168px] space-y-1 overflow-y-auto p-2 retro-scrollbar">
            {songs.map((song, songIndex) => (
              <button
                key={`${song.id}-${songIndex}`}
                type="button"
                onClick={() => setIndex(songIndex)}
                className={cn(
                  "flex w-full items-center gap-2 rounded border px-2 py-2 text-left transition-colors",
                  songIndex === index
                    ? "border-neon-cyan/55 bg-neon-cyan/15 text-neon-cyan"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
                )}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-black/35 font-pixel text-[8px]">{songIndex + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[11px]">{song.title || `Canción ${songIndex + 1}`}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative min-h-[142px] overflow-hidden rounded border border-white/10 bg-black/45">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_58%)]" />
          <canvas ref={visualizerRef} width={420} height={180} className="relative h-full min-h-[142px] w-full" />
          <div id={hostId} className={cn("pointer-events-none absolute -left-[9999px] top-0 h-px w-px opacity-0", !currentYoutubeId && "hidden")} />
        </div>
      </div>
    </section>
  );
}
