import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, ChevronDown, ChevronUp, Trash2, Plus, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

interface Song {
  id: string;
  title: string;
  url: string;
  type: 'youtube' | 'local';
  category: string;
}

export default function ChillMusicPlayer() {
  const { onPauseMusic } = useAuth();
  const isMobile = useIsMobile();
  
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentCategory, setCurrentCategory] = useState("Todos");
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [expanded, setExpanded] = useState(false);
  
  // 🔥 Por defecto: Mini si es celular, Grande si es PC
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
  
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDisplayValue, setSeekDisplayValue] = useState(0);
  
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = playlist[currentIndex];
  const isMuted = volume === 0;

  // Actualiza el estado cuando detecta la pantalla
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
        
        if (error) {
          console.error(`Error cargando la carpeta ${folder.path}:`, error);
        } else if (data) {
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
      setPlaylist(fetchedSongs);
      
      if (fetchedSongs.length > 0) {
        setIsPlaying(true);
      }
    };

    fetchMusic();
  }, []);

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
    setShowCategoryMenu(false); 
  };

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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentIndex, volume, current]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
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
  const handleLocalLoadedMeta = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
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
    setIsPlaying(true);
  }, [playlist.length]);

  const prev = () => {
    if (playlist.length === 0) return;
    setCurrentIndex(i => (i - 1 + playlist.length) % playlist.length);
    setCurrentTime(0); setSeekDisplayValue(0); setDuration(0);
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

  // VERSIÓN MINI (La que aparece en celular y se puede expandir)
  if (minimized) {
    return (
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
            
            {/* 🔥 Botón para Expandir el reproductor completo si el usuario quiere buscar su canción */}
            <button 
              onClick={() => { 
                setMinimized(false); 
                window.dispatchEvent(new Event("openMobilePanel")); 
              }} 
              className="p-0.5 text-muted-foreground hover:text-foreground shrink-0 ml-1"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VERSIÓN EXTENDIDA (Por defecto en PC, pero accesible en móvil si la abren)
  return (
    <div className="w-full relative shadow-lg">
      {renderYT} {renderLocal}
      <div className="bg-card border border-neon-cyan/30 rounded overflow-visible relative">
        
        {/* HEADER */}
        <div className="flex flex-col border-b border-border/50">
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <div className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-neon-cyan" />
              <span className="font-pixel text-[8px] text-neon-cyan">FORBIDDENS PLAYER</span>
            </div>
            {/* 🔥 Botón para Minimizar el reproductor */}
            <button onClick={() => setMinimized(true)} className="p-0.5 text-muted-foreground hover:text-foreground">
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>

          {/* DROPDOWN */}
          <div className="px-2.5 pb-2 relative z-50">
            <button 
              onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              className="w-full flex items-center justify-between bg-muted/30 hover:bg-muted/50 border border-border/50 rounded px-2 py-1.5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ListFilter className="w-3 h-3 text-muted-foreground" />
                <span className="text-[9px] font-body text-foreground">
                  {currentCategory === "Todos" ? "Todos los géneros" : currentCategory}
                </span>
              </div>
              {showCategoryMenu ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
            </button>

            {showCategoryMenu && (
              <div className="absolute top-full left-2.5 right-2.5 mt-1 bg-background border border-neon-cyan/30 rounded shadow-2xl overflow-hidden z-50 animate-fade-in">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryChange(cat)}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[9px] font-body transition-colors border-b border-border/30 last:border-0",
                      currentCategory === cat 
                        ? "bg-neon-cyan/10 text-neon-cyan border-l-2 border-l-neon-cyan" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-l-transparent"
                    )}
                  >
                    {cat === "Todos" ? "Todos los géneros" : cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* VISUALIZADOR */}
        <div className="px-2.5 pt-2">
          <canvas ref={canvasRef} width={200} height={32} className="w-full h-8 rounded bg-muted/30" />
        </div>

        {/* TÍTULO CANCIÓN */}
        <div className="px-2.5 py-1.5 text-center">
          <p className="text-[10px] font-body text-foreground truncate">{current?.title || (playlist.length === 0 ? "Sin canciones..." : "Cargando música...")}</p>
        </div>

        {/* CONTROLES */}
        <div className="flex items-center justify-center gap-3 px-2.5 pb-1">
          <button onClick={prev} className="p-1 text-muted-foreground hover:text-foreground"><SkipBack className="w-3.5 h-3.5" /></button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={next} className="p-1 text-muted-foreground hover:text-foreground"><SkipForward className="w-3.5 h-3.5" /></button>
        </div>

        {/* BARRA DE PROGRESO */}
        <div className="px-3 pb-1">
          <Slider value={[displayTime]} onValueChange={handleSeekChange} onValueCommit={handleSeekCommit} max={sliderMax} step={1} className="w-full" />
          <div className="flex justify-between text-[8px] text-muted-foreground font-body mt-0.5">
            <span>{formatTime(displayTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* VOLUMEN */}
        <div className="px-3 pb-2 flex items-center gap-2">
          <button onClick={() => setVolume(v => v === 0 ? 80 : 0)} className="text-muted-foreground shrink-0">
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
          <Slider value={[volume]} onValueChange={v => setVolume(v[0])} max={100} step={5} className="flex-1" />
        </div>

        {/* LISTA DE REPRODUCCIÓN */}
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

        {/* AGREGAR YOUTUBE */}
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
}