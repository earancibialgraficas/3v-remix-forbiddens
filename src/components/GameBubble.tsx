import { useState, useEffect, useRef } from "react";
import { Gamepad2, X, Maximize2, Trophy, Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function GameBubble() {
  const { activeGame, minimized, maximizeGame, minimizeGame, closeGame, updateScore } = useGameBubble();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [nostalgistInstance, setNostalgistInstance] = useState<any>(null);
  const [romLoaded, setRomLoaded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const scoreRef = useRef(0);
  const timeRef = useRef(0);

  // Track play time
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

  // Launch emulator when game changes
  useEffect(() => {
    if (!activeGame) {
      setRomLoaded(false);
      setNostalgistInstance(null);
      scoreRef.current = 0;
      timeRef.current = 0;
      return;
    }
    scoreRef.current = 0;
    timeRef.current = 0;

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

  const handleClose = () => {
    if (scoreRef.current > 0 && user) handleSaveScore();
    if (nostalgistInstance) { try { nostalgistInstance.exit(); } catch {} }
    setNostalgistInstance(null);
    closeGame();
  };

  if (!activeGame) return null;

  // Minimized bubble
  if (minimized) {
    return (
      <div
        onClick={maximizeGame}
        className="fixed bottom-4 right-4 z-[300] w-14 h-14 rounded-full bg-card border-2 border-neon-green/60 shadow-lg shadow-neon-green/20 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform animate-pulse-glow group"
      >
        <Gamepad2 className="w-6 h-6 text-neon-green" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-neon-green rounded-full animate-ping" />
        <div className="absolute bottom-full mb-2 bg-card border border-border rounded px-2 py-1 text-[9px] font-body text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {activeGame.gameName}
        </div>
      </div>
    );
  }

  // Maximized popup
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={minimizeGame} />
      <div className="relative w-[95vw] max-w-5xl bg-card border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-4 h-4 text-neon-green" />
            <div>
              <p className="text-sm font-body font-medium text-foreground">{activeGame.gameName}</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-body">
                <span className="font-pixel text-neon-cyan">{activeGame.consoleName.toUpperCase()}</span>
                <span className="flex items-center gap-0.5"><Trophy className="w-2.5 h-2.5" /> {activeGame.score}</span>
                <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {Math.floor(activeGame.playTime / 60)}:{(activeGame.playTime % 60).toString().padStart(2, "0")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {user && activeGame.score > 0 && (
              <Button size="sm" variant="outline" onClick={handleSaveScore} className="text-[10px] gap-1 border-neon-green/30 text-neon-green h-7">
                <Save className="w-3 h-3" /> Guardar
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={minimizeGame} className="h-7 w-7 text-muted-foreground hover:text-neon-cyan rounded-full" title="Minimizar">
              <Maximize2 className="w-4 h-4 rotate-180" />
            </Button>
            <Button size="icon" variant="ghost" onClick={handleClose} className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-full">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* Canvas */}
        <div className="relative w-full aspect-video bg-black">
          {!romLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground font-body">Cargando emulador...</p>
            </div>
          )}
          <canvas id="game-bubble-canvas" className="w-full h-full" />
        </div>
        <div className="px-4 py-1.5 bg-muted/30 border-t border-border">
          <p className="text-[9px] text-muted-foreground font-body text-center">
            Controles: Flechas + Z/X/A/S · Gamepad compatible · Click fuera para minimizar
          </p>
        </div>
      </div>
    </div>
  );
}
