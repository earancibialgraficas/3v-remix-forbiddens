import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { Instagram, Globe, Video, Image as ImageIcon, Users, ThumbsUp, ThumbsDown, Flag, MessageSquare, Send, Trash2, ChevronUp, ChevronDown, Reply, X, PlayCircle, Ghost, Bookmark, Shield, Ban, Copy, User as UserIcon, Flame, Sparkles, Edit2, Loader2, Minimize, RectangleHorizontal } from "lucide-react";
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

const formatFeedDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.toLocaleDateString()} a las ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
};

interface FeedItem {
  id: string;
  user_id: string;
  platform: string;
  content_url: string;
  image_url?: string;
  content_type: string;
  title: string | null;
  caption?: string | null; 
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

const getAdvancedEmbedUrl = (url: string, platform: string) => {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  let baseEmbed = url;

  if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
    let videoId = "";
    if (url.includes("youtu.be/")) videoId = url.split("youtu.be/")[1]?.split("?")[0];
    else if (url.includes("youtube.com/shorts/")) videoId = url.split("youtube.com/shorts/")[1]?.split("?")[0];
    else if (url.includes("v=")) videoId = url.split("v=")[1]?.split("&")[0];
    if (videoId) baseEmbed = `https://www.youtube.com/embed/${videoId}`;
  } else if (lowerUrl.includes("tiktok.com")) {
    const match = url.match(/video\/(\d+)/);
    if (match && match[1]) baseEmbed = `https://www.tiktok.com/embed/v2/${match[1]}`;
  } else if (lowerUrl.includes("instagram.com")) {
    const match = url.match(/(?:p|reel)\/([^/?#&]+)/);
    if (match && match[1]) baseEmbed = `https://www.instagram.com/p/${match[1]}/embed/?hidecaption=true`;
  } else if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch")) {
    const encodedUrl = encodeURIComponent(url);
    baseEmbed = `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&width=560`;
  }

  const connector = baseEmbed.includes('?') ? '&' : '?';
  if (baseEmbed !== url && platform === 'youtube') {
    return `${baseEmbed}${connector}autoplay=1&enablejsapi=1`;
  } else if (baseEmbed !== url) {
    return `${baseEmbed}${connector}autoplay=1`;
  }
  return baseEmbed;
};

const isVideoItem = (item: FeedItem | any) => {
  return item.content_type === 'video' || item.content_type === 'reel';
};

const isReelItem = (item: FeedItem) => {
  return item.content_type === 'reel';
};

const isHorizontalVideo = (item: FeedItem) => {
  return item.content_type === 'video';
};

function SnapCard({ 
  item, 
  isVisible, 
  onPauseMusic, 
  isStaff,
  globalCinemaMode,
  setGlobalCinemaMode,
  isMobileState,
  onDeletePost,
  onEditPost,
  onHidePost,
  onSavePost,
  onScrollUp,
  onScrollDown
}: { 
  item: FeedItem; 
  isVisible: boolean; 
  onPauseMusic: () => void;
  isStaff: boolean;
  globalCinemaMode: boolean;
  setGlobalCinemaMode: (val: boolean) => void;
  isMobileState: boolean;
  onDeletePost: (id: string, targetType: string) => void;
  onEditPost: (id: string, newTitle: string, targetType: string) => void;
  onHidePost: (id: string, targetType: string) => void;
  onSavePost: (item: FeedItem) => void;
  onScrollUp: () => void;
  onScrollDown: () => void;
}) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const userTier = (profile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const limits = isStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[userTier];

  const isOwner = user?.id === item.user_id;

  const isVideo = isVideoItem(item);
  const isDirectMp4 = !!item.content_url?.toLowerCase().match(/\.(mp4|webm|ogg)$/);
  
  const isInstagram = item.platform === 'instagram';
  const isInstagramReel = isInstagram && item.content_type === 'reel';
  const isPhoto = item.target_type === 'photo' || item.content_type === 'photo' || item.platform === 'upload' || (isInstagram && !isInstagramReel) || item.content_url?.match(/\.(jpeg|jpg|gif|png|webp)/i);
  
  // 🔥 MODO CINE INTELIGENTE 🔥
  // En PC se permite para TODO. En móvil solo si es Youtube o MP4.
  const canShowCinemaBtnMobile = item.platform === 'youtube' || (item.content_type === 'video' && isDirectMp4);
  const cinemaMode = globalCinemaMode && (!isMobileState || canShowCinemaBtnMobile);

  const embedUrl = isVisible ? getAdvancedEmbedUrl(item.content_url, item.platform) : "";
  const targetType = item.target_type || "social_content";
  
  const [scale, setScale] = useState(1);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const nativeVideoRef = useRef<HTMLVideoElement>(null);
  
  const [likes, setLikes] = useState(item.likes || 0);
  const [dislikes, setDislikes] = useState(item.dislikes || 0);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{id: string, name: string} | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportingComment, setReportingComment] = useState<{ userId: string; userName: string; commentId: string } | null>(null);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title || item.caption || "");
  const [mediaError, setMediaError] = useState(false);

  const [cinemaPanelOpen, setCinemaPanelOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);

  const votingRef = useRef(false);

  const getBaseSize = (platform: string, cType: string, url: string) => {
    if (platform === 'tiktok') return { w: 340, h: 605 };
    if (cType === 'reel' || url?.includes('shorts')) return { w: 324, h: 576 };
    return { w: 640, h: 360 };
  };

