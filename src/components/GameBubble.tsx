import { useState, useEffect, useRef } from "react";
import { Gamepad2, X, Maximize2, Minimize2, Trophy, Clock, Save, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export default function GameBubble() {
  const { activeGames, currentGameIndex, minimized, maximizeGame, minimizeGame, closeGame, updateScore } = useGameBubble();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [nostalgistInstance, setNostalgistInstance] = useState<any>(null);
  const [romLoaded, setRomLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const scoreRef = useRef(0);
  const timeRef = useRef(0);

  // Dragging state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  const activeGame = activeGames[currentGameIndex] || null;

  useEffect(() => {
    if (activeGame && !minimized && romLoaded) {
      intervalRef.current = setInterval(() => {
        timeRef.current += 1;
        scoreRef.current += 1;
        updateScore(scoreRef.current, timeRef.current);
      }, 10000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeGame, minimized, romLoaded, updateScore]);

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
      await new Promise(r => setTimeout(r, 200));
      const el = document.getElementById("game-bubble-canvas");
      if (!el) return;
      try {
        const { Nostalgist } = await import("nostalgist");
        const instance = await Nostalgist.launch({
          core: activeGame.consoleCore,
          rom: activeGame.romUrl,
          element: el as HTMLCanvasElement,
        });
        setNostalgistInstance(instance);
        setRomLoaded(true);
      } catch (err) {
        console.error("Emulator error:", err);
        toast({ title: "Error", description: "No se pudo cargar el emulador", variant: "destructive" });
      }
    };
    loadEmu();

    return () => {
      if (nostalgistInstance) {
        try { nostalgistInstance.exit(); } catch {}
      }
    };
  }, [activeGame?.romUrl]);

  const handleSaveScore = async () => {
    if (!user || !activeGame) return;
    const { error } = await supabase.from("leaderboard_scores").insert({
      user_id: user.id,
      display_name: profile?.display_name || "Anónimo",
      game_name: activeGame.gameName,
      console_type: activeGame.consoleName,
      score: scoreRef.current,
      play_time_seconds: timeRef.current,
    } as any);
    if (!error) {
      if (profile) {
        await supabase.from("profiles").update({
          total_score: (profile.total_score || 0) + scoreRef.current,
        }).eq("user_id", user.id);
      }
      toast({ title: "¡Puntaje guardado!", description: `+${scoreRef.current} puntos` });
    }
  };

  const handleClose = (idx?: number) => {
    const game = idx !== undefined ? activeGames[idx] : activeGame;
    if (game && scoreRef.current > 0 && user) handleSaveScore();
    if (nostalgistInstance && (idx === undefined || idx === currentGameIndex)) {
      try { nostalgistInstance.exit(); } catch {}
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

  if (activeGames.length === 0) return null;

  // Minimized bubbles
  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[300] flex flex-col-reverse gap-2">
        {activeGames.map((game, idx) => (
          <div
            key={game.romUrl}
            onClick={() => maximizeGame(idx)}
            className={cn(
              "w-12 h-12 rounded-full bg-card border-2 shadow-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform group relative",
              idx === currentGameIndex ? "border-neon-green/60 shadow-neon-green/20 animate-pulse-glow" : "border-border"
            )}
          >
            <span className="text-lg">{consoleIcons[game.consoleName] || "🎮"}</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-neon-green rounded-full animate-ping" />
            <div className="absolute bottom-full mb-2 bg-card border border-border rounded px-2 py-1 text-[9px] font-body text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {game.gameName}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleClose(idx); }}
              className="absolute -top-1 -left-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5 text-destructive-foreground" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Maximized popup - draggable
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={minimizeGame} />
      <div
        ref={popupRef}
        className="relative flex bg-card border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in"
        style={{ transform: `translate(${position.x}px, ${position.y}px)`, maxWidth: "90vw", maxHeight: "85vh" }}
      >
        {/* Main game area */}
        <div className="flex-1 flex flex-col min-w-0" style={{ width: "70%" }}>
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
                </div>
              </div>
            </div>
          </div>
          {/* Canvas */}
          <div className="relative flex-1 bg-black" style={{ aspectRatio: "4/3", minHeight: "300px" }}>
            {!romLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground font-body">Cargando emulador...</p>
              </div>
            )}
            <canvas id="game-bubble-canvas" className="w-full h-full" />
          </div>
          <div className="px-3 py-1 bg-muted/30 border-t border-border">
            <p className="text-[8px] text-muted-foreground font-body text-center">
              Flechas + Z/X/A/S · Gamepad compatible · Click fuera para minimizar
            </p>
          </div>
        </div>

        {/* Right controls column */}
        <div className="w-14 bg-muted/30 border-l border-border flex flex-col items-center py-3 gap-2 shrink-0">
          {user && activeGame && activeGame.score > 0 && (
            <Button size="icon" variant="ghost" onClick={handleSaveScore} className="h-10 w-10 text-neon-green hover:bg-neon-green/10 rounded-lg" title="Guardar puntaje">
              <Save className="w-4 h-4" />
            </Button>
          )}
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
      </div>
    </div>
  );
}
