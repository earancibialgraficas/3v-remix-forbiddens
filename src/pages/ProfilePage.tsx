import { useState, useEffect } from "react";
import { User, Edit2, Trophy, Star, Instagram, Youtube, MapPin, Globe, Gamepad2, Calendar, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState<"posts" | "stats" | "social">("posts");

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
    if (user) {
      supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
        .then(({ data }) => { if (data) setUserPosts(data); });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      bio,
      instagram_url: instagram || null,
      youtube_url: youtube || null,
      tiktok_url: tiktok || null,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil actualizado" });
      setEditing(false);
      await refreshProfile();
    }
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

  const tabs = [
    { id: "posts" as const, label: "Mis Posts", icon: MessageSquare },
    { id: "stats" as const, label: "Estadísticas", icon: Trophy },
    { id: "social" as const, label: "Redes", icon: Globe },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Profile Card */}
      <div className="bg-card border border-neon-cyan/30 rounded p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl shrink-0 border-2 border-neon-cyan/30">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
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
                  <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="h-8 bg-muted text-xs font-body" placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">YouTube URL</label>
                  <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} className="h-8 bg-muted text-xs font-body" placeholder="https://youtube.com/..." />
                </div>
                <div>
                  <label className="text-[10px] font-body text-muted-foreground block mb-0.5">TikTok URL</label>
                  <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} className="h-8 bg-muted text-xs font-body" placeholder="https://tiktok.com/..." />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">{saving ? "Guardando..." : "Guardar"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="text-xs">Cancelar</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <h2 className="font-pixel text-sm text-neon-cyan">{profile?.display_name}</h2>
                  {(isAdmin || isMasterWeb) && (
                    <span className={cn("text-[8px] font-pixel px-1.5 py-0.5 rounded", isMasterWeb ? "bg-neon-magenta/20 text-neon-magenta" : "bg-neon-yellow/20 text-neon-yellow")}>
                      {isMasterWeb ? "MASTER WEB" : "ADMIN"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-body mt-1">{profile?.bio || "Sin descripción"}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="text-[10px] font-pixel text-neon-yellow flex items-center gap-1">
                    <Star className="w-3 h-3" /> {profile?.membership_tier?.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-body text-neon-green flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> {profile?.total_score?.toLocaleString()} pts
                  </span>
                  <span className="text-[10px] font-body text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Desde {memberSince}
                  </span>
                  <span className="text-[10px] font-body text-muted-foreground flex items-center gap-1">
                    <Gamepad2 className="w-3 h-3" /> {userPosts.length} posts
                  </span>
                </div>
                {/* Social links inline */}
                {(profile?.instagram_url || profile?.youtube_url || profile?.tiktok_url) && (
                  <div className="flex gap-3 mt-2">
                    {profile?.instagram_url && (
                      <a href={profile.instagram_url} target="_blank" rel="noopener" className="text-neon-magenta hover:opacity-80 transition-opacity flex items-center gap-0.5 text-[10px] font-body">
                        <Instagram className="w-3.5 h-3.5" /> Instagram
                      </a>
                    )}
                    {profile?.youtube_url && (
                      <a href={profile.youtube_url} target="_blank" rel="noopener" className="text-destructive hover:opacity-80 transition-opacity flex items-center gap-0.5 text-[10px] font-body">
                        <Youtube className="w-3.5 h-3.5" /> YouTube
                      </a>
                    )}
                    {profile?.tiktok_url && (
                      <a href={profile.tiktok_url} target="_blank" rel="noopener" className="text-neon-cyan hover:opacity-80 transition-opacity flex items-center gap-0.5 text-[10px] font-body">
                        <Globe className="w-3.5 h-3.5" /> TikTok
                      </a>
                    )}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="text-xs gap-1">
                    <Edit2 className="w-3 h-3" /> Editar Perfil
                  </Button>
                  <Button size="sm" variant="outline" asChild className="text-xs">
                    <Link to="/configuracion">Configuración</Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild className="text-xs">
                    <Link to="/membresias">Actualizar Plan</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card border border-border rounded p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-body transition-all",
              activeTab === tab.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3 h-3" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "posts" && (
        <div className="bg-card border border-border rounded p-4">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">MIS POSTS</h3>
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
            <div className="bg-muted/30 rounded p-3 text-center">
              <p className="text-lg font-bold text-neon-green font-body">{profile?.total_score?.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground font-body">Puntos totales</p>
            </div>
            <div className="bg-muted/30 rounded p-3 text-center">
              <p className="text-lg font-bold text-neon-cyan font-body">{userPosts.length}</p>
              <p className="text-[10px] text-muted-foreground font-body">Posts</p>
            </div>
            <div className="bg-muted/30 rounded p-3 text-center">
              <p className="text-lg font-bold text-neon-yellow font-body">{profile?.membership_tier?.toUpperCase()}</p>
              <p className="text-[10px] text-muted-foreground font-body">Membresía</p>
            </div>
            <div className="bg-muted/30 rounded p-3 text-center">
              <p className="text-lg font-bold text-neon-magenta font-body">{roles.length}</p>
              <p className="text-[10px] text-muted-foreground font-body">Roles</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "social" && (
        <div className="bg-card border border-border rounded p-4 space-y-3">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">REDES SOCIALES</h3>
          <div className="space-y-2">
            {profile?.instagram_url ? (
              <a href={profile.instagram_url} target="_blank" rel="noopener" className="flex items-center gap-2 p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors">
                <Instagram className="w-4 h-4 text-neon-magenta" />
                <span className="text-xs font-body text-foreground">Instagram</span>
              </a>
            ) : <p className="text-xs text-muted-foreground font-body">No has vinculado Instagram</p>}
            {profile?.youtube_url ? (
              <a href={profile.youtube_url} target="_blank" rel="noopener" className="flex items-center gap-2 p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors">
                <Youtube className="w-4 h-4 text-destructive" />
                <span className="text-xs font-body text-foreground">YouTube</span>
              </a>
            ) : <p className="text-xs text-muted-foreground font-body">No has vinculado YouTube</p>}
            {profile?.tiktok_url ? (
              <a href={profile.tiktok_url} target="_blank" rel="noopener" className="flex items-center gap-2 p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors">
                <Globe className="w-4 h-4 text-neon-cyan" />
                <span className="text-xs font-body text-foreground">TikTok</span>
              </a>
            ) : <p className="text-xs text-muted-foreground font-body">No has vinculado TikTok</p>}
          </div>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="text-xs mt-2">
            <Edit2 className="w-3 h-3 mr-1" /> Editar Redes
          </Button>
        </div>
      )}
    </div>
  );
}
