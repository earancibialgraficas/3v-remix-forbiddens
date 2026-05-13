import { useState } from "react";
import { Zap, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  totalScore: number;
  isStaff: boolean;
  membershipTier: string;
  membershipExpiresAt?: string | null;
  onClaimed?: () => void;
}

const TARGET = 100000;

function formatRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expirada";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h restantes`;
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m restantes`;
}

export default function EnergyBar({ totalScore, isStaff, membershipTier, membershipExpiresAt, onClaimed }: Props) {
  const { toast } = useToast();
  const [claiming, setClaiming] = useState(false);
  const tier = (membershipTier || "novato").toLowerCase();
  const score = Math.max(0, totalScore || 0);
  const pct = Math.min(100, (score / TARGET) * 100);
  const canClaim = !isStaff && tier === "novato" && score >= TARGET;

  const handleClaim = async () => {
    if (!canClaim || claiming) return;
    if (!confirm("¿Canjear 100.000 puntos por la membresía Lite (30 días)?")) return;
    setClaiming(true);
    const { error } = await supabase.rpc("claim_lite_membership" as any);
    setClaiming(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "¡Membresía Lite activada!", description: "Disfruta tus 30 días de Lite." });
    onClaimed?.();
  };

  return (
    <div className="bg-card border border-neon-green/30 rounded p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[10px] font-pixel text-neon-green uppercase">
          <Zap className="w-3 h-3" /> Energía Arcade
        </div>
        <div className="text-[10px] font-body text-muted-foreground">
          {score.toLocaleString()} / {TARGET.toLocaleString()} pts
        </div>
      </div>
      <div className="relative h-3 w-full bg-muted/40 border border-border rounded-sm overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #39ff14, #00ffff, #ff00ff)",
            boxShadow: "0 0 10px rgba(57,255,20,0.6)",
          }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 9px, rgba(0,0,0,0.3) 9px 10px)" }} />
      </div>

      {canClaim && (
        <Button onClick={handleClaim} disabled={claiming} size="sm" className="w-full text-[11px] gap-1 bg-gradient-to-r from-neon-green to-neon-cyan text-black hover:opacity-90">
          <Sparkles className="w-3 h-3" /> {claiming ? "Canjeando..." : "Canjear membresía Lite (30 días)"}
        </Button>
      )}

      {!isStaff && membershipExpiresAt && tier !== "novato" && (
        <div className="flex items-center gap-1.5 text-[10px] font-body text-neon-yellow">
          <Clock className="w-3 h-3" /> {formatRemaining(membershipExpiresAt)}
        </div>
      )}
    </div>
  );
}
