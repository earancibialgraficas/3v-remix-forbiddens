import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Ban, Unlock, Shield, Search, UserCheck, Image as ImageIcon, Users, AlertTriangle, UserMinus } from "lucide-react";

export default function ModerationPanel({ isStaff, isMasterWeb, isAdmin }: any) {
  const { toast } = useToast();
  // Pestañas (BANEADOS = Usuarios, OCULTOS = Contenido)
  const [activeSubTab, setActiveSubTab] = useState<"gestion" | "baneados" | "ocultos" | "mods" | "admins">("gestion");

  // --- Estados de Búsqueda ---
  const [searchTerm, setSearchTerm] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // --- Estados de Datos ---
  const [banReason, setBanReason] = useState("");
  const [selectedTier, setSelectedTier] = useState("novato");
  const [bannedContent, setBannedContent] = useState<any[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<{ mods: any[], admins: any[] }>({ mods: [], admins: [] });

  // --- Modal de Confirmación ---
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    btnText: string;
    variant: "destructive" | "default" | "outline";
    action: () => void;
  } | null>(null);

  useEffect(() => {
    if (confirmAction) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [confirmAction]);

  const canManageMods = isMasterWeb || isAdmin;
  const canManageAdmins = isMasterWeb;

  // 🔥 BUSCADOR INTELIGENTE Y SEGURO 🔥
  const handleSearchUser = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setFoundUser(null);
    
    try {
      let u = null;
      const isEmail = searchTerm.includes("@");

      if (isEmail) {
        // Buscar por correo usando el nuevo RPC
        const { data, error } = await supabase.rpc("search_user_by_email", { email_query: searchTerm.trim().toLowerCase() });
        
        if (error) {
          console.error("Error SQL:", error);
          toast({ 
            title: "Falta Código SQL", 
            description: "Para buscar por correo debes ejecutar el nuevo código SQL en Supabase.", 
            variant: "destructive" 
          });
          setIsSearching(false);
          return;
        }
        if (data && data.length > 0) u = data[0];
      } else {
        // Buscar por nombre de usuario directamente en la tabla (siempre funciona)
        const { data } = await supabase
          .from("profiles")
          .select("user_id, display_name, membership_tier")
          .ilike("display_name", searchTerm.trim())
          .maybeSingle();

        if (data) u = data;
      }

      if (u) {
        // Comprobar roles
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user_id);
        const targetRoles = roles?.map(r => r.role) || [];
        setFoundUser({ 
          ...u, 
          isStaff: targetRoles.some(r => ['master_web', 'admin', 'moderator'].includes(r)),
          isTargetAdmin: targetRoles.includes('admin'),
          isTargetMod: targetRoles.includes('moderator')
        });
        setSelectedTier(u.membership_tier || "novato");
      } else {
        toast({ title: "No encontrado", description: isEmail ? "Ningún usuario registrado con ese correo." : "No existe ese nombre de usuario.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error en búsqueda", description: e.message || "Error desconocido", variant: "destructive" });
    } finally { 
      setIsSearching(false); 
    }
  };

  // --- CARGA DE DATOS PARA PESTAÑAS ---
  const loadModerationData = async () => {
    if (activeSubTab === "baneados") {
      const { data } = await supabase.from("banned_users").select("id, user_id, reason, ban_type, created_at");
      if (data && data.length > 0) {
        const ids = data.map(b => b.user_id);
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
        setBannedUsers(data.map(b => ({ ...b, display_name: profs?.find(p => p.user_id === b.user_id)?.display_name || "Desconocido" })));
      } else { setBannedUsers([]); }
    }

    if (activeSubTab === "ocultos") {
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

  const openConfirm = (title: string, message: string, btnText: string, action: () => void, variant: any = "default") => {
    setConfirmAction({ title, message, btnText, action, variant });
  };

  return (
    <div className="space-y-4 animate-in fade-in relative">
      
      {/* --- MENÚ DE PESTAÑAS --- */}
      <div className="flex gap-1 bg-muted/20 p-1 rounded border border-white/5 overflow-x-auto custom-scrollbar">
        <button onClick={() => setActiveSubTab("gestion")} className={cn("px-3 py-2 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "gestion" ? "bg-neon-cyan text-black" : "text-muted-foreground hover:text-white")}><Search className="w-3 h-3" /> GESTIÓN</button>
        <button onClick={() => setActiveSubTab("baneados")} className={cn("px-3 py-2 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "baneados" ? "bg-neon-orange text-black" : "text-muted-foreground hover:text-white")}><UserMinus className="w-3 h-3" /> BANEADOS</button>
        <button onClick={() => setActiveSubTab("ocultos")} className={cn("px-3 py-2 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "ocultos" ? "bg-destructive text-white" : "text-muted-foreground hover:text-white")}><ImageIcon className="w-3 h-3" /> OCULTOS</button>
        {(isMasterWeb || isAdmin) && (
          <button onClick={() => setActiveSubTab("mods")} className={cn("px-3 py-2 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "mods" ? "bg-neon-magenta text-white" : "text-muted-foreground hover:text-white")}><Users className="w-3 h-3" /> MODS</button>
        )}
        {isMasterWeb && (
          <button onClick={() => setActiveSubTab("admins")} className={cn("px-3 py-2 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "admins" ? "bg-white text-black" : "text-muted-foreground hover:text-white")}><Shield className="w-3 h-3" /> ADMINS</button>
        )}
      </div>

      {/* --- PESTAÑA 1: GESTIÓN (BUSCADOR) --- */}
      {activeSubTab === "gestion" && (
        <div className="bg-card border border-neon-cyan/30 rounded-lg p-4">
          <div className="flex gap-2 mb-4">
            <Input placeholder="Nombre o Correo del usuario..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchUser()} className="h-9 bg-muted text-xs font-body" />
            <Button onClick={handleSearchUser} disabled={isSearching} className="bg-neon-cyan text-black text-[9px] font-pixel px-6">{isSearching ? "..." : "BUSCAR"}</Button>
          </div>

          {foundUser && (
            <div className="bg-black/40 border border-white/5 rounded-lg p-4 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                 <div>
                   <p className="text-sm font-bold text-foreground">{foundUser.display_name}</p>
                   <p className="text-[10px] font-pixel text-neon-yellow uppercase mt-1">
                      PLAN: <span className={foundUser.isStaff ? "text-neon-magenta" : ""}>{foundUser.isStaff ? "STAFF (INMUNE)" : foundUser.membership_tier}</span>
                   </p>
                 </div>
                 {foundUser.isStaff && <Shield className="w-5 h-5 text-neon-magenta" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Sancionar */}
                 <div className="space-y-2">
                    <p className="text-[8px] font-pixel text-destructive uppercase">Sancionar</p>
                    <Input placeholder="Razón del baneo..." value={banReason} onChange={e => setBanReason(e.target.value)} className="h-8 text-xs bg-muted" />
                    <Button variant="destructive" className="w-full h-8 text-[9px] font-pixel" onClick={() => openConfirm("BANEAR USUARIO", `¿Banear a ${foundUser.display_name} por: ${banReason || 'Sin razón'}?`, "BANEAR", async () => { await supabase.from("banned_users").insert({ id: crypto.randomUUID(), user_id: foundUser.user_id, reason: banReason, ban_type: 'ban' } as any); setFoundUser(null); setConfirmAction(null); toast({title:"Usuario baneado"}); }, "destructive")}>BANEAR</Button>
                 </div>

                 {/* Membresía */}
                 <div className="space-y-2">
                    <p className="text-[8px] font-pixel text-neon-yellow uppercase">Membresía</p>
                    {foundUser.isStaff ? <p className="text-[9px] text-muted-foreground italic py-2 text-center">Un miembro del STAFF no requiere membresía.</p> : (
                      <>
                        <select value={selectedTier} onChange={e => setSelectedTier(e.target.value)} className="w-full h-8 bg-muted border rounded text-[9px] uppercase font-body">{["novato", "entusiasta", "coleccionista", "leyenda arcade", "miembro del legado", "creador de contenido"].map(t => <option key={t} value={t}>{t}</option>)}</select>
                        <Button className="w-full h-8 bg-neon-yellow text-black text-[9px] font-pixel hover:bg-neon-yellow/80" onClick={() => openConfirm("CAMBIAR PLAN", `¿Actualizar plan de ${foundUser.display_name} a ${selectedTier.toUpperCase()}?`, "CAMBIAR", async () => { await supabase.from("profiles").update({ membership_tier: selectedTier } as any).eq("user_id", foundUser.user_id); handleSearchUser(); setConfirmAction(null); toast({title:"Membresía actualizada"}); })}>GUARDAR PLAN</Button>
                      </>
                    )}
                 </div>
              </div>

              {/* Roles */}
              <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                {canManageMods && !foundUser.isTargetMod && !foundUser.isTargetAdmin && (
                  <Button variant="outline" className="flex-1 h-8 text-[8px] font-pixel text-neon-magenta hover:bg-neon-magenta/10 hover:text-neon-magenta border-neon-magenta/30 transition-colors" onClick={() => openConfirm("ASIGNAR MOD", `¿Hacer a ${foundUser.display_name} Moderador?`, "PROMOVER", async () => { await supabase.from("user_roles").insert({ id: crypto.randomUUID(), user_id: foundUser.user_id, role: "moderator" } as any); handleSearchUser(); setConfirmAction(null); toast({title:"Rol asignado"}); })}>HACER MODERADOR</Button>
                )}
                {canManageAdmins && !foundUser.isTargetAdmin && (
                  <Button variant="outline" className="flex-1 h-8 text-[8px] font-pixel border-white text-white hover:bg-white/10 hover:text-white transition-colors" onClick={() => openConfirm("ASIGNAR ADMIN", `¿Hacer a ${foundUser.display_name} Administrador?`, "PROMOVER", async () => { await supabase.from("user_roles").insert({ id: crypto.randomUUID(), user_id: foundUser.user_id, role: "admin" } as any); handleSearchUser(); setConfirmAction(null); toast({title:"Rol asignado"}); })}>HACER ADMIN</Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- PESTAÑA 2: USUARIOS BANEADOS --- */}
      {activeSubTab === "baneados" && (
        <div className="bg-card border border-neon-orange/30 rounded-lg p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-neon-orange uppercase">Usuarios Baneados ({bannedUsers.length})</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
            {bannedUsers.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-4">No hay usuarios baneados.</p> : bannedUsers.map(b => (
              <div key={b.id} className="flex flex-col bg-muted/20 p-2.5 rounded border border-neon-orange/20 gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold font-body text-foreground">{b.display_name}</span>
                  <span className="text-[9px] font-pixel px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">{b.ban_type === 'kick' ? 'KICK' : 'BAN'}</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-body leading-tight">Razón: {b.reason || "Sin especificar"}</p>
                <div className="flex justify-between items-end mt-1">
                  <span className="text-[8px] text-muted-foreground/60">{new Date(b.created_at).toLocaleDateString()}</span>
                  <button onClick={() => openConfirm("REVOCAR SANCIÓN", `¿Desbanear a ${b.display_name}?`, "DESBANEAR", async () => { await supabase.from("banned_users").delete().eq("id", b.id); loadModerationData(); setConfirmAction(null); toast({title:"Sanción revocada"}); })} className="text-neon-green text-[9px] font-body flex items-center gap-1 border border-neon-green/30 px-1.5 py-0.5 rounded hover:bg-neon-green/10 transition-colors">
                    <Unlock className="w-2.5 h-2.5" /> Revocar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PESTAÑA 3: CONTENIDO OCULTO --- */}
      {activeSubTab === "ocultos" && (
        <div className="bg-card border border-destructive/30 rounded-lg p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-destructive uppercase">Contenido Oculto ({bannedContent.length})</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
            {bannedContent.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-4">No hay contenido oculto.</p> : bannedContent.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-muted/20 p-2 rounded border border-white/5">
                <div className="w-12 h-12 bg-black shrink-0 overflow-hidden"><img src={item.image_url || item.thumbnail_url || item.content_url} className="w-full h-full object-cover opacity-50" /></div>
                <div className="flex-1 min-w-0"><p className="text-[10px] font-bold truncate">{item.caption || item.title || "Sin título"}</p><p className="text-[8px] text-muted-foreground uppercase">{item.type}</p></div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openConfirm("RESTAURAR", "¿Hacer público este contenido de nuevo?", "RESTAURAR", async () => { await supabase.from(item.type === 'Foto' ? 'photos' : 'social_content').update({ is_banned: false }).eq("id", item.id); loadModerationData(); setConfirmAction(null); toast({title:"Restaurado"}); })} className="text-[8px] font-pixel text-neon-green hover:underline">RESTAURAR</button>
                  <button onClick={() => openConfirm("BORRAR", "¿Eliminar para siempre de la base de datos?", "BORRAR", async () => { await supabase.from(item.type === 'Foto' ? 'photos' : 'social_content').delete().eq("id", item.id); loadModerationData(); setConfirmAction(null); toast({title:"Eliminado"}); }, "destructive")} className="text-[8px] font-pixel text-destructive hover:underline">BORRAR</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PESTAÑA 4: MODERADORES --- */}
      {activeSubTab === "mods" && (
        <div className="bg-card border border-neon-magenta/30 rounded-lg p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-neon-magenta uppercase">Moderadores Activos</h3>
          <div className="space-y-2">
            {staffList.mods.length === 0 ? <p className="text-[10px] text-muted-foreground text-center">No hay moderadores.</p> : staffList.mods.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-muted/20 p-2 rounded">
                <span className="text-xs text-white font-body">{m.name || "..."}</span>
                {canManageMods && <button onClick={() => openConfirm("REVOCAR MOD", `¿Quitar rol de Moderador a ${m.name}?`, "REVOCAR", async () => { await supabase.from("user_roles").delete().eq("id", m.id); loadModerationData(); setConfirmAction(null); toast({title:"Rol revocado"}); }, "destructive")} className="text-destructive text-[9px] font-pixel hover:underline">REVOCAR ROL</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PESTAÑA 5: ADMINS (Solo MasterWeb) --- */}
      {activeSubTab === "admins" && isMasterWeb && (
        <div className="bg-card border border-white/30 rounded-lg p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-white uppercase">Administradores Activos</h3>
          <div className="space-y-2">
            {staffList.admins.length === 0 ? <p className="text-[10px] text-muted-foreground text-center">No hay admins.</p> : staffList.admins.map(a => (
              <div key={a.id} className="flex justify-between items-center bg-muted/20 p-2 rounded">
                <span className="text-xs text-white font-body">{a.name || "..."}</span>
                <button onClick={() => openConfirm("REVOCAR ADMIN", `¿Quitar rol de Admin a ${a.name}?`, "REVOCAR", async () => { await supabase.from("user_roles").delete().eq("id", a.id); loadModerationData(); setConfirmAction(null); toast({title:"Rol revocado"}); }, "destructive")} className="text-destructive text-[9px] font-pixel hover:underline">REVOCAR ROL</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔥 VENTANA EMERGENTE DE CONFIRMACIÓN (CENTRADA) 🔥 */}
      {confirmAction && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmAction(null)}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-card border border-white/10 rounded-xl p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
              <AlertTriangle className={cn("w-5 h-5", confirmAction.variant === "destructive" ? "text-destructive" : "text-neon-cyan")} />
              <h3 className="font-pixel text-[11px] uppercase">{confirmAction.title}</h3>
            </div>
            <p className="text-xs font-body text-foreground mb-6 leading-relaxed">{confirmAction.message}</p>
            <div className="grid grid-cols-2 gap-3">
               <Button variant="outline" onClick={() => setConfirmAction(null)} className="h-10 text-[10px] font-body hover:bg-white/10 hover:text-white transition-colors">CANCELAR</Button>
               <Button variant={confirmAction.variant} onClick={confirmAction.action} className="h-10 text-[10px] font-pixel uppercase tracking-tighter">{confirmAction.btnText}</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}