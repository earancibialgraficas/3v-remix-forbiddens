import { cn } from "@/lib/utils";
import { getStaffRoleStyle } from "@/lib/profileAppearance";

export interface RoleBadgeProps {
  roles: string[];
  roleIcon?: string | null;
  showIcon?: boolean;
  className?: string;
  colorStaffRole?: string | null;
}

export default function RoleBadge({ roles, roleIcon, showIcon = true, className, colorStaffRole }: RoleBadgeProps) {
  const isMasterWeb = roles.includes("master_web");
  const isAdmin = roles.includes("admin");
  const isMod = roles.includes("moderator");
  const isStaff = isMasterWeb || isAdmin || isMod;

  if (!isStaff) return null;

  // STAFF label always takes priority
  const specificLabel = isMasterWeb ? "WebMaster" : isAdmin ? "Admin" : "MOD";
  const colorClass = isMasterWeb
    ? "bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30"
    : isAdmin
    ? "bg-neon-yellow/15 text-neon-yellow border-neon-yellow/30"
    : "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30";

  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cn("inline-flex items-center gap-0.5 text-[8px] font-pixel px-1.5 py-0.5 rounded border bg-destructive/15 text-destructive border-destructive/30")}
      >
        STAFF
      </span>
      <span
        className={cn("inline-flex items-center gap-0.5 text-[8px] font-pixel px-1.5 py-0.5 rounded border", colorClass, className)}
        style={getStaffRoleStyle(colorStaffRole)}
      >
        {showIcon && roleIcon && !isMod && <span className="text-[10px]">{roleIcon}</span>}
        {specificLabel}
      </span>
    </span>
  );
}
