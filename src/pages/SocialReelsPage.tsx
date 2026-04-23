import { useState, useEffect, useRef } from "react";
import { Instagram, Youtube, Music2, Globe, ExternalLink, Video, Image as ImageIcon, Users, ThumbsUp, ThumbsDown, Flag, MessageSquare, Send, Trash2, ChevronUp, ChevronDown, Reply, X } from "lucide-react";
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
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits"; // 🔥 IMPORTAMOS EL CEREBRO DE LÍMITES 🔥

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
  target_type?: string; 
}

interface SocialComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
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

const isVideoItem = (item: SocialItem | any) => {
  return item.content_type === 'video' || item.content_type === 'reel';
};

const isReelItem = (item: SocialItem) => {
  return item.content_type === 'reel';
};

const isHorizontalVideo = (item: SocialItem) => {
  return item.content_type === 'video';
};

function SnapCard({ 
  item, 
  isVisible, 
  onPauseMusic, 
  isStaff,
  onDeletePost,
  onScrollUp,
  onScrollDown,
  limits // 🔥 RECIBIMOS LOS LÍMITES 🔥
}: { 
  item: SocialItem; 
  isVisible: boolean; 
  onPauseMusic: () => void;
  isStaff: boolean;
  onDeletePost: (id: string, targetType: string) => void;
  onScrollUp: () => void;
  onScrollDown: () => void;
  limits: any; // Tipado de los límites
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const embedUrl = getEmbedUrl(item.content_url, item.platform);
  const isVideo = isVideoItem(item);
  const targetType = item.target_type || "social_content";
  
  const [scale, setScale] = useState(1);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
  const [likes, setLikes] = useState(item.likes || 0);
  const [dislikes, setDislikes] = useState(item.dislikes || 0);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  
  const votingRef = useRef(false);

  const getBaseSize = (platform: string, cType: string, url: string) => {
    if (platform === 'tiktok') return { w: 340, h: 605 };
    if (platform === 'instagram') {
      if (cType === 'reel' || url?.includes('/reel')) return { w: 340, h: 605 };
      return { w: 400, h: 500 }; 
    }
    if (cType === 'reel' || url?.includes('shorts')) return { w: 324, h: 576 };
    return { w: 640, h: 360 };
  };

  useEffect(() => {
    if (isVisible && isVideo) onPauseMusic();
  }, [isVisible, isVideo]);

  useEffect(() => {
    if (!videoContainerRef.current || !isVideo) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const base = getBaseSize(item.platform, item.content_type || '', item.content_url || '');
        
        const safeWidth = width - 16;
        const safeHeight = height - 16;

        const scaleX = safeWidth / base.w;
        const scaleY = safeHeight / base.h;
        
        let newScale = Math.min(scaleX, scaleY);
        newScale = Math.min(newScale, 1.2);

        setScale(newScale);
      }
    });

    observer.observe(videoContainerRef.current);
    return () => observer.disconnect();
  }, [item.platform, item.content_type, item.content_url, isVideo]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("social_reactions")
      .select("reaction_type")
      .eq("user_id", user.id)
      .eq("target_type", targetType)
      .eq("target_id", item.id)
      .maybeSingle()
      .then(({ data }) => { 
        if (data) setUserReaction(data.reaction_type); 
      });
  }, [user, item.id, targetType]);

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
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
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
        .eq("target_type", targetType)
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
          user_id: user.id, target_id: item.id, target_type: targetType, reaction_type: type
        });
      }
      
      const table = targetType === "photo" ? "photos" : "social_content";
      await supabase.from(table).update({ likes: Math.max(0, newLikes), dislikes: Math.max(0, newDislikes) }).eq("id", item.id);
      
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

    // 🔥 BLOQUEO DE LÍMITE DE CARACTERES SEGÚN LA MEMBRESÍA 🔥
    if (commentText.length > limits.maxForumChars) {
      toast({ 
        title: "Límite excedido", 
        description: `Tu membresía permite hasta ${limits.maxForumChars} caracteres por comentario.`, 
        variant: "destructive" 
      });
      return;
    }

    try {
      const { error } = await supabase.from("social_comments").insert({ 
        user_id: user.id, content_id: item.id, content: commentText.trim(), parent_id: replyTo 
      });
      if (error) throw error;
      
      setCommentText("");
      setReplyTo(null);
      
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

  const finalEmbedUrl = isVisible && embedUrl
    ? item.platform === 'youtube'
      ? `${embedUrl}?autoplay=1&mute=0`
      : item.platform === 'tiktok'
        ? `${embedUrl}?autoplay=1`
        : embedUrl
    : embedUrl;

  const baseSize = getBaseSize(item.platform, item.content_type || '', item.content_url || '');

  return (
    <div className="snap-start snap-always w-full h-full flex-shrink-0 flex items-stretch md:gap-3 px-0 md:px-2 relative overflow-hidden group/card">
      
      {/* LADO IZQUIERDO: CAJA DE MEDIA */}
      <div 
        ref={videoContainerRef} 
        className="absolute inset-0 md:relative md:flex-1 bg-[#09090b] md:border border-border md:rounded-xl shadow-md min-h-0 overflow-hidden z-0"
      >
        {isVideo && finalEmbedUrl ? (
          <div 
            className="absolute top-1/2 left-1/2 flex items-center justify-center transition-transform duration-75 origin-center"
            style={{ 
              width: `${baseSize.w}px`,
              height: `${baseSize.w === 640 ? 'auto' : baseSize.h + 'px'}`,
              aspectRatio: baseSize.w === 640 ? '16/9' : 'auto',
              transform: `translate(-50%, -50%) scale(${scale})`
            }}
          >
            <iframe 
              src={finalEmbedUrl} 
              className={cn("w-full h-full bg-transparent outline-none md:rounded-xl shadow-2xl", 
                item.platform === 'instagram' ? "bg-white" : ""
              )}
              style={{ border: "none" }}
              scrolling="no"
              allowFullScreen 
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            />
          </div>
        ) : (item.thumbnail_url || item.content_url.match(/\.(jpeg|jpg|gif|png|webp)/i)) ? (
          <img 
            src={item.thumbnail_url || item.content_url} 
            alt="" 
            className="w-full h-full object-contain p-2"
          />
        ) : finalEmbedUrl ? (
          <div 
            className="absolute top-1/2 left-1/2 flex items-center justify-center"
            style={{ 
              width: `${baseSize.w}px`,
              height: 'auto',
              aspectRatio: '16/9',
              transform: `translate(-50%, -50%) scale(${scale})`
            }}
          >
            <iframe 
              src={finalEmbedUrl} 
              className="w-full h-full shadow-sm bg-white md:rounded-xl outline-none" 
              style={{ border: "none" }}
              scrolling="no"
              allowFullScreen 
            />
          </div>
        ) : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <a href={item.content_url} target="_blank" rel="noopener" className="text-primary text-xs font-body hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Ver original en {item.platform}
            </a>
          </div>
        )}
      </div>

      {/* BOTONES FLOTANTES MÓVIL */}
      <div className="md:hidden absolute right-3 bottom-24 z-20 flex flex-col items-center gap-5">
        <button onClick={() => handleReaction("like")} className="flex flex-col items-center gap-1 group">
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
            <ThumbsUp className={cn("w-5 h-5 transition-transform group-active:scale-90", userReaction === "like" ? "text-neon-green" : "text-white")} />
          </div>
          <span className="text-white text-[11px] font-bold drop-shadow-md">{likes}</span>
        </button>

        <button onClick={() => handleReaction("dislike")} className="flex flex-col items-center gap-1 group">
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
            <ThumbsDown className={cn("w-5 h-5 transition-transform group-active:scale-90", userReaction === "dislike" ? "text-destructive" : "text-white")} />
          </div>
          <span className="text-white text-[11px] font-bold drop-shadow-md">{dislikes}</span>
        </button>

        <button onClick={() => setShowMobilePanel(true)} className="flex flex-col items-center gap-1 group">
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white transition-transform group-active:scale-90" />
          </div>
          <span className="text-white text-[11px] font-bold drop-shadow-md">{comments.length}</span>
        </button>
      </div>

      <div 
        className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300 md:hidden", showMobilePanel ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={() => setShowMobilePanel(false)}
      />
      
      {/* LADO DERECHO: PANEL */}
      <div className={cn(
        "absolute md:relative top-0 right-0 h-full w-[85%] max-w-[320px] md:w-[240px] lg:w-[260px] flex flex-col gap-2 shrink-0 z-40 bg-background/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none p-3 md:p-0 border-l border-border md:border-none transition-transform duration-300 ease-out shadow-2xl md:shadow-none",
        showMobilePanel ? "translate-x-0" : "translate-x-full md:translate-x-0"
      )}>
        
        <div className="flex md:hidden justify-between items-center mb-1">
          <span className="font-pixel text-[11px] text-neon-cyan">Detalles del Post</span>
          <button onClick={() => setShowMobilePanel(false)} className="p-1.5 bg-muted/50 rounded-full text-muted-foreground hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="shrink-0 md:p-2.5 p-3 border border-border bg-card/90 md:bg-card md:rounded-xl rounded-lg shadow-sm flex flex-col z-10 w-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-muted border border-border shrink-0 overflow-hidden" style={getAvatarBorderStyle(item.color_avatar_border)}>
              {item.avatar_url ? <img src={item.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] flex items-center justify-center h-full">👤</span>}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <Link to={`/usuario/${item.user_id}`} className="text-[11px] font-body font-bold text-foreground hover:text-primary truncate" style={getNameStyle(item.color_name)}>{item.display_name}</Link>
              <span className="text-[8px] text-muted-foreground font-body uppercase tracking-wider">{item.platform}</span>
            </div>
            <div className="ml-auto flex items-center gap-1 shrink-0">
              {user && (
                <button onClick={() => setShowReport(true)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" title="Reportar">
                  <Flag className="w-3 h-3" />
                </button>
              )}
              {isStaff && (
                <button onClick={() => onDeletePost(item.id, targetType)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" title="Eliminar (Staff)">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          
          <p className="text-[10px] font-body text-foreground line-clamp-3 leading-snug mb-2">{item.title || "Contenido de la comunidad"}</p>
          
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => handleReaction("like")} className={cn("flex items-center gap-1 text-[11px] font-body font-medium transition-all hover:scale-105", userReaction === "like" ? "text-neon-green" : "text-muted-foreground hover:text-neon-green")}>
              <ThumbsUp className="w-3.5 h-3.5" /> {likes}
            </button>
            <button onClick={() => handleReaction("dislike")} className={cn("flex items-center gap-1 text-[11px] font-body font-medium transition-all hover:scale-105", userReaction === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-destructive")}>
              <ThumbsDown className="w-3.5 h-3.5" /> {dislikes}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-row gap-2 min-h-0 w-full">
          <div className="flex-1 flex flex-col bg-card/90 md:bg-card border border-border md:rounded-xl rounded-lg shadow-sm overflow-hidden min-w-0">
            <div className="shrink-0 px-2.5 py-2 border-b border-border text-[9px] font-pixel text-neon-cyan flex items-center gap-1 bg-muted/20">
              <MessageSquare className="w-2.5 h-2.5" /> COMENTARIOS ({comments.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2.5 space-y-3 min-h-0 bg-background/50" style={{ scrollbarWidth: 'none' }}>
              {comments.map(c => (
                <div key={c.id} className={cn("group text-[10px] font-body flex items-start justify-between gap-2", c.parent_id && "ml-4 border-l border-border pl-2")}>
                  <div className="flex-1">
                    <span className="text-primary font-medium">{c.display_name}: </span>
                    <span className="text-foreground/90">{c.content}</span>
                    {user && (
                      <button onClick={() => setReplyTo(c.id)} className="flex items-center gap-0.5 mt-1 text-[9px] text-muted-foreground hover:text-primary transition-colors">
                        <Reply className="w-2.5 h-2.5" /> Responder
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setShowReport(true)} className="text-muted-foreground hover:text-destructive" title="Reportar">
                       <Flag className="w-2.5 h-2.5" />
                    </button>
                    {isStaff && (
                      <button onClick={() => handleDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive" title="Eliminar (Staff)">
                         <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-[10px] text-muted-foreground font-body text-center py-4 opacity-70">Aún no hay comentarios.</p>}
            </div>
            {user && (
              <div className="shrink-0 flex flex-col border-t border-border bg-card/90 md:bg-card p-1.5 gap-1.5">
                {replyTo && (
                   <div className="flex items-center gap-1 text-[9px] text-neon-cyan font-body px-1">
                     <Reply className="w-3 h-3" /> Respondiendo
                     <button onClick={() => setReplyTo(null)} className="text-destructive ml-1 hover:bg-destructive/20 rounded p-0.5"><X className="w-3 h-3" /></button>
                   </div>
                )}
                <div className="flex gap-1">
                  {/* 🔥 INPUT BLOQUEADO POR LÍMITE DE MEMBRESÍA 🔥 */}
                  <input 
                    value={commentText} 
                    onChange={e => setCommentText(e.target.value)} 
                    onKeyDown={e => { if (e.key === "Enter") handleComment(); }}
                    placeholder={`Comentar... (Máx ${limits.maxForumChars} carac.)`} 
                    maxLength={limits.maxForumChars}
                    className="flex-1 h-7 bg-muted rounded px-2 text-[10px] font-body text-foreground outline-none border border-transparent focus:border-neon-cyan/50 transition-colors min-w-0" 
                  />
                  <button onClick={handleComment} disabled={!commentText.trim()} className="px-2 rounded bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/40 disabled:opacity-50 transition-colors shrink-0">
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:flex flex-col gap-2 w-8 shrink-0 h-full">
            <button 
              onClick={onScrollUp} 
              className="flex-1 bg-card border-2 border-border hover:border-neon-cyan hover:bg-neon-cyan/5 rounded-xl flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[3px] transition-all group"
              title="Subir"
            >
              <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-neon-cyan transition-colors" strokeWidth={3} />
              <div className="font-pixel text-[7px] text-muted-foreground group-hover:text-neon-cyan transition-colors flex flex-col items-center gap-[1px]">
                <span>S</span><span>U</span><span>B</span><span>I</span><span>R</span>
              </div>
            </button>
            
            <button 
              onClick={onScrollDown} 
              className="flex-1 bg-card border-2 border-border hover:border-neon-cyan hover:bg-neon-cyan/5 rounded-xl flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[3px] transition-all group"
              title="Bajar"
            >
              <div className="font-pixel text-[7px] text-muted-foreground group-hover:text-neon-cyan transition-colors flex flex-col items-center gap-[1px]">
                <span>B</span><span>A</span><span>J</span><span>A</span><span>R</span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-neon-cyan transition-colors" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {showReport && (
        <ReportModal reportedUserId={item.user_id} reportedUserName={item.display_name || "Anónimo"} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

export default function SocialReelsPage() {
  const { user, profile, pauseMusic, roles, isMasterWeb, isAdmin } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const { toast } = useToast();
  const [items, setItems] = useState<SocialItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");
  const [visibleIndex, setVisibleIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const isReelsPage = location.pathname.includes("/reels") || location.pathname.includes("/video");
  
  // 🔥 LÓGICA DE MEMBRESÍAS 🔥
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");
  const userTier = (profile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const limits = isStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[userTier];

  const fetchContent = async () => {
    let combined: SocialItem[] = [];

    const { data: content } = await supabase
      .from("social_content")
      .select("*")
      .eq("is_public", true)
      .order("likes", { ascending: false }) 
      .limit(50);
      
    if (content) {
       combined = [...combined, ...content.map(c => ({
         ...c,
         content_type: c.content_type || 'post',
         platform: c.platform || 'web',
         target_type: 'social_content'
       }))];
    }

    if (!isReelsPage) {
      const { data: photos } = await supabase
        .from("photos")
        .select("*")
        .order("likes", { ascending: false })
        .limit(50);

      if (photos) {
        const photoItems = photos.map(p => ({
          id: p.id,
          user_id: p.user_id,
          platform: 'upload', 
          content_url: p.image_url,
          content_type: 'photo',
          title: p.caption,
          thumbnail_url: p.image_url,
          is_public: true,
          created_at: p.created_at,
          likes: p.likes || 0,
          dislikes: p.dislikes || 0,
          target_type: 'photo' 
        }));
        combined = [...combined, ...photoItems];
      }
    }

    if (combined.length === 0) { 
      setItems([]); 
      return; 
    }
    
    combined.sort((a, b) => b.likes - a.likes);

    const userIds = [...new Set(combined.map(c => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, color_name, color_avatar_border")
      .in("user_id", userIds);
      
    const profileMap = new Map<string, any>(profiles?.map(p => [p.user_id, p]) || []);
    
    setItems(combined.slice(0, 50).map(c => {
      const p = profileMap.get(c.user_id);
      return {
        ...c,
        display_name: p?.display_name || "Anónimo",
        avatar_url: p?.avatar_url,
        color_name: p?.color_name || null,
        color_avatar_border: p?.color_avatar_border || null,
      };
    }));
  };

  useEffect(() => {
    fetchContent();
  }, [location.pathname]);

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

  const handleDeletePost = async (id: string, tType: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta publicación permanentemente?")) return;
    const table = tType === "photo" ? "photos" : "social_content";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast({ title: "Publicación eliminada por el Staff" });
    } else {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const scrollContainer = (direction: 'up' | 'down') => {
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      containerRef.current.scrollBy({ top: direction === 'down' ? height : -height, behavior: 'smooth' });
    }
  };

  const sourceFiltered = sourceTab === "friends" ? items.filter(i => friendIds.includes(i.user_id)) : items;

  const filtered = (() => {
    if (isReelsPage) {
      if (filter === "videos") return sourceFiltered.filter(isHorizontalVideo);
      if (filter === "reels") return sourceFiltered.filter(isReelItem);
      return sourceFiltered.filter(isVideoItem); 
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
    <div className="animate-fade-in flex flex-col h-[calc(100vh-50px)] w-full relative overflow-hidden gap-2 pb-1 md:pb-2">
      
      {/* HEADER */}
      <div className="bg-card border border-neon-orange/30 rounded-xl p-2.5 md:p-3 shrink-0 shadow-sm mt-1 mx-1 md:mx-2">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Music2 className="w-4 h-4" /> {isReelsPage ? "VIDEOS & REELS" : "SOCIAL FEED"}
        </h1>
        <p className="text-[10px] text-muted-foreground font-body">
          {isReelsPage ? "Videos horizontales y reels verticales de la comunidad" : "Todo el contenido social de la comunidad"}
        </p>
      </div>

      {/* FILTROS */}
      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 flex-wrap items-center shrink-0 shadow-sm mx-1 md:mx-2">
        {filterTabs.map(f => (
          <button 
            key={f.id} 
            onClick={() => setFilter(f.id)} 
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all", filter === f.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <f.icon className="w-3 h-3" /> {f.label}
          </button>
        ))}

        {user && (
          <>
            {filterTabs.length > 1 && <div className="w-px h-5 bg-border mx-1" />}
            <button 
              onClick={() => setSourceTab(prev => prev === "friends" ? "all" : "friends")} 
              className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all", sourceTab === "friends" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              title={sourceTab === "friends" ? "Mostrando solo amigos" : "Filtrar por amigos"}
            >
              <Users className="w-3 h-3" /> Amigos
            </button>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center shrink-0 shadow-sm mx-1 md:mx-2">
          <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-xs text-muted-foreground font-body">No hay contenido aún. ¡Sé el primero en compartir!</p>
          <Button size="sm" asChild className="mt-3 text-xs rounded-lg">
            <Link to="/perfil?tab=social">Agregar Contenido</Link>
          </Button>
        </div>
      ) : (
        <div className="relative flex-1 min-h-0 w-full overflow-hidden">
          <div
            ref={containerRef}
            className="snap-y snap-mandatory overflow-y-auto h-full w-full relative z-0"
            style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
            
            {filtered.map((item, i) => (
              <div key={item.id} data-card-index={i} className="h-full w-full snap-center snap-always">
                <SnapCard 
                  item={item} 
                  isVisible={i === visibleIndex} 
                  onPauseMusic={pauseMusic} 
                  isStaff={isStaff}
                  onDeletePost={handleDeletePost}
                  onScrollUp={() => scrollContainer('up')}
                  onScrollDown={() => scrollContainer('down')}
                  limits={limits} // 🔥 PASAMOS LOS LÍMITES A LA TARJETA 🔥
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}