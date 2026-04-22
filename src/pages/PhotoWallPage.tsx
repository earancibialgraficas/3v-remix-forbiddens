import { useState, useEffect, useRef } from "react";
import { Camera, ThumbsDown, ThumbsUp, Flag, Image as ImageIcon, Globe, Users, Trash2, MessageSquare, X, Reply, Send, Maximize2, Bookmark, ExternalLink, Zap, Loader2, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useFriendIds } from "@/hooks/useFriendIds";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ReportModal from "@/components/ReportModal";

interface SocialComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  parent_id?: string | null;
  display_name?: string;
  avatar_url?: string | null;
}

const membershipPhotoLimits: Record<string, number> = {
  novato: 15,
  entusiasta: 30,
  coleccionista: 50,
  "leyenda arcade": 100,
  "creador verificado": 200,
};

const APIFY_DAILY_LIMIT = 80;

const getEmbedUrl = (url: string, platform: string) => {
  if (platform === "instagram") {
    const igMatch = url.match(/instagram\.com\/(p|reel|reels)\/([\w-]+)/);
    if (igMatch) return `https://www.instagram.com/${igMatch[1]}/${igMatch[2]}/embed/?hidecaption=true`;
  }
  return null;
};

const isVideoItem = (item: any) => {
  const p = item.platform || '';
  const url = item.content_url || '';
  const cType = item.content_type || '';
  if (cType === 'video' || cType === 'reel') return true;
  if (p === 'youtube' || p === 'tiktok') return true;
  if (p === 'instagram' && (url.includes('/reel/') || url.includes('/reels/'))) return true;
  if (url.includes('shorts')) return true;
  return false;
};

const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('wsrv.nl')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

// 🔥 PALETA DE COLORES NEÓN PARA LAS FOTOS DE APIFY 🔥
const NEON_COLORS = ['#39ff14', '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00', '#ff00aa', '#ff5500'];

