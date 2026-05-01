import { useState, useEffect, useMemo } from "react";
import { Trophy, Gamepad2, User, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import RoleBadge from "@/components/RoleBadge";
import UserPopup from "@/components/UserPopup";
import { getNameStyle } from "@/lib/profileAppearance";

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
  color_avatar_border?: string | null;
  color_name?: string | null;
  color_role?: string | null;
  color_staff_role?: string | null;
}

export default function LeaderboardPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserInfo>>({});
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [consoleFilter, setConsoleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

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
          const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, role_icon, show_role_icon, membership_tier, color_avatar_border, color_name, color_role, color_staff_role").in("user_id", userIds);
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

  // Deduplicate: keep only highest score per user per game
  const dedupScores = (list: Score[]) => {
    const best: Record<string, Score> = {};
    list.forEach(s => {
      const key = `${s.user_id}_${s.game_name}_${s.console_type}`;
      if (!best[key] || s.score > best[key].score) best[key] = s;
    });
    return Object.values(best).sort((a, b) => b.score - a.score);
  };

  const deduped = dedupScores(scores);

  // Lista completa de consolas soportadas (debe coincidir con EmulatorPage)
  const ALL_CONSOLES: { id: string; label: string }[] = [
    { id: "nes", label: "NES" },
    { id: "snes", label: "SNES" },
    { id: "n64", label: "N64" },
    { id: "gba", label: "GBA" },
    { id: "gbc", label: "GBC" },
    { id: "sega", label: "MEGA DRIVE" },
    { id: "ps1", label: "PSX" },
    { id: "arcade", label: "ARCADE" },
  ];

  // Consolas que tienen al menos un score (para resaltar visualmente)
  const consolesWithScores = useMemo(() => {
    const set = new Set<string>();
    deduped.forEach(s => s.console_type && set.add(s.console_type));
    return set;
  }, [deduped]);

  // Aplicar filtros
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deduped.filter(s => {
      if (consoleFilter !== "all" && s.console_type !== consoleFilter) return false;
      if (q && !s.game_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [deduped, consoleFilter, search]);

  // Group scores by game
  const gameGroups = filtered.reduce<Record<string, Score[]>>((acc, s) => {
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
          "grid grid-cols-[40px_1fr_100px] gap-2 px-3 py-2 text-xs font-body border-b border-border/50 transition-all duration-200 hover:bg-muted/50",
          i < 3 && "bg-neon-yellow/5"
        )}
      >
        <span className={cn("font-bold", i === 0 ? "text-neon-yellow" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-neon-orange" : "text-muted-foreground")}>
          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
        </span>
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {up ? (
            <UserPopup
              userId={score.user_id}
              displayName={up.display_name}
              avatarUrl={up.avatar_url}
              roles={ur}
              roleIcon={up.role_icon}
              showRoleIcon={up.show_role_icon}
              membershipTier={up.membership_tier}
              colorAvatarBorder={up.color_avatar_border}
              colorName={up.color_name}
              colorRole={up.color_role}
              colorStaffRole={up.color_staff_role}
            />
          ) : (
            <span className="text-foreground truncate" style={getNameStyle(up?.color_name)}>{score.display_name}</span>
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

      {/* 🔍 Filtros: consola + búsqueda */}
      {!loading && scores.length > 0 && (
        <div className="bg-card border border-border rounded p-3 flex flex-col sm:flex-row gap-2">
          {/* Selector de consola */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setConsoleFilter("all")}
              className={cn(
                "px-2.5 py-1 text-[10px] font-pixel uppercase tracking-wider rounded border transition-all",
                consoleFilter === "all"
                  ? "bg-neon-yellow/20 border-neon-yellow text-neon-yellow"
                  : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              )}
            >
              Todas
            </button>
            {ALL_CONSOLES.map(c => {
              const hasScores = consolesWithScores.has(c.id);
              const isActive = consoleFilter === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setConsoleFilter(c.id)}
                  title={hasScores ? c.label : `${c.label} — sin puntajes aún`}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-pixel uppercase tracking-wider rounded border transition-all",
                    isActive
                      ? "bg-neon-green/20 border-neon-green text-neon-green"
                      : hasScores
                        ? "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                        : "bg-muted/20 border-border/50 text-muted-foreground/50 hover:text-muted-foreground hover:border-foreground/20"
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Buscador de juego */}
          <div className="relative flex-1 sm:max-w-xs sm:ml-auto">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar juego..."
              className="w-full pl-8 pr-8 py-1.5 text-xs font-body bg-muted/50 border border-border rounded focus:outline-none focus:border-neon-cyan focus:bg-background transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground font-body">Cargando puntuaciones...</div>
      ) : scores.length === 0 ? (
        <div className="bg-card border border-border rounded p-8 text-center space-y-2">
          <Gamepad2 className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground font-body">Aún no hay puntuaciones. ¡Sé el primero en jugar!</p>
        </div>
      ) : Object.keys(gameGroups).length === 0 ? (
        <div className="bg-card border border-border rounded p-8 text-center space-y-2">
          <Search className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-xs text-muted-foreground font-body">
            No se encontraron resultados{search ? ` para "${search}"` : ""}
            {consoleFilter !== "all" ? ` en ${consoleFilter.toUpperCase()}` : ""}.
          </p>
        </div>
      ) : (
        Object.entries(gameGroups).map(([gameName, gameScores]) => (
          <div key={gameName} className="bg-card border border-border rounded overflow-hidden">
            <div className="px-3 py-2 bg-muted border-b border-border flex items-center gap-2">
              <Gamepad2 className="w-3.5 h-3.5 text-neon-green shrink-0" />
              <h2 className="font-pixel text-[10px] text-neon-green truncate" title={gameName}>{gameName}</h2>
              <span className="text-[9px] text-muted-foreground font-body ml-auto">{gameScores.length} jugador{gameScores.length > 1 ? "es" : ""}</span>
            </div>
            <div className="grid grid-cols-[40px_1fr_100px] gap-2 px-3 py-1.5 text-[9px] font-pixel text-muted-foreground border-b border-border">
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
