import { useState, useEffect } from "react";
import { User, Edit2, Trophy, Star, Instagram, Youtube, MapPin, Globe, Gamepad2, Calendar, Shield, MessageSquare, UserPlus, UserMinus, Ban, Clock, Eye, EyeOff, Plus, Trash2, Link2, Music2, Palette, HardDrive, Image as ImageIcon, Save, Search, Bell, Heart, Users } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile"; // 🔥 Importamos el hook móvil

const friendLimits: Record<string, number> = {
  novato: 25, entusiasta: 50, coleccionista: 100, "leyenda arcade": 200,
};

const storageLimits: Record<string, number> = {
  novato: 50, entusiasta: 150, coleccionista: 500, "leyenda arcade": 2000,
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
  const isMobile = useIsMobile(); // 🔥 Hook para detectar móvil
  const [searchParams, setSearchParams] = useSearchParams();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [signature, setSignature] = useState("");
  // 🔥 ESTADOS LOCALES PARA SLIDERS Y CONTROLES FLUIDOS
  const [localSigFontSize, setLocalSigFontSize] = useState(13);
  const [localSigStrokeWidth, setLocalSigStrokeWidth] = useState(1);
  const [localSigImageOffset, setLocalSigImageOffset] = useState(50);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [gameScores, setGameScores] = useState<{game_name: string; console_type: string; score: number}[]>([]);
  
  const tabFromUrl = searchParams.get("tab") as any;
  const validTabs = ["avisos", "posts", "stats", "social", "storage", "moderation", "friends"];
  const [activeTab, setActiveTab] = useState<"avisos" | "posts" | "stats" | "social" | "storage" | "moderation" | "friends">(validTabs.includes(tabFromUrl) ? tabFromUrl : "avisos");
  
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showRoleIconSelector, setShowRoleIconSelector] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorTarget, setColorTarget] = useState<"border" | "name" | "role" | "staff">("border");
  const [avatarBorderColor, setAvatarBorderColor] = useState("");
  const [nameColor, setNameColor] = useState("");
  const [roleColor, setRoleColor] = useState("");
  const [staffRoleColor, setStaffRoleColor] = useState("");
  const [storageItems, setStorageItems] = useState<{type: string; name: string; size: number; id?: string; created_at?: string}[]>([]);
  const [savingColors, setSavingColors] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // 🔥 FIX: Si vienes del botón de Configuraciones del sidebar, activa el modo edición
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
    }
  }, [profile, editing]);

  useEffect(() => {
    if (!user) return;
    
    supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setUserPosts(data); });
    
    supabase.from("leaderboard_scores").select("game_name, console_type, score").eq("user_id", user.id).order("score", { ascending: false })
      .then(({ data }) => { if (data) setGameScores(data as any); });
    
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id)
      .then(({ count }) => setFollowerCount(count || 0));
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id)
      .then(({ count }) => setFollowingCount(count || 0));
    
    const fetchNotifs = async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
      if (data) setNotifications(data);
    };
    fetchNotifs();

    const loadStorage = async () => {
      const items: {type: string; name: string; size: number; id?: string; created_at?: string}[] = [];
      const { data: scores } = await supabase.from("leaderboard_scores").select("id, game_name, console_type, created_at").eq("user_id", user.id);
      scores?.forEach(s => items.push({ type: "Partida guardada", name: `${s.game_name} (${(s as any).console_type?.toUpperCase()})`, size: 2, id: s.id, created_at: s.created_at }));
      const { data: avatarFiles } = await supabase.storage.from("avatars").list(user.id);
      avatarFiles?.forEach(f => items.push({ type: "Avatar", name: f.name, size: Math.round((f.metadata?.size || 500000) / 1024 / 1024 * 100) / 100, created_at: f.created_at }));
      const { data: social } = await supabase.from("social_content").select("id, title, content_url, created_at").eq("user_id", user.id);
      social?.forEach(s => items.push({ type: "Contenido social", name: s.title || s.content_url, size: 0.1, id: s.id, created_at: s.created_at }));
      const { data: photos } = await supabase.from("photos").select("id, caption, image_url, created_at").eq("user_id", user.id);
      photos?.forEach(p => items.push({ type: "Foto", name: p.caption || "Foto", size: 1, id: p.id, created_at: p.created_at }));
      items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setStorageItems(items);
      setStorageUsed(items.reduce((sum, i) => sum + i.size, 0));
    };
    loadStorage();
  }, [user]);

  useEffect(() => {
    if (activeTab === "avisos" && user) {
      const markAsRead = async () => {
        await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true }))); 
      };
      markAsRead();
    }
  }, [activeTab, user]);

  // 🔥 FUNCIÓN DE GUARDADO OPTIMIZADA (DEBOUNCE)
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
    const { error } = await supabase.from("profiles").update({
      display_name: displayName, bio,
      instagram_url: instagram || null, youtube_url: youtube || null, tiktok_url: tiktok || null,
      signature: signature.trim() || null,
      signature_font_size: localSigFontSize,
      signature_stroke_width: localSigStrokeWidth,
      signature_image_offset: localSigImageOffset
    } as any).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Perfil actualizado" }); setEditing(false); setNewPassword(""); await refreshProfile(); }
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
      toast({ title: "Error", description: "Solo JPG, PNG o GIF", variant: "destructive" }); return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Máximo 2MB", variant: "destructive" }); return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    const dimOk = await new Promise<boolean>((resolve) => {
      img.onload = () => { resolve(img.width <= 500 && img.height <= 500); URL.revokeObjectURL(url); };
      img.onerror = () => { resolve(false); URL.revokeObjectURL(url); };
      img.src = url;
    });
    if (!dimOk) {
      toast({ title: "Error", description: "Máximo 500x500 píxeles", variant: "destructive" }); return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${user.id}/avatar_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
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
        <Button asChild><Link to="/login">Iniciar Sesión</Link></Button>
      </div>
    );
  }

  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "long" }) : "Desconocido";
  const tier = profile?.membership_tier || "novato";
  const maxFriends = (isAdmin || isMasterWeb) ? Infinity : (friendLimits[tier] || 25);
  const maxStorage = (isAdmin || isMasterWeb) ? Infinity : (storageLimits[tier] || 50);
  const storagePercent = maxStorage === Infinity ? 0 : Math.min(100, (storageUsed / maxStorage) * 100);
  const isMod = roles.includes("moderator");
  const isStaff = isAdmin || isMasterWeb;
  
  const displayTier = (isStaff || isMod) ? "STAFF" : tier.toUpperCase();

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
          isStaff={isStaff || isMod}
          onSelect={handleAvatarSelect}
          onUpload={(isStaff || isMod || ["coleccionista", "leyenda arcade", "creador verificado"].includes(tier)) ? handleAvatarUpload : undefined}
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

      <div className="bg-card border border-neon-cyan/30 rounded p-6">
        {/* 🔥 FIX: Cambiada la clase del contenedor para que en móvil y modo edición se ponga la imagen arriba */}
        <div className={cn("flex gap-4", isMobile && editing ? "flex-col items-center" : "flex-row items-start")}>
          <button onClick={() => setShowAvatarSelector(true)} className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl border-2 border-neon-cyan/30 overflow-hidden" style={getAvatarBorderStyle(profile?.color_avatar_border)}>
              {profile?.avatar_url ? (
                <img key={profile.avatar_url} src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
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
                   <h3 className="font-pixel text-[10px] text-neon-cyan uppercase">AJUSTES DE PERFIL</h3>
                   <button onClick={() => { setEditing(false); setSearchParams({}); }} className="text-muted-foreground hover:text-foreground text-xs underline">Cerrar</button>
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Nombre</label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-8 bg-muted text-sm font-body w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Bio</label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-muted text-sm font-body min-h-[60px] w-full" placeholder="Cuéntanos sobre ti..." />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Instagram URL</label>
                  <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">YouTube URL</label>
                  <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">TikTok URL</label>
                  <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Contraseña (dejar vacío para no cambiar)</label>
                  <Input type="password" placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" />
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
                  const fontSizes = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30];

                  return (
                    <div className="space-y-2 border border-border/50 rounded p-3">
                      <label className="text-[10px] font-body text-muted-foreground block mb-0.5">✍️ Firma personalizada</label>
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
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Tipografía</label>
                              <select
                                value={sigFontFamily}
                                onChange={(e) => updateSig({ signature_font_family: e.target.value })}
                                className="w-full h-7 rounded border border-border bg-muted text-[10px] font-body text-foreground px-1"
                              >
                                {googleFonts.map(f => <option key={f} value={f} style={{ fontFamily: `"${f}"` }}>{f}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Tamaño de letra</label>
                              <select
                                value={sigFontSize}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setLocalSigFontSize(val);
                                  updateSig({ signature_font_size: val });
                                }}
                                className="w-full h-7 rounded border border-border bg-muted text-[10px] font-body text-foreground px-1"
                              >
                                {fontSizes.map(size => <option key={size} value={size}>{size}px</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Estilo</label>
                              <select
                                value={sigFontStyle}
                                onChange={(e) => updateSig({ signature_font: e.target.value })}
                                className="w-full h-7 rounded border border-border bg-muted text-[10px] font-body text-foreground px-1"
                              >
                                <option value="normal">Regular</option>
                                <option value="bold">Bold</option>
                                <option value="italic">Italic</option>
                                <option value="bold-italic">Bold + Italic</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Color trazo (opcional)</label>
                              <div className="flex gap-1">
                                <input
                                  type="color"
                                  value={sigStroke || "#000000"}
                                  onChange={(e) => updateSig({ signature_stroke_color: e.target.value })}
                                  className="flex-1 h-7 rounded border border-border cursor-pointer bg-muted"
                                />
                                {sigStroke && (
                                  <button type="button" onClick={() => updateSig({ signature_stroke_color: null })} className="h-7 px-2 text-[9px] rounded border border-border bg-muted hover:bg-muted/70 text-muted-foreground">×</button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Color relleno</label>
                              <input
                                type="color"
                                value={sigColor}
                                onChange={(e) => updateSig({ signature_color: e.target.value })}
                                className="w-full h-7 rounded border border-border cursor-pointer bg-muted"
                              />
                            </div>
                            {sigStroke && (
                               <div>
                                 <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Grosor trazo: {localSigStrokeWidth}px</label>
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
                              <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Posición trazo</label>
                              <div className="flex gap-1">
                                {(["outside", "middle", "inside"] as const).map(p => (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => updateSig({ signature_stroke_position: p })}
                                    className={cn("flex-1 h-7 text-[10px] rounded border font-body capitalize transition-colors", sigStrokePos === p ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted text-muted-foreground hover:bg-muted/70")}
                                  >
                                    {p === "outside" ? "Ext" : p === "middle" ? "Med" : "Int"}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                                <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Alineación texto</label>
                                <div className="flex gap-1">
                                  {["left", "center", "right"].map(a => (
                                    <button
                                      key={a}
                                      type="button"
                                      onClick={() => updateSig({ signature_text_align: a })}
                                      className={cn("flex-1 h-7 text-[10px] rounded border font-body capitalize transition-colors", sigTextAlign === a ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted text-muted-foreground hover:bg-muted/70")}
                                    >
                                      {a === "left" ? "Izq" : a === "center" ? "Centro" : "Der"}
                                    </button>
                                  ))}
                                </div>
                              </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Imagen de firma (URL, opcional)</label>
                            <Input
                              value={sigImageUrl}
                              onChange={(e) => updateSig({ signature_image_url: e.target.value || null })}
                              className="h-7 bg-muted text-[10px] font-body w-full"
                              placeholder="https://ejemplo.com/firma.png o .gif"
                            />
                          </div>
                          {sigImageUrl && (
                            <>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Alineación imagen</label>
                                  <div className="flex gap-1">
                                    {["left", "center", "right"].map(a => (
                                      <button
                                        key={a}
                                        type="button"
                                        onClick={() => updateSig({ signature_image_align: a })}
                                        className={cn("flex-1 h-7 text-[10px] rounded border font-body capitalize transition-colors", sigImageAlign === a ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted text-muted-foreground hover:bg-muted/70")}
                                      >
                                        {a === "left" ? "Izq" : a === "center" ? "Centro" : "Der"}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Ancho imagen</label>
                                  <div className="flex gap-1">
                                    {[35, 70, 100].map(w => (
                                      <button
                                        key={w}
                                        type="button"
                                        onClick={() => updateSig({ signature_image_width: w })}
                                        className={cn("flex-1 h-7 text-[10px] rounded border font-body transition-colors", sigImageWidth === w ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted text-muted-foreground hover:bg-muted/70")}
                                      >
                                        {w}%
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <label className="text-[9px] font-body text-muted-foreground block mb-0.5">Encuadre vertical (Arriba/Abajo): {localSigImageOffset}%</label>
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
                      <p className="text-[9px] text-muted-foreground text-center">
                        {isStaff ? "Sin límite (Staff)" : tier === "entusiasta" ? "Máx. 50 caracteres (texto)" : tier === "coleccionista" ? "Máx. 100 caracteres + estilos" : "Máx. 200 caracteres + diseño completo"}
                      </p>
                    </div>
                  );
                })()}
                <div className="flex gap-2 w-full">
                  <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs flex-1">{saving ? "Guardando..." : "Guardar"}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing(false); setSearchParams({}); }} className="text-xs flex-1">Cancelar</Button>
                </div>
              </div>
            ) : (
              <>
                <div className={cn("flex items-center gap-2 flex-wrap", isMobile && "justify-center")}>
                  <h2 className="font-pixel text-sm text-neon-cyan" style={getNameStyle(profile?.color_name)}>{profile?.display_name}</h2>
                  <RoleBadge roles={roles} roleIcon={profile?.role_icon} showIcon={profile?.show_role_icon !== false} colorStaffRole={profile?.color_staff_role} />
                </div>
                <p className={cn("text-xs text-muted-foreground font-body mt-1", isMobile && "text-center")}>{profile?.bio || "Sin descripción"}</p>
                <div className={cn("flex flex-wrap items-center gap-3 mt-2", isMobile && "justify-center")}>
                  {(isStaff || isMod) ? (
                    <span className="text-[10px] font-pixel text-neon-magenta flex items-center gap-1" style={getRoleStyle(profile?.color_staff_role)}>
                      <Shield className="w-3 h-3" /> {isMasterWeb || isAdmin ? "DIOS TODOPODEROSO" : "MÍTICO"}
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
                  <div className={cn("flex gap-3 mt-2", isMobile && "justify-center")}>
                    {profile?.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noopener" className="text-neon-magenta hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Instagram className="w-3.5 h-3.5" /> Instagram</a>}
                    {profile?.youtube_url && <a href={profile.youtube_url} target="_blank" rel="noopener" className="text-destructive hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Youtube className="w-3.5 h-3.5" /> YouTube</a>}
                    {profile?.tiktok_url && <a href={profile.tiktok_url} target="_blank" rel="noopener" className="text-neon-cyan hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Globe className="w-3.5 h-3.5" /> TikTok</a>}
                  </div>
                )}
                <div className={cn("flex gap-2 mt-3 flex-wrap", isMobile && "justify-center")}>
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="text-xs gap-1"><Edit2 className="w-3 h-3" /> Editar Perfil</Button>
                  
                  {!(isStaff || isMod) && (
                    <Button size="sm" variant="outline" asChild className="text-xs"><Link to="/membresias">Actualizar Plan</Link></Button>
                  )}

                  {(["coleccionista", "creador verificado", "leyenda arcade"].includes(tier) || isStaff || isMod) && (
                    <Button size="sm" variant="outline" onClick={() => setShowColorPicker(true)} className="text-xs gap-1">
                      <Palette className="w-3 h-3" /> Personalizar Colores
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
          <button key={tab.id} onClick={() => handleTabChange(tab.id)}
            className={cn("flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-body transition-all min-w-[70px]",
              activeTab === tab.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <tab.icon className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "avisos" && (
        <div className="bg-card border border-border rounded p-4">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left">MIS AVISOS ({notifications.length})</h3>
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
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left">MIS POSTS ({userPosts.length})</h3>
          {userPosts.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body text-center md:text-left">Aún no has publicado nada</p>
          ) : (
            <div className="space-y-2">
              {userPosts.map((post) => (
                <Link key={post.id} to={getCategoryRoute(post.category || "gaming-anime-foro", post.id)} className="block p-2 border border-border/50 rounded text-xs font-body hover:bg-muted/30 transition-colors cursor-pointer">
                  <p className="text-foreground hover:text-primary transition-colors">{post.title}</p>
                  {post.content && <p className="text-muted-foreground text-[10px] mt-0.5 line-clamp-1">{post.content}</p>}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    <span className="text-neon-green">▲{post.upvotes}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="bg-card border border-border rounded p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left">ESTADÍSTICAS</h3>
          <div className="grid grid-cols-2 gap-3">
            {(() => {
              const computedTotal = gameScores.reduce((sum, gs) => sum + gs.score, 0);
              const displayTotal = Math.max(profile?.total_score || 0, computedTotal);
              return [
              { val: displayTotal.toLocaleString(), label: "Puntos totales", color: "text-neon-green" },
              { val: userPosts.length, label: "Posts", color: "text-neon-cyan" },
              { val: displayTier, label: "Membresía", color: "text-neon-yellow" },
              { val: roles.length, label: "Roles", color: "text-neon-magenta" },
              { val: followerCount, label: "Seguidores", color: "text-neon-cyan" },
              { val: followingCount, label: "Siguiendo", color: "text-neon-orange" },
            ];
            })().map((s, i) => (
              <div key={i} className="bg-muted/30 rounded p-3 text-center">
                <p className={cn("text-lg font-bold font-body", s.color)}>{s.val}</p>
                <p className="text-[10px] text-muted-foreground font-body">{s.label}</p>
              </div>
            ))}
          </div>
          {gameScores.length > 0 && (
            <div className="mt-4">
              <h4 className="font-pixel text-[10px] text-neon-green mb-2 flex items-center justify-center md:justify-start gap-1">
                <Gamepad2 className="w-3 h-3" /> PUNTAJES POR JUEGO
              </h4>
              <div className="space-y-1">
                {gameScores.map((gs, i) => (
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

      {activeTab === "friends" && user && <FriendsTab userId={user.id} />}

      {activeTab === "social" && (
        <SocialContentTab
          profile={profile}
          user={user}
          onEditNetworks={() => setEditing(true)}
        />
      )}

      {activeTab === "storage" && (
        <div className="bg-card border border-border rounded p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 flex items-center justify-center md:justify-start gap-1"><HardDrive className="w-3 h-3" /> ALMACENAMIENTO</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-body">
              <span className="text-muted-foreground">Usado</span>
              <span className="text-foreground">{storageUsed.toFixed(1)} MB / {maxStorage === Infinity ? "∞" : `${maxStorage} MB`}</span>
            </div>
            <div className="w-full h-3 bg-muted rounded overflow-hidden border border-border">
              <div className={cn("h-full transition-all duration-500 rounded", storagePercent > 80 ? "bg-destructive" : "bg-neon-green")} style={{ width: `${storagePercent}%` }} />
            </div>
          </div>
          <div className="space-y-1 mt-3 overflow-x-auto text-left">
            <div className="min-w-[400px]">
               <div className="grid grid-cols-[1fr_80px_110px_60px_30px] gap-2 text-[9px] font-pixel text-muted-foreground border-b border-border pb-1">
                 <span>ELEMENTO</span><span>TIPO</span><span>FECHA</span><span className="text-right">TAMAÑO</span><span></span>
               </div>
               {storageItems.length === 0 ? (
                 <p className="text-xs text-muted-foreground font-body py-2 text-center">No hay elementos almacenados</p>
               ) : storageItems.map((item, i) => (
                 <div key={i} className="grid grid-cols-[1fr_80px_110px_60px_30px] gap-2 text-xs font-body py-1.5 border-b border-border/30 hover:bg-muted/30 transition-colors items-center group">
                   <span className="text-foreground truncate" title={item.name}>{item.name}</span>
                   <span className="text-muted-foreground text-[10px]">{item.type}</span>
                   <span className="text-muted-foreground text-[10px]">{item.created_at ? new Date(item.created_at).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                   <span className="text-right text-muted-foreground text-[10px]">{item.size < 1 ? `${Math.round(item.size * 1024)} KB` : `${item.size} MB`}</span>
                   <button
                     onClick={async () => {
                       if (!user) return;
                       if (item.type === "Partida guardada" && item.id) {
                         const games = Object.keys(localStorage).filter(k => k.startsWith("save_slots_"));
                         games.forEach(k => {
                           try {
                             const slots = JSON.parse(localStorage.getItem(k) || "[]");
                             const filtered = slots.filter((_: any, idx: number) => {
                               return !item.name.includes(k.replace("save_slots_", ""));
                             });
                             localStorage.setItem(k, JSON.stringify(filtered));
                           } catch {}
                         });
                       } else if (item.type === "Contenido social" && item.id) {
                         await supabase.from("social_content").delete().eq("id", item.id);
                       } else if (item.type === "Foto" && item.id) {
                         await supabase.from("photos").delete().eq("id", item.id);
                       } else if (item.type === "Avatar") {
                         toast({ title: "No permitido", description: "Solo puedes reemplazar tu avatar, no eliminarlo", variant: "destructive" });
                         return;
                       }
                       toast({ title: "Eliminado permanentemente" });
                       setStorageItems(prev => prev.filter((_, idx) => idx !== i));
                       setStorageUsed(prev => prev - item.size);
                     }}
                     className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                     title="Eliminar permanentemente"
                   >
                     <Trash2 className="w-3 h-3" />
                   </button>
                 </div>
               ))}
            </div>
          </div>
          <div className="flex gap-2">
            {maxStorage !== Infinity && storagePercent > 50 && (
              <Button size="sm" variant="outline" asChild className="text-xs w-full md:w-auto"><Link to="/membresias">Aumentar Capacidad</Link></Button>
            )}
          </div>
        </div>
      )}

      {showColorPicker && (
        <div className="fixed inset-0 z-[500] bg-background/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowColorPicker(false)}>
          <div className="relative bg-card border border-neon-cyan/30 rounded-lg p-5 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-pixel text-[11px] text-neon-cyan text-center flex items-center justify-center gap-2">
              <Palette className="w-4 h-4" /> PERSONALIZAR COLORES
            </h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {(["border", "name", "role", ...((isStaff || isMod) ? ["staff"] : [])] as const).map(t => (
                <button key={t} onClick={() => setColorTarget(t as any)}
                  className={cn("px-3 py-1.5 rounded text-[10px] font-body transition-all",
                    colorTarget === t ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {t === "border" ? "Borde Avatar" : t === "name" ? "Nombre" : t === "staff" ? "Rol Staff" : "Rol/Membresía"}
                </button>
              ))}
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-48 h-48">
                <input
                  type="color"
                  value={
                    colorTarget === "border" ? (avatarBorderColor || "#22d3ee") :
                    colorTarget === "name" ? (nameColor || "#22d3ee") :
                    colorTarget === "staff" ? (staffRoleColor || "#f472b6") :
                    (roleColor || "#facc15")
                  }
                  onChange={e => {
                    if (colorTarget === "border") setAvatarBorderColor(e.target.value);
                    else if (colorTarget === "name") setNameColor(e.target.value);
                    else if (colorTarget === "staff") setStaffRoleColor(e.target.value);
                    else setRoleColor(e.target.value);
                  }}
                  className="w-full h-full rounded-full cursor-pointer border-2 border-border"
                  style={{ appearance: "auto" }}
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] text-muted-foreground font-body">Vista previa:</p>
                <div className="flex items-center gap-2 bg-muted/30 rounded px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-muted border-2 overflow-hidden" style={getAvatarBorderStyle(avatarBorderColor || "#22d3ee")}>
                      {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground m-1.5" />}
                    </div>
                    <span className="font-pixel text-xs" style={getNameStyle(nameColor)}>{profile?.display_name}</span>
                    <span className="text-[9px] font-pixel" style={getRoleStyle(roleColor)}>{displayTier}</span>
                    {(isStaff || isMod) && (
                      <span className="text-[9px] font-pixel" style={getRoleStyle(staffRoleColor)}>
                        {isMasterWeb ? "MASTER" : isAdmin ? "ADMIN" : "MOD"}
                      </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowColorPicker(false)}
                className="text-xs px-4"
              >
                Cerrar
              </Button>
              <Button
                size="sm"
                disabled={savingColors}
                onClick={async () => {
                  if (!user) return;
                  setSavingColors(true);
                  const { error } = await supabase.from("profiles").update({
                    color_avatar_border: avatarBorderColor || null,
                    color_name: nameColor || null,
                    color_role: roleColor || null,
                    color_staff_role: staffRoleColor || null,
                  } as any).eq("user_id", user.id);
                  setSavingColors(false);
                  if (error) {
                    toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Colores guardados ✨" });
                    await refreshProfile();
                    setShowColorPicker(false);
                  }
                }}
                className="text-xs px-4 bg-neon-cyan text-background hover:bg-neon-cyan/80"
              >
                {savingColors ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "moderation" && (isStaff || isMod) && <ModerationPanel isStaff={isStaff} isMasterWeb={isMasterWeb} />}
    </div>
  );
}

function ModerationPanel({ isStaff, isMasterWeb }: { isStaff: boolean; isMasterWeb: boolean }) {
  const { toast } = useToast();
  const [banEmail, setBanEmail] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<string>("24h");
  const [banning, setBanning] = useState(false);
  const [modEmail, setModEmail] = useState("");
  const [membershipSearch, setMembershipSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState("entusiasta");
  const [assigningMembership, setAssigningMembership] = useState(false);

  const membershipTiers = ["novato", "entusiasta", "coleccionista", "miembro del legado", "leyenda arcade"];

  const banDurations = [
    { label: "1 hora", value: "1h", ms: 3600000 },
    { label: "24 horas", value: "24h", ms: 86400000 },
    { label: "3 días", value: "3d", ms: 259200000 },
    { label: "7 días", value: "7d", ms: 604800000 },
    { label: "15 días", value: "15d", ms: 1296000000 },
    { label: "30 días", value: "30d", ms: 2592000000 },
    { label: "Permanente", value: "perm", ms: 0 },
  ];

  const handleBan = async () => {
    if (!banEmail.trim() || !banReason.trim()) return;
    setBanning(true);
    const { data: targetUser } = await supabase.from("profiles").select("user_id").ilike("display_name", banEmail).maybeSingle();
    if (!targetUser) { toast({ title: "Usuario no encontrado", variant: "destructive" }); setBanning(false); return; }
    const { data: { user } } = await (supabase.auth as any).getUser();
    if (!user) { setBanning(false); return; }

    const selected = banDurations.find(d => d.value === banDuration);
    const expiresAt = selected && selected.ms > 0
      ? new Date(Date.now() + selected.ms).toISOString()
      : null;
    const banType = banDuration === "perm" ? "ban" : "kick";

    const { error } = await supabase.from("banned_users").insert({
      user_id: targetUser.user_id, banned_by: user.id, reason: banReason, ban_type: banType, expires_at: expiresAt,
    } as any);
    setBanning(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: banDuration === "perm" ? "Usuario baneado permanentemente" : `Usuario suspendido (${banDurations.find(d => d.value === banDuration)?.label})` }); setBanEmail(""); setBanReason(""); }
  };

  const handleAssignMod = async () => {
    if (!modEmail.trim() || !isMasterWeb) return;
    const { data: targetProfile } = await supabase.from("profiles").select("user_id").ilike("display_name", modEmail).maybeSingle();
    if (!targetProfile) { toast({ title: "Usuario no encontrado", variant: "destructive" }); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: targetProfile.user_id, role: "moderator" } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Moderador asignado" }); setModEmail(""); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-destructive/30 rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-destructive flex items-center gap-1"><Ban className="w-3 h-3" /> BANEAR / SUSPENDER</h3>
        <Input placeholder="Nombre de usuario" value={banEmail} onChange={e => setBanEmail(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" />
        <Input placeholder="Razón" value={banReason} onChange={e => setBanReason(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" />
        <div>
          <label className="text-[10px] font-body text-muted-foreground block mb-1">Duración del baneo:</label>
          <div className="flex flex-wrap gap-1.5">
            {banDurations.map(d => (
              <button
                key={d.value}
                onClick={() => setBanDuration(d.value)}
                className={cn(
                  "px-2 py-1 rounded text-[10px] font-body transition-all border",
                  banDuration === d.value
                    ? d.value === "perm" ? "bg-destructive text-destructive-foreground border-destructive" : "bg-neon-orange/20 text-neon-orange border-neon-orange/30"
                    : "bg-muted text-muted-foreground border-border hover:border-foreground/30"
                )}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" variant="destructive" onClick={handleBan} disabled={banning || !banEmail.trim()} className="text-xs">
          {banning ? "Procesando..." : banDuration === "perm" ? "Banear Permanente" : "Suspender Usuario"}
        </Button>
      </div>

      {isMasterWeb && (
        <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1"><Shield className="w-3 h-3" /> ASIGNAR ROLES</h3>
          <Input placeholder="Nombre de usuario" value={modEmail} onChange={e => setModEmail(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAssignMod} className="text-xs">Asignar Moderador</Button>
            <Button size="sm" variant="outline" onClick={async () => {
              if (!modEmail.trim()) return;
              const { data: tp } = await supabase.from("profiles").select("user_id").ilike("display_name", modEmail).maybeSingle();
              if (!tp) { toast({ title: "Usuario no encontrado", variant: "destructive" }); return; }
              const { error } = await supabase.from("user_roles").insert({ user_id: tp.user_id, role: "admin" } as any);
              if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
              else { toast({ title: "Administrador asignado" }); setModEmail(""); }
            }} className="text-xs">Asignar Admin</Button>
          </div>
        </div>
      )}

      {isStaff && <ModeratorList isMasterWeb={isMasterWeb} />}

      {isStaff && (
        <div className="bg-card border border-neon-yellow/30 rounded p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-neon-yellow flex items-center gap-1"><Star className="w-3 h-3" /> GESTIONAR MEMBRESÍAS</h3>
          <Input placeholder="Nombre de usuario" value={membershipSearch} onChange={e => setMembershipSearch(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" />
          <div className="flex flex-wrap gap-1.5">
            {membershipTiers.map(t => (
              <button key={t} onClick={() => setSelectedTier(t)}
                className={cn("px-2 py-1 rounded text-[10px] font-body transition-all border",
                  selectedTier === t ? "bg-neon-yellow/20 text-neon-yellow border-neon-yellow/30" : "bg-muted text-muted-foreground border-border hover:border-foreground/30")}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <Button size="sm" disabled={assigningMembership || !membershipSearch.trim()} onClick={async () => {
            if (!membershipSearch.trim()) return;
            setAssigningMembership(true);
            const { data: tp } = await supabase.from("profiles").select("user_id").ilike("display_name", membershipSearch).maybeSingle();
            if (!tp) { toast({ title: "Usuario no encontrado", variant: "destructive" }); setAssigningMembership(false); return; }
            const { error } = await supabase.from("profiles").update({ membership_tier: selectedTier } as any).eq("user_id", tp.user_id);
            setAssigningMembership(false);
            if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
            else { toast({ title: `Membresía actualizada a ${selectedTier.toUpperCase()}` }); setMembershipSearch(""); }
          }} className="text-xs bg-neon-yellow/20 text-neon-yellow hover:bg-neon-yellow/30 border border-neon-yellow/30">
            {assigningMembership ? "Procesando..." : "Asignar Membresía"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ModeratorList({ isMasterWeb }: { isMasterWeb: boolean }) {
  const { toast } = useToast();
  const [moderators, setModerators] = useState<{ user_id: string; display_name: string; avatar_url: string | null; role_id: string }[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: modRoles } = await supabase.from("user_roles").select("id, user_id").eq("role", "moderator");
      if (!modRoles || modRoles.length === 0) { setModerators([]); return; }
      const userIds = modRoles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
      const list = modRoles.map((r: any) => {
        const p = profiles?.find((pr: any) => pr.user_id === r.user_id);
        return { user_id: r.user_id, display_name: p?.display_name || "Usuario", avatar_url: p?.avatar_url || null, role_id: r.id };
      });
      setModerators(list);
    };
    fetch();
  }, []);

  const revokeMod = async (roleId: string) => {
    if (!isMasterWeb) { toast({ title: "Solo el Web Master puede revocar roles", variant: "destructive" }); return; }
    const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Rol de moderador revocado" }); setModerators(prev => prev.filter(m => m.role_id !== roleId)); }
  };

  return (
    <div className="bg-card border border-neon-magenta/30 rounded p-4 space-y-3">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between">
        <h3 className="font-pixel text-[10px] text-neon-magenta flex items-center gap-1"><Shield className="w-3 h-3" /> MODERADORES ACTIVOS ({moderators.length})</h3>
        <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="space-y-1.5">
          {moderators.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body text-center">No hay moderadores asignados</p>
          ) : moderators.map(m => (
            <div key={m.role_id} className="flex items-center gap-3 bg-muted/30 rounded p-2">
              <div className="w-7 h-7 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                {m.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-muted-foreground m-2" />}
              </div>
              <Link to={`/usuario/${m.user_id}`} className="flex-1 text-xs font-body text-foreground hover:text-primary">{m.display_name}</Link>
              <span className="text-[9px] font-pixel text-neon-magenta">MOD</span>
              {isMasterWeb && (
                <Button size="sm" variant="destructive" onClick={() => revokeMod(m.role_id)} className="text-[9px] h-5 px-2">Revocar</Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SocialContentTab({ profile, user, onEditNetworks }: { profile: any; user: any; onEditNetworks: () => void }) {
  const { toast } = useToast();
  const [contents, setContents] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPlatform, setNewPlatform] = useState("youtube");
  const [newPublic, setNewPublic] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchContents = async () => {
    const { data } = await supabase.from("social_content").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setContents(data);
  };

  useEffect(() => { fetchContents(); }, [user.id]);

  const detectPlatform = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
    if (url.includes("instagram.com")) return "instagram";
    if (url.includes("tiktok.com")) return "tiktok";
    if (url.includes("facebook.com") || url.includes("fb.com")) return "facebook";
    return "youtube";
  };

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    const platform = detectPlatform(newUrl);
    const { error } = await supabase.from("social_content").insert({
      user_id: user.id, content_url: newUrl, title: newTitle || null, platform, is_public: newPublic,
    });
    setAdding(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Contenido agregado" }); setNewUrl(""); setNewTitle(""); fetchContents(); }
  };

  const toggleVisibility = async (id: string, current: boolean) => {
    await supabase.from("social_content").update({ is_public: !current }).eq("id", id);
    fetchContents();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("social_content").delete().eq("id", id);
    toast({ title: "Contenido eliminado" });
    fetchContents();
  };

  const platformIcon = (p: string) => {
    if (p === "youtube") return <Youtube className="w-3.5 h-3.5 text-destructive" />;
    if (p === "instagram") return <Instagram className="w-3.5 h-3.5 text-neon-magenta" />;
    if (p === "tiktok") return <Music2 className="w-3.5 h-3.5 text-neon-cyan" />;
    return <Globe className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-3">
      <div className="bg-card border border-border rounded p-4 space-y-3 text-center">
        <h3 className="font-pixel text-[10px] text-muted-foreground">PERFILES VINCULADOS</h3>
        <div className="space-y-2">
          {[
            { url: profile?.instagram_url, icon: Instagram, label: "Instagram", color: "text-neon-magenta", empty: "No vinculado" },
            { url: profile?.youtube_url, icon: Youtube, label: "YouTube", color: "text-destructive", empty: "No vinculado" },
            { url: profile?.tiktok_url, icon: Globe, label: "TikTok", color: "text-neon-cyan", empty: "No vinculado" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-left">
              <s.icon className={cn("w-4 h-4", s.url ? s.color : "text-muted-foreground")} />
              <span className="text-xs font-body text-foreground flex-1">{s.label}</span>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener" className="text-[10px] text-primary hover:underline font-body">Ver perfil</a>
              ) : (
                <span className="text-[10px] text-muted-foreground font-body">{s.empty}</span>
              )}
            </div>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={onEditNetworks} className="text-xs w-full"><Edit2 className="w-3 h-3 mr-1" /> Editar Redes</Button>
      </div>

      <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1"><Plus className="w-3 h-3" /> AGREGAR CONTENIDO</h3>
        <Input placeholder="URL del video/post (YouTube, Instagram, TikTok...)" value={newUrl} onChange={e => { setNewUrl(e.target.value); setNewPlatform(detectPlatform(e.target.value)); }} className="h-8 bg-muted text-xs font-body w-full" />
        <Input placeholder="Título (opcional)" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" />
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setNewPublic(!newPublic)} className="flex items-center gap-1 text-xs font-body">
            {newPublic ? <Eye className="w-3 h-3 text-neon-green" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
            {newPublic ? "Público" : "Privado"}
          </button>
          <span className="text-[10px] text-muted-foreground font-body">Plataforma: {newPlatform}</span>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={adding || !newUrl.trim()} className="text-xs w-full">
          {adding ? "Agregando..." : "Agregar"}
        </Button>
      </div>

      <div className="bg-card border border-border rounded p-4 space-y-2">
        <h3 className="font-pixel text-[10px] text-muted-foreground">MI CONTENIDO ({contents.length})</h3>
        {contents.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body text-center py-4">No has agregado contenido aún</p>
        ) : (
          contents.map(c => (
            <div key={c.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded group text-left">
              {platformIcon(c.platform)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-body text-foreground truncate">{c.title || c.content_url}</p>
                <a href={c.content_url} target="_blank" rel="noopener" className="text-[10px] text-primary hover:underline font-body truncate block">{c.content_url}</a>
              </div>
              <button onClick={() => toggleVisibility(c.id, c.is_public)} className="text-xs">
                {c.is_public ? <Eye className="w-3.5 h-3.5 text-neon-green" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              <button onClick={() => handleDelete(c.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FriendsTab({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [friends, setFriends] = useState<any[]>([]);
  const [friendRoles, setFriendRoles] = useState<Record<string, string[]>>({});
  const [pendingReceived, setPendingReceived] = useState<any[]>([]);
  const [pendingSent, setPendingSent] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [friendMessage, setFriendMessage] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const fetchFriends = async () => {
    const { data: sent } = await supabase.from("friend_requests").select("*").eq("sender_id", userId).eq("status", "accepted");
    const { data: recv } = await supabase.from("friend_requests").select("*").eq("receiver_id", userId).eq("status", "accepted");
    const friendIds = [
      ...(sent || []).map((r: any) => r.receiver_id),
      ...(recv || []).map((r: any) => r.sender_id),
    ];
    if (friendIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, membership_tier, color_avatar_border, color_name, color_role, color_staff_role").in("user_id", friendIds);
      setFriends(profiles || []);
      const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", friendIds);
      const rMap: Record<string, string[]> = {};
      roles?.forEach((r: any) => { if (!rMap[r.user_id]) rMap[r.user_id] = []; rMap[r.user_id].push(r.role); });
      setFriendRoles(rMap);
    } else {
      setFriends([]);
      setFriendRoles({});
    }

    const { data: pRecv } = await supabase.from("friend_requests").select("*").eq("receiver_id", userId).eq("status", "pending");
    if (pRecv && pRecv.length > 0) {
      const senderIds = pRecv.map((r: any) => r.sender_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_avatar_border, color_name").in("user_id", senderIds);
      setPendingReceived(pRecv.map((r: any) => ({ ...r, profile: profiles?.find((p: any) => p.user_id === r.sender_id) })));
    } else setPendingReceived([]);

    const { data: pSent } = await supabase.from("friend_requests").select("*").eq("sender_id", userId).eq("status", "pending");
    setPendingSent(pSent || []);
  };

  useEffect(() => { fetchFriends(); }, [userId]);

  const acceptRequest = async (requestId: string, senderId: string) => {
    await supabase.from("friend_requests").update({ status: "accepted" } as any).eq("id", requestId);
    toast({ title: "Amistad aceptada" });
    fetchFriends();
  };

  const rejectRequest = async (requestId: string) => {
    await supabase.from("friend_requests").update({ status: "rejected" } as any).eq("id", requestId);
    toast({ title: "Solicitud rechazada" });
    fetchFriends();
  };

  const removeFriend = async (friendUserId: string) => {
    await supabase.from("friend_requests").delete().or(`and(sender_id.eq.${userId},receiver_id.eq.${friendUserId}),and(sender_id.eq.${friendUserId},receiver_id.eq.${userId})`);
    toast({ title: "Amigo eliminado" });
    fetchFriends();
  };

  const getStaffLabel = (roles: string[]) => {
    if (roles.includes("master_web")) return "WEBMASTER";
    if (roles.includes("admin")) return "ADMIN";
    if (roles.includes("moderator")) return "MOD";
    return null;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_avatar_border, color_name")
      .ilike("display_name", `%${searchQuery}%`).neq("user_id", userId).limit(10);
    const friendIds = friends.map((f: any) => f.user_id);
    const pendingIds = [...pendingReceived.map((r: any) => r.sender_id), ...pendingSent.map((r: any) => r.receiver_id)];
    const excluded = new Set([...friendIds, ...pendingIds]);
    setSearchResults((data || []).filter((p: any) => !excluded.has(p.user_id)));
  };

  const sendFriendRequest = async (targetId: string) => {
    setSendingRequest(true);
    const insertData: any = { sender_id: userId, receiver_id: targetId };
    if (friendMessage.trim()) insertData.message = friendMessage.trim();
    const { error } = await supabase.from("friend_requests").insert(insertData as any);
    setSendingRequest(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Solicitud enviada" }); setSearchResults([]); setSearchQuery(""); setFriendMessage(""); fetchFriends(); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1"><Search className="w-3 h-3" /> BUSCAR USUARIOS</h3>
        <div className="flex gap-1">
          <Input placeholder="Buscar por nombre de usuario..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()} className="h-7 bg-muted text-xs font-body flex-1 w-full" />
          <Button size="sm" variant="ghost" onClick={handleSearch} className="h-7 w-7 p-0"><Search className="w-3 h-3" /></Button>
        </div>
        {searchResults.length > 0 && (
          <div className="space-y-1.5 max-h-40 overflow-y-auto text-left">
            {searchResults.map((r: any) => (
              <div key={r.user_id} className="flex items-center gap-3 bg-muted/30 rounded p-2">
                <div className="w-7 h-7 rounded-full bg-muted border border-border overflow-hidden shrink-0" style={getAvatarBorderStyle(r.color_avatar_border)}>
                  {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-muted-foreground m-2" />}
                </div>
                <span className="flex-1 text-xs font-body text-foreground" style={getNameStyle(r.color_name)}>{r.display_name}</span>
                <Button size="sm" onClick={() => sendFriendRequest(r.user_id)} disabled={sendingRequest} className="text-[10px] h-6 px-2 gap-1">
                  <UserPlus className="w-3 h-3" /> Agregar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingReceived.length > 0 && (
        <div className="bg-card border border-neon-yellow/30 rounded p-4">
          <h3 className="font-pixel text-[10px] text-neon-yellow mb-3">SOLICITUDES PENDIENTES ({pendingReceived.length})</h3>
          <div className="space-y-2 text-left">
            {pendingReceived.map((req: any) => (
              <div key={req.id} className="flex items-center gap-3 bg-muted/30 rounded p-2">
                <div className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden shrink-0" style={getAvatarBorderStyle(req.profile?.color_avatar_border)}>
                  {req.profile?.avatar_url ? <img src={req.profile.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground m-2" />}
                </div>
                <Link to={`/usuario/${req.sender_id}`} className="flex-1 text-xs font-body text-foreground hover:text-primary truncate" style={getNameStyle(req.profile?.color_name)}>{req.profile?.display_name || "Usuario"}</Link>
                <div className="flex gap-1 shrink-0">
                   <Button size="sm" onClick={() => acceptRequest(req.id, req.sender_id)} className="text-[10px] h-6 px-2">Aceptar</Button>
                   <Button size="sm" variant="outline" onClick={() => rejectRequest(req.id)} className="text-[10px] h-6 px-2">Rechazar</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 text-center md:text-left">MIS AMIGOS ({friends.length})</h3>
        {friends.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body text-center py-4">Aún no tienes amigos. Visita perfiles de otros usuarios para enviar solicitudes.</p>
        ) : (
          <div className="space-y-1.5 text-left">
            {friends.map((f: any) => {
              const roles = friendRoles[f.user_id] || [];
              const staffLabel = getStaffLabel(roles);
              return (
                <div key={f.user_id} className="flex items-center gap-3 bg-muted/30 rounded p-2 group">
                  <div className="w-8 h-8 rounded-full bg-muted border border-border overflow-hidden shrink-0" style={getAvatarBorderStyle(f.color_avatar_border)}>
                    {f.avatar_url ? <img src={f.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground m-2" />}
                  </div>
                  <Link to={`/usuario/${f.user_id}`} className="flex-1 text-xs font-body text-foreground hover:text-primary truncate" style={getNameStyle(f.color_name)}>{f.display_name}</Link>
                  <div className="flex items-center gap-2">
                     {staffLabel ? (
                       <span className="text-[9px] font-pixel text-neon-magenta" style={getRoleStyle(f.color_staff_role)}>{staffLabel}</span>
                     ) : (
                       <span className="text-[9px] font-pixel text-neon-yellow" style={getRoleStyle(f.color_role)}>{f.membership_tier?.toUpperCase()}</span>
                     )}
                     <Button size="sm" variant="outline" asChild className="text-[10px] h-6 px-2">
                       <Link to={`/mensajes?to=${f.user_id}`}><MessageSquare className="w-3 h-3" /></Link>
                     </Button>
                     <button onClick={() => removeFriend(f.user_id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity text-[10px] shrink-0">
                       <UserMinus className="w-3 h-3" />
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