const getPhotoNeonStyle = (photo: any) => {
  if (!photo.is_apify) return {}; // Si no es de Apify, no hay marco
  // Asignamos un color fijo basado en los caracteres del ID de la foto
  const sum = String(photo.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = NEON_COLORS[sum % NEON_COLORS.length];
  return {
    borderColor: color,
    boxShadow: `0 0 15px ${color}60`,
  };
};

/* 🔥 COMPONENTE: TARJETA MINIATURA (3 COLUMNAS) 🔥 */
function PhotoCardMiniature({ photo, onReaction, onHide, onExpand, onSave, userReaction, isStaff }: any) {
  const { user } = useAuth();
  const targetUrl = photo.thumbnail_url || photo.image_url;
  const neonStyle = getPhotoNeonStyle(photo);

  return (
    <div 
      className={cn(
        "break-inside-avoid mb-4 relative group rounded-xl bg-[#09090b] cursor-pointer transition-all duration-300 overflow-hidden shadow-sm",
        photo.is_apify ? "border-2" : "border border-border/50 hover:border-neon-orange hover:shadow-[0_0_15px_rgba(255,107,0,0.3)]"
      )}
      style={neonStyle}
    >
      <div className="relative w-full h-full overflow-hidden rounded-xl bg-black">
        <img 
          src={getProxyUrl(targetUrl)} 
          alt={photo.caption || "Foto"} 
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className="w-full h-auto object-cover rounded-xl transition-transform duration-700 group-hover:scale-105" 
          loading="lazy" 
          onClick={onExpand}
          onError={(e) => {
            if (!e.currentTarget.src.includes('wsrv.nl')) return;
            e.currentTarget.src = targetUrl;
          }}
        />
        
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 rounded-xl" onClick={onExpand}>
          <div className="flex justify-between items-start">
            {isStaff && (
              <button 
                onClick={(e) => { e.stopPropagation(); onHide(photo.id, photo.target_type); }} 
                className="p-1.5 text-muted-foreground hover:text-destructive bg-black/40 rounded-lg backdrop-blur-sm transition-colors z-20" 
                title="Ocultar (Solo Staff)"
              >
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}
            
            {user && (
              <button 
                onClick={(e) => { e.stopPropagation(); onSave(photo.id); }} 
                className="p-1.5 text-muted-foreground hover:text-neon-cyan bg-black/40 rounded-lg backdrop-blur-sm transition-colors z-20 ml-auto" 
                title="Guardar"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-4">
             <Maximize2 className="w-8 h-8 text-white/50 mb-2 pointer-events-none" />
             <div className="flex items-center gap-4 text-white font-body text-xs">
                <button 
                  onClick={(e) => { e.stopPropagation(); onReaction(photo.id, "like", photo.target_type); }} 
                  className={cn("flex items-center gap-1.5 transition-transform hover:scale-105 z-20", userReaction === "like" ? "text-neon-green" : "text-white hover:text-neon-green")}
                >
                   <ThumbsUp className={cn("w-4 h-4", userReaction === "like" && "fill-current")} /> {photo.likes}
                </button>
                <span className="flex items-center gap-1.5 pointer-events-none"><MessageSquare className="w-4 h-4" /></span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 🔥 COMPONENTE: TARJETA EXPANDIDA (DISEÑO 60/40) 🔥 */
function ExpandedPhotoCard({ photo, onClose, onReaction, onHide, onSave, userReaction, isStaff }: any) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{id: string, name: string} | null>(null);
  const [showReport, setShowReport] = useState(false);
  const targetUrl = photo.thumbnail_url || photo.image_url;
  const neonStyle = getPhotoNeonStyle(photo);

  const fetchComments = async () => {
    const { data: rawComments, error } = await supabase.from("social_comments").select("*").eq("content_id", photo.id).order("created_at", { ascending: true });
    if (error) return;
    
    if (rawComments && rawComments.length > 0) {
      const userIds = [...new Set(rawComments.map((c: any) => c.user_id))];
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
      
      const pMap: Record<string, { display_name: string; avatar_url: string | null }> = {};
      if (profs) profs.forEach((p: any) => { pMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url }; });
      
      setComments(rawComments.map((c: any) => {
        const profileData = pMap[c.user_id];
        return { ...c, display_name: profileData ? profileData.display_name : "Anónimo", avatar_url: profileData ? profileData.avatar_url : null };
      }));
    } else {
      setComments([]);
    }
  };

  useEffect(() => { fetchComments(); }, [photo.id]);

  const handleSubmitComment = async () => {
    if (!user || !commentText.trim()) return;
    try {
      const { error } = await supabase.from("social_comments").insert({ 
        user_id: user.id, content_id: photo.id, content: replyTo ? `@${replyTo.name} ${commentText.trim()}` : commentText.trim(), parent_id: replyTo?.id || null 
      } as any);
      if (error) throw error;
      setCommentText(""); setReplyTo(null); fetchComments();
    } catch (e: any) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este comentario?")) return;
    try {
      await supabase.from("social_comments").delete().eq("id", commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast({ title: "Comentario eliminado" });
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const isEmbed = !photo.thumbnail_url && photo.target_type === 'social_content' && photo.platform === 'instagram' && !photo.content_url?.includes('.jpg') && !photo.content_url?.includes('.png');
  const embedSrc = isEmbed ? getEmbedUrl(photo.content_url, photo.platform) : null;

  return (
    // 🔥 TRANSICIÓN SUAVE Y LENTA AÑADIDA: animate-in fade-in zoom-in-95 duration-700 ease-out 🔥
    <div 
      id={`expanded-card-${photo.id}`} 
      className={cn(
        "col-span-full w-full bg-card rounded-xl overflow-hidden mb-6 flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-700 ease-out",
        photo.is_apify ? "border-2 shadow-2xl" : "border-2 border-neon-orange/50 shadow-[0_0_30px_rgba(255,107,0,0.2)]"
      )} 
      style={{ minHeight: '550px', columnSpan: 'all', ...neonStyle } as any}
    >
      
      {/* LADO IZQUIERDO: IMAGEN (60% ANCHO, 50vh ALTO) */}
      <div className="relative bg-black w-full md:w-[60%] flex flex-col items-center justify-center p-4 shrink-0 overflow-hidden h-[50vh]">
        {isEmbed && embedSrc ? (
           <iframe src={embedSrc} className="w-full h-full object-contain rounded animate-in fade-in duration-1000" allowFullScreen />
        ) : (
           <img 
             src={getProxyUrl(targetUrl)} 
             alt={photo.caption} 
             referrerPolicy="no-referrer"
             crossOrigin="anonymous"
             className="w-auto h-full max-w-full object-contain rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)] animate-in fade-in duration-1000" 
             onError={(e) => {
               if (!e.currentTarget.src.includes('wsrv.nl')) return;
               e.currentTarget.src = targetUrl;
             }}
           />
        )}
        <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-white/20 transition-colors"><X className="w-6 h-6" /></button>
      </div>

      {/* LADO DERECHO: PANEL SOCIAL (40% ANCHO, 50vh ALTO) */}
      <div className="w-full md:w-[40%] flex flex-col bg-background/95 backdrop-blur-md border-t md:border-t-0 md:border-l border-border shrink-0 h-[50vh]">
        
        <div className="p-4 border-b border-border flex items-center gap-3 bg-muted/10 shrink-0">
          <Avatar className="w-10 h-10 border border-neon-orange/30">
            <AvatarImage src={photo.profiles?.avatar_url} />
            <AvatarFallback className="font-pixel text-xs">?</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-foreground">{photo.profiles?.display_name || "Anónimo"}</p>
            <p className="text-[10px] text-muted-foreground font-body">{new Date(photo.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 retro-scrollbar">
          {photo.caption && <p className="text-xs leading-relaxed text-foreground/90 bg-white/5 p-3 rounded-lg border border-white/5 font-body italic">"{photo.caption}"</p>}
          
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 py-10 animate-pulse">
                <MessageSquare className="w-8 h-8 mb-2" />
                <p className="text-[10px] uppercase font-pixel">Sin comentarios aún</p>
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} className={cn("group flex items-start gap-2 text-[11px] font-body", c.parent_id && "ml-6 border-l border-white/10 pl-3")}>
                  <Avatar className="w-6 h-6 shrink-0 mt-1"><AvatarImage src={c.avatar_url || ""} /></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white/5 rounded-lg px-2.5 py-2 inline-block max-w-full">
                      <span className="text-primary font-bold block text-[10px] mb-0.5">{c.display_name}</span>
                      <span className="text-foreground/90 break-words">{c.content}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <button onClick={() => setReplyTo({id: c.id, name: c.display_name || "Usuario"})} className="text-[9px] text-muted-foreground hover:text-primary font-bold transition-colors">Responder</button>
                      {isStaff && <button onClick={() => handleDeleteComment(c.id)} className="text-[9px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/5 space-y-4 mt-auto shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              <button onClick={() => onReaction(photo.id, "like", photo.target_type)} className={cn("flex items-center gap-1.5 text-xs transition-transform hover:scale-110", userReaction === "like" ? "text-neon-green" : "text-muted-foreground hover:text-neon-green")}><ThumbsUp className={cn("w-4 h-4", userReaction === "like" && "fill-current")} /> {photo.likes}</button>
              <button onClick={() => onReaction(photo.id, "dislike", photo.target_type)} className={cn("flex items-center gap-1.5 text-xs transition-transform hover:scale-110", userReaction === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-destructive")}><ThumbsDown className={cn("w-4 h-4", userReaction === "dislike" && "fill-current")} /> {photo.dislikes}</button>
            </div>
            <div className="flex gap-3">
              {user && <button onClick={() => setShowReport(true)} className="text-muted-foreground hover:text-destructive" title="Reportar"><Flag className="w-4 h-4" /></button>}
              <button onClick={() => onSave(photo.id)} className="text-muted-foreground hover:text-neon-cyan" title="Guardar"><Bookmark className="w-4 h-4" /></button>
              {isStaff && <button onClick={() => onHide(photo.id, photo.target_type)} className="text-muted-foreground hover:text-destructive" title="Ocultar (Staff)"><Ban className="w-4 h-4" /></button>}
            </div>
          </div>

          {user ? (
            <div className="space-y-2">
              {replyTo && (
                 <div className="flex items-center justify-between bg-neon-orange/10 px-2 py-1 rounded text-[9px] text-neon-orange font-bold">
                   <span>Respondiendo a {replyTo.name}</span>
                   <button onClick={() => setReplyTo(null)} className="hover:text-white"><X className="w-3 h-3"/></button>
                 </div>
              )}
              <div className="flex gap-2">
                <Input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Escribe un comentario..." className="h-9 text-xs bg-black/40 border-border" />
                <Button onClick={handleSubmitComment} size="sm" className="bg-neon-orange text-black shrink-0 hover:bg-neon-orange/80"><Send className="w-4 h-4" /></Button>
              </div>
            </div>
          ) : <p className="text-[10px] text-center text-muted-foreground font-pixel uppercase py-2">Inicia sesión para interactuar</p>}
        </div>
      </div>
      {showReport && <ReportModal reportedUserId={photo.user_id} reportedUserName={photo.profiles?.display_name || "Anónimo"} onClose={() => setShowReport(false)} />}
    </div>
  );
}

export default function PhotoWallPage() {
  const { user, profile, roles, isMasterWeb, isAdmin } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const { toast } = useToast();
  
  const [photos, setPhotos] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userPhotoCount, setUserPhotoCount] = useState(0);
  const [dailyApifyCount, setDailyApifyCount] = useState(0);
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");
  const tier = profile?.membership_tier || "novato";
  const photoLimit = isStaff ? Infinity : (membershipPhotoLimits[tier] || 15);

  const fetchPhotosAndDaily = async () => {
    // 🔥 LÓGICA DE REINICIO A LA MEDIANOCHE (HORA CHILE) 🔥
    const getChileMidnightISO = () => {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' });
      const chileDateStr = formatter.format(now);
      // Esto crea un string ISO asumiendo UTC-4 (Horario estándar de Chile), 
      // así la base de datos contará desde las 00:00 de Chile con total precisión.
      return `${chileDateStr}T04:00:00.000Z`; 
    };

    const midnightChile = getChileMidnightISO();
    
    // Contamos extracciones de Apify desde la medianoche chilena
    const { count } = await supabase.from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('is_apify', true)
      .gte('created_at', midnightChile);
    
    setDailyApifyCount(count || 0);

    const { data: photosRes } = await supabase.from("photos").select("*").order("created_at", { ascending: false }).limit(50);
    const { data: socialRes } = await supabase.from("social_content").select("*").eq("is_public", true).order("created_at", { ascending: false }).limit(50);

    let combined: any[] = [];
    if (photosRes) {
      combined = [...combined, ...photosRes.map((p: any) => ({ ...p, target_type: 'photo' }))];
    }
    
    if (socialRes) {
      const socialImages = socialRes.filter((item: any) => !isVideoItem(item)).map((item: any) => ({
        ...item, id: item.id, target_type: 'social_content',
        image_url: item.thumbnail_url || item.content_url,
        caption: item.title || "",
        platform: item.platform
      }));
      combined = [...combined, ...socialImages];
    }
    
    if (combined.length === 0) {
      setPhotos([]);
      return;
    }

    combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const userIds = [...new Set(combined.map((c: any) => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
    
    const profileMap: Record<string, any> = {};
    profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

    const photosWithProfiles = combined.map((p: any) => ({
      ...p,
      profiles: profileMap[p.user_id] || { display_name: "Anónimo", avatar_url: null }
    }));

    setPhotos(photosWithProfiles.slice(0, 50));

    if (user) {
      const { data: reactions } = await supabase.from("social_reactions").select("target_id, reaction_type").eq("user_id", user.id);
      const rMap: Record<string, string> = {};
      reactions?.forEach((r: any) => { rMap[r.target_id] = r.reaction_type; });
      setUserReactions(rMap);
      
      supabase.from("photos").select("id", { count: "exact" }).eq("user_id", user.id).then(({ count }) => setUserPhotoCount(count || 0));
    }
  };

  useEffect(() => { fetchPhotosAndDaily(); }, [user]);

  const handleUpload = async () => {
    if (!user || !imageUrl.trim()) return;
    
    if (!isStaff && dailyApifyCount >= APIFY_DAILY_LIMIT) {
       toast({ title: "Servidor Lleno", description: "Se han agotado los cupos de extracción para el día de hoy.", variant: "destructive" });
       return;
    }

    setUploading(true);
    let finalUrl = imageUrl.trim();
    let usedApify = false;

    if (finalUrl.includes("instagram.com")) {
      try {
        const { data, error } = await supabase.functions.invoke('extract-instagram', { body: { url: finalUrl } });
        if (!error && data?.imageUrl) {
          finalUrl = data.imageUrl;
          usedApify = true;
        }
      } catch (err) { console.error("Error extrayendo de IG:", err); }
    }

    const { error } = await supabase.from("photos").insert({ 
      id: crypto.randomUUID(), 
      user_id: user.id, 
      image_url: finalUrl, 
      caption: caption.trim(),
      is_apify: usedApify 
    } as any);

    if (!error) {
      setCaption(""); setImageUrl(""); setShowUpload(false);
      fetchPhotosAndDaily();
      toast({ title: usedApify ? "¡Extracción Exitosa!" : "Foto subida con éxito" });
    } else {
      toast({ title: "Error al publicar", description: error.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleReaction = async (itemId: string, type: string, targetType: string) => {
    if (!user) return;
    const table = targetType === "photo" ? "photos" : "social_content";
    const current = photos.find(p => p.id === itemId);
    if (!current) return;
    
    let newLikes = current.likes || 0;
    if (userReactions[itemId] === type) {
      await supabase.from("social_reactions").delete().eq("user_id", user.id).eq("target_id", itemId);
      newLikes = type === "like" ? newLikes - 1 : newLikes;
    } else {
      await supabase.from("social_reactions").upsert({ user_id: user.id, target_id: itemId, reaction_type: type, target_type: targetType });
      newLikes = type === "like" ? newLikes + 1 : (userReactions[itemId] === "like" ? newLikes - 1 : newLikes);
    }
    
    await supabase.from(table).update({ likes: Math.max(0, newLikes) }).eq("id", itemId);
    fetchPhotosAndDaily();
  };

  const handleHide = async (id: string, targetType: string) => {
    if (confirm("¿Ocultar esta imagen al público? El dueño podrá hablar con el Staff para recuperarla.")) {
      const table = targetType === "photo" ? "photos" : "social_content";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (!error) {
        toast({ title: "La imagen ha sido ocultada por el Staff." });
        fetchPhotosAndDaily();
        setExpandedPhotoId(null);
      }
    }
  };

  const handleSaveToProfile = async (photoId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("saved_photos" as any).insert({ user_id: user.id, photo_id: photoId });
      toast({ title: error ? "Ya está en tu colección" : "Guardada en tu perfil" });
    } catch (e) { console.error(e); }
  };

  const displayPhotos = sourceTab === "friends" ? photos.filter(p => friendIds.includes(p.user_id)) : photos;
  const uploadPercentage = Math.min(100, (dailyApifyCount / APIFY_DAILY_LIMIT) * 100);

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-[1200px] mx-auto px-4">
      
      <div className="bg-card border border-neon-orange/30 rounded-xl p-4 shadow-lg text-center md:text-left">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center justify-center md:justify-start gap-2">
          <Camera className="w-4 h-4" /> MURO FOTOGRÁFICO
        </h1>
        <p className="text-[10px] text-muted-foreground font-body uppercase tracking-tight">Galería de la comunidad — Haz clic para expandir</p>
      </div>

      {/* 🔥 BARRA DE CAPACIDAD: STICKY TOP-0 🔥 */}
      <div className="sticky top-0 z-[100] py-2 bg-background/80 backdrop-blur-md">
        <div className="bg-black/60 border border-neon-cyan/40 rounded-xl p-3 shadow-neon-sm">
           <div className="flex justify-between items-end mb-1.5 font-pixel">
             <div className="flex items-center gap-1.5">
               <Zap className={cn("w-3.5 h-3.5", dailyApifyCount >= APIFY_DAILY_LIMIT ? "text-destructive" : "text-neon-cyan")} />
               <span className="text-[9px] uppercase tracking-widest text-foreground">Capacidad Diaria del Servidor</span>
             </div>
             <span className="text-[11px] text-neon-cyan">{dailyApifyCount} / {APIFY_DAILY_LIMIT}</span>
           </div>
           <div className="w-full h-2 bg-muted rounded-full overflow-hidden relative">
             <div className={cn("h-full transition-all duration-1000", dailyApifyCount >= APIFY_DAILY_LIMIT ? "bg-destructive" : "bg-neon-cyan")} style={{ width: `${uploadPercentage}%` }} />
           </div>
        </div>
      </div>

      <div className="flex justify-between items-center bg-card/30 p-2 rounded-lg border border-border/50">
        <div className="flex gap-1">
          <Button onClick={() => setSourceTab("all")} variant="ghost" size="sm" className={cn("text-[10px] uppercase font-pixel", sourceTab === "all" ? "text-white" : "opacity-50")}><Globe className="w-3 h-3 mr-1" /> Todos</Button>
          <Button onClick={() => setSourceTab("friends")} variant="ghost" size="sm" className={cn("text-[10px] uppercase font-pixel", sourceTab === "friends" ? "text-white" : "opacity-50")}><Users className="w-3 h-3 mr-1" /> Amigos</Button>
        </div>
        <Button size="sm" className="bg-neon-orange text-black hover:bg-neon-orange/80 h-8 text-[10px] uppercase font-pixel" onClick={() => setShowUpload(!showUpload)} disabled={dailyApifyCount >= APIFY_DAILY_LIMIT && !isStaff}>
          <Camera className="w-3 h-3 mr-1" /> {dailyApifyCount >= APIFY_DAILY_LIMIT && !isStaff ? "Servidor Lleno" : "Subir Foto"}
        </Button>
      </div>

      {showUpload && (
        <div className="bg-card border border-neon-orange/30 rounded-xl p-4 space-y-3 animate-fade-in shadow-xl mx-2 md:mx-0">
          <Input placeholder="URL de imagen o Link de Instagram" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="h-9 bg-black/40 text-xs border-border font-body" />
          <Textarea placeholder="Escribe una descripción..." value={caption} onChange={e => setCaption(e.target.value)} className="bg-black/40 text-xs min-h-[60px] border-border font-body" />
          <div className="flex justify-end gap-2 items-center">
             {uploading && <Loader2 className="w-4 h-4 animate-spin text-neon-orange mr-2" />}
             <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>Cancelar</Button>
             <Button size="sm" onClick={handleUpload} disabled={uploading || !imageUrl.trim()} className="bg-neon-orange text-black">Publicar Foto</Button>
          </div>
        </div>
      )}

      {/* 🔥 GRILLA PINTEREST: ESTRICTAMENTE 3 COLUMNAS 🔥 */}
      <div className="columns-3 gap-4 px-2 md:px-0 relative">
        {displayPhotos.map(photo => (
          <div key={`${photo.target_type}-${photo.id}`}>
            {expandedPhotoId === photo.id ? (
              <ExpandedPhotoCard 
                photo={photo} 
                onClose={() => setExpandedPhotoId(null)}
                onReaction={handleReaction}
                onHide={handleHide}
                onSave={handleSaveToProfile}
                userReaction={userReactions[photo.id]}
                isStaff={isStaff}
              />
            ) : (
              <PhotoCardMiniature
                photo={photo}
                onExpand={() => {
                  setExpandedPhotoId(photo.id);
                  // 🔥 SCROLL CENTRADO SUAVE 🔥
                  setTimeout(() => {
                    const el = document.getElementById(`expanded-card-${photo.id}`);
                    if (el) {
                      const rect = el.getBoundingClientRect();
                      const absoluteTop = rect.top + window.pageYOffset;
                      const middle = absoluteTop - (window.innerHeight / 2) + (rect.height / 2);
                      window.scrollTo({ top: middle, behavior: 'smooth' });
                    }
                  }, 100);
                }}
                onReaction={handleReaction}
                onHide={handleHide}
                onSave={handleSaveToProfile}
                userReaction={userReactions[photo.id]}
                isStaff={isStaff}
              />
            )}
          </div>
        ))}
      </div>

      {displayPhotos.length === 0 && (
        <div className="py-20 text-center opacity-30">
          <ImageIcon className="w-16 h-16 mx-auto mb-4" />
          <p className="font-pixel text-xs uppercase">No hay fotos para mostrar</p>
        </div>
      )}
    </div>
  );
}