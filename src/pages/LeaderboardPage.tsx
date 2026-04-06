import { useState, useEffect } from "react";
import { Trophy, Gamepad2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Score {
  id: string;
  display_name: string;
  game_name: string;
  console_type: string;
  score: number;
  play_time_seconds: number;
  created_at: string;
}

export default function LeaderboardPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      const { data, error } = await supabase
        .from("leaderboard_scores")
        .select("*")
        .order("score", { ascending: false })
        .limit(50);

      if (!error && data) {
        setScores(data as Score[]);
      }
      setLoading(false);
    };

    fetchScores();

    // Realtime subscription
    const channel = supabase
      .channel("leaderboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard_scores" },
        () => {
          fetchScores();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-yellow/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-yellow mb-1 flex items-center gap-2">
          <Trophy className="w-4 h-4" /> LEADERBOARDS
        </h1>
        <p className="text-xs text-muted-foreground font-body">
          Puntuaciones en tiempo real de los jugadores de la comunidad
        </p>
      </div>

      <div className="bg-card border border-border rounded overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_100px_80px_80px] gap-2 px-3 py-2 bg-muted text-[10px] font-pixel text-muted-foreground border-b border-border">
          <span>#</span>
          <span>JUGADOR</span>
          <span>JUEGO</span>
          <span>CONSOLA</span>
          <span className="text-right">SCORE</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-body">
            Cargando puntuaciones...
          </div>
        ) : scores.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Gamepad2 className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground font-body">
              Aún no hay puntuaciones. ¡Sé el primero en jugar!
            </p>
          </div>
        ) : (
          scores.map((score, i) => (
            <div
              key={score.id}
              className={cn(
                "grid grid-cols-[40px_1fr_100px_80px_80px] gap-2 px-3 py-2 text-xs font-body border-b border-border/50 transition-all duration-200 hover:bg-muted/50",
                i < 3 && "bg-neon-yellow/5"
              )}
            >
              <span className={cn(
                "font-bold",
                i === 0 ? "text-neon-yellow" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-neon-orange" : "text-muted-foreground"
              )}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
              </span>
              <span className="text-foreground truncate">{score.display_name}</span>
              <span className="text-muted-foreground truncate">{score.game_name}</span>
              <span className={cn(
                "font-pixel text-[9px]",
                score.console_type === "nes" ? "text-neon-green" : "text-neon-cyan"
              )}>
                {score.console_type.toUpperCase()}
              </span>
              <span className="text-neon-green text-right font-bold">{score.score.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
