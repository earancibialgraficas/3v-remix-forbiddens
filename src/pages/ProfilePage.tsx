import { useState, useEffect } from "react";
import { User, Edit2, Trophy, Star, Instagram, Youtube, Calendar, Shield, MessageSquare, UserPlus, Globe, Gamepad2, Eye, EyeOff, Palette, Bookmark, Settings, X, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearchParams } from "react-router-dom";
import { cn, withImageVersion } from "@/lib/utils";
import { getAvatarBorderStyle, getNameStyle, getRoleStyle } from "@/lib/profileAppearance";
import RoleBadge from "@/components/RoleBadge";
import AvatarSelector from "@/components/AvatarSelector";
import RoleIconSelector from "@/components/RoleIconSelector";
import { useIsMobile } from "@/hooks/use-mobile";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits";

import ConfiguracionTab from "@/components/profile/ConfiguracionTab";
import AvisosTab from "@/components/profile/AvisosTab";
import PostsTab from "@/components/profile/PostsTab";
import StatsTab from "@/components/profile/StatsTab";
import FriendsTab from "@/components/profile/FriendsTab";
import SocialContentTab from "@/components/profile/SocialContentTab";
import AlmacenamientoTab from "@/components/profile/AlmacenamientoTab";
import GuardadosTab from "@/components/profile/GuardadosTab";
import ModerationPanel from "@/components/profile/ModerationPanel";

const safeStr = (val: any) => (val ? String(val) : "");

