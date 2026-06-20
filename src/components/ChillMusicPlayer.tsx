import { useState, useEffect, useRef, useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, ChevronDown, ChevronUp, Trash2, Plus, ListFilter, Save, FolderOpen, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { loadMusicLibrary } from "@/lib/musicLibrary";

interface Song {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'local';
  category: string;
}

interface SavedPlaylist {
  id: string;
  name: string;
  songs: Song[];
}

const getStoredCategory = () => typeof window !== 'undefined' ? (localStorage.getItem('forbiddens_music_category') || "Todos") : "Todos";
const getStoredIndex = () => typeof window !== 'undefined' ? parseInt(localStorage.getItem('forbiddens_music_index') || "0") : 0;
const clampVolume = (value: unknown, fallback = 80) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : fallback;
};
const getStoredVolume = () => typeof window !== 'undefined' ? clampVolume(localStorage.getItem('forbiddens_music_volume') || "80") : 80;
const getStoredPlaying = () => typeof window !== 'undefined' ? localStorage.getItem('forbiddens_music_playing') === 'true' : false;

const getSongOrderKey = (song: Song) => `${song.type}:${song.id}:${song.url}`;
const getPlaylistOrderStorageKey = (category: string) => `forbiddens_music_order_${category || "Personal"}`;
const MUSIC_SESSION_KEY = "forbiddens_music_session_v2";
const MUSIC_OWNER_EVENT = "forbiddens-music-owner-play";
const CHILL_MUSIC_OWNER = "chill";
const MEDIA_SESSION_ARTWORK = [
  { src: "/forbiddens-logo.png", sizes: "512x512", type: "image/png" },
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
];

const applyStoredPlaylistOrder = (songs: Song[], category: string) => {
  if (typeof window === "undefined" || songs.length < 2) return songs;
  try {
    const stored = JSON.parse(localStorage.getItem(getPlaylistOrderStorageKey(category)) || "[]");
    if (!Array.isArray(stored) || !stored.length) return songs;
    const buckets = new Map<string, Song[]>();
    songs.forEach((song) => {
      const key = getSongOrderKey(song);
      buckets.set(key, [...(buckets.get(key) || []), song]);
    });
    const ordered: Song[] = [];
    stored.forEach((key) => {
      const bucket = buckets.get(key);
      const song = bucket?.shift();
      if (song) ordered.push(song);
    });
    songs.forEach((song) => {
      if (!ordered.includes(song)) ordered.push(song);
    });
    return ordered;
  } catch {
    return songs;
  }
};

const storePlaylistOrder = (songs: Song[], category: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(getPlaylistOrderStorageKey(category), JSON.stringify(songs.map(getSongOrderKey)));
};

const readMusicSession = () => {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(MUSIC_SESSION_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed as any : null;
  } catch {
    return null;
  }
};

const findSongIndex = (songs: Song[], songKey?: string, fallbackIndex = 0) => {
  const matchedIndex = songKey ? songs.findIndex((song) => getSongOrderKey(song) === songKey) : -1;
  if (matchedIndex >= 0) return matchedIndex;
  return songs.length ? Math.max(0, Math.min(fallbackIndex, songs.length - 1)) : 0;
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
    const match = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{6,})/);
    return match?.[1] || "";
  }
  return "";
};

const normalizeSavedYoutubeSong = (song: any): Song | null => {
  const url = typeof song?.url === "string" ? song.url.trim() : "";
  const youtubeId = getYoutubeId(url);
  if (!url || !youtubeId) return null;

  return {
    id: youtubeId,
    title: typeof song?.title === "string" && song.title.trim() ? song.title.trim() : `YouTube ${youtubeId}`,
    url,
    type: "youtube",
    category: typeof song?.category === "string" && song.category.trim() ? song.category.trim() : "Custom",
  };
};

const normalizeSavedYoutubeSongs = (songs: unknown): Song[] => (
  Array.isArray(songs)
    ? songs.map(normalizeSavedYoutubeSong).filter((song): song is Song => Boolean(song))
    : []
);

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
      // Try the next metadata endpoint.
    }
  }
  return "";
};

