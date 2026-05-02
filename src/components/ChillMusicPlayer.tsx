import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, ChevronDown, ChevronUp, Trash2, Plus, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGameBubble } from "@/contexts/GameBubbleContext";

interface Song {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'local';
  category: string;
}

const getStoredCategory = () => typeof window !== 'undefined' ? (localStorage.getItem('forbiddens_music_category') || "Todos") : "Todos";
const getStoredIndex = () => typeof window !== 'undefined' ? parseInt(localStorage.getItem('forbiddens_music_index') || "0") : 0;
// 🔥 Volumen guardado en caché del dispositivo
const getStoredVolume = () => typeof window !== 'undefined' ? parseInt(localStorage.getItem('forbiddens_music_volume') || "80") : 80;
// 🔥 NUEVO: Estado de reproducción guardado (para reanudar tras re-parenting de portal)
const getStoredPlaying = () => typeof window !== 'undefined' ? localStorage.getItem('forbiddens_music_playing') === 'true' : false;

export default function ChillMusicPlayer() {
  const { onPauseMusic } = useAuth();
  const isMobile = useIsMobile();
  const { activeGames, minimized: gameMinimized } = useGameBubble();

  // 🎵 Slot activo donde renderizar el reproductor (vía portal).
  // Importante: el componente NUNCA se desmonta; solo cambia su contenedor DOM.
  // Esto evita que el <audio> o el <iframe> de YouTube se reinicien (sin doble audio).
  const inEmulator = activeGames.length > 0 && !gameMinimized;
  // En móvil, el slot depende de si el footer está colapsado o expandido:
  // - Colapsado → slot fijo arriba del footer (mini player visible).
  // - Expandido → slot dentro del scroll del footer (sube/baja con el contenido).
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
      // El slot puede tardar un tick en aparecer (p. ej. al abrir el emulador)
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
  // 🔥 Inicia con el volumen guardado en caché del dispositivo
  const [volume, setVolume] = useState(getStoredVolume);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false); 
  const [showAddSong, setShowAddSong] = useState(false);
  const [newSongUrl, setNewSongUrl] = useState("");
  const [newSongTitle, setNewSongTitle] = useState("");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const categories = ["Todos", "Metal", "Rap", "Lofi Hip-Hop"];
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const categoryBtnRef = useRef<HTMLButtonElement>(null);
  
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDisplayValue, setSeekDisplayValue] = useState(0);
  
  // CANDADO DE SEGURIDAD: Bloquea el guardado hasta aplicar el tiempo guardado
  const timeToRestoreRef = useRef<number | null>(null);
  const actualTimeRef = useRef<number>(0); // Referencia silenciosa del tiempo actual
  
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const current = playlist[currentIndex];
  const isMuted = volume === 0;

  // 🔔 Notificación efímera de "ahora suena" dentro del emulador (3s, sin interrumpir el juego)
  const [songToast, setSongToast] = useState<{ id: number; title: string } | null>(null);
  const lastNotifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!inEmulator) return;
    if (!current?.id) return;
    if (!isPlaying) return;
    if (lastNotifiedRef.current === current.id) return;
    lastNotifiedRef.current = current.id;
    const id = Date.now();
    setSongToast({ id, title: current.title });
    const t = setTimeout(() => {
      setSongToast(prev => (prev?.id === id ? null : prev));
    }, 3000);
    return () => clearTimeout(t);
  }, [inEmulator, current?.id, current?.title, isPlaying]);

  useEffect(() => {
    actualTimeRef.current = currentTime;
  }, [currentTime]);

  // 1. GUARDAR CANCIÓN Y PLAYLIST
  useEffect(() => {
    if (playlist.length > 0 && timeToRestoreRef.current === null) {
      localStorage.setItem('forbiddens_music_category', currentCategory);
      localStorage.setItem('forbiddens_music_index', currentIndex.toString());
    }
  }, [currentCategory, currentIndex, playlist.length]);

  // 2. GUARDAR EL MINUTO ACTUAL
  useEffect(() => {
    const timer = setInterval(() => {
      if (timeToRestoreRef.current === null && actualTimeRef.current > 0) {
        localStorage.setItem('forbiddens_music_time', actualTimeRef.current.toString());
      }
    }, 1000); 
    return () => clearInterval(timer);
  }, []);

  // 🔥 NUEVO: Persiste el estado de reproducción (play/pause) en caché del dispositivo
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('forbiddens_music_playing', isPlaying ? 'true' : 'false');
    }
  }, [isPlaying]);

  // 🔥 NUEVO: Cuando el reproductor cambia de slot DOM (PC → móvil → emulador, etc.)
  // el navegador puede pausar el <audio> al re-parentar. Aquí reanudamos exactamente
  // donde estaba (mismo tiempo, mismo volumen) sin que el usuario lo note.
  useEffect(() => {
    if (!portalTarget) return;
    if (!isPlaying) return;
    const t = setTimeout(() => {
      // Audio local: si quedó pausado tras el re-parent, reanudar
      if (current?.type === 'local' && audioRef.current) {
        audioRef.current.volume = volume / 100;
        if (audioRef.current.paused) {
          // Restaurar tiempo silenciosamente si se perdió
          if (actualTimeRef.current > 0 && Math.abs(audioRef.current.currentTime - actualTimeRef.current) > 1) {
            audioRef.current.currentTime = actualTimeRef.current;
          }
          audioRef.current.play().catch(() => { /* ignorar bloqueo de autoplay */ });
        }
      } else if (current?.type === 'youtube' && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'playVideo' }), '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }), '*'
        );
      }
    }, 150); // pequeño delay para que el DOM termine de re-parentar
    return () => clearTimeout(t);
  }, [portalTarget, current, isPlaying, volume]);

  useEffect(() => {
    setMinimized(isMobile);
  }, [isMobile]);

  useEffect(() => {
    const fetchMusic = async () => {
      const folders = [
        { path: 'Lofi Hip Hop zelda', name: 'Lofi Hip-Hop' },
        { path: 'metal', name: 'Metal' },
        { path: 'Rap', name: 'Rap' }
      ];
      
      let fetchedSongs: Song[] = [];
      const baseUrl = "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/musica";

      for (const folder of folders) {
        const { data, error } = await supabase.storage.from('musica').list(folder.path);
        if (!error && data) {
          data.forEach(file => {
            if (file.name !== '.emptyFolderPlaceholder') {
              fetchedSongs.push({
                id: file.id || file.name,
                title: file.name.replace(/\.[^/.]+$/, ""),
                url: `${baseUrl}/${folder.path}/${encodeURIComponent(file.name)}`,
                type: 'local',
                category: folder.name
              });
            }
          });
        }
      }
      setAllSongs(fetchedSongs);

      const savedCat = localStorage.getItem('forbiddens_music_category') || "Todos";
      const savedIndex = localStorage.getItem('forbiddens_music_index');
      const savedTime = localStorage.getItem('forbiddens_music_time');

      setCurrentCategory(savedCat);

      let initialPlaylist = fetchedSongs;
      if (savedCat !== "Todos") {
        initialPlaylist = fetchedSongs.filter(s => s.category === savedCat);
      }
      setPlaylist(initialPlaylist);

      if (savedIndex !== null && parseInt(savedIndex) < initialPlaylist.length) {
        setCurrentIndex(parseInt(savedIndex));
      } else {
        setCurrentIndex(0);
      }

      if (savedTime !== null) {
        const parsedTime = parseFloat(savedTime);
        setCurrentTime(parsedTime);
        setSeekDisplayValue(parsedTime);
        timeToRestoreRef.current = parsedTime; 
      }

      // 🔥 Eliminado el setIsPlaying(true) para que no haga autoplay
    };

    fetchMusic();
  }, []);

  const handleLocalLoadedMeta = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (timeToRestoreRef.current !== null) {
        audioRef.current.currentTime = timeToRestoreRef.current;
        timeToRestoreRef.current = null; 
      }
    }
  };

  const handleCategoryChange = (cat: string) => {
    setCurrentCategory(cat);
    if (cat === "Todos") {
      setPlaylist(allSongs);
    } else {
      setPlaylist(allSongs.filter(s => s.category === cat));
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
          audioRef.current.play().catch(e => {
            setIsPlaying(false);
          });
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
  }, [isPlaying, currentIndex, volume, current]);

  // 🔥 NUEVO: Aplica y guarda el volumen en caché en tiempo real 🔥
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
    if (typeof window !== 'undefined') {
      localStorage.setItem('forbiddens_music_volume', volume.toString());
    }
  }, [volume]);

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
    const canvas = minimized ? miniCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const bars = minimized ? 10 : 16;
    const barWidth = canvas.width / bars;
    let heights = new Array(bars).fill(0);
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < bars; i++) {
        if (isPlaying && volume > 0) {
          const target = Math.random() * canvas.height * 0.8 + canvas.height * 0.1;
          heights[i] += (target - heights[i]) * 0.15;
        } else { heights[i] *= 0.92; }
        const h = Math.max(2, heights[i]);
        const gradient = ctx.createLinearGradient(0, canvas.height - h, 0, canvas.height);
        gradient.addColorStop(0, "rgba(34, 211, 238, 0.9)");
        gradient.addColorStop(1, "rgba(34, 211, 238, 0.2)");
        ctx.fillStyle = gradient;
        ctx.fillRect(i * barWidth + 1, canvas.height - h, barWidth - 2, h);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, volume, minimized]);

  const next = useCallback(() => {
    if (playlist.length === 0) return;
    setCurrentIndex(i => (i + 1) % playlist.length);
    setCurrentTime(0); setSeekDisplayValue(0); setDuration(0);
    timeToRestoreRef.current = null; 
    setIsPlaying(true);
  }, [playlist.length]);

  const prev = () => {
    if (playlist.length === 0) return;
    setCurrentIndex(i => (i - 1 + playlist.length) % playlist.length);
    setCurrentTime(0); setSeekDisplayValue(0); setDuration(0);
    timeToRestoreRef.current = null; 
    setIsPlaying(true);
  };

  const removeSong = (idx: number) => {
    const newList = playlist.filter((_, i) => i !== idx);
    setPlaylist(newList);
    if (idx === currentIndex) setCurrentIndex(0);
    else if (idx < currentIndex) setCurrentIndex(p => p - 1);
  };

  const addSong = () => {
    if (!newSongUrl.trim()) return;
    const ytMatch = newSongUrl.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]+)/);
    if (!ytMatch) return;
    const newSong: Song = {
      id: ytMatch[1],
      title: newSongTitle.trim() || `YouTube Track`,
      url: newSongUrl,
      type: 'youtube',
      category: 'Custom'
    };
    setPlaylist(prev => [...prev, newSong]);
    setNewSongUrl(""); setNewSongTitle(""); setShowAddSong(false);
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

  const renderYT = current?.type === 'youtube' ? (
    <iframe
      ref={iframeRef}
      key={`yt-${current.id}`}
      src={`https://www.youtube.com/embed/${current.id}?enablejsapi=1&autoplay=${isPlaying ? 1 : 0}&origin=${encodeURIComponent(window.location.origin)}`}
      className="w-0 h-0 absolute pointer-events-none"
      allow="autoplay"
      title="Chill Music"
    />
  ) : null;

  const renderLocal = (
    <audio 
      ref={audioRef}
      src={current?.type === 'local' ? current.url : ""}
      onTimeUpdate={handleLocalTimeUpdate}
      onLoadedMetadata={handleLocalLoadedMeta}
      onEnded={handleLocalEnded}
      crossOrigin="anonymous"
    />
  );

  // 🎮 VISTA COMPACTA dentro del emulador (esquina inferior derecha de la barra en L)
  // Diseño ultra-compacto: avance/retroceso, play/pausa, +/- volumen con indicador,
  // selector de playlist y botón para abrir/cerrar la lista de canciones.
  const compactContent = (
    <div className="w-full">
      {renderYT} {renderLocal}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-md",
          "bg-gradient-to-b from-black/95 via-background/95 to-black/95",
          "border border-neon-cyan/50",
          "shadow-[0_0_12px_rgba(34,211,238,0.35),inset_0_0_8px_rgba(34,211,238,0.08)]",
          "backdrop-blur-sm"
        )}
      >
        {/* Header neón con scanline */}
        <div className="relative flex items-center gap-1 px-1.5 py-1 border-b border-neon-cyan/25 bg-neon-cyan/5">
          <Music className="w-2.5 h-2.5 text-neon-magenta shrink-0 drop-shadow-[0_0_4px_rgba(236,72,153,0.8)]" />
          <div className="relative flex-1 min-w-0 overflow-hidden">
            <p
              className="text-[8px] font-pixel text-neon-cyan whitespace-nowrap leading-tight drop-shadow-[0_0_3px_rgba(34,211,238,0.7)] truncate"
              title={current?.title}
            >
              {current?.title || "♪ NO SIGNAL ♫"}
            </p>
          </div>
          <span
            className={cn(
              "w-1 h-1 rounded-full shrink-0 transition-colors",
              isPlaying ? "bg-neon-green shadow-[0_0_4px_rgba(74,222,128,0.9)] animate-pulse" : "bg-muted-foreground/50"
            )}
          />
        </div>

        {/* Visualizador */}
        <div className="px-1.5 pt-1">
          <canvas
            ref={miniCanvasRef}
            width={120}
            height={16}
            className="w-full h-3.5 rounded-sm bg-black/60 border border-neon-cyan/20"
          />
        </div>

        {/* Transport apilado verticalmente para que TODO se vea aunque el slot sea muy angosto */}
        <div className="flex flex-col items-center gap-1 px-1.5 py-1.5">
          {/* Play / Pause central arriba */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              "relative p-2 rounded-full border transition-all active:scale-90",
              isPlaying
                ? "bg-neon-magenta/20 border-neon-magenta/60 text-neon-magenta shadow-[0_0_10px_rgba(236,72,153,0.6)]"
                : "bg-neon-green/20 border-neon-green/60 text-neon-green shadow-[0_0_10px_rgba(74,222,128,0.6)]"
            )}
            title={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-[1px]" />}
          </button>

          {/* Fila prev / next — justo debajo del play */}
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={prev}
              className="w-7 h-5 flex items-center justify-center rounded-sm bg-neon-cyan/20 border border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan/40 hover:shadow-[0_0_6px_rgba(34,211,238,0.7)] transition-all active:scale-90"
              title="Canción anterior"
              aria-label="Canción anterior"
            >
              <SkipBack className="w-2.5 h-2.5 fill-current" />
            </button>
            <button
              type="button"
              onClick={next}
              className="w-7 h-5 flex items-center justify-center rounded-sm bg-neon-cyan/20 border border-neon-cyan/60 text-neon-cyan hover:bg-neon-cyan/40 hover:shadow-[0_0_6px_rgba(34,211,238,0.7)] transition-all active:scale-90"
              title="Canción siguiente"
              aria-label="Canción siguiente"
            >
              <SkipForward className="w-2.5 h-2.5 fill-current" />
            </button>
          </div>

          {/* Fila volumen +/- — debajo de las canciones */}
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setVolume(v => Math.max(0, v - 10))}
              className="w-7 h-5 flex items-center justify-center rounded-sm bg-neon-magenta/25 border border-neon-magenta/60 text-neon-magenta hover:bg-neon-magenta/50 hover:shadow-[0_0_6px_rgba(236,72,153,0.7)] font-pixel text-[12px] leading-none transition-all active:scale-90"
              title="Bajar volumen"
              aria-label="Bajar volumen"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setVolume(v => Math.min(100, v + 10))}
              className="w-7 h-5 flex items-center justify-center rounded-sm bg-neon-green/25 border border-neon-green/60 text-neon-green hover:bg-neon-green/50 hover:shadow-[0_0_6px_rgba(74,222,128,0.7)] font-pixel text-[11px] leading-none transition-all active:scale-90"
              title="Subir volumen"
              aria-label="Subir volumen"
            >
              +
            </button>
          </div>

          {/* Indicador volumen (solo número) */}
          <div className="flex items-center justify-center gap-1">
            {isMuted || volume === 0 ? (
              <VolumeX className="w-2.5 h-2.5 text-muted-foreground" />
            ) : (
              <Volume2 className="w-2.5 h-2.5 text-neon-cyan" />
            )}
            <span className="text-[8px] font-pixel text-neon-cyan tabular-nums">{volume}%</span>
          </div>
        </div>

        {/* Selector de playlist (popover renderizado vía portal — ver abajo) */}
        <div className="px-1.5 pb-1.5">
          <button
            ref={categoryBtnRef}
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowCategoryMenu(v => !v); }}
            className="w-full flex items-center justify-between gap-1 bg-black/50 hover:bg-neon-cyan/10 border border-neon-cyan/30 hover:border-neon-cyan/60 rounded px-1.5 py-1 transition-all"
            title="Cambiar playlist"
          >
            <div className="flex items-center gap-1 min-w-0">
              <ListFilter className="w-2.5 h-2.5 text-neon-magenta shrink-0" />
              <span className="text-[8px] font-pixel text-neon-cyan truncate uppercase tracking-wider">
                {currentCategory}
              </span>
            </div>
            {showCategoryMenu
              ? <ChevronUp className="w-2.5 h-2.5 text-neon-cyan shrink-0" />
              : <ChevronDown className="w-2.5 h-2.5 text-neon-cyan shrink-0" />}
          </button>
        </div>
      </div>

      {/* Popover de playlist — Portal al body, encima de todo, bloquea clicks detrás */}
      {showCategoryMenu && categoryBtnRef.current && createPortal(
        <div
          className="fixed inset-0 z-[9999] animate-fade-in"
          onClick={() => setShowCategoryMenu(false)}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {(() => {
            const rect = categoryBtnRef.current!.getBoundingClientRect();
            // Burbuja apuntando hacia adentro: aparece arriba del botón, alineada a su derecha,
            // desplazada hacia el centro de la pantalla (izquierda en este caso, ya que el slot está en la esquina inferior derecha).
            const right = Math.max(8, window.innerWidth - rect.right);
            const bottom = Math.max(8, window.innerHeight - rect.top + 8);
            return (
              <div
                style={{ right, bottom }}
                className="absolute min-w-[140px] max-w-[200px] bg-black/95 border-2 border-neon-cyan/60 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.5),inset_0_0_10px_rgba(34,211,238,0.1)] overflow-hidden backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Cola de la burbuja apuntando al botón */}
                <div className="absolute -bottom-[7px] right-3 w-3 h-3 bg-black/95 border-r-2 border-b-2 border-neon-cyan/60 rotate-45" />
                <div className="relative">
                  <div className="px-2 py-1 border-b border-neon-cyan/30 bg-neon-cyan/10">
                    <p className="text-[8px] font-pixel text-neon-cyan uppercase tracking-widest text-center">
                      ♪ Playlist ♪
                    </p>
                  </div>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryChange(cat);
                        setShowCategoryMenu(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-[9px] font-pixel uppercase tracking-wider transition-all border-b border-neon-cyan/15 last:border-0",
                        currentCategory === cat
                          ? "bg-neon-cyan/25 text-neon-cyan shadow-[inset_0_0_8px_rgba(34,211,238,0.3)]"
                          : "text-muted-foreground hover:bg-neon-cyan/10 hover:text-neon-cyan"
                      )}
                    >
                      {cat === "Todos" ? "★ Todos" : cat}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>,
        document.body
      )}

      {/* 🔔 Notificación "ahora suena" — anclada al viewport del emulador, no interactiva, 3s */}
      {songToast && inEmulator && typeof document !== 'undefined' && (() => {
        const viewport = document.getElementById('game-bubble-viewport');
        if (!viewport) return null;
        return createPortal(
          <div
            key={songToast.id}
            className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-[80] animate-fade-in"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/85 border border-neon-cyan/60 shadow-[0_0_14px_rgba(34,211,238,0.45),inset_0_0_8px_rgba(34,211,238,0.15)] backdrop-blur-md max-w-[80vw]">
              <Music className="w-3 h-3 text-neon-magenta shrink-0 drop-shadow-[0_0_4px_rgba(236,72,153,0.8)]" />
              <span className="font-pixel text-[8px] text-neon-cyan uppercase tracking-wider drop-shadow-[0_0_3px_rgba(34,211,238,0.7)] truncate">
                ♪ {songToast.title}
              </span>
            </div>
          </div>,
          viewport
        );
      })()}
    </div>
  );

  // 🔻 VISTA MINIMIZADA (solo móvil/tablet en footer cerrado, mantiene comportamiento original)
  const minimizedContent = (
    <div className="w-full relative shadow-lg">
      {renderYT} {renderLocal}
      <div className="bg-card border border-neon-cyan/30 rounded p-2">
        <div className="flex items-center gap-1.5">
          <button onClick={prev} className="p-1 text-muted-foreground hover:text-foreground shrink-0 transition-colors">
            <SkipBack className="w-3 h-3" />
          </button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-1 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors shrink-0">
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>
          <button onClick={next} className="p-1 text-muted-foreground hover:text-foreground shrink-0 transition-colors">
            <SkipForward className="w-3 h-3" />
          </button>

          <canvas ref={miniCanvasRef} width={60} height={16} className="h-4 flex-1 rounded bg-muted/30 ml-1" />
          <span className="text-[9px] font-body text-neon-cyan truncate max-w-[60px] ml-1">{current?.title || "Cargando..."}</span>
          <button
            onClick={() => {
              setMinimized(false);
              window.dispatchEvent(new Event("openMobilePanel"));
            }}
            className="p-0.5 text-muted-foreground hover:text-foreground shrink-0 ml-1"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  // 🖥️ VISTA COMPLETA (desktop o móvil con footer abierto)
  const fullContent = (
    <div className="w-full relative shadow-lg">
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
              </div>
            )}
          </div>
        </div>

        <div className="px-2.5 pt-2">
          <canvas ref={canvasRef} width={200} height={32} className="w-full h-8 rounded bg-muted/30" />
        </div>

        <div className="px-2.5 py-1.5 text-center">
          <p className="text-[10px] font-body text-foreground truncate">{current?.title || (playlist.length === 0 ? "Sin canciones..." : "Cargando música...")}</p>
        </div>

        <div className="flex items-center justify-center gap-3 px-2.5 pb-1">
          <button onClick={prev} className="p-1 text-muted-foreground hover:text-foreground"><SkipBack className="w-3.5 h-3.5" /></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors">{isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
          <button onClick={next} className="p-1 text-muted-foreground hover:text-foreground"><SkipForward className="w-3.5 h-3.5" /></button>
        </div>

        {current?.type !== 'youtube' && (
          <div className="px-3 pb-1">
            <Slider value={[displayTime]} onValueChange={handleSeekChange} onValueCommit={handleSeekCommit} max={sliderMax} step={1} className="w-full" />
            <div className="flex justify-between text-[8px] text-muted-foreground font-body mt-0.5">
              <span>{formatTime(displayTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

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
              <div key={`${song.id}-${i}`} className={cn("flex items-center gap-1 px-2 py-1.5 text-[10px] font-body hover:bg-muted/30 transition-colors group", i === currentIndex && "bg-neon-cyan/10 text-neon-cyan")}>
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
              <Input placeholder="URL de YouTube" value={newSongUrl} onChange={e => setNewSongUrl(e.target.value)} className="h-6 bg-muted text-[10px] font-body" />
              <Input placeholder="Título (opcional)" value={newSongTitle} onChange={e => setNewSongTitle(e.target.value)} className="h-6 bg-muted text-[10px] font-body" />
              <button onClick={addSong} className="w-full py-1 rounded bg-neon-cyan/20 text-neon-cyan text-[9px] font-body">Agregar al final</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 🎯 Selección de qué vista mostrar según el slot
  // - emulator → vista compacta (siempre)
  // - mobile (sin emulador) → respeta el flag `minimized` (footer cerrado)
  // - desktop → vista completa
  const content = inEmulator ? compactContent : minimized ? minimizedContent : fullContent;

  // Si todavía no encontramos el slot DOM, no renderizamos nada (el audio sigue intacto
  // dentro del propio JSX porque está dentro de `content`, así que se montará en cuanto exista).
  if (!portalTarget) return null;
  return createPortal(content, portalTarget);
}
