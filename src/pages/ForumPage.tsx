import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Flame, MessageSquare, ArrowUp, ArrowDown, Plus, Flag, X, Send, Reply } from "lucide-react";
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
  "/social/reels": { title: "REELS & VIDEOS", description: "Linkea tu Instagram, YouTube o TikTok para mostrar tu contenido", color: "text-neon-orange" },
  "/social/fotos": { title: "MURO FOTOGRÁFICO", description: "Galería de imágenes de la comunidad", color: "text-neon-orange" },
  "/trending": { title: "TRENDING", description: "Lo más popular del momento", color: "text-destructive" },
  "/reglas": { title: "REGLAS", description: "Normas de convivencia del foro", color: "text-muted-foreground" },
  "/contacto": { title: "CONTACTO", description: "Reporta bugs o comportamiento inapropiado", color: "text-muted-foreground" },
  "/privacidad": { title: "PRIVACIDAD", description: "Política de privacidad", color: "text-muted-foreground" },
  "/faq": { title: "FAQ", description: "Preguntas frecuentes", color: "text-muted-foreground" },
  "/mensajes": { title: "MENSAJES", description: "Bandeja de mensajes privados", color: "text-neon-cyan" },
};

const membershipCommentFeatures: Record<string, { maxLength: number; canEmbed: boolean; canGif: boolean; label: string }> = {
  novato: { maxLength: 500, canEmbed: false, canGif: false, label: "Texto básico" },
  entusiasta: { maxLength: 1000, canEmbed: false, canGif: true, label: "Texto + GIFs" },
  coleccionista: { maxLength: 2000, canEmbed: true, canGif: true, label: "Texto + GIFs + Links" },
  "leyenda arcade": { maxLength: 5000, canEmbed: true, canGif: true, label: "Texto completo + formato" },
  "creador verificado": { maxLength: 5000, canEmbed: true, canGif: true, label: "Sin límites" },
};

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  membership_tier: string;
  created_at: string;
  parent_id: string | null;
}

