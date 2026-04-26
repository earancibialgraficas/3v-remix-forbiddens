import { Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

const safeStr = (val: any) => (val ? String(val) : "");

export default function StatsTab({ profile, followerCount, followingCount, userPosts, socialContentCount, bestScores, displayTier, isStaff, statColors }: any) {
  return (
    <div className="bg-card border border-border rounded p-4 space-y-3 animate-in fade-in">
      <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left uppercase">Estadísticas</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { val: profile?.total_score?.toLocaleString() || 0, label: "Puntos", color: statColors.points || "#39ff14" },
          { val: followerCount, label: "Seguidores", color: statColors.followers || "#ffffff" },
          { val: followingCount, label: "Siguiendo", color: statColors.following || "#ffffff" },
          { val: userPosts.length, label: "Posts Foro", color: statColors.forum || "#00ffff" },
          { val: socialContentCount, label: "Posts Social", color: statColors.social || "#ffff00" },
          { val: bestScores.length, label: "Juegos", color: statColors.games || "#ff8c00" },
          { val: displayTier, label: "Membresía", color: isStaff ? "#39ff14" : "#a1a1aa", isStaffTier: isStaff },
        ].map((s, i) => (
          <div key={i} className="bg-muted/30 rounded p-3 text-center flex flex-col justify-center min-h-[70px]">
            <p className={cn("text-lg font-bold font-body", s.isStaffTier && "animate-pulse")} style={{ color: s.color, filter: s.isStaffTier ? `drop-shadow(0 0 8px ${s.color}cc)` : undefined }}>{s.val}</p>
            <p className="text-[10px] uppercase opacity-60 font-body mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      {bestScores.length > 0 && (
        <div className="mt-4">
          <h4 className="font-pixel text-[10px] text-neon-green mb-2 flex items-center justify-center md:justify-start gap-1 uppercase"><Gamepad2 className="w-3 h-3" /> Puntajes por Juego</h4>
          <div className="space-y-1">
            {bestScores.map((gs: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-muted/30 rounded px-3 py-1.5 text-xs font-body">
                <span className={cn("font-pixel text-[9px]", safeStr(gs?.console_type) === "nes" ? "text-neon-green" : safeStr(gs?.console_type) === "snes" ? "text-neon-cyan" : "text-neon-magenta")}>{safeStr(gs?.console_type).toUpperCase()}</span>
                <span className="flex-1 text-foreground truncate">{gs.game_name}</span>
                <span className="text-neon-green font-bold">{gs.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}