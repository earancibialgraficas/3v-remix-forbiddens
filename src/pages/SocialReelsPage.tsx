import { useState, useEffect, useRef } from "react";
import { Instagram, Youtube, Music2, Globe, ExternalLink, Video, Image as ImageIcon, X, Users, ThumbsUp, ThumbsDown, Flag, MessageSquare, Send } from "lucide-react";
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
    if (igMatch) return `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed/`;
  }
  if (platform === "tiktok") {
    const tkMatch = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/);
    if (tkMatch) return `https://www.tiktok.com/embed/v2/${tkMatch[1]}`;
    const tkMatch2 = url.match(/tiktok\.com\/.*?video\/(\d+)/);
    if (tkMatch2) return `https://www.tiktok.com/embed/v2/${tkMatch2[1]}`;
  }
  return null;
};

const isVideoItem = (item: SocialItem) => {
  return item.content_type === 'video' || item.content_type === 'reel' ||
    item.platform === "youtube" || item.platform === "tiktok" ||
    item.content_url.includes("reel") || item.content_url.includes("shorts");
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
  return item.content_type === 'image' ||
    item.content_url.match(/\.(jpg|jpeg|png|gif|webp)/i) ||
    (item.platform === "instagram" && !item.content_url.includes("reel"));
};

function SnapCard({ item, isVisible, onPauseMusic }: { item: SocialItem; isVisible: boolean; onPauseMusic: () => void }) {
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
  
  // 🔥 FIX: Referencia para bloquear el spam de likes
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
    
    // 🔥 FIX: Bloquea clicks muy rápidos
    if (votingRef.current) return;
    votingRef.current = true;
    
    try {
      const { data: existingReaction, error: fetchErr } = await supabase
        .from("social_reactions")
        .select("id, reaction_type")
        .eq("user_id", user.id)
        .eq("target_id", item.id)
        .maybeSingle();

      if (fetchErr) throw fetchErr;

      let newLikes = likes;
      let newDislikes = dislikes;

      if (existingReaction) {
        if (existingReaction.reaction_type === type) {
          // Quitar reacción
          await supabase.from("social_reactions").delete().eq("id", existingReaction.id);
          setUserReaction(null);
          if (type === "like") newLikes--; else newDislikes--;
        } else {
          // Cambiar reacción
          await supabase.from("social_reactions").update({ reaction_type: type }).eq("id", existingReaction.id);
          setUserReaction(type);
          if (type === "like") { newLikes++; newDislikes--; } 
          else { newDislikes++; newLikes--; }
        }
      } else {
        // Nueva reacción
        const { error: insertErr } = await supabase.from("social_reactions").insert({
          user_id: user.id, target_id: item.id, target_type: "social_content", reaction_type: type
        });
        if (insertErr) throw insertErr;
        
        setUserReaction(type);
        if (type === "like") newLikes++; else newDislikes++;
      }

      setLikes(Math.max(0, newLikes));
      setDislikes(Math.max(0, newDislikes));
      await supabase.from("social_content").update({ likes: Math.max(0, newLikes), dislikes: Math.max(0, newDislikes) }).eq("id", item.id);
      
    } catch (e: any) {
      console.error("Error toggling reaction:", e);
      toast({ title: "Error", description: "No se pudo procesar tu voto", variant: "destructive" });
    } finally {
      // Liberar el botón
      votingRef.current = false;
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    
    try {
      const { error } = await supabase.from("social_comments").insert({ 
        user_id: user.id, content_id: item.id, content: commentText.trim() 
      });
      
      if (error) {
        console.error("Error DB Insert:", error);
        throw error;
      }
      
      setCommentText("");
      
      const { data } = await supabase.from("social_comments").select("*").eq("content_id", item.id).order("created_at", { ascending: true });
      if (data) {
        const uids = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uids);
        
        const pMap = new Map<string, any>(profiles?.map(p => [p.user_id, p]) || []);
        
        setComments(data.map(c => {
          const p = pMap.get(c.user_id);
          return { 
            ...c, 
            display_name: p?.display_name || "Anónimo", 
            avatar_url: p?.avatar_url 
          };
        }));
      }
    } catch (e: any) {
      console.error("Error posting comment:", e);
      toast({ title: "Error", description: "No se pudo publicar tu comentario. Verifica tu conexión.", variant: "destructive" });
    }
  };

  return (
    <div className="snap-start w-full flex-shrink-0 flex items-stretch gap-3 px-2" style={{ height: 'calc(100dvh - 220px)', minHeight: '400px' }}>
      <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 relative bg-muted/30 flex items-center justify-center overflow-hidden">
          {isVideo && embedUrl ? (
            <iframe 
              src={isVisible ? `${embedUrl}?autoplay=1&mute=0` : embedUrl} 
              className="w-full h-full" 
              allowFullScreen 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            />
          ) : item.thumbnail_url || isImageItem(item) ? (
            <img src={item.thumbnail_url || item.content_url} alt="" className="w-full h-full object-contain" />
          ) : embedUrl ? (
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
          ) : (
            <a href={item.content_url} target="_blank" rel="noopener" className="text-primary text-xs font-body hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Ver original
            </a>
          )}
        </div>
        <div className="p-3 border-t border-border">
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
            {user && (
              <button onClick={() => setShowReport(true)} className="text-muted-foreground hover:text-destructive text-[10px] ml-auto"><Flag className="w-3 h-3" /></button>
            )}
          </div>
        </div>
      </div>

      <div className="w-64 hidden md:flex flex-col bg-card border border-border rounded-lg overflow-hidden shrink-0">
        <div className="px-3 py-2 border-b border-border text-[10px] font-pixel text-neon-cyan flex items-center gap-1">
          <MessageSquare className="w-3 h-3" /> COMENTARIOS ({comments.length})
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ scrollbarWidth: 'none' }}>
          {comments.map(c => (
            <div key={c.id} className="text-[10px] font-body">
              <span className="text-primary font-medium">{c.display_name}: </span>
              <span className="text-foreground">{c.content}</span>
            </div>
          ))}
          {comments.length === 0 && <p className="text-[10px] text-muted-foreground font-body text-center py-4">Sin comentarios</p>}
        </div>
        {user && (
          <div className="p-2 border-t border-border flex gap-1">
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
  const { user, pauseMusic } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const [items, setItems] = useState<SocialItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");
  const [visibleIndex, setVisibleIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isReelsPage = location.pathname.includes("/reels");

  useEffect(() => {
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

  const sourceFiltered = sourceTab === "friends" ? items.filter(i => friendIds.includes(i.user_id)) : items;

  const filtered = (() => {
    if (isReelsPage) {
      if (filter === "videos") return sourceFiltered.filter(isHorizontalVideo);
      if (filter === "reels") return sourceFiltered.filter(isReelItem);
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
    <div className="space-y-3 animate-fade-in">
      <div className="bg-card border border-neon-orange/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Music2 className="w-4 h-4" /> {isReelsPage ? "VIDEOS & REELS" : "SOCIAL FEED"}
        </h1>
        <p className="text-xs text-muted-foreground font-body">
          {isReelsPage ? "Videos horizontales y reels verticales de la comunidad" : "Todo el contenido social de la comunidad"}
        </p>
      </div>

      {user && (
        <div className="flex gap-1 bg-card border border-border rounded p-1">
          <button 
            onClick={() => setSourceTab("all")} 
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all", sourceTab === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Globe className="w-3 h-3" /> Todos
          </button>
          <button 
            onClick={() => setSourceTab("friends")} 
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all", sourceTab === "friends" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Users className="w-3 h-3" /> Amigos
          </button>
        </div>
      )}

      {filterTabs.length > 1 && (
        <div className="flex gap-1 bg-card border border-border rounded p-1 flex-wrap">
          {filterTabs.map(f => (
            <button 
              key={f.id} 
              onClick={() => setFilter(f.id)} 
              className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all", filter === f.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              <f.icon className="w-3 h-3" /> {f.label}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded p-6 text-center">
          <p className="text-xs text-muted-foreground font-body">No hay contenido aún. ¡Sé el primero en compartir!</p>
          <Button size="sm" asChild className="mt-3 text-xs">
            <Link to="/perfil?tab=social">Agregar Contenido</Link>
          </Button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="snap-y snap-mandatory overflow-y-auto"
          style={{ height: 'calc(100dvh - 220px)', scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style>{`div::-webkit-scrollbar { display: none; }`}</style>
          {filtered.map((item, i) => (
            <div key={item.id} data-card-index={i}>
              <SnapCard item={item} isVisible={i === visibleIndex} onPauseMusic={pauseMusic} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}