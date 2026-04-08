import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Music, ChevronDown, ChevronUp, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Playlist from the YouTube playlist - audio-only via iframe embed
const defaultPlaylist = [
  { id: "jfKfPfyJRdk", title: "Lofi Hip Hop Radio" },
  { id: "5qap5aO4i9A", title: "Lofi Chill Beats" },
  { id: "DWcJFNfaw9c", title: "Chill Study Music" },
  { id: "lTRiuFIWV54", title: "Lofi Cafe" },
  { id: "rPjez8z61rI", title: "Ambient Chill" },
  { id: "kgx4WGK0oNU", title: "Chill Vibes" },
];

export default function ChillMusicPlayer() {
  const [playlist, setPlaylist] = useState(defaultPlaylist);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const current = playlist[currentIndex];

  // Auto-start after 5 seconds
  useEffect(() => {
    if (autoStarted) return;
    const timer = setTimeout(() => {
      setIsPlaying(true);
      setAutoStarted(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [autoStarted]);

  // Simple equalizer visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bars = 16;
    const barWidth = canvas.width / bars;
    let heights = new Array(bars).fill(0);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        if (isPlaying && !muted) {
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
  }, [isPlaying, muted]);

  const next = () => setCurrentIndex(i => (i + 1) % playlist.length);
  const prev = () => setCurrentIndex(i => (i - 1 + playlist.length) % playlist.length);
  const removeSong = (idx: number) => {
    if (playlist.length <= 1) return;
    const newList = playlist.filter((_, i) => i !== idx);
    setPlaylist(newList);
    if (idx <= currentIndex && currentIndex > 0) setCurrentIndex(p => p - 1);
  };

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="bg-card border border-neon-cyan/30 rounded p-2 flex items-center gap-2 hover:bg-muted/50 transition-colors w-full"
      >
        <Music className="w-3.5 h-3.5 text-neon-cyan" />
        <span className="text-[10px] font-body text-neon-cyan truncate flex-1 text-left">
          {isPlaying ? `♫ ${current?.title}` : "Chill Player"}
        </span>
        <ChevronUp className="w-3 h-3 text-muted-foreground" />
      </button>
    );
  }

  return (
    <div className="bg-card border border-neon-cyan/30 rounded overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="font-pixel text-[8px] text-neon-cyan">CHILL PLAYER</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMinimized(true)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Equalizer */}
      <div className="px-2.5 pt-2">
        <canvas
          ref={canvasRef}
          width={200}
          height={32}
          className="w-full h-8 rounded bg-muted/30"
        />
      </div>

      {/* Current track */}
      <div className="px-2.5 py-1.5">
        <p className="text-[10px] font-body text-foreground truncate">{current?.title || "—"}</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-2.5 pb-2">
        <button onClick={prev} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <SkipBack className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-1.5 rounded-full bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button onClick={next} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <SkipForward className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setMuted(!muted)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Playlist toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-center py-1 text-[9px] font-body text-muted-foreground hover:text-foreground transition-colors border-t border-border/50"
      >
        {expanded ? "Ocultar lista" : `Lista (${playlist.length} canciones)`}
      </button>

      {expanded && (
        <div className="max-h-32 overflow-y-auto retro-scrollbar border-t border-border/30">
          {playlist.map((song, i) => (
            <div
              key={song.id}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 text-[10px] font-body hover:bg-muted/30 transition-colors group cursor-pointer",
                i === currentIndex && "bg-neon-cyan/10 text-neon-cyan"
              )}
              onClick={() => { setCurrentIndex(i); setIsPlaying(true); }}
            >
              <span className="w-3 text-right text-muted-foreground">{i + 1}</span>
              <span className={cn("flex-1 truncate", i === currentIndex ? "text-neon-cyan" : "text-foreground")}>{song.title}</span>
              {playlist.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeSong(i); }}
                  className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Hidden YouTube iframe for audio */}
      {isPlaying && current && (
        <iframe
          key={current.id}
          src={`https://www.youtube.com/embed/${current.id}?autoplay=1&loop=0&controls=0&rel=0${muted ? "&mute=1" : ""}`}
          className="w-0 h-0 absolute"
          allow="autoplay"
          title="Chill Music"
        />
      )}
    </div>
  );
}
