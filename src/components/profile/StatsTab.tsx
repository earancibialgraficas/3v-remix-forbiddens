import { Gamepad2, Lock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreAchievements, secretAchievements, getUnlockedScoreAchievements } from "@/lib/achievements";

const safeStr = (val: any) => (val ? String(val) : "");

export default function StatsTab({ profile, followerCount, followingCount, userPosts, socialContentCount, bestScores, displayTier, isStaff, statColors }: any) {
  const totalScore = Number(profile?.total_score || 0);
  const unlockedScoreIds = new Set(getUnlockedScoreAchievements(totalScore).map((achievement) => achievement.id));

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
      <div className="mt-4 border-t border-border/50 pt-4">
        <h4 className="font-pixel text-[10px] text-neon-yellow mb-2 flex items-center justify-center md:justify-start gap-1 uppercase">
          <Trophy className="w-3 h-3" /> Logros
        </h4>
        <div className="grid gap-2 md:grid-cols-2">
          {scoreAchievements.map((achievement) => {
            const unlocked = unlockedScoreIds.has(achievement.id);
            return (
              <div key={achievement.id} className={cn("rounded border p-2.5 transition-colors", unlocked ? "border-neon-yellow/40 bg-neon-yellow/10" : "border-border/60 bg-muted/20 opacity-70")}>
                <div className="flex items-center gap-2">
                  <Trophy className={cn("h-3.5 w-3.5", unlocked ? "text-neon-yellow" : "text-muted-foreground")} />
                  <p className="font-pixel text-[8px] uppercase text-foreground">{achievement.name}</p>
                  <span className={cn("ml-auto font-pixel text-[7px]", unlocked ? "text-neon-green" : "text-muted-foreground")}>{unlocked ? "OK" : `${Math.min(99, Math.floor((totalScore / Number(achievement.threshold || 1)) * 100))}%`}</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground font-body">{achievement.description}</p>
              </div>
            );
          })}
          {secretAchievements.map((achievement) => (
            <div key={achievement.id} className="rounded border border-neon-magenta/20 bg-neon-magenta/5 p-2.5">
              <div className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-neon-magenta" />
                <p className="font-pixel text-[8px] uppercase text-foreground">{achievement.name}</p>
                <span className="ml-auto font-pixel text-[7px] text-neon-magenta">SECRETO</span>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground font-body">{achievement.secretHint}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
