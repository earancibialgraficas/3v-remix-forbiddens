import { cn } from "@/lib/utils";
import { Image as ImageIcon, MessageSquare, Users, Sparkles, HardDrive, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { MembershipLimits } from "@/lib/membershipLimits";

interface UsageRow {
  label: string;
  icon: LucideIcon;
  current: number;
  max: number;
  unit?: string;
  /** Color token (cyan, green, yellow, magenta) */
  tone?: "cyan" | "green" | "yellow" | "magenta";
}

interface UsageIndicatorsProps {
  limits: MembershipLimits;
  isStaff: boolean;
  usage: {
    photos?: number;
    socialContent?: number;
    friends?: number;
    storageMB?: number;
  };
  className?: string;
  showUpgradeCta?: boolean;
}

const TONE_CLASSES: Record<NonNullable<UsageRow["tone"]>, { bar: string; text: string }> = {
  cyan: { bar: "bg-neon-cyan", text: "text-neon-cyan" },
  green: { bar: "bg-neon-green", text: "text-neon-green" },
  yellow: { bar: "bg-neon-yellow", text: "text-neon-yellow" },
  magenta: { bar: "bg-neon-magenta", text: "text-neon-magenta" },
};

function ProgressRow({ row }: { row: UsageRow }) {
  const Icon = row.icon;
  const tone = row.tone || "cyan";
  const colors = TONE_CLASSES[tone];
  const pct = row.max > 0 ? Math.min(100, Math.round((row.current / row.max) * 100)) : 0;
  const isFull = pct >= 100;
  const isNear = pct >= 80 && !isFull;
  const barColor = isFull ? "bg-destructive" : isNear ? "bg-neon-yellow" : colors.bar;
  const labelColor = isFull ? "text-destructive" : isNear ? "text-neon-yellow" : colors.text;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-body">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="w-3 h-3" />
          {row.label}
        </span>
        <span className={cn("font-pixel text-[9px]", labelColor)}>
          {row.current}{row.unit || ""}/{row.max >= 999 ? "∞" : `${row.max}${row.unit || ""}`}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function UsageIndicators({
  limits,
  isStaff,
  usage,
  className,
  showUpgradeCta = true,
}: UsageIndicatorsProps) {
  if (isStaff) {
    return (
      <div className={cn("bg-card/60 border border-neon-magenta/30 rounded p-3", className)}>
        <p className="text-[10px] font-pixel text-neon-magenta text-center">
          ⚡ ACCESO STAFF · LÍMITES DESBLOQUEADOS ⚡
        </p>
      </div>
    );
  }

  const rows: UsageRow[] = [
    { label: "Fotos", icon: ImageIcon, current: usage.photos ?? 0, max: limits.maxPhotos, tone: "cyan" },
    { label: "Posts sociales", icon: Sparkles, current: usage.socialContent ?? 0, max: limits.maxSocialContent, tone: "magenta" },
    { label: "Amigos", icon: Users, current: usage.friends ?? 0, max: limits.maxFriends, tone: "green" },
    { label: "Almacenamiento", icon: HardDrive, current: Math.round(usage.storageMB ?? 0), max: limits.storageMB, unit: " MB", tone: "yellow" },
  ];

  const anyFull = rows.some(r => r.max > 0 && r.current >= r.max);

  return (
    <div className={cn("bg-card/60 border border-border rounded p-3 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-pixel text-[10px] text-neon-cyan uppercase">Uso de Membresía</h4>
        {showUpgradeCta && (
          <Link
            to="/membresias"
            className={cn(
              "text-[9px] font-pixel px-2 py-0.5 rounded border transition-colors",
              anyFull
                ? "bg-destructive/15 text-destructive border-destructive/40 hover:bg-destructive/25 animate-pulse"
                : "bg-neon-yellow/10 text-neon-yellow border-neon-yellow/30 hover:bg-neon-yellow/20"
            )}
          >
            {anyFull ? "¡Subir Plan!" : "Mejorar"}
          </Link>
        )}
      </div>
      <div className="space-y-2.5">
        {rows.map(r => <ProgressRow key={r.label} row={r} />)}
      </div>
      <div className="pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-[9px] font-body text-muted-foreground">
        <div className="flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          Foro: <span className="text-foreground">{limits.maxForumChars}</span> chars
        </div>
        <div className="flex items-center gap-1">
          <Mail className="w-3 h-3" />
          DM: <span className="text-foreground">{limits.maxDmChars}</span> chars
        </div>
      </div>
    </div>
  );
}
