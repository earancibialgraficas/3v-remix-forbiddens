import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { User, Trophy, Star, Instagram, Youtube, Globe, Calendar, UserPlus, UserMinus, MessageSquare, Gamepad2, Users, Ban, Flag, Bookmark, Shield, Trash2, Copy, User as UserIcon, Clock } from "lucide-react";
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

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
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

  // Lógica de límites de amigos
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
        const { data: recvReq = null } = await supabase.from("friend_requests").select("id, status").eq("sender_id", userId).eq("receiver_id", user.id).maybeSingle();
        if (sentReq) setFriendStatus((sentReq as any).status === "accepted" ? "accepted" : "pending_sent");
        else if (recvReq) setFriendStatus((recvReq as any).status === "accepted" ? "accepted" : "pending_received");
        else setFriendStatus("none");
      }

      const [
        { data: scores }, 
        { data: posts }, 
        { count: socialCount }, 
        { count: photosCount }, 
        { count: forumPostsCount }
      ] = await Promise.all([
        supabase.from("leaderboard_scores").select("game_name, console_type, score").eq("user_id", userId).order("score", { ascending: false }),
        supabase.from("posts").select("id, title, category, upvotes, created_at").eq("user_id", userId).neq("is_banned", true).order("created_at", { ascending: false }).limit(10),
        supabase.from("social_content").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("photos").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("is_banned", true)
      ]);
      
      if (scores) setGameScores(scores as any);
      if (posts) setUserPosts(posts);
      setSocialContentCount((socialCount || 0) + (photosCount || 0));
      setTotalForumPosts(forumPostsCount || 0);
      
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
      if (error) {
        setIsFollowing(wasFollowing); setFollowerCount(p => p + 1);
        toast({ title: "Error al dejar de seguir", description: error.message, variant: "destructive" });
      }
    } else {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      if (error) {
        setIsFollowing(wasFollowing); setFollowerCount(p => p - 1);
        toast({ title: "Error al seguir", description: error.message, variant: "destructive" });
      }
    }
  };

  const handleFriendRequest = async () => {
    if (!user || !userId) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
    
    if (friendStatus === "none") {
      if (reachedFriendLimit) {
        toast({ title: "Límite de Membresía", description: `Tu plan permite un máximo de ${currentUserLimits.maxFriends} amigos.`, variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("friend_requests").insert({ sender_id: user.id, receiver_id: userId } as any);
      if (error) toast({ title: "Error al enviar solicitud", description: error.message, variant: "destructive" });
      else { setFriendStatus("pending_sent"); toast({ title: "Solicitud enviada" }); }
    } else if (friendStatus === "pending_received") {
      if (reachedFriendLimit) {
        toast({ title: "Límite de Membresía", description: `Has alcanzado el límite de ${currentUserLimits.maxFriends} amigos.`, variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("friend_requests").update({ status: "accepted" } as any).eq("sender_id", userId).eq("receiver_id", user.id);
      if (error) toast({ title: "Error al aceptar solicitud", description: error.message, variant: "destructive" });
      else { setFriendStatus("accepted"); toast({ title: "Amistad aceptada" }); }
    } else if (friendStatus === "accepted" || friendStatus === "pending_sent") {
      const { error } = await supabase.from("friend_requests").delete().or(`and(sender_id.eq.${user.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user.id})`);
      if (error) toast({ title: "Error al cancelar/eliminar", description: error.message, variant: "destructive" });
      else { setFriendStatus("none"); toast({ title: friendStatus === "accepted" ? "Amistad eliminada" : "Solicitud cancelada" }); }
    }
  };

  const handleSavePost = async (post: any) => {
    if (!user) return;
    try { 
      const { error } = await supabase.from("saved_items" as any).insert({ 
        user_id: user.id, item_type: 'post', original_id: post.id,
        title: post.title || 'Post del Foro', redirect_url: getCategoryRoute(post.category, post.id)
      }); 
      if (error && error.code === '23505') toast({ title: "Aviso", description: "Ya tienes esta publicación guardada." });
      else if (!error) toast({ title: "¡Guardado en tu Perfil!" }); 
    } catch (e) { }
  };

  const handleHidePost = async (postId: string) => {
    const { error } = await supabase.from("posts").update({ is_banned: true } as any).eq("id", postId);
    if (!error) { toast({ title: "Post ocultado." }); setUserPosts(prev => prev.filter(p => p.id !== postId)); }
    else { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta publicación permanentemente?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) { toast({ title: "Post eliminado" }); setUserPosts(prev => prev.filter(p => p.id !== postId)); }
    else { toast({ title: "Error", variant: "destructive" }); }
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
    return date.toLocaleDateString(); 
  };

  const memberSince = getSafeMemberDate(profile.created_at);

  const bestScores = Object.values(
    gameScores.reduce<Record<string, { game_name: string; console_type: string; score: number }>>((acc, gs) => {
      const key = `${gs.game_name}-${gs.console_type}`;
      if (!acc[key] || gs.score > acc[key].score) acc[key] = gs;
      return acc;
    }, {})
  );
  const totalScore = bestScores.reduce((sum, gs) => sum + gs.score, 0);
  const displayTier = isStaffVisual ? "STAFF" : profile.membership_tier.toUpperCase();

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-cyan/30 rounded p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl border-2 border-neon-cyan/30 overflow-hidden shrink-0" style={getAvatarBorderStyle(profile.color_avatar_border)}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-pixel text-base text-neon-cyan" style={getNameStyle(profile.color_name)}>{profile.display_name}</h2>
              <RoleBadge roles={roles} roleIcon={profile.role_icon} showIcon={profile.show_role_icon !== false} colorStaffRole={profile.color_staff_role} />
            </div>
            <p className="text-xs text-muted-foreground font-body mt-1">{profile.bio || "Sin descripción"}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {isStaffVisual ? (
                <span className="text-[10px] font-pixel text-neon-magenta flex items-center gap-1" style={getRoleStyle(profile.color_staff_role)}>
                  {roles.includes("master_web") ? "DIOS TODOPODEROSO" : "MÍTICO"}
                </span>
              ) : (
                <span className="text-[10px] font-pixel text-neon-yellow flex items-center gap-1" style={getRoleStyle(profile.color_role)}>
                  <Star className="w-3 h-3" /> {profile.membership_tier.toUpperCase()}
                </span>
              )}
              <span className="text-[10px] font-body text-neon-green flex items-center gap-1">
                <Trophy className="w-3 h-3" /> {Math.max(profile.total_score, totalScore).toLocaleString()} pts
              </span>
              <span className="text-[10px] font-body text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Desde {memberSince}
              </span>
              <span className="text-[10px] font-body text-neon-cyan flex items-center gap-1">
                <UserPlus className="w-3 h-3" /> {followerCount} seguidores · {followingCount} siguiendo
              </span>
            </div>
            {(profile.instagram_url || profile.youtube_url || profile.tiktok_url) && (
              <div className="flex gap-3 mt-2">
                {profile.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noopener" className="text-neon-magenta hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Instagram className="w-3.5 h-3.5" /> Instagram</a>}
                {profile.youtube_url && <a href={profile.youtube_url} target="_blank" rel="noopener" className="text-destructive hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Youtube className="w-3.5 h-3.5" /> YouTube</a>}
                {profile.tiktok_url && <a href={profile.tiktok_url} target="_blank" rel="noopener" className="text-neon-cyan hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Globe className="w-3.5 h-3.5" /> TikTok</a>}
              </div>
            )}
            {user && user.id !== userId && (
              <div className="flex gap-2 mt-3 flex-wrap">
                <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={handleFollow} className="text-xs gap-1">
                  {isFollowing ? <><UserMinus className="w-3 h-3" /> Dejar de seguir</> : <><UserPlus className="w-3 h-3" /> Seguir</>}
                </Button>
                
                <Button 
                  size="sm" 
                  variant={friendStatus === "none" ? "default" : "outline"} 
                  onClick={handleFriendRequest} 
                  disabled={friendStatus === "none" && reachedFriendLimit}
                  className="text-xs gap-1"
                >
                  <Users className="w-3 h-3" />
                  {friendStatus === "none" && (reachedFriendLimit ? "Límite Amigos" : "Añadir amigo")}
                  {friendStatus === "pending_sent" && "Solicitud enviada"}
                  {friendStatus === "pending_received" && "Aceptar amistad"}
                  {friendStatus === "accepted" && "Amigos ✓"}
                </Button>

                <Button size="sm" variant="outline" asChild className="text-xs gap-1">
                  <Link to={`/mensajes?to=${userId}`}><MessageSquare className="w-3 h-3" /> Enviar Mensaje</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">ESTADÍSTICAS</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { val: Math.max(profile.total_score, totalScore).toLocaleString(), label: "Puntos", color: "text-neon-green" },
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
            <div key={i} className="bg-muted/30 rounded p-3 text-center flex flex-col justify-center min-h-[70px]">
              <p className={cn("text-lg font-bold font-body", s.color)}>{s.val}</p>
              <p className="text-[10px] text-muted-foreground font-body uppercase mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {bestScores.length > 0 && (
        <div className="bg-card border border-border rounded p-4">
          <h3 className="font-pixel text-[10px] text-neon-green mb-2 flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" /> PUNTAJES POR JUEGO
          </h3>
          {/* 🔥 SECCIÓN CON LÍMITE DE ALTURA Y SCROLL 🔥 */}
          <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
            {bestScores.map((gs, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/30 rounded px-3 py-1.5 text-xs font-body">
                <span className={cn("font-pixel text-[9px]", gs.console_type === "nes" ? "text-neon-green" : gs.console_type === "snes" ? "text-neon-cyan" : "text-neon-magenta")}>
                  {gs.console_type.toUpperCase()}
                </span>
                <span className="flex-1 text-foreground truncate">{gs.game_name}</span>
                <span className="text-neon-green font-bold">{gs.score.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {userPosts.length > 0 && (
        <div className="bg-card border border-border rounded p-4">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">POSTS RECIENTES</h3>
          {/* 🔥 SECCIÓN CON LÍMITE DE ALTURA Y SCROLL 🔥 */}
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
            {userPosts.map((post) => (
              <div key={post.id} className="p-3 border border-border/50 rounded flex justify-between items-start font-body hover:bg-muted/30 transition-colors group">
                <div className="flex-1 min-w-0 pr-2">
                  <Link to={getCategoryRoute(post.category, post.id)} className="text-xs text-foreground hover:text-neon-cyan hover:underline line-clamp-2">
                    {post.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
                    <span>{getSafePostDate(post.created_at)}</span>
                    <span className="text-neon-green">▲{post.upvotes || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {user && (
                    <button onClick={() => handleSavePost(post)} className="p-1.5 text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/10 rounded transition-colors" title="Guardar">
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  {isStaffVisual && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 text-muted-foreground hover:text-neon-magenta hover:bg-neon-magenta/10 rounded transition-colors">
                          <Shield className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[200] bg-card border-border">
                        <DropdownMenuItem onClick={() => handleHidePost(post.id)} className="text-neon-orange cursor-pointer focus:bg-neon-orange/10">
                          <Ban className="w-3 h-3 mr-2" /> Ocultar / Banear
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-destructive cursor-pointer focus:bg-destructive/10">
                          <Trash2 className="w-3 h-3 mr-2" /> Eliminar Permanente
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(post.id); toast({title:"ID Copiado"}); }} className="cursor-pointer">
                          <Copy className="w-3 h-3 mr-2" /> Copiar ID
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}