export default function ForumPage() {
  const location = useLocation();
  const page = pageTitles[location.pathname] || { title: "PÁGINA", description: "Sección del foro", color: "text-foreground" };
  const { user, profile, isAdmin } = useAuth();
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

  const category = location.pathname.replace(/^\//, "").replace(/\//g, "-") || "general";

  const fetchPosts = async () => {
    const query = supabase
      .from("posts")
      .select("*")
      .eq("category", category)
      .order("is_pinned", { ascending: false });

    if (sortBy === "popular") {
      query.order("upvotes", { ascending: false });
    } else {
      query.order("created_at", { ascending: false });
    }

    const { data } = await query.limit(20);
    if (data) setPosts(data);
  };

  const fetchComments = async (postId: string) => {
    const { data } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (data) {
      setComments((prev) => ({ ...prev, [postId]: data as Comment[] }));
    }
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase.channel(`posts-${category}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [category, sortBy]);

  const handlePost = async () => {
    if (!user || !title.trim()) return;
    setPosting(true);
    const signature = profile?.membership_tier && profile.membership_tier !== "novato"
      ? `— ${profile.display_name} [${profile.membership_tier.toUpperCase()}]`
      : null;
    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      category,
      signature,
    } as any);
    setPosting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setTitle("");
      setContent("");
      setShowNewPost(false);
      toast({ title: "Post publicado" });
    }
  };

  const handleVote = async (postId: string, voteType: "up" | "down") => {
    if (!user) {
      toast({ title: "Inicia sesión para votar", variant: "destructive" });
      return;
    }
    // Check existing vote
    const { data: existing } = await supabase
      .from("post_votes")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      if ((existing as any).vote_type === voteType) {
        // Remove vote
        await supabase.from("post_votes").delete().eq("id", (existing as any).id);
      } else {
        // Change vote
        await supabase.from("post_votes").update({ vote_type: voteType } as any).eq("id", (existing as any).id);
      }
    } else {
      await supabase.from("post_votes").insert({
        user_id: user.id,
        post_id: postId,
        vote_type: voteType,
      } as any);
    }
    fetchPosts();
  };

  const handleComment = async (postId: string) => {
    if (!user || !commentText.trim()) return;
    const tier = profile?.membership_tier || "novato";
    const features = membershipCommentFeatures[tier] || membershipCommentFeatures.novato;

    if (commentText.length > features.maxLength) {
      toast({ title: "Comentario muy largo", description: `Tu plan permite hasta ${features.maxLength} caracteres`, variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: commentText.trim(),
      membership_tier: tier,
      parent_id: replyTo,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCommentText("");
      setReplyTo(null);
      fetchComments(postId);
    }
  };

  const handleReport = async (postId: string, postUserId: string) => {
    if (!user) {
      toast({ title: "Inicia sesión para reportar", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      post_id: postId,
      reported_user_id: postUserId,
      reason: "Contenido inapropiado",
    } as any);
    if (!error) {
      toast({ title: "Reporte enviado", description: "Los administradores lo revisarán" });
    }
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) {
      toast({ title: "Post eliminado" });
      fetchPosts();
    }
  };

  const toggleComments = (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      fetchComments(postId);
    }
  };

  const mockThreads = posts.length > 0 ? [] : [
    { id: "m1", title: "¿Cuál es tu juego retro favorito de todos los tiempos?", user_id: "", upvotes: 182, downvotes: 3, created_at: new Date().toISOString(), is_pinned: false, category },
    { id: "m2", title: "Guía completa para principiantes - Lee esto primero", user_id: "", upvotes: 340, downvotes: 2, created_at: new Date().toISOString(), is_pinned: true, category },
  ];

  const allPosts = [...posts, ...mockThreads];
  const tier = profile?.membership_tier || "novato";
  const commentFeatures = membershipCommentFeatures[tier] || membershipCommentFeatures.novato;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-border rounded p-4">
        <h1 className={cn("font-pixel text-sm mb-1", page.color)}>{page.title}</h1>
        <p className="text-xs text-muted-foreground font-body">{page.description}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant="ghost" size="sm"
            className={cn("text-xs font-body h-7", sortBy === "popular" ? "text-neon-green" : "text-muted-foreground")}
            onClick={() => setSortBy("popular")}
          >
            <Flame className="w-3 h-3 mr-1" /> Populares
          </Button>
          <Button
            variant="ghost" size="sm"
            className={cn("text-xs font-body h-7", sortBy === "new" ? "text-neon-green" : "text-muted-foreground")}
            onClick={() => setSortBy("new")}
          >
            Nuevos
          </Button>
        </div>
        {user && (
          <Button size="sm" className="h-7 text-xs font-body bg-primary text-primary-foreground" onClick={() => setShowNewPost(!showNewPost)}>
            <Plus className="w-3 h-3 mr-1" /> Nuevo Post
          </Button>
        )}
      </div>

      {/* New post form */}
      {showNewPost && (
        <div className="bg-card border border-neon-green/30 rounded p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-[10px] text-neon-green">NUEVO POST</h3>
            <button onClick={() => setShowNewPost(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <Input placeholder="Título del post" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 bg-muted text-sm font-body" />
          <Textarea placeholder="Escribe tu contenido..." value={content} onChange={(e) => setContent(e.target.value)} className="bg-muted text-sm font-body min-h-[80px]" />
          {profile?.membership_tier && profile.membership_tier !== "novato" && (
            <p className="text-[9px] text-muted-foreground font-body italic">
              Tu firma: — {profile.display_name} [{profile.membership_tier.toUpperCase()}]
            </p>
          )}
          <Button size="sm" onClick={handlePost} disabled={posting || !title.trim()} className="text-xs">
            {posting ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {allPosts.map((post) => (
          <div key={post.id}>
            <div
              className={cn(
                "bg-card border rounded p-3 hover:bg-muted/30 transition-all duration-200 group",
                post.is_pinned ? "border-neon-green/30" : "border-border"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-0.5 text-muted-foreground shrink-0">
                  <button onClick={() => handleVote(post.id, "up")}>
                    <ArrowUp className="w-4 h-4 hover:text-primary cursor-pointer transition-colors" />
                  </button>
                  <span className="text-xs font-body font-semibold">{(post.upvotes || 0) - (post.downvotes || 0)}</span>
                  <button onClick={() => handleVote(post.id, "down")}>
                    <ArrowDown className="w-4 h-4 hover:text-destructive cursor-pointer transition-colors" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-body text-foreground group-hover:text-primary transition-colors leading-snug cursor-pointer" onClick={() => toggleComments(post.id)}>
                    {post.is_pinned && <span className="text-neon-green text-[10px] mr-1">📌</span>}
                    {post.title}
                  </p>
                  {post.content && (
                    <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-2">{post.content}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground font-body">
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    <button onClick={() => toggleComments(post.id)} className="flex items-center gap-0.5 hover:text-primary transition-colors">
                      <MessageSquare className="w-3 h-3" /> Comentarios
                    </button>
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
                  <div key={comment.id} className={cn("bg-muted/30 rounded p-2 text-xs font-body", comment.parent_id && "ml-4")}>
                    <p className="text-foreground">{comment.content}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                      {comment.membership_tier !== "novato" && (
                        <span className="text-neon-yellow">[{comment.membership_tier.toUpperCase()}]</span>
                      )}
                      {user && (
                        <button onClick={() => setReplyTo(comment.id)} className="hover:text-primary transition-colors">
                          <Reply className="w-3 h-3 inline mr-0.5" /> Responder
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Comment input */}
                {user ? (
                  <div className="space-y-1">
                    {replyTo && (
                      <div className="flex items-center gap-1 text-[10px] text-neon-cyan font-body">
                        <Reply className="w-3 h-3" /> Respondiendo a comentario
                        <button onClick={() => setReplyTo(null)} className="text-destructive ml-1"><X className="w-3 h-3" /></button>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Input
                        placeholder={`Comentar (${commentFeatures.label}, máx ${commentFeatures.maxLength} chars)...`}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        maxLength={commentFeatures.maxLength}
                        className="h-7 bg-muted text-xs font-body flex-1"
                      />
                      <Button size="sm" onClick={() => handleComment(post.id)} disabled={!commentText.trim()} className="h-7 text-xs px-2">
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground font-body">
                      {commentText.length}/{commentFeatures.maxLength} • Plan: {tier.toUpperCase()}
                    </p>
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground font-body">Inicia sesión para comentar</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
