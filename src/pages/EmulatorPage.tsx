import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Gamepad2, Upload, Monitor, Trophy, Play, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { nesGames, snesGames, gbaGames, allGames } from "@/lib/gameLibrary";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { supabase } from "@/integrations/supabase/client";

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
  user_id: string;
}

export default function EmulatorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("game");
  const consoleParam = searchParams.get("console") as ConsoleType | null;

  const [selectedConsole, setSelectedConsole] = useState<ConsoleType>(consoleParam || "nes");
  const [leaderboard, setLeaderboard] = useState<LeaderboardScore[]>([]);
  const { launchGame } = useGameBubble();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("leaderboard_scores")
        .select("id, display_name, game_name, score, user_id")
        .eq("console_type", selectedConsole)
        .order("score", { ascending: false })
        .limit(10);
      if (data) setLeaderboard(data as LeaderboardScore[]);
    };
    fetchLeaderboard();
  }, [selectedConsole]);

  const handleLaunch = (romUrl: string, consoleName: ConsoleType, gameName: string) => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes registrarte para jugar", variant: "destructive" });
      return;
    }
    const consoleInfo = consoles.find(c => c.id === consoleName)!;
    launchGame({
      romUrl,
      consoleName,
      gameName,
      consoleCore: consoleInfo.nostalgistCore,
      score: 0,
      playTime: 0,
    });
  };

  useEffect(() => {
    if (gameId) {
      const game = allGames.find((g) => g.id === gameId);
      if (game) handleLaunch(game.romUrl, game.console, game.name);
    }
  }, [gameId]);

  const handleRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes registrarte para cargar ROMs", variant: "destructive" });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    handleLaunch(URL.createObjectURL(file), selectedConsole, file.name);
  };

  const currentGames = getGamesForConsole(selectedConsole);
  const consoleInfo = consoles.find((c) => c.id === selectedConsole)!;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-green/30 rounded-lg p-4">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> SALAS DE JUEGO
        </h1>
        <p className="text-xs text-muted-foreground font-body">Selecciona una consola, elige un juego y empieza a jugar.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {consoles.map((c) => (
          <Button
            key={c.id}
            variant={selectedConsole === c.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedConsole(c.id)}
            className={cn("text-xs font-body transition-all duration-300", selectedConsole === c.id ? "bg-primary text-primary-foreground shadow-lg" : "border-border")}
          >
            <Monitor className="w-3 h-3 mr-1" /> {c.label}
          </Button>
        ))}
      </div>

      <div className="bg-card border border-dashed border-border rounded-lg p-3 flex items-center gap-3">
        <input type="file" id="rom-upload" accept=".nes,.smc,.sfc,.gba,.zip,.7z" onChange={handleRomUpload} className="hidden" />
        <Button size="sm" variant="outline" onClick={() => document.getElementById("rom-upload")?.click()} className="text-xs font-body gap-1 border-border">
          <Upload className="w-3 h-3" /> Cargar ROM
        </Button>
        <span className="text-[10px] text-muted-foreground font-body">.nes, .smc, .sfc, .gba, .zip, .7z</span>
      </div>

      <div>
        <h2 className={cn("font-pixel text-xs mb-2 flex items-center gap-1.5", consoleInfo.color)}>
          <Gamepad2 className="w-3.5 h-3.5" /> BIBLIOTECA {consoleInfo.label.toUpperCase()}
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {currentGames.map((game) => (
            <button
              key={game.id}
              onClick={() => handleLaunch(game.romUrl, game.console, game.name)}
              className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 text-left"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img src={game.coverUrl} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
              </div>
              <div className="p-1.5 flex items-center gap-1">
                <Play className="w-2.5 h-2.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <p className="text-[10px] font-body text-foreground truncate">{game.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard with usernames */}
      <div className="bg-card border border-neon-yellow/20 rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-neon-yellow" />
          <h2 className="font-pixel text-[10px] text-neon-yellow">LEADERBOARD — {consoleInfo.label.toUpperCase()}</h2>
        </div>
        {leaderboard.length === 0 ? (
          <div className="p-4 text-center text-[10px] text-muted-foreground font-body">Sin puntuaciones aún. ¡Sé el primero!</div>
        ) : (
          leaderboard.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 text-[10px] font-body hover:bg-muted/30 transition-colors">
              <span className={cn("w-5 font-bold text-center", i === 0 ? "text-neon-yellow" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-neon-orange" : "text-muted-foreground")}>
                {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
              </span>
              <User className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="flex-1 text-foreground truncate font-medium">{s.display_name}</span>
              <span className="text-muted-foreground truncate max-w-[80px]">{s.game_name}</span>
              <span className="text-neon-green font-bold">{s.score.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>

      <p className="text-[9px] text-muted-foreground font-body">
        ⚠️ Solo carga ROMs de las que poseas una copia física. Los controles se configuran automáticamente.
      </p>
    </div>
  );
}
