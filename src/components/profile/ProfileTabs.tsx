import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getNameStyle, getAvatarBorderStyle } from "@/lib/profileAppearance";
import { getCategoryRoute } from "@/lib/categoryRoutes";
import { Trophy, Gamepad2, HardDrive, Trash2, Search, UserMinus, UserPlus, Heart, MessageSquare, Users, Star, Ban, Unlock, User } from "lucide-react";

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  friend_request: { icon: <UserPlus className="w-3.5 h-3.5" />, color: "text-neon-cyan" },
  friend_accepted: { icon: <UserPlus className="w-3.5 h-3.5" />, color: "text-neon-green" },
  follow: { icon: <Heart className="w-3.5 h-3.5" />, color: "text-neon-magenta" },
  comment: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-neon-green" },
  mention: { icon: <Users className="w-3.5 h-3.5" />, color: "text-neon-orange" },
  achievement: { icon: <Trophy className="w-3.5 h-3.5" />, color: "text-neon-yellow" },
  general: { icon: <Star className="w-3.5 h-3.5" />, color: "text-muted-foreground" },
};

const safeStr = (val: any) => (val ? String(val) : "");

export function AvisosTab({ notifications, pendingRequests, handleMarkAsRead, handleClearNotifications, handleAcceptRequest, handleRejectRequest }: any) {
  return (
    <div className="bg-card border border-border rounded p-4 animate-in fade-in">
      <div className="flex justify-between items-center mb-3">
         <h3 className="font-pixel text-[10px] text-muted-foreground uppercase">MIS AVISOS ({(notifications || []).length + (pendingRequests || []).length})</h3>
         <Button variant="outline" size="sm" onClick={handleClearNotifications} className="h-6 text-[9px] gap-1 px-2 border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3 h-3" /> Limpiar Historial
         </Button>
      </div>

      {(pendingRequests || []).length > 0 && (
        <div className="mb-4 space-y-2 border-b border-border/50 pb-4">
          <h4 className="font-pixel text-[9px] text-neon-cyan uppercase">Solicitudes de amistad pendientes</h4>
          {pendingRequests.map((req: any) => (
            <div key={req.id} className="flex gap-3 p-3 border rounded bg-primary/10 border-primary/30 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-border/50 shrink-0" style={getAvatarBorderStyle(req.profile?.color_avatar_border)}>
                  {req.profile?.avatar_url ? <img src={req.profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-full h-full text-muted-foreground p-1.5" />}
                </div>
                <div className="flex flex-col">
                  <Link to={`/usuario/${req.sender_id}`} className="text-xs font-body font-bold hover:underline transition-colors" style={getNameStyle(req.profile?.color_name)}>{req.profile?.display_name || "Usuario"}</Link>
                  <span className="text-[9px] text-muted-foreground font-body">Quiere ser tu amigo</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => handleAcceptRequest(req.id, req.sender_id, req.profile?.display_name || "Usuario")} className="h-6 text-[9px] px-2 bg-neon-green text-black hover:bg-neon-green/80 font-pixel">Aceptar</Button>
                <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(req.id, req.sender_id, req.profile?.display_name || "Usuario")} className="h-6 text-[9px] px-2 font-pixel">Rechazar</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {notifications.length === 0 && pendingRequests.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body text-center md:text-left py-4">No tienes avisos recientes</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif: any) => {
            const c = typeConfig[notif.type] || typeConfig.general;
            return (
              <div key={notif.id} onClick={() => handleMarkAsRead(notif.id)} className={cn("flex gap-3 p-3 border rounded hover:bg-muted/30 transition-colors text-left cursor-pointer", notif.is_read ? "border-border/50" : "bg-primary/5 border-primary/30")}>
                <div className={cn("shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs", c.color)}>{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-body font-medium text-foreground leading-snug">{notif.title}</p>
                  <p className="text-[10px] font-body text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-muted-foreground/70">{new Date(notif.created_at).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    {notif.type === "friend_request" && notif.related_id && <Link to={`/usuario/${notif.related_id}`} onClick={() => handleMarkAsRead(notif.id)} className="text-[9px] text-primary hover:underline font-body">Ver perfil</Link>}
                    {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan ml-auto" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function PostsTab({ userPosts }: { userPosts: any[] }) {
  return (
    <div className="bg-card border border-border rounded p-4 animate-in fade-in">
      <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left uppercase">Mis Posts</h3>
      {userPosts.length === 0 ? <p className="text-xs text-muted-foreground font-body text-center md:text-left">Aún no has publicado nada</p> : (
         <div className="space-y-2">
           {userPosts.map((post) => (
             <Link key={post.id} to={getCategoryRoute(post.category || "gaming-anime-foro", post.id)} className="block p-2 border-border/30 border-b hover:bg-muted/30 transition-colors cursor-pointer text-xs truncate">
               {post.title}
             </Link>
           ))}
         </div>
      )}
    </div>
  );
}

export function StatsTab({ profile, followerCount, followingCount, userPosts, socialContentCount, bestScores, displayTier, isStaff, statColors }: any) {
  return (
    <div className="bg-card border border-border rounded p-4 space-y-3 animate-in fade-in">
      <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left uppercase">Estadísticas</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { val: profile?.total_score?.toLocaleString() || 0, label: "Puntos", color: statColors.points || "#39ff14" },
          { val: followerCount, label: "Seguidores", color: statColors.followers || "#ffffff" },
          { val: followingCount, label: "Siguiendo", color: statColors.following || "#ffffff" },
          { val: userPosts.length, label: "Posts Foro", color: statColors.forum || "#00ffff" },
          { val: socialContentCount, label: "Posts Social", color: statColors.social || "#ffff00" },
          { val: bestScores.length, label: "Juegos", color: statColors.games || "#ff8c00" },
          { val: displayTier, label: "Membresía", color: isStaff ? "#39ff14" : "#a1a1aa", isStaffTier: isStaff },
        ].map((s, i) => (
          <div key={i} className="bg-muted/30 rounded p-3 text-center flex flex-col justify-center min-h-[70px]">
            <p className={cn("text-lg font-bold font-body", s.isStaffTier && "animate-pulse")} style={{ color: s.color, filter: s.isStaffTier ? `drop-shadow(0 0 8px ${s.color}cc)` : undefined }}>{s.val}</p>
            <p className="text-[10px] uppercase opacity-60 font-body mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      {bestScores.length > 0 && (
        <div className="mt-4">
          <h4 className="font-pixel text-[10px] text-neon-green mb-2 flex items-center justify-center md:justify-start gap-1 uppercase"><Gamepad2 className="w-3 h-3" /> Puntajes por Juego</h4>
          <div className="space-y-1">
            {bestScores.map((gs: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-muted/30 rounded px-3 py-1.5 text-xs font-body">
                <span className={cn("font-pixel text-[9px]", safeStr(gs?.console_type) === "nes" ? "text-neon-green" : safeStr(gs?.console_type) === "snes" ? "text-neon-cyan" : "text-neon-magenta")}>{safeStr(gs?.console_type).toUpperCase()}</span>
                <span className="flex-1 text-foreground truncate">{gs.game_name}</span>
                <span className="text-neon-green font-bold">{gs.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function GuardadosTab() {
  return (
    <div className="bg-card border border-border rounded p-4 animate-in fade-in">
      <h3 className="font-pixel text-[10px] text-neon-cyan uppercase mb-3 text-center md:text-left">Mis Guardados</h3>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        <div className="aspect-square bg-muted/30 flex items-center justify-center rounded border border-border/20">
           <span className="text-[9px] text-muted-foreground font-body uppercase text-center px-2">Próximamente</span>
        </div>
        <div className="aspect-square bg-muted/30 flex items-center justify-center rounded border border-border/20"></div>
        <div className="aspect-square bg-muted/30 flex items-center justify-center rounded border border-border/20"></div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-6 font-body opacity-60">
         Aquí aparecerán todas tus publicaciones, imágenes y archivos guardados en formato de muro.
      </p>
    </div>
  );
}

export function AlmacenamientoTab({ userId, maxStorage, storageUsed, storageItems, setStorageItems, setStorageUsed }: any) {
  const { toast } = useToast();
  const storagePercent = maxStorage >= 9999 ? 0 : Math.min(100, (storageUsed / maxStorage) * 100);
  return (
    <div className="bg-card border border-border rounded p-4 space-y-3 text-center md:text-left animate-in fade-in">
      <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 uppercase flex items-center gap-1 justify-center md:justify-start"><HardDrive className="w-3 h-3" /> Almacenamiento</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-body"><span className="text-muted-foreground uppercase opacity-70">Usado</span><span className="text-foreground">{storageUsed.toFixed(1)} MB / {maxStorage >= 9999 ? "∞" : `${maxStorage} MB`}</span></div>
        <div className="w-full h-3 bg-muted rounded overflow-hidden border border-border"><div className={cn("h-full transition-all duration-500 rounded", storagePercent > 80 ? "bg-destructive" : "bg-neon-green")} style={{ width: `${storagePercent}%` }} /></div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[400px] text-left">
          <div className="grid grid-cols-[1fr_80px_110px_60px_30px] gap-2 text-[9px] font-pixel text-muted-foreground opacity-50 border-b pb-1 uppercase"><span>Elemento</span><span>Tipo</span><span>Fecha</span><span className="text-right">Peso</span><span></span></div>
          {storageItems.length === 0 ? <p className="text-xs text-muted-foreground font-body py-4 text-center">No hay elementos almacenados</p> : storageItems.map((item: any, i: number) => (
            <div key={i} className="grid grid-cols-[1fr_80px_110px_60px_30px] gap-2 text-xs font-body py-2 border-b border-border/30 hover:bg-muted/30 transition-colors items-center group">
              <span className="text-foreground truncate" title={item.name}>{item.name}</span><span className="text-muted-foreground text-[10px] opacity-60">{item.type}</span><span className="text-muted-foreground text-[10px] opacity-60">{item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}</span><span className="text-right text-muted-foreground text-[10px] opacity-60">{item.size < 1 ? `${Math.round(item.size * 1024)} KB` : `${item.size.toFixed(1)} MB`}</span>
              <button onClick={async () => { if (item.id) { await supabase.from(item.type === 'Foto' ? 'photos' : 'social_content').delete().eq('id', item.id); setStorageItems((prev: any) => prev.filter((_: any, idx: number) => idx !== i)); setStorageUsed((prev: any) => prev - item.size); toast({ title: "Eliminado permanentemente" }); } }} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" title="Eliminar permanentemente"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FriendsTab({ userId, limits, isStaff }: any) {
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
  useEffect(() => { fetchFriends(); }, [userId]);
  const reachedLimit = !isStaff && friends.length >= limits.maxFriends;

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="bg-card border border-neon-cyan/30 rounded p-4 text-center">
        <h3 className="font-pixel text-[10px] text-neon-cyan uppercase mb-1">Buscar Amigos</h3>
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-body mb-3"><span>Límite de amigos: {friends.length} / {limits.maxFriends >= 999 ? "∞" : limits.maxFriends}</span></div>
        <div className="flex gap-1">
          <Input value={search} onChange={e => setSearch(e.target.value)} className="h-8 bg-muted flex-1 text-xs font-body" placeholder="Nombre..." disabled={reachedLimit} />
          <Button onClick={async () => { try { const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_avatar_border, color_name").ilike("display_name", `%${search}%`).neq("user_id", userId).limit(5); setRes(data || []); } catch(e) {} }} className="h-8" disabled={reachedLimit || !search.trim()}><Search className="w-4 h-4" /></Button>
        </div>
        {reachedLimit && <p className="text-[10px] text-destructive/80 mt-2 font-body italic">Has alcanzado el límite de amigos de tu membresía.</p>}
        {res.map(r => (
          <div key={r.user_id} className="mt-2 flex justify-between items-center bg-muted/20 p-2 rounded text-xs border border-border/20">
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
                 {/* 🔥 AHORA LOS AMIGOS SON CLICKEABLES 🔥 */}
                 <Link to={`/usuario/${f.user_id}`} className="hover:underline" style={getNameStyle(f.color_name)}>{f.display_name}</Link>
                 <button onClick={async () => { await supabase.from("friend_requests").delete().or(`and(sender_id.eq.${userId},receiver_id.eq.${f.user_id}),and(sender_id.eq.${f.user_id},receiver_id.eq.${userId})`); fetchFriends(); }} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><UserMinus className="w-4 h-4" /></button>
               </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
}

export function SocialContentTab({ profile, user, onEditNetworks, limits, isStaff }: any) {
  const { toast } = useToast();
  const [contents, setContents] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchContents = async () => {
    const { data } = await supabase.from("social_content").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setContents(data);
  };
  useEffect(() => { fetchContents(); }, [user.id]);
  const reachedLimit = !isStaff && contents.length >= limits.maxSocialContent;

  const handleAddLink = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    let platform = "web"; let contentType = "post";
    const url = newUrl.toLowerCase();
    if (url.includes("youtube.com") || url.includes("youtu.be")) { platform = "youtube"; contentType = url.includes("shorts") ? "reel" : "video"; }
    else if (url.includes("instagram.com")) { platform = "instagram"; contentType = (url.includes("/reel/") || url.includes("/reels/")) ? "reel" : "post"; }
    else if (url.includes("tiktok.com")) { platform = "tiktok"; contentType = "reel"; }
    else if (url.includes("facebook.com") || url.includes("fb.watch")) { platform = "facebook"; contentType = (url.includes("/video") || url.includes("watch")) ? "video" : "post"; }
    const { error } = await supabase.from("social_content").insert({ id: crypto.randomUUID(), user_id: user.id, content_url: newUrl.trim(), title: newTitle.trim() || null, platform: platform, content_type: contentType, is_public: true } as any);
    setAdding(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } 
    else { toast({ title: "Añadido al Social Hub", description: `Clasificado como ${platform} ${contentType}` }); setNewUrl(""); setNewTitle(""); fetchContents(); }
  };

  return (
    <div className="space-y-3 animate-in fade-in">
      <div className="bg-card border rounded p-4 text-center">
        <h3 className="font-pixel text-[10px] opacity-60 mb-3 uppercase font-pixel tracking-tighter">Perfiles de Redes Sociales</h3>
        <Button variant="outline" onClick={onEditNetworks} className="w-full text-xs mb-2">Editar Vínculos de Perfil</Button>
      </div>
      <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3">
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-body"><h3 className="font-pixel text-neon-cyan uppercase">Publicar en Social Hub</h3><span>Límite: {contents.length} / {limits.maxSocialContent >= 999 ? "∞" : limits.maxSocialContent} posts</span></div>
        <Input placeholder="URL (YouTube, Instagram, TikTok, Facebook...)" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="h-8 bg-muted text-xs w-full font-body" disabled={reachedLimit} />
        {reachedLimit && <p className="text-[10px] text-destructive/80 font-body italic text-center">Has alcanzado el límite de publicaciones de tu membresía.</p>}
        <Input placeholder="Título o descripción (Opcional)" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="h-8 bg-muted text-xs w-full font-body" disabled={reachedLimit} />
        <Button size="sm" onClick={handleAddLink} disabled={adding || !newUrl.trim() || reachedLimit} className="w-full text-xs bg-neon-cyan text-black hover:bg-neon-cyan/80">{reachedLimit ? "Límite Alcanzado" : adding ? "Publicando..." : "Publicar en el Hub"}</Button>
      </div>
      <div className="space-y-2">
        <h3 className="font-pixel text-[10px] opacity-60 mb-2 uppercase text-center mt-4">Tu Contenido Publicado</h3>
        {contents.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4 font-body opacity-60">Aún no has publicado nada</p> : contents.map(c => (
            <div key={c.id} className="p-2 bg-muted/30 rounded text-xs font-body border border-border/20 flex justify-between items-center group gap-2">
               <div className="flex flex-col flex-1 min-w-0"><span className="truncate">{c.title || c.content_url}</span><span className="text-[9px] text-muted-foreground uppercase opacity-70">{c.platform} • {c.content_type}</span></div>
               <button onClick={async () => { if (!confirm("¿Eliminar esta publicación?")) return; await supabase.from("social_content").delete().eq("id", c.id); fetchContents(); }} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
        ))}
      </div>
    </div>
  );
}

function BannedContentPanel() {
  const { toast } = useToast();
  const [bannedItems, setBannedItems] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);

  const fetchBanned = async () => {
    const { data: photos } = await supabase.from("photos").select("id, user_id, image_url, caption, created_at").eq("is_banned", true);
    const { data: social } = await supabase.from("social_content").select("id, user_id, thumbnail_url, content_url, title, platform, content_type, created_at").eq("is_banned", true);
    const combined = [...(photos || []).map(p => ({ ...p, type: 'photo', display_url: p.image_url, display_title: p.caption })), ...(social || []).map(s => ({ ...s, type: 'social', display_url: s.thumbnail_url || s.content_url, display_title: s.title }))].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setBannedItems(combined);
  };
  useEffect(() => { if (expanded) fetchBanned(); }, [expanded]);

  const handleRestore = async (item: any) => {
    const table = item.type === 'photo' ? 'photos' : 'social_content';
    const { error } = await supabase.from(table).update({ is_banned: false }).eq("id", item.id);
    if (!error) { toast({ title: "Restaurado" }); setBannedItems(prev => prev.filter(i => i.id !== item.id)); } else { toast({ title: "Error", variant: "destructive" }); }
  };
  const handleDelete = async (item: any) => {
    if (!confirm("¿Eliminar permanentemente este contenido? No se puede deshacer.")) return;
    const table = item.type === 'photo' ? 'photos' : 'social_content';
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (!error) { toast({ title: "Eliminado definitivamente" }); setBannedItems(prev => prev.filter(i => i.id !== item.id)); } else { toast({ title: "Error", variant: "destructive" }); }
  };

  return (
    <div className="bg-card border rounded p-4 mt-4 border-destructive/30">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex justify-between font-pixel text-[10px] text-destructive uppercase items-center"><span>Contenido Oculto / Baneado ({bannedItems.length})</span><span className="text-xs">{expanded ? "▲" : "▼"}</span></button>
      {expanded && (
        <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1 retro-scrollbar">
          {bannedItems.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-2 uppercase opacity-60">No hay contenido baneado</p> : bannedItems.map(item => (
              <div key={item.id} className="flex gap-2 bg-muted/20 p-2 rounded border border-destructive/20 items-center">
                <div className="w-12 h-12 bg-black shrink-0 rounded overflow-hidden flex items-center justify-center border border-white/10">{item.display_url ? <img src={item.display_url} className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" /> : <Ban className="w-4 h-4 text-muted-foreground" />}</div>
                <div className="flex-1 min-w-0"><p className="text-[10px] font-body text-foreground truncate">{item.display_title || "Sin título"}</p><p className="text-[8px] text-muted-foreground uppercase">{item.type} • {new Date(item.created_at).toLocaleDateString()}</p></div>
                <div className="flex flex-col gap-1 shrink-0"><Button size="sm" variant="outline" onClick={() => handleRestore(item)} className="h-5 text-[8px] px-2 text-neon-green hover:text-neon-green hover:bg-neon-green/10 border-neon-green/30">Restaurar</Button><Button size="sm" variant="destructive" onClick={() => handleDelete(item)} className="h-5 text-[8px] px-2">Eliminar</Button></div>
              </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeratorList({ isMasterWeb }: { isMasterWeb: boolean }) {
  const [moderators, setModerators] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    supabase.from("user_roles").select("id, user_id").eq("role", "moderator").then(async ({ data }) => {
        if (!data || data.length === 0) return;
        const ids = data.map(r => r.user_id);
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
        setModerators(data.map(r => ({ ...r, display_name: profs?.find(p => p.user_id === r.user_id)?.display_name })));
    });
  }, []);

  return (
    <div className="bg-card border rounded p-4">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex justify-between font-pixel text-[10px] text-neon-magenta uppercase items-center"><span>Moderadores Activos ({moderators.length})</span><span className="text-xs">{expanded ? "▲" : "▼"}</span></button>
      {expanded && (
        <div className="mt-2 space-y-1">
          {moderators.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-2 uppercase opacity-60">Sin moderadores</p> : moderators.map(m => (
              <div key={m.id} className="flex justify-between items-center text-xs bg-muted/20 p-2 rounded">
                <span className="font-body">{m.display_name}</span>
                {isMasterWeb && <button onClick={async () => { await supabase.from("user_roles").delete().eq("id", m.id); setModerators(prev => prev.filter(x => x.id !== m.id)); }} className="text-destructive text-[10px] underline hover:no-underline">Revocar</button>}
              </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ModerationPanel({ isStaff, isMasterWeb }: { isStaff: boolean; isMasterWeb: boolean }) {
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
      supabase.from("banned_users").select("id, user_id, reason, ban_type, created_at").then(async ({ data }) => {
          if (!data || data.length === 0) { setBannedUsers([]); return; }
          const ids = data.map(b => b.user_id);
          const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
          setBannedUsers(data.map(b => ({ ...b, display_name: profs?.find(p => p.user_id === b.user_id)?.display_name || "Desconocido" })));
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
        <button onClick={() => setExpandedBanned(!expandedBanned)} className="w-full flex justify-between font-pixel text-[10px] text-destructive uppercase items-center"><span>Usuarios Sancionados ({expandedBanned ? bannedUsers.length : "?"})</span><span className="text-xs">{expandedBanned ? "▲" : "▼"}</span></button>
        {expandedBanned && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1 retro-scrollbar">
            {bannedUsers.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-2 uppercase opacity-60">No hay usuarios sancionados</p> : bannedUsers.map(b => (
                <div key={b.id} className="flex flex-col bg-muted/20 p-2.5 rounded border border-destructive/20 gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold font-body text-foreground">{b.display_name}</span>
                    <span className={cn("text-[9px] font-pixel px-1.5 py-0.5 rounded", b.ban_type === 'kick' ? "bg-neon-orange/20 text-neon-orange" : "bg-destructive/20 text-destructive")}>{b.ban_type === 'kick' ? 'KICK' : 'BAN'}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-body leading-tight">Razón: {b.reason || "Sin especificar"}</p>
                  <div className="flex justify-between items-end mt-1">
                    <span className="text-[8px] text-muted-foreground/60">{new Date(b.created_at).toLocaleDateString()}</span>
                    <button onClick={() => handleUnban(b.id)} className="text-neon-green hover:text-neon-green/80 text-[9px] font-body flex items-center gap-1 border border-neon-green/30 px-1.5 py-0.5 rounded hover:bg-neon-green/10 transition-colors"><Unlock className="w-2.5 h-2.5" /> Revocar</button>
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
              <button key={t} onClick={() => setSelectedTier(t)} className={cn("px-2 py-1 rounded text-[10px] border transition-colors", selectedTier === t ? "bg-neon-yellow text-black border-neon-yellow" : "bg-muted border-border hover:border-neon-yellow/50")}>{t.toUpperCase()}</button>
            ))}
          </div>
          <Button size="sm" onClick={async () => { if (!membershipSearch.trim()) return; const { data: tp } = await supabase.from("profiles").select("user_id").ilike("display_name", membershipSearch).maybeSingle(); if (!tp) { toast({ title: "No encontrado", variant: "destructive" }); return; } const { error } = await supabase.from("profiles").update({ membership_tier: selectedTier } as any).eq("user_id", tp.user_id); if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } else { setMembershipSearch(""); toast({ title: "Membresía actualizada" }); } }} className="w-full bg-neon-yellow/20 text-neon-yellow hover:bg-neon-yellow/30 border border-neon-yellow/30 transition-colors">Actualizar</Button>
        </div>
      )}
    </div>
  );
}