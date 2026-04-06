import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Gamepad2, Upload, Monitor, X, Trophy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { allGames } from "@/lib/gameLibrary";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ConsoleType = "nes" | "snes" | "gba";

const consoles: { id: ConsoleType; label: string; nostalgistCore: string; color: string }[] = [
  { id: "nes", label: "NES", nostalgistCore: "fceumm", color: "text-neon-green" },
  { id: "snes", label: "SNES", nostalgistCore: "snes9x", color: "text-neon-cyan" },
  { id: "gba", label: "Game Boy Advance", nostalgistCore: "mgba", color: "text-neon-magenta" },
];

export default function EmulatorPage() {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("game");
  const consoleParam = searchParams.get("console") as ConsoleType | null;

  const [selectedConsole, setSelectedConsole] = useState<ConsoleType>(consoleParam || "nes");
  const [romLoaded, setRomLoaded] = useState(false);
  const [romName, setRomName] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [nostalgistInstance, setNostalgistInstance] = useState<any>(null);
  const [playTime, setPlayTime] = useState(0);
  const [score, setScore] = useState(0);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Track play time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (romLoaded && showPopup) {
      interval = setInterval(() => {
        setPlayTime((prev) => prev + 1);
        // Simple scoring: 1 point per 10 seconds of play
        setScore((prev) => prev + 1);
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [romLoaded, showPopup]);

  const launchGame = useCallback(async (romUrl: string, consoleName: ConsoleType, gameName: string) => {
    setRomName(gameName);
    setSelectedConsole(consoleName);
    setShowPopup(true);
    setRomLoaded(false);
    setPlayTime(0);
    setScore(0);

    try {
      const { Nostalgist } = await import("nostalgist");
      const consoleInfo = consoles.find((c) => c.id === consoleName)!;

      // Wait for DOM to be ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      const element = document.getElementById("nostalgist-canvas");
      if (!element) return;

      const instance = await Nostalgist.launch({
        core: consoleInfo.nostalgistCore,
        rom: romUrl,
        element: element as HTMLCanvasElement,
      });

      setNostalgistInstance(instance);
      setRomLoaded(true);
    } catch (err) {
      console.error("Error loading Nostalgist:", err);
      toast({ title: "Error", description: "No se pudo cargar el emulador", variant: "destructive" });
    }
  }, [toast]);

  // Auto-load game from library
  useEffect(() => {
    if (gameId) {
      const game = allGames.find((g) => g.id === gameId);
      if (game) {
        launchGame(game.romUrl, game.console, game.name);
      }
    }
  }, [gameId, launchGame]);

  const handleRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    launchGame(url, selectedConsole, file.name);
  };

  const handleSaveScore = async () => {
    if (!user) {
      toast({ title: "Inicia sesión para guardar tu puntaje", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("leaderboard_scores").insert({
      user_id: user.id,
      display_name: profile?.display_name || "Anónimo",
      game_name: romName,
      console_type: selectedConsole,
      score,
      play_time_seconds: playTime,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      // Also update total score in profile
      if (profile) {
        await supabase.from("profiles").update({
          total_score: (profile.total_score || 0) + score,
        }).eq("user_id", user.id);
      }
      toast({ title: "¡Puntaje guardado!", description: `+${score} puntos añadidos a tu perfil` });
    }
  };

  const closePopup = () => {
    if (nostalgistInstance) {
      try {
        nostalgistInstance.exit();
      } catch {}
    }
    setShowPopup(false);
    setRomLoaded(false);
    setNostalgistInstance(null);
    if (score > 0 && user) {
      handleSaveScore();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-green/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> SALAS DE JUEGO
        </h1>
        <p className="text-xs text-muted-foreground font-body">Carga tu ROM o selecciona un juego de la biblioteca para jugar</p>
      </div>

      {/* Console selector */}
      <div className="flex gap-2 flex-wrap">
        {consoles.map((c) => (
          <Button
            key={c.id}
            variant={selectedConsole === c.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedConsole(c.id)}
            className={cn(
              "text-xs font-body transition-all duration-200",
              selectedConsole === c.id ? "bg-primary text-primary-foreground" : "border-border"
            )}
          >
            <Monitor className="w-3 h-3 mr-1" /> {c.label}
          </Button>
        ))}
      </div>

      {/* ROM Upload */}
      <div className="bg-card border border-border rounded p-6 text-center">
        <input
          type="file"
          id="rom-upload"
          accept=".nes,.smc,.sfc,.gba,.zip,.7z"
          onChange={handleRomUpload}
          className="hidden"
        />
        <div className="space-y-3">
          <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-sm font-body text-muted-foreground">
            Selecciona una ROM de {consoles.find((c) => c.id === selectedConsole)?.label} para empezar a jugar
          </p>
          <Button
            onClick={() => document.getElementById("rom-upload")?.click()}
            className="bg-primary text-primary-foreground hover:bg-primary/80 font-body text-sm transition-all duration-200"
          >
            <Upload className="w-4 h-4 mr-2" /> Cargar ROM
          </Button>
          <p className="text-[10px] text-muted-foreground font-body">
            Formatos: .nes, .smc, .sfc, .gba, .zip, .7z
          </p>
        </div>
      </div>

      {/* Score info */}
      {user && (
        <div className="bg-card border border-neon-yellow/30 rounded p-3 flex items-center gap-3">
          <Trophy className="w-4 h-4 text-neon-yellow" />
          <div className="flex-1">
            <p className="text-xs font-body text-foreground">Puntaje total: <span className="text-neon-green font-bold">{profile?.total_score?.toLocaleString() || 0}</span></p>
            <p className="text-[10px] text-muted-foreground font-body">Ganas puntos automáticamente al jugar. Se guardan al cerrar.</p>
          </div>
        </div>
      )}

      {/* Emulator Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
          <div className="w-full max-w-4xl px-4">
            {/* Popup Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Gamepad2 className="w-5 h-5 text-neon-green" />
                <div>
                  <p className="text-sm font-body text-foreground">{romName}</p>
                  <p className="text-[10px] text-muted-foreground font-body">
                    {consoles.find((c) => c.id === selectedConsole)?.label} • Puntos: {score} • Tiempo: {Math.floor(playTime / 60)}:{(playTime % 60).toString().padStart(2, "0")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {user && score > 0 && (
                  <Button size="sm" variant="outline" onClick={handleSaveScore} className="text-xs gap-1 border-neon-green/30 text-neon-green">
                    <Save className="w-3 h-3" /> Guardar Puntaje
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={closePopup} className="text-muted-foreground hover:text-destructive">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Canvas */}
            <div className="w-full aspect-video bg-black rounded overflow-hidden border border-border">
              {!romLoaded && (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground font-body animate-pulse">Cargando emulador...</p>
                </div>
              )}
              <canvas id="nostalgist-canvas" className="w-full h-full" />
            </div>

            <p className="text-[10px] text-muted-foreground font-body text-center mt-2">
              Controles: Teclado (flechas + Z/X/A/S) o Gamepad conectado. Presiona ESC para cerrar.
            </p>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded p-3">
        <p className="text-[10px] text-muted-foreground font-body">
          ⚠️ Solo carga ROMs de las que poseas una copia física. No proporcionamos ni alojamos ningún archivo ROM.
          Los controles se configuran automáticamente (teclado o gamepad).
        </p>
      </div>
    </div>
  );
}
