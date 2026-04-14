import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Flame, MessageSquare, ArrowUp, ArrowDown, Plus, Flag, X, Send, Reply, Image, Video, Bold, Italic, Link2, Smile, Type, User, Edit2, Check, Maximize2, Download } from "lucide-react";
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
  "/gaming-anime/gaming": { title: "GAMING", description: "Debates, noticias y todo sobre videojuegos", color: "text-neon-green" },
  "/gaming-anime/creador": { title: "RINCÓN DEL CREADOR", description: "Comparte tu Fanart, Cosplays y proyectos creativos", color: "text-neon-cyan" },
  "/motociclismo": { title: "MOTOCICLISMO", description: "Riders, mecánica, rutas y quedadas", color: "text-neon-magenta" },
  "/motociclismo/riders": { title: "FORO DE RIDERS", description: "Discusiones sobre marcas, estilos y noticias motor", color: "text-neon-magenta" },
  "/motociclismo/taller": { title: "TALLER & MECÁNICA", description: "Tutoriales, manuales y consejos que ofrezcan", color: "text-neon-magenta" },
  "/motociclismo/rutas": { title: "RUTAS & QUEDADAS", description: "Organiza viajes grupales y comparte rutas", color: "text-neon-magenta" },
  "/mercado": { title: "MERCADO & TRUEQUE", description: "Compra, vende e intercambia", color: "text-neon-yellow" },
  "/mercado/gaming": { title: "MERCADO GAMING", description: "Consolas retro, cartuchos y accesorios", color: "text-neon-yellow" },
  "/mercado/motor": { title: "MERCADO BIKERS", description: "Repuestos, cascos, chaquetas y motos", color: "text-neon-yellow" },
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

function MediaModalForum({ src, type, onClose }: { src: string; type: "image" | "video"; onClose: () => void }) {
  const isImage = type === "image";
  return (
    <div className="fixed inset-0 z-[500] bg-background/90 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end mb-2 gap-2 w-full">
          {isImage && (
            <a href={src} download target="_blank" rel="noopener" className="p-1.5 rounded bg-muted hover:bg-muted/80 transition-colors" title="Descargar">
              <Download className="w-4 h-4 text-foreground" />
            </a>
          )}
          <button onClick={onClose} className="p-1.5 rounded bg-muted hover:bg-muted/80 transition-colors">
            <X className="w-4 h-4 text-foreground" />
          </button>
        </div>
        <div className="bg-card border border-border rounded overflow-hidden w-full">
          {type === "video" ? (
            <div className="aspect-video"><iframe src={src} className="w-full h-full" allowFullScreen /></div>
          ) : (
            <img src={src} alt="" className="w-full max-h-[80vh] object-contain" />
          )}
        </div>
      </div>
    </div>
  );
}

let _setForumModal: ((v: { src: string; type: "image" | "video" } | null) => void) | null = null;

