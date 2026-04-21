import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Heart, MessageSquare, ThumbsUp, ThumbsDown, Share2, 
  Send, CornerDownRight, ImageIcon, PlayCircle, MoreVertical, Ghost 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

interface FeedItem {
  id: string;
  user_id: string;
  created_at: string;
  type: 'photo' | 'video';
  content_url?: string; 
  image_url?: string;   
  title?: string;
  caption?: string;
  platform?: string;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
  reactions_count: { likes: number; dislikes: number };
  user_reaction?: 'like' | 'dislike' | null;
}

export default function FeedPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeComments, setActiveComments] = useState<string | null>(null);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      // 1. Descargamos fotos y videos SIN intentar forzar el Join con profiles
      const [photosRes, socialRes] = await Promise.all([
        supabase.from("photos").select("*").order("created_at", { ascending: false }),
        supabase.from("social_content").select("*").order("created_at", { ascending: false })
      ]);

      if (photosRes.error) console.error("❌ Error cargando fotos:", photosRes.error.message);
      if (socialRes.error) console.error("❌ Error cargando social_content:", socialRes.error.message);

      const normalizedPhotos = (photosRes.data || []).map(p => ({ ...p, type: 'photo' as const }));
      const normalizedSocial = (socialRes.data || []).map(s => ({ ...s, type: 'video' as const }));

      const combined = [...normalizedPhotos, ...normalizedSocial].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (combined.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 2. Extraemos todos los IDs de los autores y descargamos sus perfiles manualmente
      const uniqueUserIds = [...new Set(combined.map(item => item.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", uniqueUserIds);

      // 3. Extraemos todas las reacciones de estos posts manualmente
      const postIds = combined.map(item => item.id);
      const { data: reactionsData } = await supabase
        .from("social_reactions")
        .select("reaction_type, user_id, content_id")
        .in("content_id", postIds);

      // 4. Unimos todo con JavaScript (A prueba de balas)
      const feedWithData = combined.map((item) => {
        const authorProfile = profilesData?.find(p => p.user_id === item.user_id) || { display_name: "Usuario Desconocido", avatar_url: null };
        const itemReactions = reactionsData?.filter(r => r.content_id === item.id) || [];
        
        return {
          ...item,
          profiles: authorProfile,
          reactions_count: {
            likes: itemReactions.filter(r => r.reaction_type === 'like').length,
            dislikes: itemReactions.filter(r => r.reaction_type === 'dislike').length
          },
          user_reaction: itemReactions.find(r => r.user_id === user?.id)?.reaction_type || null
        };
      });

      setItems(feedWithData as any);
    } catch (error) {
      console.error("❌ Error crítico en Feed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeed(); }, [user?.id]);

  const handleReaction = async (itemId: string, type: 'like' | 'dislike') => {
    if (!user) return toast({ title: "Inicia sesión", variant: "destructive" });

    const item = items.find(i => i.id === itemId);
    const existingReaction = item?.user_reaction;

    try {
      if (existingReaction === type) {
        await supabase.from("social_reactions").delete().eq("content_id", itemId).eq("user_id", user.id);
      } else {
        await supabase.from("social_reactions").upsert({
          content_id: itemId,
          user_id: user.id,
          reaction_type: type
        } as any);
      }
      fetchFeed(); 
    } catch (error) {
      toast({ title: "Error en reacción", variant: "destructive" });
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse font-pixel text-neon-cyan text-xs uppercase tracking-widest">Cargando Super Muro...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-fade-in">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
        <PlayCircle className="w-5 h-5 text-neon-cyan" />
        <h1 className="font-pixel text-sm text-foreground">FEED GLOBAL</h1>
      </div>

      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
          <Ghost className="w-16 h-16 text-muted-foreground animate-bounce" />
          <div>
            <p className="font-pixel text-xs text-muted-foreground uppercase">El muro está vacío</p>
            <p className="font-body text-[10px] text-muted-foreground/70 mt-1">Sé el primero en publicar una foto o video.</p>
          </div>
        </div>
      )}

      {items.map((item) => (
        <div key={item.id} className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-2xl">
          {/* Header del Post */}
          <div className="p-4 flex items-center justify-between">
            <Link to={`/usuario/${item.user_id}`} className="flex items-center gap-3 group">
              <Avatar className="w-9 h-9 border border-neon-cyan/30">
                <AvatarImage src={item.profiles.avatar_url || ""} />
                <AvatarFallback className="bg-muted font-pixel text-[10px]">?</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-neon-cyan transition-colors">
                  {item.profiles.display_name}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                  {new Date(item.created_at).toLocaleDateString()} • {item.type}
                </p>
              </div>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreVertical className="w-4 h-4" /></Button>
          </div>

          {/* Contenido Visual */}
          <div className="relative bg-black min-h-[300px] flex items-center justify-center">
            {item.type === 'photo' ? (
              <img src={item.image_url} alt="" className="max-w-full max-h-[600px] object-contain" />
            ) : (
              <VideoPlayer url={item.content_url || ""} />
            )}
          </div>

          {/* Info del Post */}
          <div className="p-4">
            <h3 className="font-bold text-sm text-neon-cyan mb-1">{item.title || item.caption}</h3>
            
            {/* Botones de Acción */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
              <button 
                onClick={() => handleReaction(item.id, 'like')}
                className={cn("flex items-center gap-1.5 text-xs font-body transition-all hover:scale-110", item.user_reaction === 'like' ? "text-neon-green" : "text-muted-foreground")}
              >
                <ThumbsUp className={cn("w-4 h-4", item.user_reaction === 'like' && "fill-current")} />
                {item.reactions_count.likes}
              </button>

              <button 
                onClick={() => handleReaction(item.id, 'dislike')}
                className={cn("flex items-center gap-1.5 text-xs font-body transition-all hover:scale-110", item.user_reaction === 'dislike' ? "text-destructive" : "text-muted-foreground")}
              >
                <ThumbsDown className={cn("w-4 h-4", item.user_reaction === 'dislike' && "fill-current")} />
                {item.reactions_count.dislikes}
              </button>

              <button 
                onClick={() => setActiveComments(activeComments === item.id ? null : item.id)}
                className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-neon-cyan"
              >
                <MessageSquare className="w-4 h-4" />
                Comentar
              </button>

              <div className="flex-1" />
              
              <button className="text-muted-foreground hover:text-white"><Share2 className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Sección de Comentarios */}
          {activeComments === item.id && (
            <div className="bg-muted/30 border-t border-white/5 p-4 animate-slide-down">
              <CommentsSection contentId={item.id} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VideoPlayer({ url }: { url: string }) {
  const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");
  const isInstagram = url.includes("instagram.com");

  if (isYoutube) {
    const videoId = url.split("v=")[1] || url.split("/").pop();
    return (
      <iframe 
        className="w-full aspect-video border-0"
        src={`https://www.youtube.com/embed/${videoId}`}
        allowFullScreen
      />
    );
  }

  if (isInstagram) {
    return (
      <div className="w-full p-10 text-center flex flex-col items-center gap-3">
        <PlayCircle className="w-12 h-12 text-neon-magenta animate-pulse" />
        <a href={url} target="_blank" rel="noreferrer" className="text-xs text-neon-cyan underline font-pixel">
          VER REEL EN INSTAGRAM
        </a>
      </div>
    );
  }

  return (
    <div className="text-[10px] font-pixel text-muted-foreground">
      REPRODUCTOR NO SOPORTADO
    </div>
  );
}

function CommentsSection({ contentId }: { contentId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{id: string, name: string} | null>(null);

  const fetchComments = async () => {
    // Descargamos comentarios crudos
    const { data: rawComments, error } = await supabase
      .from("social_comments")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error cargando comentarios:", error);
      return;
    }

    if (rawComments && rawComments.length > 0) {
      // Unimos con los perfiles manualmente
      const userIds = [...new Set(rawComments.map(c => c.user_id))];
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);

      const mergedComments = rawComments.map(c => ({
        ...c,
        profiles: profs?.find(p => p.user_id === c.user_id) || { display_name: "Usuario", avatar_url: null }
      }));
      setComments(mergedComments);
    } else {
      setComments([]);
    }
  };

  useEffect(() => { fetchComments(); }, [contentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    const { error } = await supabase.from("social_comments").insert({
      content_id: contentId,
      user_id: user.id,
      comment_text: replyTo ? `@${replyTo.name} ${newComment}` : newComment,
      parent_id: replyTo?.id || null
    } as any);

    if (!error) {
      setNewComment("");
      setReplyTo(null);
      fetchComments();
    }
  };

  return (
    <div className="space-y-4">
      <div className="max-h-60 overflow-y-auto space-y-3 pr-2 retro-scrollbar">
        {comments.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body opacity-50 text-center py-2">Sé el primero en comentar.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className={cn("flex gap-2", c.parent_id && "ml-6 border-l border-white/10 pl-3")}>
              <Avatar className="w-6 h-6 border border-white/10">
                <AvatarImage src={c.profiles.avatar_url} />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-white/5 rounded-lg p-2">
                  <p className="text-[10px] font-bold text-neon-cyan">{c.profiles.display_name}</p>
                  <p className="text-xs text-foreground font-body">{c.comment_text}</p>
                </div>
                <button 
                  onClick={() => setReplyTo({ id: c.id, name: c.profiles.display_name })}
                  className="text-[9px] text-muted-foreground mt-1 hover:text-white uppercase font-pixel"
                >
                  Responder
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        {replyTo && (
          <div className="flex items-center justify-between bg-neon-cyan/10 px-2 py-1 rounded-t border-t border-x border-neon-cyan/30">
            <span className="text-[9px] text-neon-cyan font-pixel">Respondiendo a {replyTo.name}</span>
            <button onClick={() => setReplyTo(null)} className="text-[9px] text-white">×</button>
          </div>
        )}
        <div className="flex gap-2">
          <Input 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario..."
            className="h-9 bg-black/40 border-white/10 text-xs font-body"
          />
          <Button type="submit" size="icon" className="h-9 w-9 bg-neon-cyan text-black shrink-0 hover:bg-neon-cyan/80">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}