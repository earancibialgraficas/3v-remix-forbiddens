import { useState } from "react";
import { createPortal } from "react-dom";
import { Gamepad2, Gem, Medal, X } from "lucide-react";
import AchievementsTab from "@/components/profile/AchievementsTab";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const safeStr = (val: any) => (val ? String(val) : "");

export default function StatsTab({ profile, followerCount, followingCount, userPosts, socialContentCount, bestScores, fcoinBalance = 0, bingoFcoinNet = 0, displayTier, isStaff, statColors }: any) {
  const [showAchievements, setShowAchievements] = useState(false);
  const bingoNet = Math.trunc(Number(bingoFcoinNet || 0));
  const walletBalance = Math.max(0, Math.trunc(Number(fcoinBalance || 0)));

  return (
    <div className="bg-card border border-border rounded p-4 space-y-3 animate-in fade-in">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="font-pixel text-[10px] text-muted-foreground text-center md:text-left uppercase">Estadísticas</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAchievements(true)}
          className="h-8 gap-1.5 border-neon-yellow/30 bg-neon-yellow/10 text-[10px] text-neon-yellow hover:bg-neon-yellow/15 hover:text-neon-yellow"
        >
          <Medal className="h-3.5 w-3.5" /> Ver Logros
        </Button>
      </div>

      {showAchievements && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[430] flex items-center justify-center p-3 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAchievements(false)} />
          <div className="relative max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-lg border-2 border-neon-yellow/35 bg-[#101018] p-3 shadow-[0_18px_70px_rgba(0,0,0,0.75)] retro-scrollbar sm:p-4">
            <button
              onClick={() => setShowAchievements(false)}
              className="sticky top-0 float-right z-10 rounded border border-border bg-black/50 p-1.5 text-muted-foreground hover:text-white"
              aria-label="Cerrar logros"
            >
              <X className="h-4 w-4" />
            </button>
            <AchievementsTab totalScore={profile?.total_score || 0} />
          </div>
        </div>,
        document.body
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { val: profile?.total_score?.toLocaleString() || 0, label: "STAT", color: statColors.points || "#39ff14" },
          { val: walletBalance.toLocaleString("es-CL"), label: "F-coin", color: "#f7d28b", icon: Gem },
          { val: followerCount, label: "Seguidores", color: statColors.followers || "#ffffff" },
          { val: followingCount, label: "Siguiendo", color: statColors.following || "#ffffff" },
          { val: userPosts.length, label: "Posts Foro", color: statColors.forum || "#00ffff" },
          { val: socialContentCount, label: "Posts Social", color: statColors.social || "#ffff00" },
          { val: bestScores.length, label: "Juegos", color: statColors.games || "#ff8c00" },
          { val: `${bingoNet >= 0 ? "+" : ""}${bingoNet.toLocaleString("es-CL")}`, label: "Bingo F-coin", color: bingoNet >= 0 ? "#39ff14" : "#fb7185" },
          { val: displayTier, label: "Membresía", color: isStaff ? "#39ff14" : "#a1a1aa", isStaffTier: isStaff },
        ].map((s, i) => (
          <div key={i} className="bg-muted/30 rounded p-3 text-center flex flex-col justify-center min-h-[70px]">
            <p className={cn("flex items-center justify-center gap-1 text-lg font-bold font-body", s.isStaffTier && "animate-pulse")} style={{ color: s.color, filter: s.isStaffTier ? `drop-shadow(0 0 8px ${s.color}cc)` : undefined }}>
              {s.icon && <s.icon className="h-4 w-4" />}
              {s.val}
            </p>
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
