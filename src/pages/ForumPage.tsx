import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Flame, MessageSquare, ArrowUp, ArrowDown, Plus, Flag, X, Send, Reply, Image, Video, Bold, Italic, Link2, Smile, Type, User, Edit2, Check } from "lucide-react";
import RoleBadge from "@/components/RoleBadge";
import UserPopup from "@/components/UserPopup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const pageTitles: Record<string, { title: string; description: string; color: string }> = {
  "/arcade": { title: "ZONA ARCADE", description: "Emuladores retro, salas de juego y leaderboards", color: "text-neon-green" },
  "/gaming-anime": { title: "GAMING & ANIME", description: "Comunidad de gaming, anime y manga", color: "text-neon-cyan" },
  "/gaming-anime/foro": { title: "FORO GENERAL", description: "Espacio para hablar de todo un poco", color: "text-neon-cyan" },
  "/gaming-anime/anime": { title: "ANIME & MANGA", description: "Debates, recomendaciones y reseñas", color: "text-neon-cyan" },
  "/gaming-anime/creador": { title: "RINCÓN DEL CREADOR", description: "Comparte tu Fanart, Cosplays y proyectos creativos", color: "text-neon-cyan" },
  "/motociclismo": { title: "MOTOCICLISMO", description: "Riders, mecánica, rutas y quedadas", color: "text-neon-magenta" },
  "/motociclismo/riders": { title: "FORO DE RIDERS", description: "Discusiones sobre marcas, estilos y noticias motor", color: "text-neon-magenta" },
  "/motociclismo/taller": { title: "TALLER & MECÁNICA", description: "Tutoriales, manuales y consejos que ofrezcan", color: "text-neon-magenta" },
  "/motociclismo/rutas": { title: "RUTAS & QUEDADAS", description: "Organiza viajes grupales y comparte rutas", color: "text-neon-magenta" },
  "/mercado": { title: "MERCADO & TRUEQUE", description: "Compra, vende e intercambia", color: "text-neon-yellow" },
  "/mercado/gaming": { title: "MERCADO GAMING", description: "Consolas retro, cartuchos y accesorios", color: "text-neon-yellow" },
  "/mercado/motor": { title: "MERCADO MOTOR", description: "Repuestos, cascos, chaquetas y motos", color: "text-neon-yellow" },
  "/social": { title: "SOCIAL HUB", description: "Feed, reels, galería y contenido social", color: "text-neon-orange" },
  "/social/feed": { title: "FEED PRINCIPAL", description: "Muro al estilo red social", color: "text-neon-orange" },
  "/trending": { title: "TRENDING", description: "Lo más popular del momento", color: "text-destructive" },
  "/reglas": { title: "REGLAS", description: "Normas de convivencia del foro", color: "text-muted-foreground" },
  "/contacto": { title: "CONTACTO", description: "Reporta bugs o comportamiento inapropiado", color: "text-muted-foreground" },
  "/privacidad": { title: "PRIVACIDAD", description: "Política de privacidad", color: "text-muted-foreground" },
  "/faq": { title: "FAQ", description: "Preguntas frecuentes", color: "text-muted-foreground" },
  "/mensajes": { title: "MENSAJES", description: "Bandeja de mensajes privados", color: "text-neon-cyan" },
};

const MAX_COMMENT_LENGTH = 2000;

const mockPostsByCategory: Record<string, Array<{ id: string; title: string; content: string; upvotes: number; downvotes: number; is_pinned: boolean; user_id: string; created_at: string; category: string }>> = {
  "gaming-anime": [
    { id: "ga1", title: "🎮 Los 10 mejores RPGs de la historia según la comunidad", content: "Después de una encuesta con más de 500 votos, aquí están los resultados.", upvotes: 245, downvotes: 12, is_pinned: true, user_id: "", created_at: new Date(Date.now() - 86400000).toISOString(), category: "gaming-anime" },
  ],
  "trending": [
    { id: "t1", title: "🔥 Los posts más votados de la semana", content: "Resumen semanal de lo más popular en Forbiddens.", upvotes: 500, downvotes: 5, is_pinned: true, user_id: "", created_at: new Date(Date.now() - 3600000).toISOString(), category: "trending" },
  ],
};

