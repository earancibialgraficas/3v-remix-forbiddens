import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { User, Trophy, Star, Instagram, Youtube, Globe, Calendar, UserPlus, UserMinus, MessageSquare, Gamepad2, Users, Ban, Flag, Bookmark, Shield, Trash2, Copy, User as UserIcon, Clock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import RoleBadge from "@/components/RoleBadge";
import { getAvatarBorderStyle, getNameStyle, getRoleStyle } from "@/lib/profileAppearance";
import { useFriendIds } from "@/hooks/useFriendIds";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits";
import { getCategoryRoute } from "@/lib/categoryRoutes";

interface PublicProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  membership_tier: string;
  total_score: number;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  role_icon: string | null;
  show_role_icon: boolean | null;
  created_at: string;
  color_avatar_border: string | null;
  color_name: string | null;
  color_role: string | null;
  color_staff_role: string | null;
}

// 🔥 UTILIDADES PARA MINIATURAS SINCRONIZADAS Y CARRUSEL 🔥
const getSeedFromId = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash);
};

const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('wsrv.nl') || url.includes('supabase.co') || url.includes('pollinations.ai')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

const getPostThumbnail = (post: any) => {
  const content = post.content || '';
  const imgMatch = content.match(/!\[.*?\]\((.*?)\)/);
  if (imgMatch && imgMatch[1]) return imgMatch[1];
  const rawImgMatch = content.match(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/i);
  if (rawImgMatch && rawImgMatch[0]) return rawImgMatch[0];
  const idSeed = getSeedFromId(post.id);
  const title = (post.title || 'Foro').replace(/[^a-zA-Z0-9 ]/g, '');
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(title.substring(0, 50) + " digital art neon")}?width=400&height=400&nologo=true&seed=${idSeed}`;
};

const getSocialThumbnail = (item: any) => {
  if (item.target_type === 'photo' || item.image_url) return getProxyUrl(item.image_url);
  
  let origContentUrl = item.content_url || '';
  const isVideoExt = (url: string) => url && url.match(/\.(mp4|webm|ogg)/i);
  const idSeed = getSeedFromId(item.id);

  const ytMatch = origContentUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  
  if (item.tiktok_thumb) return getProxyUrl(item.tiktok_thumb);
  if (item.facebook_thumb) return getProxyUrl(item.facebook_thumb);

  if (origContentUrl.includes('instagram.com')) {
     const igMatch = origContentUrl.match(/instagram\.com\/(?:p|reel|reels)\/([\w-]+)/);
     if (igMatch) return getProxyUrl(`https://www.instagram.com/p/${igMatch[1]}/media/?size=l`);
  }

  if (item.thumbnail_url && !isVideoExt(item.thumbnail_url)) return getProxyUrl(item.thumbnail_url);
  
  const title = (item.title || item.caption || 'Content').replace(/[^a-zA-Z0-9 ]/g, '');
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(title.substring(0, 50) + " cyberpunk neon grid")}?width=400&height=400&nologo=true&seed=${idSeed}`;
};

const isVideoItem = (item: any) => {
  const url = item.content_url || '';
  return Boolean(url.match(/\.(mp4|webm|ogg)/i) || url.includes("youtube.com") || url.includes("youtu.be") || url.includes("tiktok.com") || url.includes("instagram.com") || url.includes("facebook.com") || url.includes("fb.watch"));
};

const getTimeAgo = (dateString: string) => {
  if (!dateString) return "Recientemente";
  const safeDateStr = dateString.includes('T') && !dateString.endsWith('Z') && !dateString.includes('+') ? dateString + 'Z' : dateString;
  const date = new Date(safeDateStr);
  if (date.getFullYear() <= 1970) return "Recientemente";

  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  
  let interval = seconds / 31536000;
  if (interval >= 1) return `hace ${Math.floor(interval)} ${Math.floor(interval) === 1 ? "año" : "años"}`;
  
  interval = seconds / 2592000;
  if (interval >= 1) return `hace ${Math.floor(interval)} ${Math.floor(interval) === 1 ? "mes" : "meses"}`;
  
  interval = seconds / 86400;
  if (interval >= 1) {
      if (Math.floor(interval) === 1) return "ayer";
      return `hace ${Math.floor(interval)} días`;
  }
  
  interval = seconds / 3600;
  if (interval >= 1) return `hace ${Math.floor(interval)} ${Math.floor(interval) === 1 ? "hr" : "hrs"}`;
  
  interval = seconds / 60;
  if (interval >= 1) return `hace ${Math.floor(interval)} min`;
  
  return "hace un momento";
};

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, profile: currentUserProfile, roles: currentUserRoles, isMasterWeb, isAdmin } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [gameScores, setGameScores] = useState<{ game_name: string; console_type: string; score: number }[]>([]);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_sent" | "pending_received" | "accepted">("none");
  
  const [socialContentCount, setSocialContentCount] = useState(0);
  const [totalForumPosts, setTotalForumPosts] = useState(0);
  
  // 🔥 NUEVO ESTADO PARA EL CARRUSEL DEL SOCIAL HUB 🔥
  const [userSocialMedia, setUserSocialMedia] = useState<any[]>([]);

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const isCurrentUserStaff = isMasterWeb || isAdmin || (currentUserRoles || []).includes("moderator");
  const currentUserTier = (currentUserProfile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const currentUserLimits = isCurrentUserStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[currentUserTier];
  const reachedFriendLimit = !isCurrentUserStaff && friendIds.length >= currentUserLimits.maxFriends;

  useEffect(() => {
    if (!userId) return;
    const fetchProfile = async () => {
      const [{ data: p }, { data: r }, { count: followers }, { count: following }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
      ]);
      if (p) setProfile(p as unknown as PublicProfile);
      if (r) setRoles((r as any[]).map(x => x.role));
      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);

      if (user && user.id !== userId) {
        const { data: f } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle();
        setIsFollowing(!!f);
        
        const { data: sentReq } = await supabase.from("friend_requests").select("id, status").eq("sender_id", user.id).eq("receiver_id", userId).maybeSingle();
        const { data: recvReq } = await supabase.from("friend_requests").select("id, status").eq("sender_id", userId).eq("receiver_id", user.id).maybeSingle();
        if (sentReq) setFriendStatus((sentReq as any).status === "accepted" ? "accepted" : "pending_sent");
        else if (recvReq) setFriendStatus((recvReq as any).status === "accepted" ? "accepted" : "pending_received");
        else setFriendStatus("none");
      }

      // 🔥 OBTENEMOS TAMBIÉN EL CONTENIDO SOCIAL Y FOTOS PARA EL CARRUSEL 🔥
      const [
        { data: scores }, 
        { data: posts }, 
        { count: socialCount }, 
        { count: photosCount }, 
        { count: forumPostsCount },
        { data: rawSocialContent },
        { data: rawPhotos }
      ] = await Promise.all([
        supabase.from("leaderboard_scores").select("game_name, console_type, score").eq("user_id", userId).order("score", { ascending: false }),
        supabase.from("posts").select("id, title, content, category, upvotes, created_at").eq("user_id", userId).neq("is_banned", true).order("created_at", { ascending: false }).limit(20),
        supabase.from("social_content").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("photos").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("is_banned", true),
        supabase.from("social_content").select("*").eq("user_id", userId).eq("is_public", true).neq("is_banned", true).order("created_at", { ascending: false }).limit(15),
        supabase.from("photos").select("*").eq("user_id", userId).neq("is_banned", true).order("created_at", { ascending: false }).limit(15)
      ]);
      
      if (scores) setGameScores(scores as any);
      if (posts) setUserPosts(posts);
      setSocialContentCount((socialCount || 0) + (photosCount || 0));
      setTotalForumPosts(forumPostsCount || 0);
      
      // Armamos el array combinado para el carrusel y pedimos oEmbed si es necesario (TikTok/FB)
      let combinedSocial = [];
      if (rawSocialContent) combinedSocial.push(...rawSocialContent.map(s => ({...s, target_type: 'social_content'})));
      if (rawPhotos) combinedSocial.push(...rawPhotos.map(p => ({...p, target_type: 'photo'})));
      
      combinedSocial.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const finalSocialData = await Promise.all(combinedSocial.map(async (item: any) => {
         if (item.target_type === 'social_content') {
            const url = item.content_url || '';
            if (url.includes('tiktok.com')) {
               try {
                  const res = await fetch(`https://www.tiktok.com/oembed?url=${url}`);
                  const json = await res.json();
                  if (json.thumbnail_url) item.tiktok_thumb = json.thumbnail_url;
               } catch(e) {}
            } else if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) {
               let fbThumbFound = false;
               try {
                  const res = await fetch(`https://www.facebook.com/plugins/video/oembed.json/?url=${encodeURIComponent(url)}`);
                  if (res.ok) {
                     const json = await res.json();
                     if (json.thumbnail_url) { item.facebook_thumb = json.thumbnail_url; fbThumbFound = true; }
                  }
               } catch(e) {}
               if (!fbThumbFound) {
                   try {
                       const fallbackRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
                       if (fallbackRes.ok) {
                           const fallbackJson = await fallbackRes.json();
                           if (fallbackJson.data?.image?.url) item.facebook_thumb = fallbackJson.data.image.url;
                       }
                   } catch(e) {}
               }
            }
         }
         return item;
      }));
      
      setUserSocialMedia(finalSocialData);
      setLoading(false);
    };
    fetchProfile();
  }, [userId, user]);

  const handleFollow = async () => {
    if (!user || !userId) { toast({ title: "Inicia sesión para seguir", variant: "destructive" }); return; }
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount(p => wasFollowing ? p - 1 : p + 1);

    if (wasFollowing) {
      const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      if (error) { setIsFollowing(wasFollowing); setFollowerCount(p => p + 1); toast({ title: "Error" }); }
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      if (error) { setIsFollowing(wasFollowing); setFollowerCount(p => p - 1); toast({ title: "Error" }); }
    }
  };

  const handleFriendRequest = async () => {
    if (!user || !userId) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
    if (friendStatus === "none") {
      if (reachedFriendLimit) { toast({ title: "Límite Alcanzado", variant: "destructive" }); return; }
      const { error } = await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: userId } as any);
      if (!error) { setFriendStatus("pending_sent"); toast({ title: "Solicitud enviada" }); }
    } else if (friendStatus === "pending_received") {
      if (reachedFriendLimit) { toast({ title: "Límite Alcanzado", variant: "destructive" }); return; }
      const { error } = await supabase.from("friend_requests").update({ status: "accepted" } as any).eq("sender_id", userId).eq("receiver_id", user.id);
      if (!error) { setFriendStatus("accepted"); toast({ title: "Amistad aceptada" }); }
    } else if (friendStatus === "accepted" || friendStatus === "pending_sent") {
      const { error } = await supabase.from("friend_requests").delete().or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`);
      if (!error) { setFriendStatus("none"); toast({ title: "Acción completada" }); }
    }
  };

  const handleSavePost = async (post: any) => {
    if (!user) return;
    const thumb = getPostThumbnail(post);
    try { 
      const { error } = await supabase.from("saved_items" as any).insert({ 
        user_id: user.id, item_type: 'post', original_id: post.id,
        title: post.title || 'Post del Foro', 
        thumbnail_url: thumb,
        redirect_url: getCategoryRoute(post.category, post.id)
      }); 
      if (error && error.code === '23505') toast({ title: "Aviso", description: "Ya tienes esta publicación guardada." });
      else if (!error) toast({ title: "¡Guardado en tu Perfil!" }); 
    } catch (e) { }
  };

  const handleHidePost = async (postId: string) => {
    const { error } = await supabase.from("posts").update({ is_banned: true } as any).eq("id", postId);
    if (!error) { toast({ title: "Post ocultado." }); setUserPosts(prev => prev.filter(p => p.id !== postId)); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("¿Eliminar permanentemente?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) { toast({ title: "Post eliminado" }); setUserPosts(prev => prev.filter(p => p.id !== postId)); }
  };

  if (loading) return <div className="p-8 text-center text-xs text-muted-foreground font-body animate-fade-in">Cargando perfil...</div>;
  if (!profile) return <div className="p-8 text-center text-xs text-muted-foreground font-body">Perfil no encontrado</div>;

  const isStaffVisual = roles.includes("master_web") || roles.includes("admin") || roles.includes("moderator");
  
  const getSafeMemberDate = (dateStr: string) => {
    if (!dateStr) return "Recientemente";
    const date = new Date(dateStr);
    if (date.getFullYear() <= 1970) return "Recientemente";
    return date.toLocaleDateString("es-ES", { year: "numeric", month: "long" });
  };

  const getSafePostDate = (dateStr: string) => {
    if (!dateStr) return "Recientemente";
    const date = new Date(dateStr);
    if (date.getFullYear() <= 1970) return "Recientemente";
    return date.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const memberSince = getSafeMemberDate(profile.created_at);
  const bestScores = Object.values(gameScores.reduce<Record<string, any>>((acc, gs) => {
    const key = `${gs.game_name}-${gs.console_type}`;
    if (!acc[key] || gs.score > acc[key].score) acc[key] = gs;
    return acc;
  }, {}));
  const totalScoreValue = bestScores.reduce((sum, gs) => sum + gs.score, 0);
  const displayTier = isStaffVisual ? "STAFF" : profile.membership_tier.toUpperCase();

  return (
    <div className="space-y-4 animate-fade-in max-w-[1200px] mx-auto px-4 pb-20">
      
      {/* HEADER PERFIL */}
      <div className="bg-card border border-neon-cyan/30 rounded p-6 shadow-lg">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-2xl border-2 border-neon-cyan/30 overflow-hidden shrink-0 shadow-neon-sm" style={getAvatarBorderStyle(profile.color_avatar_border)}>
            {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-12 h-12 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
              <h2 className="font-pixel text-xl text-neon-cyan" style={getNameStyle(profile.color_name)}>{profile.display_name}</h2>
              <RoleBadge roles={roles} roleIcon={profile.role_icon} showIcon={profile.show_role_icon !== false} colorStaffRole={profile.color_staff_role} />
            </div>
            <p className="text-sm text-muted-foreground font-body italic mb-3">"{profile.bio || "Este usuario prefiere mantener el misterio..."}"</p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
               <span className="text-[10px] font-pixel text-neon-yellow flex items-center gap-1" style={getRoleStyle(profile.color_role)}><Star className="w-3.5 h-3.5" /> {displayTier}</span>
               <span className="text-[10px] font-body text-neon-green flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> {Math.max(profile.total_score, totalScoreValue).toLocaleString()} pts</span>
               <span className="text-[10px] font-body text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Miembro desde {memberSince}</span>
            </div>
            {user && user.id !== userId && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={handleFollow} className="h-8 text-[10px] font-pixel uppercase">{isFollowing ? "Dejar de seguir" : "Seguir"}</Button>
                <Button size="sm" variant={friendStatus === "none" ? "default" : "outline"} onClick={handleFriendRequest} disabled={friendStatus === "none" && reachedFriendLimit} className="h-8 text-[10px] font-pixel uppercase">
                  {friendStatus === "none" && (reachedFriendLimit ? "Límite Lleno" : "Añadir amigo")}
                  {friendStatus === "pending_sent" && "Pendiente"}
                  {friendStatus === "pending_received" && "Aceptar Amigo"}
                  {friendStatus === "accepted" && "Amigos ✓"}
                </Button>
                <Button size="sm" variant="outline" asChild className="h-8 text-[10px] font-pixel uppercase"><Link to={`/mensajes?to=${userId}`}>Mensaje</Link></Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS (Ahora con auto-fit para que no se desborden las letras) */}
      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 flex items-center gap-2"><Star className="w-4 h-4" /> ESTADÍSTICAS</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { val: Math.max(profile.total_score, totalScoreValue).toLocaleString(), label: "Puntos", color: "text-neon-green" },
            { val: followerCount, label: "Seguidores", color: "text-foreground" },
            { val: followingCount, label: "Siguiendo", color: "text-foreground" },
            { val: totalForumPosts, label: "Posts Foro", color: "text-neon-cyan" },
            { val: socialContentCount, label: "Posts Social", color: "text-neon-yellow" },
            { val: bestScores.length, label: "Juegos", color: "text-neon-orange" },
            { 
              val: displayTier, 
              label: "Membresía", 
              color: isStaffVisual ? "text-neon-green drop-shadow-[0_0_8px_rgba(57,255,20,0.8)] animate-pulse" : "text-muted-foreground" 
            },
          ].map((s, i) => (
            <div key={i} className="bg-muted/20 border border-white/5 rounded p-3 text-center flex flex-col justify-center min-h-[75px] hover:bg-muted/40 transition-colors w-full break-words min-w-0">
              <p className={cn("text-lg sm:text-xl font-bold font-body break-words", s.color)}>{s.val}</p>
              <p className="text-[9px] text-muted-foreground font-pixel uppercase mt-1.5 break-words leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* PUNTAJES POR JUEGO */}
        <div className="bg-card border border-border rounded p-4 flex flex-col h-fit">
          <h3 className="font-pixel text-[10px] text-neon-green mb-3 flex items-center gap-2"><Gamepad2 className="w-4 h-4" /> PUNTAJES POR JUEGO</h3>
          <div className="space-y-1 max-h-[250px] md:max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
            {bestScores.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-4 italic font-body">No tiene récords registrados</p> : 
              bestScores.map((gs, i) => (
                <div key={i} className="flex items-center gap-2 bg-muted/20 border border-white/5 rounded px-3 py-2 text-xs font-body hover:bg-muted/40 transition-colors">
                  <span className={cn("font-pixel text-[8px] px-1.5 py-0.5 rounded shrink-0", gs.console_type === "nes" ? "bg-neon-green/10 text-neon-green" : gs.console_type === "snes" ? "bg-neon-cyan/10 text-neon-cyan" : "bg-neon-magenta/10 text-neon-magenta")}>{gs.console_type.toUpperCase()}</span>
                  <span className="flex-1 text-foreground truncate font-medium">{gs.game_name}</span>
                  <span className="text-neon-green font-bold drop-shadow-sm shrink-0">{gs.score.toLocaleString()}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* POSTS RECIENTES */}
        <div className="bg-card border border-border rounded p-4 flex flex-col h-fit">
          <h3 className="font-pixel text-[10px] text-neon-cyan mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> ACTIVIDAD DEL FORO</h3>
          <div className="space-y-2 max-h-[250px] md:max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
            {userPosts.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-4 italic font-body">No ha publicado en el foro aún</p> : 
              userPosts.map((post) => {
                const thumb = getPostThumbnail(post);
                return (
                  <div key={post.id} className="p-2 border border-border/50 rounded flex gap-3 font-body hover:bg-muted/30 transition-all group relative overflow-hidden">
                    <div className="w-16 h-16 shrink-0 rounded overflow-hidden border border-neon-cyan/30 bg-black relative shadow-sm">
                       <img src={getProxyUrl(thumb)} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <Link to={getCategoryRoute(post.category, post.id)} className="text-[11px] font-bold text-foreground hover:text-neon-cyan hover:underline line-clamp-2 leading-snug">{post.title}</Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-1" title={getSafePostDate(post.created_at)}><Clock className="w-3 h-3" /> {getTimeAgo(post.created_at)}</span>
                        <span className="text-neon-green font-bold">▲ {post.upvotes || 0}</span>
                        <span className="uppercase text-[8px] bg-muted/50 px-1 rounded border border-white/5">{post.category?.replace(/-/g, ' ') || "Foro"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 items-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {user && <button onClick={() => handleSavePost(post)} className="p-1.5 text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/10 rounded transition-colors" title="Guardar"><Bookmark className="w-3.5 h-3.5" /></button>}
                      {isCurrentUserStaff && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><button className="p-1.5 text-muted-foreground hover:text-neon-magenta hover:bg-neon-magenta/10 rounded transition-colors"><Shield className="w-3.5 h-3.5" /></button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border">
                            <DropdownMenuItem onClick={() => handleHidePost(post.id)} className="text-neon-orange cursor-pointer"><Ban className="w-3 h-3 mr-2" /> Ocultar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-destructive cursor-pointer"><Trash2 className="w-3 h-3 mr-2" /> Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>

      {/* 🔥 NUEVO: CARRUSEL HORIZONTAL DEL SOCIAL HUB 🔥 */}
      {userSocialMedia.length > 0 && (
        <div className="bg-card border border-border rounded p-4 mt-4 overflow-hidden">
           <div className="flex justify-between items-end mb-4">
              <h3 className="font-pixel text-[10px] text-neon-magenta flex items-center gap-2 uppercase">
                <Globe className="w-4 h-4" /> Actividad Social Hub
              </h3>
              <span className="text-[10px] font-body text-muted-foreground">Últimos {userSocialMedia.length} posts</span>
           </div>
           
           {/* Contenedor con Scroll Horizontal Responsivo */}
           <div className="flex overflow-x-auto gap-3 pb-4 pt-1 px-1 custom-scrollbar snap-x snap-mandatory">
              {userSocialMedia.map((item) => {
                 const isVideo = isVideoItem(item);
                 const borderStyle = isVideo ? "border-[#ff6b00]" : "border-[#00f0ff]";
                 const destRoute = item.target_type === 'photo' ? `/social/fotos?post=${item.id}` : `/social/reels?post=${item.id}`;
                 
                 return (
                   <div 
                     key={item.id} 
                     onClick={() => navigate(destRoute)}
                     className={cn(
                       "relative shrink-0 cursor-pointer snap-center group rounded-lg bg-black overflow-hidden shadow-sm hover:shadow-md transition-all hover:scale-[1.02]",
                       "w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] md:w-[180px] md:h-[180px]",
                       "border", borderStyle
                     )}
                   >
                     <img 
                       src={getSocialThumbnail(item)} 
                       alt="Thumbnail" 
                       className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                       loading="lazy" 
                     />
                     {isVideo && (
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                         <PlayCircle className="w-8 h-8 text-white/80 drop-shadow-md group-hover:scale-110 transition-transform" />
                       </div>
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 z-20">
                       <p className="text-[9px] font-body text-white font-bold line-clamp-2 leading-tight drop-shadow-md">
                         {item.title || item.caption || "Ver post"}
                       </p>
                     </div>
                   </div>
                 );
              })}
           </div>
        </div>
      )}

    </div>
  );
}