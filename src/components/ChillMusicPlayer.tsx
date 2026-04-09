import { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, ChevronDown, ChevronUp, Trash2, Plus, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

const defaultPlaylist = [
  { id: "jfKfPfyJRdk", title: "Lofi Hip Hop Radio" },
  { id: "5qap5aO4i9A", title: "Lofi Chill Beats" },
  { id: "DWcJFNfaw9c", title: "Chill Study Music" },
  { id: "rPjez8z61rI", title: "Ambient Chill" },
  { id: "kgx4WGK0oNU", title: "Chill Vibes" },
];

export default function ChillMusicPlayer() {
  const [playlist, setPlaylist] = useState(defaultPlaylist);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [showAddSong, setShowAddSong] = useState(false);
  const [newSongUrl, setNewSongUrl] = useState("");
  const [newSongTitle, setNewSongTitle] = useState("");
  const [showVolume, setShowVolume] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const current = playlist[currentIndex];
  const isMuted = volume === 0;

  useEffect(() => {
    if (autoStarted) return;
    const timer = setTimeout(() => {
      setIsPlaying(true);
      setAutoStarted(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [autoStarted]);

  // Visualizer - works on both canvases
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
        } else {
          heights[i] *= 0.92;
        }
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

  const next = () => setCurrentIndex(i => (i + 1) % playlist.length);
  const prev = () => setCurrentIndex(i => (i - 1 + playlist.length) % playlist.length);
  
  const removeSong = (idx: number) => {
    if (playlist.length <= 1) return;
    const newList = playlist.filter((_, i) => i !== idx);
    setPlaylist(newList);
    if (idx === currentIndex) setCurrentIndex(0);
    else if (idx < currentIndex) setCurrentIndex(p => p - 1);
  };

  const moveSong = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= playlist.length) return;
    const newList = [...playlist];
    [newList[idx], newList[newIdx]] = [newList[newIdx], newList[idx]];
    setPlaylist(newList);
    if (currentIndex === idx) setCurrentIndex(newIdx);
    else if (currentIndex === newIdx) setCurrentIndex(idx);
  };

  const addSong = () => {
    if (!newSongUrl.trim()) return;
    const ytMatch = newSongUrl.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]+)/);
    if (!ytMatch) return;
    const id = ytMatch[1];
    const title = newSongTitle.trim() || `Canción ${playlist.length + 1}`;
    setPlaylist(prev => [...prev, { id, title }]);
    setNewSongUrl("");
    setNewSongTitle("");
    setShowAddSong(false);
  };

  // The iframe is ALWAYS rendered when playing, even when minimized
  const renderIframe = isPlaying && current && (
    <iframe
      ref={iframeRef}
      key={`${current.id}-${volume === 0 ? 'muted' : 'unmuted'}`}
      src={`https://www.youtube.com/embed/${current.id}?autoplay=1&loop=0&controls=0&rel=0${volume === 0 ? "&mute=1" : ""}`}
      className="w-0 h-0 absolute pointer-events-none"
      style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}
      allow="autoplay"
      title="Chill Music"
    />
  );

  if (minimized) {
    return (
      <>
        {renderIframe}
        <div className="bg-card border border-neon-cyan/30 rounded p-2 space-y-1">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsPlaying(!isPlaying)} className="p-1 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors shrink-0">
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <canvas ref={miniCanvasRef} width={80} height={16} className="h-4 flex-1 rounded bg-muted/30" />
            <span className="text-[9px] font-body text-neon-cyan truncate max-w-[60px]">
              {current?.title}
            </span>
            <button onClick={() => setMinimized(false)} className="p-0.5 text-muted-foreground hover:text-foreground">
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
          <div className="flex items-center gap-1 justify-center">
            <button onClick={prev} className="p-0.5 text-muted-foreground hover:text-foreground"><SkipBack className="w-3 h-3" /></button>
            <button onClick={next} className="p-0.5 text-muted-foreground hover:text-foreground"><SkipForward className="w-3 h-3" /></button>
            <div className="relative ml-1">
              <button onClick={() => setShowVolume(!showVolume)} className="p-0.5 text-muted-foreground hover:text-foreground">
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
              {showVolume && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-card border border-border rounded p-2 w-28 shadow-lg z-10">
                  <Slider value={[volume]} onValueChange={v => setVolume(v[0])} max={100} step={5} className="w-full" />
                  <p className="text-[8px] text-muted-foreground text-center mt-1">{volume}%</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {renderIframe}
      <div className="bg-card border border-neon-cyan/30 rounded overflow-hidden">
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <Music className="w-3.5 h-3.5 text-neon-cyan" />
            <span className="font-pixel text-[8px] text-neon-cyan">CHILL PLAYER</span>
          </div>
          <button onClick={() => setMinimized(true)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="px-2.5 pt-2">
          <canvas ref={canvasRef} width={200} height={32} className="w-full h-8 rounded bg-muted/30" />
        </div>

        <div className="px-2.5 py-1.5">
          <p className="text-[10px] font-body text-foreground truncate">{current?.title || "—"}</p>
        </div>

        <div className="flex items-center justify-center gap-3 px-2.5 pb-1">
          <button onClick={prev} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsPlaying(!isPlaying)} className="p-1.5 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={next} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Volume slider */}
        <div className="px-3 pb-2 flex items-center gap-2">
          <button onClick={() => setVolume(v => v === 0 ? 80 : 0)} className="text-muted-foreground hover:text-foreground shrink-0">
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
          <Slider value={[volume]} onValueChange={v => setVolume(v[0])} max={100} step={5} className="flex-1" />
          <span className="text-[8px] text-muted-foreground font-body w-6 text-right">{volume}%</span>
        </div>

        {/* Playlist toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center py-1 text-[9px] font-body text-muted-foreground hover:text-foreground transition-colors border-t border-border/50"
        >
          {expanded ? "Ocultar lista" : `Lista (${playlist.length} canciones)`}
        </button>

        {expanded && (
          <div className="max-h-40 overflow-y-auto retro-scrollbar border-t border-border/30">
            {playlist.map((song, i) => (
              <div
                key={`${song.id}-${i}`}
                className={cn(
                  "flex items-center gap-1 px-2 py-1.5 text-[10px] font-body hover:bg-muted/30 transition-colors group",
                  i === currentIndex && "bg-neon-cyan/10 text-neon-cyan"
                )}
              >
                <button onClick={() => moveSong(i, -1)} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" title="Subir">
                  <ArrowUp className="w-2.5 h-2.5" />
                </button>
                <button onClick={() => moveSong(i, 1)} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" title="Bajar">
                  <ArrowDown className="w-2.5 h-2.5" />
                </button>
                <button onClick={() => { setCurrentIndex(i); setIsPlaying(true); }} className="flex-1 text-left truncate cursor-pointer">
                  <span className={i === currentIndex ? "text-neon-cyan" : "text-foreground"}>{song.title}</span>
                </button>
                {playlist.length > 1 && (
                  <button onClick={() => removeSong(i)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add song bar */}
        <div className="border-t border-border/50">
          <button onClick={() => setShowAddSong(!showAddSong)} className="w-full flex items-center justify-center gap-1 py-1 text-[9px] font-body text-neon-cyan hover:bg-neon-cyan/10 transition-colors">
            <Plus className="w-3 h-3" /> Agregar canción
          </button>
          {showAddSong && (
            <div className="px-2.5 pb-2 space-y-1.5 animate-fade-in">
              <Input
                placeholder="URL de YouTube"
                value={newSongUrl}
                onChange={e => setNewSongUrl(e.target.value)}
                className="h-6 bg-muted text-[10px] font-body"
              />
              <Input
                placeholder="Título (opcional)"
                value={newSongTitle}
                onChange={e => setNewSongTitle(e.target.value)}
                className="h-6 bg-muted text-[10px] font-body"
              />
              <button
                onClick={addSong}
                disabled={!newSongUrl.trim()}
                className="w-full py-1 rounded bg-neon-cyan/20 text-neon-cyan text-[9px] font-body hover:bg-neon-cyan/30 disabled:opacity-50 transition-colors"
              >
                Agregar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