function renderContent(content: string) {
  if (!content) return null;
  const parts = content.split(/(\!\[.*?\]\(.*?\)|https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+|https?:\/\/(?:www\.)?youtu\.be\/[\w-]+|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    const imgMatch = part.match(/^\!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) return <img key={i} src={imgMatch[2]} alt={imgMatch[1]} className="w-full max-h-64 object-cover rounded mt-2 mb-1 border border-border" loading="lazy" />;
    const ytMatch = part.match(/youtube\.com\/watch\?v=([\w-]+)/) || part.match(/youtu\.be\/([\w-]+)/);
    if (ytMatch) return <div key={i} className="relative w-full aspect-video mt-2 mb-1 rounded overflow-hidden border border-border"><iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen title="Video" /></div>;
    // Make plain URLs clickable
    if (/^https?:\/\/[^\s]+$/.test(part)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a>;
    return part.split('\n').map((line, j) => <span key={`${i}-${j}`}>{line}{j < part.split('\n').length - 1 && <br />}</span>);
  });
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  membership_tier: string;
  created_at: string;
  parent_id: string | null;
  profile?: { display_name: string; avatar_url: string | null; role_icon: string | null; show_role_icon: boolean; membership_tier?: string } | null;
  roles?: string[];
}

interface PostProfile {
  display_name: string;
  avatar_url: string | null;
  role_icon: string | null;
  show_role_icon: boolean;
  membership_tier: string;
}

export default function ForumPage() {
  const location = useLocation();
  const page = pageTitles[location.pathname] || { title: "PÁGINA", description: "Sección del foro", color: "text-foreground" };
  const { user, profile, isAdmin, isMasterWeb } = useAuth();
  const { toast } = useToast();
  const [showNewPost, setShowNewPost] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"popular" | "new">("popular");
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showRulesPopup, setShowRulesPopup] = useState(false);
  // Post author profiles + roles
  const [postProfiles, setPostProfiles] = useState<Record<string, PostProfile>>({});
  const [postRoles, setPostRoles] = useState<Record<string, string[]>>({});

  const category = location.pathname.replace(/^\//, "").replace(/\//g, "-") || "general";
  const hasUnlimited = isAdmin || isMasterWeb;

  const fetchPosts = async () => {
    const query = supabase.from("posts").select("*").eq("category", category).order("is_pinned", { ascending: false });
    if (sortBy === "popular") query.order("upvotes", { ascending: false });
    else query.order("created_at", { ascending: false });
    const { data } = await query.limit(20);
    if (data) {
      setPosts(data);
      // Fetch profiles and roles for post authors
      const userIds = [...new Set((data as any[]).map(p => p.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, role_icon, show_role_icon, membership_tier").in("user_id", userIds);
        const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
        const pMap: Record<string, PostProfile> = {};
        profiles?.forEach(p => pMap[p.user_id] = p as unknown as PostProfile);
        const rMap: Record<string, string[]> = {};
        roles?.forEach((r: any) => { if (!rMap[r.user_id]) rMap[r.user_id] = []; rMap[r.user_id].push(r.role); });
        setPostProfiles(pMap);
        setPostRoles(rMap);
      }
    }
  };

  const fetchComments = async (postId: string) => {
    const { data } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (!data) return;
    const userIds = [...new Set((data as any[]).map(c => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, role_icon, show_role_icon, membership_tier").in("user_id", userIds);
    const { data: userRoles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => profileMap[p.user_id] = p);
    const rolesMap: Record<string, string[]> = {};
    userRoles?.forEach((r: any) => { if (!rolesMap[r.user_id]) rolesMap[r.user_id] = []; rolesMap[r.user_id].push(r.role); });
    const enriched = (data as any[]).map(c => ({ ...c, profile: profileMap[c.user_id] || null, roles: rolesMap[c.user_id] || [] }));
    setComments((prev) => ({ ...prev, [postId]: enriched as Comment[] }));
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase.channel(`posts-${category}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [category, sortBy]);

  const handleNewPostClick = () => {
    // Check if user has accepted rules
    const rulesKey = `rules_accepted_${user?.id}`;
    if (user && !localStorage.getItem(rulesKey)) {
      setShowRulesPopup(true);
      return;
    }
    setShowNewPost(!showNewPost);
  };

  const acceptRules = () => {
    if (user) localStorage.setItem(`rules_accepted_${user.id}`, "true");
    setShowRulesPopup(false);
    setShowNewPost(true);
  };

  const handlePost = async () => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes registrarte para publicar", variant: "destructive" });
      return;
    }
    if (!title.trim()) return;
    setPosting(true);
    // Use custom signature from profile, or fallback to auto-generated
    const customSig = (profile as any)?.signature;
    const signature = customSig
      ? customSig
      : ((profile?.membership_tier && profile.membership_tier !== "novato") || hasUnlimited
        ? `— ${profile?.display_name} [${hasUnlimited ? (isMasterWeb ? "MASTER WEB" : "ADMIN") : profile?.membership_tier?.toUpperCase()}]`
        : null);
    const { error } = await supabase.from("posts").insert({
      user_id: user.id, title: title.trim(), content: content.trim(), category, signature,
    } as any);
    setPosting(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setTitle(""); setContent(""); setShowNewPost(false); toast({ title: "Post publicado" }); }
  };

  const handleVote = async (postId: string, voteType: "up" | "down") => {
    if (!user) { toast({ title: "Inicia sesión para votar", variant: "destructive" }); return; }
    const { data: existing } = await supabase.from("post_votes").select("*").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
    if (existing) {
      if ((existing as any).vote_type === voteType) {
        await supabase.from("post_votes").delete().eq("id", (existing as any).id);
      } else {
        await supabase.from("post_votes").update({ vote_type: voteType } as any).eq("id", (existing as any).id);
      }
    } else {
      await supabase.from("post_votes").insert({ user_id: user.id, post_id: postId, vote_type: voteType } as any);
    }
    const { count: upCount } = await supabase.from("post_votes").select("*", { count: "exact", head: true }).eq("post_id", postId).eq("vote_type", "up");
    const { count: downCount } = await supabase.from("post_votes").select("*", { count: "exact", head: true }).eq("post_id", postId).eq("vote_type", "down");
    await supabase.from("posts").update({ upvotes: upCount || 0, downvotes: downCount || 0 } as any).eq("id", postId);
    fetchPosts();
  };

  const handleComment = async (postId: string) => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes registrarte para comentar", variant: "destructive" });
      return;
    }
    if (!commentText.trim()) return;
    if (commentText.length > MAX_COMMENT_LENGTH) {
      toast({ title: "Comentario muy largo", description: `Máximo ${MAX_COMMENT_LENGTH} caracteres`, variant: "destructive" });
      return;
    }
    const tier = profile?.membership_tier || "novato";
    const { error } = await supabase.from("comments").insert({
      post_id: postId, user_id: user.id, content: commentText.trim(), membership_tier: tier, parent_id: replyTo,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setCommentText(""); setReplyTo(null); fetchComments(postId); }
  };

  const handleReport = async (postId: string, postUserId: string) => {
    if (!user) { toast({ title: "Inicia sesión para reportar", variant: "destructive" }); return; }
    const { error } = await supabase.from("reports").insert({ reporter_id: user.id, post_id: postId, reported_user_id: postUserId, reason: "Contenido inapropiado" } as any);
    if (!error) toast({ title: "Reporte enviado", description: "Los administradores lo revisarán" });
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) { toast({ title: "Post eliminado" }); fetchPosts(); }
  };

  const startEditPost = (post: any) => {
    setEditingPost(post.id);
    setEditTitle(post.title);
    setEditContent(post.content || "");
  };

  const handleEditPost = async (postId: string) => {
    if (!editTitle.trim()) return;
    const { error } = await supabase.from("posts").update({
      title: editTitle.trim(), content: editContent.trim(),
    } as any).eq("id", postId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Post editado" }); setEditingPost(null); fetchPosts(); }
  };

  const toggleComments = (postId: string) => {
    if (expandedPost === postId) setExpandedPost(null);
    else { setExpandedPost(postId); fetchComments(postId); }
  };

  const insertFormat = (format: string) => {
    if (format === "bold") setCommentText(prev => prev + "**texto**");
    else if (format === "italic") setCommentText(prev => prev + "*texto*");
    else if (format === "image") setCommentText(prev => prev + "![descripción](URL_imagen)");
    else if (format === "link") setCommentText(prev => prev + "[texto](URL)");
    else if (format === "video") setCommentText(prev => prev + "https://youtube.com/watch?v=");
  };

  const mockThreads = posts.length > 0 ? [] : (mockPostsByCategory[category] || [
    { id: "default1", title: "¡Bienvenido a esta sección!", content: "Sé el primero en publicar algo aquí.", upvotes: 10, downvotes: 0, is_pinned: true, user_id: "", created_at: new Date().toISOString(), category },
  ]);

  const allPosts = [...posts, ...mockThreads];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-border rounded p-4">
        <h1 className={cn("font-pixel text-sm mb-1", page.color)}>{page.title}</h1>
        <p className="text-xs text-muted-foreground font-body">{page.description}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className={cn("text-xs font-body h-7", sortBy === "popular" ? "text-neon-green" : "text-muted-foreground")} onClick={() => setSortBy("popular")}>
            <Flame className="w-3 h-3 mr-1" /> Populares
          </Button>
          <Button variant="ghost" size="sm" className={cn("text-xs font-body h-7", sortBy === "new" ? "text-neon-green" : "text-muted-foreground")} onClick={() => setSortBy("new")}>
            Nuevos
          </Button>
        </div>
        {user && (
          <Button size="sm" className="h-7 text-xs font-body bg-primary text-primary-foreground" onClick={() => setShowNewPost(!showNewPost)}>
            <Plus className="w-3 h-3 mr-1" /> Nuevo Post
          </Button>
        )}
      </div>

      {showNewPost && (
        <div className="bg-card border border-neon-green/30 rounded p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[10px] text-neon-green">NUEVO POST</h3>
            <button onClick={() => setShowNewPost(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <Input placeholder="Título del post" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 bg-muted text-sm font-body" />
          <Textarea placeholder="Escribe tu contenido..." value={content} onChange={(e) => setContent(e.target.value)} className="bg-muted text-sm font-body min-h-[80px]" />
          <div className="bg-muted/50 rounded p-2 text-[9px] text-muted-foreground font-body space-y-0.5 border border-border/50">
            <p className="flex items-center gap-1"><Image className="w-3 h-3" /> <strong>Imágenes:</strong> <code className="bg-muted px-0.5 rounded">![descripción](URL_de_imagen)</code></p>
            <p className="flex items-center gap-1"><Video className="w-3 h-3" /> <strong>Videos:</strong> Pega un enlace de YouTube directamente</p>
          </div>
          {(profile?.membership_tier && profile.membership_tier !== "novato") || hasUnlimited ? (
            <p className="text-[9px] text-muted-foreground font-body italic">
              Tu firma: — {profile?.display_name} [{hasUnlimited ? (isMasterWeb ? "MASTER WEB" : "ADMIN") : profile?.membership_tier?.toUpperCase()}]
            </p>
          ) : null}
          <Button size="sm" onClick={handlePost} disabled={posting || !title.trim()} className="text-xs">
            {posting ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {allPosts.map((post) => {
          const authorProfile = postProfiles[post.user_id];
          const authorRoles = postRoles[post.user_id] || [];

          return (
            <div key={post.id}>
              <div className={cn("bg-card border rounded p-3 hover:bg-muted/30 transition-all duration-200 group", post.is_pinned ? "border-neon-green/30" : "border-border")}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 text-muted-foreground shrink-0">
                    <button onClick={() => handleVote(post.id, "up")} className="hover:text-primary transition-colors"><ArrowUp className="w-4 h-4" /></button>
                    <span className="text-xs font-body font-semibold">{(post.upvotes || 0) - (post.downvotes || 0)}</span>
                    <button onClick={() => handleVote(post.id, "down")} className="hover:text-destructive transition-colors"><ArrowDown className="w-4 h-4" /></button>
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* Post author */}
                    {post.user_id && authorProfile && (
                      <div className="mb-1 flex items-center gap-2">
                        <UserPopup
                          userId={post.user_id}
                          displayName={authorProfile.display_name}
                          avatarUrl={authorProfile.avatar_url}
                          roles={authorRoles}
                          roleIcon={authorProfile.role_icon}
                          showRoleIcon={authorProfile.show_role_icon}
                          membershipTier={authorProfile.membership_tier}
                        />
                      </div>
                    )}
                    {editingPost === post.id ? (
                      <div className="space-y-2 animate-fade-in">
                        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-8 bg-muted text-sm font-body" />
                        <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="bg-muted text-xs font-body min-h-[60px]" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleEditPost(post.id)} className="text-xs gap-1 h-6"><Check className="w-3 h-3" /> Guardar</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingPost(null)} className="text-xs h-6">Cancelar</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-body text-foreground group-hover:text-primary transition-colors leading-snug cursor-pointer" onClick={() => toggleComments(post.id)}>
                          {post.is_pinned && <span className="text-neon-green text-[10px] mr-1">📌</span>}
                          {post.title}
                        </p>
                        {post.content && (
                          <div className="text-xs text-muted-foreground font-body mt-1">{renderContent(post.content)}</div>
                        )}
                      </>
                    )}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground font-body">
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      <button onClick={() => toggleComments(post.id)} className="flex items-center gap-0.5 hover:text-primary transition-colors">
                        <MessageSquare className="w-3 h-3" /> Comentarios
                      </button>
                      {user && user.id === post.user_id && !editingPost && (
                        <button onClick={() => startEditPost(post)} className="flex items-center gap-0.5 hover:text-neon-cyan transition-colors">
                          <Edit2 className="w-3 h-3" /> Editar
                        </button>
                      )}
                      {post.user_id && (
                        <button onClick={() => handleReport(post.id, post.user_id)} className="flex items-center gap-0.5 hover:text-destructive transition-colors ml-auto">
                          <Flag className="w-3 h-3" />
                        </button>
                      )}
                      {isAdmin && post.user_id && (
                        <button onClick={() => handleDeletePost(post.id)} className="text-destructive hover:text-destructive/80 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {(post as any).signature && (
                      <p className="text-[9px] text-neon-yellow font-body mt-1 italic">{(post as any).signature}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Comments section */}
              {expandedPost === post.id && (
                <div className="ml-4 border-l-2 border-border pl-3 mt-1 space-y-2 animate-fade-in">
                  {(comments[post.id] || []).map((comment) => (
                    <div key={comment.id} className={cn("bg-muted/30 rounded p-3 text-xs font-body", comment.parent_id && "ml-4")}>
                      <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {comment.profile?.avatar_url ? (
                            <img src={comment.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-3 h-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <UserPopup
                              userId={comment.user_id}
                              displayName={comment.profile?.display_name || "Anónimo"}
                              avatarUrl={comment.profile?.avatar_url}
                              roles={comment.roles || []}
                              roleIcon={comment.profile?.role_icon}
                              showRoleIcon={comment.profile?.show_role_icon !== false}
                              membershipTier={comment.profile?.membership_tier || comment.membership_tier}
                            />
                            <span className="text-[9px] text-muted-foreground">{new Date(comment.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="text-foreground leading-relaxed">{renderContent(comment.content)}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {user && (
                              <button onClick={() => setReplyTo(comment.id)} className="hover:text-primary transition-colors text-[10px] text-muted-foreground">
                                <Reply className="w-3 h-3 inline mr-0.5" /> Responder
                              </button>
                            )}
                            {user && comment.user_id !== user.id && (
                              <button onClick={async () => {
                                await supabase.from("reports").insert({ reporter_id: user.id, post_id: comment.post_id, reported_user_id: comment.user_id, reason: "Comentario inapropiado" } as any);
                                toast({ title: "Comentario reportado" });
                              }} className="hover:text-destructive transition-colors text-[10px] text-muted-foreground">
                                <Flag className="w-3 h-3 inline mr-0.5" /> Reportar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {user ? (
                    <div className="space-y-2 bg-card border border-border rounded p-3">
                      {replyTo && (
                        <div className="flex items-center gap-1 text-[10px] text-neon-cyan font-body">
                          <Reply className="w-3 h-3" /> Respondiendo
                          <button onClick={() => setReplyTo(null)} className="text-destructive ml-1"><X className="w-3 h-3" /></button>
                        </div>
                      )}
                      <Textarea
                        placeholder="Escribe tu comentario..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        maxLength={MAX_COMMENT_LENGTH}
                        className="bg-muted text-xs font-body min-h-[80px] resize-y"
                      />
                      <div className="flex items-center gap-1 flex-wrap">
                        <button onClick={() => insertFormat("bold")} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Negrita"><Bold className="w-3.5 h-3.5" /></button>
                        <button onClick={() => insertFormat("italic")} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Itálica"><Italic className="w-3.5 h-3.5" /></button>
                        <button onClick={() => insertFormat("image")} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Imagen"><Image className="w-3.5 h-3.5" /></button>
                        <button onClick={() => insertFormat("link")} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Enlace"><Link2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => insertFormat("video")} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Video"><Video className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setCommentText(prev => prev + "😊")} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Emoji"><Smile className="w-3.5 h-3.5" /></button>
                        <div className="flex-1" />
                        <span className="text-[9px] text-muted-foreground font-body">{commentText.length}/{MAX_COMMENT_LENGTH}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] text-muted-foreground font-body italic">
                          {hasUnlimited ? `Firma: — ${profile?.display_name} [${isMasterWeb ? "MASTER WEB" : "ADMIN"}]` : ""}
                        </p>
                        <Button size="sm" onClick={() => handleComment(post.id)} disabled={!commentText.trim()} className="h-7 text-xs px-3 gap-1">
                          <Send className="w-3 h-3" /> Comentar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground font-body">Inicia sesión para comentar</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
