import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Flame, MessageSquare, ArrowUp, ArrowDown, Plus, Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

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

export default function ForumPage() {
  const location = useLocation();
  const page = pageTitles[location.pathname] || { title: "PÁGINA", description: "Sección del foro", color: "text-foreground" };
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [showNewPost, setShowNewPost] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);

  const category = location.pathname.replace(/^\//, "").replace(/\//g, "-") || "general";

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("category", category)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setPosts(data);
  };

  useEffect(() => {
    fetchPosts();
    const channel = supabase.channel(`posts-${category}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [category]);

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
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reporte enviado", description: "Los administradores lo revisarán" });
    }
  };

  // Mix DB posts with placeholder mock posts if empty
  const mockThreads = posts.length > 0 ? [] : [
    { id: "m1", title: "¿Cuál es tu juego retro favorito de todos los tiempos?", user_id: "", upvotes: 182, downvotes: 3, created_at: new Date().toISOString(), is_pinned: false, category },
    { id: "m2", title: "Guía completa para principiantes - Lee esto primero", user_id: "", upvotes: 340, downvotes: 2, created_at: new Date().toISOString(), is_pinned: true, category },
    { id: "m3", title: "Nuevo miembro aquí, ¡saludos!", user_id: "", upvotes: 42, downvotes: 0, created_at: new Date().toISOString(), is_pinned: false, category },
  ];

  const allPosts = [...posts, ...mockThreads];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-border rounded p-4">
        <h1 className={cn("font-pixel text-sm mb-1", page.color)}>{page.title}</h1>
        <p className="text-xs text-muted-foreground font-body">{page.description}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs font-body h-7 text-neon-green">
            <Flame className="w-3 h-3 mr-1" /> Populares
          </Button>
          <Button variant="ghost" size="sm" className="text-xs font-body h-7 text-muted-foreground">
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
          <div
            key={post.id}
            className={cn(
              "bg-card border rounded p-3 hover:bg-muted/30 transition-all duration-200 cursor-pointer group",
              post.is_pinned ? "border-neon-green/30" : "border-border"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-0.5 text-muted-foreground shrink-0">
                <ArrowUp className="w-4 h-4 hover:text-primary cursor-pointer transition-colors" />
                <span className="text-xs font-body font-semibold">{(post.upvotes || 0) - (post.downvotes || 0)}</span>
                <ArrowDown className="w-4 h-4 hover:text-destructive cursor-pointer transition-colors" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-body text-foreground group-hover:text-primary transition-colors leading-snug">
                  {post.is_pinned && <span className="text-neon-green text-[10px] mr-1">📌</span>}
                  {post.title}
                </p>
                {post.content && (
                  <p className="text-xs text-muted-foreground font-body mt-1 line-clamp-2">{post.content}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-body">
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  {post.user_id && (
                    <button onClick={() => handleReport(post.id, post.user_id)} className="flex items-center gap-0.5 hover:text-destructive transition-colors ml-auto">
                      <Flag className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {(post as any).signature && (
                  <p className="text-[9px] text-neon-yellow font-body mt-1 italic">{(post as any).signature}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
