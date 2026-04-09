import { useState, useEffect, useRef, useCallback } from "react";
import { Gamepad2, X, Minimize2, Trophy, Clock, Save, Move, GripVertical, Volume2, VolumeX, Download, Upload, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const consoleIcons: Record<string, string> = {
  nes: "🎮",
  snes: "🕹️",
  gba: "📱",
};

interface SaveSlot {
  name: string;
  data: any;
  timestamp: number;
}

const AFK_TIMEOUT_MS = 30 * 1000; // 30 seconds

export default function GameBubble() {
  const { activeGames, currentGameIndex, minimized, maximizeGame, minimizeGame, closeGame, updateScore } = useGameBubble();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [nostalgistInstance, setNostalgistInstance] = useState<any>(null);
  const [romLoaded, setRomLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const scoreRef = useRef(0);
  const timeRef = useRef(0);

  // AFK tracking
  const lastInputRef = useRef(Date.now());
  const afkRef = useRef(false);

  // Dragging
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  // Resizing
  const [popupSize, setPopupSize] = useState({ w: 700, h: 520 });
  const [resizing, setResizing] = useState(false);
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const nostalgistRef = useRef<any>(null);

  const [volume, setVolume] = useState(100);
  const [showVolume, setShowVolume] = useState(false);
  const [paused, setPaused] = useState(false);

  // Save/Load slots
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [slotName, setSlotName] = useState("");

  const activeGame = activeGames[currentGameIndex] || null;

  // AFK detection: track key and gamepad activity
  useEffect(() => {
    const onInput = () => {
      lastInputRef.current = Date.now();
      if (afkRef.current) {
        afkRef.current = false;
      }
    };
    window.addEventListener("keydown", onInput);
    window.addEventListener("mousedown", onInput);
    window.addEventListener("gamepadconnected", onInput);
    // Also poll gamepad buttons
    let gpInterval: NodeJS.Timeout | null = null;
    if (activeGame && romLoaded) {
      gpInterval = setInterval(() => {
        const gamepads = navigator.getGamepads?.();
        if (gamepads) {
          for (const gp of gamepads) {
            if (gp && gp.buttons.some(b => b.pressed)) {
              onInput();
              break;
            }
          }
        }
      }, 500);
    }
    return () => {
      window.removeEventListener("keydown", onInput);
      window.removeEventListener("mousedown", onInput);
      window.removeEventListener("gamepadconnected", onInput);
      if (gpInterval) clearInterval(gpInterval);
    };
  }, [activeGame, romLoaded]);

  // Load save slots from localStorage
  useEffect(() => {
    if (activeGame) {
      const key = `save_slots_${activeGame.gameName}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        try { setSaveSlots(JSON.parse(stored)); } catch { setSaveSlots([]); }
      } else {
        setSaveSlots([]);
      }
    }
  }, [activeGame?.gameName]);

  // Score increases 10 points every 10 seconds of active play (with AFK check)
  // AFK also auto-pauses the game after 30s of inactivity
  useEffect(() => {
    if (activeGame && !minimized && romLoaded && !paused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        if (now - lastInputRef.current > AFK_TIMEOUT_MS) {
          if (!afkRef.current) {
            afkRef.current = true;
            // Auto-pause when AFK
            if (nostalgistRef.current) {
              try { nostalgistRef.current.pause(); } catch {}
              setPaused(true);
            }
          }
          return; // Don't add score while AFK
        }
        timeRef.current += 10;
        scoreRef.current += 10;
        updateScore(scoreRef.current, timeRef.current);
      }, 10000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeGame, minimized, romLoaded, paused, updateScore]);

  useEffect(() => {
    if (!activeGame) {
      setRomLoaded(false);
      setNostalgistInstance(null);
      scoreRef.current = 0;
      timeRef.current = 0;
      return;
    }
    scoreRef.current = activeGame.score || 0;
    timeRef.current = activeGame.playTime || 0;

    const loadEmu = async () => {
      setRomLoaded(false);
      setPaused(false);
      await new Promise(r => setTimeout(r, 200));
      const el = document.getElementById("game-bubble-canvas");
      if (!el) return;
      try {
        const { Nostalgist } = await import("nostalgist");
        let romSrc = activeGame.romUrl;
        if (romSrc.startsWith("/")) {
          romSrc = window.location.origin + romSrc;
        }
        const instance = await Nostalgist.launch({
          core: activeGame.consoleCore,
          rom: romSrc,
          element: el as HTMLCanvasElement,
          style: { width: "100%", height: "100%" },
        });
        nostalgistRef.current = instance;
        setNostalgistInstance(instance);
        setRomLoaded(true);
        lastInputRef.current = Date.now();
      } catch (err) {
        console.error("Emulator error:", err);
        toast({ title: "Error", description: "No se pudo cargar el emulador", variant: "destructive" });
      }
    };
    loadEmu();

    return () => {
      if (nostalgistRef.current) {
        try { nostalgistRef.current.exit(); } catch {}
        nostalgistRef.current = null;
      }
    };
  }, [activeGame?.romUrl]);

  // When maximizing from minimized, resume emulator and refit canvas
  useEffect(() => {
    if (!minimized && nostalgistRef.current && romLoaded) {
      try {
        nostalgistRef.current.resume();
        setPaused(false);
      } catch {}
      const el = document.getElementById("game-bubble-canvas");
      if (el) {
        (el as HTMLCanvasElement).style.width = "100%";
        (el as HTMLCanvasElement).style.height = "100%";
      }
    }
  }, [minimized, romLoaded]);

  // Re-fit canvas on window resize to prevent black screen
  useEffect(() => {
    if (!romLoaded || minimized) return;
    const handleResize = () => {
      const el = document.getElementById("game-bubble-canvas");
      if (el) {
        (el as HTMLCanvasElement).style.width = "100%";
        (el as HTMLCanvasElement).style.height = "100%";
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [romLoaded, minimized]);

  // Volume control
  useEffect(() => {
    if (!romLoaded) return;
    try {
      const container = document.getElementById("game-bubble-canvas")?.parentElement;
      if (container) {
        container.querySelectorAll("audio, video").forEach((el: any) => {
          el.volume = volume / 100;
        });
      }
      document.querySelectorAll("audio").forEach(a => { a.volume = volume / 100; });
      if (nostalgistRef.current) {
        const n = nostalgistRef.current;
        const mod = n.getEmscriptenModule?.() || (n as any).Module || (n as any)._module;
        if (mod?.SDL2?.audioContext) {
          const ctx = mod.SDL2.audioContext;
          if (!mod._gainNode) {
            mod._gainNode = ctx.createGain();
          }
          if (mod._gainNode) {
            mod._gainNode.gain.value = volume / 100;
          }
        }
      }
    } catch {}
  }, [volume, romLoaded]);

  // Pause/Resume toggle
  const togglePause = useCallback(() => {
    if (!nostalgistRef.current || !romLoaded) return;
    try {
      if (paused) {
        nostalgistRef.current.resume();
      } else {
        nostalgistRef.current.pause();
      }
      setPaused(!paused);
    } catch {}
  }, [paused, romLoaded]);

  // ESC key to toggle pause
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeGame && romLoaded && !minimized) {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeGame, romLoaded, minimized, togglePause]);

  // Helper: convert ArrayBuffer/Blob to base64 string for localStorage
  const stateToBase64 = async (state: any): Promise<string> => {
    if (state instanceof Blob) {
      const buf = await state.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      bytes.forEach(b => binary += String.fromCharCode(b));
      return btoa(binary);
    }
    if (state instanceof ArrayBuffer || ArrayBuffer.isView(state)) {
      const bytes = new Uint8Array(state instanceof ArrayBuffer ? state : state.buffer);
      let binary = '';
      bytes.forEach(b => binary += String.fromCharCode(b));
      return btoa(binary);
    }
    // Fallback: try JSON
    return JSON.stringify(state);
  };

  // Helper: convert base64 back to Uint8Array
  const base64ToState = (b64: string): Uint8Array | any => {
    try {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    } catch {
      // Might be old JSON format
      try { return JSON.parse(b64); } catch { return b64; }
    }
  };

  // Auto-save on close
  const autoSaveOnClose = async () => {
    if (!nostalgistRef.current || !activeGame) return;
    try {
      const state = await nostalgistRef.current.saveState();
      const b64 = await stateToBase64(state);
      const name = `Auto-save ${new Date().toLocaleString()}`;
      const newSlot: SaveSlot = { name, data: b64, timestamp: Date.now() };
      const key = `save_slots_${activeGame.gameName}`;
      const stored = localStorage.getItem(key);
      let slots: SaveSlot[] = [];
      try { slots = stored ? JSON.parse(stored) : []; } catch {}
      slots.push(newSlot);
      localStorage.setItem(key, JSON.stringify(slots));
    } catch {}
  };

  const handleSaveState = async () => {
    if (!nostalgistRef.current || !activeGame) return;
    try {
      const state = await nostalgistRef.current.saveState();
      const b64 = await stateToBase64(state);
      const name = slotName.trim() || `Slot ${saveSlots.length + 1}`;
      const newSlot: SaveSlot = { name, data: b64, timestamp: Date.now() };
      const updated = [...saveSlots, newSlot];
      setSaveSlots(updated);
      localStorage.setItem(`save_slots_${activeGame.gameName}`, JSON.stringify(updated));
      toast({ title: "Partida guardada", description: `"${name}"` });
      setSlotName("");
      setShowSaveDialog(false);
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "Error al guardar", variant: "destructive" });
    }
  };

  const handleLoadState = async (slot: SaveSlot) => {
    if (!nostalgistRef.current) return;
    try {
      const stateData = base64ToState(slot.data);
      await nostalgistRef.current.loadState(stateData);
      toast({ title: "Partida cargada", description: `"${slot.name}"` });
      setShowLoadDialog(false);
    } catch (err) {
      console.error("Load error:", err);
      toast({ title: "Error al cargar", variant: "destructive" });
    }
  };

  const handleDeleteSlot = (index: number) => {
    if (!activeGame) return;
    const updated = saveSlots.filter((_, i) => i !== index);
    setSaveSlots(updated);
    localStorage.setItem(`save_slots_${activeGame.gameName}`, JSON.stringify(updated));
    toast({ title: "Slot eliminado" });
  };

  const handleSaveScore = async () => {
    if (!user || !activeGame || scoreRef.current <= 0) return;
    const currentScore = scoreRef.current;
    const currentTime = timeRef.current;
    
    const { data: existing } = await supabase
      .from("leaderboard_scores")
      .select("id, score")
      .eq("user_id", user.id)
      .eq("game_name", activeGame.gameName)
      .eq("console_type", activeGame.consoleName)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing && (existing as any).score >= currentScore) {
      toast({ title: "Puntaje no superado", description: `Tu récord actual es ${(existing as any).score}. ¡Sigue jugando!` });
      return;
    }

    if (existing) {
      const { error } = await supabase.from("leaderboard_scores").update({
        score: currentScore,
        play_time_seconds: currentTime,
        display_name: profile?.display_name || "Anónimo",
      } as any).eq("id", (existing as any).id);
      if (!error) {
        toast({ title: "¡Nuevo récord!", description: `${currentScore} puntos en ${activeGame.gameName}` });
      }
    } else {
      const { error } = await supabase.from("leaderboard_scores").insert({
        user_id: user.id,
        display_name: profile?.display_name || "Anónimo",
        game_name: activeGame.gameName,
        console_type: activeGame.consoleName,
        score: currentScore,
        play_time_seconds: currentTime,
      } as any);
      if (!error) {
        toast({ title: "¡Puntaje guardado!", description: `${currentScore} puntos en ${activeGame.gameName}` });
      }
    }
  };

  const handleClose = async (idx?: number) => {
    await autoSaveOnClose();
    if (activeGame && scoreRef.current > 0 && user) handleSaveScore();
    if (nostalgistRef.current && (idx === undefined || idx === currentGameIndex)) {
      try { nostalgistRef.current.exit(); } catch {}
      nostalgistRef.current = null;
      setNostalgistInstance(null);
    }
    closeGame(idx);
  };

  // Dragging handlers
  const onMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: position.x, startPosY: position.y };
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition({
        x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  // Resize handlers
  const onResizeDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(true);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: popupSize.w, startH: popupSize.h };
  };

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const newW = Math.max(400, resizeRef.current.startW + (e.clientX - resizeRef.current.startX));
      const newH = Math.max(320, resizeRef.current.startH + (e.clientY - resizeRef.current.startY));
      setPopupSize({ w: newW, h: newH });
      // Refit canvas immediately during resize
      const el = document.getElementById("game-bubble-canvas");
      if (el) {
        (el as HTMLCanvasElement).style.width = "100%";
        (el as HTMLCanvasElement).style.height = "100%";
      }
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizing]);

  if (activeGames.length === 0) return null;

  // Minimized: show live mini windows instead of icons
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[300] flex flex-col-reverse gap-2">
        {activeGames.map((game, idx) => (
          <div
            key={game.romUrl}
            onClick={() => maximizeGame(idx)}
            className={cn(
              "relative rounded-xl bg-card border-2 shadow-2xl cursor-pointer hover:scale-105 transition-transform group overflow-hidden",
              idx === currentGameIndex ? "border-neon-green/60 shadow-neon-green/20" : "border-border"
            )}
            style={{ width: 176, height: 132 }}
          >
            {/* Live canvas preview — we show a screenshot since the canvas is in the maximized view */}
            <div className="w-full h-full bg-black flex items-center justify-center">
              <span className="text-2xl">{consoleIcons[game.consoleName] || "🎮"}</span>
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-1.5">
                <p className="text-[8px] font-body text-foreground truncate font-medium">{game.gameName}</p>
                <div className="flex items-center gap-1 text-[7px] text-muted-foreground font-body">
                  <span className="font-pixel text-neon-cyan">{game.consoleName.toUpperCase()}</span>
                  <span>⚡ {game.score}</span>
                </div>
              </div>
            </div>
            {/* Animated pulse indicator */}
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-neon-green rounded-full animate-pulse" />
            {/* Close button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleClose(idx); }}
              className="absolute top-1 left-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3 text-destructive-foreground" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Maximized popup
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={minimizeGame} />
      <div
        ref={popupRef}
        className="relative flex bg-card border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in select-none"
        style={{ transform: `translate(${position.x}px, ${position.y}px)`, width: `${popupSize.w}px`, height: `${popupSize.h}px`, maxWidth: "95vw", maxHeight: "90vh" }}
      >
        {/* Main game area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Draggable header */}
          <div
            className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border cursor-move select-none"
            onMouseDown={onMouseDown}
          >
            <div className="flex items-center gap-2">
              <Move className="w-3 h-3 text-muted-foreground" />
              <Gamepad2 className="w-4 h-4 text-neon-green" />
              <div>
                <p className="text-xs font-body font-medium text-foreground">{activeGame?.gameName}</p>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-body">
                  <span className="font-pixel text-neon-cyan">{activeGame?.consoleName.toUpperCase()}</span>
                  <span className="flex items-center gap-0.5"><Trophy className="w-2.5 h-2.5" /> {activeGame?.score || 0}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {Math.floor((activeGame?.playTime || 0) / 60)}:{((activeGame?.playTime || 0) % 60).toString().padStart(2, "0")}</span>
                  {afkRef.current && (
                    <span className="text-neon-yellow font-pixel animate-pulse">AFK</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Canvas */}
          <div className="relative flex-1 bg-black overflow-hidden">
            {!romLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground font-body">Cargando emulador...</p>
              </div>
            )}
            <canvas id="game-bubble-canvas" style={{ width: "100%", height: "100%", display: "block" }} />
          </div>
          <div className="px-3 py-1 bg-muted/30 border-t border-border">
            <p className="text-[8px] text-muted-foreground font-body text-center">
              Flechas + Z/X/A/S · Gamepad compatible · Click fuera para minimizar
            </p>
          </div>
        </div>

        {/* Right controls column */}
        <div className="w-14 bg-muted/30 border-l border-border flex flex-col items-center py-3 gap-2 shrink-0">
          {/* Save state */}
          {romLoaded && (
            <Button size="icon" variant="ghost" onClick={() => setShowSaveDialog(true)} className="h-10 w-10 text-neon-green hover:bg-neon-green/10 rounded-lg" title="Guardar partida">
              <Save className="w-4 h-4" />
            </Button>
          )}
          {/* Load state */}
          {romLoaded && saveSlots.length > 0 && (
            <Button size="icon" variant="ghost" onClick={() => setShowLoadDialog(true)} className="h-10 w-10 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg" title="Cargar partida">
              <Download className="w-4 h-4" />
            </Button>
          )}
          {/* Save score */}
          {user && activeGame && activeGame.score > 0 && (
            <Button size="icon" variant="ghost" onClick={handleSaveScore} className="h-10 w-10 text-neon-yellow hover:bg-neon-yellow/10 rounded-lg" title="Guardar puntaje">
              <Upload className="w-4 h-4" />
            </Button>
          )}
          {/* Volume */}
          <div className="relative">
            <Button size="icon" variant="ghost" onClick={() => setShowVolume(!showVolume)} className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg" title="Volumen">
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            {showVolume && (
              <div className="absolute right-full mr-2 top-0 bg-card border border-border rounded-lg p-3 w-36 shadow-xl z-20">
                <p className="text-[9px] text-muted-foreground font-body mb-2">Volumen: {volume}%</p>
                <Slider
                  value={[volume]}
                  onValueChange={(v) => setVolume(v[0])}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between mt-2">
                  <button onClick={() => setVolume(0)} className="text-[8px] text-muted-foreground hover:text-foreground">Mute</button>
                  <button onClick={() => setVolume(100)} className="text-[8px] text-muted-foreground hover:text-foreground">Max</button>
                </div>
              </div>
            )}
          </div>
          {/* Pause */}
          {romLoaded && (
            <Button size="icon" variant="ghost" onClick={togglePause} className={cn("h-10 w-10 rounded-lg", paused ? "text-neon-yellow hover:bg-neon-yellow/10" : "text-muted-foreground hover:bg-muted/50")} title="Pausar (ESC)">
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
          )}
          {/* Minimize */}
          <Button size="icon" variant="ghost" onClick={minimizeGame} className="h-10 w-10 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg" title="Minimizar">
            <Minimize2 className="w-4 h-4" />
          </Button>
          <div className="flex-1" />
          {/* Game tabs */}
          {activeGames.length > 1 && activeGames.map((g, idx) => (
            <button
              key={g.romUrl}
              onClick={() => maximizeGame(idx)}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all",
                idx === currentGameIndex ? "bg-neon-green/20 border border-neon-green/40" : "hover:bg-muted/50"
              )}
              title={g.gameName}
            >
              {consoleIcons[g.consoleName] || "🎮"}
            </button>
          ))}
          <div className="flex-1" />
          <Button size="icon" variant="ghost" onClick={() => handleClose()} className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-lg" title="Cerrar juego">
            <X className="w-4 h-4" />
          </Button>
        </div>
        {/* Resize handle */}
        <div
          onMouseDown={onResizeDown}
          className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-0.5 text-muted-foreground hover:text-foreground z-10"
        >
          <GripVertical className="w-3 h-3 rotate-[-45deg]" />
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={() => setShowSaveDialog(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-card border border-neon-green/30 rounded-lg p-5 w-80 animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-pixel text-[10px] text-neon-green mb-3">GUARDAR PARTIDA</h3>
            <Input
              value={slotName}
              onChange={e => setSlotName(e.target.value)}
              placeholder={`Slot ${saveSlots.length + 1}`}
              className="h-8 bg-muted text-xs font-body mb-3"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveState} className="text-xs flex-1">Guardar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowSaveDialog(false)} className="text-xs">Cancelar</Button>
            </div>
            {saveSlots.length > 0 && (
              <div className="mt-3 border-t border-border pt-2">
                <p className="text-[9px] text-muted-foreground font-body mb-1">Slots guardados ({saveSlots.length}):</p>
                {saveSlots.map((s, i) => (
                  <div key={i} className="text-[9px] font-body text-foreground flex justify-between items-center py-0.5">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">{new Date(s.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={() => setShowLoadDialog(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-card border border-neon-cyan/30 rounded-lg p-5 w-80 max-h-[60vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-pixel text-[10px] text-neon-cyan mb-3">CARGAR PARTIDA</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {saveSlots.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors">
                  <button onClick={() => handleLoadState(s)} className="flex-1 text-left">
                    <p className="text-xs font-body text-foreground">{s.name}</p>
                    <p className="text-[8px] text-muted-foreground font-body">{new Date(s.timestamp).toLocaleString()}</p>
                  </button>
                  <button onClick={() => handleDeleteSlot(i)} className="text-destructive hover:text-destructive/80 p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowLoadDialog(false)} className="text-xs mt-3">Cerrar</Button>
          </div>
        </div>
      )}
    </div>
  );
}
