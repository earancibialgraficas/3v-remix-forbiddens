import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gamepad2, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nesGames, snesGames, gbaGames, type GameEntry } from "@/lib/gameLibrary";
import { cn } from "@/lib/utils";

type ConsoleFilter = "all" | "nes" | "snes" | "gba";

export default function BibliotecaPage() {
  const [filter, setFilter] = useState<ConsoleFilter>("all");
  const navigate = useNavigate();

  const games = filter === "all" ? [...nesGames, ...snesGames, ...gbaGames]
    : filter === "nes" ? nesGames
    : filter === "snes" ? snesGames
    : gbaGames;

  const handlePlay = (game: GameEntry) => {
    navigate(`/arcade/salas?game=${game.id}&console=${game.console}`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-green/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> BIBLIOTECA DE JUEGOS
        </h1>
        <p className="text-xs text-muted-foreground font-body">
          Selecciona un juego para empezar a jugar directamente en tu navegador
        </p>
      </div>

      {/* Console filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "nes", "snes", "gba"] as ConsoleFilter[]).map((c) => (
          <Button
            key={c}
            variant={filter === c ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(c)}
            className={cn(
              "text-xs font-body transition-all duration-200",
              filter === c ? "bg-primary text-primary-foreground" : "border-border"
            )}
          >
            <Monitor className="w-3 h-3 mr-1" />
            {c === "all" ? "Todos" : c.toUpperCase()}
          </Button>
        ))}
      </div>

      {/* Game grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {games.map((game) => (
          <button
            key={game.id}
            onClick={() => handlePlay(game)}
            className="group bg-card border border-border rounded overflow-hidden hover:border-neon-green/50 transition-all duration-300 text-left"
          >
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={game.coverUrl}
                alt={game.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <div className="p-2">
              <p className="text-xs font-body text-foreground truncate">{game.name}</p>
              <span className={cn(
                "text-[9px] font-pixel",
                game.console === "nes" ? "text-neon-green" : game.console === "snes" ? "text-neon-cyan" : "text-neon-magenta"
              )}>
                {game.console.toUpperCase()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
