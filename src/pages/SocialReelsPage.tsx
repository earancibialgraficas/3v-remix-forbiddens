import { useState, useEffect, useRef } from "react";
import { Instagram, Youtube, Music2, Globe, ExternalLink, Video, Image as ImageIcon, X, Users, ThumbsUp, ThumbsDown, Flag, MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useFriendIds } from "@/hooks/useFriendIds";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { getAvatarBorderStyle, getNameStyle } from "@/lib/profileAppearance";
import { useToast } from "@/hooks/use-toast";
import ReportModal from "@/components/ReportModal";

interface SocialItem {
  id: string;
  user_id: string;
  platform: string;
  content_url: string;
  content_type: string;
  title: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  created_at: string;
  likes: number;
  dislikes: number;
  display_name?: string;
  avatar_url?: string | null;
  color_name?: string | null;
  color_avatar_border?: string | null;
}

interface SocialComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string | null;
}

const getEmbedUrl = (url: string, platform: string) => {
  if (platform === "youtube") {
    const shortMatch = url.match(/youtube\.com\/shorts\/([\w-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  if (platform === "instagram") {
    const igMatch = url.match(/instagram\.com\/(p|reel|reels)\/([\w-]+)/);
    if (igMatch) return `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed/?hidecaption=true`;
  }
  if (platform === "tiktok") {
    const tkMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    if (tkMatch) return `https://www.tiktok.com/embed/v2/${tkMatch[1]}`;
    const tkMatch2 = url.match(/tiktok\.com\/.*?video\/(\d+)/);
    if (tkMatch2) return `https://www.tiktok.com/embed/v2/${tkMatch2[1]}`;
  }
  return null;
};

// 🔥 FIX FILTROS ESTRICTOS: Solo los /reel/ de instagram son video.
const isVideoItem = (item: SocialItem | any) => {
  const p = item.platform || '';
  const url = item.content_url || '';
  const cType = item.content_type || '';

  if (cType === 'video' || cType === 'reel') return true;
  if (p === 'youtube' || p === 'tiktok') return true;
  if (p === 'instagram' && (url.includes('/reel/') || url.includes('/reels/'))) return true;
  if (url.includes('shorts')) return true;

  return false;
};

const isReelItem = (item: SocialItem) => {
  return item.content_type === 'reel' ||
    item.content_url.includes("shorts") || item.content_url.includes("reel") ||
    item.platform === "tiktok";
};

const isHorizontalVideo = (item: SocialItem) => {
  return isVideoItem(item) && !isReelItem(item);
};

const isImageItem = (item: SocialItem) => {
  return !isVideoItem(item);
};

function SnapCard({ 
  item, 
  isVisible, 
  onPauseMusic, 
  isStaff,
  onDeletePost
}: { 
  item: SocialItem; 
  isVisible: boolean; 
  onPauseMusic: () => void;
  isStaff: boolean;
  onDeletePost: (id: string) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const embedUrl = getEmbedUrl(item.content_url, item.platform);
  const isVideo = isVideoItem(item);
  const [likes, setLikes] = useState(item.likes || 0);
  const [dislikes, setDislikes] = useState(item.dislikes || 0);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showReport, setShowReport] = useState(false);
  
  const votingRef = useRef(false);

  useEffect(() => {
    if (isVisible && isVideo) onPauseMusic();
  }, [isVisible, isVideo]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("social_reactions")
      .select("reaction_type")
      .eq("user_id", user.id)
      .eq("target_type", "social_content")
      .eq("target_id", item.id)
      .maybeSingle()
      .then(({ data }) => { 
        if (data) setUserReaction(data.reaction_type); 
      });
  }, [user, item.id]);

  useEffect(() => {
    const fetchComments = async () => {
      const { data } = await supabase
        .from("social_comments")
        .select("*")
        .eq("content_id", item.id)
        .order("created_at", { ascending: true })
        .limit(50);
        
      if (!data || data.length === 0) { 
        setComments([]); 
        return; 
      }
      
      const uids = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", uids);
        
      const pMap = new Map<string, any>(profiles?.map(p => [p.user_id, p]) || []);
      
      setComments(data.map(c => {
        const p = pMap.get(c.user_id);
        return { 
          ...c, 
          display_name: p?.display_name || "Anónimo", 
          avatar_url: p?.avatar_url 
        };
      }));
    };
    fetchComments();
  }, [item.id]);

  const handleReaction = async (type: "like" | "dislike") => {
    if (!user) { 
      toast({ title: "Inicia sesión", variant: "destructive" }); 
      return; 
    }
    
    if (votingRef.current) return;
    votingRef.current = true;

    const prevLikes = likes;
    const prevDislikes = dislikes;
    const prevReaction = userReaction;

    let newLikes = likes;
    let newDislikes = dislikes;

    if (userReaction === type) {
      setUserReaction(null);
      if (type === "like") newLikes--; else newDislikes--;
    } else {
      setUserReaction(type);
      if (type === "like") { newLikes++; if (userReaction === "dislike") newDislikes--; } 
      else { newDislikes++; if (userReaction === "like") newLikes--; }
    }

    setLikes(Math.max(0, newLikes));
    setDislikes(Math.max(0, newDislikes));
    
    try {
      const { data: existingReaction, error: fetchErr } = await supabase
        .from("social_reactions")
        .select("id, reaction_type")
        .eq("user_id", user.id)
        .eq("target_id", item.id)
        .maybeSingle();

      if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

      if (existingReaction) {
        if (existingReaction.reaction_type === type) {
          await supabase.from("social_reactions").delete().eq("id", existingReaction.id);
        } else {
          await supabase.from("social_reactions").update({ reaction_type: type }).eq("id", existingReaction.id);
        }
      } else {
        await supabase.from("social_reactions").insert({
          user_id: user.id, target_id: item.id, target_type: "social_content", reaction_type: type
        });
      }

      await supabase.from("social_content").update({ likes: Math.max(0, newLikes), dislikes: Math.max(0, newDislikes) }).eq("id", item.id);
      
    } catch (e: any) {
      toast({ title: "Error", description: "No se pudo procesar tu voto", variant: "destructive" });
      setLikes(prevLikes);
      setDislikes(prevDislikes);
      setUserReaction(prevReaction);
    } finally {
      votingRef.current = false;
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    try {
      const { error } = await supabase.from("social_comments").insert({ 
        user_id: user.id, content_id: item.id, content: commentText.trim() 
      });
      if (error) throw error;
      setCommentText("");
      
      const { data } = await supabase.from("social_comments").select("*").eq("content_id", item.id).order("created_at", { ascending: true });
      if (data) {
        const uids = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uids);
        const pMap = new Map<string, any>(profiles?.map(p => [p.user_id, p]) || []);
        setComments(data.map(c => {
          const p = pMap.get(c.user_id);
          return { ...c, display_name: p?.display_name || "Anónimo", avatar_url: p?.avatar_url };
        }));
      }
    } catch (e: any) {
      toast({ title: "Error", description: "No se pudo publicar tu comentario.", variant: "destructive" });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este comentario?")) return;
    try {
      await supabase.from("social_comments").delete().eq("id", commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast({ title: "Comentario eliminado" });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  return (
    // 🔥 FIX ESPACIOS: Ajustamos el contenedor principal para que no tenga espacio negro sobrante en pantallas normales
    <div className="snap-start w-full flex-shrink-0 flex items-stretch gap-3 px-2 h-[85vh] min-h-[400px] max-h-[850px] py-2">
      <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col shadow-sm">
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden p-0 md:p-2">
          {isVideo && embedUrl ? (
            <iframe 
              src={isVisible ? `${embedUrl}?autoplay=1&mute=0` : embedUrl} 
              className={cn("w-full h-full rounded max-w-[500px]", item.platform === 'tiktok' ? "aspect-[9/16]" : "")} 
              allowFullScreen 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            />
          ) : item.thumbnail_url || isImageItem(item) ? (
            <img src={item.thumbnail_url || item.content_url} alt="" className="w-full h-full object-contain max-h-full" />
          ) : embedUrl ? (
            <iframe 
              src={embedUrl} 
              className="w-full h-full max-w-[500px] rounded bg-white" 
              allowFullScreen 
            />
          ) : (
            <a href={item.content_url} target="_blank" rel="noopener" className="text-primary text-xs font-body hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Ver original en {item.platform}
            </a>
          )}
        </div>
        
        <div className="p-3 border-t border-border shrink-0 bg-card">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-muted border border-border shrink-0 overflow-hidden" style={getAvatarBorderStyle(item.color_avatar_border)}>
              {item.avatar_url ? <img src={item.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[8px] flex items-center justify-center h-full">👤</span>}
            </div>
            <Link to={`/usuario/${item.user_id}`} className="text-[10px] font-body font-medium text-foreground hover:text-primary" style={getNameStyle(item.color_name)}>{item.display_name}</Link>
            <span className="text-[9px] text-muted-foreground font-body ml-auto">{item.platform}</span>
          </div>
          <p className="text-[10px] font-body text-foreground truncate">{item.title || "Sin título"}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <button onClick={() => handleReaction("like")} className={cn("flex items-center gap-0.5 text-[10px] font-body transition-colors", userReaction === "like" ? "text-neon-green" : "text-muted-foreground hover:text-neon-green")}>
              <ThumbsUp className="w-3 h-3" /> {likes}
            </button>
            <button onClick={() => handleReaction("dislike")} className={cn("flex items-center gap-0.5 text-[10px] font-body transition-colors", userReaction === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-destructive")}>
              <ThumbsDown className="w-3 h-3" /> {dislikes}
            </button>
            <div className="flex gap-2 ml-auto">
              {user && (
                <button onClick={() => setShowReport(true)} className="text-muted-foreground hover:text-destructive text-[10px] transition-colors" title="Reportar">
                  <Flag className="w-3 h-3" />
                </button>
              )}
              {isStaff && (
                <button onClick={() => onDeletePost(item.id)} className="text-muted-foreground hover:text-destructive text-[10px] transition-colors" title="Eliminar (Staff)">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-64 hidden md:flex flex-col bg-card border border-border rounded-lg overflow-hidden shrink-0 shadow-sm">
        <div className="px-3 py-2 border-b border-border text-[10px] font-pixel text-neon-cyan flex items-center gap-1 shrink-0">
          <MessageSquare className="w-3 h-3" /> COMENTARIOS ({comments.length})
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-3" style={{ scrollbarWidth: 'none' }}>
          {comments.map(c => (
            <div key={c.id} className="group text-[10px] font-body flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="text-primary font-medium">{c.display_name}: </span>
                <span className="text-foreground">{c.content}</span>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => setShowReport(true)} className="text-muted-foreground hover:text-destructive" title="Reportar">
                   <Flag className="w-3 h-3" />
                </button>
                {isStaff && (
                  <button onClick={() => handleDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive" title="Eliminar (Staff)">
                     <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-[10px] text-muted-foreground font-body text-center py-4">Sin comentarios</p>}
        </div>
        {user && (
          <div className="p-2 border-t border-border flex gap-1 shrink-0">
            <input 
              value={commentText} 
              onChange={e => setCommentText(e.target.value)} 
              onKeyDown={e => { if (e.key === "Enter") handleComment(); }}
              placeholder="Comentar..." 
              className="flex-1 h-6 bg-muted rounded px-2 text-[10px] font-body text-foreground outline-none border border-border" 
            />
            <button onClick={handleComment} disabled={!commentText.trim()} className="p-1 rounded bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30 disabled:opacity-50">
              <Send className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {showReport && (
        <ReportModal reportedUserId={item.user_id} reportedUserName={item.display_name || "Anónimo"} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

export default function SocialReelsPage() {
  const { user, pauseMusic, roles, isMasterWeb, isAdmin } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const { toast } = useToast();
  const [items, setItems] = useState<SocialItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");
  const [visibleIndex, setVisibleIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isReelsPage = location.pathname.includes("/reels");
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");

  const fetchContent = async () => {
    const { data: content } = await supabase
      .from("social_content")
      .select("*")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(50);
      
    if (!content || content.length === 0) { 
      setItems([]); 
      return; 
    }
    
    const userIds = [...new Set(content.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, color_name, color_avatar_border")
      .in("user_id", userIds);
      
    const profileMap = new Map<string, any>(profiles?.map(p => [p.user_id, p]) || []);
    
    setItems(content.map(c => {
      const p = profileMap.get(c.user_id);
      return {
        ...c,
        content_type: (c as any).content_type || 'video',
        likes: (c as any).likes || 0,
        dislikes: (c as any).dislikes || 0,
        display_name: p?.display_name || "Anónimo",
        avatar_url: p?.avatar_url,
        color_name: p?.color_name || null,
        color_avatar_border: p?.color_avatar_border || null,
      };
    }));
  };

  useEffect(() => {
    fetchContent();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const cards = containerRef.current.querySelectorAll("[data-card-index]");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setVisibleIndex(parseInt((entry.target as HTMLElement).dataset.cardIndex || "0"));
        }
      });
    }, { threshold: 0.6 });
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [items, filter]);

  const handleDeletePost = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta publicación permanentemente?")) return;
    const { error } = await supabase.from("social_content").delete().eq("id", id);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast({ title: "Publicación eliminada por el Staff" });
    } else {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const sourceFiltered = sourceTab === "friends" ? items.filter(i => friendIds.includes(i.user_id)) : items;

  const filtered = (() => {
    if (isReelsPage) {
      if (filter === "videos") return sourceFiltered.filter(isHorizontalVideo);
      if (filter === "reels") return sourceFiltered.filter(isReelItem);
      // En la pestaña Reels, incluso si selecciona "Todos", excluimos las imágenes.
      return sourceFiltered.filter(i => isVideoItem(i));
    }
    return sourceFiltered;
  })();

  const filterTabs = isReelsPage
    ? [
        { id: "all", label: "Todos", icon: Globe },
        { id: "videos", label: "Videos", icon: Video },
        { id: "reels", label: "Reels", icon: Music2 },
      ]
    : [
        { id: "all", label: "Todos", icon: Globe },
      ];

  return (
    <div className="space-y-3 animate-fade-in flex flex-col h-[calc(100vh-80px)]">
      <div className="bg-card border border-neon-orange/30 rounded p-4 shrink-0">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Music2 className="w-4 h-4" /> {isReelsPage ? "VIDEOS & REELS" : "SOCIAL FEED"}
        </h1>
        <p className="text-xs text-muted-foreground font-body">
          {isReelsPage ? "Videos horizontales y reels verticales de la comunidad" : "Todo el contenido social de la comunidad"}
        </p>
      </div>

      <div className="flex gap-1 bg-card border border-border rounded p-1 flex-wrap items-center shrink-0">
        {filterTabs.map(f => (
          <button 
            key={f.id} 
            onClick={() => setFilter(f.id)} 
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all", filter === f.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <f.icon className="w-3 h-3" /> {f.label}
          </button>
        ))}

        {user && (
          <>
            {filterTabs.length > 1 && <div className="w-px h-5 bg-border mx-1" />}
            <button 
              onClick={() => setSourceTab(prev => prev === "friends" ? "all" : "friends")} 
              className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all", sourceTab === "friends" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <Users className="w-3 h-3" /> Amigos
            </button>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded p-6 text-center shrink-0">
          <p className="text-xs text-muted-foreground font-body">No hay contenido aún. ¡Sé el primero en compartir!</p>
          <Button size="sm" asChild className="mt-3 text-xs">
            <Link to="/perfil?tab=social">Agregar Contenido</Link>
          </Button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="snap-y snap-mandatory overflow-y-auto flex-1 pb-10"
          style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          {filtered.map((item, i) => (
            <div key={item.id} data-card-index={i}>
              <SnapCard 
                item={item} 
                isVisible={i === visibleIndex} 
                onPauseMusic={pauseMusic} 
                isStaff={isStaff}
                onDeletePost={handleDeletePost}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}