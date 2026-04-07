import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { User, Trophy, Star, Instagram, Youtube, Globe, Calendar, UserPlus, UserMinus, MessageSquare, Gamepad2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import RoleBadge from "@/components/RoleBadge";

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
}

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
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

      // Check if current user follows this profile
      if (user && user.id !== userId) {
        const { data: f } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle();
        setIsFollowing(!!f);
      }

      // Fetch scores and posts
      const [{ data: scores }, { data: posts }] = await Promise.all([
        supabase.from("leaderboard_scores").select("game_name, console_type, score").eq("user_id", userId).order("score", { ascending: false }),
        supabase.from("posts").select("id, title, category, upvotes, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);
      if (scores) setGameScores(scores as any);
      if (posts) setUserPosts(posts);
      setLoading(false);
    };
    fetchProfile();
  }, [userId, user]);

  const handleFollow = async () => {
    if (!user || !userId) { toast({ title: "Inicia sesión para seguir", variant: "destructive" }); return; }
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
      setIsFollowing(false);
      setFollowerCount(p => p - 1);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
      setFollowerCount(p => p + 1);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs text-muted-foreground font-body animate-fade-in">Cargando perfil...</div>;
  if (!profile) return <div className="p-8 text-center text-xs text-muted-foreground font-body">Perfil no encontrado</div>;

  const isStaff = roles.includes("master_web") || roles.includes("admin");
  const isMod = roles.includes("moderator");
  const memberSince = new Date(profile.created_at).toLocaleDateString("es-ES", { year: "numeric", month: "long" });

  // Best score per game
  const bestScores = Object.values(
    gameScores.reduce<Record<string, { game_name: string; console_type: string; score: number }>>((acc, gs) => {
      const key = `${gs.game_name}-${gs.console_type}`;
      if (!acc[key] || gs.score > acc[key].score) acc[key] = gs;
      return acc;
    }, {})
  );
  const totalScore = bestScores.reduce((sum, gs) => sum + gs.score, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-cyan/30 rounded p-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl border-2 border-neon-cyan/30 overflow-hidden shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-pixel text-base text-neon-cyan">{profile.display_name}</h2>
              <RoleBadge roles={roles} roleIcon={profile.role_icon} showIcon={profile.show_role_icon !== false} />
            </div>
            <p className="text-xs text-muted-foreground font-body mt-1">{profile.bio || "Sin descripción"}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {(isStaff || isMod) ? (
                <span className="text-[10px] font-pixel text-neon-magenta flex items-center gap-1">
                  {isStaff ? "DIOS TODOPODEROSO" : "MÍTICO"}
                </span>
              ) : (
                <span className="text-[10px] font-pixel text-neon-yellow flex items-center gap-1">
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
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant={isFollowing ? "outline" : "default"} onClick={handleFollow} className="text-xs gap-1">
                  {isFollowing ? <><UserMinus className="w-3 h-3" /> Dejar de seguir</> : <><UserPlus className="w-3 h-3" /> Seguir</>}
                </Button>
                <Button size="sm" variant="outline" asChild className="text-xs gap-1">
                  <Link to={`/mensajes?to=${userId}`}><MessageSquare className="w-3 h-3" /> Mensaje</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">ESTADÍSTICAS</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded p-3 text-center">
            <p className="text-lg font-bold font-body text-neon-green">{Math.max(profile.total_score, totalScore).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground font-body">Puntos</p>
          </div>
          <div className="bg-muted/30 rounded p-3 text-center">
            <p className="text-lg font-bold font-body text-neon-cyan">{userPosts.length}</p>
            <p className="text-[10px] text-muted-foreground font-body">Posts</p>
          </div>
          <div className="bg-muted/30 rounded p-3 text-center">
            <p className="text-lg font-bold font-body text-neon-yellow">{bestScores.length}</p>
            <p className="text-[10px] text-muted-foreground font-body">Juegos</p>
          </div>
        </div>
      </div>

      {/* Game scores */}
      {bestScores.length > 0 && (
        <div className="bg-card border border-border rounded p-4">
          <h3 className="font-pixel text-[10px] text-neon-green mb-2 flex items-center gap-1">
            <Gamepad2 className="w-3 h-3" /> PUNTAJES POR JUEGO
          </h3>
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

      {/* Recent posts */}
      {userPosts.length > 0 && (
        <div className="bg-card border border-border rounded p-4">
          <h3 className="font-pixel text-[10px] text-muted-foreground mb-3">POSTS RECIENTES</h3>
          <div className="space-y-2">
            {userPosts.map((post) => (
              <div key={post.id} className="p-2 border border-border/50 rounded text-xs font-body hover:bg-muted/30 transition-colors">
                <p className="text-foreground">{post.title}</p>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  <span className="text-neon-green">▲{post.upvotes}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
