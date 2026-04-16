import { cn } from "@/lib/utils";
import { getStaffRoleStyle } from "@/lib/profileAppearance";

export interface RoleBadgeProps {
  roles: string[];
  membershipTier?: string;
  roleIcon?: string | null;
  showIcon?: boolean;
  className?: string;
  colorStaffRole?: string | null;
  colorRole?: string | null;
}

export default function RoleBadge({ roles, membershipTier, roleIcon, showIcon = true, className, colorStaffRole, colorRole }: RoleBadgeProps) {
  const isMasterWeb = roles.includes("master_web");
  const isAdmin = roles.includes("admin");
  const isMod = roles.includes("moderator");
  const isStaff = isMasterWeb || isAdmin || isMod;

  if (!isStaff && !membershipTier) return null;

  // Staff always shows STAFF + specific role
  if (isStaff) {
    const specificLabel = isMasterWeb ? "WebMaster" : isAdmin ? "Admin" : "MOD";
    const colorClass = isMasterWeb
      ? "bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30"
      : isAdmin
      ? "bg-neon-yellow/15 text-neon-yellow border-neon-yellow/30"
      : "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30";

    return (
      <span className="inline-flex items-center gap-1">
        <span className="inline-flex items-center gap-0.5 text-[8px] font-pixel px-1.5 py-0.5 rounded border bg-destructive/15 text-destructive border-destructive/30">
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

  // Non-staff: show membership tier if not novato
  if (membershipTier && membershipTier !== "novato") {
    return (
      <span
        className={cn("inline-flex items-center text-[8px] font-pixel px-1.5 py-0.5 rounded border bg-neon-yellow/15 text-neon-yellow border-neon-yellow/30", className)}
        style={colorRole ? { color: colorRole, borderColor: `${colorRole}50` } : undefined}
      >
        {membershipTier.toUpperCase()}
      </span>
    );
  }

  return null;
}
