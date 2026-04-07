import { useState, useEffect } from "react";
import { Trophy, Gamepad2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import RoleBadge from "@/components/RoleBadge";
import UserPopup from "@/components/UserPopup";

interface Score {
  id: string;
  user_id: string;
  display_name: string;
  game_name: string;
  console_type: string;
  score: number;
  play_time_seconds: number;
  created_at: string;
}

interface UserInfo {
  display_name: string;
  avatar_url: string | null;
  role_icon: string | null;
  show_role_icon: boolean;
  membership_tier: string;
}

export default function LeaderboardPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserInfo>>({});
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchScores = async () => {
      const { data, error } = await supabase
        .from("leaderboard_scores")
        .select("*")
        .order("score", { ascending: false })
        .limit(100);

      if (!error && data) {
        setScores(data as Score[]);
        const userIds = [...new Set((data as any[]).map(s => s.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, role_icon, show_role_icon, membership_tier").in("user_id", userIds);
          const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
          const pMap: Record<string, UserInfo> = {};
          profiles?.forEach(p => pMap[p.user_id] = p as unknown as UserInfo);
          const rMap: Record<string, string[]> = {};
          roles?.forEach((r: any) => { if (!rMap[r.user_id]) rMap[r.user_id] = []; rMap[r.user_id].push(r.role); });
          setUserProfiles(pMap);
          setUserRoles(rMap);
        }
      }
      setLoading(false);
    };

    fetchScores();

    const channel = supabase
      .channel("leaderboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leaderboard_scores" }, () => fetchScores())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Group scores by game
  const gameGroups = scores.reduce<Record<string, Score[]>>((acc, s) => {
    const key = `${s.game_name} (${s.console_type.toUpperCase()})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const renderScoreRow = (score: Score, i: number) => {
    const up = userProfiles[score.user_id];
    const ur = userRoles[score.user_id] || [];
    return (
      <div
        key={score.id}
        className={cn(
          "grid grid-cols-[40px_1fr_80px] gap-2 px-3 py-2 text-xs font-body border-b border-border/50 transition-all duration-200 hover:bg-muted/50",
          i < 3 && "bg-neon-yellow/5"
        )}
      >
        <span className={cn("font-bold", i === 0 ? "text-neon-yellow" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-neon-orange" : "text-muted-foreground")}>
          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
        </span>
        <div className="flex items-center gap-1.5 min-w-0">
          {up ? (
            <UserPopup
              userId={score.user_id}
              displayName={up.display_name}
              avatarUrl={up.avatar_url}
              roles={ur}
              roleIcon={up.role_icon}
              showRoleIcon={up.show_role_icon}
              membershipTier={up.membership_tier}
            />
          ) : (
            <span className="text-foreground truncate">{score.display_name}</span>
          )}
        </div>
        <span className="text-neon-green text-right font-bold">{score.score.toLocaleString()}</span>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-yellow/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-yellow mb-1 flex items-center gap-2">
          <Trophy className="w-4 h-4" /> LEADERBOARDS
        </h1>
        <p className="text-xs text-muted-foreground font-body">
          Puntuaciones en tiempo real — solo se guarda el puntaje más alto por juego
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground font-body">Cargando puntuaciones...</div>
      ) : scores.length === 0 ? (
        <div className="bg-card border border-border rounded p-8 text-center space-y-2">
          <Gamepad2 className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground font-body">Aún no hay puntuaciones. ¡Sé el primero en jugar!</p>
        </div>
      ) : (
        Object.entries(gameGroups).map(([gameName, gameScores]) => (
          <div key={gameName} className="bg-card border border-border rounded overflow-hidden">
            <div className="px-3 py-2 bg-muted border-b border-border flex items-center gap-2">
              <Gamepad2 className="w-3.5 h-3.5 text-neon-green" />
              <h2 className="font-pixel text-[10px] text-neon-green">{gameName}</h2>
              <span className="text-[9px] text-muted-foreground font-body ml-auto">{gameScores.length} jugador{gameScores.length > 1 ? "es" : ""}</span>
            </div>
            <div className="grid grid-cols-[40px_1fr_80px] gap-2 px-3 py-1.5 text-[9px] font-pixel text-muted-foreground border-b border-border">
              <span>#</span>
              <span>JUGADOR</span>
              <span className="text-right">SCORE</span>
            </div>
            {gameScores.map((s, i) => renderScoreRow(s, i))}
          </div>
        ))
      )}
    </div>
  );
}
