import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Music, Pause, Play, Plus, SkipBack, SkipForward, Volume2 } from "lucide-react";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [playlist, setPlaylist] = useState<SavedPlaylist | null>(null);
  const [myPlaylists, setMyPlaylists] = useState<SavedPlaylist[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [songToAdd, setSongToAdd] = useState<Song | null>(null);
  const [targetPlaylistId, setTargetPlaylistId] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addingSong, setAddingSong] = useState(false);
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
      setMyPlaylists((data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        songs: Array.isArray(item.songs) ? item.songs : [],
      })));
      setTargetPlaylistId((current) => current || data?.[0]?.id || "");
    };
    loadMine();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
              const nextDuration = Number(event.target.getDuration?.() || 0);
              if (Number.isFinite(nextDuration)) setDuration(nextDuration);
            }, 500);
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
    const timer = window.setInterval(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;
      const nextTime = Number(player.getCurrentTime() || 0);
      const nextDuration = Number(player.getDuration?.() || duration || 0);
      if (Number.isFinite(nextTime)) setCurrentTime(nextTime);
      if (Number.isFinite(nextDuration) && nextDuration > 0) setDuration(nextDuration);
    }, 500);
    return () => window.clearInterval(timer);
  }, [duration]);

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

  const seekTo = (nextTime: number) => {
    const safeTime = Math.max(0, Math.min(duration || 0, nextTime));
    setCurrentTime(safeTime);
    playerRef.current?.seekTo?.(safeTime, true);
  };

  const formatTime = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const openAddBubble = (song: Song) => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Necesitas una cuenta para guardar canciones.", variant: "destructive" });
      return;
    }
    setSongToAdd((current) => current?.url === song.url ? null : song);
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
        const exists = target.songs.some((item) => item.url === song.url);
        if (exists) {
          toast({ title: "Ya estaba guardada", description: "Esa canción ya existe en tu playlist." });
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
        toast({ title: "Canción agregada", description: `Guardada en ${target.name}.` });
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
        toast({ title: "Playlist creada", description: `Guardamos la canción en ${created.name}.` });
      }

      setSongToAdd(null);
      setNewPlaylistName("");
    } catch (error: any) {
      toast({ title: "No se pudo guardar", description: error?.message || "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setAddingSong(false);
    }
  };

  if (!playlist || !current) return null;

  return (
    <section className="relative overflow-hidden rounded border border-neon-cyan/30 bg-[#05070d]/80 p-3 shadow-[0_0_32px_rgba(34,211,238,0.12)] backdrop-blur-md">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/70 to-transparent" />
      <div className="grid gap-3 lg:grid-cols-[220px_minmax(220px,1fr)_240px] lg:items-stretch">
        <div className="flex min-h-[210px] min-w-0 flex-col justify-between rounded border border-white/10 bg-black/35 p-3">
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
          <div className="flex flex-1 items-center justify-center gap-3">
            <button type="button" onClick={() => jump(-1)} className="grid h-10 w-10 place-items-center rounded border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10" aria-label="Anterior">
              <SkipBack className="h-4 w-4" />
            </button>
            <button type="button" onClick={toggle} className="grid h-12 w-12 place-items-center rounded-full border border-neon-cyan/45 bg-neon-cyan/15 text-neon-cyan shadow-[0_0_22px_rgba(34,211,238,0.28)] transition-colors hover:bg-neon-cyan/25" aria-label={isPlaying ? "Pausar" : "Reproducir"}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button type="button" onClick={() => jump(1)} className="grid h-10 w-10 place-items-center rounded border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10" aria-label="Siguiente">
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setVolumeOpen((value) => !value)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded border border-white/10 bg-white/5 text-neon-green transition-colors hover:bg-white/10"
              aria-label="Volumen"
            >
              <Volume2 className="h-3.5 w-3.5 text-neon-green" />
            </button>
            {volumeOpen && (
              <div className="absolute bottom-10 left-0 z-30 flex h-32 w-10 items-center justify-center rounded border border-neon-green/35 bg-black/95 p-2 shadow-[0_0_24px_rgba(57,255,20,0.16)]">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(event) => changeVolume(Number(event.target.value))}
                  className="h-24 w-24 -rotate-90 accent-neon-green"
                  aria-label="Volumen"
                />
              </div>
            )}
            <input
              type="range"
              min={0}
              max={Math.max(1, duration)}
              value={Math.min(currentTime, Math.max(1, duration))}
              onChange={(event) => seekTo(Number(event.target.value))}
              className="h-1.5 min-w-0 flex-1 accent-neon-green"
              aria-label="Tiempo de la canción"
            />
            <span className="w-16 text-right text-[10px] text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        <div className="min-h-[210px] overflow-hidden rounded border border-white/10 bg-black/35">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
            <div className="min-w-0">
              <p className="font-pixel text-[9px] uppercase tracking-widest text-neon-cyan">Playlist de {displayName}</p>
              <p className="truncate text-[10px] text-muted-foreground">{playlist.name}</p>
            </div>
            <span className="shrink-0 rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-muted-foreground">{songs.length}</span>
          </div>
          <div className="max-h-[166px] space-y-1 overflow-y-auto p-2 retro-scrollbar">
            {songs.map((song, songIndex) => (
              <div
                key={`${song.id}-${songIndex}`}
                onClick={() => setIndex(songIndex)}
                className={cn(
                  "relative flex w-full cursor-pointer items-center gap-2 rounded border px-2 py-2 text-left transition-colors",
                  songIndex === index
                    ? "border-neon-cyan/55 bg-neon-cyan/15 text-neon-cyan"
                    : "border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
                )}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-black/35 font-pixel text-[8px]">{songIndex + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[11px]">{song.title || `Canción ${songIndex + 1}`}</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openAddBubble(song);
                  }}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded border border-neon-green/30 bg-neon-green/10 text-neon-green transition-colors hover:bg-neon-green/20"
                  title="Agregar a mi playlist"
                  aria-label="Agregar a mi playlist"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {songToAdd?.url === song.url && (
                  <div
                    className="absolute right-2 top-10 z-20 w-[min(76vw,260px)] rounded border border-neon-green/35 bg-black/95 p-3 shadow-[0_0_28px_rgba(57,255,20,0.16)] backdrop-blur-xl"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <p className="mb-2 line-clamp-2 text-[11px] font-semibold text-foreground">{song.title || "Canción de YouTube"}</p>
                    {myPlaylists.length > 0 && (
                      <select
                        value={targetPlaylistId}
                        onChange={(event) => setTargetPlaylistId(event.target.value)}
                        className="mb-2 h-8 w-full rounded border border-white/10 bg-black/80 px-2 text-[11px] text-foreground outline-none focus:border-neon-green/50"
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
                        className="mb-2 h-8 w-full rounded border border-white/10 bg-black/80 px-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground focus:border-neon-green/50"
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[210px] overflow-hidden rounded border border-white/10 bg-black/45">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_58%)]" />
          <canvas ref={visualizerRef} width={420} height={210} className="relative h-full min-h-[210px] w-full" />
          <div id={hostId} className={cn("pointer-events-none absolute -left-[9999px] top-0 h-px w-px opacity-0", !currentYoutubeId && "hidden")} />
        </div>
      </div>
    </section>
  );
}
