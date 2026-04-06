import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Gamepad2, Upload, Monitor, X, Trophy, Save, Play, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { nesGames, snesGames, gbaGames, allGames, type GameEntry } from "@/lib/gameLibrary";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ConsoleType = "nes" | "snes" | "gba";

const consoles: { id: ConsoleType; label: string; nostalgistCore: string; color: string }[] = [
  { id: "nes", label: "NES", nostalgistCore: "fceumm", color: "text-neon-green" },
  { id: "snes", label: "SNES", nostalgistCore: "snes9x", color: "text-neon-cyan" },
  { id: "gba", label: "Game Boy Advance", nostalgistCore: "mgba", color: "text-neon-magenta" },
];

const getGamesForConsole = (c: ConsoleType) =>
  c === "nes" ? nesGames : c === "snes" ? snesGames : gbaGames;

interface LeaderboardScore {
  id: string;
  display_name: string;
  game_name: string;
  score: number;
}

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
  const [leaderboard, setLeaderboard] = useState<LeaderboardScore[]>([]);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Fetch leaderboard for selected console
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("leaderboard_scores")
        .select("id, display_name, game_name, score")
        .eq("console_type", selectedConsole)
        .order("score", { ascending: false })
        .limit(10);
      if (data) setLeaderboard(data as LeaderboardScore[]);
    };
    fetchLeaderboard();
  }, [selectedConsole]);

  // Track play time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (romLoaded && showPopup) {
      interval = setInterval(() => {
        setPlayTime((prev) => prev + 1);
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

  // Auto-load game from URL params
  useEffect(() => {
    if (gameId) {
      const game = allGames.find((g) => g.id === gameId);
      if (game) launchGame(game.romUrl, game.console, game.name);
    }
  }, [gameId, launchGame]);

  const handleRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    launchGame(URL.createObjectURL(file), selectedConsole, file.name);
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
      if (profile) {
        await supabase.from("profiles").update({
          total_score: (profile.total_score || 0) + score,
        }).eq("user_id", user.id);
      }
      toast({ title: "¡Puntaje guardado!", description: `+${score} puntos añadidos` });
    }
  };

  const closePopup = () => {
    if (nostalgistInstance) {
      try { nostalgistInstance.exit(); } catch {}
    }
    setShowPopup(false);
    setRomLoaded(false);
    setNostalgistInstance(null);
    if (score > 0 && user) handleSaveScore();
  };

  const currentGames = getGamesForConsole(selectedConsole);
  const consoleInfo = consoles.find((c) => c.id === selectedConsole)!;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="bg-card border border-neon-green/30 rounded-lg p-4">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> SALAS DE JUEGO
        </h1>
        <p className="text-xs text-muted-foreground font-body">Selecciona una consola, elige un juego y empieza a jugar</p>
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
              "text-xs font-body transition-all duration-300",
              selectedConsole === c.id ? "bg-primary text-primary-foreground shadow-lg" : "border-border"
            )}
          >
            <Monitor className="w-3 h-3 mr-1" /> {c.label}
          </Button>
        ))}
      </div>

      {/* Upload ROM */}
      <div className="bg-card border border-dashed border-border rounded-lg p-3 flex items-center gap-3">
        <input type="file" id="rom-upload" accept=".nes,.smc,.sfc,.gba,.zip,.7z" onChange={handleRomUpload} className="hidden" />
        <Button
          size="sm"
          variant="outline"
          onClick={() => document.getElementById("rom-upload")?.click()}
          className="text-xs font-body gap-1 border-border"
        >
          <Upload className="w-3 h-3" /> Cargar ROM
        </Button>
        <span className="text-[10px] text-muted-foreground font-body">.nes, .smc, .sfc, .gba, .zip, .7z</span>
      </div>

      {/* Game Library for selected console */}
      <div>
        <h2 className={cn("font-pixel text-xs mb-2 flex items-center gap-1.5", consoleInfo.color)}>
          <Gamepad2 className="w-3.5 h-3.5" /> BIBLIOTECA {consoleInfo.label.toUpperCase()}
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {currentGames.map((game) => (
            <button
              key={game.id}
              onClick={() => launchGame(game.romUrl, game.console, game.name)}
              className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 text-left"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={game.coverUrl}
                  alt={game.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
              <div className="p-1.5 flex items-center gap-1">
                <Play className="w-2.5 h-2.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <p className="text-[10px] font-body text-foreground truncate">{game.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard for selected console */}
      <div className="bg-card border border-neon-yellow/20 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-neon-yellow" />
          <h2 className="font-pixel text-[10px] text-neon-yellow">LEADERBOARD — {consoleInfo.label.toUpperCase()}</h2>
        </div>
        {leaderboard.length === 0 ? (
          <div className="p-4 text-center text-[10px] text-muted-foreground font-body">
            Sin puntuaciones aún. ¡Sé el primero!
          </div>
        ) : (
          leaderboard.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 text-[10px] font-body hover:bg-muted/30 transition-colors">
              <span className={cn("w-5 font-bold text-center", i === 0 ? "text-neon-yellow" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-neon-orange" : "text-muted-foreground")}>
                {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
              </span>
              <span className="flex-1 text-foreground truncate">{s.display_name}</span>
              <span className="text-muted-foreground truncate max-w-[80px]">{s.game_name}</span>
              <span className="text-neon-green font-bold">{s.score.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[9px] text-muted-foreground font-body">
        ⚠️ Solo carga ROMs de las que poseas una copia física. Los controles se configuran automáticamente (teclado o gamepad).
      </p>

      {/* Emulator Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center animate-fade-in">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={closePopup} />

          {/* Modal */}
          <div className="relative w-[95vw] max-w-5xl bg-card border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/50 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", 
                  selectedConsole === "nes" ? "bg-neon-green/10" : selectedConsole === "snes" ? "bg-neon-cyan/10" : "bg-neon-magenta/10"
                )}>
                  <Gamepad2 className={cn("w-4 h-4", consoleInfo.color)} />
                </div>
                <div>
                  <p className="text-sm font-body font-medium text-foreground">{romName}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-body">
                    <span className={cn("font-pixel", consoleInfo.color)}>{consoleInfo.label}</span>
                    <span className="flex items-center gap-0.5"><Trophy className="w-2.5 h-2.5" /> {score}</span>
                    <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {Math.floor(playTime / 60)}:{(playTime % 60).toString().padStart(2, "0")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user && score > 0 && (
                  <Button size="sm" variant="outline" onClick={handleSaveScore} className="text-[10px] gap-1 border-neon-green/30 text-neon-green h-7">
                    <Save className="w-3 h-3" /> Guardar
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={closePopup} className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Canvas area */}
            <div className="relative w-full aspect-video bg-black">
              {!romLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-muted-foreground font-body">Cargando emulador...</p>
                </div>
              )}
              <canvas id="nostalgist-canvas" className="w-full h-full" />
            </div>

            {/* Footer */}
            <div className="px-4 py-1.5 bg-muted/30 border-t border-border">
              <p className="text-[9px] text-muted-foreground font-body text-center">
                Controles: Flechas + Z/X/A/S · Gamepad compatible · ESC para cerrar
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
