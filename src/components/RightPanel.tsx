import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, ChevronDown, ChevronUp, Trash2, Plus, ArrowUp, ArrowDown, ListFilter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";

// 🔥 LIBRERÍA DE CANCIONES (Motor Dual)
// Debes subir tus archivos .mp3 a la carpeta "public/music/..." de tu proyecto
const library = [
  // --- ROCK ---
  { id: "/music/rock/cancion1.mp3", title: "Rock Local 1", type: "local", genre: "rock" },
  { id: "/music/rock/cancion2.mp3", title: "Rock Local 2", type: "local", genre: "rock" },
  
  // --- LOFI ---
  { id: "/music/lofi/cancion1.mp3", title: "Lofi Beats Local 1", type: "local", genre: "lofi" },
  { id: "/music/lofi/cancion2.mp3", title: "Lofi Chill Local 2", type: "local", genre: "lofi" },
  
  // --- RAP ---
  { id: "/music/rap/cancion1.mp3", title: "Rap Old School 1", type: "local", genre: "rap" },
  { id: "/music/rap/cancion2.mp3", title: "Rap Urban 2", type: "local", genre: "rap" },

  // --- YOUTUBE MUESTRA (Para que tengas algo sonando mientras subes tus MP3) ---
  { id: "jfKfPfyJRdk", title: "YT: Lofi Hip Hop Radio", type: "youtube", genre: "lofi" },
];

