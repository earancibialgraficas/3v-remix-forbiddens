import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, UserPlus, Flag, Shield, Ban, Eye, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import RoleBadge from "@/components/RoleBadge";
import ReportModal from "@/components/ReportModal";
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

const ROLE_OPTIONS = ["user", "moderator", "admin", "master_web"] as const;

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
  const [showReport, setShowReport] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banDays, setBanDays] = useState<string>("0");
  const [savingBan, setSavingBan] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { user, profile: currentUserProfile, roles: currentUserRoles, isAdmin, isMasterWeb } = useAuth();
  const { friendIds } = useFriendIds(user?.id);

  const isStaff = roles.includes("master_web") || roles.includes("admin") || roles.includes("moderator");

  const isCurrentUserStaff = isMasterWeb || isAdmin || (currentUserRoles || []).includes("moderator");
  const currentUserTier = (currentUserProfile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const currentUserLimits = isCurrentUserStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[currentUserTier];
  const reachedFriendLimit = !isCurrentUserStaff && friendIds.length >= currentUserLimits.maxFriends;

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupW = popupRef.current?.offsetWidth || 240;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupW - 8));
    const top = rect.bottom + 4;
    setPopupPos({ top, left });
  };

  const handleToggle = () => { updatePos(); setOpen(!open); };

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onMove = () => updatePos();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("mousedown", handler);
    };
  }, [open]);

  // Cargar roles actuales al abrir el modal de gestión
  const openRolesModal = async () => {
    setOpen(false);
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setTargetRoles((data || []).map((r: any) => r.role));
    setShowRolesModal(true);
  };

  const handleBan = async () => {
    if (!user) return;
    if (!banReason.trim()) { toast({ title: "Indica un motivo", variant: "destructive" }); return; }
    setSavingBan(true);
    const expires_at = banDays && banDays !== "0" ? new Date(Date.now() + parseInt(banDays) * 86400000).toISOString() : null;
    const { error } = await supabase.from("banned_users").insert({
      user_id: userId, banned_by: user.id, ban_type: expires_at ? "temp" : "ban",
      reason: banReason.trim(), expires_at,
    } as any);
    setSavingBan(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Usuario ${expires_at ? "suspendido" : "baneado"}` });
    setShowBanModal(false); setBanReason(""); setBanDays("0");
  };

  const toggleRole = (role: string) => {
    setTargetRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const handleSaveRoles = async () => {
    if (!user) return;
    setSavingRoles(true);
    // Borra todos los roles existentes y reinserta los seleccionados
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (delErr) { setSavingRoles(false); toast({ title: "Error", description: delErr.message, variant: "destructive" }); return; }
    const finalRoles = targetRoles.length > 0 ? targetRoles : ["user"];
    const inserts = finalRoles.map(role => ({ user_id: userId, role: role as any }));
    const { error: insErr } = await supabase.from("user_roles").insert(inserts as any);
    setSavingRoles(false);
    if (insErr) { toast({ title: "Error", description: insErr.message, variant: "destructive" }); return; }
    toast({ title: "Roles actualizados" });
    setShowRolesModal(false);
  };

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
          className="fixed z-[600] bg-card border border-border rounded-lg shadow-xl p-3 w-[min(260px,calc(100vw-16px))] max-w-[260px] animate-scale-in"
          style={{ top: popupPos.top, left: popupPos.left }}
        >
          <div className="flex items-start gap-2 mb-2 pb-2 border-b border-border">
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0" style={getAvatarBorderStyle(colorAvatarBorder)}>
              {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-body font-semibold text-foreground break-words leading-tight" style={getNameStyle(colorName)}>{displayName}</p>
              <div className="flex flex-wrap items-center gap-1 mt-1">
                {isStaff ? (
                  <RoleBadge roles={roles} roleIcon={roleIcon} showIcon={showRoleIcon} colorStaffRole={colorStaffRole} />
                ) : (
                  <span className="text-[9px] text-neon-yellow font-pixel break-all" style={getRoleStyle(colorRole)}>{membershipTier.toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>

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
                       else toast({ title: "Error", description: error.message, variant: "destructive" });
                    }
                  }}
                  disabled={reachedFriendLimit}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-body transition-colors", reachedFriendLimit ? "text-muted-foreground opacity-50 cursor-not-allowed" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
                >
                  <UserPlus className="w-3 h-3" /> {reachedFriendLimit ? "Límite de amigos" : "Agregar amigo"}
                </button>

                <button
                  onClick={() => { setOpen(false); setShowReport(true); }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-body text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Flag className="w-3 h-3" /> Reportar perfil
                </button>
              </>
            )}

            {isCurrentUserStaff && user?.id !== userId && (
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
                {(isAdmin || isMasterWeb || (currentUserRoles || []).includes("moderator")) && (
                  <button
                    onClick={() => { setOpen(false); setShowBanModal(true); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-body text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Ban className="w-3 h-3" /> Banear usuario
                  </button>
                )}
                {(isMasterWeb || isAdmin) && (
                  <button
                    onClick={openRolesModal}
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

      {showReport && (
        <ReportModal
          reportedUserId={userId}
          reportedUserName={displayName}
          contentLabel="Perfil"
          onClose={() => setShowReport(false)}
        />
      )}

      {showBanModal && createPortal(
        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBanModal(false)}>
          <div className="bg-card border border-destructive/40 rounded-lg p-5 w-full max-w-sm shadow-[0_0_30px_rgba(255,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-pixel text-[11px] text-destructive">BANEAR A {displayName.toUpperCase()}</h3>
              <button onClick={() => setShowBanModal(false)} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <label className="text-[10px] font-pixel text-muted-foreground block mb-1">Motivo</label>
            <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} className="w-full bg-muted/50 border border-border rounded p-2 text-xs font-body min-h-[70px] mb-3" placeholder="Razón del baneo..." />
            <label className="text-[10px] font-pixel text-muted-foreground block mb-1">Duración (días, 0 = permanente)</label>
            <input type="number" min="0" value={banDays} onChange={(e) => setBanDays(e.target.value)} className="w-full bg-muted/50 border border-border rounded p-2 text-xs font-body mb-4" />
            <div className="flex gap-2">
              <button onClick={handleBan} disabled={savingBan} className="flex-1 bg-destructive text-white text-xs font-pixel py-2 rounded hover:bg-destructive/80 disabled:opacity-50">
                {savingBan ? "Baneando..." : "Confirmar"}
              </button>
              <button onClick={() => setShowBanModal(false)} className="flex-1 border border-border text-xs font-pixel py-2 rounded hover:bg-muted/30">Cancelar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showRolesModal && createPortal(
        <div className="fixed inset-0 z-[700] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRolesModal(false)}>
          <div className="bg-card border border-neon-green/40 rounded-lg p-5 w-full max-w-sm shadow-[0_0_30px_rgba(0,255,0,0.2)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-pixel text-[11px] text-neon-green">ROLES DE {displayName.toUpperCase()}</h3>
              <button onClick={() => setShowRolesModal(false)} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[10px] font-body text-muted-foreground mb-3">Marca los roles a asignar. Si quitas todos, se asignará "user" automáticamente.</p>
            <div className="space-y-1 mb-4">
              {ROLE_OPTIONS.map(r => {
                const disabled = r === "master_web" && !isMasterWeb;
                return (
                  <label key={r} className={cn("flex items-center gap-2 p-2 rounded border border-border cursor-pointer hover:bg-muted/30", disabled && "opacity-40 cursor-not-allowed")}>
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={targetRoles.includes(r)}
                      onChange={() => !disabled && toggleRole(r)}
                    />
                    <span className="text-xs font-body capitalize">{r.replace("_", " ")}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveRoles} disabled={savingRoles} className="flex-1 bg-neon-green text-black text-xs font-pixel py-2 rounded hover:bg-neon-green/80 disabled:opacity-50">
                {savingRoles ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={() => setShowRolesModal(false)} className="flex-1 border border-border text-xs font-pixel py-2 rounded hover:bg-muted/30">Cancelar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
