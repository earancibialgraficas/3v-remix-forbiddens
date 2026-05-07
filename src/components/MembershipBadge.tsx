import { cn } from "@/lib/utils";
import { Sparkles, Star, Gem, Crown, Trophy, Flame, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MembershipBadgeProps {
  tier?: string | null;
  size?: "xs" | "sm" | "md";
  className?: string;
  showLabel?: boolean;
  colorRole?: string | null;
}

interface TierMeta {
  label: string;
  icon: LucideIcon;
  /** Tailwind classes: bg + text + border */
  classes: string;
  /** Glow shadow color (rgba) */
  glow?: string;
}

const TIER_META: Record<string, TierMeta> = {
  novato: {
    label: "NOVATO",
    icon: Sparkles,
    classes: "bg-muted/40 text-muted-foreground border-muted-foreground/30",
  },
  lite: {
    label: "LITE",
    icon: Zap,
    classes: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40",
    glow: "0 0 6px hsl(var(--neon-cyan) / 0.5)",
  },
  entusiasta: {
    label: "ENTUSIASTA",
    icon: Star,
    classes: "bg-neon-yellow/15 text-neon-yellow border-neon-yellow/40",
    glow: "0 0 6px hsl(var(--neon-yellow) / 0.5)",
  },
  coleccionista: {
    label: "COLECCIONISTA",
    icon: Gem,
    classes: "bg-neon-green/15 text-neon-green border-neon-green/40",
    glow: "0 0 6px hsl(var(--neon-green) / 0.5)",
  },
  "miembro del legado": {
    label: "MIEMBRO DEL LEGADO",
    icon: Trophy,
    classes: "bg-neon-magenta/15 text-neon-magenta border-neon-magenta/40",
    glow: "0 0 8px hsl(var(--neon-magenta) / 0.6)",
  },
  "leyenda arcade": {
    label: "LEYENDA ARCADE",
    icon: Crown,
    classes: "bg-gradient-to-r from-neon-yellow/20 to-neon-magenta/20 text-neon-yellow border-neon-yellow/50",
    glow: "0 0 10px hsl(var(--neon-yellow) / 0.7)",
  },
  "creador de contenido": {
    label: "CREADOR",
    icon: Flame,
    classes: "bg-gradient-to-r from-neon-magenta/20 to-neon-cyan/20 text-neon-magenta border-neon-magenta/50",
    glow: "0 0 10px hsl(var(--neon-magenta) / 0.7)",
  },
};

const SIZE_CLASSES = {
  xs: "text-[8px] px-1 py-0.5 gap-0.5",
  sm: "text-[9px] px-1.5 py-0.5 gap-1",
  md: "text-[10px] px-2 py-1 gap-1",
};

const ICON_SIZES = {
  xs: "w-2.5 h-2.5",
  sm: "w-3 h-3",
  md: "w-3.5 h-3.5",
};

export default function MembershipBadge({
  tier,
  size = "sm",
  className,
  showLabel = true,
  colorRole,
}: MembershipBadgeProps) {
  if (!tier) return null;
  const key = String(tier).toLowerCase();
  const meta = TIER_META[key] || TIER_META.novato;
  const Icon = meta.icon;

  // Hide nothing — even novato can show as a subtle badge if asked
  return (
    <span
      className={cn(
        "inline-flex items-center font-pixel rounded border whitespace-nowrap",
        meta.classes,
        SIZE_CLASSES[size],
        className
      )}
      style={{
        ...(meta.glow ? { boxShadow: meta.glow } : {}),
        ...(colorRole ? { color: colorRole, borderColor: `${colorRole}66` } : {}),
      }}
      title={meta.label}
    >
      <Icon className={ICON_SIZES[size]} />
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}