export default function ChillMusicPlayer() {
  const { onPauseMusic, user } = useAuth();
  const isMobile = useIsMobile();
  const { activeGames, minimized: gameMinimized } = useGameBubble();

  const inEmulator = activeGames.length > 0 && !gameMinimized;
  const [mobileFooterOpen, setMobileFooterOpen] = useState(false);
  const slotId = inEmulator
    ? "music-slot-emulator"
    : isMobile
    ? (mobileFooterOpen ? "music-slot-mobile" : "music-slot-mobile-collapsed")
    : "music-slot-desktop";

  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const find = () => {
      if (cancelled) return;
      const el = document.getElementById(slotId);
      if (el) {
        setPortalTarget(el);
        return true;
      }
      return false;
    };
    if (!find()) {
      const interval = setInterval(() => {
        if (find()) clearInterval(interval);
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [slotId]);
  
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  
  const [currentCategory, setCurrentCategory] = useState(getStoredCategory);
  const [currentIndex, setCurrentIndex] = useState(getStoredIndex);
  const [isPlaying, setIsPlaying] = useState(getStoredPlaying);
  const [volume, setVolume] = useState(getStoredVolume);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false); 
  const [showAddSong, setShowAddSong] = useState(false);
  const [newSongUrl, setNewSongUrl] = useState("");
  const [newSongTitle, setNewSongTitle] = useState("");
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [activePersonalPlaylistId, setActivePersonalPlaylistId] = useState<string | null>(null);
  const [draggedSongIndex, setDraggedSongIndex] = useState<number | null>(null);
  const [dragOverSongIndex, setDragOverSongIndex] = useState<number | null>(null);
  const dragOverSongIndexRef = useRef<number | null>(null);
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [rositaEditorPreview, setRositaEditorPreview] = useState(false);
  const [rositaEmulatorPalette, setRositaEmulatorPalette] = useState(false);
  const categories = ["Todos", "Metal", "Rap", "Lofi Hip-Hop"];
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDisplayValue, setSeekDisplayValue] = useState(0);
  
  const timeToRestoreRef = useRef<number | null>(null);
  const actualTimeRef = useRef<number>(0); 
  
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const current = playlist[currentIndex];
  const isMuted = volume === 0;

  useEffect(() => {
    if (!inEmulator || typeof document === "undefined") {
      setRositaEmulatorPalette(false);
      return;
    }
    const syncPalette = () => {
      setRositaEmulatorPalette(Boolean(document.querySelector(".gamebubble-shell-rosita-nes")));
    };
    syncPalette();
    const observer = new MutationObserver(syncPalette);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [inEmulator]);

  useEffect(() => {
    const syncEditorPreview = (event?: Event) => {
      if (!isMobile) {
        setRositaEditorPreview(false);
        return;
      }
      const detail = (event as CustomEvent<boolean>)?.detail;
      if (typeof detail === "boolean") {
        setRositaEditorPreview(detail);
        return;
      }
      setRositaEditorPreview(window.localStorage.getItem("forbiddens:rosita-editor-enabled") === "1");
    };
    window.addEventListener("forbiddens:rosita-editor-toggle", syncEditorPreview);
    window.addEventListener("storage", syncEditorPreview);
    syncEditorPreview();
    return () => {
      window.removeEventListener("forbiddens:rosita-editor-toggle", syncEditorPreview);
      window.removeEventListener("storage", syncEditorPreview);
    };
  }, [isMobile]);

  useEffect(() => {
    const handleOtherMusic = (event: Event) => {
      const owner = (event as CustomEvent<{ owner?: string }>).detail?.owner;
      if (owner && owner !== CHILL_MUSIC_OWNER) setIsPlaying(false);
    };
    window.addEventListener(MUSIC_OWNER_EVENT, handleOtherMusic);
    return () => window.removeEventListener(MUSIC_OWNER_EVENT, handleOtherMusic);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    window.dispatchEvent(new CustomEvent(MUSIC_OWNER_EVENT, { detail: { owner: CHILL_MUSIC_OWNER } }));
  }, [isPlaying, currentIndex, current?.id]);

  const persistMusicSession = useCallback((overrides: Record<string, unknown> = {}) => {
    if (typeof window === "undefined") return;
    const activeSong = playlist[currentIndex] || current;
    const session = {
      category: currentCategory,
      index: currentIndex,
      songKey: activeSong ? getSongOrderKey(activeSong) : "",
      time: Math.max(0, Number(actualTimeRef.current || currentTime || 0)),
      playing: isPlaying,
      volume,
      personalPlaylistId: activePersonalPlaylistId,
      playlistName,
      updatedAt: Date.now(),
      ...overrides,
    };
    localStorage.setItem(MUSIC_SESSION_KEY, JSON.stringify(session));
  }, [activePersonalPlaylistId, current, currentCategory, currentIndex, currentTime, isPlaying, playlist, playlistName, volume]);

  const attemptLocalPlayback = useCallback((reason = "play") => {
    const audio = audioRef.current;
    if (!audio || current?.type !== 'local') return;

    audio.volume = volume / 100;
    if (timeToRestoreRef.current !== null && Number.isFinite(timeToRestoreRef.current)) {
      audio.currentTime = Math.max(0, timeToRestoreRef.current);
      timeToRestoreRef.current = null;
    } else if (actualTimeRef.current > 0 && Math.abs(audio.currentTime - actualTimeRef.current) > 1) {
      audio.currentTime = actualTimeRef.current;
    }

    const playResult = audio.play();
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch((error) => {
        console.warn(`No se pudo reproducir la cancion local (${reason}).`, error);
        if (error?.name !== "AbortError") setIsPlaying(false);
      });
    }
  }, [current?.type, current?.url, volume]);

  const [songToast, setSongToast] = useState<{ id: number; title: string } | null>(null);
  const lastNotifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("forbiddens_music_current_title", current?.title || "FORBIDDENS Player");
  }, [current?.title]);

  useEffect(() => {
    if (!inEmulator) return;
    if (!current?.id) return;
    if (!isPlaying) return;
    if (lastNotifiedRef.current === current.id) return;
    lastNotifiedRef.current = current.id;
    const id = Date.now();
    setSongToast({ id, title: current.title });
    const t = window.setTimeout(() => {
      setSongToast(prev => (prev?.id === id ? null : prev));
    }, 5000);
    return () => window.clearTimeout(t);
  }, [inEmulator, current?.id, current?.title, isPlaying]);

  useEffect(() => {
    actualTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    dragOverSongIndexRef.current = dragOverSongIndex;
  }, [dragOverSongIndex]);

  useEffect(() => {
    if (playlist.length > 0 && timeToRestoreRef.current === null) {
      localStorage.setItem('forbiddens_music_category', currentCategory);
      localStorage.setItem('forbiddens_music_index', currentIndex.toString());
      persistMusicSession();
    }
  }, [currentCategory, currentIndex, playlist.length, persistMusicSession]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (timeToRestoreRef.current === null && actualTimeRef.current > 0) {
        localStorage.setItem('forbiddens_music_time', actualTimeRef.current.toString());
        persistMusicSession({ time: actualTimeRef.current });
      }
    }, 1000); 
    return () => clearInterval(timer);
  }, [persistMusicSession]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forbiddens_music_playing', isPlaying ? 'true' : 'false');
      persistMusicSession({ playing: isPlaying });
    }
  }, [isPlaying, persistMusicSession]);

  useEffect(() => {
    if (!portalTarget) return;
    if (!isPlaying) return;
    const t = setTimeout(() => {
      if (current?.type === 'local' && audioRef.current) {
        audioRef.current.volume = volume / 100;
        if (audioRef.current.paused) {
          if (actualTimeRef.current > 0 && Math.abs(audioRef.current.currentTime - actualTimeRef.current) > 1) {
            audioRef.current.currentTime = actualTimeRef.current;
          }
          attemptLocalPlayback("portal-sync");
        }
      } else if (current?.type === 'youtube' && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo' }), '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }), '*'
        );
      }
    }, 150);
    return () => clearTimeout(t);
  }, [attemptLocalPlayback, portalTarget, current, isPlaying, volume]);

  useEffect(() => {
    setMinimized(isMobile);
  }, [isMobile]);

  useEffect(() => {
    const fetchMusic = async () => {
      const fetchedSongs: Song[] = await loadMusicLibrary();
      setAllSongs(fetchedSongs);

      const savedCat = localStorage.getItem('forbiddens_music_category') || "Todos";
      const savedIndex = localStorage.getItem('forbiddens_music_index');
      const savedTime = localStorage.getItem('forbiddens_music_time');
      const savedSession = readMusicSession();
      const targetCategory = typeof savedSession?.category === "string" ? savedSession.category : savedCat;
      setVolume(clampVolume(savedSession?.volume, getStoredVolume()));

      setCurrentCategory(targetCategory);

      let initialPlaylist = fetchedSongs;
      if (targetCategory !== "Todos") {
        initialPlaylist = fetchedSongs.filter(s => s.category === targetCategory);
      }
      initialPlaylist = applyStoredPlaylistOrder(initialPlaylist, targetCategory);
      setPlaylist(initialPlaylist);

      const fallbackIndex = savedIndex !== null ? parseInt(savedIndex) : Number(savedSession?.index || 0);
      setCurrentIndex(findSongIndex(initialPlaylist, savedSession?.songKey, fallbackIndex));

      const restoreTime = savedSession?.time ?? savedTime;
      if (restoreTime !== null && restoreTime !== undefined) {
        const parsedTime = parseFloat(String(restoreTime));
        setCurrentTime(parsedTime);
        setSeekDisplayValue(parsedTime);
        timeToRestoreRef.current = parsedTime; 
      }
    };

    fetchMusic();
  }, []);

  const loadSavedPlaylists = useCallback(async () => {
    if (!user) {
      setSavedPlaylists([]);
      return;
    }
    try {
      const { data, error } = await (supabase as any)
        .from("user_music_playlists")
        .select("id,name,songs")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const playlists = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        songs: normalizeSavedYoutubeSongs(row.songs),
      })).filter((playlist: SavedPlaylist) => playlist.songs.length > 0);
      setSavedPlaylists(playlists);
      const savedSession = readMusicSession();
      const shouldRestorePersonal = savedSession?.personalPlaylistId && savedSession?.personalPlaylistId !== activePersonalPlaylistId;
      if (shouldRestorePersonal) {
        const saved = playlists.find((row: SavedPlaylist) => row.id === savedSession.personalPlaylistId);
        const songs = saved?.songs || [];
        if (saved && songs.length) {
          setPlaylist(songs);
          setCurrentCategory(saved.name);
          setActivePersonalPlaylistId(saved.id);
          setPlaylistName(saved.name);
          setCurrentIndex(findSongIndex(songs, savedSession.songKey, Number(savedSession.index || 0)));
          const parsedTime = Math.max(0, Number(savedSession.time || 0));
          setCurrentTime(parsedTime);
          setSeekDisplayValue(parsedTime);
          timeToRestoreRef.current = parsedTime;
          setVolume(clampVolume(savedSession.volume, getStoredVolume()));
          setIsPlaying(Boolean(savedSession.playing));
        }
      }
    } catch (error) {
      console.warn("No se pudieron cargar playlists personales", error);
      setSavedPlaylists([]);
    }
  }, [user]);

  useEffect(() => {
    loadSavedPlaylists();
  }, [loadSavedPlaylists]);

  const handleLocalLoadedMeta = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (timeToRestoreRef.current !== null) {
        audioRef.current.currentTime = timeToRestoreRef.current;
        timeToRestoreRef.current = null; 
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (current?.type !== 'local') {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    audio.volume = volume / 100;
    audio.load();
    if (!isPlaying) return;

    const timer = window.setTimeout(() => attemptLocalPlayback("source-change"), 100);
    return () => window.clearTimeout(timer);
  }, [attemptLocalPlayback, current?.type, current?.url, isPlaying, volume]);

  const handleCategoryChange = (cat: string) => {
    setCurrentCategory(cat);
    setActivePersonalPlaylistId(null);
    if (cat === "Todos") {
      setPlaylist(applyStoredPlaylistOrder(allSongs, cat));
    } else {
      setPlaylist(applyStoredPlaylistOrder(allSongs.filter(s => s.category === cat), cat));
    }
    setCurrentIndex(0);
    setIsPlaying(true);
    setCurrentTime(0);
    timeToRestoreRef.current = null; 
    setShowCategoryMenu(false); 
  };

  useEffect(() => {
    const handleSync = (e: any) => {
      if (isMobile) {
        const open = !!e.detail.open;
        setMinimized(!open);
        setMobileFooterOpen(open);
      }
    };
    window.addEventListener("syncMusicPlayer", handleSync);
    return () => window.removeEventListener("syncMusicPlayer", handleSync);
  }, [isMobile]);

  useEffect(() => {
    if (!current) return;
    
    if (current.type === 'local') {
      if (audioRef.current) {
        audioRef.current.volume = volume / 100;
        if (isPlaying) {
          attemptLocalPlayback("state-sync");
        } else {
          audioRef.current.pause();
        }
      }
    } else if (current.type === 'youtube') {
      if (audioRef.current) audioRef.current.pause();
      const timer = setTimeout(() => {
        if (!iframeRef.current?.contentWindow) return;
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: isPlaying ? 'playVideo' : 'pauseVideo' }), '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }), '*'
        );
        
        if (timeToRestoreRef.current !== null) {
          iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [timeToRestoreRef.current, true] }), '*');
          timeToRestoreRef.current = null;
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [attemptLocalPlayback, isPlaying, currentIndex, volume, current]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (typeof window !== 'undefined') {
      localStorage.setItem('forbiddens_music_volume', volume.toString());
      persistMusicSession({ volume });
    }
  }, [persistMusicSession, volume]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || current?.type !== 'youtube') return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number' && !isSeeking) setCurrentTime(data.info.currentTime);
          if (typeof data.info.duration === 'number') setDuration(data.info.duration);
          if (data.info.playerState === 0) next();
        }
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isSeeking, currentIndex, current]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (isPlaying && current?.type === 'youtube' && iframeRef.current?.contentWindow) {
      pollRef.current = setInterval(() => {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*');
      }, 1000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isPlaying, currentIndex, current]);

  const handleLocalTimeUpdate = () => {
    if (audioRef.current && !isSeeking) setCurrentTime(audioRef.current.currentTime);
  };
  
  const handleLocalEnded = () => next();

  useEffect(() => {
    onPauseMusic(() => setIsPlaying(false));
  }, [onPauseMusic]);

  useEffect(() => {
    let animationId: number;
    let mainHeights = new Array(16).fill(0);
    let miniHeights = new Array(10).fill(0);

    const animate = () => {
      const drawCanvas = (canvas: HTMLCanvasElement | null, hArray: number[], bars: number) => {
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const barWidth = canvas.width / bars;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < bars; i++) {
          if (isPlaying && volume > 0) {
            const target = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;
            hArray[i] += (target - hArray[i]) * 0.15;
          } else { hArray[i] *= 0.92; }
          const h = Math.max(2, hArray[i]);
          const gradient = ctx.createLinearGradient(0, canvas.height - h, 0, canvas.height);
          const isMiMelodia = document.documentElement.matches('.skin-theme-mi_melodia_rosa, [data-skin-slug="mi_melodia_rosa"], [style*="--skin-slug: mi_melodia_rosa"]')
            || document.body.matches('.skin-theme-mi_melodia_rosa, [data-skin-slug="mi_melodia_rosa"]');
          gradient.addColorStop(0, isMiMelodia ? "rgba(216, 130, 183, 0.95)" : "rgba(34, 211, 238, 0.9)");
          gradient.addColorStop(1, isMiMelodia ? "rgba(125, 77, 157, 0.38)" : "rgba(34, 211, 238, 0.2)");
          ctx.fillStyle = gradient;
          ctx.fillRect(i * barWidth + 1, canvas.height - h, barWidth - 2, h);
        }
      };

      drawCanvas(canvasRef.current, mainHeights, 16);
      drawCanvas(miniCanvasRef.current, miniHeights, 10);
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, volume]);

  const next = useCallback(() => {
    if (playlist.length === 0) return;
    setCurrentIndex(i => (i + 1) % playlist.length);
    setCurrentTime(0); setSeekDisplayValue(0); setDuration(0);
    timeToRestoreRef.current = null; 
    setIsPlaying(true);
  }, [playlist.length]);

  const prev = useCallback(() => {
    if (playlist.length === 0) return;
    setCurrentIndex(i => (i - 1 + playlist.length) % playlist.length);
    setCurrentTime(0); setSeekDisplayValue(0); setDuration(0);
    timeToRestoreRef.current = null; 
    setIsPlaying(true);
  }, [playlist.length]);

  const seekToTime = useCallback((targetTime: number) => {
    const max = duration > 0 && Number.isFinite(duration) ? duration : Math.max(targetTime, currentTime, 0);
    const safeTime = Math.max(0, Math.min(Number.isFinite(max) ? max : targetTime, targetTime));
    setCurrentTime(safeTime);
    setSeekDisplayValue(safeTime);
    timeToRestoreRef.current = null;
    persistMusicSession({ time: safeTime });

    if (current?.type === 'local' && audioRef.current) {
      audioRef.current.currentTime = safeTime;
    } else if (current?.type === 'youtube' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [safeTime, true] }), '*');
    }
  }, [current?.type, currentTime, duration, persistMusicSession]);

  const runExternalMusicCommand = useCallback((command: string) => {
    if (command === "playPause") {
      setIsPlaying((playing) => !playing);
      return;
    }
    if (command === "next") {
      next();
      return;
    }
    if (command === "prev") {
      prev();
    }
  }, [next, prev]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const mediaSession = (navigator as any).mediaSession;
    if (!mediaSession) return;

    try {
      mediaSession.metadata = current
        ? new (window as any).MediaMetadata({
            title: current.title || "FORBIDDENS Player",
            artist: playlistName || currentCategory || "FORBIDDENS",
            album: "Chill Music Player",
            artwork: MEDIA_SESSION_ARTWORK,
          })
        : new (window as any).MediaMetadata({
            title: "FORBIDDENS Player",
            artist: "FORBIDDENS",
            album: "Chill Music Player",
            artwork: MEDIA_SESSION_ARTWORK,
          });
    } catch {
      // MediaMetadata can be unavailable in some embedded browsers.
    }

    try {
      mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {}

    const setAction = (action: string, handler: (() => void) | ((details: any) => void) | null) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers expose Media Session but do not support every action.
      }
    };

    setAction("play", () => setIsPlaying(true));
    setAction("pause", () => setIsPlaying(false));
    setAction("stop", () => setIsPlaying(false));
    setAction("nexttrack", () => next());
    setAction("previoustrack", () => prev());
    setAction("seekbackward", (details: any) => seekToTime(Math.max(0, currentTime - Number(details?.seekOffset || 10))));
    setAction("seekforward", (details: any) => seekToTime(currentTime + Number(details?.seekOffset || 10)));
    setAction("seekto", (details: any) => {
      if (typeof details?.seekTime === "number") seekToTime(details.seekTime);
    });

    return () => {
      ["play", "pause", "stop", "nexttrack", "previoustrack", "seekbackward", "seekforward", "seekto"].forEach((action) => {
        setAction(action, null);
      });
    };
  }, [current, currentCategory, currentTime, isPlaying, next, playlistName, prev, seekToTime]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const mediaSession = (navigator as any).mediaSession;
    if (!mediaSession?.setPositionState || !current) return;
    const safeDuration = duration > 0 && Number.isFinite(duration) ? duration : 0;
    if (safeDuration <= 0) return;
    try {
      mediaSession.setPositionState({
        duration: safeDuration,
        playbackRate: 1,
        position: Math.max(0, Math.min(currentTime, safeDuration)),
      });
    } catch {}
  }, [current, currentTime, duration]);

  useEffect(() => {
    const handlePayload = (payload: any) => {
      if (!payload || payload.type !== "forbiddens-music-command" || typeof payload.command !== "string") return;
      runExternalMusicCommand(payload.command);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "forbiddens_music_command" || !event.newValue) return;
      try {
        handlePayload(JSON.parse(event.newValue));
      } catch {}
    };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("forbiddens_music_player") : null;
    channel?.addEventListener("message", (event) => handlePayload(event.data));
    window.addEventListener("storage", handleStorage);
    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [runExternalMusicCommand]);

  useEffect(() => {
    const commandsByMediaKey: Record<string, string> = {
      MediaPlayPause: "playPause",
      PlayPause: "playPause",
      MediaTrackNext: "next",
      MediaNextTrack: "next",
      MediaTrackPrevious: "prev",
      MediaPreviousTrack: "prev",
      MediaStop: "pause",
    };

    const handleMediaKey = (event: KeyboardEvent) => {
      const command = commandsByMediaKey[event.code] || commandsByMediaKey[event.key];
      if (!command) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (command === "pause") {
        setIsPlaying(false);
        return;
      }
      runExternalMusicCommand(command);
    };

    window.addEventListener("keydown", handleMediaKey, true);
    document.addEventListener("keydown", handleMediaKey, true);
    return () => {
      window.removeEventListener("keydown", handleMediaKey, true);
      document.removeEventListener("keydown", handleMediaKey, true);
    };
  }, [runExternalMusicCommand]);

  const serializeYoutubeSongs = (songs: Song[]) => songs
    .filter((song) => song.type === "youtube")
    .map(normalizeSavedYoutubeSong)
    .filter((song): song is Song => Boolean(song))
    .map((song) => ({
      id: song.id,
      title: song.title,
      url: song.url,
      type: "youtube",
      category: "Custom",
    }));

  const persistPersonalPlaylistOrder = useCallback(async (playlistId: string | null, name: string, songs: Song[]) => {
    if (!user || !playlistId) return;
    const youtubeSongs = serializeYoutubeSongs(songs);
    if (!youtubeSongs.length) return;
    try {
      const { error } = await (supabase as any)
        .from("user_music_playlists")
        .update({ songs: youtubeSongs })
        .eq("id", playlistId)
        .eq("user_id", user.id);
      if (error) throw error;
      setSavedPlaylists((items) => items.map((item) => (
        item.id === playlistId ? { ...item, name, songs: youtubeSongs as Song[] } : item
      )));
    } catch (error) {
      console.error("No se pudo guardar el orden de la playlist", error);
    }
  }, [user]);

  const reorderPlaylist = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= playlist.length || toIndex >= playlist.length) return;
    const nextList = [...playlist];
    const [moved] = nextList.splice(fromIndex, 1);
    nextList.splice(toIndex, 0, moved);
    let nextCurrentIndex = currentIndex;
    if (fromIndex === currentIndex) nextCurrentIndex = toIndex;
    else if (fromIndex < currentIndex && toIndex >= currentIndex) nextCurrentIndex = currentIndex - 1;
    else if (fromIndex > currentIndex && toIndex <= currentIndex) nextCurrentIndex = currentIndex + 1;
    setPlaylist(nextList);
    setCurrentIndex(nextCurrentIndex);
    storePlaylistOrder(nextList, currentCategory);
    void persistPersonalPlaylistOrder(activePersonalPlaylistId, playlistName.trim() || currentCategory, nextList);
  };

  const updateDragTargetFromPoint = (clientX: number, clientY: number) => {
    const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const row = target?.closest<HTMLElement>("[data-song-index]");
    const index = row ? Number(row.dataset.songIndex) : NaN;
    if (Number.isInteger(index) && index >= 0 && index < playlist.length) {
      dragOverSongIndexRef.current = index;
      setDragOverSongIndex(index);
    }
  };

  const startSongDrag = (event: ReactPointerEvent, index: number) => {
    if (playlist.length < 2) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragOverSongIndexRef.current = index;
    setDraggedSongIndex(index);
    setDragOverSongIndex(index);
  };

  const moveSongDrag = (event: ReactPointerEvent) => {
    if (draggedSongIndex === null) return;
    event.preventDefault();
    updateDragTargetFromPoint(event.clientX, event.clientY);
  };

  const finishSongDrag = (event: ReactPointerEvent) => {
    if (draggedSongIndex === null) return;
    event.preventDefault();
    event.stopPropagation();
    const fromIndex = draggedSongIndex;
    const toIndex = dragOverSongIndexRef.current;
    if (toIndex !== null) reorderPlaylist(fromIndex, toIndex);
    setDraggedSongIndex(null);
    setDragOverSongIndex(null);
    dragOverSongIndexRef.current = null;
  };

  const removeSong = (idx: number) => {
    const newList = playlist.filter((_, i) => i !== idx);
    setPlaylist(newList);
    storePlaylistOrder(newList, currentCategory);
    void persistPersonalPlaylistOrder(activePersonalPlaylistId, playlistName.trim() || currentCategory, newList);
    if (idx === currentIndex) setCurrentIndex(0);
    else if (idx < currentIndex) setCurrentIndex(p => p - 1);
  };

  const getYoutubePlaylistId = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get("list") || "";
    } catch {
      const match = url.match(/[?&]list=([\w-]+)/);
      return match?.[1] || "";
    }
  };

  const extractJsonObject = (html: string, marker: string) => {
    const markerIndex = html.indexOf(marker);
    if (markerIndex === -1) return null;
    const startIndex = html.indexOf("{", markerIndex);
    if (startIndex === -1) return null;
    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = startIndex; i < html.length; i += 1) {
      const char = html[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === "\\") {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
      } else {
        if (char === '"') {
          inString = true;
        } else if (char === "{") {
          depth += 1;
        } else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            return html.slice(startIndex, i + 1);
          }
        }
      }
    }

    return null;
  };

  const collectYoutubeIdsFromData = (data: any, ids: Set<string>) => {
    if (!data || typeof data !== "object") return;
    if (Array.isArray(data)) {
      data.forEach((item) => collectYoutubeIdsFromData(item, ids));
      return;
    }
    for (const key of Object.keys(data)) {
      const value = data[key];
      if (key === "videoId" && typeof value === "string" && value.length === 11) {
        ids.add(value);
      } else {
        collectYoutubeIdsFromData(value, ids);
      }
    }
  };

  const fetchYoutubePlaylistSongs = async (url: string): Promise<Song[]> => {
    const playlistId = getYoutubePlaylistId(url);
    const explicitIds = Array.from(new Set(Array.from(url.matchAll(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/g)).map((match) => match[1])));

    if (!playlistId) {
      return Promise.all(explicitIds.map(async (youtubeId) => ({
        id: youtubeId,
        title: await fetchYoutubeTitle(`https://www.youtube.com/watch?v=${youtubeId}`) || `YouTube ${youtubeId}`,
        url: `https://www.youtube.com/watch?v=${youtubeId}`,
        type: 'youtube',
        category: 'Custom',
      })));
    }

    const invidiousInstances = [
      'https://yewtu.cafe',
      'https://yewtu.eu',
      'https://yewtu.snopyta.org',
      'https://yewtu.cafe'
    ];

    for (const instance of invidiousInstances) {
      try {
        const invidResponse = await fetch(`${instance}/api/v1/playlists/${playlistId}?fields=videos`, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!invidResponse.ok) continue;
        const data = await invidResponse.json() as any;
        if (data?.videos && Array.isArray(data.videos) && data.videos.length > 0) {
          return Promise.all(data.videos.map(async (video: any) => ({
            id: `${playlistId}_${video.videoId}`,
            title: video.title || `YouTube ${video.videoId}`,
            url: `https://www.youtube.com/watch?v=${video.videoId}&list=${playlistId}`,
            type: 'youtube' as const,
            category: 'Custom',
          })));
        }
      } catch {
        // Continuar con el siguiente servicio
      }
    }

    try {
      const proxyUrl = `https://r.jina.ai/http://www.youtube.com/playlist?list=${playlistId}`;
      const htmlResponse = await fetch(proxyUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!htmlResponse.ok) throw new Error("playlist proxy unavailable");
      const html = await htmlResponse.text();

      const ids = new Set<string>();
      const patterns = [
        /\/watch\?v=([A-Za-z0-9_-]{11})/g,
        /youtu\.be\/([A-Za-z0-9_-]{11})/g,
        /v=([A-Za-z0-9_-]{11})/g,
        /"videoId":"([A-Za-z0-9_-]{11})"/g,
      ];

      patterns.forEach((pattern) => {
        const matches = Array.from(html.matchAll(pattern));
        matches.forEach((match) => {
          if (match[1] && match[1].length === 11) ids.add(match[1]);
        });
      });

      if (ids.size > 0) {
        const uniqueIds = Array.from(ids);
        return Promise.all(uniqueIds.map(async (youtubeId) => ({
          id: `${playlistId}_${youtubeId}`,
          title: await fetchYoutubeTitle(`https://www.youtube.com/watch?v=${youtubeId}`) || `YouTube ${youtubeId}`,
          url: `https://www.youtube.com/watch?v=${youtubeId}&list=${playlistId}`,
          type: 'youtube' as const,
          category: 'Custom',
        })));
      }
    } catch {
      // fallback to explicit IDs if possible
    }

    if (explicitIds.length > 0) {
      return Promise.all(explicitIds.map(async (youtubeId) => ({
        id: youtubeId,
        title: await fetchYoutubeTitle(`https://www.youtube.com/watch?v=${youtubeId}`) || `YouTube ${youtubeId}`,
        url: `https://www.youtube.com/watch?v=${youtubeId}`,
        type: 'youtube',
        category: 'Custom',
      })));
    }

    return [];
  };

  const addSong = async () => {
    if (!newSongUrl.trim()) return;
    const youtubeId = getYoutubeId(newSongUrl.trim());
    if (!youtubeId) return;
    const resolvedTitle = newSongTitle.trim() || await fetchYoutubeTitle(newSongUrl.trim());
    const newSong: Song = {
      id: youtubeId,
      title: resolvedTitle || `YouTube Track`,
      url: newSongUrl,
      type: 'youtube',
      category: 'Custom'
    };
    setPlaylist(prev => [...prev, newSong]);
    const nextCategory = playlistName.trim() || (activePersonalPlaylistId || currentCategory !== 'Todos' ? currentCategory : 'Personal');
    setCurrentCategory(nextCategory);
    persistMusicSession({ category: nextCategory, personalPlaylistId: activePersonalPlaylistId, playlistName: playlistName || nextCategory });
    setNewSongUrl(""); setNewSongTitle(""); setShowAddSong(false);
  };

  const importPlaylist = async () => {
    if (!newSongUrl.trim()) return;
    setIsImportingPlaylist(true);
    try {
      const songs = await fetchYoutubePlaylistSongs(newSongUrl.trim());
      if (!songs.length) return;
      setPlaylist(prev => [...prev, ...songs]);
      const nextCategory = playlistName.trim() || (activePersonalPlaylistId || currentCategory !== 'Todos' ? currentCategory : 'Personal');
      setCurrentCategory(nextCategory);
      persistMusicSession({ category: nextCategory, personalPlaylistId: activePersonalPlaylistId, playlistName: playlistName || nextCategory });
      setNewSongUrl(""); setNewSongTitle(""); setShowAddSong(false);
    } finally {
      setIsImportingPlaylist(false);
    }
  };

  const loadPersonalPlaylist = (saved: SavedPlaylist) => {
    const songs = normalizeSavedYoutubeSongs(saved.songs);
    if (!songs.length) return;
    const savedSession = readMusicSession();
    const shouldResume = savedSession?.personalPlaylistId === saved.id;
    const restoreIndex = shouldResume ? findSongIndex(songs, savedSession.songKey, Number(savedSession.index || 0)) : 0;
    const restoreTime = shouldResume ? Math.max(0, Number(savedSession.time || 0)) : 0;
    const restoreVolume = shouldResume ? clampVolume(savedSession.volume, volume) : volume;
    setPlaylist(songs);
    setCurrentCategory(saved.name);
    setActivePersonalPlaylistId(saved.id);
    setCurrentIndex(restoreIndex);
    setCurrentTime(restoreTime);
    setDuration(0);
    setSeekDisplayValue(restoreTime);
    timeToRestoreRef.current = restoreTime > 0 ? restoreTime : null;
    setVolume(restoreVolume);
    setIsPlaying(shouldResume ? Boolean(savedSession.playing) : saved.songs.length > 0);
    setPlaylistName(saved.name);
    persistMusicSession({
      category: saved.name,
      personalPlaylistId: saved.id,
      playlistName: saved.name,
      index: restoreIndex,
      songKey: songs[restoreIndex] ? getSongOrderKey(songs[restoreIndex]) : "",
      time: restoreTime,
      volume: restoreVolume,
      playing: shouldResume ? Boolean(savedSession.playing) : songs.length > 0,
    });
  };

  const savePersonalPlaylist = async (nameOverride?: string): Promise<boolean> => {
    if (!user || savingPlaylist) return false;
    const youtubeSongs = playlist.filter((song) => song.type === "youtube");
    const name = nameOverride?.trim() || playlistName.trim() || (currentCategory && currentCategory !== "Todos" ? currentCategory : "Mi playlist");
    if (!name.trim()) return false;
    setPlaylistName(name);
    setCurrentCategory(name);
    setSavingPlaylist(true);
    try {
      const selected = savedPlaylists.find((item) => item.name.toLowerCase() === name.toLowerCase());
      let nextActiveId = selected?.id || null;
      const youtubeSongsPayload = serializeYoutubeSongs(youtubeSongs);
      if (selected) {
        if (youtubeSongsPayload.length > 0) {
          const { error } = await (supabase as any).from("user_music_playlists").update({ user_id: user.id, name, songs: youtubeSongsPayload }).eq("id", selected.id).eq("user_id", user.id);
          if (error) throw error;
        }
      } else {
        const { data, error } = await (supabase as any).from("user_music_playlists").insert({ user_id: user.id, name, songs: youtubeSongsPayload }).select("id").single();
        if (error) throw error;
        nextActiveId = data?.id || null;
      }
      await loadSavedPlaylists();
      const songs = youtubeSongsPayload as Song[];
      setSavedPlaylists((items) => {
        if (nextActiveId && !items.some((item) => item.id === nextActiveId)) {
          return [{ id: nextActiveId, name, songs }, ...items];
        }
        return items.map((item) => item.id === nextActiveId ? { ...item, name, songs } : item);
      });
      setPlaylistName(name);
      setCurrentCategory(name);
      setActivePersonalPlaylistId(nextActiveId);
      storePlaylistOrder(youtubeSongs, name);
      persistMusicSession({ category: name, personalPlaylistId: nextActiveId, playlistName: name });
      return true;
    } catch (error) {
      console.error("No se pudo guardar la playlist", error);
      return false;
    } finally {
      setSavingPlaylist(false);
    }
  };

  const deletePersonalPlaylist = async (id: string) => {
    if (!user) return;
    try {
      await (supabase as any).from("user_music_playlists").delete().eq("id", id).eq("user_id", user.id);
      if (activePersonalPlaylistId === id) {
        setActivePersonalPlaylistId(null);
        persistMusicSession({ personalPlaylistId: null, playlistName: "" });
      }
      await loadSavedPlaylists();
    } catch (error) {
      console.error("No se pudo borrar la playlist", error);
    }
  };

  const handleSeekChange = (v: number[]) => {
    setIsSeeking(true);
    setSeekDisplayValue(v[0]);
  };

  const handleSeekCommit = (v: number[]) => {
    const t = v[0];
    setIsSeeking(false);
    setCurrentTime(t);
    setSeekDisplayValue(t);
    timeToRestoreRef.current = null; 
    persistMusicSession({ time: t });
    
    if (current?.type === 'local' && audioRef.current) {
      audioRef.current.currentTime = t;
    } else if (current?.type === 'youtube' && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [t, true] }), '*');
    }
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const displayTime = isSeeking ? seekDisplayValue : currentTime;
  const sliderMax = duration > 0 && isFinite(duration) ? duration : 1;
  const currentYoutubeId = current?.type === 'youtube' ? getYoutubeId(current.url) : "";

  const syncYoutubePlayer = () => {
    const playerWindow = iframeRef.current?.contentWindow;
    if (!playerWindow) return;
    playerWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }), '*'
    );
    playerWindow.postMessage(
      JSON.stringify({ event: 'command', func: isPlaying ? 'playVideo' : 'pauseVideo' }), '*'
    );
    if (timeToRestoreRef.current !== null) {
      playerWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [timeToRestoreRef.current, true] }), '*'
      );
      timeToRestoreRef.current = null;
    }
  };

  const renderYT = currentYoutubeId ? (
    <iframe
      ref={iframeRef}
      key={`yt-${currentYoutubeId}`}
      src={`https://www.youtube.com/embed/${currentYoutubeId}?enablejsapi=1&autoplay=${isPlaying ? 1 : 0}&origin=${encodeURIComponent(window.location.origin)}`}
      className="w-0 h-0 absolute pointer-events-none"
      allow="autoplay"
      title="Chill Music"
      onLoad={() => window.setTimeout(syncYoutubePlayer, 180)}
    />
  ) : null;

  const renderLocal = (
    <audio 
      ref={audioRef}
      src={current?.type === 'local' ? current.url : ""}
      preload="auto"
      onTimeUpdate={handleLocalTimeUpdate}
      onLoadedMetadata={handleLocalLoadedMeta}
      onCanPlay={() => {
        if (isPlaying) attemptLocalPlayback("canplay");
      }}
      onEnded={handleLocalEnded}
      onError={() => {
        const error = audioRef.current?.error;
        console.warn("Error cargando audio local.", {
          code: error?.code,
          message: error?.message,
          url: current?.type === 'local' ? current.url : "",
        });
        setIsPlaying(false);
      }}
    />
  );

  // 🎮 VISTA COMPACTA dentro del emulador
  const compactContent = (
    <div className="chill-emulator-compact w-full">
      {renderYT} {renderLocal}
      <div
        className={cn(
          "chill-emulator-panel relative w-full overflow-hidden rounded-md",
          "bg-gradient-to-b from-black/95 via-background/95 to-black/95",
          "border border-neon-cyan/50",
          "shadow-[0_0_12px_rgba(34,211,238,0.35),inset_0_0_8px_rgba(34,211,238,0.08)]",
          "backdrop-blur-sm"
        )}
      >
        <div className="chill-emulator-header relative flex items-center gap-1 px-1 py-0.5 border-b border-neon-cyan/25 bg-neon-cyan/5">
          <Music className="w-2 h-2 text-neon-magenta shrink-0 drop-shadow-[0_0_4px_rgba(236,72,153,0.8)]" />
          <div className="relative flex-1 min-w-0 overflow-hidden">
            <p className="text-[7px] font-pixel text-neon-cyan whitespace-nowrap leading-none drop-shadow-[0_0_3px_rgba(34,211,238,0.7)] truncate mt-[1px]">
              FORBIDDENS PLAYER
            </p>
          </div>
          <span
            className={cn(
              "w-1 h-1 rounded-full shrink-0 transition-colors",
              isPlaying ? "bg-neon-green shadow-[0_0_4px_rgba(74,222,128,0.9)] animate-pulse" : "bg-muted-foreground/50"
            )}
          />
        </div>

        <div className="chill-emulator-track px-1 pt-1 pb-0.5">
          <div 
            className="relative w-full overflow-hidden rounded-sm bg-black/60 border border-neon-cyan/20 h-4 flex items-center" 
            style={{ boxShadow: 'inset 0 0 4px rgba(34,211,238,0.2)' }}
          >
            <div className="flex w-max animate-marquee-x whitespace-nowrap">
              {[0, 1].map((k) => (
                <span
                  key={k}
                  className="chill-current-song-title font-pixel leading-none px-2"
                  style={{
                    color: '#00f2fe',
                    fontSize: '7px',
                    letterSpacing: '0.5px',
                    textShadow: '0 0 3px rgba(34, 211, 238, 0.9)',
                  }}
                >
                  {current?.title ? `♪ ${current.title} ` : "♪ NO SIGNAL ♫ "} •&nbsp;
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="chill-emulator-controls flex flex-col items-center gap-0.5 px-1 py-1">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "chill-emulator-play relative p-1.5 rounded-full border transition-all active:scale-90",
              isPlaying
                ? "bg-neon-magenta/20 border-neon-magenta/60 text-neon-magenta shadow-[0_0_8px_rgba(236,72,153,0.6)]"
                : "bg-neon-green/20 border-neon-green/60 text-neon-green shadow-[0_0_8px_rgba(74,222,128,0.6)]"
            )}
          >
            {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-[1px]" />}
          </button>

          <div className="chill-emulator-skip flex items-center justify-center gap-0.5">
            <button onClick={prev} className="chill-emulator-skip-button w-6 h-4 flex items-center justify-center rounded-sm bg-neon-cyan/20 border border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan/40 hover:shadow-[0_0_6px_rgba(34,211,238,0.7)] transition-all active:scale-90">
              <SkipBack className="w-2 h-2 fill-current" />
            </button>
            <button onClick={next} className="chill-emulator-skip-button w-6 h-4 flex items-center justify-center rounded-sm bg-neon-cyan/20 border border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan/40 hover:shadow-[0_0_6px_rgba(34,211,238,0.7)] transition-all active:scale-90">
              <SkipForward className="w-2 h-2 fill-current" />
            </button>
          </div>

          <div className="chill-emulator-volume-buttons flex items-center justify-center gap-0.5 mt-0.5">
            <button onClick={() => setVolume(v => Math.max(0, v - 10))} className="chill-emulator-volume-button w-6 h-4 flex items-center justify-center rounded-sm bg-neon-magenta/25 border border-neon-magenta/60 text-neon-magenta hover:bg-neon-magenta/50 hover:shadow-[0_0_6px_rgba(236,72,153,0.7)] font-pixel text-[10px] leading-none transition-all active:scale-90">
              −
            </button>
            <button onClick={() => setVolume(v => Math.min(100, v + 10))} className="chill-emulator-volume-button w-6 h-4 flex items-center justify-center rounded-sm bg-neon-green/25 border border-neon-green/60 text-neon-green hover:bg-neon-green/50 hover:shadow-[0_0_6px_rgba(74,222,128,0.7)] font-pixel text-[9px] leading-none transition-all active:scale-90">
              +
            </button>
          </div>

          <div className="chill-emulator-volume-label flex items-center justify-center gap-0.5">
            {isMuted || volume === 0 ? <VolumeX className="w-2 h-2 text-muted-foreground" /> : <Volume2 className="w-2 h-2 text-neon-cyan" />}
            <span className="text-[7px] font-pixel text-neon-cyan tabular-nums">{volume}%</span>
          </div>
        </div>

        <div className="chill-emulator-category px-1 pb-1">
          <button
            ref={categoryBtnRef}
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowCategoryMenu(v => !v); }}
            className="w-full flex items-center justify-between gap-0.5 bg-black/50 hover:bg-neon-cyan/10 border border-neon-cyan/30 hover:border-neon-cyan/60 rounded px-1 py-0.5 transition-all"
          >
            <div className="flex items-center gap-0.5 min-w-0">
              <ListFilter className="w-2 h-2 text-neon-magenta shrink-0" />
              <span className="text-[6px] font-pixel text-neon-cyan truncate uppercase tracking-wider mt-[1px]">
                {currentCategory}
              </span>
            </div>
            {showCategoryMenu ? <ChevronUp className="w-2 h-2 text-neon-cyan shrink-0" /> : <ChevronDown className="w-2 h-2 text-neon-cyan shrink-0" />}
          </button>
        </div>
      </div>

      {showCategoryMenu && categoryBtnRef.current && (() => {
        const btnRect = categoryBtnRef.current!.getBoundingClientRect();
        const right = Math.max(8, window.innerWidth - btnRect.right);
        const bottom = Math.max(8, window.innerHeight - btnRect.top + 8);
        return createPortal(
          <div
            className={cn("fixed inset-0 animate-fade-in", rositaEmulatorPalette && "rosita-music-menu-overlay")}
            style={{ zIndex: 2147483647 }}
            onClick={(e) => { e.stopPropagation(); setShowCategoryMenu(false); }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              style={{ right, bottom }}
              className={cn(
                "absolute min-w-[140px] max-w-[200px] bg-black/95 border-2 border-neon-cyan/60 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.5),inset_0_0_10px_rgba(34,211,238,0.1)] overflow-hidden backdrop-blur-md",
                rositaEmulatorPalette && "rosita-music-menu",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute -bottom-[7px] right-3 w-3 h-3 bg-black/95 border-r-2 border-b-2 border-neon-cyan/60 rotate-45" />
              <div className="relative">
                <div className="px-2 py-1 border-b border-neon-cyan/30 bg-neon-cyan/10">
                  <p className="text-[8px] font-pixel text-neon-cyan uppercase tracking-widest text-center">♪ Playlist ♪</p>
                </div>
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleCategoryChange(cat); setShowCategoryMenu(false); }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-[9px] font-pixel uppercase tracking-wider transition-all border-b border-neon-cyan/15 last:border-0",
                      currentCategory === cat ? "bg-neon-cyan/25 text-neon-cyan shadow-[inset_0_0_8px_rgba(34,211,238,0.3)]" : "text-muted-foreground hover:bg-neon-cyan/10 hover:text-neon-cyan"
                    )}
                  >
                    {cat === "Todos" ? "★ Todos" : cat}
                  </button>
                ))}
                {savedPlaylists.length > 0 && (
                  <div className="border-t border-neon-cyan/25 bg-neon-cyan/5 px-2 py-1">
                    <p className="text-[7px] font-pixel uppercase tracking-widest text-muted-foreground">Mis listas</p>
                  </div>
                )}
                {savedPlaylists.map((saved) => (
                  <button
                    key={saved.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); loadPersonalPlaylist(saved); setShowCategoryMenu(false); }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-[9px] font-pixel uppercase tracking-wider transition-all border-b border-neon-cyan/15 last:border-0",
                      activePersonalPlaylistId === saved.id ? "bg-neon-magenta/20 text-neon-magenta shadow-[inset_0_0_8px_rgba(236,72,153,0.24)]" : "text-muted-foreground hover:bg-neon-magenta/10 hover:text-neon-magenta"
                    )}
                    title={saved.name}
                  >
                    <span className="block truncate">{saved.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}

      {/* 🔥 AVISO CENTRADO PERFECTAMENTE 🔥 */}
      {(songToast || rositaEditorPreview) && inEmulator && typeof document !== 'undefined' && (() => {
        const viewport = document.getElementById('game-bubble-viewport');
        if (!viewport) return null;
        const toastTitle = songToast?.title || current?.title || "FORBIDDENS PLAYER";
        return createPortal(
          <div key={songToast?.id || "rosita-editor-song-preview"} className="rosita-song-toast pointer-events-none absolute top-4 left-0 w-full flex justify-center z-[80] animate-fade-in">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 border border-neon-cyan/60 shadow-[0_0_14px_rgba(34,211,238,0.45),inset_0_0_8px_rgba(34,211,238,0.15)] backdrop-blur-md max-w-[80vw]">
              <Music className="w-3 h-3 text-neon-magenta shrink-0 drop-shadow-[0_0_4px_rgba(236,72,153,0.8)]" />
              <span className="font-pixel text-[8px] text-neon-cyan uppercase tracking-wider drop-shadow-[0_0_3px_rgba(34,211,238,0.7)] truncate">
                ♪ {toastTitle}
              </span>
            </div>
          </div>,
          viewport
        );
      })()}
    </div>
  );

  // 🔻 VISTA MINIMIZADA
  const minimizedContent = (
    <div className="w-full relative shadow-lg p-[5px]">
      {renderYT} {renderLocal}
      <div className="bg-card border border-neon-cyan/30 rounded p-1.5 sm:p-2">
        <div className="flex items-center gap-1">
          <button onClick={prev} className="p-1 text-muted-foreground hover:text-foreground shrink-0 transition-colors">
            <SkipBack className="w-3 h-3" />
          </button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-1 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors shrink-0">
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button onClick={next} className="p-1 text-muted-foreground hover:text-foreground shrink-0 transition-colors">
            <SkipForward className="w-3 h-3" />
          </button>

          <div className="chill-flame-wave-mini ml-1 h-4 w-8 shrink-0 rounded bg-muted/30">
            <canvas ref={miniCanvasRef} width={30} height={16} className="relative z-10 h-4 w-8 rounded" />
          </div>
          
          <div 
            className="flex-1 overflow-hidden relative h-6 rounded bg-black/60 border border-neon-cyan/20 ml-1 flex items-center" 
            style={{ boxShadow: 'inset 0 0 4px rgba(34,211,238,0.2)' }}
          >
            <div className="flex w-max animate-marquee-x whitespace-nowrap">
              {[0, 1].map((k) => (
                <span
                  key={k}
                  className="chill-current-song-title font-pixel leading-none px-2 mt-[1px]"
                  style={{
                    color: '#00f2fe',
                    fontSize: '10px',
                    letterSpacing: '1px',
                    textShadow: '0 0 3px rgba(34, 211, 238, 0.9), 0 0 6px rgba(34, 211, 238, 0.6)',
                  }}
                >
                  {current?.title ? `♪ ${current.title} ` : "♪ NO SIGNAL ♫ "} •&nbsp;
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={() => {
              setMinimized(false);
              window.dispatchEvent(new Event("openMobilePanel"));
            }}
            className="p-1 text-muted-foreground hover:text-foreground shrink-0 ml-1"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  // 🖥️ VISTA COMPLETA
  const fullContent = (
    <div className="w-full relative shadow-lg p-[5px]">
      {renderYT} {renderLocal}
      <div className="bg-card border border-neon-cyan/30 rounded overflow-visible relative">
        <div className="flex flex-col border-b border-border/50">
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="font-pixel text-[8px] text-neon-cyan">FORBIDDENS PLAYER</span>
            </div>
            <button onClick={() => setMinimized(true)} className="p-0.5 text-muted-foreground hover:text-foreground">
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <div className="px-2.5 pb-2 relative z-50">
            <button onClick={() => setShowCategoryMenu(!showCategoryMenu)} className="w-full flex items-center justify-between bg-muted/30 hover:bg-muted/50 border border-border/50 rounded px-2 py-1.5 transition-colors cursor-pointer">
              <div className="flex items-center gap-2"><ListFilter className="w-3 h-3 text-muted-foreground" /><span className="text-[9px] font-body text-foreground">{currentCategory === "Todos" ? "Todos los géneros" : currentCategory}</span></div>
              {showCategoryMenu ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </button>
            {showCategoryMenu && (
              <div className="absolute top-full left-2.5 right-2.5 mt-1 bg-background border border-neon-cyan/30 rounded shadow-2xl overflow-hidden z-50 animate-fade-in">
                {categories.map(cat => (
                  <button key={cat} onClick={() => handleCategoryChange(cat)} className={cn("w-full text-left px-3 py-2 text-[9px] font-body transition-colors border-b border-border/30 last:border-0", currentCategory === cat ? "bg-neon-cyan/10 text-neon-cyan border-l-2 border-l-neon-cyan" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-l-transparent")}>{cat === "Todos" ? "Todos los géneros" : cat}</button>
                ))}
                {savedPlaylists.length > 0 && (
                  <div className="border-y border-border/30 bg-muted/20 px-3 py-1.5">
                    <p className="font-pixel text-[8px] uppercase tracking-widest text-muted-foreground">Mis listas</p>
                  </div>
                )}
                {savedPlaylists.map((saved) => (
                  <button
                    key={saved.id}
                    onClick={() => {
                      loadPersonalPlaylist(saved);
                      setShowCategoryMenu(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 border-b border-border/30 px-3 py-2 text-left text-[9px] font-body transition-colors last:border-0 border-l-2",
                      activePersonalPlaylistId === saved.id
                        ? "border-l-neon-magenta bg-neon-magenta/10 text-neon-magenta"
                        : "border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                    title={saved.name}
                  >
                    <span className="min-w-0 truncate">{saved.name}</span>
                    <span className="shrink-0 text-[8px] opacity-70">{saved.songs.length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-2.5 pt-2">
          <div className="chill-flame-wave h-8 w-full rounded bg-muted/30">
            <canvas ref={canvasRef} width={200} height={32} className="relative z-10 h-8 w-full rounded" />
          </div>
        </div>

        <div className="px-2.5 py-1.5 text-center flex justify-center">
          <div 
            className="relative w-full max-w-[90%] overflow-hidden rounded bg-black/60 border border-neon-cyan/30 h-6 flex items-center" 
            style={{ boxShadow: 'inset 0 0 6px rgba(34,211,238,0.2)' }}
          >
            <div className="flex w-max animate-marquee-x whitespace-nowrap">
              {[0, 1, 2].map((k) => (
                <span
                  key={k}
                  className="chill-current-song-title font-pixel leading-none px-4 mt-[1px]"
                  style={{
                    color: '#00f2fe',
                    fontSize: '9px',
                    letterSpacing: '1px',
                    textShadow: '0 0 4px rgba(34, 211, 238, 0.9), 0 0 8px rgba(34, 211, 238, 0.6)',
                  }}
                >
                  {current?.title ? `♪ ${current.title} ` : "Cargando música... "} •&nbsp;
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 px-2.5 pb-1 pt-1">
          <button onClick={prev} className="p-1 text-muted-foreground hover:text-foreground"><SkipBack className="w-3.5 h-3.5" /></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors">{isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
          <button onClick={next} className="p-1 text-muted-foreground hover:text-foreground"><SkipForward className="w-3.5 h-3.5" /></button>
        </div>

        <div className="px-3 pb-1">
          <Slider value={[displayTime]} onValueChange={handleSeekChange} onValueCommit={handleSeekCommit} max={sliderMax} step={1} className="chill-music-seek w-full" />
          <div className="flex justify-between text-[8px] text-muted-foreground font-body mt-0.5">
            <span>{formatTime(displayTime)}</span>
            <span>{duration ? formatTime(duration) : current?.type === 'youtube' ? "cargando" : "0:00"}</span>
          </div>
        </div>

        <div className="px-3 pb-2 flex items-center gap-2">
          <button onClick={() => setVolume(v => v === 0 ? 80 : 0)} className="text-muted-foreground shrink-0">
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
          <Slider value={[volume]} onValueChange={v => setVolume(v[0])} max={100} step={5} className="flex-1" />
        </div>

        <button onClick={() => setExpanded(!expanded)} className="w-full text-center py-1 text-[9px] font-body text-muted-foreground hover:text-foreground border-t border-border/50">
          {expanded ? "Ocultar lista" : `Lista (${playlist.length} canciones)`}
        </button>

        {expanded && (
          <div className="max-h-40 overflow-y-auto retro-scrollbar border-t border-border/30">
            {playlist.map((song, i) => (
              <div
                key={`${song.id}-${i}`}
                data-song-index={i}
                onDragEnter={() => draggedSongIndex !== null && setDragOverSongIndex(i)}
                onDragOver={(e) => {
                  if (draggedSongIndex !== null) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedSongIndex !== null) reorderPlaylist(draggedSongIndex, i);
                  setDraggedSongIndex(null);
                  setDragOverSongIndex(null);
                }}
                onDragEnd={() => {
                  setDraggedSongIndex(null);
                  setDragOverSongIndex(null);
                }}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 text-[10px] font-body hover:bg-muted/30 transition-colors group",
                  i === currentIndex && "bg-neon-cyan/10 text-neon-cyan",
                  dragOverSongIndex === i && draggedSongIndex !== i && "outline outline-1 outline-neon-cyan/60 bg-neon-cyan/5",
                  draggedSongIndex === i && "opacity-60"
                )}
              >
                {playlist.length > 1 && (
                  <button
                    type="button"
                    onPointerDown={(e) => startSongDrag(e, i)}
                    onPointerMove={moveSongDrag}
                    onPointerUp={finishSongDrag}
                    onPointerCancel={finishSongDrag}
                    onClick={(e) => e.preventDefault()}
                    className="shrink-0 cursor-grab touch-none rounded px-0.5 text-muted-foreground/70 hover:text-neon-cyan active:cursor-grabbing"
                    title="Arrastrar para ordenar"
                    aria-label="Arrastrar para ordenar"
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                )}
                <button onClick={() => { setCurrentIndex(i); setIsPlaying(true); setCurrentTime(0); }} className="flex-1 text-left truncate cursor-pointer">
                  <span className={i === currentIndex ? "text-neon-cyan" : "text-foreground"}>{song.title}</span>
                </button>
                {playlist.length > 1 && (
                  <button onClick={() => removeSong(i)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-border/50">
          <button onClick={() => setShowAddSong(!showAddSong)} className="w-full flex items-center justify-center gap-1 py-1 text-[9px] font-body text-neon-cyan hover:bg-neon-cyan/10 transition-colors">
            <Plus className="w-3 h-3" /> Agregar YouTube
          </button>
          {showAddSong && (
            <div className="px-2.5 pb-2 space-y-1.5 animate-fade-in">
              <Input placeholder="URL de YouTube o lista" value={newSongUrl} onChange={e => setNewSongUrl(e.target.value)} className="h-6 bg-muted text-[10px] font-body" />
              <Input placeholder="Título (opcional para video único)" value={newSongTitle} onChange={e => setNewSongTitle(e.target.value)} className="h-6 bg-muted text-[10px] font-body" />
              <div className="grid gap-2 sm:grid-cols-2">
                <button onClick={() => void addSong()} className="w-full py-1 rounded bg-neon-cyan/20 text-neon-cyan text-[9px] font-body">Agregar al final</button>
                <button
                  onClick={() => void importPlaylist()}
                  disabled={isImportingPlaylist || !newSongUrl.trim()}
                  className="w-full py-1 rounded bg-neon-green/20 text-neon-green text-[9px] font-body disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isImportingPlaylist ? 'Importando...' : 'Importar lista'}
                </button>
              </div>
            </div>
          )}
        </div>

        {user && (
          <div className="border-t border-border/50 px-2.5 py-2 space-y-1.5">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setNewPlaylistName(playlistName || "");
                  setShowNewPlaylistModal(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 rounded border border-neon-cyan/40 bg-neon-cyan/10 px-3 py-2 text-neon-cyan text-[9px] font-body hover:bg-neon-cyan/15 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Nueva lista
              </button>
              <button
                onClick={() => void savePersonalPlaylist()}
                disabled={savingPlaylist || (!playlistName.trim() && !playlist.some((song) => song.type === "youtube"))}
                className="h-auto shrink-0 rounded border border-neon-green/40 bg-neon-green/15 px-3 py-2 text-neon-green hover:bg-neon-green/25 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                title="Guardar lista"
              >
                <Save className="w-3 h-3" />
              </button>
            </div>
            {savedPlaylists.length > 0 && (
              <div className="max-h-24 overflow-y-auto rounded border border-border/40 bg-black/20 retro-scrollbar">
                {savedPlaylists.map((saved) => (
                  <div key={saved.id} className="flex items-center gap-1 border-b border-border/25 px-1.5 py-1 last:border-0">
                    <button
                      type="button"
                      onClick={() => loadPersonalPlaylist(saved)}
                      className="flex min-w-0 flex-1 items-center gap-1 text-left text-[9px] text-muted-foreground hover:text-neon-cyan"
                      title={saved.name}
                    >
                      <FolderOpen className="h-3 w-3 shrink-0" />
                      <span className="truncate">{saved.name}</span>
                      <span className="shrink-0 text-[8px] opacity-70">{saved.songs.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void deletePersonalPlaylist(saved.id)}
                      className="shrink-0 text-destructive/70 hover:text-destructive"
                      title="Borrar lista"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const newPlaylistModal = showNewPlaylistModal ? (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-neon-cyan/60 bg-black/95 p-5 shadow-[0_0_30px_rgba(34,211,238,0.35)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-neon-cyan/20">
          <div>
            <p className="text-[11px] font-pixel uppercase tracking-[0.25em] text-neon-cyan">Nueva lista</p>
            <p className="text-[9px] text-muted-foreground">Escribe un nombre para guardar esta playlist.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowNewPlaylistModal(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <Input
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="Nombre de la nueva lista"
            className="h-10 bg-muted text-[10px] font-body"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowNewPlaylistModal(false)}
              className="flex-1 rounded border border-border/50 bg-muted/30 px-3 py-2 text-[9px] text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={async () => {
                const trimmedName = newPlaylistName.trim();
                if (trimmedName) {
                  setPlaylistName(trimmedName);
                  setCurrentCategory(trimmedName);
                }
                const success = await savePersonalPlaylist(newPlaylistName);
                if (success) setShowNewPlaylistModal(false);
              }}
              disabled={savingPlaylist || !newPlaylistName.trim()}
              className="flex-1 rounded bg-neon-green px-3 py-2 text-[9px] font-body text-black transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              Guardar
            </button>
          </div>
          <p className="text-[8px] text-muted-foreground">Puedes agregar canciones con el enlace de YouTube y luego presionar "Agregar al final".</p>
        </div>
      </div>
    </div>
  ) : null;

  const content = inEmulator ? compactContent : minimized ? minimizedContent : fullContent;

  if (!portalTarget) return null;
  return createPortal(
    <>
      {content}
      {newPlaylistModal}
    </>,
    portalTarget
  );
}
