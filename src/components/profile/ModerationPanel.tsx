import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Ban, Unlock } from "lucide-react";

// Sub-Componente de Contenido Baneado
function BannedContentPanel() {
  const { toast } = useToast();
  const [bannedItems, setBannedItems] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);

  const fetchBanned = async () => {
    const { data: photos } = await supabase.from("photos").select("id, user_id, image_url, caption, created_at").eq("is_banned", true);
    const { data: social } = await supabase.from("social_content").select("id, user_id, thumbnail_url, content_url, title, platform, content_type, created_at").eq("is_banned", true);
    
    const combined = [
      ...(photos || []).map(p => ({ ...p, type: 'photo', display_url: p.image_url, display_title: p.caption })),
      ...(social || []).map(s => ({ ...s, type: 'social', display_url: s.thumbnail_url || s.content_url, display_title: s.title }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setBannedItems(combined);
  };

  useEffect(() => {
    if (expanded) fetchBanned();
  }, [expanded]);

  const handleRestore = async (item: any) => {
    const table = item.type === 'photo' ? 'photos' : 'social_content';
    const { error } = await supabase.from(table).update({ is_banned: false }).eq("id", item.id);
    if (!error) {
      toast({ title: "Contenido restaurado y público nuevamente" });
      setBannedItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm("¿Eliminar permanentemente este contenido? No se puede deshacer.")) return;
    const table = item.type === 'photo' ? 'photos' : 'social_content';
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (!error) {
      toast({ title: "Contenido eliminado definitivamente" });
      setBannedItems(prev => prev.filter(i => i.id !== item.id));
    } else {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="bg-card border rounded p-4 mt-4 border-destructive/30">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex justify-between font-pixel text-[10px] text-destructive uppercase items-center">
        <span>Contenido Oculto / Baneado ({bannedItems.length})</span>
        <span className="text-xs">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1 retro-scrollbar">
          {bannedItems.length === 0 ? (
             <p className="text-[10px] text-muted-foreground text-center py-2 uppercase opacity-60">No hay contenido baneado</p>
          ) : (
            bannedItems.map(item => (
              <div key={item.id} className="flex gap-2 bg-muted/20 p-2 rounded border border-destructive/20 items-center">
                <div className="w-12 h-12 bg-black shrink-0 rounded overflow-hidden flex items-center justify-center border border-white/10">
                  {item.display_url ? (
                    <img src={item.display_url} className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
                  ) : (
                    <Ban className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-body text-foreground truncate">{item.display_title || "Sin título"}</p>
                  <p className="text-[8px] text-muted-foreground uppercase">{item.type} • {new Date(item.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleRestore(item)} className="h-5 text-[8px] px-2 text-neon-green hover:text-neon-green hover:bg-neon-green/10 border-neon-green/30">Restaurar</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item)} className="h-5 text-[8px] px-2">Eliminar</Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Sub-Componente de Lista de Moderadores
function ModeratorList({ isMasterWeb }: { isMasterWeb: boolean }) {
  const [moderators, setModerators] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    const loadMods = async () => {
      try {
        const { data } = await supabase.from("user_roles").select("id, user_id").eq("role", "moderator");
        if (!data || data.length === 0) return;
        const ids = data.map(r => r.user_id).filter(Boolean);
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
        setModerators(data.map(r => ({ ...r, display_name: (profs || []).find((p: any) => p.user_id === r.user_id)?.display_name })));
      } catch(e){}
    };
    loadMods();
  }, []);

  return (
    <div className="bg-card border rounded p-4">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="w-full flex justify-between font-pixel text-[10px] text-neon-magenta uppercase items-center"
      >
        <span>Moderadores Activos ({moderators.length})</span>
        <span className="text-xs">{expanded ? "▲" : "▼"}</span>
      </button>
      
      {expanded && (
        <div className="mt-2 space-y-1">
          {moderators.length === 0 ? (
             <p className="text-[10px] text-muted-foreground text-center py-2 uppercase opacity-60">
               Sin moderadores
             </p>
          ) : (
            moderators.map(m => (
              <div key={m.id} className="flex justify-between items-center text-xs bg-muted/20 p-2 rounded">
                <span className="font-body">{m.display_name}</span>
                {isMasterWeb && (
                  <button 
                    onClick={async () => { 
                      await supabase.from("user_roles").delete().eq("id", m.id); 
                      setModerators(prev => prev.filter(x => x.id !== m.id)); 
                    }} 
                    className="text-destructive text-[10px] underline hover:no-underline"
                  >
                    Revocar
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Módulo Principal
export default function ModerationPanel({ isStaff, isMasterWeb }: { isStaff: boolean; isMasterWeb: boolean }) {
  const { toast } = useToast();
  const [banEmail, setBanEmail] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);
  const [modEmail, setModEmail] = useState("");
  const [membershipSearch, setMembershipSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState("entusiasta");
  
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [expandedBanned, setExpandedBanned] = useState(false);

  useEffect(() => {
    if (expandedBanned) {
      supabase
        .from("banned_users")
        .select("id, user_id, reason, ban_type, created_at")
        .then(async ({ data }) => {
          if (!data || data.length === 0) {
            setBannedUsers([]);
            return;
          }
          const ids = data.map(b => b.user_id);
          const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
          setBannedUsers(data.map(b => ({
            ...b,
            display_name: profs?.find(p => p.user_id === b.user_id)?.display_name || "Desconocido"
          })));
        });
    }
  }, [expandedBanned]);

  const handleBan = async () => {
    if (!banEmail.trim() || !banReason.trim()) return;
    setBanning(true);
    
    const { data: target } = await supabase.from("profiles").select("user_id").ilike("display_name", banEmail).maybeSingle();
    if (!target) { toast({ title: "Usuario no encontrado", variant: "destructive" }); setBanning(false); return; }
    
    const { error } = await supabase.from("banned_users").insert({ id: crypto.randomUUID(), user_id: target.user_id, reason: banReason, ban_type: 'ban' } as any);
    setBanning(false);
    
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } 
    else { toast({ title: "Usuario baneado permanentemente" }); setBanEmail(""); setBanReason(""); if (expandedBanned) setExpandedBanned(false); }
  };

  const handleUnban = async (banId: string) => {
    const { error } = await supabase.from("banned_users").delete().eq("id", banId);
    if (!error) { setBannedUsers(prev => prev.filter(b => b.id !== banId)); toast({ title: "Sanción revocada." }); } 
    else { toast({ title: "Error al desbanear", description: error.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="bg-card border border-destructive/30 rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-destructive uppercase">Banear Usuario</h3>
        <Input placeholder="Nombre de usuario" value={banEmail} onChange={e => setBanEmail(e.target.value)} className="h-8 bg-muted text-xs w-full" />
        <Input placeholder="Razón" value={banReason} onChange={e => setBanReason(e.target.value)} className="h-8 bg-muted text-xs w-full" />
        <Button variant="destructive" onClick={handleBan} disabled={banning} className="w-full text-xs">Procesar Baneo</Button>
      </div>

      <div className="bg-card border border-destructive/30 rounded p-4">
        <button onClick={() => setExpandedBanned(!expandedBanned)} className="w-full flex justify-between font-pixel text-[10px] text-destructive uppercase items-center">
          <span>Usuarios Sancionados ({expandedBanned ? bannedUsers.length : "?"})</span>
          <span className="text-xs">{expandedBanned ? "▲" : "▼"}</span>
        </button>
        {expandedBanned && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1 retro-scrollbar">
            {bannedUsers.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-2 uppercase opacity-60">No hay usuarios sancionados</p> : bannedUsers.map(b => (
                <div key={b.id} className="flex flex-col bg-muted/20 p-2.5 rounded border border-destructive/20 gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold font-body text-foreground">{b.display_name}</span>
                    <span className={cn("text-[9px] font-pixel px-1.5 py-0.5 rounded", b.ban_type === 'kick' ? "bg-neon-orange/20 text-neon-orange" : "bg-destructive/20 text-destructive")}>
                      {b.ban_type === 'kick' ? 'KICK' : 'BAN'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-body leading-tight">Razón: {b.reason || "Sin especificar"}</p>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-[8px] text-muted-foreground/60">{new Date(b.created_at).toLocaleDateString()}</span>
                    <button onClick={() => handleUnban(b.id)} className="text-neon-green hover:text-neon-green/80 text-[9px] font-body flex items-center gap-1 border border-neon-green/30 px-1.5 py-0.5 rounded hover:bg-neon-green/10 transition-colors">
                      <Unlock className="w-2.5 h-2.5" /> Revocar
                    </button>
                  </div>
                </div>
            ))}
          </div>
        )}
      </div>

      <BannedContentPanel />

      {isMasterWeb && (
        <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3 text-center mt-4">
          <h3 className="font-pixel text-[10px] text-neon-cyan uppercase">Asignar Roles</h3>
          <Input placeholder="Usuario" value={modEmail} onChange={e => setModEmail(e.target.value)} className="h-8 bg-muted text-xs w-full" />
          <div className="flex gap-2">
             <Button onClick={async () => { const { data } = await supabase.from("profiles").select("user_id").ilike("display_name", modEmail).maybeSingle(); if (data) { const { error } = await supabase.from("user_roles").insert({ id: crypto.randomUUID(), user_id: data.user_id, role: "moderator" } as any); if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } else { toast({ title: "Moderador asignado" }); setModEmail(""); } } else { toast({ title: "Usuario no encontrado", variant: "destructive" }); } }} className="flex-1 text-xs">Asignar Moderador</Button>
             <Button variant="outline" onClick={async () => { const { data } = await supabase.from("profiles").select("user_id").ilike("display_name", modEmail).maybeSingle(); if (data) { const { error } = await supabase.from("user_roles").insert({ id: crypto.randomUUID(), user_id: data.user_id, role: "admin" } as any); if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } else { toast({ title: "Admin asignado" }); setModEmail(""); } } else { toast({ title: "Usuario no encontrado", variant: "destructive" }); } }} className="flex-1 text-xs">Asignar Admin</Button>
          </div>
        </div>
      )}

      <ModeratorList isMasterWeb={isMasterWeb} />

      {isStaff && (
        <div className="bg-card border border-neon-yellow/30 rounded p-4 space-y-3 text-center">
          <h3 className="font-pixel text-[10px] text-neon-yellow uppercase">Gestionar Membresías</h3>
          <Input placeholder="Usuario" value={membershipSearch} onChange={e => setMembershipSearch(e.target.value)} className="h-8 bg-muted text-xs w-full" />
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["novato", "entusiasta", "coleccionista", "leyenda arcade", "miembro del legado", "creador de contenido"].map(t => (
              <button key={t} onClick={() => setSelectedTier(t)} className={cn("px-2 py-1 rounded text-[10px] border transition-colors", selectedTier === t ? "bg-neon-yellow text-black border-neon-yellow" : "bg-muted border-border hover:border-neon-yellow/50")}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={async () => { if (!membershipSearch.trim()) return; const { data: tp } = await supabase.from("profiles").select("user_id").ilike("display_name", membershipSearch).maybeSingle(); if (!tp) { toast({ title: "No encontrado", variant: "destructive" }); return; } const { error } = await supabase.from("profiles").update({ membership_tier: selectedTier } as any).eq("user_id", tp.user_id); if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } else { setMembershipSearch(""); toast({ title: "Membresía actualizada" }); } }} className="w-full bg-neon-yellow/20 text-neon-yellow hover:bg-neon-yellow/30 border border-neon-yellow/30 transition-colors">Actualizar</Button>
        </div>
      )}
    </div>
  );
}