export default function ProfilePage() {
  const { user, profile, roles, refreshProfile, isAdmin, isMasterWeb } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [gameScores, setGameScores] = useState<{game_name: string; console_type: string; score: number}[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [socialContentCount, setSocialContentCount] = useState(0); 
  const [storageItems, setStorageItems] = useState<{type: string; name: string; size: number; id?: string; created_at?: string}[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showRoleIconSelector, setShowRoleIconSelector] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const [colorTarget, setColorTarget] = useState<"border" | "name" | "role" | "staff" | "stat_points" | "stat_followers" | "stat_following" | "stat_posts_forum" | "stat_posts_social" | "stat_games">("border");
  const [avatarBorderColor, setAvatarBorderColor] = useState("");
  const [nameColor, setNameColor] = useState("");
  const [roleColor, setRoleColor] = useState("");
  const [staffRoleColor, setStaffRoleColor] = useState("");
  const [statPointsColor, setStatPointsColor] = useState("");
  const [statFollowersColor, setStatFollowersColor] = useState("");
  const [statFollowingColor, setStatFollowingColor] = useState("");
  const [statPostsForumColor, setStatPostsForumColor] = useState("");
  const [statPostsSocialColor, setStatPostsSocialColor] = useState("");
  const [statGamesColor, setStatGamesColor] = useState("");
  const [savingColors, setSavingColors] = useState(false);
  const [localColorCache, setLocalColorCache] = useState("#ffffff");

  const tabFromUrl = searchParams.get("tab") as any;
  const validTabs = ["avisos", "posts", "stats", "social", "storage", "moderation", "friends", "configuracion", "guardados"];
  const [activeTab, setActiveTab] = useState<any>(validTabs.includes(tabFromUrl) ? tabFromUrl : "avisos");

  const getValidHex = (val: string | null | undefined) => {
    if (!val) return "#ffffff";
    const hex = String(val).trim();
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) return hex;
    if (/^#[0-9A-Fa-f]{3}$/i.test(hex)) return '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
    return "#ffffff"; 
  };

  useEffect(() => {
    if (!showColorPicker) return;
    const activeColor = colorTarget === "border" ? avatarBorderColor : colorTarget === "name" ? nameColor : colorTarget === "role" ? roleColor : colorTarget === "staff" ? staffRoleColor : colorTarget === "stat_points" ? statPointsColor : colorTarget === "stat_followers" ? statFollowersColor : colorTarget === "stat_following" ? statFollowingColor : colorTarget === "stat_posts_forum" ? statPostsForumColor : colorTarget === "stat_posts_social" ? statPostsSocialColor : statGamesColor;
    setLocalColorCache(getValidHex(activeColor));
  }, [colorTarget, showColorPicker, avatarBorderColor, nameColor, roleColor, staffRoleColor, statPointsColor, statFollowersColor, statFollowingColor, statPostsForumColor, statPostsSocialColor, statGamesColor]);

  useEffect(() => {
    if (searchParams.get("edit") === "true") {
      handleTabChange("configuracion");
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile) {
      setAvatarBorderColor((profile as any).color_avatar_border || "");
      setNameColor((profile as any).color_name || "");
      setRoleColor((profile as any).color_role || "");
      setStaffRoleColor((profile as any).color_staff_role || "");
      setStatPointsColor((profile as any).color_stat_points || "#39ff14");
      setStatFollowersColor((profile as any).color_stat_followers || "#ffffff");
      setStatFollowingColor((profile as any).color_stat_following || "#ffffff");
      setStatPostsForumColor((profile as any).color_stat_posts_forum || "#00ffff");
      setStatPostsSocialColor((profile as any).color_stat_posts_social || "#ffff00");
      setStatGamesColor((profile as any).color_stat_games || "#ff8c00");
    }
  }, [profile]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fetchNotifs = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
      if (data) setNotifications(data);
    } catch (e) {}
  };

  const fetchPendingRequests = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from("friend_requests").select("*").eq("receiver_id", user.id);
      if (data && data.length > 0) {
        const pending = data.filter((r: any) => r.status !== "accepted");
        if (pending.length > 0) {
          const uniqueSenders = Array.from(new Set(pending.map((r: any) => r.sender_id))).filter(Boolean) as string[];
          if (uniqueSenders.length > 0) {
            const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_avatar_border, color_name").in("user_id", uniqueSenders);
            setPendingRequests(uniqueSenders.map(senderId => {
              const req = pending.find((r: any) => r.sender_id === senderId);
              return { ...req, profile: (profs || []).find((p: any) => p.user_id === senderId) || {} };
            }));
          } else { setPendingRequests([]); }
        } else { setPendingRequests([]); }
      } else { setPendingRequests([]); }
    } catch (e) {}
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifs();
    fetchPendingRequests();
    const channel1 = supabase.channel("profile-notifs").on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifs()).subscribe();
    const channel2 = supabase.channel("profile-reqs").on("postgres_changes", { event: "*", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${user.id}` }, () => fetchPendingRequests()).subscribe();
    return () => { supabase.removeChannel(channel1); supabase.removeChannel(channel2); };
  }, [activeTab, user?.id]);

  useEffect(() => {
    if (!user) return;
    const loadCoreData = async () => {
      try {
        const { data: posts } = await supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
        if (posts) setUserPosts(posts);

        const [socialRes, photosRes] = await Promise.all([
          supabase.from("social_content").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("photos").select("id", { count: "exact", head: true }).eq("user_id", user.id)
        ]);
        setSocialContentCount((socialRes?.count || 0) + (photosRes?.count || 0));
        
        const { data: scores } = await supabase.from("leaderboard_scores").select("game_name, console_type, score").eq("user_id", user.id).order("score", { ascending: false });
        if (scores) setGameScores(scores as any);
        
        const { count: followers } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id);
        setFollowerCount(followers || 0);
          
        const { count: following } = await supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id);
        setFollowingCount(following || 0);
      } catch (e) {}
    };

    const loadStorage = async () => {
      try {
        const items: {type: string; name: string; size: number; id?: string; created_at?: string}[] = [];
        const { data: scores } = await supabase.from("leaderboard_scores").select("id, game_name, console_type, created_at").eq("user_id", user.id);
        (scores || []).forEach(s => items.push({ type: "Partida guardada", name: `${s.game_name} (${safeStr((s as any).console_type).toUpperCase()})`, size: 2, id: s.id, created_at: s.created_at }));
        const { data: avatarFiles } = await supabase.storage.from("avatars").list(user.id);
        (avatarFiles || []).forEach(f => items.push({ type: "Avatar", name: f.name, size: Math.round((f.metadata?.size || 500000) / 1024 / 1024 * 100) / 100, created_at: f.created_at }));
        const { data: social } = await supabase.from("social_content").select("id, title, content_url, created_at").eq("user_id", user.id);
        (social || []).forEach(s => items.push({ type: "Contenido social", name: s.title || s.content_url, size: 0.1, id: s.id, created_at: s.created_at }));
        const { data: photos } = await supabase.from("photos").select("id, caption, image_url, created_at").eq("user_id", user.id);
        (photos || []).forEach(p => items.push({ type: "Foto", name: p.caption || "Foto", size: 1, id: p.id, created_at: p.created_at }));
        items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setStorageItems(items);
        setStorageUsed(items.reduce((sum, i) => sum + (i.size || 0), 0));
      } catch(e) {}
    };
    loadCoreData();
    loadStorage();
  }, [user?.id]);

  const handleMarkAsRead = async (notifId: string) => {
    if (!user) return;
    try { await supabase.from("notifications").update({ is_read: true } as any).eq("id", notifId); setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)); } catch(e) {}
  };

  const handleClearNotifications = async () => {
    if (!user) return;
    if (!confirm("¿Deseas limpiar todo tu historial de notificaciones de forma permanente?")) return;
    try { await supabase.from("notifications").delete().eq("user_id", user.id); fetchNotifs(); toast({ title: "Historial limpiado correctamente." }); } catch(e) {}
  };

  const handleAcceptRequest = async (reqId: string, senderId: string, senderName: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("friend_requests").update({ status: "accepted" } as any).eq("id", reqId).select();
      if (error || !data || data.length === 0) { toast({ title: "Error", description: "No se pudo modificar.", variant: "destructive" }); return; }
      toast({ title: "¡Solicitud aceptada!" });
      setPendingRequests(prev => (prev || []).filter(r => r.id !== reqId));
      await supabase.from("friend_requests").delete().eq("sender_id", senderId).eq("receiver_id", user.id).neq("id", reqId);
      if (senderId) { await supabase.from("notifications").insert({ id: crypto.randomUUID(), user_id: senderId, type: "friend_accepted", title: "Solicitud aceptada", body: `${profile?.display_name || 'Un usuario'} aceptó tu solicitud de amistad.`, related_id: user.id } as any); }
      await supabase.from("notifications").insert({ id: crypto.randomUUID(), user_id: user.id, type: "general", title: "Amistad Aceptada", body: `Aceptaste la solicitud de amistad de ${senderName}.`, is_read: true } as any);
      fetchNotifs(); if (activeTab === "friends") window.location.reload();
    } catch(e: any) { toast({ title: "Error fatal", description: e.message, variant: "destructive" }); }
  };

  const handleRejectRequest = async (reqId: string, senderId: string, senderName: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("friend_requests").delete().eq("sender_id", senderId).eq("receiver_id", user.id);
      if (!error) {
        toast({ title: "Solicitud rechazada" }); setPendingRequests(prev => (prev || []).filter(r => r.sender_id !== senderId));
        await supabase.from("notifications").insert({ id: crypto.randomUUID(), user_id: user.id, type: "general", title: "Amistad Rechazada", body: `Rechazaste la solicitud de amistad de ${senderName}.`, is_read: true } as any); fetchNotifs();
      } else { toast({ title: "Error al rechazar", variant: "destructive" }); }
    } catch(e) {}
  };

  const handleSaveColors = async () => {
    if (!user) return;
    setSavingColors(true);
    const { error } = await supabase.from("profiles").update({
        color_avatar_border: avatarBorderColor || null, color_name: nameColor || null, color_role: roleColor || null, color_staff_role: staffRoleColor || null,
        color_stat_points: statPointsColor || null, color_stat_followers: statFollowersColor || null, color_stat_following: statFollowingColor || null,
        color_stat_posts_forum: statPostsForumColor || null, color_stat_posts_social: statPostsSocialColor || null, color_stat_games: statGamesColor || null,
      } as any).eq("user_id", user.id);
    setSavingColors(false);
    if (!error) { toast({ title: "Colores guardados" }); setShowColorPicker(false); await refreshProfile(); } else { toast({ title: "Error al guardar", description: error.message, variant: "destructive" }); }
  };

  const handleAvatarSelect = async (url: string) => {
    if (!user) return;
    const nextAvatarUrl = withImageVersion(url, Date.now());
    const { error } = await supabase.from("profiles").update({ avatar_url: nextAvatarUrl, updated_at: new Date().toISOString() }).eq("user_id", user.id);
    if (!error) { toast({ title: "Avatar actualizado" }); setShowAvatarSelector(false); await refreshProfile(); }
  };

  const handleRoleIconSelect = async (icon: string) => {
    if (!user) return;
    await supabase.from("profiles").update({ role_icon: icon }).eq("user_id", user.id); toast({ title: "Icono actualizado" }); await refreshProfile();
  };

  const toggleShowRoleIcon = async () => {
    if (!user || !profile) return;
    await supabase.from("profiles").update({ show_role_icon: !profile.show_role_icon }).eq("user_id", user.id); await refreshProfile();
  };

  const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "long" }) : "Desconocido";
  const safeRoles = roles || [];
  const isMod = safeRoles.includes("moderator");
  const isStaff = isAdmin || isMasterWeb || isMod;
  const userTierStr = profile?.membership_tier ? String(profile.membership_tier).toLowerCase() : 'novato';
  const userTier = userTierStr as MembershipTier;
  const limits = isStaff ? MEMBERSHIP_LIMITS.staff : (MEMBERSHIP_LIMITS[userTier] || MEMBERSHIP_LIMITS.novato);

  const maxFriends = limits.maxFriends;
  const maxStorage = limits.storageMB;
  const displayTier = isStaff ? "STAFF" : userTier.toUpperCase();
  const canUseColors = isStaff || ['coleccionista', 'miembro del legado', 'leyenda arcade', 'creador de contenido'].includes(userTier);
  const canUseSignature = isStaff || userTier !== 'novato';
  const canAdvancedSignature = isStaff || ['coleccionista', 'miembro del legado', 'leyenda arcade', 'creador de contenido'].includes(userTier);

  const bestScores = Object.values((gameScores || []).reduce<Record<string, { game_name: string; console_type: string; score: number }>>((acc, gs) => {
      const key = `${gs.game_name}-${gs.console_type}`; if (!acc[key] || gs.score > acc[key].score) acc[key] = gs; return acc;
    }, {}));

  const tabs = [
    { id: "avisos" as const, label: "Avisos", icon: Bell },
    { id: "posts" as const, label: "Posts", icon: MessageSquare },
    { id: "stats" as const, label: "Stats", icon: Trophy },
    { id: "friends" as const, label: "Amigos", icon: UserPlus },
    { id: "social" as const, label: "Redes", icon: Globe },
    { id: "storage" as const, label: "Storage", icon: Gamepad2 },
    { id: "guardados" as const, label: "Guardados", icon: Bookmark },
    ...(isStaff ? [{ id: "moderation" as const, label: "Moderación", icon: Shield }] : []),
    { id: "configuracion" as const, label: "Config", icon: Settings },
  ];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 animate-fade-in">
        <User className="w-12 h-12 text-muted-foreground" />
        <p className="text-sm font-body text-muted-foreground">Inicia sesión para ver tu perfil</p>
        <Button asChild><Link to="/login">Iniciar Sesión</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      
      {showAvatarSelector && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAvatarSelector(false)} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto">
            <button onClick={() => setShowAvatarSelector(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
            <h3 className="font-pixel text-[11px] text-neon-cyan mb-4 uppercase text-center">Selecciona tu Avatar</h3>
            <AvatarSelector currentAvatarUrl={profile?.avatar_url || null} onSelect={handleAvatarSelect} />
          </div>
        </div>
      )}
      
      {showRoleIconSelector && <RoleIconSelector currentIcon={profile?.role_icon || "⭐"} onSelect={handleRoleIconSelect} onClose={() => setShowRoleIconSelector(false)} />}

      {showColorPicker && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowColorPicker(false)} />
          <div className="relative bg-card border border-border rounded-lg p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto retro-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-4"><h3 className="font-pixel text-[11px] text-primary">PALETA DE COLORES</h3><button onClick={() => setShowColorPicker(false)} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button></div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-body text-muted-foreground uppercase mb-2 block">¿Qué deseas pintar?</label>
                <select value={colorTarget} onChange={(e) => setColorTarget(e.target.value as any)} className="w-full bg-muted border border-border rounded p-2 text-xs font-body">
                  <option value="border">Borde de Avatar</option><option value="name">Nombre de Usuario</option>{isStaff ? <option value="staff">Rango de Staff</option> : <option value="role">Rango de Membresía</option>}<option disabled value="separator">──────────</option><option value="stat_points">Stat: Puntos</option><option value="stat_followers">Stat: Seguidores</option><option value="stat_following">Stat: Siguiendo</option><option value="stat_posts_forum">Stat: Posts Foro</option><option value="stat_posts_social">Stat: Posts Social</option><option value="stat_games">Stat: Juegos</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-body text-muted-foreground uppercase mb-2 block">Elige el color</label>
                <div className="flex gap-2">
                  <input type="color" value={localColorCache} onChange={(e) => { const newColor = e.target.value; setLocalColorCache(newColor); if ((window as any).__colorDebounce) clearTimeout((window as any).__colorDebounce); (window as any).__colorDebounce = setTimeout(() => { if (colorTarget === "border") setAvatarBorderColor(newColor); else if (colorTarget === "name") setNameColor(newColor); else if (colorTarget === "role") setRoleColor(newColor); else if (colorTarget === "staff") setStaffRoleColor(newColor); else if (colorTarget === "stat_points") setStatPointsColor(newColor); else if (colorTarget === "stat_followers") setStatFollowersColor(newColor); else if (colorTarget === "stat_following") setStatFollowingColor(newColor); else if (colorTarget === "stat_posts_forum") setStatPostsForumColor(newColor); else if (colorTarget === "stat_posts_social") setStatPostsSocialColor(newColor); else setStatGamesColor(newColor); }, 1000); }} className="h-10 flex-1 rounded border border-border cursor-pointer bg-muted" />
                  <Button variant="outline" onClick={() => { if (colorTarget === "border") setAvatarBorderColor(""); else if (colorTarget === "name") setNameColor(""); else if (colorTarget === "role") setRoleColor(""); else if (colorTarget === "staff") setStaffRoleColor(""); else if (colorTarget === "stat_points") setStatPointsColor(""); else if (colorTarget === "stat_followers") setStatFollowersColor(""); else if (colorTarget === "stat_following") setStatFollowingColor(""); else if (colorTarget === "stat_posts_forum") setStatPostsForumColor(""); else if (colorTarget === "stat_posts_social") setStatPostsSocialColor(""); else setStatGamesColor(""); }} className="px-3">Reset</Button>
                </div>
              </div>
              <div className="pt-4 border-t border-border flex gap-2"><Button onClick={handleSaveColors} disabled={savingColors} className="flex-1 text-xs">{savingColors ? "Guardando..." : "Guardar Paleta"}</Button><Button variant="outline" onClick={() => setShowColorPicker(false)} className="flex-1 text-xs">Cancelar</Button></div>
            </div>
          </div>
        </div>
      )}

      {/* CABECERA PRINCIPAL DEL PERFIL SIEMPRE VISIBLE */}
      <div className="bg-card border border-neon-cyan/30 rounded p-6">
        <div className={cn("flex gap-4", isMobile ? "flex-col items-center" : "flex-row items-start")}>
          <button onClick={() => setShowAvatarSelector(true)} className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl border-2 border-neon-cyan/30 overflow-hidden" style={getAvatarBorderStyle(profile?.color_avatar_border)}>
              {profile?.avatar_url ? <img key={profile.avatar_url} src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> : <User className="w-10 h-10 text-muted-foreground" />}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4 text-foreground" /></div>
          </button>
          
          <div className="flex-1 min-w-0 w-full">
            <div className={cn("flex items-center gap-2 flex-wrap", isMobile ? "justify-center" : "")}>
              <h2 className="font-pixel text-sm text-neon-cyan" style={getNameStyle(profile?.color_name)}>{profile?.display_name}</h2>
              <RoleBadge roles={safeRoles} roleIcon={profile?.role_icon} showIcon={profile?.show_role_icon !== false} colorStaffRole={profile?.color_staff_role} />
            </div>
            
            <p className={cn("text-xs text-muted-foreground font-body mt-1", isMobile ? "text-center" : "")}>{profile?.bio || "Sin descripción"}</p>
            
            <div className={cn("flex flex-wrap items-center gap-3 mt-2", isMobile ? "justify-center" : "")}>
              {isStaff ? <span className="text-[10px] font-pixel text-neon-magenta flex items-center gap-1" style={getRoleStyle(profile?.color_staff_role)}><Shield className="w-3 h-3" /> {(isMasterWeb || isAdmin) ? "DIOS TODOPODEROSO" : "MÍTICO"}</span> : <span className="text-[10px] font-pixel text-neon-yellow flex items-center gap-1" style={getRoleStyle(profile?.color_role)}><Star className="w-3 h-3" /> {safeStr(userTier).toUpperCase()}</span>}
              <span className="text-[10px] font-body text-neon-green flex items-center gap-1"><Trophy className="w-3 h-3" /> {(profile?.total_score || 0).toLocaleString()} pts</span>
              <span className="text-[10px] font-body text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Desde {memberSince}</span>
              <span className="text-[10px] font-body text-neon-cyan flex items-center gap-1"><UserPlus className="w-3 h-3" /> {followerCount} seguidores · {followingCount} siguiendo</span>
            </div>
            
            {(profile?.instagram_url || profile?.youtube_url || profile?.tiktok_url) && (
              <div className={cn("flex gap-3 mt-2", isMobile ? "justify-center" : "")}>
                {profile?.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noopener" className="text-neon-magenta hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Instagram className="w-3.5 h-3.5" /> Instagram</a>}
                {profile?.youtube_url && <a href={profile.youtube_url} target="_blank" rel="noopener" className="text-destructive hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Youtube className="w-3.5 h-3.5" /> YouTube</a>}
                {profile?.tiktok_url && <a href={profile.tiktok_url} target="_blank" rel="noopener" className="text-neon-cyan hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Globe className="w-3.5 h-3.5" /> TikTok</a>}
              </div>
            )}
            
            <div className={cn("flex gap-2 mt-3 flex-wrap", isMobile ? "justify-center" : "")}>
              <Button size="sm" variant="outline" onClick={() => handleTabChange("configuracion")} className={cn("text-xs gap-1", activeTab === "configuracion" && "bg-muted")}><Edit2 className="w-3 h-3" /> Configurar Perfil</Button>
              {!isStaff && <Button size="sm" variant="outline" asChild className="text-xs"><Link to="/membresias">Actualizar Plan</Link></Button>}
              {canUseColors && <Button size="sm" variant="outline" onClick={() => setShowColorPicker(true)} className="text-xs gap-1"><Palette className="w-3 h-3" /> Colores</Button>}
              {isStaff && !safeRoles.includes("moderator") && <Button size="sm" variant="outline" onClick={() => setShowRoleIconSelector(true)} className="text-xs gap-1"><span>{profile?.role_icon || "⭐"}</span> Icono Rol</Button>}
              {isStaff && <Button size="sm" variant="outline" onClick={toggleShowRoleIcon} className="text-xs gap-1">{profile?.show_role_icon !== false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}{profile?.show_role_icon !== false ? "Ocultar Icono" : "Mostrar Icono"}</Button>}
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 MENÚ DE PESTAÑAS RESPONSIVO (NUEVO FLEX WRAP) 🔥 */}
      <div className="flex gap-1 bg-card border border-border rounded p-1 flex-wrap">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "grow sm:flex-1 flex items-center justify-center gap-1.5 py-2 px-1 rounded text-[10px] sm:text-xs font-body transition-all min-w-[30%] sm:min-w-[80px]", 
              activeTab === tab.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" /> <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENIDO DE LAS PESTAÑAS (MÓDULOS SEPARADOS) */}
      {activeTab === "configuracion" && <ConfiguracionTab user={user} profile={profile} refreshProfile={refreshProfile} displayTier={displayTier} userTier={userTier} canUseSignature={canUseSignature} canAdvancedSignature={canAdvancedSignature} onClose={() => handleTabChange("avisos")} />}
      {activeTab === "avisos" && <AvisosTab notifications={notifications} pendingRequests={pendingRequests} handleMarkAsRead={handleMarkAsRead} handleClearNotifications={handleClearNotifications} handleAcceptRequest={handleAcceptRequest} handleRejectRequest={handleRejectRequest} />}
      {activeTab === "posts" && <PostsTab userPosts={userPosts} />}
      {activeTab === "stats" && <StatsTab profile={profile} followerCount={followerCount} followingCount={followingCount} userPosts={userPosts} socialContentCount={socialContentCount} bestScores={bestScores} displayTier={displayTier} isStaff={isStaff} statColors={{ points: statPointsColor, followers: statFollowersColor, following: statFollowingColor, forum: statPostsForumColor, social: statPostsSocialColor, games: statGamesColor }} />}
      {activeTab === "friends" && <FriendsTab userId={user.id} limits={limits} isStaff={isStaff} />}
      {activeTab === "social" && <SocialContentTab profile={profile} user={user} onEditNetworks={() => handleTabChange("configuracion")} limits={limits} isStaff={isStaff} />}
      {activeTab === "storage" && <AlmacenamientoTab userId={user.id} maxStorage={maxStorage} storageUsed={storageUsed} storageItems={storageItems} setStorageItems={setStorageItems} setStorageUsed={setStorageUsed} />}
      {activeTab === "guardados" && <GuardadosTab />}
      {activeTab === "moderation" && isStaff && <ModerationPanel isStaff={isStaff} isMasterWeb={isMasterWeb} />}
      
    </div>
  );
}