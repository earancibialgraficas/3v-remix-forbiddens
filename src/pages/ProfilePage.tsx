import { useState, useEffect } from "react";
import { User, Edit2, Trophy, Star, Instagram, Youtube, MapPin, Globe, Gamepad2, Calendar, Shield, MessageSquare, UserPlus, UserMinus, Ban, Clock, Eye, EyeOff, Plus, Trash2, Link2, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { cn, withImageVersion } from "@/lib/utils";
import RoleBadge from "@/components/RoleBadge";
import AvatarSelector from "@/components/AvatarSelector";
import RoleIconSelector from "@/components/RoleIconSelector";

const friendLimits: Record<string, number> = {
  novato: 25, entusiasta: 50, coleccionista: 100, "leyenda arcade": 200,
};

const storageLimits: Record<string, number> = {
  novato: 50, entusiasta: 150, coleccionista: 500, "leyenda arcade": 2000,
};

export default function ProfilePage() {
  const { user, profile, roles, refreshProfile, isAdmin, isMasterWeb } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [saving, setSaving] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [gameScores, setGameScores] = useState<{game_name: string; console_type: string; score: number}[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "stats" | "social" | "storage" | "moderation">("posts");
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showRoleIconSelector, setShowRoleIconSelector] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio || "");
      setInstagram(profile.instagram_url || "");
      setYoutube(profile.youtube_url || "");
      setTiktok(profile.tiktok_url || "");
    }
  }, [profile]);

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
    supabase.from("leaderboard_scores").select("*", { count: "exact", head: true }).eq("user_id", user.id)
      .then(({ count }) => setStorageUsed((count || 0) * 2));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName, bio,
      instagram_url: instagram || null, youtube_url: youtube || null, tiktok_url: tiktok || null,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Perfil actualizado" }); setEditing(false); await refreshProfile(); }
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
    // Validate dimensions (max 500x500)
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

  const tabs = [
    { id: "posts" as const, label: "Posts", icon: MessageSquare },
    { id: "stats" as const, label: "Stats", icon: Trophy },
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

      {/* Profile Card */}
      <div className="bg-card border border-neon-cyan/30 rounded p-6">
        <div className="flex items-start gap-4">
          <button onClick={() => setShowAvatarSelector(true)} className="relative group shrink-0">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl border-2 border-neon-cyan/30 overflow-hidden">
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
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Nombre</label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-8 bg-muted text-sm font-body" />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Bio</label>
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-muted text-sm font-body min-h-[60px]" placeholder="Cuéntanos sobre ti..." />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">Instagram URL</label>
                  <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="h-8 bg-muted text-xs font-body" />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">YouTube URL</label>
                  <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} className="h-8 bg-muted text-xs font-body" />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">TikTok URL</label>
                  <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} className="h-8 bg-muted text-xs font-body" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">{saving ? "Guardando..." : "Guardar"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="text-xs">Cancelar</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-pixel text-sm text-neon-cyan">{profile?.display_name}</h2>
                  <RoleBadge roles={roles} roleIcon={profile?.role_icon} showIcon={profile?.show_role_icon !== false} />
                </div>
                <p className="text-xs text-muted-foreground font-body mt-1">{profile?.bio || "Sin descripción"}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {(isStaff || isMod) ? (
                    <span className="text-[10px] font-pixel text-neon-magenta flex items-center gap-1">
                      <Shield className="w-3 h-3" /> {isMasterWeb || isAdmin ? "DIOS TODOPODEROSO" : "MÍTICO"}
                    </span>
                  ) : (
                    <span className="text-[10px] font-pixel text-neon-yellow flex items-center gap-1">
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
                  <div className="flex gap-3 mt-2">
                    {profile?.instagram_url && <a href={profile.instagram_url} target="_blank" rel="noopener" className="text-neon-magenta hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Instagram className="w-3.5 h-3.5" /> Instagram</a>}
                    {profile?.youtube_url && <a href={profile.youtube_url} target="_blank" rel="noopener" className="text-destructive hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Youtube className="w-3.5 h-3.5" /> YouTube</a>}
                    {profile?.tiktok_url && <a href={profile.tiktok_url} target="_blank" rel="noopener" className="text-neon-cyan hover:opacity-80 text-[10px] font-body flex items-center gap-0.5"><Globe className="w-3.5 h-3.5" /> TikTok</a>}
                  </div>
                )}
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="text-xs gap-1"><Edit2 className="w-3 h-3" /> Editar</Button>
                  <Button size="sm" variant="outline" asChild className="text-xs"><Link to="/configuracion">Configuración</Link></Button>
                  <Button size="sm" variant="outline" asChild className="text-xs"><Link to="/membresias">Actualizar Plan</Link></Button>
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

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded p-1 flex-wrap">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-body transition-all min-w-[70px]",
              activeTab === tab.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <tab.icon className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "posts" && (
        <div className="bg-card border border-border rounded p-4">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">MIS POSTS ({userPosts.length})</h3>
          {userPosts.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body">Aún no has publicado nada</p>
          ) : (
            <div className="space-y-2">
              {userPosts.map((post) => (
                <div key={post.id} className="p-2 border border-border/50 rounded text-xs font-body hover:bg-muted/30 transition-colors">
                  <p className="text-foreground">{post.title}</p>
                  {post.content && <p className="text-muted-foreground text-[10px] mt-0.5 line-clamp-1">{post.content}</p>}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    <span className="text-neon-green">▲{post.upvotes}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "stats" && (
        <div className="bg-card border border-border rounded p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">ESTADÍSTICAS</h3>
          <div className="grid grid-cols-2 gap-3">
            {(() => {
              const computedTotal = gameScores.reduce((sum, gs) => sum + gs.score, 0);
              const displayTotal = Math.max(profile?.total_score || 0, computedTotal);
              return [
              { val: displayTotal.toLocaleString(), label: "Puntos totales", color: "text-neon-green" },
              { val: userPosts.length, label: "Posts", color: "text-neon-cyan" },
              { val: tier.toUpperCase(), label: "Membresía", color: "text-neon-yellow" },
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

          {/* Per-game score breakdown */}
          {gameScores.length > 0 && (
            <div className="mt-4">
              <h4 className="font-pixel text-[10px] text-neon-green mb-2 flex items-center gap-1">
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

      {activeTab === "social" && (
        <SocialContentTab
          profile={profile}
          user={user}
          onEditNetworks={() => setEditing(true)}
        />
      )}

      {activeTab === "storage" && (
        <div className="bg-card border border-border rounded p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">ALMACENAMIENTO DE PARTIDAS</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-body">
              <span className="text-muted-foreground">Usado</span>
              <span className="text-foreground">{storageUsed} MB / {maxStorage === Infinity ? "∞" : `${maxStorage} MB`}</span>
            </div>
            <div className="w-full h-3 bg-muted rounded overflow-hidden border border-border">
              <div className={cn("h-full transition-all duration-500 rounded", storagePercent > 80 ? "bg-destructive" : "bg-neon-green")} style={{ width: `${storagePercent}%` }} />
            </div>
            <p className="text-[10px] text-muted-foreground font-body">
              Cada partida guardada ocupa ~2 MB. {maxStorage !== Infinity && storagePercent > 80 && "¡Casi lleno! Considera actualizar tu plan."}
            </p>
            <div className="flex gap-2">
              {maxStorage !== Infinity && storagePercent > 50 && (
                <Button size="sm" variant="outline" asChild className="text-xs"><Link to="/membresias">Aumentar Capacidad</Link></Button>
              )}
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
  const [banType, setBanType] = useState<"ban" | "kick">("kick");
  const [banning, setBanning] = useState(false);
  const [modEmail, setModEmail] = useState("");

  const handleBan = async () => {
    if (!banEmail.trim() || !banReason.trim()) return;
    setBanning(true);
    const { data: targetUser } = await supabase.from("profiles").select("user_id").ilike("display_name", banEmail).maybeSingle();
    if (!targetUser) { toast({ title: "Usuario no encontrado", variant: "destructive" }); setBanning(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBanning(false); return; }

    const expiresAt = banType === "kick" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;
    const { error } = await supabase.from("banned_users").insert({
      user_id: targetUser.user_id, banned_by: user.id, reason: banReason, ban_type: banType, expires_at: expiresAt,
    } as any);
    setBanning(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: banType === "ban" ? "Usuario baneado" : "Usuario kickeado (24h)" }); setBanEmail(""); setBanReason(""); }
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
        <h3 className="font-pixel text-[10px] text-destructive flex items-center gap-1"><Ban className="w-3 h-3" /> {isStaff ? "BANEAR / KICKEAR" : "KICKEAR (24H)"}</h3>
        <Input placeholder="Nombre de usuario" value={banEmail} onChange={e => setBanEmail(e.target.value)} className="h-8 bg-muted text-xs font-body" />
        <Input placeholder="Razón" value={banReason} onChange={e => setBanReason(e.target.value)} className="h-8 bg-muted text-xs font-body" />
        {isStaff && (
          <div className="flex gap-2">
            <Button size="sm" variant={banType === "kick" ? "default" : "outline"} onClick={() => setBanType("kick")} className="text-xs">Kick (24h)</Button>
            <Button size="sm" variant={banType === "ban" ? "destructive" : "outline"} onClick={() => setBanType("ban")} className="text-xs">Ban Permanente</Button>
          </div>
        )}
        <Button size="sm" variant="destructive" onClick={handleBan} disabled={banning || !banEmail.trim()} className="text-xs">
          {banning ? "Procesando..." : banType === "ban" ? "Banear Usuario" : "Kickear Usuario"}
        </Button>
      </div>

      {isMasterWeb && (
        <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1"><Shield className="w-3 h-3" /> ASIGNAR ROLES</h3>
          <Input placeholder="Nombre de usuario" value={modEmail} onChange={e => setModEmail(e.target.value)} className="h-8 bg-muted text-xs font-body" />
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
      {/* Linked profiles */}
      <div className="bg-card border border-border rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-muted-foreground">PERFILES VINCULADOS</h3>
        <div className="space-y-2">
          {[
            { url: profile?.instagram_url, icon: Instagram, label: "Instagram", color: "text-neon-magenta", empty: "No vinculado" },
            { url: profile?.youtube_url, icon: Youtube, label: "YouTube", color: "text-destructive", empty: "No vinculado" },
            { url: profile?.tiktok_url, icon: Globe, label: "TikTok", color: "text-neon-cyan", empty: "No vinculado" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
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
        <Button size="sm" variant="outline" onClick={onEditNetworks} className="text-xs"><Edit2 className="w-3 h-3 mr-1" /> Editar Redes</Button>
      </div>

      {/* Add content */}
      <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1"><Plus className="w-3 h-3" /> AGREGAR CONTENIDO</h3>
        <Input placeholder="URL del video/post (YouTube, Instagram, TikTok...)" value={newUrl} onChange={e => { setNewUrl(e.target.value); setNewPlatform(detectPlatform(e.target.value)); }} className="h-8 bg-muted text-xs font-body" />
        <Input placeholder="Título (opcional)" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="h-8 bg-muted text-xs font-body" />
        <div className="flex items-center gap-3">
          <button onClick={() => setNewPublic(!newPublic)} className="flex items-center gap-1 text-xs font-body">
            {newPublic ? <Eye className="w-3 h-3 text-neon-green" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
            {newPublic ? "Público" : "Privado"}
          </button>
          <span className="text-[10px] text-muted-foreground font-body">Plataforma: {newPlatform}</span>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={adding || !newUrl.trim()} className="text-xs">
          {adding ? "Agregando..." : "Agregar"}
        </Button>
      </div>

      {/* Content list */}
      <div className="bg-card border border-border rounded p-4 space-y-2">
        <h3 className="font-pixel text-[10px] text-muted-foreground">MI CONTENIDO ({contents.length})</h3>
        {contents.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body">No has agregado contenido aún</p>
        ) : (
          contents.map(c => (
            <div key={c.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded group">
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
