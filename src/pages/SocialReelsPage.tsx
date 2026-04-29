import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { Instagram, Youtube, Music2, Globe, ExternalLink, Video, Image as ImageIcon, Users, ThumbsUp, ThumbsDown, Flag, MessageSquare, Send, Trash2, ChevronUp, ChevronDown, Reply, X, PlayCircle, Ghost, Bookmark, Shield, Ban, Copy, User as UserIcon, Flame, Sparkles, Edit2, Loader2, Maximize2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useFriendIds } from "@/hooks/useFriendIds";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getAvatarBorderStyle, getNameStyle } from "@/lib/profileAppearance";
import { useToast } from "@/hooks/use-toast";
import ReportModal from "@/components/ReportModal";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const getSafeUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('supabase.co')) return url;
  if (url.includes('wsrv.nl')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

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
  image_url?: string;
  caption?: string;
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

// 🔥 LÓGICA DE EMBED MEJORADA INCLUYENDO FACEBOOK 🔥
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
  if (platform === "facebook") {
    const encodedUrl = encodeURIComponent(url);
    // Para Facebook ya incluimos parámetros iniciales
    return `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&width=560`;
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

function MediaModalFeed({ src, type, onClose }: { src: string; type: "image" | "video"; onClose: () => void }) {
  const isImage = type === "image";
  
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-4xl max-h-[90vh] flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.9)]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-end mb-2 gap-2 w-full z-10">
          {isImage && (
            <a href={src} download target="_blank" rel="noopener" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm" title="Descargar">
              <Download className="w-5 h-5 text-white" />
            </a>
          )}
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-destructive/80 transition-colors border border-white/20 backdrop-blur-sm text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="bg-black border border-white/10 rounded-xl overflow-hidden w-full relative flex items-center justify-center">
          {type === "video" ? (
            <video src={src} controls autoPlay className="w-full max-h-[80vh] rounded-xl" />
          ) : (
            <img src={src} alt="" className="w-full max-h-[80vh] object-contain rounded-xl" />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function SnapCard({ 
  item, 
  isVisible, 
  onPauseMusic, 
  isStaff,
  onDeletePost,
  onEditPost,
  onHidePost,
  onSavePost,
  onScrollUp,
  onScrollDown,
  limits
}: { 
  item: SocialItem; 
  isVisible: boolean; 
  onPauseMusic: () => void;
  isStaff: boolean;
  onDeletePost: (id: string, targetType: string) => void;
  onEditPost: (id: string, newTitle: string, targetType: string) => void;
  onHidePost: (id: string, targetType: string) => void;
  onSavePost: (item: SocialItem) => void;
  onScrollUp: () => void;
  onScrollDown: () => void;
  limits: any; 
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isOwner = user?.id === item.user_id;

  const embedUrl = getEmbedUrl(item.content_url, item.platform);
  const isVideo = isVideoItem(item);
  const isDirectMp4 = item.content_url?.toLowerCase().match(/\.(mp4|webm|ogg)$/);
  
  const isInstagram = item.platform === 'instagram';
  const isInstagramReel = isInstagram && item.content_type === 'reel';
  const isPhoto = item.target_type === 'photo' || item.content_type === 'photo' || item.platform === 'upload' || (isInstagram && !isInstagramReel) || item.content_url?.match(/\.(jpeg|jpg|gif|png|webp)/i);
  
  const targetType = item.target_type || "social_content";
  
  const [scale, setScale] = useState(1);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const rawVideoRef = useRef<HTMLVideoElement>(null);
  
  const [likes, setLikes] = useState(item.likes || 0);
  const [dislikes, setDislikes] = useState(item.dislikes || 0);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{id: string, name: string} | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title || item.caption || "");
  const [showMediaModal, setShowMediaModal] = useState(false);

  const votingRef = useRef(false);

  const getBaseSize = (platform: string, cType: string, url: string) => {
    if (platform === 'tiktok') return { w: 340, h: 605 };
    if (platform === 'instagram') {
      if (cType === 'reel' || url?.includes('/reel')) return { w: 340, h: 605 };
      return { w: 400, h: 500 }; 
    }
    if (platform === 'facebook') {
      if (cType === 'reel' || url?.includes('/reel/')) return { w: 324, h: 576 };
      return { w: 560, h: 315 };
    }
    if (cType === 'reel' || url?.includes('shorts')) return { w: 324, h: 576 };
    return { w: 640, h: 360 };
  };

  // 🔥 FORZAR AUTOPLAY MEDIANTE JAVASCRIPT CUANDO ENTRA EN PANTALLA 🔥
  useEffect(() => {
    if (isVisible && isVideo) onPauseMusic();
    
    // Si es un video raw (MP4), controlar play/pause/mute dinámico
    if (rawVideoRef.current && isDirectMp4) {
      rawVideoRef.current.volume = 0.5; // Volumen al 50%
      
      if (isVisible) {
        // Video visible: REPRODUCIR CON SONIDO
        rawVideoRef.current.muted = false;
        rawVideoRef.current.play().catch(e => {
          console.warn("Autoplay bloqueado con sonido, intentando en silencio:", e);
          if (rawVideoRef.current) {
            rawVideoRef.current.muted = true;
            rawVideoRef.current.play().catch(console.error);
          }
        });
      } else {
        // Video NO visible: PAUSAR Y MUTEAR
        rawVideoRef.current.muted = true;
        rawVideoRef.current.pause();
      }
    }
  }, [isVisible, isVideo, isDirectMp4, onPauseMusic]);

  useEffect(() => {
    if (!videoContainerRef.current || !isVideo || isDirectMp4 || isPhoto) return;

    // Para Instagram, no usamos scaling, usamos aspect-ratio responsive
    if (item.platform === 'instagram') {
      setScale(1);
      return;
    }

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
  }, [item.platform, item.content_type, item.content_url, isVideo, isDirectMp4, isPhoto]);

  useEffect(() => {
    if (!user) return;
    supabase.from("social_reactions").select("reaction_type").eq("user_id", user.id).eq("target_type", targetType).eq("target_id", item.id).maybeSingle()
      .then(({ data }) => { if (data) setUserReaction(data.reaction_type); });
  }, [user, item.id, targetType]);

  const fetchComments = async () => {
    const { data } = await supabase.from("social_comments").select("*").eq("content_id", item.id).order("created_at", { ascending: true }).limit(50);
    if (!data || data.length === 0) { setComments([]); return; }
    const uids = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uids);
    const pMap = new Map<string, any>(profiles?.map(p => [p.user_id, p]) || []);
    setComments(data.map(c => {
      const p = pMap.get(c.user_id);
      return { ...c, display_name: p?.display_name || "Anónimo", avatar_url: p?.avatar_url };
    }));
  };

  useEffect(() => { fetchComments(); }, [item.id]);

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
        .from("social_reactions").select("id, reaction_type").eq("user_id", user.id).eq("target_id", item.id).eq("target_type", targetType).maybeSingle();

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
      setLikes(prevLikes); setDislikes(prevDislikes); setUserReaction(prevReaction);
    } finally {
      votingRef.current = false;
    }
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    if (commentText.length > limits.maxForumChars) {
      toast({ title: "Límite excedido", description: `Tu membresía permite hasta ${limits.maxForumChars} caracteres.`, variant: "destructive" });
      return;
    }
    
    try {
      const { error } = await supabase.from("social_comments").insert({ 
        user_id: user.id, content_id: item.id, content: replyTo ? `@${replyTo.name} ${commentText.trim()}` : commentText.trim(), parent_id: replyTo?.id || null 
      });
      if (error) throw error;
      setCommentText(""); setReplyTo(null);
      fetchComments();
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

  // 🔥 IFRAMES AUTOPLAY DINÁMICO Y PAUSA AL HACER SCROLL 🔥
  const getDynamicEmbedUrl = () => {
    if (!embedUrl) return null;
    // ⭐ Solo renderizar si está visible (pausa automática al hacer scroll)
    if (!isVisible) return null;
    
    let url = embedUrl;
    if (item.platform === 'youtube') url += '?autoplay=1&mute=0';
    else if (item.platform === 'tiktok') url += '?autoplay=1';
    else if (item.platform === 'facebook') url += '&autoplay=1&allow_autoplay=1';
    else if (item.platform === 'instagram') url += '';
    
    return url;
  };
  
  const finalEmbedUrl = getDynamicEmbedUrl();
  
  // 🔥 EFECTO PARA REMONTADOR DE IFRAMES AL CAMBIAR VISIBILIDAD 🔥
  const [iframeKey, setIframeKey] = useState(0);
  
  useEffect(() => {
    // Remontamos el iframe cuando entra en pantalla para forzar recarga y reproducción con sonido
    if (isVisible && (item.platform === 'facebook' || item.platform === 'instagram' || item.platform === 'tiktok')) {
      setIframeKey(prev => prev + 1);
    }
    // Al salir de pantalla, incrementamos para forzar desmontaje (pausa automática)
    // Esto hace que se cree un nuevo iframe con key diferente cuando vuelva a ser visible
  }, [isVisible, item.platform]);

  const baseSize = getBaseSize(item.platform, item.content_type || '', item.content_url || '');
  const targetImgUrl = item.image_url || item.thumbnail_url || item.content_url || '';

  return (
    <div className="snap-start snap-always w-full h-full flex-shrink-0 flex items-stretch md:gap-3 px-0 md:px-2 relative overflow-hidden group/card">
      <div ref={videoContainerRef} className="absolute inset-0 md:relative md:flex-1 bg-[#09090b] md:border border-border md:rounded-xl shadow-md min-h-0 overflow-hidden z-0 flex items-center justify-center">
        
        {isPhoto ? (
          <div className="relative w-full h-full flex items-center justify-center group/ig cursor-pointer" onClick={() => setShowMediaModal(true)}>
            <img 
              src={getSafeUrl(targetImgUrl)} 
              alt={item.title || "Imagen"} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-2" 
              onError={(e) => {
                if (e.currentTarget.src !== targetImgUrl) {
                  e.currentTarget.src = targetImgUrl;
                }
              }}
            />
            {isInstagram && (
              <a href={item.content_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover/ig:opacity-100 transition-opacity md:rounded-xl" onClick={e => e.stopPropagation()}>
                <Instagram className="w-12 h-12 text-white mb-2" />
                <span className="text-white font-pixel text-[10px] uppercase tracking-widest text-center px-4">Ver en Instagram</span>
              </a>
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/ig:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-black/60 p-2 rounded-full backdrop-blur-sm border border-white/20"><Maximize2 className="w-6 h-6 text-white" /></div>
            </div>
          </div>
        ) : isDirectMp4 ? (
          <video ref={rawVideoRef} src={item.content_url} controls loop playsInline className="w-full h-full object-contain" />
        ) : finalEmbedUrl ? (
          item.platform === 'instagram' ? (
            // 🔥 CONTENEDOR RESPONSIVO PROPORCIONAL PARA INSTAGRAM 🔥
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5vh 0 15vh 0',
              height: '100vh',
              boxSizing: 'border-box',
              width: '100%'
            }}>
              <iframe 
                key={`instagram-${item.id}-${iframeKey}`}
                src={finalEmbedUrl} 
                className="bg-white" 
                style={{ 
                  border: "none",
                  display: 'block',
                  height: 'calc(100vh - 20vh)',
                  aspectRatio: '9 / 16',
                  maxWidth: '100%',
                  objectFit: 'contain'
                }} 
                scrolling="no" 
                allowFullScreen 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; microphone" 
              />
            </div>
          ) : (
            // 🔥 CONTENEDOR ESCALABLE PARA OTROS VIDEOS 🔥
            <div className="absolute top-1/2 left-1/2 flex items-center justify-center transition-transform duration-75 origin-center"
              style={{ width: `${baseSize.w}px`, height: `${baseSize.w === 640 ? 'auto' : baseSize.h + 'px'}`, aspectRatio: baseSize.w === 640 ? '16/9' : 'auto', transform: `translate(-50%, -50%) scale(${scale})` }}>
              <iframe 
                key={`other-${item.id}-${iframeKey}`}
                src={finalEmbedUrl} 
                className={cn("w-full h-full bg-transparent outline-none md:rounded-xl shadow-2xl", item.platform === 'instagram' || item.platform === 'facebook' ? "bg-white" : "")} 
                style={{ border: "none" }} 
                scrolling="no" 
                allowFullScreen 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; microphone" 
              />
            </div>
          )
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
            <img src={getSafeUrl(targetImgUrl)} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm" alt="" />
            <PlayCircle className="w-16 h-16 text-neon-cyan/50 animate-pulse relative z-10" />
          </div>
        )}

      </div>

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

      <div className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300 md:hidden", showMobilePanel ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => setShowMobilePanel(false)} />
      
      <div className={cn("absolute md:relative top-0 right-0 h-full w-[85%] max-w-[320px] md:w-[240px] lg:w-[260px] flex flex-col gap-2 shrink-0 z-40 bg-background/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none p-3 md:p-0 border-l border-border md:border-none transition-transform duration-300 ease-out shadow-2xl md:shadow-none", showMobilePanel ? "translate-x-0" : "translate-x-full md:translate-x-0")}>
        <div className="flex md:hidden justify-between items-center mb-1">
          <span className="font-pixel text-[11px] text-neon-cyan">Detalles del Reel</span>
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
              {isOwner && (
                <>
                  <button onClick={() => setIsEditing(!isEditing)} className="p-1 text-muted-foreground hover:text-neon-yellow transition-colors" title="Editar">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDeletePost(item.id, targetType)} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Eliminar">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {user && (
                <button onClick={() => onSavePost(item)} className="p-1 text-muted-foreground hover:text-neon-cyan transition-colors" title="Guardar">
                  <Bookmark className="w-3.5 h-3.5" />
                </button>
              )}
              {user && !isOwner && (
                <button onClick={() => setShowReport(true)} className="p-1 text-muted-foreground hover:text-destructive transition-colors" title="Reportar">
                  <Flag className="w-3.5 h-3.5" />
                </button>
              )}

              {isStaff && !isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 text-muted-foreground hover:text-neon-magenta transition-colors">
                      <Shield className="w-3.5 h-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="z-[200] bg-card border-border">
                    <DropdownMenuItem onClick={() => onHidePost(item.id, targetType)} className="text-neon-orange cursor-pointer focus:bg-neon-orange/10">
                      <Ban className="w-3 h-3 mr-2" /> Ocultar / Banear
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDeletePost(item.id, targetType)} className="text-destructive cursor-pointer focus:bg-destructive/10">
                      <Trash2 className="w-3 h-3 mr-2" /> Eliminar Permanente
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = `/usuario/${item.user_id}`} className="cursor-pointer">
                      <UserIcon className="w-3 h-3 mr-2" /> Ver Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(item.id); toast({title:"ID Copiado"}); }} className="cursor-pointer">
                      <Copy className="w-3 h-3 mr-2" /> Copiar ID
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {isEditing ? (
            <div className="mb-2 mt-1 space-y-2 animate-fade-in">
              <Textarea 
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)} 
                className="bg-black/50 border-white/10 text-xs font-body min-h-[50px] resize-none" 
                placeholder="Escribe tu título aquí..."
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onEditPost(item.id, editTitle, targetType); setIsEditing(false); }} className="text-[10px] h-6 bg-neon-cyan text-black hover:bg-neon-cyan/80">Guardar</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="text-[10px] h-6 border-white/10">Cancelar</Button>
              </div>
            </div>
          ) : (
            <p className="text-[10px] font-body text-foreground line-clamp-3 leading-snug mb-2">{item.title || item.caption || "Contenido de la comunidad"}</p>
          )}
          
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => handleReaction("like")} className={cn("flex items-center gap-1 text-[11px] font-body font-medium transition-all hover:scale-105", userReaction === "like" ? "text-neon-green font-bold" : "text-muted-foreground hover:text-neon-green")}>
              <ThumbsUp className="w-3.5 h-3.5" /> {likes}
            </button>
            <button onClick={() => handleReaction("dislike")} className={cn("flex items-center gap-1 text-[11px] font-body font-medium transition-all hover:scale-105", userReaction === "dislike" ? "text-destructive font-bold" : "text-muted-foreground hover:text-destructive")}>
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
                      <button onClick={() => setReplyTo({id: c.id, name: c.display_name || "Usuario"})} className="flex items-center gap-0.5 mt-1 text-[9px] text-muted-foreground hover:text-primary transition-colors">
                        <Reply className="w-2.5 h-2.5" /> Responder
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {user && user.id !== c.user_id && <button onClick={() => setShowReport(true)} className="text-muted-foreground hover:text-destructive" title="Reportar"><Flag className="w-2.5 h-2.5" /></button>}
                    {(isStaff || user?.id === c.user_id) && <button onClick={() => handleDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive" title="Eliminar"><Trash2 className="w-2.5 h-2.5" /></button>}
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-[10px] text-muted-foreground font-body text-center py-4 opacity-70">Aún no hay comentarios.</p>}
            </div>
            {user && (
              <div className="shrink-0 flex flex-col border-t border-border bg-card/90 md:bg-card p-1.5 gap-1.5">
                {replyTo && (
                   <div className="flex items-center gap-1 text-[9px] text-neon-cyan font-body px-1">
                     <Reply className="w-3 h-3" /> Respondiendo a {replyTo.name}
                     <button onClick={() => setReplyTo(null)} className="text-destructive ml-1 hover:bg-destructive/20 rounded p-0.5"><X className="w-3 h-3" /></button>
                   </div>
                )}
                <div className="flex gap-1">
                  <input 
                    value={commentText} 
                    onChange={e => setCommentText(e.target.value)} 
                    onKeyDown={e => { if (e.key === "Enter") handleComment(); }} 
                    placeholder={`Comentar... (Máx ${limits.maxForumChars})`} 
                    maxLength={limits.maxForumChars}
                    className="flex-1 h-7 bg-muted rounded px-2 text-[10px] font-body text-foreground outline-none border border-transparent focus:border-neon-cyan/50 transition-colors min-w-0" 
                  />
                  <button onClick={handleComment} disabled={!commentText.trim()} className="px-2 rounded bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/40 disabled:opacity-50 transition-colors shrink-0"><Send className="w-3 h-3" /></button>
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:flex flex-col gap-2 w-8 shrink-0 h-full">
            <button onClick={onScrollUp} className="flex-1 bg-card border-2 border-border hover:border-neon-cyan hover:bg-neon-cyan/5 rounded-xl flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[3px] transition-all group" title="Subir">
              <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-neon-cyan transition-colors" strokeWidth={3} />
              <div className="font-pixel text-[7px] text-muted-foreground group-hover:text-neon-cyan transition-colors flex flex-col items-center gap-[1px]"><span>S</span><span>U</span><span>B</span><span>I</span><span>R</span></div>
            </button>
            <button onClick={onScrollDown} className="flex-1 bg-card border-2 border-border hover:border-neon-cyan hover:bg-neon-cyan/5 rounded-xl flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[3px] transition-all group" title="Bajar">
              <div className="font-pixel text-[7px] text-muted-foreground group-hover:text-neon-cyan transition-colors flex flex-col items-center gap-[1px]"><span>B</span><span>A</span><span>J</span><span>A</span><span>R</span></div>
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-neon-cyan transition-colors" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
      
      {showMediaModal && (
         <MediaModalFeed 
            src={getSafeUrl(targetImgUrl)} 
            type="image" 
            onClose={() => setShowMediaModal(false)} 
         />
      )}

      {showReport && <ReportModal reportedUserId={item.user_id} reportedUserName={item.display_name || "Anónimo"} postId={item.id} onClose={() => setShowReport(false)} />}
    </div>
  );
}

export default function SocialReelsPage() {
  const { user, pauseMusic, roles, isMasterWeb, isAdmin } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const { toast } = useToast();
  const location = useLocation();

  const [sort, setSort] = useState<'new' | 'popular'>('new');
  const [items, setItems] = useState<SocialItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [visibleIndex, setVisibleIndex] = useState(0);

  const [filter, setFilter] = useState<string>("all");
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isSnapping, setIsSnapping] = useState(true);

  const ITEMS_PER_PAGE = 15; 
  const containerRef = useRef<HTMLDivElement>(null);
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");

  const fetchContent = async (resetPage: boolean, sortMode: 'new' | 'popular') => {
    if (isFetching) return;
    setIsFetching(true);

    try {
      const pageNum = resetPage ? 0 : page;
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const orderCol = sortMode === "popular" ? "likes" : "created_at";

      const { data: content, error: err1 } = await supabase
        .from("social_content")
        .select("*")
        .eq("is_public", true)
        .neq("is_banned", true)
        .in('content_type', ['video', 'reel']) 
        .order(orderCol, { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (err1) console.error("Error social_content:", err1);

      let combined: SocialItem[] = [];

      if (content) {
        combined = [
          ...combined,
          ...content.map((c) => ({
            ...c,
            content_type: c.content_type || 'post', 
            platform: c.platform || 'web',
            likes: c.likes || 0,
            dislikes: c.dislikes || 0,
            created_at: c.created_at || new Date().toISOString(),
            target_type: "social_content"
          })).filter(c => c.created_at) 
        ];
      }

      const userIds = [...new Set(combined.map(c => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_name, color_avatar_border").in("user_id", userIds);
      const profileMap = new Map<string, any>(profiles?.map(p => [p.user_id, p]) || []);
      
      let processed = combined.map(c => {
        const p = profileMap.get(c.user_id);
        return { ...c, display_name: p?.display_name || "Anónimo", avatar_url: p?.avatar_url, color_name: p?.color_name || null, color_avatar_border: p?.color_avatar_border || null };
      });

      processed.sort((a, b) => {
        if (sortMode === "popular") {
          const scoreA = (a.likes || 0) - (a.dislikes || 0);
          const scoreB = (b.likes || 0) - (b.dislikes || 0);
          if (scoreB !== scoreA) return scoreB - scoreA;
        }
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      if (resetPage) {
        setItems(processed);
        setPage(1);
        setVisibleIndex(0);
        if (containerRef.current) {
          setIsSnapping(false);
          containerRef.current.scrollTo({ top: 0, behavior: "auto" });
          setTimeout(() => setIsSnapping(true), 150);
        }
      } else {
        setItems((prev) => {
          const ids = new Set(prev.map((x) => x.id));
          const unique = processed.filter((x) => !ids.has(x.id));
          const merged = [...prev, ...unique];

          return merged.sort((a, b) => {
            if (sortMode === "popular") {
              const scoreA = (a.likes || 0) - (a.dislikes || 0);
              const scoreB = (b.likes || 0) - (b.dislikes || 0);
              if (scoreB !== scoreA) return scoreB - scoreA;
            }
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
        });
        setPage((prev) => prev + 1);
      }

      if ((content?.length || 0) < ITEMS_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

    } catch (err) {
      console.error("UNEXPECTED ERROR:", err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchContent(true, sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const loadMore = () => {
    if (!isFetching && hasMore) {
      fetchContent(false, sort);
    }
  };

  const handleEditPost = async (id: string, newTitle: string, targetType: string) => {
    const table = targetType === "photo" ? "photos" : "social_content";
    const field = targetType === "photo" ? "caption" : "title";
    const { error } = await supabase.from(table).update({ [field]: newTitle } as any).eq("id", id);
    if (!error) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, title: newTitle, caption: newTitle } : i));
      toast({ title: "Publicación editada con éxito" });
    } else {
      toast({ title: "Error", description: "No se pudo editar", variant: "destructive" });
    }
  };

  const handleDeletePost = async (id: string, tType: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta publicación permanentemente?")) return;
    const table = tType === "photo" ? "photos" : "social_content";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) {
      setItems(prev => prev.filter(i => i.id !== id));
      toast({ title: "Publicación eliminada" });
    } else {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const handleHidePost = async (id: string, targetType: string) => {
    const table = targetType === "photo" ? "photos" : "social_content";
    const { error } = await supabase.from(table).update({ is_banned: true } as any).eq("id", id);
    if (!error) {
      toast({ title: "Publicación ocultada/baneada." });
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      toast({ title: "Error", description: "No se pudo ocultar", variant: "destructive" });
    }
  };

  const handleSaveToProfile = async (item: SocialItem) => {
    if (!user) return;
    try { 
      const { error } = await supabase.from("saved_items" as any).insert({ 
        user_id: user.id, 
        item_type: item.target_type || 'social_content',
        original_id: item.id,
        title: item.caption || item.title || 'Publicación de Reels',
        thumbnail_url: item.image_url || item.thumbnail_url || item.content_url,
        redirect_url: '/social/reels?post=' + item.id 
      }); 
      if (error && error.code === '23505') toast({ title: "Aviso", description: "Ya tienes esta publicación guardada en tu perfil." });
      else if (!error) toast({ title: "¡Guardado en tu Perfil!" }); 
    } catch (e) { }
  };

  const scrollContainer = (direction: 'up' | 'down') => {
    if (containerRef.current) {
      const height = containerRef.current.clientHeight;
      containerRef.current.scrollBy({ top: direction === 'down' ? height : -height, behavior: 'smooth' });
    }
  };

  const handleSetSort = (newSort: 'new' | 'popular') => {
    if (sort === newSort || isFetching) return;
    
    setIsSnapping(false);
    
    setPage(0);
    setHasMore(true);
    setVisibleIndex(0);
    setSort(newSort);

    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }

    setTimeout(() => setIsSnapping(true), 150);
  };

  const filteredItems = useMemo(() => {
    let filt = sourceTab === "friends" ? items.filter(i => friendIds.includes(i.user_id)) : items;

    if (filter === "videos") filt = filt.filter(isHorizontalVideo);
    if (filter === "reels") filt = filt.filter(isReelItem);
    
    return filt;
  }, [items, filter, sourceTab, friendIds]);

  const searchParams = new URLSearchParams(location.search);
  const directPostId = searchParams.get("post");

  useEffect(() => {
    if (directPostId && !hasScrolled && filteredItems.length > 0) {
      const index = filteredItems.findIndex(item => item.id === directPostId);
      if (index !== -1) {
        setTimeout(() => {
          const card = document.getElementById(`feed-post-${directPostId}`);
          if (card && containerRef.current) {
            setIsSnapping(false);
            card.scrollIntoView({ behavior: "smooth", block: "center" });
            setVisibleIndex(index);
            setHasScrolled(true);
            
            window.history.replaceState({}, '', location.pathname);
            
            setTimeout(() => setIsSnapping(true), 800);
          } else {
             setHasScrolled(true);
          }
        }, 500); 
      } else {
        setHasScrolled(true);
      }
    }
  }, [directPostId, filteredItems, hasScrolled, location.pathname]);

  useEffect(() => {
    if (!containerRef.current || !isSnapping) return;

    const cards = containerRef.current.querySelectorAll("[data-card-index]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(
              (entry.target as HTMLElement).dataset.cardIndex || "0"
            );

            setVisibleIndex(index);

            if (index >= filteredItems.length - 2 && hasMore && !isFetching) {
              loadMore();
            }
          }
        });
      },
      { threshold: 0.6 }
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems, hasMore, isFetching, isSnapping]);

  const filterTabs = [
    { id: "all", label: "Todos", icon: Globe },
    { id: "videos", label: "Videos", icon: Video },
    { id: "reels", label: "Reels", icon: Music2 },
  ];

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-50px)] w-full relative overflow-hidden gap-2 pb-1 md:pb-2">
      <div className="bg-card border border-neon-orange/30 rounded-xl p-2.5 md:p-3 shrink-0 shadow-sm mt-1 mx-1 md:mx-2 relative overflow-hidden">
        
        {isFetching && page === 0 && (
          <div className="absolute top-0 left-0 w-full h-1 bg-neon-orange animate-pulse z-50" />
        )}

        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Music2 className="w-4 h-4" /> VIDEOS & REELS
        </h1>
        <p className="text-[10px] text-muted-foreground font-body">Videos horizontales y reels verticales de la comunidad</p>
      </div>

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1 flex-wrap items-center shrink-0 shadow-sm mx-1 md:mx-2 justify-between">
        <div className="flex flex-wrap gap-1 items-center">
          {filterTabs.map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setVisibleIndex(0); if(containerRef.current) containerRef.current.scrollTo({top:0, behavior:'smooth'})}} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all", filter === f.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <f.icon className="w-3 h-3" /> {f.label}
            </button>
          ))}
          {user && (
            <>
              <div className="w-px h-5 bg-border mx-1" />
              <button onClick={() => {setSourceTab(prev => prev === "friends" ? "all" : "friends"); setVisibleIndex(0); if(containerRef.current) containerRef.current.scrollTo({top:0, behavior:'smooth'})}} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-body transition-all", sourceTab === "friends" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")} title={sourceTab === "friends" ? "Mostrando solo amigos" : "Filtrar por amigos"}>
                <Users className="w-3 h-3" /> Amigos
              </button>
            </>
          )}
        </div>

        <div className="flex gap-1 bg-muted/50 p-0.5 rounded border border-border/50">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleSetSort('popular')} 
            className={cn("text-[10px] font-body h-7 px-3 transition-colors", sort === "popular" ? "bg-background text-neon-orange shadow-sm" : "text-muted-foreground hover:text-neon-orange")}
          >
             <Flame className={cn("w-3 h-3 mr-1", isFetching && sort === 'popular' && "animate-pulse")} /> Top
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleSetSort('new')} 
            className={cn("text-[10px] font-body h-7 px-3 transition-colors", sort === "new" ? "bg-background text-neon-cyan shadow-sm" : "text-muted-foreground hover:text-neon-cyan")}
          >
             <Sparkles className={cn("w-3 h-3 mr-1", isFetching && sort === 'new' && "animate-pulse")} /> Nuevos
          </Button>
        </div>
      </div>

      {filteredItems.length === 0 && !isFetching ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center shrink-0 shadow-sm mx-1 md:mx-2">
          <Ghost className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-xs text-muted-foreground font-body">No hay contenido en esta categoría. ¡Sé el primero!</p>
          <Button size="sm" asChild className="mt-3 text-xs rounded-lg">
            <Link to="/perfil?tab=social">Agregar Contenido</Link>
          </Button>
        </div>
      ) : (
        <div className="relative flex-1 min-h-0 w-full overflow-hidden">
          <div 
            ref={containerRef} 
            className={cn("h-full w-full relative z-0", isSnapping ? "snap-y snap-mandatory overflow-y-auto" : "overflow-hidden")} 
            style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
            
            {filteredItems.map((item, i) => (
              <div key={item.id} id={`feed-post-${item.id}`} data-card-index={i} className="h-full w-full snap-center snap-always">
                <SnapCard 
                  item={item} 
                  isVisible={i === visibleIndex} 
                  onPauseMusic={pauseMusic} 
                  isStaff={isStaff} 
                  onDeletePost={handleDeletePost} 
                  onEditPost={handleEditPost}
                  onHidePost={handleHidePost}
                  onSavePost={handleSaveToProfile}
                  onScrollUp={() => scrollContainer('up')} 
                  onScrollDown={() => scrollContainer('down')}
                  limits={{ maxForumChars: 500 }} 
                />
              </div>
            ))}

            {hasMore && filteredItems.length > 0 && (
              <div className="h-full w-full snap-center snap-always flex items-center justify-center bg-[#09090b]">
                <Loader2 className="animate-spin text-neon-cyan w-8 h-8 opacity-50" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}