import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getNameStyle } from "@/lib/profileAppearance";

export default function FriendsTab({ userId, limits, isStaff }: any) {
  const { toast } = useToast();
  const [friends, setFriends] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [res, setRes] = useState<any[]>([]);

  const fetchFriends = async () => {
     try {
       const { data, error } = await supabase.from("friend_requests").select("*").or(`sender_id.eq.${userId},receiver_id.eq.${userId}`).eq("status", "accepted");
       if (error || !data || data.length === 0) { setFriends([]); return; }
       const ids = data.map(r => r.sender_id === userId ? r.receiver_id : r.sender_id);
       const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_avatar_border, color_name").in("user_id", ids);
       setFriends(profs || []);
     } catch(e) {}
  };

  useEffect(() => { 
    fetchFriends(); 
  }, [userId]);

  const reachedLimit = !isStaff && friends.length >= limits.maxFriends;

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="bg-card border border-neon-cyan/30 rounded p-4 text-center">
        <h3 className="font-pixel text-[10px] text-neon-cyan uppercase mb-1">Buscar Amigos</h3>
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-body mb-3"><span>Límite de amigos: {friends.length} / {limits.maxFriends >= 999 ? "∞" : limits.maxFriends}</span></div>
        <div className="flex gap-1">
          <Input value={search} onChange={e => setSearch(e.target.value)} className="h-8 bg-muted flex-1 text-xs font-body" placeholder="Nombre..." disabled={reachedLimit} />
          <Button onClick={async () => { 
              try { 
                const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_avatar_border, color_name").ilike("display_name", `%${search}%`).neq("user_id", userId).limit(5); 
                setRes(data || []); 
              } catch(e) {} 
            }} className="h-8" disabled={reachedLimit || !search.trim()}><Search className="w-4 h-4" /></Button>
        </div>
        {reachedLimit && <p className="text-[10px] text-destructive/80 mt-2 font-body italic">Has alcanzado el límite de amigos de tu membresía.</p>}
        {res.map(r => (
          <div key={r.user_id} className="mt-2 flex justify-between items-center bg-muted/20 p-2 rounded text-xs border border-border/20">
             {/* 🔥 BÚSQUEDA CLICKEABLE AL PERFIL PÚBLICO 🔥 */}
             <Link to={`/usuario/${r.user_id}`} className="font-body hover:underline" style={getNameStyle(r.color_name)}>{r.display_name}</Link>
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
               }} className="h-6 text-[9px] uppercase font-pixel tracking-tighter">Añadir</Button>
          </div>
        ))}
      </div>
      
      <div className="bg-card border rounded p-4">
        <h3 className="font-pixel text-[10px] opacity-60 mb-2 uppercase text-center md:text-left">Amigos ({friends.length})</h3>
        {friends.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4 font-body opacity-60 uppercase">Sin amigos</p> : (
           <div className="space-y-1.5">
             {friends.map(f => (
               <div key={f.user_id} className="p-2 border-b border-border/30 text-xs font-body flex justify-between items-center group">
                 {/* 🔥 AMIGOS CLICKEABLES AL PERFIL PÚBLICO 🔥 */}
                 <Link to={`/usuario/${f.user_id}`} className="hover:underline font-bold" style={getNameStyle(f.color_name)}>{f.display_name}</Link>
                 <button onClick={async () => { await supabase.from("friend_requests").delete().or(`and(sender_id.eq.${userId},receiver_id.eq.${f.user_id}),and(sender_id.eq.${f.user_id},receiver_id.eq.${userId})`); fetchFriends(); }} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><UserMinus className="w-4 h-4" /></button>
               </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
}