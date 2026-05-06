import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, UserPlus, Flag, Shield, Ban, Eye, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import RoleBadge from "@/components/RoleBadge";
import { getAvatarBorderStyle, getNameStyle, getRoleStyle } from "@/lib/profileAppearance";
import { useFriendIds } from "@/hooks/useFriendIds";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface UserPopupProps {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  roles?: string[];
  roleIcon?: string | null;
  showRoleIcon?: boolean;
  membershipTier?: string;
  children?: React.ReactNode;
  className?: string;
  colorAvatarBorder?: string | null;
  colorName?: string | null;
  colorRole?: string | null;
  colorStaffRole?: string | null;
}

export default function UserPopup({
  userId,
  displayName,
  avatarUrl,
  roles = [],
  roleIcon,
  showRoleIcon = true,
  membershipTier = "novato",
  children,
  className,
  colorAvatarBorder,
  colorName,
  colorRole,
  colorStaffRole,
}: UserPopupProps) {
  const [open, setOpen] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // 🔥 Extraemos los datos del usuario actual para el límite de amigos 🔥
  const { user, profile: currentUserProfile, roles: currentUserRoles, isAdmin, isMasterWeb } = useAuth();
  const { friendIds } = useFriendIds(user?.id);

  const isStaff = roles.includes("master_web") || roles.includes("admin") || roles.includes("moderator");

  // 🔥 Lógica de límites 🔥
  const isCurrentUserStaff = isMasterWeb || isAdmin || (currentUserRoles || []).includes("moderator");
  const currentUserTier = (currentUserProfile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const currentUserLimits = isCurrentUserStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[currentUserTier];
  const reachedFriendLimit = !isCurrentUserStaff && friendIds.length >= currentUserLimits.maxFriends;

  const handleToggle = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPopupPos({
      top: rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - 220),
    });
    setOpen(!open);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={cn("inline-flex items-center gap-1 hover:underline cursor-pointer", className)}
      >
        {children || (
          <>
            {avatarUrl && (
              <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" style={getAvatarBorderStyle(colorAvatarBorder)} />
            )}
            <span className="text-xs font-body font-semibold hover:text-primary transition-colors" style={getNameStyle(colorName)}>
              {displayName}
            </span>
            {isStaff ? (
              <RoleBadge roles={roles} roleIcon={roleIcon} showIcon={showRoleIcon} colorStaffRole={colorStaffRole} />
            ) : membershipTier !== "novato" ? (
              <span className="text-[9px] font-pixel" style={getRoleStyle(colorRole)}>[{membershipTier.toUpperCase()}]</span>
            ) : null}
          </>
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[600] bg-card border border-border rounded-lg shadow-xl p-3 w-52 animate-scale-in"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0" style={getAvatarBorderStyle(colorAvatarBorder)}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-body font-semibold text-foreground truncate" style={getNameStyle(colorName)}>{displayName}</p>
              <div className="flex items-center gap-1">
                {isStaff ? (
                  <RoleBadge roles={roles} roleIcon={roleIcon} showIcon={showRoleIcon} colorStaffRole={colorStaffRole} />
                ) : (
                  <span className="text-[9px] text-neon-yellow font-pixel" style={getRoleStyle(colorRole)}>{membershipTier.toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-0.5">
            <button
              onClick={() => { setOpen(false); navigate(`/usuario/${userId}`); }}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-body text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <Eye className="w-3 h-3" /> Ver perfil
            </button>
            {user && user.id !== userId && (
              <>
                <button
                  onClick={() => { setOpen(false); navigate(`/mensajes?to=${userId}`); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-body text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <MessageSquare className="w-3 h-3" /> Enviar mensaje
                </button>
                
                {/* 🔥 BOTÓN FUNCIONAL AÑADIR AMIGO CON BLOQUEO POR LÍMITE 🔥 */}
                <button
                  onClick={async () => { 
                    if (reachedFriendLimit) {
                       toast({ title: "Límite de Membresía", description: `Has alcanzado el límite de ${currentUserLimits.maxFriends} amigos.`, variant: "destructive" });
                       return;
                    }
                    setOpen(false); 
                    if (user && userId) {
                       const { error } = await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: userId } as any);
                       if (!error) toast({ title: "Solicitud enviada" });
                       else if (error.code === '23505') toast({ title: "Aviso", description: "Ya existe una solicitud o amistad." });
                    }
                  }}
                  disabled={reachedFriendLimit}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-body transition-colors", reachedFriendLimit ? "text-muted-foreground opacity-50 cursor-not-allowed" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
                >
                  <UserPlus className="w-3 h-3" /> {reachedFriendLimit ? "Límite de amigos" : "Agregar amigo"}
                </button>

                <button
                  onClick={() => { setOpen(false); /* TODO: report */ }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-body text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Flag className="w-3 h-3" /> Reportar perfil
                </button>
              </>
            )}

            {/* Staff controls */}
            {(isAdmin || isMasterWeb) && user?.id !== userId && (
              <>
                <div className="border-t border-border mt-1 pt-1">
                  <p className="text-[8px] font-pixel text-neon-magenta mb-1 px-2">MODERACIÓN</p>
                </div>
                <button
                  onClick={() => { setOpen(false); navigate(`/usuario/${userId}`); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-body text-neon-cyan hover:bg-neon-cyan/10 transition-colors"
                >
                  <Eye className="w-3 h-3" /> Ver perfil completo
                </button>
                <button
                  onClick={() => { setOpen(false); /* TODO: ban from profile */ }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-body text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Ban className="w-3 h-3" /> Banear usuario
                </button>
                {isMasterWeb && (
                  <button
                    onClick={() => { setOpen(false); /* TODO: assign role */ }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-body text-neon-green hover:bg-neon-green/10 transition-colors"
                  >
                    <Shield className="w-3 h-3" /> Gestionar roles
                  </button>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}