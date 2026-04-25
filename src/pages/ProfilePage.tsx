import { useState, useEffect } from "react";
import { User, Edit2, Trophy, Star, Instagram, Youtube, MapPin, Globe, Gamepad2, Calendar, Shield, MessageSquare, UserPlus, UserMinus, Ban, Clock, Eye, EyeOff, Plus, Trash2, Link2, Music2, Palette, HardDrive, Image as ImageIcon, Save, Search, Bell, Heart, Users, Unlock, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearchParams } from "react-router-dom";
import { cn, withImageVersion } from "@/lib/utils";
import { getAvatarBorderStyle, getNameStyle, getRoleStyle } from "@/lib/profileAppearance";
import { getCategoryRoute } from "@/lib/categoryRoutes";
import RoleBadge from "@/components/RoleBadge";
import AvatarSelector from "@/components/AvatarSelector";
import RoleIconSelector from "@/components/RoleIconSelector";
import SignatureDisplay from "@/components/SignatureDisplay";
import { useIsMobile } from "@/hooks/use-mobile";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits";

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

export default function ProfilePage() {
  const { user, profile, roles, refreshProfile, isAdmin, isMasterWeb } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [tiktok, setTiktok] = useState("");
  
  // 🔥 VARIABLES OPTIMISTAS DE LA FIRMA CON LAS KEYWORDS CORRECTAS 🔥
  const [signature, setSignature] = useState("");
  const [localSigFontFamily, setLocalSigFontFamily] = useState("Inter");
  const [localSigFontSize, setLocalSigFontSize] = useState(13);
  const [localSigColor, setLocalSigColor] = useState("#facc15");
  const [localSigStrokeColor, setLocalSigStrokeColor] = useState<string | null>("#000000");
  const [localSigStrokeWidth, setLocalSigStrokeWidth] = useState(1);
  const [localSigStrokePosition, setLocalSigStrokePosition] = useState("middle");
  const [localSigTextAlign, setLocalSigTextAlign] = useState("center");
  const [localSigTextOverImage, setLocalSigTextOverImage] = useState(true);
  const [localSigImageUrl, setLocalSigImageUrl] = useState("");
  const [localSigImageWidth, setLocalSigImageWidth] = useState(100);
  const [localSigImageOffset, setLocalSigImageOffset] = useState(50);
  const [localSigImageAlign, setLocalSigImageAlign] = useState("center");
  
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [gameScores, setGameScores] = useState<{game_name: string; console_type: string; score: number}[]>([]);
  
  const tabFromUrl = searchParams.get("tab") as any;
  const validTabs = ["avisos", "posts", "stats", "social", "storage", "moderation", "friends"];
  const [activeTab, setActiveTab] = useState<"avisos" | "posts" | "stats" | "social" | "storage" | "moderation" | "friends">(
    validTabs.includes(tabFromUrl) ? tabFromUrl : "avisos"
  );
  
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showRoleIconSelector, setShowRoleIconSelector] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [socialContentCount, setSocialContentCount] = useState(0); 
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

  const [storageItems, setStorageItems] = useState<{type: string; name: string; size: number; id?: string; created_at?: string}[]>([]);
  const [savingColors, setSavingColors] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const [localColorCache, setLocalColorCache] = useState("#ffffff");

  const getValidHex = (val: string | null | undefined) => {
    if (!val) return "#ffffff";
    const hex = String(val).trim();
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) return hex;
    if (/^#[0-9A-Fa-f]{3}$/i.test(hex)) return '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
    return "#ffffff"; 
  };

  useEffect(() => {
    if (!showColorPicker) return;
    const activeColor = 
      colorTarget === "border" ? avatarBorderColor :
      colorTarget === "name" ? nameColor :
      colorTarget === "role" ? roleColor :
      colorTarget === "staff" ? staffRoleColor :
      colorTarget === "stat_points" ? statPointsColor :
      colorTarget === "stat_followers" ? statFollowersColor :
      colorTarget === "stat_following" ? statFollowingColor :
      colorTarget === "stat_posts_forum" ? statPostsForumColor :
      colorTarget === "stat_posts_social" ? statPostsSocialColor :
      statGamesColor;
    
    setLocalColorCache(getValidHex(activeColor));
  }, [colorTarget, showColorPicker, avatarBorderColor, nameColor, roleColor, staffRoleColor, statPointsColor, statFollowersColor, statFollowingColor, statPostsForumColor, statPostsSocialColor, statGamesColor]);

  useEffect(() => {
    if (searchParams.get("edit") === "true") {
      setEditing(true);
    }
  }, [searchParams]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setInstagram(profile.instagram_url || "");
      setYoutube(profile.youtube_url || "");
      setTiktok(profile.tiktok_url || "");
      
      if (!editing) {
        setSignature((profile as any).signature || "");
        setLocalSigFontFamily((profile as any).signature_font_family || "Inter");
        setLocalSigFontSize((profile as any).signature_font_size || 13);
        setLocalSigColor((profile as any).signature_color || "#facc15");
        setLocalSigStrokeColor((profile as any).signature_stroke_color || "#000000");
        setLocalSigStrokeWidth((profile as any).signature_stroke_width ?? 1);
        // Evitamos setear inside si venía por defecto, fallback a middle
        const stPos = (profile as any).signature_stroke_position;
        setLocalSigStrokePosition(stPos === "inside" ? "middle" : (stPos || "middle"));
        setLocalSigTextAlign((profile as any).signature_text_align || "center");
        setLocalSigTextOverImage((profile as any).signature_text_over_image ?? true);
        setLocalSigImageUrl((profile as any).signature_image_url || "");
        setLocalSigImageWidth((profile as any).signature_image_width ?? 100);
        setLocalSigImageOffset((profile as any).signature_image_offset ?? 50);
        setLocalSigImageAlign((profile as any).signature_image_align || "center");
      }
      
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
  }, [profile, editing]);

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
              return {
                ...req,
                profile: (profs || []).find((p: any) => p.user_id === senderId) || {}
              };
            }));
          } else {
            setPendingRequests([]);
          }
        } else {
          setPendingRequests([]);
        }
      } else {
        setPendingRequests([]);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (!user?.id) return;

    fetchNotifs();
    fetchPendingRequests();
    
    const channel1 = supabase
      .channel("profile-notifs")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifs())
      .subscribe();
      
    const channel2 = supabase
      .channel("profile-reqs")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${user.id}` }, () => fetchPendingRequests())
      .subscribe();

    return () => { 
      supabase.removeChannel(channel1); 
      supabase.removeChannel(channel2); 
    };
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
    try {
      await supabase.from("notifications").update({ is_read: true } as any).eq("id", notifId);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
    } catch(e) {}
  };

  const handleClearNotifications = async () => {
    if (!user) return;
    if (!confirm("¿Deseas limpiar todo tu historial de notificaciones de forma permanente?")) return;
    try {
      await supabase.from("notifications").delete().eq("user_id", user.id);
      fetchNotifs();
      toast({ title: "Historial limpiado correctamente." });
    } catch(e) {}
  };

  const handleAcceptRequest = async (reqId: string, senderId: string, senderName: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from("friend_requests")
        .update({ status: "accepted" } as any)
        .eq("id", reqId)
        .select();

      if (error) {
        toast({ title: "Error en Base de Datos", description: error.message, variant: "destructive" });
        return;
      }

      if (!data || data.length === 0) {
        toast({ title: "Error", description: "La solicitud ya no existe o no se pudo modificar. Intenta recargar.", variant: "destructive" });
        return;
      }

      toast({ title: "¡Solicitud aceptada!" });
      setPendingRequests(prev => (prev || []).filter(r => r.id !== reqId));

      await supabase.from("friend_requests").delete().eq("sender_id", senderId).eq("receiver_id", user.id).neq("id", reqId);
      
      if (senderId) {
        await supabase.from("notifications").insert({
          id: crypto.randomUUID(),
          user_id: senderId,
          type: "friend_accepted",
          title: "Solicitud aceptada",
          body: `${profile?.display_name || 'Un usuario'} aceptó tu solicitud de amistad.`,
          related_id: user.id
        } as any);
      }

      await supabase.from("notifications").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        type: "general",
        title: "Amistad Aceptada",
        body: `Aceptaste la solicitud de amistad de ${senderName}.`,
        is_read: true
      } as any);

      fetchNotifs();
      if (activeTab === "friends") window.location.reload();
    } catch(e: any) {
      toast({ title: "Error fatal", description: e.message, variant: "destructive" });
    }
  };

  const handleRejectRequest = async (reqId: string, senderId: string, senderName: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("friend_requests")
        .delete()
        .eq("sender_id", senderId)
        .eq("receiver_id", user.id);

      if (!error) {
        toast({ title: "Solicitud rechazada" });
        setPendingRequests(prev => (prev || []).filter(r => r.sender_id !== senderId));

        await supabase.from("notifications").insert({
          id: crypto.randomUUID(),
          user_id: user.id,
          type: "general",
          title: "Amistad Rechazada",
          body: `Rechazaste la solicitud de amistad de ${senderName}.`,
          is_read: true
        } as any);

        fetchNotifs();
      } else {
        toast({ title: "Error al rechazar", variant: "destructive" });
      }
    } catch(e) {}
  };

  const updateSig = (patch: Record<string, any>) => {
    (window as any).__sigPatch = { ...(window as any).__sigPatch || {}, ...patch };
    if ((window as any).__sigUpdateTimer) clearTimeout((window as any).__sigUpdateTimer);
    (window as any).__sigUpdateTimer = setTimeout(() => {
      const finalPatch = { ...(window as any).__sigPatch };
      (window as any).__sigPatch = {}; 
      supabase.from("profiles").update(finalPatch as any).eq("user_id", user!.id).then(() => refreshProfile());
    }, 500);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    if (newPassword.trim()) {
      if (newPassword.length < 6) {
        toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
        setSaving(false);
        return;
      }
      const { error: pwError } = await (supabase.auth as any).updateUser({ password: newPassword });
      if (pwError) {
        toast({ title: "Error al cambiar contraseña", description: pwError.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName, 
        bio,
        instagram_url: instagram || null, 
        youtube_url: youtube || null, 
        tiktok_url: tiktok || null,
        signature: signature.trim() || null,
        signature_font_family: localSigFontFamily,
        signature_font_size: localSigFontSize,
        signature_color: localSigColor,
        signature_stroke_color: localSigStrokeColor,
        signature_stroke_width: localSigStrokeWidth,
        signature_stroke_position: localSigStrokePosition,
        signature_text_align: localSigTextAlign,
        signature_text_over_image: localSigTextOverImage,
        signature_image_url: localSigImageUrl,
        signature_image_width: localSigImageWidth,
        signature_image_offset: localSigImageOffset,
        signature_image_align: localSigImageAlign
      } as any)
      .eq("user_id", user.id);
      
    setSaving(false);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else { 
      toast({ title: "Perfil actualizado" }); 
      setEditing(false); 
      setNewPassword(""); 
      await refreshProfile(); 
    }
  };

  const handleSaveColors = async () => {
    if (!user) return;
    setSavingColors(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        color_avatar_border: avatarBorderColor || null,
        color_name: nameColor || null,
        color_role: roleColor || null,
        color_staff_role: staffRoleColor || null,
        color_stat_points: statPointsColor || null,
        color_stat_followers: statFollowersColor || null,
        color_stat_following: statFollowingColor || null,
        color_stat_posts_forum: statPostsForumColor || null,
        color_stat_posts_social: statPostsSocialColor || null,
        color_stat_games: statGamesColor || null,
      } as any)
      .eq("user_id", user.id);
      
    setSavingColors(false);
    if (!error) {
      toast({ title: "Colores guardados" });
      setShowColorPicker(false);
      await refreshProfile();
    } else {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
    }
  };

  const handleAvatarSelect = async (url: string) => {
    if (!user) return;
    const nextAvatarUrl = withImageVersion(url, Date.now());
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: nextAvatarUrl, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
      
    if (!error) {
      toast({ title: "Avatar actualizado" });
      setShowAvatarSelector(false);
      await refreshProfile();
    }
  };

  const handleRoleIconSelect = async (icon: string) => {
    if (!user) return;
    await supabase.from("profiles").update({ role_icon: icon }).eq("user_id", user.id);
    toast({ title: "Icono actualizado" });
    await refreshProfile();
  };

  const toggleShowRoleIcon = async () => {
    if (!user || !profile) return;
    await supabase.from("profiles").update({ show_role_icon: !profile.show_role_icon }).eq("user_id", user.id);
    await refreshProfile();
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

  const bestScores = Object.values(
    (gameScores || []).reduce<Record<string, { game_name: string; console_type: string; score: number }>>((acc, gs) => {
      const key = `${gs.game_name}-${gs.console_type}`;
      if (!acc[key] || gs.score > acc[key].score) acc[key] = gs;
      return acc;
    }, {})
  );

  const tabs = [
    { id: "avisos" as const, label: "Avisos", icon: Bell },
    { id: "posts" as const, label: "Posts", icon: MessageSquare },
    { id: "stats" as const, label: "Stats", icon: Trophy },
    { id: "friends" as const, label: "Amigos", icon: UserPlus },
    { id: "social" as const, label: "Redes", icon: Globe },
    { id: "storage" as const, label: "Storage", icon: Gamepad2 },
    ...(isStaff ? [{ id: "moderation" as const, label: "Moderación", icon: Shield }] : []),
  ];

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 animate-fade-in">
        <User className="w-12 h-12 text-muted-foreground" />
        <p className="text-sm font-body text-muted-foreground">Inicia sesión para ver tu perfil</p>
        <Button asChild>
          <Link to="/login">Iniciar Sesión</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      
      {showAvatarSelector && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAvatarSelector(false)} />
          <div className="relative bg-card border border-border rounded-xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto">
            <button onClick={() => setShowAvatarSelector(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-white">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-pixel text-[11px] text-neon-cyan mb-4 uppercase text-center">Selecciona tu Avatar</h3>
            <AvatarSelector
              currentAvatarUrl={profile?.avatar_url || null}
              onSelect={handleAvatarSelect}
            />
          </div>
        </div>
      )}
      
      {showRoleIconSelector && (
        <RoleIconSelector
          currentIcon={profile?.role_icon || "⭐"}
          onSelect={handleRoleIconSelect}
          onClose={() => setShowRoleIconSelector(false)}
        />
      )}

      {showColorPicker && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowColorPicker(false)} />
          <div className="relative bg-card border border-border rounded-lg p-5 max-w-sm w-full max-h-[85vh] overflow-y-auto retro-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-pixel text-[11px] text-primary">PALETA DE COLORES</h3>
              <button onClick={() => setShowColorPicker(false)} className="text-muted-foreground hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-body text-muted-foreground uppercase mb-2 block">¿Qué deseas pintar?</label>
                <select 
                  value={colorTarget} 
                  onChange={(e) => setColorTarget(e.target.value as any)}
                  className="w-full bg-muted border border-border rounded p-2 text-xs font-body"
                >
                  <option value="border">Borde de Avatar</option>
                  <option value="name">Nombre de Usuario</option>
                  {isStaff ? <option value="staff">Rango de Staff</option> : <option value="role">Rango de Membresía</option>}
                  <option disabled value="separator">──────────</option>
                  <option value="stat_points">Stat: Puntos</option>
                  <option value="stat_followers">Stat: Seguidores</option>
                  <option value="stat_following">Stat: Siguiendo</option>
                  <option value="stat_posts_forum">Stat: Posts Foro</option>
                  <option value="stat_posts_social">Stat: Posts Social</option>
                  <option value="stat_games">Stat: Juegos</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-body text-muted-foreground uppercase mb-2 block">Elige el color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localColorCache}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setLocalColorCache(newColor); 
                      
                      if ((window as any).__colorDebounce) clearTimeout((window as any).__colorDebounce);
                      (window as any).__colorDebounce = setTimeout(() => {
                        if (colorTarget === "border") setAvatarBorderColor(newColor);
                        else if (colorTarget === "name") setNameColor(newColor);
                        else if (colorTarget === "role") setRoleColor(newColor);
                        else if (colorTarget === "staff") setStaffRoleColor(newColor);
                        else if (colorTarget === "stat_points") setStatPointsColor(newColor);
                        else if (colorTarget === "stat_followers") setStatFollowersColor(newColor);
                        else if (colorTarget === "stat_following") setStatFollowingColor(newColor);
                        else if (colorTarget === "stat_posts_forum") setStatPostsForumColor(newColor);
                        else if (colorTarget === "stat_posts_social") setStatPostsSocialColor(newColor);
                        else setStatGamesColor(newColor);
                      }, 1000);
                    }}
                    className="h-10 flex-1 rounded border border-border cursor-pointer bg-muted"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      if (colorTarget === "border") setAvatarBorderColor("");
                      else if (colorTarget === "name") setNameColor("");
                      else if (colorTarget === "role") setRoleColor("");
                      else if (colorTarget === "staff") setStaffRoleColor("");
                      else if (colorTarget === "stat_points") setStatPointsColor("");
                      else if (colorTarget === "stat_followers") setStatFollowersColor("");
                      else if (colorTarget === "stat_following") setStatFollowingColor("");
                      else if (colorTarget === "stat_posts_forum") setStatPostsForumColor("");
                      else if (colorTarget === "stat_posts_social") setStatPostsSocialColor("");
                      else setStatGamesColor("");
                    }}
                    className="px-3"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex gap-2">
                <Button onClick={handleSaveColors} disabled={savingColors} className="flex-1 text-xs">
                  {savingColors ? "Guardando..." : "Guardar Paleta"}
                </Button>
                <Button variant="outline" onClick={() => setShowColorPicker(false)} className="flex-1 text-xs">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-neon-cyan/30 rounded p-6">
        <div className={cn("flex gap-4", isMobile ? "flex-col items-center" : "flex-row items-start")}>
          <button 
            onClick={() => setShowAvatarSelector(true)} 
            className="relative group shrink-0"
          >
            <div 
              className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl border-2 border-neon-cyan/30 overflow-hidden" 
              style={getAvatarBorderStyle(profile?.color_avatar_border)}
            >
              {profile?.avatar_url ? (
                <img 
                  key={profile.avatar_url} 
                  src={profile.avatar_url} 
                  alt="" 
                  className="w-full h-full rounded-full object-cover" 
                />
              ) : (
                <User className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit2 className="w-4 h-4 text-foreground" />
            </div>
          </button>
          
          <div className="flex-1 min-w-0 w-full">
            {editing ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <h3 className="font-pixel text-[10px] text-neon-cyan uppercase">
                     Ajustes de Perfil
                   </h3>
                   <button 
                     onClick={() => { setEditing(false); setSearchParams({}); }} 
                     className="text-muted-foreground hover:text-foreground text-xs underline"
                   >
                     Cerrar
                   </button>
                </div>
                
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Nombre</label>
                  <Input 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    className="h-8 bg-muted text-sm font-body w-full" 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Bio</label>
                  <Textarea 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    className="bg-muted text-sm font-body min-h-[60px] w-full" 
                    placeholder="Cuéntanos sobre ti..." 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Instagram URL</label>
                  <Input 
                    value={instagram} 
                    onChange={(e) => setInstagram(e.target.value)} 
                    className="h-8 bg-muted text-xs font-body w-full" 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">YouTube URL</label>
                  <Input 
                    value={youtube} 
                    onChange={(e) => setYoutube(e.target.value)} 
                    className="h-8 bg-muted text-xs font-body w-full" 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">TikTok URL</label>
                  <Input 
                    value={tiktok} 
                    onChange={(e) => setTiktok(e.target.value)} 
                    className="h-8 bg-muted text-xs font-body w-full" 
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Contraseña (dejar vacío para no cambiar)</label>
                  <Input 
                    type="password" 
                    placeholder="Nueva contraseña" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="h-8 bg-muted text-xs font-body w-full" 
                  />
                </div>
                
                {canUseSignature ? (
                  <div className="space-y-2 border border-border/50 rounded p-3">
                    <label className="text-[10px] font-body text-muted-foreground block mb-0.5 uppercase tracking-tighter">
                      ✍️ Firma personalizada
                    </label>
                    <Input
                      value={signature}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSignature(v);
                        updateSig({ signature: v.trim() || null });
                      }}
                      className="h-8 bg-muted text-xs font-body w-full"
                      placeholder={`— ${profile?.display_name} [${displayTier}]`}
                      maxLength={isStaff ? 500 : userTier === "entusiasta" ? 100 : userTier === "coleccionista" ? 150 : 250}
                    />
                    
                    {canAdvancedSignature && (
                      <>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Tipografía</label>
                            <select
                              value={localSigFontFamily}
                              onChange={(e) => {
                                setLocalSigFontFamily(e.target.value);
                                updateSig({ signature_font_family: e.target.value });
                              }}
                              className="w-full h-7 rounded border border-border bg-muted text-[10px] font-body px-1"
                            >
                              {["Inter", "Roboto", "Lobster", "Pacifico", "Bebas Neue", "Press Start 2P", "Orbitron", "Dancing Script", "Permanent Marker", "Bangers"].map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Tamaño de letra</label>
                            <select
                              value={localSigFontSize}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setLocalSigFontSize(val);
                                updateSig({ signature_font_size: val });
                              }}
                              className="w-full h-7 rounded border border-border bg-muted text-[10px] font-body px-1"
                            >
                              {[10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30].map(size => <option key={size} value={size}>{size}px</option>)}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Color relleno</label>
                            <input
                              type="color"
                              value={localSigColor}
                              onChange={(e) => {
                                setLocalSigColor(e.target.value);
                                updateSig({ signature_color: e.target.value });
                              }}
                              className="w-full h-7 rounded border border-border cursor-pointer bg-muted"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Color trazo</label>
                            <div className="flex gap-1">
                              <input
                                type="color"
                                value={localSigStrokeColor || "#000000"}
                                onChange={(e) => {
                                  setLocalSigStrokeColor(e.target.value);
                                  updateSig({ signature_stroke_color: e.target.value });
                                }}
                                className="flex-1 h-7 rounded border border-border cursor-pointer bg-muted"
                              />
                              {localSigStrokeColor && (
                                <button type="button" onClick={() => {
                                  setLocalSigStrokeColor(null);
                                  updateSig({ signature_stroke_color: null });
                                }} className="h-7 px-2 text-[9px] bg-muted border border-border rounded">×</button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 🔥 BOTÓN "DENTRO" ELIMINADO 🔥 */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Grosor trazo ({localSigStrokeWidth}px)</label>
                            <input 
                              type="range" min="0" max="10" step="0.5" 
                              value={localSigStrokeWidth} 
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setLocalSigStrokeWidth(val);
                                updateSig({ signature_stroke_width: val });
                              }} 
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Tipo de Trazo</label>
                            <div className="flex gap-1">
                              {['outside', 'middle'].map(align => (
                                <button
                                  key={align}
                                  type="button"
                                  onClick={() => {
                                    setLocalSigStrokePosition(align);
                                    updateSig({ signature_stroke_position: align });
                                  }}
                                  className={cn("flex-1 h-7 rounded border text-[9px] uppercase transition-colors", localSigStrokePosition === align || (!localSigStrokePosition && align === 'outside') ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:bg-muted/80")}
                                >
                                  {align === 'outside' ? 'Fuera' : 'Medio'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Alineación Texto</label>
                            <div className="flex gap-1">
                              {['left', 'center', 'right'].map(align => (
                                <button
                                  key={align}
                                  type="button"
                                  onClick={() => {
                                    setLocalSigTextAlign(align);
                                    updateSig({ signature_text_align: align }); 
                                  }}
                                  className={cn("flex-1 h-7 rounded border text-[9px] uppercase transition-colors", localSigTextAlign === align || (!localSigTextAlign && align === 'center') ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:bg-muted/80")}
                                >
                                  {align === 'left' ? 'Izq' : align === 'center' ? 'Centro' : 'Der'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Ubicación de Texto</label>
                            <div className="flex gap-1">
                              {[true, false].map(pos => (
                                <button
                                  key={pos ? "inside" : "outside"}
                                  type="button"
                                  onClick={() => {
                                    setLocalSigTextOverImage(pos);
                                    updateSig({ signature_text_over_image: pos });
                                  }}
                                  className={cn("flex-1 h-7 rounded border text-[9px] uppercase transition-colors", localSigTextOverImage === pos || (localSigTextOverImage == null && pos === true) ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:bg-muted/80")}
                                >
                                  {pos ? 'En Imagen' : 'Afuera'}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2">
                          <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Imagen (URL)</label>
                          <Input
                            value={localSigImageUrl}
                            onChange={(e) => {
                              setLocalSigImageUrl(e.target.value);
                              updateSig({ signature_image_url: e.target.value || null });
                            }}
                            className="h-7 bg-muted text-[10px] font-body w-full"
                            placeholder="URL .png o .gif"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Ancho Imagen ({localSigImageWidth}%)</label>
                            <input 
                              type="range" min="10" max="100" step="1" 
                              value={localSigImageWidth} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setLocalSigImageWidth(val);
                                updateSig({ signature_image_width: val });
                              }} 
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Posición Vertical ({localSigImageOffset}%)</label>
                            <input 
                              type="range" min="0" max="100" step="1" 
                              value={localSigImageOffset} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setLocalSigImageOffset(val);
                                updateSig({ signature_image_offset: val });
                              }} 
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="mt-2 p-2 border border-dashed border-border/50 rounded bg-muted/20 text-center">
                          <p className="text-[9px] font-body text-muted-foreground mb-1 uppercase tracking-tighter">Vista previa:</p>
                          <SignatureDisplay
                            text={signature || `— ${profile?.display_name || "Usuario"} [${displayTier}]`}
                            profile={profile ? { 
                              ...(profile as any), 
                              signature, 
                              signature_font_family: localSigFontFamily,
                              signature_font_size: localSigFontSize, 
                              signature_color: localSigColor,
                              signature_stroke_color: localSigStrokeColor,
                              signature_stroke_width: localSigStrokeWidth,
                              signature_stroke_position: localSigStrokePosition,
                              signature_text_align: localSigTextAlign, 
                              signature_text_over_image: localSigTextOverImage,
                              signature_image_url: localSigImageUrl,
                              signature_image_width: localSigImageWidth,
                              signature_image_offset: localSigImageOffset
                            } : { signature } as any}
                            fontSize={localSigFontSize}
                          />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-destructive/80 font-body p-2 border border-destructive/20 rounded bg-destructive/10 text-center">
                    Las firmas personalizadas no están disponibles para el nivel Novato.
                  </p>
                )}
                
                <div className="flex gap-2 w-full mt-3">
                  <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs flex-1">
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(false); setSearchParams({}); }} className="text-xs flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={cn("flex items-center gap-2 flex-wrap", isMobile ? "justify-center" : "")}>
                  <h2 className="font-pixel text-sm text-neon-cyan" style={getNameStyle(profile?.color_name)}>
                    {profile?.display_name}
                  </h2>
                  <RoleBadge 
                    roles={safeRoles} 
                    roleIcon={profile?.role_icon} 
                    showIcon={profile?.show_role_icon !== false} 
                    colorStaffRole={profile?.color_staff_role} 
                  />
                </div>
                
                <p className={cn("text-xs text-muted-foreground font-body mt-1", isMobile ? "text-center" : "")}>
                  {profile?.bio || "Sin descripción"}
                </p>
                
                <div className={cn("flex flex-wrap items-center gap-3 mt-2", isMobile ? "justify-center" : "")}>
                  {isStaff ? (
                    <span className="text-[10px] font-pixel text-neon-magenta flex items-center gap-1" style={getRoleStyle(profile?.color_staff_role)}>
                      <Shield className="w-3 h-3" /> {(isMasterWeb || isAdmin) ? "DIOS TODOPODEROSO" : "MÍTICO"}
                    </span>
                  ) : (
                    <span className="text-[10px] font-pixel text-neon-yellow flex items-center gap-1" style={getRoleStyle(profile?.color_role)}>
                      <Star className="w-3 h-3" /> {safeStr(userTier).toUpperCase()}
                    </span>
                  )}
                  <span className="text-[10px] font-body text-neon-green flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> {(profile?.total_score || 0).toLocaleString()} pts
                  </span>
                  <span className="text-[10px] font-body text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Desde {memberSince}
                  </span>
                  <span className="text-[10px] font-body text-neon-cyan flex items-center gap-1">
                    <UserPlus className="w-3 h-3" /> {followerCount} seguidores · {followingCount} siguiendo
                  </span>
                </div>
                
                {(profile?.instagram_url || profile?.youtube_url || profile?.tiktok_url) && (
                  <div className={cn("flex gap-3 mt-2", isMobile ? "justify-center" : "")}>
                    {profile?.instagram_url && (
                      <a href={profile.instagram_url} target="_blank" rel="noopener" className="text-neon-magenta hover:opacity-80 text-[10px] font-body flex items-center gap-0.5">
                        <Instagram className="w-3.5 h-3.5" /> Instagram
                      </a>
                    )}
                    {profile?.youtube_url && (
                      <a href={profile.youtube_url} target="_blank" rel="noopener" className="text-destructive hover:opacity-80 text-[10px] font-body flex items-center gap-0.5">
                        <Youtube className="w-3.5 h-3.5" /> YouTube
                      </a>
                    )}
                    {profile?.tiktok_url && (
                      <a href={profile.tiktok_url} target="_blank" rel="noopener" className="text-neon-cyan hover:opacity-80 text-[10px] font-body flex items-center gap-0.5">
                        <Globe className="w-3.5 h-3.5" /> TikTok
                      </a>
                    )}
                  </div>
                )}
                
                <div className={cn("flex gap-2 mt-3 flex-wrap", isMobile ? "justify-center" : "")}>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="text-xs gap-1">
                    <Edit2 className="w-3 h-3" /> Editar Perfil
                  </Button>
                  
                  {!isStaff && (
                    <Button size="sm" variant="outline" asChild className="text-xs">
                      <Link to="/membresias">Actualizar Plan</Link>
                    </Button>
                  )}

                  {canUseColors && (
                    <Button size="sm" variant="outline" onClick={() => setShowColorPicker(true)} className="text-xs gap-1">
                      <Palette className="w-3 h-3" /> Colores
                    </Button>
                  )}
                  
                  {isStaff && !safeRoles.includes("moderator") && (
                    <Button size="sm" variant="outline" onClick={() => setShowRoleIconSelector(true)} className="text-xs gap-1">
                      <span>{profile?.role_icon || "⭐"}</span> Icono Rol
                    </Button>
                  )}
                  
                  {isStaff && (
                    <Button size="sm" variant="outline" onClick={toggleShowRoleIcon} className="text-xs gap-1">
                      {profile?.show_role_icon !== false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {profile?.show_role_icon !== false ? "Ocultar Icono" : "Mostrar Icono"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-card border border-border rounded p-1 flex-wrap">
        {tabs.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-body transition-all min-w-[70px]",
              activeTab === tab.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "avisos" && (
        <div className="bg-card border border-border rounded p-4">
          <div className="flex justify-between items-center mb-3">
             <h3 className="font-pixel text-[10px] text-muted-foreground uppercase">MIS AVISOS ({(notifications || []).length + (pendingRequests || []).length})</h3>
             <Button variant="outline" size="sm" onClick={handleClearNotifications} className="h-6 text-[9px] gap-1 px-2 border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3 h-3" /> Limpiar Historial
             </Button>
          </div>

          {/* 🔥 SECCIÓN DE SOLICITUDES DE AMISTAD 🔥 */}
          {(pendingRequests || []).length > 0 && (
            <div className="mb-4 space-y-2 border-b border-border/50 pb-4">
              <h4 className="font-pixel text-[9px] text-neon-cyan uppercase">Solicitudes de amistad pendientes</h4>
              {pendingRequests.map(req => (
                <div key={req.id} className="flex gap-3 p-3 border rounded bg-primary/10 border-primary/30 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-border/50 shrink-0" style={getAvatarBorderStyle(req.profile?.color_avatar_border)}>
                      {req.profile?.avatar_url ? (
                        <img src={req.profile.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-full h-full text-muted-foreground p-1.5" />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <Link to={`/usuario/${req.sender_id}`} className="text-xs font-body font-bold hover:underline transition-colors" style={getNameStyle(req.profile?.color_name)}>
                        {req.profile?.display_name || "Usuario"}
                      </Link>
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
              {notifications.map((notif) => {
                const c = typeConfig[notif.type] || typeConfig.general;
                return (
                  <div key={notif.id} onClick={() => handleMarkAsRead(notif.id)} className={cn("flex gap-3 p-3 border rounded hover:bg-muted/30 transition-colors text-left cursor-pointer", notif.is_read ? "border-border/50" : "bg-primary/5 border-primary/30")}>
                    <div className={cn("shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs", c.color)}>
                      {c.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-body font-medium text-foreground leading-snug">{notif.title}</p>
                      <p className="text-[10px] font-body text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-muted-foreground/70">
                          {new Date(notif.created_at).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {notif.type === "friend_request" && notif.related_id && (
                          <Link to={`/usuario/${notif.related_id}`} onClick={() => handleMarkAsRead(notif.id)} className="text-[9px] text-primary hover:underline font-body">
                            Ver perfil
                          </Link>
                        )}
                        {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan ml-auto" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "posts" && (
        <div className="bg-card border border-border rounded p-4">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left uppercase">
            Mis Posts
          </h3>
          {userPosts.length === 0 ? (
             <p className="text-xs text-muted-foreground font-body text-center md:text-left">
               Aún no has publicado nada
             </p>
          ) : (
             <div className="space-y-2">
               {userPosts.map((post) => (
                 <Link 
                   key={post.id} 
                   to={getCategoryRoute(post.category || "gaming-anime-foro", post.id)} 
                   className="block p-2 border-border/30 border-b hover:bg-muted/30 transition-colors cursor-pointer text-xs truncate"
                 >
                   {post.title}
                 </Link>
               ))}
             </div>
          )}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="bg-card border border-border rounded p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left uppercase">
            Estadísticas
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { val: profile?.total_score?.toLocaleString() || 0, label: "Puntos", color: statPointsColor || "#39ff14" },
              { val: followerCount, label: "Seguidores", color: statFollowersColor || "#ffffff" },
              { val: followingCount, label: "Siguiendo", color: statFollowingColor || "#ffffff" },
              { val: userPosts.length, label: "Posts Foro", color: statPostsForumColor || "#00ffff" },
              { val: socialContentCount, label: "Posts Social", color: statPostsSocialColor || "#ffff00" },
              { val: bestScores.length, label: "Juegos", color: statGamesColor || "#ff8c00" },
              { 
                val: displayTier, 
                label: "Membresía", 
                color: isStaff ? "#39ff14" : "#a1a1aa",
                isStaffTier: isStaff 
              },
            ].map((s, i) => (
              <div key={i} className="bg-muted/30 rounded p-3 text-center flex flex-col justify-center min-h-[70px]">
                <p 
                  className={cn("text-lg font-bold font-body", s.isStaffTier && "animate-pulse")} 
                  style={{ 
                    color: s.color, 
                    filter: s.isStaffTier ? `drop-shadow(0 0 8px ${s.color}cc)` : undefined 
                  }}
                >
                  {s.val}
                </p>
                <p className="text-[10px] uppercase opacity-60 font-body mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {bestScores.length > 0 && (
            <div className="mt-4">
              <h4 className="font-pixel text-[10px] text-neon-green mb-2 flex items-center justify-center md:justify-start gap-1 uppercase">
                <Gamepad2 className="w-3 h-3" /> Puntajes por Juego
              </h4>
              <div className="space-y-1">
                {bestScores.map((gs, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/30 rounded px-3 py-1.5 text-xs font-body">
                    <span className={cn("font-pixel text-[9px]", safeStr(gs?.console_type) === "nes" ? "text-neon-green" : safeStr(gs?.console_type) === "snes" ? "text-neon-cyan" : "text-neon-magenta")}>
                      {safeStr(gs?.console_type).toUpperCase()}
                    </span>
                    <span className="flex-1 text-foreground truncate">{gs.game_name}</span>
                    <span className="text-neon-green font-bold">{gs.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "friends" && user && (
        <FriendsTab userId={user.id} limits={limits} isStaff={isStaff} />
      )}

      {activeTab === "social" && (
        <SocialContentTab
          profile={profile}
          user={user}
          onEditNetworks={() => setEditing(true)}
          limits={limits}
          isStaff={isStaff}
        />
      )}

      {activeTab === "storage" && (
        <AlmacenamientoTab 
          userId={user.id} 
          maxStorage={maxStorage} 
          storageUsed={storageUsed} 
          storageItems={storageItems} 
          setStorageItems={setStorageItems} 
          setStorageUsed={setStorageUsed} 
        />
      )}

      {activeTab === "moderation" && isStaff && (
        <ModerationPanel isStaff={isStaff} isMasterWeb={isMasterWeb} />
      )}
      
    </div>
  );
}

function AlmacenamientoTab({ userId, maxStorage, storageUsed, storageItems, setStorageItems, setStorageUsed }: any) {
  const { toast } = useToast();
  const storagePercent = maxStorage >= 9999 ? 0 : Math.min(100, (storageUsed / maxStorage) * 100);
  
  return (
    <div className="bg-card border border-border rounded p-4 space-y-3 text-center md:text-left">
      <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 uppercase flex items-center gap-1 justify-center md:justify-start">
        <HardDrive className="w-3 h-3" /> Almacenamiento
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-body">
          <span className="text-muted-foreground uppercase opacity-70">Usado</span>
          <span className="text-foreground">{storageUsed.toFixed(1)} MB / {maxStorage >= 9999 ? "∞" : `${maxStorage} MB`}</span>
        </div>
        <div className="w-full h-3 bg-muted rounded overflow-hidden border border-border">
          <div className={cn("h-full transition-all duration-500 rounded", storagePercent > 80 ? "bg-destructive" : "bg-neon-green")} style={{ width: `${storagePercent}%` }} />
        </div>
      </div>
      
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[400px] text-left">
          <div className="grid grid-cols-[1fr_80px_110px_60px_30px] gap-2 text-[9px] font-pixel text-muted-foreground opacity-50 border-b pb-1 uppercase">
            <span>Elemento</span>
            <span>Tipo</span>
            <span>Fecha</span>
            <span className="text-right">Peso</span>
            <span></span>
          </div>
          
          {storageItems.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body py-4 text-center">No hay elementos almacenados</p>
          ) : (
            storageItems.map((item: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_80px_110px_60px_30px] gap-2 text-xs font-body py-2 border-b border-border/30 hover:bg-muted/30 transition-colors items-center group">
                <span className="text-foreground truncate" title={item.name}>{item.name}</span>
                <span className="text-muted-foreground text-[10px] opacity-60">{item.type}</span>
                <span className="text-muted-foreground text-[10px] opacity-60">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                </span>
                <span className="text-right text-muted-foreground text-[10px] opacity-60">
                  {item.size < 1 ? `${Math.round(item.size * 1024)} KB` : `${item.size.toFixed(1)} MB`}
                </span>
                <button
                  onClick={async () => {
                    if (item.id) {
                      await supabase
                        .from(item.type === 'Foto' ? 'photos' : 'social_content')
                        .delete()
                        .eq('id', item.id);
                        
                      setStorageItems((prev: any) => prev.filter((_: any, idx: number) => idx !== i));
                      setStorageUsed((prev: any) => prev - item.size);
                      toast({ title: "Eliminado permanentemente" });
                    }
                  }}
                  className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar permanentemente"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FriendsTab({ userId, limits, isStaff }: any) {
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
     } catch(e) { console.error(e); }
  };

  useEffect(() => { 
    fetchFriends(); 
  }, [userId]);

  const reachedLimit = !isStaff && friends.length >= limits.maxFriends;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-neon-cyan/30 rounded p-4 text-center">
        <h3 className="font-pixel text-[10px] text-neon-cyan uppercase mb-1">Buscar Amigos</h3>
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-body mb-3">
          <span>Límite de amigos: {friends.length} / {limits.maxFriends >= 999 ? "∞" : limits.maxFriends}</span>
        </div>

        <div className="flex gap-1">
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="h-8 bg-muted flex-1 text-xs font-body" 
            placeholder="Nombre..." 
            disabled={reachedLimit}
          />
          <Button 
            onClick={async () => { 
               try { 
                 const { data } = await supabase
                   .from("profiles")
                   .select("user_id, display_name, avatar_url, color_avatar_border, color_name")
                   .ilike("display_name", `%${search}%`)
                   .neq("user_id", userId)
                   .limit(5);
                 setRes(data || []); 
               } catch(e) {}
            }} 
            className="h-8"
            disabled={reachedLimit || !search.trim()}
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {reachedLimit && (
          <p className="text-[10px] text-destructive/80 mt-2 font-body italic">
            Has alcanzado el límite de amigos de tu membresía.
          </p>
        )}
        
        {res.map(r => (
          <div key={r.user_id} className="mt-2 flex justify-between items-center bg-muted/20 p-2 rounded text-xs border border-border/20">
             <span className="font-body" style={getNameStyle(r.color_name)}>
               {r.display_name}
             </span>
             <Button 
               onClick={async () => { 
                  try {
                    const { data: existing } = await supabase.from("friend_requests").select("id").or(`and(sender_id.eq.${userId},receiver_id.eq.${r.user_id}),and(sender_id.eq.${r.user_id},receiver_id.eq.${userId})`);
                    if (existing && existing.length > 0) {
                       toast({ title: "Aviso", description: "Ya existe una solicitud o amistad con este usuario.", variant: "destructive" });
                       return;
                    }
                    
                    const reqId = crypto.randomUUID();
                    const { error } = await supabase.from("friend_requests").insert({ 
                      id: reqId, 
                      sender_id: userId, 
                      receiver_id: r.user_id, 
                      status: 'pending' 
                    } as any); 

                    if (error) {
                      toast({ title: "Error al enviar", description: error.message, variant: "destructive" });
                      return;
                    }

                    await supabase.from("notifications").insert({
                       id: crypto.randomUUID(),
                       user_id: r.user_id,
                       type: "friend_request",
                       title: "Nueva solicitud de amistad",
                       body: `Alguien te ha enviado una solicitud de amistad.`,
                       related_id: userId
                    } as any);
                    
                    toast({ title: "Solicitud enviada" }); 
                    setRes([]);
                    setSearch("");
                  } catch(e: any) {
                    toast({ title: "Error fatal", description: e.message, variant: "destructive" });
                  }
               }} 
               className="h-6 text-[9px] uppercase font-pixel tracking-tighter"
             >
               Añadir
             </Button>
          </div>
        ))}
      </div>
      
      <div className="bg-card border rounded p-4">
        <h3 className="font-pixel text-[10px] opacity-60 mb-2 uppercase text-center md:text-left">
          Amigos ({friends.length})
        </h3>
        
        {friends.length === 0 ? (
           <p className="text-xs text-muted-foreground text-center py-4 font-body opacity-60 uppercase">
             Sin amigos
           </p>
        ) : (
           <div className="space-y-1.5">
             {friends.map(f => (
               <div key={f.user_id} className="p-2 border-b border-border/30 text-xs font-body flex justify-between items-center group">
                 <span style={getNameStyle(f.color_name)}>{f.display_name}</span>
                 <button 
                   onClick={async () => { 
                      await supabase
                        .from("friend_requests")
                        .delete()
                        .or(`and(sender_id.eq.${userId},receiver_id.eq.${f.user_id}),and(sender_id.eq.${f.user_id},receiver_id.eq.${userId})`); 
                      fetchFriends(); 
                   }} 
                   className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <UserMinus className="w-4 h-4" />
                 </button>
               </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
}

function SocialContentTab({ profile, user, onEditNetworks, limits, isStaff }: any) {
  const { toast } = useToast();
  const [contents, setContents] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchContents = async () => {
    const { data } = await supabase
      .from("social_content")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
      
    if (data) setContents(data);
  };

  useEffect(() => { 
    fetchContents(); 
  }, [user.id]);

  const reachedLimit = !isStaff && contents.length >= limits.maxSocialContent;

  const handleAddLink = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    
    let platform = "web";
    let contentType = "post";
    
    const url = newUrl.toLowerCase();
    
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      platform = "youtube";
      contentType = url.includes("shorts") ? "reel" : "video";
    } else if (url.includes("instagram.com")) {
      platform = "instagram";
      contentType = (url.includes("/reel/") || url.includes("/reels/")) ? "reel" : "post";
    } else if (url.includes("tiktok.com")) {
      platform = "tiktok";
      contentType = "reel"; 
    } else if (url.includes("facebook.com") || url.includes("fb.watch")) {
      platform = "facebook";
      contentType = (url.includes("/video") || url.includes("watch")) ? "video" : "post";
    }
    
    const { error } = await supabase.from("social_content").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      content_url: newUrl.trim(),
      title: newTitle.trim() || null,
      platform: platform,
      content_type: contentType,
      is_public: true
    } as any);
    
    setAdding(false);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Añadido al Social Hub", description: `Clasificado como ${platform} ${contentType}` });
      setNewUrl("");
      setNewTitle("");
      fetchContents();
    }
  };

  return (
    <div className="space-y-3">
      <div className="bg-card border rounded p-4 text-center">
        <h3 className="font-pixel text-[10px] opacity-60 mb-3 uppercase font-pixel tracking-tighter">
          Perfiles de Redes Sociales
        </h3>
        <Button variant="outline" onClick={onEditNetworks} className="w-full text-xs mb-2">
          Editar Vínculos de Perfil
        </Button>
      </div>

      <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3">
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-body">
           <h3 className="font-pixel text-neon-cyan uppercase">Publicar en Social Hub</h3>
           <span>Límite: {contents.length} / {limits.maxSocialContent >= 999 ? "∞" : limits.maxSocialContent} posts</span>
        </div>
        <Input 
          placeholder="URL (YouTube, Instagram, TikTok, Facebook...)" 
          value={newUrl} 
          onChange={e => setNewUrl(e.target.value)} 
          className="h-8 bg-muted text-xs w-full font-body"
          disabled={reachedLimit}
        />

        {reachedLimit && (
          <p className="text-[10px] text-destructive/80 font-body italic text-center">
            Has alcanzado el límite de publicaciones de tu membresía.
          </p>
        )}

        <Input 
          placeholder="Título o descripción (Opcional)" 
          value={newTitle} 
          onChange={e => setNewTitle(e.target.value)} 
          className="h-8 bg-muted text-xs w-full font-body"
          disabled={reachedLimit}
        />
        <Button 
          size="sm" 
          onClick={handleAddLink} 
          disabled={adding || !newUrl.trim() || reachedLimit} 
          className="w-full text-xs bg-neon-cyan text-black hover:bg-neon-cyan/80"
        >
          {reachedLimit ? "Límite Alcanzado" : adding ? "Publicando..." : "Publicar en el Hub"}
        </Button>
      </div>
      
      <div className="space-y-2">
        <h3 className="font-pixel text-[10px] opacity-60 mb-2 uppercase text-center mt-4">
          Tu Contenido Publicado
        </h3>
        {contents.length === 0 ? (
           <p className="text-xs text-muted-foreground text-center py-4 font-body opacity-60">
             Aún no has publicado nada
           </p>
        ) : (
          contents.map(c => (
            <div key={c.id} className="p-2 bg-muted/30 rounded text-xs font-body border border-border/20 flex justify-between items-center group gap-2">
               <div className="flex flex-col flex-1 min-w-0">
                 <span className="truncate">{c.title || c.content_url}</span>
                 <span className="text-[9px] text-muted-foreground uppercase opacity-70">
                   {c.platform} • {c.content_type}
                 </span>
               </div>
               <button 
                 onClick={async () => { 
                   if (!confirm("¿Eliminar esta publicación?")) return;
                   await supabase.from("social_content").delete().eq("id", c.id); 
                   fetchContents(); 
                 }} 
                 className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
               >
                 <Trash2 className="w-3.5 h-3.5" />
               </button>
            </div>
          ))
        )}
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

function ModerationPanel({ isStaff, isMasterWeb }: { isStaff: boolean; isMasterWeb: boolean }) {
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
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", ids);
            
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
    
    const { data: target } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("display_name", banEmail)
      .maybeSingle();
      
    if (!target) { 
      toast({ title: "Usuario no encontrado", variant: "destructive" }); 
      setBanning(false); 
      return; 
    }
    
    const { error } = await supabase
      .from("banned_users")
      .insert({ id: crypto.randomUUID(), user_id: target.user_id, reason: banReason, ban_type: 'ban' } as any);
      
    setBanning(false);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else { 
      toast({ title: "Usuario baneado permanentemente" }); 
      setBanEmail(""); 
      setBanReason(""); 
      if (expandedBanned) setExpandedBanned(false);
    }
  };

  const handleUnban = async (banId: string) => {
    const { error } = await supabase.from("banned_users").delete().eq("id", banId);
    if (!error) {
      setBannedUsers(prev => prev.filter(b => b.id !== banId));
      toast({ title: "Sanción revocada. El usuario ha sido desbaneado." });
    } else {
      toast({ title: "Error al desbanear", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-destructive/30 rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-destructive uppercase">Banear Usuario</h3>
        <Input 
          placeholder="Nombre de usuario" 
          value={banEmail} 
          onChange={e => setBanEmail(e.target.value)} 
          className="h-8 bg-muted text-xs w-full" 
        />
        <Input 
          placeholder="Razón" 
          value={banReason} 
          onChange={e => setBanReason(e.target.value)} 
          className="h-8 bg-muted text-xs w-full" 
        />
        <Button variant="destructive" onClick={handleBan} disabled={banning} className="w-full text-xs">
          Procesar Baneo
        </Button>
      </div>

      <div className="bg-card border border-destructive/30 rounded p-4">
        <button 
          onClick={() => setExpandedBanned(!expandedBanned)} 
          className="w-full flex justify-between font-pixel text-[10px] text-destructive uppercase items-center"
        >
          <span>Usuarios Sancionados ({expandedBanned ? bannedUsers.length : "?"})</span>
          <span className="text-xs">{expandedBanned ? "▲" : "▼"}</span>
        </button>
        
        {expandedBanned && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1 retro-scrollbar">
            {bannedUsers.length === 0 ? (
               <p className="text-[10px] text-muted-foreground text-center py-2 uppercase opacity-60">
                 No hay usuarios sancionados
               </p>
            ) : (
              bannedUsers.map(b => (
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
                    <button 
                      onClick={() => handleUnban(b.id)} 
                      className="text-neon-green hover:text-neon-green/80 text-[9px] font-body flex items-center gap-1 border border-neon-green/30 px-1.5 py-0.5 rounded hover:bg-neon-green/10 transition-colors"
                    >
                      <Unlock className="w-2.5 h-2.5" /> Revocar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 🔥 AQUÍ LLAMAMOS AL NUEVO PANEL DE CONTENIDO BANEADO 🔥 */}
      <BannedContentPanel />

      {isMasterWeb && (
        <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3 text-center mt-4">
          <h3 className="font-pixel text-[10px] text-neon-cyan uppercase">Asignar Roles</h3>
          <Input 
            placeholder="Usuario" 
            value={modEmail} 
            onChange={e => setModEmail(e.target.value)} 
            className="h-8 bg-muted text-xs w-full" 
          />
          <div className="flex gap-2">
             <Button 
               onClick={async () => { 
                  const { data } = await supabase
                    .from("profiles")
                    .select("user_id")
                    .ilike("display_name", modEmail)
                    .maybeSingle();
                    
                  if (data) {
                    const { error } = await supabase
                      .from("user_roles")
                      .insert({ id: crypto.randomUUID(), user_id: data.user_id, role: "moderator" } as any);
                      
                    if (error) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Moderador asignado" });
                      setModEmail(""); 
                    }
                  } else {
                    toast({ title: "Usuario no encontrado", variant: "destructive" });
                  }
               }} 
               className="flex-1 text-xs"
             >
               Asignar Moderador
             </Button>
             
             <Button 
               variant="outline" 
               onClick={async () => { 
                  const { data } = await supabase
                    .from("profiles")
                    .select("user_id")
                    .ilike("display_name", modEmail)
                    .maybeSingle();
                    
                  if (data) {
                    const { error } = await supabase
                      .from("user_roles")
                      .insert({ id: crypto.randomUUID(), user_id: data.user_id, role: "admin" } as any);
                      
                    if (error) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    } else {
                      toast({ title: "Admin asignado" });
                      setModEmail("");
                    }
                  } else {
                    toast({ title: "Usuario no encontrado", variant: "destructive" });
                  }
               }} 
               className="flex-1 text-xs"
             >
               Asignar Admin
             </Button>
          </div>
        </div>
      )}

      <ModeratorList isMasterWeb={isMasterWeb} />

      {isStaff && (
        <div className="bg-card border border-neon-yellow/30 rounded p-4 space-y-3 text-center">
          <h3 className="font-pixel text-[10px] text-neon-yellow uppercase">Gestionar Membresías</h3>
          <Input 
            placeholder="Usuario" 
            value={membershipSearch} 
            onChange={e => setMembershipSearch(e.target.value)} 
            className="h-8 bg-muted text-xs w-full" 
          />
          
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["novato", "entusiasta", "coleccionista", "leyenda arcade", "miembro del legado", "creador de contenido"].map(t => (
              <button 
                key={t} 
                onClick={() => setSelectedTier(t)} 
                className={cn(
                  "px-2 py-1 rounded text-[10px] border transition-colors", 
                  selectedTier === t ? "bg-neon-yellow text-black border-neon-yellow" : "bg-muted border-border hover:border-neon-yellow/50"
                )}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          
          <Button 
            size="sm" 
            onClick={async () => {
              if (!membershipSearch.trim()) return;
              
              const { data: tp } = await supabase
                .from("profiles")
                .select("user_id")
                .ilike("display_name", membershipSearch)
                .maybeSingle();
                
              if (!tp) { 
                toast({ title: "No encontrado", variant: "destructive" }); 
                return; 
              }
              
              const { error } = await supabase
                .from("profiles")
                .update({ membership_tier: selectedTier } as any)
                .eq("user_id", tp.user_id);
                
              if (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
              } else {
                setMembershipSearch("");
                toast({ title: "Membresía actualizada" });
              }
            }} 
            className="w-full bg-neon-yellow/20 text-neon-yellow hover:bg-neon-yellow/30 border border-neon-yellow/30 transition-colors"
          >
            Actualizar
          </Button>
        </div>
      )}
    </div>
  );
}

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
                      await supabase
                        .from("user_roles")
                        .delete()
                        .eq("id", m.id); 
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