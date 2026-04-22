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

const friendLimits: Record<string, number> = {
  novato: 25,
  entusiasta: 50,
  coleccionista: 100,
  "leyenda arcade": 200,
};

const storageLimits: Record<string, number> = {
  novato: 50,
  entusiasta: 150,
  coleccionista: 500,
  "leyenda arcade": 2000,
};

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  friend_request: { icon: <UserPlus className="w-3.5 h-3.5" />, color: "text-neon-cyan" },
  friend_accepted: { icon: <UserPlus className="w-3.5 h-3.5" />, color: "text-neon-green" },
  follow: { icon: <Heart className="w-3.5 h-3.5" />, color: "text-neon-magenta" },
  comment: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-neon-green" },
  mention: { icon: <Users className="w-3.5 h-3.5" />, color: "text-neon-orange" },
  achievement: { icon: <Trophy className="w-3.5 h-3.5" />, color: "text-neon-yellow" },
  general: { icon: <Star className="w-3.5 h-3.5" />, color: "text-muted-foreground" },
};

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
  const [signature, setSignature] = useState("");
  
  const [localSigFontSize, setLocalSigFontSize] = useState(13);
  const [localSigStrokeWidth, setLocalSigStrokeWidth] = useState(1);
  const [localSigImageOffset, setLocalSigImageOffset] = useState(50);
  
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
      setDisplayName(profile.display_name);
      setBio(profile.bio || "");
      setInstagram(profile.instagram_url || "");
      setYoutube(profile.youtube_url || "");
      setTiktok(profile.tiktok_url || "");
      
      if (!editing) {
        setSignature((profile as any).signature || "");
        setLocalSigFontSize((profile as any).signature_font_size || 13);
        setLocalSigStrokeWidth((profile as any).signature_stroke_width ?? 1);
        setLocalSigImageOffset((profile as any).signature_image_offset ?? 50);
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

  useEffect(() => {
    if (!user) return;
    
    supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { 
        if (data) setUserPosts(data); 
      });

    Promise.all([
      supabase.from("social_content").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("user_id", user.id)
    ]).then(([socialRes, photosRes]) => {
      setSocialContentCount((socialRes.count || 0) + (photosRes.count || 0));
    });
    
    supabase
      .from("leaderboard_scores")
      .select("game_name, console_type, score")
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .then(({ data }) => { 
        if (data) setGameScores(data as any); 
      });
    
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.id)
      .then(({ count }) => setFollowerCount(count || 0));
      
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", user.id)
      .then(({ count }) => setFollowingCount(count || 0));
    
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (data) setNotifications(data);
    };
    fetchNotifs();

    const loadStorage = async () => {
      const items: {type: string; name: string; size: number; id?: string; created_at?: string}[] = [];
      
      const { data: scores } = await supabase
        .from("leaderboard_scores")
        .select("id, game_name, console_type, created_at")
        .eq("user_id", user.id);
        
      scores?.forEach(s => items.push({ 
        type: "Partida guardada", 
        name: `${s.game_name} (${(s as any).console_type?.toUpperCase()})`, 
        size: 2, 
        id: s.id, 
        created_at: s.created_at 
      }));
      
      const { data: avatarFiles } = await supabase.storage.from("avatars").list(user.id);
      avatarFiles?.forEach(f => items.push({ 
        type: "Avatar", 
        name: f.name, 
        size: Math.round((f.metadata?.size || 500000) / 1024 / 1024 * 100) / 100, 
        created_at: f.created_at 
      }));
      
      const { data: social } = await supabase
        .from("social_content")
        .select("id, title, content_url, created_at")
        .eq("user_id", user.id);
        
      social?.forEach(s => items.push({ 
        type: "Contenido social", 
        name: s.title || s.content_url, 
        size: 0.1, 
        id: s.id, 
        created_at: s.created_at 
      }));
      
      const { data: photos } = await supabase
        .from("photos")
        .select("id, caption, image_url, created_at")
        .eq("user_id", user.id);
        
      photos?.forEach(p => items.push({ 
        type: "Foto", 
        name: p.caption || "Foto", 
        size: 1, 
        id: p.id, 
        created_at: p.created_at 
      }));
      
      items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      
      setStorageItems(items);
      setStorageUsed(items.reduce((sum, i) => sum + i.size, 0));
    };
    
    loadStorage();
  }, [user]);

  useEffect(() => {
    if (activeTab === "avisos" && user) {
      const markAsRead = async () => {
        await supabase
          .from("notifications")
          .update({ is_read: true } as any)
          .eq("user_id", user.id)
          .eq("is_read", false);
          
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); 
      };
      markAsRead();
    }
  }, [activeTab, user]);

  const updateSig = (patch: Record<string, any>) => {
    if ((window as any).__sigUpdateTimer) clearTimeout((window as any).__sigUpdateTimer);
    (window as any).__sigUpdateTimer = setTimeout(() => {
      supabase.from("profiles").update(patch as any).eq("user_id", user!.id).then(() => refreshProfile());
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
        signature_font_size: localSigFontSize,
        signature_stroke_width: localSigStrokeWidth,
        signature_image_offset: localSigImageOffset
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

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Error", description: "Solo JPG, PNG o GIF", variant: "destructive" }); 
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Máximo 2MB", variant: "destructive" }); 
      return;
    }
    
    const img = new Image();
    const url = URL.createObjectURL(file);
    const dimOk = await new Promise<boolean>((resolve) => {
      img.onload = () => { 
        resolve(img.width <= 500 && img.height <= 500); 
        URL.revokeObjectURL(url); 
      };
      img.onerror = () => { 
        resolve(false); 
        URL.revokeObjectURL(url); 
      };
      img.src = url;
    });
    
    if (!dimOk) {
      toast({ title: "Error", description: "Máximo 500x500 píxeles", variant: "destructive" }); 
      return;
    }
    
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar_${Date.now()}.${ext}`;
    
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
      return; 
    }
    
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await handleAvatarSelect(publicUrl);
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

  const memberSince = user.created_at 
    ? new Date(user.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "long" }) 
    : "Desconocido";
    
  const tier = profile?.membership_tier || "novato";
  const maxFriends = (isAdmin || isMasterWeb) ? Infinity : (friendLimits[tier] || 25);
  const maxStorage = (isAdmin || isMasterWeb) ? Infinity : (storageLimits[tier] || 50);
  const isMod = roles.includes("moderator");
  const isStaff = isAdmin || isMasterWeb;
  
  const displayTier = (isStaff || isMod) ? "STAFF" : tier.toUpperCase();

  const bestScores = Object.values(
    gameScores.reduce<Record<string, { game_name: string; console_type: string; score: number }>>((acc, gs) => {
      const key = `${gs.game_name}-${gs.console_type}`;
      if (!acc[key] || gs.score > acc[key].score) acc[key] = gs;
      return acc;
    }, {})
  );

  const getValidHex = (val: string | null | undefined) => {
    if (!val) return "#ffffff";
    const hex = String(val).trim();
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) return hex;
    if (/^#[0-9A-Fa-f]{3}$/i.test(hex)) return '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
    return "#ffffff"; 
  };

  const [localColorCache, setLocalColorCache] = useState("#ffffff");

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

  const tabs = [
    { id: "avisos" as const, label: "Avisos", icon: Bell },
    { id: "posts" as const, label: "Posts", icon: MessageSquare },
    { id: "stats" as const, label: "Stats", icon: Trophy },
    { id: "friends" as const, label: "Amigos", icon: UserPlus },
    { id: "social" as const, label: "Redes", icon: Globe },
    { id: "storage" as const, label: "Storage", icon: Gamepad2 },
    ...((isStaff || isMod) ? [{ id: "moderation" as const, label: "Moderación", icon: Shield }] : []),
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {showAvatarSelector && (
        <AvatarSelector
          currentAvatar={profile?.avatar_url || null}
          membershipTier={tier}
          isStaff={isStaff || isMod || tier !== "novato"}
          onSelect={handleAvatarSelect}
          onUpload={(isStaff || isMod || tier !== "novato") ? handleAvatarUpload : undefined}
          onClose={() => setShowAvatarSelector(false)}
        />
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
                  {(isStaff || isMod) && <option value="staff">Rango de Staff</option>}
                  {!(isStaff || isMod) && <option value="role">Rango de Membresía</option>}
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
                
                {(tier !== "novato" || isStaff || isMod) && (() => {
                  const sigFontFamily = (profile as any)?.signature_font_family || "Inter";
                  const sigFontSize = localSigFontSize;
                  const sigColor = (profile as any)?.signature_color || "#facc15";
                  const sigStroke = (profile as any)?.signature_stroke_color || "";
                  const sigStrokeWidth = localSigStrokeWidth;
                  const sigStrokePos = (profile as any)?.signature_stroke_position || "middle";
                  const sigFontStyle = (profile as any)?.signature_font || "normal";
                  const sigTextAlign = (profile as any)?.signature_text_align || "center";
                  const sigImageAlign = (profile as any)?.signature_image_align || "center";
                  const sigImageWidth = (profile as any)?.signature_image_width || 100;
                  const sigImageUrl = (profile as any)?.signature_image_url || "";
                  const sigOverImage = (profile as any)?.signature_text_over_image ?? false;
                  
                  const canAdvanced = isStaff || isMod || ["coleccionista", "leyenda arcade", "creador verificado"].includes(tier);
                  
                  const previewProfile = { 
                    ...(profile as any), 
                    signature, 
                    signature_font_size: localSigFontSize,
                    signature_stroke_width: localSigStrokeWidth,
                    signature_image_offset: localSigImageOffset
                  };
                  
                  const googleFonts = ["Inter", "Roboto", "Lobster", "Pacifico", "Bebas Neue", "Press Start 2P", "Orbitron", "Dancing Script", "Permanent Marker", "Bangers"];
                  const fontSizesOptions = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30];

                  return (
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
                        maxLength={isStaff ? 500 : tier === "entusiasta" ? 50 : tier === "coleccionista" ? 100 : 200}
                      />
                      
                      {canAdvanced && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Tipografía</label>
                              <select
                                value={sigFontFamily}
                                onChange={(e) => updateSig({ signature_font_family: e.target.value })}
                                className="w-full h-7 rounded border border-border bg-muted text-[10px] font-body px-1"
                              >
                                {googleFonts.map(f => <option key={f} value={f}>{f}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Tamaño de letra</label>
                              <select
                                value={sigFontSize}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setLocalSigFontSize(val);
                                  updateSig({ signature_font_size: val });
                                }}
                                className="w-full h-7 rounded border border-border bg-muted text-[10px] font-body px-1"
                              >
                                {fontSizesOptions.map(size => <option key={size} value={size}>{size}px</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Estilo</label>
                              <select
                                value={sigFontStyle}
                                onChange={(e) => updateSig({ signature_font: e.target.value })}
                                className="w-full h-7 rounded border border-border bg-muted text-[10px] font-body px-1"
                              >
                                <option value="normal">Regular</option>
                                <option value="bold">Bold</option>
                                <option value="italic">Italic</option>
                                <option value="bold-italic">Bold + Italic</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Color trazo</label>
                              <div className="flex gap-1">
                                <input
                                  type="color"
                                  value={sigStroke || "#000000"}
                                  onChange={(e) => updateSig({ signature_stroke_color: e.target.value })}
                                  className="flex-1 h-7 rounded border border-border cursor-pointer bg-muted"
                                />
                                {sigStroke && (
                                  <button 
                                    type="button" 
                                    onClick={() => updateSig({ signature_stroke_color: null })} 
                                    className="h-7 px-2 text-[9px] bg-muted border border-border rounded"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Color relleno</label>
                              <input
                                type="color"
                                value={sigColor}
                                onChange={(e) => updateSig({ signature_color: e.target.value })}
                                className="w-full h-7 rounded border border-border cursor-pointer bg-muted"
                              />
                            </div>
                            {sigStroke && (
                               <div>
                                 <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">
                                   Grosor trazo: {localSigStrokeWidth}px
                                 </label>
                                 <input
                                   type="range"
                                   min={1}
                                   max={6}
                                   step={1}
                                   value={localSigStrokeWidth}
                                   onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      setLocalSigStrokeWidth(val);
                                      updateSig({ signature_stroke_width: val });
                                   }}
                                   className="w-full h-7 cursor-pointer accent-primary"
                                 />
                               </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Posición trazo</label>
                              <div className="flex gap-1">
                                {(["outside", "middle", "inside"] as const).map(p => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => updateSig({ signature_stroke_position: p })}
                                    className={cn(
                                      "flex-1 h-7 text-[8px] rounded border font-body uppercase transition-colors", 
                                      sigStrokePos === p ? "border-primary bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/70"
                                    )}
                                  >
                                    {p.slice(0, 3)}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Alineación texto</label>
                                <div className="flex gap-1">
                                  {["left", "center", "right"].map(a => (
                                    <button
                                      key={a}
                                      type="button"
                                      onClick={() => updateSig({ signature_text_align: a })}
                                      className={cn(
                                        "flex-1 h-7 text-[8px] rounded border uppercase transition-colors", 
                                        sigTextAlign === a ? "border-primary bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/70"
                                      )}
                                    >
                                      {a.slice(0, 3)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Imagen (URL)</label>
                            <Input
                              value={sigImageUrl}
                              onChange={(e) => updateSig({ signature_image_url: e.target.value || null })}
                              className="h-7 bg-muted text-[10px] font-body w-full"
                              placeholder="URL .png o .gif"
                            />
                          </div>
                          
                          {sigImageUrl && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Alineación imagen</label>
                                  <div className="flex gap-1">
                                    {["left", "center", "right"].map(a => (
                                      <button
                                        key={a}
                                        type="button"
                                        onClick={() => updateSig({ signature_image_align: a })}
                                        className={cn(
                                          "flex-1 h-7 text-[8px] rounded border font-body uppercase transition-colors", 
                                          sigImageAlign === a ? "border-primary bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/70"
                                        )}
                                      >
                                        {a.slice(0, 3)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Ancho imagen</label>
                                  <div className="flex gap-1">
                                    {[35, 70, 100].map(w => (
                                      <button
                                        key={w}
                                        type="button"
                                        onClick={() => updateSig({ signature_image_width: w })}
                                        className={cn(
                                          "flex-1 h-7 text-[8px] rounded border font-body transition-colors", 
                                          sigImageWidth === w ? "border-primary bg-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/70"
                                        )}
                                      >
                                        {w}%
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">
                                  Encuadre vertical: {localSigImageOffset}%
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={localSigImageOffset}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setLocalSigImageOffset(val);
                                    updateSig({ signature_image_offset: val });
                                  }}
                                  className="w-full h-7 cursor-pointer accent-primary"
                                />
                              </div>
                              <label className="flex items-center gap-2 text-[10px] font-body text-muted-foreground cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sigOverImage}
                                  onChange={(e) => updateSig({ signature_text_over_image: e.target.checked })}
                                  className="accent-primary"
                                />
                                Texto sobre la imagen
                              </label>
                            </>
                          )}
                          <div className="mt-2 p-2 border border-dashed border-border/50 rounded bg-muted/20 text-center">
                            <p className="text-[9px] font-body text-muted-foreground mb-1 uppercase tracking-tighter">Vista previa:</p>
                            <SignatureDisplay
                              text={signature || `— ${profile?.display_name} [${displayTier}]`}
                              profile={previewProfile}
                              fontSize={localSigFontSize}
                            />
                          </div>
                        </>
                      )}
                      <p className="text-[9px] text-muted-foreground text-center mt-2">
                        {isStaff ? "Sin límite (Staff)" : tier === "entusiasta" ? "Máx. 50 caracteres (texto)" : tier === "coleccionista" ? "Máx. 100 caracteres + estilos" : "Máx. 200 caracteres + diseño completo"}
                      </p>
                    </div>
                  );
                })()}
                
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
                    roles={roles} 
                    roleIcon={profile?.role_icon} 
                    showIcon={profile?.show_role_icon !== false} 
                    colorStaffRole={profile?.color_staff_role} 
                  />
                </div>
                
                <p className={cn("text-xs text-muted-foreground font-body mt-1", isMobile ? "text-center" : "")}>
                  {profile?.bio || "Sin descripción"}
                </p>
                
                <div className={cn("flex flex-wrap items-center gap-3 mt-2", isMobile ? "justify-center" : "")}>
                  {(isStaff || isMod) ? (
                    <span className="text-[10px] font-pixel text-neon-magenta flex items-center gap-1" style={getRoleStyle(profile?.color_staff_role)}>
                      <Shield className="w-3 h-3" /> {(isMasterWeb || isAdmin) ? "DIOS TODOPODEROSO" : "MÍTICO"}
                    </span>
                  ) : (
                    <span className="text-[10px] font-pixel text-neon-yellow flex items-center gap-1" style={getRoleStyle(profile?.color_role)}>
                      <Star className="w-3 h-3" /> {tier.toUpperCase()}
                    </span>
                  )}
                  <span className="text-[10px] font-body text-neon-green flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> {profile?.total_score?.toLocaleString()} pts
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
                  
                  {!(isStaff || isMod) && (
                    <Button size="sm" variant="outline" asChild className="text-xs">
                      <Link to="/membresias">Actualizar Plan</Link>
                    </Button>
                  )}

                  {(["coleccionista", "creador verificado", "leyenda arcade"].includes(tier) || isStaff || isMod) && (
                    <Button size="sm" variant="outline" onClick={() => setShowColorPicker(true)} className="text-xs gap-1">
                      <Palette className="w-3 h-3" /> Colores
                    </Button>
                  )}
                  
                  {(isStaff || isMod) && !roles.includes("moderator") && (
                    <Button size="sm" variant="outline" onClick={() => setShowRoleIconSelector(true)} className="text-xs gap-1">
                      <span>{profile?.role_icon || "⭐"}</span> Icono Rol
                    </Button>
                  )}
                  
                  {(isStaff || isMod) && (
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
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left">
            MIS AVISOS ({notifications.length})
          </h3>
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body text-center md:text-left">No tienes avisos recientes</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => {
                const c = typeConfig[notif.type] || typeConfig.general;
                return (
                  <div key={notif.id} className={cn("flex gap-3 p-3 border rounded hover:bg-muted/30 transition-colors text-left", notif.is_read ? "border-border/50" : "bg-primary/5 border-primary/30")}>
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
                          <Link to={`/usuario/${notif.related_id}`} className="text-[9px] text-primary hover:underline font-body">
                            Ver perfil
                          </Link>
                        )}
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
                color: (isStaff || isMod) ? "#39ff14" : "#a1a1aa",
                isStaffTier: (isStaff || isMod) 
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
        </div>
      )}

      {activeTab === "friends" && user && (
        <FriendsTab userId={user.id} />
      )}

      {activeTab === "social" && (
        <SocialContentTab
          profile={profile}
          user={user}
          onEditNetworks={() => setEditing(true)}
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

      {activeTab === "moderation" && (isStaff || isMod) && (
        <ModerationPanel isStaff={isStaff} isMasterWeb={isMasterWeb} />
      )}
      
    </div>
  );
}

// 🔥 COMPONENTES DE APOYO EXPANDIDOS

function AlmacenamientoTab({ userId, maxStorage, storageUsed, storageItems, setStorageItems, setStorageUsed }: any) {
  const { toast } = useToast();
  const storagePercent = maxStorage === Infinity ? 0 : Math.min(100, (storageUsed / maxStorage) * 100);
  
  return (
    <div className="bg-card border border-border rounded p-4 space-y-3 text-center md:text-left">
      <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 uppercase flex items-center gap-1 justify-center md:justify-start">
        <HardDrive className="w-3 h-3" /> Almacenamiento
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-body">
          <span className="text-muted-foreground uppercase opacity-70">Usado</span>
          <span className="text-foreground">{storageUsed.toFixed(1)} MB / {maxStorage === Infinity ? "∞" : `${maxStorage} MB`}</span>
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
      .insert({ user_id: target.user_id, reason: banReason, ban_type: 'ban' });
      
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

      {isMasterWeb && (
        <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3 text-center">
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
                      .insert({ user_id: data.user_id, role: "moderator" });
                      
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
                      .insert({ user_id: data.user_id, role: "admin" });
                      
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
            {["novato", "entusiasta", "coleccionista", "leyenda arcade"].map(t => (
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
    supabase
      .from("user_roles")
      .select("id, user_id")
      .eq("role", "moderator")
      .then(async ({ data }) => {
        if (!data) return;
        
        const ids = data.map(r => r.user_id);
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", ids);
          
        setModerators(data.map(r => ({ 
          ...r, 
          display_name: profs?.find(p => p.user_id === r.user_id)?.display_name 
        })));
      });
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

function SocialContentTab({ profile, user, onEditNetworks }: any) {
  const { toast } = useToast();
  const [contents, setContents] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);

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

  useEffect(() => {
    const fetchPreview = async () => {
      if (!newUrl.trim() || !newUrl.startsWith("http")) {
        setPreviewImage(null);
        setIsFetchingPreview(false);
        return;
      }
      
      setIsFetchingPreview(true);
      let finalUrl = null;

      try {
        const isInstagram = newUrl.includes("instagram.com");

        if (isInstagram) {
          try {
            console.log("🚀 LLAMANDO A SUPABASE EDGE FUNCTION...");
            const { data, error } = await supabase.functions.invoke('extract-instagram', {
              body: { url: newUrl }
            });

            console.log("📦 RESPUESTA DE SUPABASE:", data, error);

            if (error) {
              toast({ title: "Error en Supabase", description: error.message, variant: "destructive" });
              throw error;
            }
            
            if (data?.imageUrl) {
              console.log("✅ IMAGEN ENCONTRADA EN APIFY:", data.imageUrl);
              finalUrl = data.imageUrl;
            } else {
              toast({ title: "Apify no encontró la imagen", description: JSON.stringify(data), variant: "destructive" });
            }
          } catch (err) {
            console.error("❌ ERROR CRÍTICO EN EDGE FUNCTION:", err);
            toast({ title: "Falló la extracción", description: "Revisa la consola (F12)", variant: "destructive" });
          }
        }

        // Ya NO hacemos fallback a Microlink si es Instagram, para OBLIGAR a ver el error.
        if (!finalUrl && !isInstagram) {
          try {
            const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(newUrl)}`);
            const fallbackData = await res.json();
            
            if (fallbackData.status === "success" && fallbackData.data.image?.url) {
              finalUrl = fallbackData.data.image.url;
            }
          } catch (err) {
            console.error("Error en Microlink:", err);
          }
        }
        
      } catch (e) {
        console.error("Error crítico extrayendo preview:", e);
      } finally {
        setPreviewImage(finalUrl);
        setIsFetchingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreview, 1000);
    return () => clearTimeout(timer);
  }, [newUrl]);

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
      user_id: user.id,
      content_url: newUrl.trim(),
      title: newTitle.trim() || null,
      platform: platform,
      content_type: contentType,
      thumbnail_url: previewImage, 
      is_public: true
    } as any);
    
    setAdding(false);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Añadido al Social Hub", description: `Clasificado como ${platform} ${contentType}` });
      setNewUrl("");
      setNewTitle("");
      setPreviewImage(null);
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
        <h3 className="font-pixel text-[10px] text-neon-cyan uppercase">Publicar en Social Hub</h3>
        <p className="text-[10px] text-muted-foreground font-body leading-tight">
          Pega el link de tu video, reel o foto. El sistema detectará automáticamente si va a "Videos & Reels" o al "Muro Fotográfico".
        </p>
        <Input 
          placeholder="URL (YouTube, Instagram, TikTok, Facebook...)" 
          value={newUrl} 
          onChange={e => setNewUrl(e.target.value)} 
          className="h-8 bg-muted text-xs w-full font-body" 
        />

        {newUrl.trim().startsWith("http") && (
          <div className="mt-3 p-3 border border-neon-cyan/50 rounded-xl bg-black/20 animate-fade-in flex flex-col items-center justify-center min-h-[120px]">
            {isFetchingPreview ? (
              <div className="flex flex-col items-center text-neon-cyan gap-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-[10px] font-pixel uppercase tracking-widest">Cargando...</span>
              </div>
            ) : previewImage ? (
              <div className="w-full flex flex-col items-center gap-3">
                <p className="text-[9px] text-neon-green font-pixel uppercase tracking-widest text-center">¡Portada Extraída con Éxito!</p>
                <div className="w-full flex items-center justify-center p-2 bg-black rounded-lg border border-white/20 shadow-xl">
<img 
  /* 🔥 AQUÍ ESTÁ LA MAGIA: Pasamos el link por el túnel proxy de wsrv.nl 🔥 */
  src={`https://wsrv.nl/?url=${encodeURIComponent(previewImage)}`} 
  alt="Preview" 
  referrerPolicy="no-referrer"
  crossOrigin="anonymous"
  style={{
    width: "auto", /* 🔥 Cambiado de 100% a auto para no estirarse 🔥 */
    height: "auto",
    maxHeight: "250px", /* 🔥 Reducido de 400px a 250px 🔥 */
    maxWidth: "100%", /* Asegura que no se salga del contenedor en móviles */
    objectFit: "contain",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)" /* Un sombreado elegante */
  }}
  onError={(e) => {
    // Si incluso el proxy falla (muy raro), intentamos cargarla directo como último recurso
    if (!e.currentTarget.src.includes('wsrv.nl')) return;
    e.currentTarget.src = previewImage;
  }}
/>
                </div>
                <p className="text-[9px] text-muted-foreground font-body text-center">
                  Esta imagen se usará en el Muro y Feed. Cero MB gastados.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-muted-foreground gap-2 opacity-50">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[9px] font-body text-center">No se pudo extraer imagen miniatura.<br/>Se usará el reproductor por defecto.</span>
              </div>
            )}
          </div>
        )}

        <Input 
          placeholder="Título o descripción (Opcional)" 
          value={newTitle} 
          onChange={e => setNewTitle(e.target.value)} 
          className="h-8 bg-muted text-xs w-full font-body" 
        />
        <Button 
          size="sm" 
          onClick={handleAddLink} 
          disabled={adding || !newUrl.trim()} 
          className="w-full text-xs bg-neon-cyan text-black hover:bg-neon-cyan/80"
        >
          {adding ? "Publicando..." : "Publicar en el Hub"}
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