function renderContent(content: string) {
  if (!content) return null;
  const parts = content.split(/(\!\[.*?\]\(.*?\)|https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+|https?:\/\/(?:www\.)?youtu\.be\/[\w-]+|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    const imgMatch = part.match(/^\!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) return (
      <div key={i} className="relative group mt-2 mb-1">
        <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full max-h-64 object-cover rounded border border-border" loading="lazy" />
        <button onClick={() => _setForumModal?.({ src: imgMatch[2], type: "image" })} className="absolute top-1 right-1 p-1 rounded bg-background/70 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity" title="Maximizar">
          <Maximize2 className="w-3 h-3 text-foreground" />
        </button>
      </div>
    );
    const ytMatch = part.match(/youtube\.com\/watch\?v=([\w-]+)/) || part.match(/youtu\.be\/([\w-]+)/);
    if (ytMatch) {
      const embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
      return (
        <div key={i} className="relative w-full aspect-video mt-2 mb-1 rounded overflow-hidden border border-border group">
          <iframe src={embedSrc} className="w-full h-full" allowFullScreen title="Video" />
          <button onClick={() => _setForumModal?.({ src: embedSrc, type: "video" })} className="absolute top-1 right-1 p-1 rounded bg-background/70 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity" title="Maximizar">
            <Maximize2 className="w-3 h-3 text-foreground" />
          </button>
        </div>
      );
    }
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      const isMedia = /\.(jpg|jpeg|png|gif|webp|mp4|webm)(\?.*)?$/i.test(part);
      if (isMedia && /\.(mp4|webm)(\?.*)?$/i.test(part)) {
        return (
          <div key={i} className="relative group mt-2 mb-1">
            <video src={part} controls className="w-full max-h-64 rounded border border-border" />
            <button onClick={() => _setForumModal?.({ src: part, type: "video" })} className="absolute top-1 right-1 p-1 rounded bg-background/70 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity" title="Maximizar">
              <Maximize2 className="w-3 h-3 text-foreground" />
            </button>
          </div>
        );
      }
      if (isMedia) {
        return (
          <div key={i} className="relative group mt-2 mb-1">
            <img src={part} alt="" className="w-full max-h-64 object-cover rounded border border-border" loading="lazy" />
            <button onClick={() => _setForumModal?.({ src: part, type: "image" })} className="absolute top-1 right-1 p-1 rounded bg-background/70 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity" title="Maximizar">
              <Maximize2 className="w-3 h-3 text-foreground" />
            </button>
          </div>
        );
      }
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a>;
    }
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
  profile?: { display_name: string; avatar_url: string | null; role_icon: string | null; show_role_icon: boolean; membership_tier?: string; color_avatar_border?: string | null; color_name?: string | null; color_role?: string | null; color_staff_role?: string | null } | null;
  roles?: string[];
}

interface PostProfile {
  display_name: string;
  avatar_url: string | null;
  role_icon: string | null;
  show_role_icon: boolean;
  membership_tier: string;
  color_avatar_border: string | null;
  color_name: string | null;
  color_role: string | null;
  color_staff_role: string | null;
  signature_font: string | null;
  signature_color: string | null;
  signature_image_url: string | null;
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
  const [forumModal, setForumModal] = useState<{ src: string; type: "image" | "video" } | null>(null);
  _setForumModal = setForumModal;
  const [postProfiles, setPostProfiles] = useState<Record<string, PostProfile>>({});
  const [postRoles, setPostRoles] = useState<Record<string, string[]>>({});
  // Track user's own votes for optimistic UI
  const [userVotes, setUserVotes] = useState<Record<string, string | null>>({});

  const category = location.pathname.replace(/^\//, "").replace(/\//g, "-") || "general";
  const hasUnlimited = isAdmin || isMasterWeb;

  // Handle URL search param for direct post link
  const searchParams = new URLSearchParams(location.search);
  const directPostId = searchParams.get("post");

  const fetchPosts = async () => {
    const query = supabase.from("posts").select("*").eq("category", category).order("is_pinned", { ascending: false });
    if (sortBy === "popular") query.order("upvotes", { ascending: false });
    else query.order("created_at", { ascending: false });
    const { data } = await query.limit(20);
    if (data) {
      setPosts(data);
      const userIds = [...new Set((data as any[]).map(p => p.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, role_icon, show_role_icon, membership_tier, color_avatar_border, color_name, color_role, color_staff_role, signature_font, signature_color, signature_image_url").in("user_id", userIds);
        const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
        const pMap: Record<string, PostProfile> = {};
        profiles?.forEach(p => pMap[p.user_id] = p as unknown as PostProfile);
        const rMap: Record<string, string[]> = {};
        roles?.forEach((r: any) => { if (!rMap[r.user_id]) rMap[r.user_id] = []; rMap[r.user_id].push(r.role); });
        setPostProfiles(pMap);
        setPostRoles(rMap);
      }
      // Fetch user's existing votes
      if (user && data.length > 0) {
        const postIds = data.map((p: any) => p.id);
        const { data: votes } = await supabase.from("post_votes").select("post_id, vote_type").eq("user_id", user.id).in("post_id", postIds);
        const vMap: Record<string, string | null> = {};
        votes?.forEach((v: any) => { vMap[v.post_id] = v.vote_type; });
        setUserVotes(vMap);
      }
    }
  };

  const fetchComments = async (postId: string) => {
    const { data } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (!data) return;
    const userIds = [...new Set((data as any[]).map(c => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, role_icon, show_role_icon, membership_tier, color_avatar_border, color_name, color_role, color_staff_role").in("user_id", userIds);
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
    // DO NOT subscribe to realtime on posts table — it causes vote counter bouncing
    // because each vote triggers an UPDATE event that refetches stale data during optimistic updates
  }, [category, sortBy]);

  // Auto-expand direct linked post
  useEffect(() => {
    if (directPostId && posts.length > 0) {
      setExpandedPost(directPostId);
      fetchComments(directPostId);
    }
  }, [directPostId, posts]);

  const handleNewPostClick = () => {
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

  const votingRef = useRef<Record<string, boolean>>({});

  const handleVote = async (postId: string, voteType: "up" | "down") => {
    if (!user) { toast({ title: "Inicia sesión para votar", variant: "destructive" }); return; }
    if (votingRef.current[postId]) return;
    votingRef.current[postId] = true;

    // Optimistic update
    const currentVote = userVotes[postId] || null;
    const post = posts.find(p => p.id === postId);
    if (!post) { votingRef.current[postId] = false; return; }

    let newUp = post.upvotes || 0;
    let newDown = post.downvotes || 0;
    let newVote: string | null;

    if (currentVote === voteType) {
      // Remove vote
      if (voteType === "up") newUp--;
      else newDown--;
      newVote = null;
    } else if (currentVote) {
      // Switch vote
      if (currentVote === "up") { newUp--; newDown++; }
      else { newDown--; newUp++; }
      newVote = voteType;
    } else {
      // New vote
      if (voteType === "up") newUp++;
      else newDown++;
      newVote = voteType;
    }

    // Apply optimistic
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: Math.max(0, newUp), downvotes: Math.max(0, newDown) } : p));
    setUserVotes(prev => ({ ...prev, [postId]: newVote }));

    try {
      const { data, error } = await supabase.rpc("toggle_post_vote", {
        p_post_id: postId,
        p_user_id: user.id,
        p_vote_type: voteType,
      });
      if (error) throw error;
      // Apply server truth
      if (data) {
        const result = data as any;
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: result.upvotes, downvotes: result.downvotes } : p));
        setUserVotes(prev => ({ ...prev, [postId]: result.user_vote }));
      }
    } catch {
      // Revert optimistic
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: post.upvotes, downvotes: post.downvotes } : p));
      setUserVotes(prev => ({ ...prev, [postId]: currentVote }));
    } finally {
      votingRef.current[postId] = false;
    }
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
          <Button size="sm" className="h-7 text-xs font-body bg-primary text-primary-foreground" onClick={handleNewPostClick}>
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
          <Textarea id="post-content-area" placeholder="Escribe tu contenido..." value={content} onChange={(e) => setContent(e.target.value)} className="bg-muted text-sm font-body min-h-[80px]" />
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => setContent(prev => prev + "![descripción](URL_de_imagen)")} className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors border border-border" title="Insertar imagen">
              <Image className="w-3 h-3" /> Imagen
            </button>
            <button onClick={() => setContent(prev => prev + "https://youtube.com/watch?v=")} className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors border border-border" title="Insertar video">
              <Video className="w-3 h-3" /> Video
            </button>
            <button onClick={() => setContent(prev => prev + "**texto**")} className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors border border-border" title="Negrita">
              <Bold className="w-3 h-3" /> Negrita
            </button>
            <button onClick={() => setContent(prev => prev + "[texto](URL)")} className="flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/80 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors border border-border" title="Enlace">
              <Link2 className="w-3 h-3" /> Enlace
            </button>
          </div>
          <div className="bg-muted/50 rounded p-2 text-[9px] text-muted-foreground font-body space-y-0.5 border border-border/50">
            <p className="flex items-center gap-1"><Image className="w-3 h-3" /> <strong>Imágenes:</strong> <code className="bg-muted px-0.5 rounded">![descripción](URL_de_imagen)</code></p>
            <p className="flex items-center gap-1"><Video className="w-3 h-3" /> <strong>Videos:</strong> Pega un enlace de YouTube directamente</p>
          </div>
          {((profile?.membership_tier && profile.membership_tier !== "novato") || hasUnlimited) ? (
            <p className="text-[9px] text-muted-foreground font-body italic">
              Tu firma: {(profile as any)?.signature || `— ${profile?.display_name} [${hasUnlimited ? (isMasterWeb ? "MASTER WEB" : "ADMIN") : profile?.membership_tier?.toUpperCase()}]`}
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
          const myVote = userVotes[post.id] || null;

          return (
            <div key={post.id}>
              <div className={cn("bg-card border rounded p-3 hover:bg-muted/30 transition-all duration-200 group", post.is_pinned ? "border-neon-green/30" : "border-border")}>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => handleVote(post.id, "up")}
                      className={cn("transition-colors", myVote === "up" ? "text-primary" : "text-muted-foreground hover:text-primary")}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-body font-semibold text-foreground">{(post.upvotes || 0) - (post.downvotes || 0)}</span>
                    <button
                      onClick={() => handleVote(post.id, "down")}
                      className={cn("transition-colors", myVote === "down" ? "text-destructive" : "text-muted-foreground hover:text-destructive")}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
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
                          colorAvatarBorder={authorProfile.color_avatar_border}
                          colorName={authorProfile.color_name}
                          colorRole={authorProfile.color_role}
                          colorStaffRole={authorProfile.color_staff_role}
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
                      <span>{new Date(post.created_at).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
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
                      <div className="mt-1">
                        <p className="text-[9px] font-body"
                          style={{
                            color: postProfiles[post.user_id]?.color_staff_role || '#facc15',
                            fontWeight: ['bold', 'bold-italic'].includes((postProfiles[post.user_id] as any)?.signature_font) ? 'bold' : 'normal',
                            fontStyle: ['italic', 'bold-italic'].includes((postProfiles[post.user_id] as any)?.signature_font) ? 'italic' : 'normal',
                          }}>
                          {(post as any).signature}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition-all text-[11px] font-body font-medium"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Comentar {(comments[post.id]?.length || 0) > 0 ? `(${comments[post.id].length})` : ""}
                    </button>
                  </div>
                </div>
              </div>

              {/* Comments section */}
              {expandedPost === post.id && (
                <div className="ml-4 border-l-2 border-border pl-3 mt-1 space-y-2 animate-fade-in">
                  {(comments[post.id] || []).map((comment) => (
                    <div key={comment.id} className={cn("bg-muted/30 rounded p-3 text-xs font-body", comment.parent_id && "ml-4")}>
                      <div className="flex items-start gap-2">
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
                              colorAvatarBorder={comment.profile?.color_avatar_border}
                              colorName={comment.profile?.color_name}
                              colorRole={comment.profile?.color_role}
                              colorStaffRole={comment.profile?.color_staff_role}
                            />
                            <span className="text-[9px] text-muted-foreground">{new Date(comment.created_at).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
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

      {/* Rules popup — centered */}
      {showRulesPopup && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRulesPopup(false)} />
          <div className="relative bg-card border border-neon-green/30 rounded-lg p-5 max-w-md w-full animate-scale-in space-y-4 max-h-[80vh] overflow-y-auto retro-scrollbar m-auto">
            <button onClick={() => setShowRulesPopup(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-pixel text-[11px] text-neon-green text-center">📜 REGLAS DE CONVIVENCIA</h3>
            <div className="text-xs font-body text-muted-foreground space-y-2">
              <p>Antes de publicar, acepta las reglas de la comunidad:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Respeto:</strong> Trata a todos con respeto. No se toleran insultos, acoso ni discriminación.</li>
                <li><strong>No spam:</strong> No publiques contenido repetitivo o publicidad no autorizada.</li>
                <li><strong>Contenido apropiado:</strong> No publiques contenido explícito, violento o ilegal.</li>
                <li><strong>Sin spoilers:</strong> Usa advertencias de spoiler en títulos cuando sea necesario.</li>
                <li><strong>Publica en la categoría correcta:</strong> Asegúrate de que tu post esté en la sección adecuada.</li>
                <li><strong>No doxxing:</strong> No compartas información personal de otros sin su consentimiento.</li>
                <li><strong>Reporta:</strong> Si ves contenido inapropiado, usa el botón de reportar.</li>
              </ul>
              <p className="text-[10px] italic">El incumplimiento puede resultar en suspensión temporal o permanente.</p>
            </div>
            <Button size="sm" onClick={acceptRules} className="w-full text-xs">
              Acepto las reglas — Continuar
            </Button>
          </div>
        </div>
      )}

      {forumModal && <MediaModalForum src={forumModal.src} type={forumModal.type} onClose={() => setForumModal(null)} />}
    </div>
  );
}
