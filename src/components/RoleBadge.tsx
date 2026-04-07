import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  roles: string[];
  roleIcon?: string | null;
  showIcon?: boolean;
  className?: string;
}

export default function RoleBadge({ roles, roleIcon, showIcon = true, className }: RoleBadgeProps) {
  const isMasterWeb = roles.includes("master_web");
  const isAdmin = roles.includes("admin");
  const isMod = roles.includes("moderator");

  if (!isMasterWeb && !isAdmin && !isMod) return null;

  const label = isMasterWeb ? "WebMaster" : isAdmin ? "Admin" : "MOD";
  const colorClass = isMasterWeb
    ? "bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30"
    : isAdmin
    ? "bg-neon-yellow/15 text-neon-yellow border-neon-yellow/30"
    : "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30";

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[8px] font-pixel px-1.5 py-0.5 rounded border", colorClass, className)}>
      {showIcon && roleIcon && !isMod && <span className="text-[10px]">{roleIcon}</span>}
      {label}
    </span>
  );
}
