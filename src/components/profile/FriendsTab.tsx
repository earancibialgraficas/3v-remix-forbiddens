import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserMinus, MessageSquare, ExternalLink, Shield, Star, User } from "lucide-react";
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

  // 🔥 CONSULTA SEGURA: Perfiles y Roles separados para evitar que Supabase falle 🔥
  const fetchFriends = async () => {
     if (!userId) return;
     try {
       const { data, error } = await supabase.from("friend_requests").select("*").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq("status", "accepted");
       if (error || !data || data.length === 0) { setFriends([]); return; }
       
       const ids = data.map(r => r.sender_id === userId ? r.receiver_id : r.sender_id);
       
       // 1. Buscamos los perfiles
       const { data: profs } = await supabase.from("profiles")
          .select("user_id, display_name, avatar_url, color_avatar_border, color_name, membership_tier, color_role, color_staff_role")
          .in("user_id", ids);
          
       // 2. Buscamos los roles separados (sin forzar Join)
       const { data: rolesData } = await supabase.from("user_roles").select("user_id, role").in("user_id", ids);
       
       // 3. Unimos los datos manualmente
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

  return (
    <div className="space-y-6 animate-in fade-in">
      
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
            placeholder={reachedLimit ? "Límite de amigos alcanzado..." : "Buscar por nombre..."} 
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
        
        {reachedLimit && <p className="text-[10px] text-destructive/80 mt-2 font-body italic">Has alcanzado el límite de amigos de tu membresía.</p>}
        
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
                  
                  {/* TU LÓGICA DE AÑADIR CON NOTIFICACIÓN */}
                  <Button onClick={async () => { 
                      try {
                        const { data: existing } = await supabase.from("friend_requests").select("id").or(`and(sender_id.eq.${userId},receiver_id.eq.${r.user_id}),and(sender_id.eq.${r.user_id},receiver_id.eq.${userId})`);
                        if (existing && existing.length > 0) { toast({ title: "Aviso", description: "Ya existe una solicitud o amistad con este usuario.", variant: "destructive" }); return; }
                        const reqId = crypto.randomUUID();
                        const { error } = await supabase.from("friend_requests").insert({ id: reqId, sender_id: userId, receiver_id: r.user_id, status: 'pending' } as any); 
                        if (error) { toast({ title: "Error al enviar", description: error.message, variant: "destructive" }); return; }
                        await supabase.from("notifications").insert({ id: crypto.randomUUID(), user_id: r.user_id, type: "friend_request", title: "Nueva solicitud de amistad", body: `Alguien te ha enviado una solicitud de amistad.`, related_id: userId } as any);
                        toast({ title: "Solicitud enviada" }); setRes([]); setSearch("");
                      } catch(e: any) { toast({ title: "Error fatal", description: e.message, variant: "destructive" }); }
                   }} className="h-6 text-[9px] uppercase font-pixel tracking-tighter">
                     Añadir
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* CUADRÍCULA DE AMIGOS RESPONSIVA */}
      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-neon-green opacity-80 mb-4 uppercase text-center md:text-left">Mis Amigos ({friends.length})</h3>
        
        {friends.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 font-body opacity-60 uppercase italic">Sin amigos en tu lista.</p> 
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
             {friends.map(f => {
               const isFStaff = f.roles.includes('master_web') || f.roles.includes('admin') || f.roles.includes('moderator');
               
               return (
                 <div key={f.user_id} className="flex flex-col bg-muted/10 border border-border/50 rounded-lg overflow-hidden hover:bg-muted/30 hover:border-neon-cyan/50 transition-all group">
                   
                   <div 
                     className="p-3 flex flex-col items-center justify-center text-center cursor-pointer relative"
                     onClick={() => navigate(`/usuario/${f.user_id}`)}
                   >
                     <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border/50 mb-3 overflow-hidden shadow-sm group-hover:shadow-neon-cyan/20 transition-all group-hover:scale-105" style={getAvatarBorderStyle(f.color_avatar_border)}>
                       {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-muted-foreground" />}
                     </div>
                     
                     <h4 className="text-xs font-bold font-body line-clamp-1 w-full px-1 mb-1 group-hover:text-neon-cyan transition-colors" style={getNameStyle(f.color_name)}>
                       {f.display_name}
                     </h4>
                     
                     <div className="flex justify-center items-center h-4">
                       {isFStaff ? (
                          <span className="text-[8px] font-pixel text-neon-magenta flex items-center gap-1" style={getRoleStyle(f.color_staff_role)}><Shield className="w-2.5 h-2.5" /> STAFF</span>
                       ) : (
                          <span className="text-[8px] font-pixel text-neon-yellow flex items-center gap-1" style={getRoleStyle(f.color_role)}><Star className="w-2.5 h-2.5" /> {f.membership_tier?.toUpperCase() || 'NOVATO'}</span>
                       )}
                     </div>
                   </div>

                   <div className="grid grid-cols-3 border-t border-border/50 bg-black/20 mt-auto">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/mensajes?to=${f.user_id}`); }}
                        className="p-2 flex items-center justify-center text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors border-r border-border/50"
                        title="Enviar Mensaje"
                      >
                         <MessageSquare className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/usuario/${f.user_id}`); }}
                        className="p-2 flex items-center justify-center text-muted-foreground hover:text-neon-green hover:bg-neon-green/10 transition-colors border-r border-border/50"
                        title="Ver Perfil"
                      >
                         <ExternalLink className="w-4 h-4" />
                      </button>
                      
                      {/* TU LÓGICA DE ELIMINAR AMIGO (Cargando lista al terminar) */}
                      <button 
                        onClick={async (e) => { 
                          e.stopPropagation(); 
                          if(confirm(`¿Seguro que deseas eliminar a ${f.display_name}?`)) {
                             await supabase.from("friend_requests").delete().or(`and(sender_id.eq.${userId},receiver_id.eq.${f.user_id}),and(sender_id.eq.${f.user_id},receiver_id.eq.${userId})`); 
                             fetchFriends();
                          }
                        }}
                        className="p-2 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Eliminar Amigo"
                      >
                         <UserMinus className="w-4 h-4" />
                      </button>
                   </div>
                 </div>
               );
             })}
           </div>
        )}
      </div>
    </div>
  );
}