function FriendsTab({ userId }: any) {
  const { toast } = useToast();
  const [friends, setFriends] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [res, setRes] = useState<any[]>([]);

  const fetchFriends = async () => {
     const { data } = await supabase
       .from("friend_requests")
       .select("*")
       .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
       .eq("status", "accepted");
       
     if (!data) return;
     
     const ids = data.map(r => r.sender_id === userId ? r.receiver_id : r.sender_id);
     
     const { data: profs } = await supabase
       .from("profiles")
       .select("user_id, display_name, avatar_url, color_avatar_border, color_name")
       .in("user_id", ids);
       
     setFriends(profs || []);
  };

  useEffect(() => { 
    fetchFriends(); 
  }, [userId]);

  return (
    <div className="space-y-4">
      <div className="bg-card border border-neon-cyan/30 rounded p-4 text-center">
        <h3 className="font-pixel text-[10px] text-neon-cyan uppercase mb-3">Buscar Amigos</h3>
        <div className="flex gap-1">
          <Input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            className="h-8 bg-muted flex-1 text-xs font-body" 
            placeholder="Nombre..." 
          />
          <Button 
            onClick={async () => { 
               const { data } = await supabase
                 .from("profiles")
                 .select("user_id, display_name, avatar_url, color_avatar_border, color_name")
                 .ilike("display_name", `%${search}%`)
                 .neq("user_id", userId)
                 .limit(5);
               setRes(data || []); 
            }} 
            className="h-8"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
        
        {res.map(r => (
          <div key={r.user_id} className="mt-2 flex justify-between items-center bg-muted/20 p-2 rounded text-xs border border-border/20">
             <span className="font-body" style={getNameStyle(r.color_name)}>
               {r.display_name}
             </span>
             <Button 
               onClick={async () => { 
                  await supabase
                    .from("friend_requests")
                    .insert({ sender_id: userId, receiver_id: r.user_id }); 
                  toast({ title: "Solicitud enviada" }); 
                  setRes([]);
                  setSearch("");
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