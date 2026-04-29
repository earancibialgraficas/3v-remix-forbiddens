import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Ban, Unlock, Shield, Search, UserCheck, Image as ImageIcon, Users, X, AlertTriangle, Trash2 } from "lucide-react";

export default function ModerationPanel({ isStaff, isMasterWeb, isAdmin }: any) {
  const { toast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<"gestion" | "banned_content" | "mods" | "admins">("gestion");

  // Estados de Búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Estados de Datos
  const [banReason, setBanReason] = useState("");
  const [selectedTier, setSelectedTier] = useState("novato");
  const [bannedContent, setBannedContent] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<{ mods: any[], admins: any[] }>({ mods: [], admins: [] });

  // 🔥 ESTADO DEL MODAL DE CONFIRMACIÓN 🔥
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    detail?: string;
    btnText: string;
    variant: "destructive" | "default" | "outline";
    action: () => void;
  } | null>(null);

  useEffect(() => {
    if (confirmAction) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [confirmAction]);

  // Permisos derivados
  const canManageMods = isMasterWeb || isAdmin;
  const canManageAdmins = isMasterWeb;

  // --- BUSCADOR ---
  const handleSearchUser = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
      const { data, error } = await supabase.rpc("get_user_by_identifier", { search_text: searchTerm.trim() });
      if (error) throw error;
      if (data && data.length > 0) {
        const u = data[0];
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user_id);
        const targetRoles = roles?.map(r => r.role) || [];
        const isTargetStaff = targetRoles.some(r => ['master_web', 'admin', 'moderator'].includes(r));
        const isTargetAdmin = targetRoles.includes('admin');
        const isTargetMod = targetRoles.includes('moderator');
        
        setFoundUser({ ...u, isStaff: isTargetStaff, isTargetAdmin, isTargetMod });
        setSelectedTier(u.membership_tier || "novato");
      } else {
        toast({ title: "No encontrado", description: "Usuario o correo no hallado.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: "Asegúrate de haber ejecutado el SQL en Supabase.", variant: "destructive" });
    } finally { setIsSearching(false); }
  };

  // --- CARGA DE DATOS ---
  const loadModerationData = async () => {
    if (activeSubTab === "banned_content") {
      const { data: ph } = await supabase.from("photos").select("*").eq("is_banned", true);
      const { data: sc } = await supabase.from("social_content").select("*").eq("is_banned", true);
      setBannedContent([
        ...(ph || []).map(x => ({ ...x, type: 'Foto' })),
        ...(sc || []).map(x => ({ ...x, type: 'Redes' }))
      ]);
    }
    if (activeSubTab === "mods" || activeSubTab === "admins") {
      const { data: r } = await supabase.from("user_roles").select("id, user_id, role");
      if (!r) return;
      const ids = r.map(x => x.user_id);
      const { data: p } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      setStaffList({
        mods: r.filter(x => x.role === 'moderator').map(x => ({ ...x, name: p?.find(z => z.user_id === x.user_id)?.display_name })),
        admins: r.filter(x => x.role === 'admin').map(x => ({ ...x, name: p?.find(z => z.user_id === x.user_id)?.display_name }))
      });
    }
  };

  useEffect(() => { loadModerationData(); }, [activeSubTab]);

  // --- ACCIONES WRAPPERS (Abren el modal) ---
  const openConfirm = (title: string, message: string, btnText: string, action: () => void, variant: any = "default", detail?: string) => {
    setConfirmAction({ title, message, btnText, action, variant, detail });
  };

  const handleUpdateMembership = async () => {
    const { error } = await supabase.from("profiles").update({ membership_tier: selectedTier } as any).eq("user_id", foundUser.user_id);
    if (!error) { toast({ title: "Membresía actualizada" }); handleSearchUser(); }
    setConfirmAction(null);
  };

  const handleBan = async () => {
    const { error } = await supabase.from("banned_users").insert({ id: crypto.randomUUID(), user_id: foundUser.user_id, reason: banReason, ban_type: 'ban' } as any);
    if (!error) { toast({ title: "Usuario baneado" }); setFoundUser(null); }
    setConfirmAction(null);
  };

  const handleAssignRole = async (role: "moderator" | "admin") => {
    const { error } = await supabase.from("user_roles").insert({ id: crypto.randomUUID(), user_id: foundUser.user_id, role } as any);
    if (!error) { toast({ title: `Rol de ${role} asignado` }); handleSearchUser(); }
    setConfirmAction(null);
  };

  const handleRevokeRole = async (roleId: string, name: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (!error) { toast({ title: `Rol revocado a ${name}` }); loadModerationData(); }
    setConfirmAction(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      
      {/* MENÚ DE SUB-PESTAÑAS */}
      <div className="flex gap-1 bg-muted/20 p-1 rounded border border-white/5 overflow-x-auto custom-scrollbar">
        <button onClick={() => setActiveSubTab("gestion")} className={cn("px-3 py-1.5 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "gestion" ? "bg-neon-cyan text-black" : "text-muted-foreground hover:text-white")}><Search className="w-3 h-3" /> GESTIÓN</button>
        <button onClick={() => setActiveSubTab("banned_content")} className={cn("px-3 py-1.5 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "banned_content" ? "bg-destructive text-white" : "text-muted-foreground hover:text-white")}><ImageIcon className="w-3 h-3" /> BANEADOS</button>
        
        {/* Mods: Visible para Master y Admin */}
        {(isMasterWeb || isAdmin) && (
          <button onClick={() => setActiveSubTab("mods")} className={cn("px-3 py-1.5 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "mods" ? "bg-neon-magenta text-white" : "text-muted-foreground hover:text-white")}><Users className="w-3 h-3" /> MODS</button>
        )}

        {/* Admins: Solo para Master Web */}
        {isMasterWeb && (
          <button onClick={() => setActiveSubTab("admins")} className={cn("px-3 py-1.5 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "admins" ? "bg-white text-black" : "text-muted-foreground hover:text-white")}><Shield className="w-3 h-3" /> ADMINS</button>
        )}
      </div>

      {/* --- PESTAÑA: GESTIÓN --- */}
      {activeSubTab === "gestion" && (
        <div className="space-y-4">
          <div className="bg-card border border-neon-cyan/30 rounded-lg p-4">
            <h3 className="font-pixel text-[10px] text-neon-cyan uppercase mb-3">Buscador Inteligente</h3>
            <div className="flex gap-2">
              <Input placeholder="Nombre o Correo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchUser()} className="h-8 bg-muted text-xs" />
              <Button onClick={handleSearchUser} disabled={isSearching} className="h-8 bg-neon-cyan text-black text-[9px] font-pixel px-4">{isSearching ? "..." : "BUSCAR"}</Button>
            </div>

            {foundUser && (
              <div className="mt-4 bg-black/40 border border-white/5 rounded-lg p-4 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
                   <div>
                     <p className="text-sm font-bold font-body text-foreground">{foundUser.display_name}</p>
                     <p className="text-[10px] font-pixel text-neon-yellow uppercase mt-1">
                       Actual: <span className={foundUser.isStaff ? "text-neon-magenta" : ""}>{foundUser.isStaff ? "STAFF" : foundUser.membership_tier}</span>
                     </p>
                   </div>
                   <UserCheck className="w-5 h-5 text-neon-green" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <p className="text-[8px] font-pixel text-destructive uppercase">Sancionar</p>
                      <Input placeholder="Razón del baneo..." value={banReason} onChange={e => setBanReason(e.target.value)} className="h-7 text-[10px] bg-muted" />
                      <Button variant="destructive" className="w-full h-7 text-[9px] font-pixel" onClick={() => openConfirm("BANEAR USUARIO", `¿Seguro que deseas banear a ${foundUser.display_name}?`, "SÍ, BANEAR", handleBan, "destructive", `Razón: ${banReason || 'No especificada'}`)}>EJECUTAR BANEO</Button>
                   </div>

                   <div className="space-y-2">
                      <p className="text-[8px] font-pixel text-neon-yellow uppercase">Membresía</p>
                      {foundUser.isStaff ? (
                        <p className="text-[9px] text-muted-foreground italic text-center py-2">No se puede cambiar el plan a un Staff.</p>
                      ) : (
                        <>
                          <select value={selectedTier} onChange={e => setSelectedTier(e.target.value)} className="w-full h-7 bg-muted border rounded text-[9px] uppercase">
                            {["novato", "entusiasta", "coleccionista", "leyenda arcade", "miembro del legado", "creador de contenido"].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <Button onClick={() => openConfirm("CAMBIAR MEMBRESÍA", `¿Actualizar el plan de ${foundUser.display_name} a ${selectedTier.toUpperCase()}?`, "CONFIRMAR", handleUpdateMembership, "default")} className="w-full h-7 bg-neon-yellow text-black text-[9px] font-pixel">GUARDAR PLAN</Button>
                        </>
                      )}
                   </div>
                </div>
                
                {/* Botones de Rol dinámicos */}
                <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                  {canManageMods && !foundUser.isTargetMod && !foundUser.isTargetAdmin && !isMasterWeb && (
                    <Button variant="outline" className="flex-1 h-7 text-[8px] font-pixel" onClick={() => openConfirm("ASIGNAR MODERADOR", `¿Promocionar a ${foundUser.display_name} a Moderador?`, "SÍ, ASIGNAR", () => handleAssignRole("moderator"))}>HACER MODERADOR</Button>
                  )}
                  {canManageAdmins && (
                    <>
                      {!foundUser.isTargetMod && <Button variant="outline" className="flex-1 h-7 text-[8px] font-pixel" onClick={() => openConfirm("ASIGNAR MODERADOR", `¿Promocionar a ${foundUser.display_name} a Moderador?`, "SÍ, ASIGNAR", () => handleAssignRole("moderator"))}>HACER MODERADOR</Button>}
                      {!foundUser.isTargetAdmin && <Button variant="outline" className="flex-1 h-7 text-[8px] font-pixel" onClick={() => openConfirm("ASIGNAR ADMIN", `¿Promocionar a ${foundUser.display_name} a Administrador?`, "SÍ, ASIGNAR", () => handleAssignRole("admin"))}>HACER ADMIN</Button>}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PESTAÑA: BANEADOS --- */}
      {activeSubTab === "banned_content" && (
        <div className="bg-card border border-destructive/30 rounded-lg p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-destructive uppercase">Contenido Bloqueado ({bannedContent.length})</h3>
          <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
            {bannedContent.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-4">Limpio. No hay contenido baneado.</p> : bannedContent.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-muted/20 p-2 rounded border border-white/5">
                <div className="w-12 h-12 bg-black rounded overflow-hidden border border-white/10 shrink-0">
                  <img src={item.image_url || item.thumbnail_url || item.content_url} className="w-full h-full object-cover opacity-50 grayscale" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold truncate">{item.caption || item.title || "Sin título"}</p>
                  <p className="text-[8px] text-muted-foreground uppercase">{item.type} • {new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openConfirm("RESTAURAR CONTENIDO", "¿Hacer este contenido público de nuevo?", "RESTAURAR", async () => { await supabase.from(item.type === 'Foto' ? 'photos' : 'social_content').update({ is_banned: false }).eq("id", item.id); loadModerationData(); setConfirmAction(null); }, "default")} className="text-[8px] font-pixel text-neon-green hover:underline">RESTAURAR</button>
                  <button onClick={() => openConfirm("BORRAR DEFINITIVAMENTE", "¿Eliminar este archivo para siempre de la base de datos?", "BORRAR", async () => { await supabase.from(item.type === 'Foto' ? 'photos' : 'social_content').delete().eq("id", item.id); loadModerationData(); setConfirmAction(null); }, "destructive")} className="text-[8px] font-pixel text-destructive hover:underline">BORRAR</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PESTAÑA: MODERADORES --- */}
      {activeSubTab === "mods" && (
        <div className="bg-card border border-neon-magenta/30 rounded-lg p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-neon-magenta uppercase">Moderadores Activos</h3>
          <div className="space-y-2">
            {staffList.mods.length === 0 ? <p className="text-[10px] text-center opacity-50 uppercase">No hay moderadores</p> : staffList.mods.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-muted/20 p-2 rounded text-xs">
                <span className="font-body text-white">{m.name || "..."}</span>
                {canManageMods && <button onClick={() => openConfirm("REVOCAR MODERADOR", `¿Quitarle los permisos de moderación a ${m.name}?`, "SÍ, REVOCAR", () => handleRevokeRole(m.id, m.name), "destructive")} className="text-destructive text-[9px] font-pixel hover:underline">REVOCAR ROL</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PESTAÑA: ADMINISTRADORES --- */}
      {activeSubTab === "admins" && isMasterWeb && (
        <div className="bg-card border border-white/30 rounded-lg p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-white uppercase">Administradores Activos</h3>
          <div className="space-y-2">
            {staffList.admins.length === 0 ? <p className="text-[10px] text-center opacity-50 uppercase">No hay administradores</p> : staffList.admins.map(a => (
              <div key={a.id} className="flex justify-between items-center bg-muted/20 p-2 rounded text-xs">
                <span className="font-body text-white">{a.name || "..."}</span>
                <button onClick={() => openConfirm("REVOCAR ADMINISTRADOR", `¿Quitarle el rango de Admin a ${a.name}?`, "SÍ, REVOCAR", () => handleRevokeRole(a.id, a.name), "destructive")} className="text-destructive text-[9px] font-pixel hover:underline">REVOCAR ROL</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔥 MODAL DE CONFIRMACIÓN CENTRALIZADO 🔥 */}
      {confirmAction && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmAction(null)}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-card border border-white/10 rounded-lg p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
              <div className={cn("p-2 rounded", confirmAction.variant === "destructive" ? "bg-destructive/10 text-destructive" : "bg-neon-cyan/10 text-neon-cyan")}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-pixel text-[11px] tracking-tighter uppercase">{confirmAction.title}</h3>
            </div>
            
            <div className="py-2 space-y-3">
               <p className="text-xs font-body text-foreground leading-relaxed">{confirmAction.message}</p>
               {confirmAction.detail && (
                 <p className="text-[10px] font-body text-muted-foreground bg-black/20 p-2 rounded italic border-l-2 border-white/10">{confirmAction.detail}</p>
               )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
               <Button variant="outline" onClick={() => setConfirmAction(null)} className="h-9 text-[10px] font-body">CANCELAR</Button>
               <Button variant={confirmAction.variant} onClick={confirmAction.action} className="h-9 text-[10px] font-pixel tracking-tighter">{confirmAction.btnText}</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}