import { useState, useEffect } from "react";
import { User, Edit2, Trophy, Star, Instagram, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [userPosts, setUserPosts] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setBio(profile.bio || "");
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      supabase.from("posts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
        .then(({ data }) => { if (data) setUserPosts(data); });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName, bio }).eq("user_id", user.id);
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-cyan/30 rounded p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-8 bg-muted text-sm font-body" placeholder="Nombre" />
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-muted text-sm font-body min-h-[60px]" placeholder="Cuéntanos sobre ti..." />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs">{saving ? "Guardando..." : "Guardar"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="text-xs">Cancelar</Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-pixel text-sm text-neon-cyan">{profile?.display_name}</h2>
                <p className="text-xs text-muted-foreground font-body mt-1">{profile?.bio || "Sin descripción"}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] font-pixel text-neon-yellow flex items-center gap-1">
                    <Star className="w-3 h-3" /> {profile?.membership_tier?.toUpperCase()}
                  </span>
                  <span className="text-[10px] font-body text-neon-green flex items-center gap-1">
                    <Trophy className="w-3 h-3" /> {profile?.total_score?.toLocaleString()} pts
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="text-xs gap-1">
                    <Edit2 className="w-3 h-3" /> Editar Perfil
                  </Button>
                  <Button size="sm" variant="outline" asChild className="text-xs">
                    <Link to="/membresias">Actualizar Plan</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Social links */}
        {(profile?.instagram_url || profile?.youtube_url || profile?.tiktok_url) && (
          <div className="flex gap-3 mt-4 pt-3 border-t border-border">
            {profile?.instagram_url && (
              <a href={profile.instagram_url} target="_blank" rel="noopener" className="text-neon-magenta hover:opacity-80 transition-opacity">
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {profile?.youtube_url && (
              <a href={profile.youtube_url} target="_blank" rel="noopener" className="text-destructive hover:opacity-80 transition-opacity">
                <Youtube className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* User posts */}
      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">MIS POSTS</h3>
        {userPosts.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body">Aún no has publicado nada</p>
        ) : (
          <div className="space-y-2">
            {userPosts.map((post) => (
              <div key={post.id} className="p-2 border border-border/50 rounded text-xs font-body hover:bg-muted/30 transition-colors">
                <p className="text-foreground">{post.title}</p>
                <span className="text-muted-foreground text-[10px]">{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