  useEffect(() => {
    if (nativeVideoRef.current && isDirectMp4) {
      if (isVisible) {
        nativeVideoRef.current.muted = false;
        const playPromise = nativeVideoRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (nativeVideoRef.current) {
              nativeVideoRef.current.muted = true; 
              nativeVideoRef.current.play().catch(e => console.error(e));
            }
          });
        }
        onPauseMusic();
      } else {
        nativeVideoRef.current.pause();
      }
    }
    if (isVisible && isVideo && !isDirectMp4) {
      onPauseMusic();
    }
  }, [isVisible, isVideo, isDirectMp4]);

  useEffect(() => {
    if (!videoContainerRef.current || !isVideo || isDirectMp4 || isPhoto) return;
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
  }, [item.platform, item.content_type, item.content_url, isVideo, isDirectMp4, isPhoto, cinemaMode]);

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

  let finalEmbedUrl = "";
  if (isVisible && embedUrl) {
    const connector = embedUrl.includes('?') ? '&' : '?';
    if (item.platform === 'youtube') {
      finalEmbedUrl = `${embedUrl}${connector}autoplay=1&enablejsapi=1`; 
    } else if (item.platform === 'facebook') {
      finalEmbedUrl = `${embedUrl}${connector}autoplay=1`;
    } else if (item.platform === 'tiktok') {
      finalEmbedUrl = `${embedUrl}${connector}autoplay=1`; 
    } else if (item.platform === 'instagram') {
      finalEmbedUrl = `${embedUrl}${connector}autoplay=1`;
    } else {
      finalEmbedUrl = embedUrl;
    }
  }

  const baseSize = getBaseSize(item.platform, item.content_type || '', item.content_url || '');
  const targetImgUrl = item.image_url || item.thumbnail_url || item.content_url || '';

  return (
    <div className={cn("snap-start snap-always w-full h-full flex-shrink-0 flex items-stretch relative overflow-hidden group/card transition-all duration-300", cinemaMode ? "px-0 lg:px-0 lg:gap-0" : "px-0 lg:px-2 lg:gap-3")}>
      
      {/* 🎬 ZONA DE VIDEO / MODO CINE 🎬 */}
      <div ref={videoContainerRef} className={cn("absolute inset-0 lg:relative flex items-center justify-center overflow-hidden z-0 transition-all duration-500", cinemaMode ? "w-full lg:w-full bg-black z-20" : "lg:flex-1 bg-[#09090b] lg:border border-border lg:rounded-xl shadow-md")}>

        {mediaError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
            <Ban className="w-12 h-12 text-destructive mb-3 animate-pulse" />
            <p className="text-white text-xs font-pixel text-center px-4 tracking-widest text-destructive">CONTENIDO NO DISPONIBLE</p>
            <p className="text-muted-foreground text-[10px] font-body text-center mt-2 max-w-[80%]">El enlace original está roto, fue eliminado o es privado.</p>
            {(isOwner || isStaff) && (
              <Button size="sm" variant="destructive" className="mt-5 text-xs font-body" onClick={() => onDeletePost(item.id, targetType)}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar publicación
              </Button>
            )}
          </div>
        )}

        {isPhoto ? (
          <div className="relative w-full h-full flex items-center justify-center group/ig z-10">
            <img 
              src={getSafeUrl(targetImgUrl)} 
              alt={item.title || "Imagen"} 
              referrerPolicy="no-referrer"
              className={cn("w-full h-full p-2 transition-transform duration-500", cinemaMode ? "object-contain scale-100" : "object-contain")} 
              onError={(e) => {
                if (e.currentTarget.src !== targetImgUrl) {
                  e.currentTarget.src = targetImgUrl;
                } else {
                  setMediaError(true);
                }
              }}
            />
            {isInstagram && (
              <a href={item.content_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover/ig:opacity-100 transition-opacity lg:rounded-xl">
                <Instagram className="w-12 h-12 text-white mb-2" />
                <span className="text-white font-pixel text-[10px] uppercase tracking-widest text-center px-4">Ver en Instagram</span>
              </a>
            )}
          </div>
        ) : isDirectMp4 ? (
          <video 
            ref={nativeVideoRef} 
            src={item.content_url} 
            controls 
            loop
            playsInline
            className="w-full h-full object-contain z-10 transition-transform duration-500" 
            onError={() => setMediaError(true)}
          />
        ) : finalEmbedUrl ? (
          <div className="absolute top-1/2 left-1/2 flex items-center justify-center transition-transform duration-500 origin-center z-10"
            style={{ width: `${baseSize.w}px`, height: `${baseSize.w === 640 ? 'auto' : baseSize.h + 'px'}`, aspectRatio: baseSize.w === 640 ? '16/9' : 'auto', transform: `translate(-50%, -50%) scale(${scale})` }}>
            <iframe 
              src={finalEmbedUrl} 
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; clipboard-write; gyroscope" 
              className={cn("w-full h-full bg-transparent outline-none shadow-2xl transition-all duration-500", !cinemaMode && "lg:rounded-xl", item.platform === 'instagram' ? "bg-white" : "")} 
              style={{ border: "none" }} 
              scrolling="no" 
              allowFullScreen 
            />
          </div>
        ) : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center gap-4 z-10">
            <PlayCircle className="w-16 h-16 text-neon-cyan animate-pulse" />
            <a href={item.content_url} target="_blank" rel="noopener" className="px-4 py-2 bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/40 border border-neon-cyan/50 rounded-lg text-[10px] uppercase font-pixel tracking-widest transition-colors">
              VER ENLACE EXTERNO
            </a>
          </div>
        )}

        {/* 🔥 BOTÓN TOGGLE MODO CINE (SÓLO PC - en móvil/tablet se activa rotando) 🔥 */}
        <button 
          onClick={(e) => { e.stopPropagation(); setGlobalCinemaMode(!globalCinemaMode); setCinemaPanelOpen(false); }} 
          className="hidden lg:flex absolute top-4 right-4 z-[100] p-2 bg-black/40 hover:bg-black/80 rounded-lg text-white backdrop-blur-md transition-all shadow-lg border border-white/10 group pointer-events-auto"
          title={cinemaMode ? "Salir del Modo Cine" : "Modo Cine"}
        >
           {cinemaMode ? <Minimize className="w-4 h-4 group-hover:scale-90 transition-transform"/> : <RectangleHorizontal className="w-4 h-4 group-hover:scale-110 transition-transform"/>}
        </button>

        {/* 🔥 BARRA INFERIOR ATENUADA EN MODO CINE (SÓLO PC) 🔥 */}
        <div className={cn(
             "hidden lg:flex absolute z-[100] transition-opacity duration-300 pointer-events-none",
             cinemaMode ? "opacity-30 hover:opacity-100" : "opacity-100",
             "bottom-0 left-0 w-full px-4 lg:px-8 pb-4 lg:pb-6 pt-24 items-end justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent flex-row",
             !cinemaMode && "lg:hidden"
        )}>
             
             {/* Avatar y Burbuja Glassmorphism (PC) */}
             <div className="relative pointer-events-auto group/bubble"
                  onMouseEnter={() => setShowBubble(true)}
                  onMouseLeave={() => setShowBubble(false)}>
                
                <div onClick={(e) => { e.stopPropagation(); setShowBubble(!showBubble); }} 
                     className="w-10 h-10 lg:w-12 lg:h-12 rounded-full border-2 border-white/20 overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)] cursor-pointer bg-muted hover:scale-105 transition-transform" style={getAvatarBorderStyle(item.color_avatar_border)}>
                   {item.avatar_url ? <img src={item.avatar_url} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-white" />}
                </div>

                <div className={cn("absolute transition-all duration-300 z-[120]",
                    showBubble ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none",
                    "bottom-full left-0 mb-3 origin-bottom-left"
                )}>
                   <div className="absolute bg-transparent bottom-[-16px] left-0 w-full h-4" />
                   
                   <div className="w-56 lg:w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-1">
                      <Link to={`/usuario/${item.user_id}`} onClick={e => e.stopPropagation()} className="text-neon-cyan text-[11px] lg:text-xs font-bold hover:underline block truncate" style={getNameStyle(item.color_name)}>{item.display_name}</Link>
                      <div className="text-[8px] lg:text-[9px] text-muted-foreground mb-1">{formatFeedDate(item.created_at)}</div>
                      <p className="text-[9px] lg:text-[10px] text-white/90 line-clamp-3 leading-snug mb-2">{item.caption || item.title || "Sin descripción."}</p>
                      <button onClick={(e) => { e.stopPropagation(); setCinemaPanelOpen(true); setShowBubble(false); }} className="w-full text-[9px] lg:text-[10px] text-neon-cyan font-bold bg-neon-cyan/10 border border-neon-cyan/30 py-1.5 rounded-lg hover:bg-neon-cyan/20 transition-colors">LEER MÁS</button>
                   </div>
                </div>
             </div>

             {/* Acciones Rápidas (PC) */}
             <div className={cn("flex items-center gap-2 lg:gap-3 pointer-events-auto absolute left-1/2 -translate-x-1/2 bottom-4 lg:bottom-6 flex-row", cinemaMode && "lg:gap-2 bottom-3 lg:bottom-3")}>
                <button onClick={(e) => { e.stopPropagation(); handleReaction("like"); }} className="flex flex-col items-center gap-0.5 group">
                   <div className={cn("rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors", cinemaMode ? "w-8 h-8 lg:w-9 lg:h-9" : "w-10 h-10 lg:w-12 lg:h-12")}>
                      <ThumbsUp className={cn("transition-transform group-active:scale-90", cinemaMode ? "w-3.5 h-3.5" : "w-4 h-4 lg:w-5 lg:h-5", userReaction === "like" ? "text-neon-green" : "text-white")} />
                   </div>
                   <span className={cn("text-white font-bold drop-shadow-md", cinemaMode ? "text-[9px]" : "text-[9px] lg:text-[11px]")}>{likes}</span>
                </button>

                <button onClick={(e) => { e.stopPropagation(); handleReaction("dislike"); }} className="flex flex-col items-center gap-0.5 group">
                   <div className={cn("rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors", cinemaMode ? "w-8 h-8 lg:w-9 lg:h-9" : "w-10 h-10 lg:w-12 lg:h-12")}>
                      <ThumbsDown className={cn("transition-transform group-active:scale-90", cinemaMode ? "w-3.5 h-3.5" : "w-4 h-4 lg:w-5 lg:h-5", userReaction === "dislike" ? "text-destructive" : "text-white")} />
                   </div>
                   <span className={cn("text-white font-bold drop-shadow-md", cinemaMode ? "text-[9px]" : "text-[9px] lg:text-[11px]")}>{dislikes}</span>
                </button>

                <button onClick={(e) => { e.stopPropagation(); setCinemaPanelOpen(true); }} className="flex flex-col items-center gap-0.5 group">
                   <div className={cn("rounded-full bg-black/50 backdrop-blur-md border border-neon-cyan/50 flex items-center justify-center hover:bg-black/80 transition-colors shadow-[0_0_15px_rgba(34,211,238,0.2)]", cinemaMode ? "w-8 h-8 lg:w-9 lg:h-9" : "w-10 h-10 lg:w-12 lg:h-12")}>
                      <MessageSquare className={cn("text-neon-cyan transition-transform group-active:scale-90", cinemaMode ? "w-3.5 h-3.5" : "w-4 h-4 lg:w-5 lg:h-5")} />
                   </div>
                   <span className={cn("text-white font-bold drop-shadow-md", cinemaMode ? "text-[9px]" : "text-[9px] lg:text-[11px]")}>{comments.length}</span>
                </button>

                {user && !isOwner && (
                   <button onClick={(e) => { e.stopPropagation(); setShowReport(true); }} className="flex flex-col items-center gap-0.5 group">
                      <div className={cn("rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors", cinemaMode ? "w-8 h-8 lg:w-9 lg:h-9" : "w-10 h-10 lg:w-12 lg:h-12")}>
                         <Flag className={cn("text-white transition-transform group-active:scale-90", cinemaMode ? "w-3.5 h-3.5" : "w-4 h-4 lg:w-5 lg:h-5")} />
                      </div>
                   </button>
                )}
             </div>

             {/* Subir / Bajar (PC) */}
             <div className="flex pointer-events-auto gap-2">
                <button onClick={(e) => { e.stopPropagation(); onScrollUp(); }} className={cn("rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors active:scale-95 group", cinemaMode ? "w-8 h-8 lg:w-9 lg:h-9" : "w-10 h-10 lg:w-12 lg:h-12")}>
                   <ChevronUp className={cn("text-white group-hover:text-neon-cyan transition-colors", cinemaMode ? "w-4 h-4" : "w-5 h-5 lg:w-6 lg:h-6")} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onScrollDown(); }} className={cn("rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors active:scale-95 group", cinemaMode ? "w-8 h-8 lg:w-9 lg:h-9" : "w-10 h-10 lg:w-12 lg:h-12")}>
                   <ChevronDown className={cn("text-white group-hover:text-neon-cyan transition-colors", cinemaMode ? "w-4 h-4" : "w-5 h-5 lg:w-6 lg:h-6")} />
                </button>
             </div>
        </div>
      </div>

      {/* 🔥 BOTONERA VERTICAL DERECHA (MÓVIL+TABLET - vertical compacta) 🔥 */}
      <div className={cn(
        "lg:hidden absolute right-1 top-1/2 -translate-y-1/2 z-[90] flex flex-col items-center justify-center gap-2.5 pointer-events-auto py-4 transition-opacity duration-300",
        cinemaMode ? "opacity-30 hover:opacity-100" : "opacity-100"
      )}>
        
        {/* Avatar + Burbuja Movil */}
        <div className="relative pointer-events-auto group/bubble"
             onMouseEnter={() => setShowBubble(true)}
             onMouseLeave={() => setShowBubble(false)}>
           
           <div onClick={(e) => { e.stopPropagation(); setShowBubble(!showBubble); }} 
                className="w-9 h-9 rounded-full border-2 border-white/20 overflow-hidden shadow-lg cursor-pointer bg-muted hover:scale-105 transition-transform" style={getAvatarBorderStyle(item.color_avatar_border)}>
              {item.avatar_url ? <img src={item.avatar_url} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-1.5 text-white" />}
           </div>

           <div className={cn("absolute transition-all duration-300 z-[120]",
               showBubble ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none",
               "right-full top-0 mr-3 origin-top-right"
           )}>
              <div className="absolute bg-transparent right-[-16px] top-0 w-4 h-full" />
              <div className="w-56 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-1">
                 <Link to={`/usuario/${item.user_id}`} onClick={e => e.stopPropagation()} className="text-neon-cyan text-[11px] font-bold hover:underline block truncate" style={getNameStyle(item.color_name)}>{item.display_name}</Link>
                 <div className="text-[8px] text-muted-foreground mb-1">{formatFeedDate(item.created_at)}</div>
                 <p className="text-[9px] text-white/90 line-clamp-3 leading-snug mb-2">{item.caption || item.title || "Sin descripción."}</p>
                 <button onClick={(e) => { e.stopPropagation(); setShowMobilePanel(true); setCinemaPanelOpen(true); setShowBubble(false); }} className="w-full text-[9px] text-neon-cyan font-bold bg-neon-cyan/10 border border-neon-cyan/30 py-1.5 rounded-lg hover:bg-neon-cyan/20 transition-colors">LEER MÁS</button>
              </div>
           </div>
        </div>

        {/* Likes */}
        <button onClick={(e) => { e.stopPropagation(); handleReaction("like"); }} className="flex flex-col items-center gap-0.5 group mt-1">
           <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors">
              <ThumbsUp className={cn("w-3.5 h-3.5 transition-transform group-active:scale-90", userReaction === "like" ? "text-neon-green" : "text-white")} />
           </div>
           <span className="text-white text-[9px] font-bold drop-shadow-md">{likes}</span>
        </button>

        {/* Dislikes */}
        <button onClick={(e) => { e.stopPropagation(); handleReaction("dislike"); }} className="flex flex-col items-center gap-0.5 group">
           <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors">
              <ThumbsDown className={cn("w-3.5 h-3.5 transition-transform group-active:scale-90", userReaction === "dislike" ? "text-destructive" : "text-white")} />
           </div>
           <span className="text-white text-[9px] font-bold drop-shadow-md">{dislikes}</span>
        </button>

        {/* Comments */}
        <button onClick={(e) => { e.stopPropagation(); setShowMobilePanel(true); setCinemaPanelOpen(true); }} className="flex flex-col items-center gap-0.5 group">
           <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-neon-cyan/50 flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:bg-black/80 transition-colors">
              <MessageSquare className="w-3.5 h-3.5 text-neon-cyan transition-transform group-active:scale-90" />
           </div>
           <span className="text-white text-[9px] font-bold drop-shadow-md">{comments.length}</span>
        </button>

        {/* Report */}
        {user && !isOwner && (
           <button onClick={(e) => { e.stopPropagation(); setShowReport(true); }} className="flex flex-col items-center gap-0.5 group mt-0.5">
              <div className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors">
                 <Flag className="w-3.5 h-3.5 text-white transition-transform group-active:scale-90" />
              </div>
           </button>
        )}

        {/* Flechas Subir/Bajar */}
        <div className="flex flex-col gap-1 mt-1.5">
           <button onClick={(e) => { e.stopPropagation(); onScrollUp(); }} className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-95 transition-transform hover:bg-black/80 group">
              <ChevronUp className="w-4 h-4 text-white group-hover:text-neon-cyan" />
           </button>
           <button onClick={(e) => { e.stopPropagation(); onScrollDown(); }} className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-95 transition-transform hover:bg-black/80 group">
              <ChevronDown className="w-4 h-4 text-white group-hover:text-neon-cyan" />
           </button>
        </div>
      </div>

      {/* OVERLAY TELA NEGRA PARA PANELES (Móvil y Cine, z-[60] detrás del panel) */}
      <div className={cn("fixed lg:absolute inset-0 bg-black/60 backdrop-blur-sm z-[300] lg:z-[60] transition-opacity duration-300", (showMobilePanel || cinemaPanelOpen) ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} onClick={(e) => { e.stopPropagation(); setShowMobilePanel(false); setCinemaPanelOpen(false); }} />
      
      {/* 📋 PANEL DERECHO — z-[310] en móvil para superponer floating chat 📋 */}
      <div className={cn(
        "flex flex-col gap-2 shrink-0 bg-background/95 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none border-border transition-transform duration-300 ease-out shadow-2xl z-[310] lg:z-[70]",
        cinemaMode 
          ? "fixed bottom-0 left-0 w-full h-[80%] rounded-t-2xl bg-card border-t p-4 lg:p-4" 
          : "fixed lg:relative top-0 right-0 h-full w-[85%] max-w-[320px] lg:w-[240px] lg:w-[260px] p-3 lg:p-0 border-l lg:border-none lg:shadow-none lg:pt-[50px]",
        cinemaMode && !cinemaPanelOpen ? "translate-y-full pointer-events-none" : "",
        cinemaMode && cinemaPanelOpen ? "translate-y-0" : "",
        !cinemaMode && !showMobilePanel ? "translate-x-full lg:translate-x-0" : "",
        !cinemaMode && showMobilePanel ? "translate-x-0" : ""
      )}>
        <div className="flex justify-between items-center mb-1 lg:hidden">
          <span className="font-pixel text-[11px] text-neon-cyan">{cinemaMode ? "DETALLES DEL POST" : "Detalles"}</span>
          <button onClick={() => {setShowMobilePanel(false); setCinemaPanelOpen(false);}} className="p-1.5 bg-muted/50 rounded-full text-muted-foreground hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {cinemaMode && (
          <div className="hidden lg:flex justify-between items-center mb-2">
            <span className="font-pixel text-xs text-neon-cyan">COMENTARIOS Y DETALLES</span>
            <button onClick={() => setCinemaPanelOpen(false)} className="p-1.5 hover:bg-muted/50 rounded-full text-muted-foreground transition-colors"><X className="w-5 h-5"/></button>
          </div>
        )}

        <div className="shrink-0 lg:p-2.5 p-3 border border-border bg-card/90 lg:bg-card lg:rounded-xl rounded-lg shadow-sm flex flex-col z-10 w-full">
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
                <button onClick={() => onSavePost(item)} className="p-1 text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/10 rounded transition-colors" title="Guardar">
                  <Bookmark className="w-3 h-3" />
                </button>
              )}
              {user && !isOwner && (
                <button onClick={() => setShowReport(true)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" title="Reportar">
                  <Flag className="w-3 h-3" />
                </button>
              )}
              {isOwner && (
                <>
                  <button onClick={() => setIsEditing(!isEditing)} className="p-1 text-muted-foreground hover:text-neon-yellow hover:bg-neon-yellow/10 rounded transition-colors" title="Editar">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => onDeletePost(item.id, targetType)} className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" title="Eliminar">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
              {isStaff && !isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 text-muted-foreground hover:text-neon-magenta hover:bg-neon-magenta/10 rounded transition-colors">
                      <Shield className="w-3 h-3" />
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
          
          <div className="hidden lg:flex items-center gap-3">
            <button onClick={() => handleReaction("like")} className={cn("flex items-center gap-1 text-[11px] font-body font-medium transition-all hover:scale-105", userReaction === "like" ? "text-neon-green" : "text-muted-foreground hover:text-neon-green")}>
              <ThumbsUp className="w-3.5 h-3.5" /> {likes}
            </button>
            <button onClick={() => handleReaction("dislike")} className={cn("flex items-center gap-1 text-[11px] font-body font-medium transition-all hover:scale-105", userReaction === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-destructive")}>
              <ThumbsDown className="w-3.5 h-3.5" /> {dislikes}
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-row gap-2 min-h-0 w-full">
          <div className="flex-1 flex flex-col bg-card/90 lg:bg-card border border-border lg:rounded-xl rounded-lg shadow-sm overflow-hidden min-w-0">
            <div className="shrink-0 px-2.5 py-2 border-b border-border text-[9px] font-pixel text-neon-cyan flex items-center gap-1 bg-muted/20">
              <MessageSquare className="w-2.5 h-2.5" /> COMENTARIOS ({comments.length})
            </div>
            {/* 🔥 overscroll-contain para arreglar el bug de arrastrar al video siguiente 🔥 */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-3 min-h-0 bg-background/50 overscroll-contain touch-pan-y" style={{ scrollbarWidth: 'none' }}>
              {comments.map(c => (
                <div key={c.id} id={`comment-${c.id}`} className={cn("group text-[10px] font-body flex items-start justify-between gap-2", c.parent_id && "ml-4 border-l border-border pl-2")}>
                  <div className="flex-1">
                    <span className="text-primary font-medium">{c.display_name}: </span>
                    <span className="text-foreground/90">{c.content}</span>
                    {user && (
                      <button onClick={() => setReplyTo({id: c.id, name: c.display_name || "Usuario"})} className="flex items-center gap-0.5 mt-1 text-[9px] text-muted-foreground hover:text-primary transition-colors">
                        <Reply className="w-2.5 h-2.5" /> Responder
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 items-center shrink-0">
                    {user && user.id !== c.user_id && (
                      <button onClick={() => setReportingComment({ userId: c.user_id, userName: c.display_name || "Anónimo", commentId: c.id })} className="text-muted-foreground hover:text-destructive transition-colors" title="Reportar comentario">
                        <Flag className="w-3 h-3" />
                      </button>
                    )}
                    {(isStaff || user?.id === c.user_id) && <button onClick={() => handleDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive" title="Eliminar"><Trash2 className="w-2.5 h-2.5" /></button>}
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-[10px] text-muted-foreground font-body text-center py-4 opacity-70">Aún no hay comentarios.</p>}
            </div>
            {user && (
              <div className="shrink-0 flex flex-col border-t border-border bg-card/90 lg:bg-card p-1.5 gap-1.5">
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

          {!cinemaMode && (
            <div className="hidden lg:flex flex-col gap-2 w-8 shrink-0 h-full">
              <button onClick={onScrollUp} className="flex-1 bg-card border-2 border-border hover:border-neon-cyan hover:bg-neon-cyan/5 rounded-xl flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[3px] transition-all group" title="Subir">
                <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-neon-cyan transition-colors" strokeWidth={3} />
                <div className="font-pixel text-[7px] text-muted-foreground group-hover:text-neon-cyan transition-colors flex flex-col items-center gap-[1px]"><span>S</span><span>U</span><span>B</span><span>I</span><span>R</span></div>
              </button>
              <button onClick={onScrollDown} className="flex-1 bg-card border-2 border-border hover:border-neon-cyan hover:bg-neon-cyan/5 rounded-xl flex flex-col items-center justify-center gap-1 shadow-[0_3px_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[3px] transition-all group" title="Bajar">
                <div className="font-pixel text-[7px] text-muted-foreground group-hover:text-neon-cyan transition-colors flex flex-col items-center gap-[1px]"><span>B</span><span>A</span><span>J</span><span>A</span><span>R</span></div>
                <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-neon-cyan transition-colors" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
      {showReport && <ReportModal reportedUserId={item.user_id} reportedUserName={item.display_name || "Anónimo"} postId={item.id} onClose={() => setShowReport(false)} />}
      {reportingComment && <ReportModal reportedUserId={reportingComment.userId} reportedUserName={reportingComment.userName} postId={item.id} commentId={reportingComment.commentId} contentLabel="Comentario" onClose={() => setReportingComment(null)} />}
    </div>
  );
}

export default function FeedPage() {
  const { user, pauseMusic, roles, isMasterWeb, isAdmin } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const { toast } = useToast();
  const location = useLocation();

  const [sort, setSort] = useState<'new' | 'popular'>('new');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [visibleIndex, setVisibleIndex] = useState(0);

  const [filter, setFilter] = useState<string>("all");
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isSnapping, setIsSnapping] = useState(true);

  // 🔥 ESTADOS GLOBALES DE MODO CINE Y BANNER 🔥
  const [showHeader, setShowHeader] = useState(true);
  const [globalCinemaMode, setGlobalCinemaMode] = useState(false);

  // Detector de Mobile para modo cine estricto
  const [isMobileState, setIsMobileState] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobileState(window.innerWidth < 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🎬 Auto-activar modo cine al rotar a landscape (sólo móvil/tablet)
  useEffect(() => {
    const handleOrientation = () => {
      if (window.innerWidth >= 1024) return; // PC: no auto-cine
      const isLandscape = window.matchMedia('(orientation: landscape)').matches;
      setGlobalCinemaMode(isLandscape);
    };
    handleOrientation();
    const mql = window.matchMedia('(orientation: landscape)');
    mql.addEventListener('change', handleOrientation);
    window.addEventListener('resize', handleOrientation);
    return () => {
      mql.removeEventListener('change', handleOrientation);
      window.removeEventListener('resize', handleOrientation);
    };
  }, []);

  const ITEMS_PER_PAGE = 15; 
  const containerRef = useRef<HTMLDivElement>(null);
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");

  // Ocultar banner a los 2 segundos exactos
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHeader(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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
        .order(orderCol, { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (err1) console.error("Error social_content:", err1);

      const { data: photos, error: err2 } = await supabase
        .from("photos")
        .select("*")
        .neq("is_banned", true)
        .order(orderCol, { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (err2) console.error("Error photos:", err2);

      let combined: FeedItem[] = [];

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

      if (photos) {
        combined = [
          ...combined,
          ...photos.map((p) => ({
            id: p.id,
            user_id: p.user_id,
            platform: 'upload',
            content_url: p.image_url,
            image_url: p.image_url,
            content_type: 'photo',
            title: p.caption,
            caption: p.caption,
            thumbnail_url: p.image_url,
            is_public: true,
            created_at: p.created_at || new Date().toISOString(),
            likes: p.likes || 0,
            dislikes: p.dislikes || 0,
            target_type: "photo"
          })).filter(p => p.created_at) 
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

      if ((content?.length || 0) < ITEMS_PER_PAGE && (photos?.length || 0) < ITEMS_PER_PAGE) {
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

  const handleSaveToProfile = async (item: FeedItem) => {
    if (!user) return;
    try { 
      const { error } = await supabase.from("saved_items" as any).insert({ 
        user_id: user.id, 
        item_type: item.target_type || 'social_content',
        original_id: item.id,
        title: item.caption || item.title || 'Publicación del Feed',
        thumbnail_url: item.image_url || item.thumbnail_url || item.content_url,
        redirect_url: '/social/feed?post=' + item.id
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

  const handleFilterChange = (val: string) => {
    if (val === "friends") {
      setFilter("all");
      setSourceTab("friends");
    } else {
      setFilter(val);
      setSourceTab("all");
    }
    setVisibleIndex(0);
    containerRef.current?.scrollTo({top:0, behavior:'smooth'});
  };

  const filteredItems = useMemo(() => {
    let filt = sourceTab === "friends" ? items.filter(i => friendIds.includes(i.user_id)) : items;

    if (filter === "videos") filt = filt.filter(isHorizontalVideo);
    if (filter === "reels") filt = filt.filter(isReelItem);
    if (filter === "photos") filt = filt.filter(i => i.content_type === 'photo');
    
    return filt;
  }, [items, filter, sourceTab, friendIds]);

  const searchParams = new URLSearchParams(location.search);
  const directPostId = searchParams.get("post") || searchParams.get("focus");
  const directCommentId = searchParams.get("comment");

  useEffect(() => {
    if (directPostId && !hasScrolled && filteredItems.length > 0) {
      const index = filteredItems.findIndex(item => item.id === directPostId);
      if (index !== -1) {
        let attempts = 0;
        const attemptScroll = () => {
          attempts++;
          const postElement = document.getElementById(`feed-post-${directPostId}`);
          if (postElement && containerRef.current) {
            
            containerRef.current.scrollTo({ top: postElement.offsetTop, behavior: "auto" });
            setVisibleIndex(index);
            setHasScrolled(true);
            
            const cardElement = postElement.firstElementChild as HTMLElement | null;
            if (cardElement) {
               cardElement.classList.add('arcade-report-highlight');
               setTimeout(() => cardElement.classList.remove('arcade-report-highlight'), 3500);
            }

            if (directCommentId) {
              let cAttempts = 0;
              const tryComment = () => {
                cAttempts++;
                const cEl = document.getElementById(`comment-${directCommentId}`);
                if (cEl) {
                  cEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  cEl.classList.add('arcade-report-highlight');
                  setTimeout(() => cEl.classList.remove('arcade-report-highlight'), 3500);
                } else if (cAttempts < 60) {
                  setTimeout(tryComment, 150);
                }
              };
              setTimeout(tryComment, 700);
            }

            window.history.replaceState({}, '', location.pathname);

          } else if (attempts < 50) {
            requestAnimationFrame(attemptScroll);
          } else {
            setHasScrolled(true);
          }
        };
        requestAnimationFrame(attemptScroll);
      } else if (hasMore && !isFetching) {
         loadMore(); 
      } else {
         setHasScrolled(true);
      }
    }
  }, [directPostId, directCommentId, filteredItems, hasScrolled, hasMore, isFetching]);

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

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-50px)] w-full relative overflow-hidden bg-background">
      
      {/* 🔥 BANNER AUTO-OCULTABLE A LOS 2 SEG (SOLO CELULAR/MÓVIL AFECTA EL LAYOUT) 🔥 */}
      <div className={cn("transition-all duration-700 overflow-hidden shrink-0 z-[150]", showHeader ? "max-h-[100px] opacity-100 pt-1 lg:pt-2 px-1 lg:px-2" : "max-h-0 opacity-0 pt-0 border-none")}>
        <div className="bg-card border border-neon-cyan/30 rounded-xl p-2.5 lg:p-3 shadow-sm relative">
          {isFetching && items.length === 0 && <div className="absolute top-0 left-0 w-full h-1 bg-neon-cyan animate-pulse z-50" />}
          <h1 className="font-pixel text-sm text-neon-cyan mb-1 flex items-center gap-2"><Globe className="w-4 h-4" /> FEED GLOBAL</h1>
          <p className="text-[10px] text-muted-foreground font-body">Todo el contenido social de la comunidad en un solo lugar</p>
        </div>
      </div>

      {/* 🔥 CONTENEDOR PRINCIPAL 🔥 */}
      <div className={cn(
        "w-full relative flex flex-col min-h-0 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "lg:flex-1", 
        "flex-1 mb-[20vh] lg:mb-0 landscape:mb-[5vh]" // Móvil: Deja 20% de margen abajo sin afectar al PC
      )}>
        
        {/* 🔥 FILTRO MÓVIL+TABLET (Vertical compacto, arriba del avatar derecho) 🔥 */}
        <div className="lg:hidden absolute top-2 right-1 z-[100] flex flex-col items-stretch gap-1 bg-black/50 border border-white/10 backdrop-blur-md rounded-lg p-1 shadow-lg w-[72px]">
          <div className="relative">
            <select 
              value={sourceTab === "friends" ? "friends" : filter} 
              onChange={e => handleFilterChange(e.target.value)} 
              className="w-full h-7 bg-muted/30 border border-transparent rounded text-[9px] font-body text-white font-bold outline-none appearance-none px-1.5 pr-5 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <option value="all">Todos</option>
              <option value="videos">Videos</option>
              <option value="reels">Reels</option>
              <option value="photos">Fotos</option>
              {user && <option value="friends">Amigos</option>}
            </select>
            <ChevronDown className="w-2.5 h-2.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/70" />
          </div>
          <div className="flex flex-col gap-0.5 bg-muted/40 p-0.5 rounded border border-white/10">
            <Button variant="ghost" size="sm" onClick={() => setSort('popular')} className={cn("text-[9px] font-body h-6 px-1 justify-center gap-1 transition-colors", sort === "popular" ? "bg-background text-neon-orange shadow-sm" : "text-white/70 hover:text-neon-orange")}>
               <Flame className={cn("w-2.5 h-2.5", isFetching && sort === 'popular' && "animate-pulse")} /> Top
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSort('new')} className={cn("text-[9px] font-body h-6 px-1 justify-center gap-1 transition-colors", sort === "new" ? "bg-background text-neon-cyan shadow-sm" : "text-white/70 hover:text-neon-cyan")}>
               <Sparkles className={cn("w-2.5 h-2.5", isFetching && sort === 'new' && "animate-pulse")} /> Nuevos
            </Button>
          </div>
        </div>

        {/* 🔥 FILTRO DESKTOP - 5px gap del card, en modo cine va arriba-izquierda atenuado 🔥 */}
        <div className={cn(
          "hidden lg:flex gap-1 bg-card border border-border rounded-xl p-1 items-center shadow-sm absolute z-20 w-[240px] lg:w-[260px] justify-between transition-all duration-300",
          globalCinemaMode 
            ? "left-2 top-2 opacity-40 hover:opacity-100 bg-black/50 border-white/10 backdrop-blur-md scale-90 origin-top-left" 
            : "right-2 top-[5px]"
        )}>
          <div className="relative group flex-1 min-w-[80px]">
            <select 
              value={sourceTab === "friends" ? "friends" : filter} 
              onChange={e => handleFilterChange(e.target.value)} 
              className={cn("w-full h-8 border rounded-lg text-[10px] font-body font-bold outline-none appearance-none px-2 pr-7 cursor-pointer transition-colors", globalCinemaMode ? "bg-black/40 border-white/10 text-white hover:bg-black/60" : "bg-muted/30 border-border text-foreground hover:bg-muted/50")}
            >
              <option value="all">Todos</option>
              <option value="videos">Videos</option>
              <option value="reels">Reels</option>
              <option value="photos">Imágenes</option>
              {user && <option value="friends">Amigos</option>}
            </select>
            <ChevronDown className={cn("w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none", globalCinemaMode ? "text-white/70" : "text-muted-foreground")} />
          </div>
          <div className={cn("flex gap-1 p-0.5 rounded border shrink-0", globalCinemaMode ? "bg-black/30 border-white/10" : "bg-muted/50 border-border/50")}>
            <Button variant="ghost" size="sm" onClick={() => setSort('popular')} className={cn("text-[10px] font-body h-7 px-2 transition-colors", sort === "popular" ? "bg-background text-neon-orange shadow-sm" : globalCinemaMode ? "text-white/70 hover:text-neon-orange" : "text-muted-foreground hover:text-neon-orange")}>
               <Flame className={cn("w-3 h-3 lg:mr-1", isFetching && sort === 'popular' && "animate-pulse")} /> <span>Top</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSort('new')} className={cn("text-[10px] font-body h-7 px-2 transition-colors", sort === "new" ? "bg-background text-neon-cyan shadow-sm" : globalCinemaMode ? "text-white/70 hover:text-neon-cyan" : "text-muted-foreground hover:text-neon-cyan")}>
               <Sparkles className={cn("w-3 h-3 lg:mr-1", isFetching && sort === 'new' && "animate-pulse")} /> <span>Nuevos</span>
            </Button>
          </div>
        </div>

        {filteredItems.length === 0 && !isFetching ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center shrink-0 shadow-sm mx-1 lg:mx-2 mt-[44px] lg:mt-[50px]">
            <Ghost className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-xs text-muted-foreground font-body">No hay contenido en esta categoría. ¡Sé el primero!</p>
            <Button size="sm" asChild className="mt-3 text-xs rounded-lg">
              <Link to="/perfil?tab=social">Agregar Contenido</Link>
            </Button>
          </div>
        ) : (
          <div className="relative flex-1 min-h-0 w-full overflow-hidden pt-0 lg:pt-0">
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
                    globalCinemaMode={globalCinemaMode}
                    setGlobalCinemaMode={setGlobalCinemaMode}
                    isMobileState={isMobileState}
                    onDeletePost={handleDeletePost} 
                    onEditPost={handleEditPost}
                    onHidePost={handleHidePost}
                    onSavePost={handleSaveToProfile}
                    onScrollUp={() => scrollContainer('up')} 
                    onScrollDown={() => scrollContainer('down')} 
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
    </div>
  );
}