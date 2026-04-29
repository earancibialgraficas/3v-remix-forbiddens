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

  const [searchTerm, setSearchTerm] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [banReason, setBanReason] = useState("");
  const [selectedTier, setSelectedTier] = useState("novato");
  const [bannedContent, setBannedContent] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<{ mods: any[], admins: any[] }>({ mods: [], admins: [] });

  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    btnText: string;
    variant: "destructive" | "default";
    action: () => void;
  } | null>(null);

  useEffect(() => {
    if (confirmAction) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [confirmAction]);

  const canManageMods = isMasterWeb || isAdmin;
  const canManageAdmins = isMasterWeb;

  // 🔥 BUSCADOR A PRUEBA DE FALLOS 🔥
  const handleSearchUser = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setFoundUser(null);
    try {
      let u = null;
      
      // 1. Intentamos usar la función SQL (por si buscan por correo)
      const { data, error } = await supabase.rpc("get_user_by_identifier", { search_text: searchTerm.trim() });
      
      if (!error && data && data.length > 0) {
        u = data[0];
      } else {
        // 2. Si falla el SQL o no encontró, buscamos directo por nombre de usuario (A prueba de fallos)
        const { data: fallbackData } = await supabase
          .from("profiles")
          .select("user_id, display_name, membership_tier")
          .ilike("display_name", searchTerm.trim())
          .maybeSingle();
          
        if (fallbackData) u = fallbackData;
      }

      if (u) {
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
        toast({ title: "No encontrado", description: "No se halló al usuario.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error en búsqueda", variant: "destructive" });
    } finally { setIsSearching(false); }
  };

  const loadModerationData = async () => {
    if (activeSubTab === "banned_content") {
      const { data: ph } = await supabase.from("photos").select("*").eq("is_banned", true);
      const { data: sc } = await supabase.from("social_content").select("*").eq("is_banned", true);
      setBannedContent([...(ph || []).map(x => ({ ...x, type: 'Foto' })), ...(sc || []).map(x => ({ ...x, type: 'Redes' }))]);
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
    <div className="space-y-4 animate-in fade-in">
      
      {/* 4 PESTAÑAS INTERNAS */}
      <div className="flex gap-1 bg-muted/20 p-1 rounded border border-white/5 overflow-x-auto custom-scrollbar">
        <button onClick={() => setActiveSubTab("gestion")} className={cn("px-3 py-2 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "gestion" ? "bg-neon-cyan text-black" : "text-muted-foreground hover:text-white")}><Search className="w-3 h-3" /> GESTIÓN</button>
        <button onClick={() => setActiveSubTab("banned_content")} className={cn("px-3 py-2 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "banned_content" ? "bg-destructive text-white" : "text-muted-foreground hover:text-white")}><ImageIcon className="w-3 h-3" /> BANEADOS</button>
        {(isMasterWeb || isAdmin) && (
          <button onClick={() => setActiveSubTab("mods")} className={cn("px-3 py-2 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "mods" ? "bg-neon-magenta text-white" : "text-muted-foreground hover:text-white")}><Users className="w-3 h-3" /> MODERADORES</button>
        )}
        {isMasterWeb && (
          <button onClick={() => setActiveSubTab("admins")} className={cn("px-3 py-2 rounded text-[9px] font-pixel flex items-center gap-2 transition-all shrink-0", activeSubTab === "admins" ? "bg-white text-black" : "text-muted-foreground hover:text-white")}><Shield className="w-3 h-3" /> ADMINS</button>
        )}
      </div>

      {/* --- PESTAÑA 1: GESTIÓN (BUSCADOR) --- */}
      {activeSubTab === "gestion" && (
        <div className="bg-card border border-neon-cyan/30 rounded-lg p-4">
          <div className="flex gap-2 mb-4">
            <Input placeholder="Nombre de usuario..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchUser()} className="h-9 bg-muted text-xs font-body" />
            <Button onClick={handleSearchUser} disabled={isSearching} className="bg-neon-cyan text-black text-[9px] font-pixel px-6">{isSearching ? "..." : "BUSCAR"}</Button>
          </div>

          {foundUser && (
            <div className="bg-black/40 border border-white/5 rounded-lg p-4 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                 <div>
                   <p className="text-sm font-bold text-foreground">{foundUser.display_name}</p>
                   <p className="text-[10px] font-pixel text-neon-yellow uppercase mt-1">PLAN: {foundUser.isStaff ? "STAFF" : foundUser.membership_tier}</p>
                 </div>
                 {foundUser.isStaff && <Shield className="w-5 h-5 text-neon-magenta" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <p className="text-[8px] font-pixel text-destructive uppercase">Sancionar</p>
                    <Input placeholder="Razón..." value={banReason} onChange={e => setBanReason(e.target.value)} className="h-8 text-xs bg-muted" />
                    <Button variant="destructive" className="w-full h-8 text-[9px] font-pixel" onClick={() => openConfirm("BANEAR USUARIO", `¿Baneas a ${foundUser.display_name}?`, "BANEAR", async () => { await supabase.from("banned_users").insert({ id: crypto.randomUUID(), user_id: foundUser.user_id, reason: banReason, ban_type: 'ban' } as any); setFoundUser(null); setConfirmAction(null); toast({title:"Usuario baneado"}); }, "destructive")}>BANEAR</Button>
                 </div>

                 <div className="space-y-2">
                    <p className="text-[8px] font-pixel text-neon-yellow uppercase">Membresía</p>
                    {foundUser.isStaff ? <p className="text-[9px] text-muted-foreground italic py-2">STAFF es inmune a cambios de plan.</p> : (
                      <>
                        <select value={selectedTier} onChange={e => setSelectedTier(e.target.value)} className="w-full h-8 bg-muted border rounded text-[9px] uppercase">{["novato", "entusiasta", "coleccionista", "leyenda arcade", "miembro del legado", "creador de contenido"].map(t => <option key={t} value={t}>{t}</option>)}</select>
                        <Button className="w-full h-8 bg-neon-yellow text-black text-[9px] font-pixel" onClick={() => openConfirm("CAMBIAR PLAN", `¿Cambiar plan a ${selectedTier.toUpperCase()}?`, "CAMBIAR", async () => { await supabase.from("profiles").update({ membership_tier: selectedTier } as any).eq("user_id", foundUser.user_id); handleSearchUser(); setConfirmAction(null); toast({title:"Membresía actualizada"}); })}>GUARDAR PLAN</Button>
                      </>
                    )}
                 </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex gap-2">
                {canManageMods && !foundUser.isTargetMod && !foundUser.isTargetAdmin && (
                  <Button variant="outline" className="flex-1 h-8 text-[8px] font-pixel" onClick={() => openConfirm("ASIGNAR MOD", "¿Promocionar a Moderador?", "PROMOVER", async () => { await supabase.from("user_roles").insert({ id: crypto.randomUUID(), user_id: foundUser.user_id, role: "moderator" } as any); handleSearchUser(); setConfirmAction(null); toast({title:"Rol asignado"}); })}>HACER MOD</Button>
                )}
                {canManageAdmins && !foundUser.isTargetAdmin && (
                  <Button variant="outline" className="flex-1 h-8 text-[8px] font-pixel border-neon-magenta text-neon-magenta hover:bg-neon-magenta/10" onClick={() => openConfirm("ASIGNAR ADMIN", "¿Promocionar a Administrador?", "PROMOVER", async () => { await supabase.from("user_roles").insert({ id: crypto.randomUUID(), user_id: foundUser.user_id, role: "admin" } as any); handleSearchUser(); setConfirmAction(null); toast({title:"Rol asignado"}); })}>HACER ADMIN</Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- PESTAÑA 2: CONTENIDO BANEADO --- */}
      {activeSubTab === "banned_content" && (
        <div className="bg-card border border-destructive/30 rounded-lg p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-destructive uppercase">Contenido Oculto ({bannedContent.length})</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
            {bannedContent.map(item => (
              <div key={item.id} className="flex items-center gap-3 bg-muted/20 p-2 rounded border border-white/5">
                <div className="w-12 h-12 bg-black shrink-0 overflow-hidden"><img src={item.image_url || item.thumbnail_url || item.content_url} className="w-full h-full object-cover opacity-50" /></div>
                <div className="flex-1 min-w-0"><p className="text-[10px] font-bold truncate">{item.caption || item.title || "Sin título"}</p><p className="text-[8px] text-muted-foreground uppercase">{item.type}</p></div>
                <div className="flex gap-2">
                  <button onClick={() => openConfirm("RESTAURAR", "¿Hacer público?", "RESTAURAR", async () => { await supabase.from(item.type === 'Foto' ? 'photos' : 'social_content').update({ is_banned: false }).eq("id", item.id); loadModerationData(); setConfirmAction(null); })} className="text-[8px] font-pixel text-neon-green">RESTAURAR</button>
                  <button onClick={() => openConfirm("BORRAR", "¿Eliminar para siempre?", "BORRAR", async () => { await supabase.from(item.type === 'Foto' ? 'photos' : 'social_content').delete().eq("id", item.id); loadModerationData(); setConfirmAction(null); }, "destructive")} className="text-[8px] font-pixel text-destructive">BORRAR</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PESTAÑA 3: MODERADORES --- */}
      {activeSubTab === "mods" && (
        <div className="bg-card border border-neon-magenta/30 rounded-lg p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-neon-magenta uppercase">Moderadores Activos</h3>
          <div className="space-y-2">
            {staffList.mods.map(m => (
              <div key={m.id} className="flex justify-between items-center bg-muted/20 p-2 rounded">
                <span className="text-xs text-white">{m.name || "..."}</span>
                {canManageMods && <button onClick={() => openConfirm("REVOCAR ROL", `¿Quitar permisos a ${m.name}?`, "REVOCAR", async () => { await supabase.from("user_roles").delete().eq("id", m.id); loadModerationData(); setConfirmAction(null); toast({title:"Permisos revocados"}); }, "destructive")} className="text-destructive text-[9px] font-pixel">REVOCAR</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PESTAÑA 4: ADMINS (WebMaster Solo) --- */}
      {activeSubTab === "admins" && isMasterWeb && (
        <div className="bg-card border border-white/30 rounded-lg p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-white uppercase">Administradores Activos</h3>
          <div className="space-y-2">
            {staffList.admins.map(a => (
              <div key={a.id} className="flex justify-between items-center bg-muted/20 p-2 rounded">
                <span className="text-xs text-white">{a.name || "..."}</span>
                <button onClick={() => openConfirm("REVOCAR ADMIN", `¿Quitar permisos a ${a.name}?`, "REVOCAR", async () => { await supabase.from("user_roles").delete().eq("id", a.id); loadModerationData(); setConfirmAction(null); toast({title:"Permisos revocados"}); }, "destructive")} className="text-destructive text-[9px] font-pixel">REVOCAR</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔥 VENTANA EMERGENTE DE CONFIRMACIÓN (CENTRADÍSIMA) 🔥 */}
      {confirmAction && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmAction(null)}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-card border border-white/10 rounded-xl p-6 shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-3">
              <AlertTriangle className={cn("w-5 h-5", confirmAction.variant === "destructive" ? "text-destructive" : "text-neon-cyan")} />
              <h3 className="font-pixel text-[11px] uppercase">{confirmAction.title}</h3>
            </div>
            <p className="text-xs font-body text-foreground mb-6">{confirmAction.message}</p>
            <div className="grid grid-cols-2 gap-3">
               <Button variant="outline" onClick={() => setConfirmAction(null)} className="h-10 text-[10px] font-body">CANCELAR</Button>
               <Button variant={confirmAction.variant} onClick={confirmAction.action} className="h-10 text-[10px] font-pixel uppercase">{confirmAction.btnText}</Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}