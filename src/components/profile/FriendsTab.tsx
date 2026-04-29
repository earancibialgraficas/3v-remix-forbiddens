import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserMinus, MessageSquare, ExternalLink, Shield, Star, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getNameStyle, getAvatarBorderStyle, getRoleStyle } from "@/lib/profileAppearance";
import { cn } from "@/lib/utils";

export default function FriendsTab({ userId, limits, isStaff }: any) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [res, setRes] = useState<any[]>([]);

  // ESTADOS PARA EL MODAL DE ELIMINAR AMIGO
  const [friendToRemove, setFriendToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Congelar el scroll del fondo mientras el modal está abierto
  useEffect(() => {
    if (friendToRemove) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [friendToRemove]);

  const fetchFriends = async () => {
     if (!userId) return;
     try {
       const { data, error } = await supabase.from("friend_requests").select("*").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq("status", "accepted");
       if (error || !data || data.length === 0) { setFriends([]); return; }
       
       const ids = data.map(r => r.sender_id === userId ? r.receiver_id : r.sender_id);
       
       const { data: profs } = await supabase.from("profiles")
          .select("user_id, display_name, avatar_url, color_avatar_border, color_name, membership_tier, color_role, color_staff_role")
          .in("user_id", ids);
          
       const { data: rolesData } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
       
       const finalFriends = (profs || []).map(p => {
          const pRoles = rolesData?.filter(r => r.user_id === p.user_id).map(r => r.role) || [];
          return { ...p, roles: pRoles };
       });

       setFriends(finalFriends);
     } catch(e) {
       console.error("Error al cargar amigos:", e);
     }
  };

  useEffect(() => { 
    fetchFriends(); 
  }, [userId]);

  const reachedLimit = !isStaff && friends.length >= limits.maxFriends;

  const confirmRemoveFriend = async () => {
    if (!friendToRemove) return;
    setIsRemoving(true);
    try {
      await supabase.from("friend_requests").delete().or(`and(sender_id.eq.${userId},receiver_id.eq.${friendToRemove.id}),and(sender_id.eq.${friendToRemove.id},receiver_id.eq.${userId})`); 
      await fetchFriends();
      toast({ title: "Amistad eliminada", description: `Has eliminado a ${friendToRemove.name}.` });
    } catch(e) {
      toast({ title: "Error", description: "No se pudo eliminar al amigo.", variant: "destructive" });
    } finally {
      setIsRemoving(false);
      setFriendToRemove(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in relative">
      
      {/* SECCIÓN DE BÚSQUEDA */}
      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-neon-cyan uppercase mb-3 flex items-center justify-between">
          <span>Buscar Amigos</span>
          {!isStaff && (
             <span className={cn(
               "text-[9px] px-2 py-0.5 rounded",
               reachedLimit ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
             )}>
               Amigos: {friends.length} / {limits.maxFriends >= 999 ? "∞" : limits.maxFriends}
             </span>
          )}
        </h3>
        
        <div className="flex gap-2">
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="h-8 bg-muted flex-1 text-xs font-body" 
            placeholder={reachedLimit ? "Límite alcanzado..." : "Buscar por nombre..."} 
            disabled={reachedLimit} 
            onKeyDown={(e) => {
              if (e.key === "Enter" && !reachedLimit && search.trim()) {
                 document.getElementById("btn-buscar-amigos")?.click();
              }
            }}
          />
          <Button 
            id="btn-buscar-amigos"
            onClick={async () => { 
              try { 
                const { data: profs } = await supabase.from("profiles")
                   .select("user_id, display_name, avatar_url, color_avatar_border, color_name, membership_tier, color_role, color_staff_role")
                   .ilike("display_name", `%${search}%`)
                   .neq("user_id", userId)
                   .limit(5); 
                   
                if (!profs || profs.length === 0) { setRes([]); return; }
                
                const searchIds = profs.map(p => p.user_id);
                const { data: rolesData } = await supabase.from("user_roles").select("user_id, role").in("user_id", searchIds);
                
                const finalRes = profs.map(p => {
                   const pRoles = rolesData?.filter(r => r.user_id === p.user_id).map(r => r.role) || [];
                   return { ...p, roles: pRoles };
                });
                
                setRes(finalRes); 
              } catch(e) {} 
            }} 
            className="h-8" 
            disabled={reachedLimit || !search.trim()}
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
        
        {res.length > 0 && !reachedLimit && (
          <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
            {res.map(r => {
              const isResStaff = r.roles.includes('master_web') || r.roles.includes('admin') || r.roles.includes('moderator');
              return (
                <div key={r.user_id} className="flex items-center justify-between p-2 border border-border/50 rounded bg-muted/10 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted border border-border/50 overflow-hidden shrink-0" style={getAvatarBorderStyle(r.color_avatar_border)}>
                      {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <Link to={`/usuario/${r.user_id}`} className="text-xs font-bold font-body hover:underline transition-colors line-clamp-1" style={getNameStyle(r.color_name)}>
                         {r.display_name}
                      </Link>
                      <div className="flex items-center gap-1 mt-0.5">
                         {isResStaff ? 
                           <span className="text-[8px] font-pixel text-neon-magenta flex items-center gap-1" style={getRoleStyle(r.color_staff_role)}><Shield className="w-2.5 h-2.5" /> STAFF</span> : 
                           <span className="text-[8px] font-pixel text-neon-yellow flex items-center gap-1" style={getRoleStyle(r.color_role)}><Star className="w-2.5 h-2.5" /> {r.membership_tier?.toUpperCase() || 'NOVATO'}</span>
                         }
                      </div>
                    </div>
                  </div>
                  <Button onClick={async () => { 
                      try {
                        const { data: existing } = await supabase.from("friend_requests").select("id").or(`and(sender_id.eq.${userId},receiver_id.eq.${r.user_id}),and(sender_id.eq.${r.user_id},receiver_id.eq.${userId})`);
                        if (existing && existing.length > 0) { toast({ title: "Aviso", description: "Ya existe una solicitud.", variant: "destructive" }); return; }
                        const reqId = crypto.randomUUID();
                        const { error } = await supabase.from("friend_requests").insert({ id: reqId, sender_id: userId, receiver_id: r.user_id, status: 'pending' } as any); 
                        if (error) throw error;
                        await supabase.from("notifications").insert({ id: crypto.randomUUID(), user_id: r.user_id, type: "friend_request", title: "Nueva solicitud", body: `Alguien quiere ser tu amigo.`, related_id: userId } as any);
                        toast({ title: "Solicitud enviada" }); setRes([]); setSearch("");
                      } catch(e: any) { toast({ title: "Error", variant: "destructive" }); }
                   }} className="h-6 text-[9px] uppercase font-pixel tracking-tighter">Añadir</Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* 🔥 SECCIÓN DE AMIGOS CON AUTO-FIT (RESPONSIVO MEJORADO) 🔥 */}
      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-neon-green opacity-80 mb-4 uppercase text-center md:text-left">Mis Amigos ({friends.length})</h3>
        
        {friends.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 font-body opacity-60 uppercase italic">Sin amigos en tu lista.</p> 
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-4">
             {friends.map(f => {
               const isFStaff = f.roles.includes('master_web') || f.roles.includes('admin') || f.roles.includes('moderator');
               return (
                 <div key={f.user_id} className="flex flex-col bg-muted/10 border border-border/50 rounded-lg overflow-hidden hover:bg-muted/30 hover:border-neon-cyan/50 transition-all group">
                   <div className="p-3 flex flex-col items-center justify-center text-center cursor-pointer relative" onClick={() => navigate(`/usuario/${f.user_id}`)}>
                     <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border/50 mb-3 overflow-hidden shadow-sm group-hover:shadow-neon-cyan/20 transition-all group-hover:scale-105" style={getAvatarBorderStyle(f.color_avatar_border)}>
                       {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-muted-foreground" />}
                     </div>
                     <h4 className="text-xs font-bold font-body line-clamp-1 w-full px-1 mb-1 group-hover:text-neon-cyan transition-colors" style={getNameStyle(f.color_name)}>{f.display_name}</h4>
                     <div className="flex justify-center items-center h-4">
                       {isFStaff ? <span className="text-[8px] font-pixel text-neon-magenta flex items-center gap-1" style={getRoleStyle(f.color_staff_role)}><Shield className="w-2.5 h-2.5" /> STAFF</span> : <span className="text-[8px] font-pixel text-neon-yellow flex items-center gap-1" style={getRoleStyle(f.color_role)}><Star className="w-2.5 h-2.5" /> {f.membership_tier?.toUpperCase() || 'NOVATO'}</span>}
                     </div>
                   </div>
                   <div className="grid grid-cols-3 border-t border-border/50 bg-black/20 mt-auto">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/mensajes?to=${f.user_id}`); }} className="p-2 flex items-center justify-center text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors border-r border-border/50" title="Mensaje"><MessageSquare className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/usuario/${f.user_id}`); }} className="p-2 flex items-center justify-center text-muted-foreground hover:text-neon-green hover:bg-neon-green/10 transition-colors border-r border-border/50" title="Perfil"><ExternalLink className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setFriendToRemove({ id: f.user_id, name: f.display_name }); }} className="p-2 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Eliminar"><UserMinus className="w-4 h-4" /></button>
                   </div>
                 </div>
               );
             })}
           </div>
        )}
      </div>

      {/* 🔥 MODAL DE CONFIRMACIÓN CON BOTONES ANCHOS Y CENTRADOS 🔥 */}
      {friendToRemove && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setFriendToRemove(null)}>
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-sm bg-card border border-destructive/40 rounded-xl p-5 shadow-[0_0_50px_rgba(220,38,38,0.15)] animate-scale-in flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 shrink-0">
              <h3 className="font-pixel text-[11px] text-destructive flex items-center gap-2">
                <UserMinus className="w-4 h-4" /> ELIMINAR AMIGO
              </h3>
              <button onClick={() => setFriendToRemove(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-6 text-center">
              <p className="text-sm font-body text-muted-foreground">
                ¿Seguro que quieres eliminar a <strong className="text-foreground">{friendToRemove.name}</strong>?
              </p>
            </div>

            {/* BOTONES IGUALES, CENTRADOS Y A TODO ANCHO */}
            <div className="grid grid-cols-2 gap-3 w-full pt-4 border-t border-white/10 mt-2">
              <Button 
                variant="outline" 
                onClick={() => setFriendToRemove(null)} 
                className="w-full text-xs font-body border-white/10 hover:bg-white/5 h-10"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmRemoveFriend} 
                disabled={isRemoving} 
                className="w-full text-xs font-pixel shadow-[0_0_15px_rgba(220,38,38,0.3)] h-10"
              >
                {isRemoving ? "Cargando..." : "Sí, Eliminar"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}