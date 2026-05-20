import { Lock, Sparkles, Star, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { scoreAchievements, secretAchievements, getUnlockedScoreAchievements } from "@/lib/achievements";

export default function AchievementsTab({ totalScore = 0 }: { totalScore?: number }) {
  const safeScore = Number(totalScore || 0);
  const unlockedScoreIds = new Set(getUnlockedScoreAchievements(safeScore).map((achievement) => achievement.id));

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="rounded border border-neon-yellow/30 bg-gradient-to-br from-neon-yellow/10 via-card to-neon-magenta/10 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-pixel text-[12px] uppercase text-neon-yellow flex items-center gap-2">
              <Trophy className="h-4 w-4" /> Sala de Logros
            </h3>
            <p className="mt-1 text-xs text-muted-foreground font-body">
              Trofeos personales. Se ven, brillan y presumen, pero no se tradean.
            </p>
          </div>
          <div className="rounded border border-neon-yellow/30 bg-black/30 px-3 py-2 text-right">
            <p className="font-pixel text-[8px] uppercase text-muted-foreground">STAT</p>
            <p className="font-body text-lg font-black text-neon-green">{safeScore.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {scoreAchievements.map((achievement) => {
          const threshold = Number(achievement.threshold || 1);
          const unlocked = unlockedScoreIds.has(achievement.id);
          const pct = unlocked ? 100 : Math.min(99, Math.floor((safeScore / threshold) * 100));
          return (
            <article
              key={achievement.id}
              className={cn(
                "relative overflow-hidden rounded border p-4 transition-all",
                unlocked
                  ? "border-neon-yellow/50 bg-neon-yellow/10 shadow-[0_0_22px_rgba(250,204,21,0.10)]"
                  : "border-border bg-card/80",
              )}
            >
              <div className="absolute right-3 top-3 opacity-15">
                {unlocked ? <Trophy className="h-12 w-12 text-neon-yellow" /> : <Lock className="h-12 w-12 text-muted-foreground" />}
              </div>
              <div className="relative">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded border border-white/10 bg-black/35">
                  {unlocked ? <Star className="h-6 w-6 text-neon-yellow" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <p className="font-pixel text-[9px] uppercase text-foreground">{achievement.name}</p>
                <p className="mt-2 min-h-[32px] text-[11px] leading-relaxed text-muted-foreground">{achievement.description}</p>
                <div className="mt-3 h-2 overflow-hidden rounded bg-black/50">
                  <div className={cn("h-full rounded transition-all", unlocked ? "bg-neon-yellow" : "bg-neon-cyan/70")} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[9px] font-pixel uppercase">
                  <span className={unlocked ? "text-neon-green" : "text-muted-foreground"}>{unlocked ? "Desbloqueado" : `${pct}%`}</span>
                  <span className="text-muted-foreground">{threshold.toLocaleString()} pts</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {secretAchievements.map((achievement) => (
          <article key={achievement.id} className="rounded border border-neon-magenta/25 bg-neon-magenta/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded border border-neon-magenta/30 bg-black/35">
                <Sparkles className="h-5 w-5 text-neon-magenta" />
              </div>
              <span className="font-pixel text-[7px] uppercase text-neon-magenta">Secreto</span>
            </div>
            <p className="font-pixel text-[8px] uppercase text-foreground">{achievement.name}</p>
            <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{achievement.secretHint}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