export default function ChillMusicPlayer() {
  const { onPauseMusic } = useAuth();
  
  // Estados de Listas
  const [selectedGenre, setSelectedGenre] = useState<"todos" | "rock" | "lofi" | "rap">("todos");
  const [playlist, setPlaylist] = useState(library);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showGenreMenu, setShowGenreMenu] = useState(false);
  
  // Estados de Reproducción
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showAddSong, setShowAddSong] = useState(false);
  const [newSongUrl, setNewSongUrl] = useState("");
  const [newSongTitle, setNewSongTitle] = useState("");
  
  // Referencias Motores
  const audioRef = useRef<HTMLAudioElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDisplayValue, setSeekDisplayValue] = useState(0);
  
  const current = playlist[currentIndex];
  const isMuted = volume === 0;
  const isYouTube = current?.type === "youtube"; // 🔥 CLAVE

  useEffect(() => { onPauseMusic(() => setIsPlaying(false)); }, [onPauseMusic]);

  // Cambiar de Género
  useEffect(() => {
    const newList = selectedGenre === "todos" ? library : library.filter(s => s.genre === selectedGenre);
    setPlaylist(newList.length > 0 ? newList : library); // Si está vacío, pone todos
    setCurrentIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [selectedGenre]);

  // Motor Local (HTML5)
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume / 100;
    
    if (!isYouTube) {
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        audioRef.current.pause();
      }
    } else {
      audioRef.current.pause(); // Callamos el local si es YT
    }
  }, [isPlaying, isYouTube, volume, currentIndex]);

  // Motor YouTube (Iframe)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!iframeRef.current?.contentWindow) return;
      if (isYouTube) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: isPlaying ? 'playVideo' : 'pauseVideo' }), '*'
        );
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'command', func: 'setVolume', args: [volume] }), '*'
        );
      } else {
        iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'pauseVideo' }), '*');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [isPlaying, isYouTube, volume, currentIndex]);

  // Listener de Tiempo YouTube
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || !isYouTube) return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.event === 'infoDelivery' && data.info) {
          if (typeof data.info.currentTime === 'number' && !isSeeking) setCurrentTime(data.info.currentTime);
          if (typeof data.info.duration === 'number' && data.info.duration > 0) setDuration(data.info.duration);
          if (data.info.playerState === 0) next();
        }
      } catch {}
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isSeeking, isYouTube, currentIndex]);

  // Polling YouTube
  useEffect(() => {
    let poll: ReturnType<typeof setInterval>;
    if (isPlaying && isYouTube && iframeRef.current?.contentWindow) {
      const sendListening = () => {
        try { iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1 }), '*'); } catch {}
      };
      sendListening();
      poll = setInterval(sendListening, 1000);
    }
    return () => clearInterval(poll);
  }, [isPlaying, isYouTube, currentIndex]);

  // Visualizador Falso de Ondas
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
    setCurrentIndex(i => (i + 1) % playlist.length);
    setCurrentTime(0); setSeekDisplayValue(0); setDuration(0);
  }, [playlist.length]);

  const prev = () => {
    setCurrentIndex(i => (i - 1 + playlist.length) % playlist.length);
    setCurrentTime(0); setSeekDisplayValue(0); setDuration(0);
  };

  const addSong = () => {
    if (!newSongUrl.trim()) return;
    const ytMatch = newSongUrl.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]+)/);
    if (!ytMatch) return;
    
    setPlaylist(prev => [...prev, { id: ytMatch[1], title: newSongTitle.trim() || `YouTube Track`, type: "youtube", genre: "todos" }]);
    setNewSongUrl(""); setNewSongTitle(""); setShowAddSong(false);
  };

  const removeSong = (idx: number) => {
    if (playlist.length <= 1) return;
    const newList = playlist.filter((_, i) => i !== idx);
    setPlaylist(newList);
    if (idx === currentIndex) setCurrentIndex(0);
    else if (idx < currentIndex) setCurrentIndex(p => p - 1);
  };

  // 🔥 SEEK LOGIC (Bloqueado para YT)
  const handleSeekChange = (v: number[]) => {
    if (isYouTube) return; 
    setIsSeeking(true);
    setSeekDisplayValue(v[0]);
  };

  const handleSeekCommit = (v: number[]) => {
    if (isYouTube) return; 
    const t = v[0];
    setIsSeeking(false);
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s) || s < 0) return "0:00";
    const total = Math.min(Math.floor(s), 359999);
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const displayTime = isSeeking ? seekDisplayValue : currentTime;
  const sliderMax = duration > 0 && isFinite(duration) ? duration : 1;

  return (
    <>
      {/* MOTORES INVISIBLES */}
      <audio 
        ref={audioRef} 
        src={!isYouTube ? current?.id : undefined} 
        onTimeUpdate={() => { if (!isYouTube && !isSeeking && audioRef.current) setCurrentTime(audioRef.current.currentTime); }}
        onLoadedMetadata={() => { if (!isYouTube && audioRef.current) setDuration(audioRef.current.duration); }}
        onEnded={next}
      />
      {isYouTube && current && (
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${current.id}?enablejsapi=1&autoplay=${isPlaying ? 1 : 0}&origin=${encodeURIComponent(window.location.origin)}`}
          className="w-0 h-0 absolute pointer-events-none"
          allow="autoplay"
        />
      )}

      {minimized ? (
        <div className="bg-card border border-neon-cyan/30 rounded p-2 space-y-1 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsPlaying(!isPlaying)} className="p-1 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all shrink-0">
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <canvas ref={miniCanvasRef} width={80} height={16} className="h-4 flex-1 rounded bg-muted/30" />
            <span className="text-[9px] font-body text-neon-cyan truncate max-w-[60px]">{current?.title || "..."}</span>
            <button onClick={() => setMinimized(false)} className="p-0.5 text-muted-foreground hover:text-foreground">
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-neon-cyan/30 rounded overflow-hidden shadow-[0_0_15px_rgba(34,211,238,0.1)]">
          
          {/* HEADER Y SELECTOR DE GÉNERO */}
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-neon-cyan/20 bg-muted/20 relative">
            <div className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-neon-cyan animate-pulse" />
              <button onClick={() => setShowGenreMenu(!showGenreMenu)} className="font-pixel text-[8px] text-neon-cyan flex items-center gap-1 hover:text-white transition-colors tracking-widest">
                {selectedGenre.toUpperCase()} <ListFilter className="w-2.5 h-2.5" />
              </button>
            </div>
            <button onClick={() => setMinimized(true)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Menú Flotante de Playlists */}
            {showGenreMenu && (
              <div className="absolute top-full left-0 mt-1 w-28 bg-card border border-neon-cyan/30 rounded shadow-xl z-50 overflow-hidden">
                {(["todos", "rock", "lofi", "rap"] as const).map(g => (
                  <button key={g} onClick={() => { setSelectedGenre(g); setShowGenreMenu(false); }} className="w-full text-left px-3 py-1.5 text-[9px] font-pixel text-muted-foreground hover:bg-neon-cyan/10 hover:text-neon-cyan transition-colors">
                    {g.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-2.5 pt-2">
            <canvas ref={canvasRef} width={200} height={32} className="w-full h-8 rounded bg-muted/20 border border-border/30" />
          </div>

          <div className="px-2.5 py-1.5 flex items-center justify-between mt-1">
            <p className="text-[10px] font-body text-foreground truncate font-bold drop-shadow-md">{current?.title || "Sin pistas"}</p>
            {isYouTube && <span className="text-[8px] font-pixel bg-destructive/80 text-white px-1.5 py-0.5 rounded ml-2 shrink-0">YT</span>}
          </div>

          <div className="flex items-center justify-center gap-4 px-2.5 pb-2">
            <button onClick={prev} className="p-1 text-muted-foreground hover:text-neon-cyan transition-colors hover:scale-110"><SkipBack className="w-4 h-4" /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="p-2.5 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan border border-neon-cyan/50 hover:text-black transition-all shadow-[0_0_10px_rgba(34,211,238,0.3)]">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-[1px]" />}
            </button>
            <button onClick={next} className="p-1 text-muted-foreground hover:text-neon-cyan transition-colors hover:scale-110"><SkipForward className="w-4 h-4" /></button>
          </div>

          {/* BARRA DE PROGRESO (Gris y bloqueada si es YT) */}
          <div className={cn("px-3 pb-1", isYouTube && "opacity-40 pointer-events-none grayscale")}>
            <Slider
              value={[displayTime]}
              onValueChange={handleSeekChange}
              onValueCommit={handleSeekCommit}
              max={sliderMax}
              step={1}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-[8px] text-muted-foreground font-body mt-0.5">
              <span>{formatTime(displayTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            {isYouTube && <p className="text-[7px] text-center text-muted-foreground -mt-1 font-pixel">NO DISPONIBLE EN YT</p>}
          </div>

          {/* Volumen */}
          <div className="px-3 pb-3 flex items-center gap-2 pt-1 border-b border-border/30">
            <button onClick={() => setVolume(v => v === 0 ? 80 : 0)} className="text-muted-foreground hover:text-neon-cyan shrink-0 transition-colors">
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
            <Slider value={[volume]} onValueChange={v => setVolume(v[0])} max={100} step={5} className="flex-1 cursor-pointer" />
          </div>

          {/* Playlist Expandible */}
          <button onClick={() => setExpanded(!expanded)} className="w-full text-center py-1.5 text-[9px] font-body text-muted-foreground hover:text-neon-cyan transition-colors bg-muted/5">
            {expanded ? "▲ Ocultar Lista" : `▼ Ver Lista (${playlist.length})`}
          </button>

          {expanded && (
            <div className="max-h-32 overflow-y-auto retro-scrollbar bg-black/20">
              {playlist.map((song, i) => (
                <div key={`${song.id}-${i}`} className={cn("flex items-center gap-2 px-2 py-1.5 text-[10px] font-body hover:bg-neon-cyan/10 transition-colors group border-b border-border/10 last:border-0", i === currentIndex && "bg-neon-cyan/10 text-neon-cyan font-bold border-l-2 border-l-neon-cyan")}>
                  <button onClick={() => { setCurrentIndex(i); setIsPlaying(true); }} className="flex-1 text-left truncate cursor-pointer pl-1">
                    {song.title}
                  </button>
                  {playlist.length > 1 && (
                    <button onClick={() => removeSong(i)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Agregar Canción YouTube */}
          <div>
            <button onClick={() => setShowAddSong(!showAddSong)} className="w-full flex items-center justify-center gap-1 py-2 text-[9px] font-body text-neon-cyan hover:bg-neon-cyan/10 transition-colors border-t border-border/30">
              <Plus className="w-3 h-3" /> Añadir de YouTube
            </button>
            {showAddSong && (
              <div className="px-2.5 pb-2 pt-1 space-y-1.5 animate-fade-in bg-muted/10">
                <Input placeholder="URL de YouTube" value={newSongUrl} onChange={e => setNewSongUrl(e.target.value)} className="h-7 bg-card border-border text-[10px] font-body" />
                <Input placeholder="Título (opcional)" value={newSongTitle} onChange={e => setNewSongTitle(e.target.value)} className="h-7 bg-card border-border text-[10px] font-body" />
                <button onClick={addSong} className="w-full py-1.5 rounded bg-neon-cyan/20 text-neon-cyan text-[9px] font-body hover:bg-neon-cyan hover:text-black transition-all shadow-[0_0_8px_rgba(34,211,238,0.2)]">Agregar Pista</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}