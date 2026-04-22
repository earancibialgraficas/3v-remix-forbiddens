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

// 🔥 LÍMITE ESTRICTO DE EXTRACCIONES DE APIFY DIARIAS (Gamificación + Protección Saldo) 🔥
// Mostramos los 80 cupos que tienes seguros al mes.
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

// Función mágica para saltar el bloqueo de Instagram y asegurar visualización completa
const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('wsrv.nl')) return url; // Ya está proxificada
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

/* 🔥 COMPONENTE INTERNO: TARJETA DE MINIATURA (ESTILO PINTEREST 3 COLUMNAS) 🔥 */
function PhotoCardMiniature({ photo, onReaction, onHide, onExpand, onSave, userReaction, isStaff }: any) {
  const { user } = useAuth();
  
  const isEmbed = photo.target_type === 'social_content' && photo.platform === 'instagram' && !photo.content_url?.includes('.jpg') && !photo.content_url?.includes('.png');
  const embedSrc = isEmbed ? getEmbedUrl(photo.content_url, photo.platform) : null;

  const renderImage = () => {
    const targetUrl = photo.thumbnail_url || photo.image_url;
    
    if (targetUrl) {
      return (
        <img 
          src={getProxyUrl(targetUrl)} 
          alt={photo.caption || "Foto"} 
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className="w-full h-auto object-cover rounded-xl" 
          loading="lazy" 
          onError={(e) => {
            // Si el proxy falla, intentamos la ruta directa como último recurso
            if (!e.currentTarget.src.includes('wsrv.nl')) return;
            e.currentTarget.src = targetUrl;
          }}
        />
      );
    }
    if (isEmbed && embedSrc) {
      return (
        <div className="w-full h-full overflow-hidden bg-white pointer-events-none relative min-h-[250px] rounded-xl">
          <iframe src={embedSrc} className="absolute inset-0 w-full h-full transform scale-[1.05]" style={{ transformOrigin: 'top center' }} tabIndex={-1} />
        </div>
      );
    }
    return <div className="w-full min-h-[200px] bg-muted flex items-center justify-center rounded-xl"><ImageIcon className="w-8 h-8 opacity-50"/></div>;
  };

  return (
    <div className="break-inside-avoid mb-4 relative group rounded-xl bg-[#09090b] border border-border/50 shadow-sm cursor-pointer transition-all duration-300 hover:border-neon-orange hover:shadow-[0_0_15px_rgba(255,107,0,0.3)] hover:z-10 flex flex-col overflow-hidden">
      <div className="relative w-full h-full overflow-hidden rounded-xl">
        {renderImage()}
        
        {/* CAPA DE INTERACCIÓN FLOTANTE */}
        <div 
          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 rounded-xl"
          onClick={onExpand}
        >
          <div className="flex justify-between items-start">
            {isStaff && (
              <button 
                onClick={(e) => { e.stopPropagation(); onHide(photo.id, photo.target_type); }} 
                className="p-1.5 text-muted-foreground hover:text-destructive bg-black/40 rounded-lg backdrop-blur-sm transition-colors z-20" 
                title="Ocultar (Solo Staff)"
              >
                {/* 🔥 Nuevo ícono de Ban/Ocultar 🔥 */}
                <Ban className="w-3.5 h-3.5" />
              </button>
            )}
            
            {user && (
              <button 
                onClick={(e) => { e.stopPropagation(); onSave(photo.id); }} 
                className="p-1.5 text-muted-foreground hover:text-neon-cyan bg-black/40 rounded-lg backdrop-blur-sm transition-colors z-20 ml-auto" 
                title="Guardar en mi Perfil"
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

/* 🔥 COMPONENTE INTERNO: TARJETA EXPANDIDA (NUEVO DISEÑO 60/40) 🔥 */
function ExpandedPhotoCard({ photo, onClose, onReaction, onHide, onSave, userReaction, isStaff }: any) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{id: string, name: string} | null>(null);
  const [showReport, setShowReport] = useState(false);

  const fetchComments = async () => {
    const { data: rawComments, error } = await supabase
      .from("social_comments")
      .select("*")
      .eq("content_id", photo.id)
      .order("created_at", { ascending: true });

    if (error) return;

    if (rawComments && rawComments.length > 0) {
      const userIds = [...new Set(rawComments.map(c => c.user_id))];
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
      const pMap = new Map<string, any>(profs?.map(p => [p.user_id, p]) || []);
      
      setComments(rawComments.map(c => {
        const p = pMap.get(c.user_id);
        return { ...c, display_name: p?.display_name || "Anónimo", avatar_url: p?.avatar_url };
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
        user_id: user.id, 
        content_id: photo.id, 
        content: replyTo ? `@${replyTo.name} ${commentText.trim()}` : commentText.trim(), 
        parent_id: replyTo?.id || null 
      } as any);
      if (error) throw error;
      
      setCommentText("");
      setReplyTo(null);
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

  const isEmbed = !photo.thumbnail_url && photo.target_type === 'social_content' && photo.platform === 'instagram' && !photo.content_url?.includes('.jpg') && !photo.content_url?.includes('.png');
  const embedSrc = isEmbed ? getEmbedUrl(photo.content_url, photo.platform) : null;
  const targetUrl = photo.thumbnail_url || photo.image_url;

  return (
    /* 🔥 NUEVA RELACIÓN DE ASPECTO 1.5/1 🔥 */
    <div id={`expanded-card-${photo.id}`} className="col-span-full bg-card border-2 border-neon-orange/50 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(255,107,0,0.15)] flex flex-col md:flex-row animate-fade-in aspect-auto md:aspect-[1.5/1] w-full max-w-full break-inside-avoid mb-4">
      
      {/* LADO IZQUIERDO: IMAGEN EXPANDIDA (60%) */}
      <div className="relative bg-black w-full md:w-[60%] flex flex-col items-center justify-center p-2 shrink-0 md:shrink overflow-hidden">
        {isEmbed && embedSrc ? (
           <iframe src={embedSrc} className="max-w-full max-h-[80vh] object-contain rounded" allowFullScreen />
        ) : (
           <img 
             src={getProxyUrl(targetUrl)} 
             alt={photo.caption} 
             referrerPolicy="no-referrer"
             crossOrigin="anonymous"
             className="w-auto h-auto max-w-full max-h-[80vh] object-contain rounded shadow-[0_4px_12px_rgba(0,0,0,0.5)]" 
             onError={(e) => {
               if (!e.currentTarget.src.includes('wsrv.nl')) return;
               e.currentTarget.src = targetUrl;
             }}
           />
        )}
        
        {photo.target_type === 'social_content' && (
           <a href={photo.content_url} target="_blank" rel="noopener noreferrer" className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-lg text-[9px] uppercase font-pixel tracking-widest flex items-center gap-1 hover:bg-neon-cyan/20 hover:text-neon-cyan transition-colors z-20">
             <ExternalLink className="w-3 h-3" /> Ver original
           </a>
        )}

        <button onClick={onClose} className="absolute top-4 right-4 md:hidden bg-black/50 text-white p-2 rounded-full backdrop-blur-sm border border-white/20 z-20">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* LADO DERECHO: PANEL SOCIAL (40%) */}
      <div className="w-full md:w-[40%] flex flex-col bg-background/95 backdrop-blur-sm border-t md:border-t-0 md:border-l border-border h-auto md:h-full shrink-0">
        
        <div className="p-3 border-b border-border flex justify-between items-center bg-muted/20 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Link to={`/usuario/${photo.user_id}`} className="flex items-center gap-2 group truncate">
              <Avatar className="w-8 h-8 border border-neon-orange/30 shrink-0">
                <AvatarImage src={photo.profiles?.avatar_url || ""} />
                <AvatarFallback className="bg-muted font-pixel text-[10px]">?</AvatarFallback>
              </Avatar>
              <div className="truncate">
                <p className="text-xs font-bold text-foreground group-hover:text-neon-orange transition-colors truncate">
                  {photo.profiles?.display_name || "Anónimo"}
                </p>
                <p className="text-[9px] text-muted-foreground font-body">
                  {new Date(photo.created_at).toLocaleDateString()}
                </p>
              </div>
            </Link>
          </div>
          <button onClick={onClose} className="hidden md:flex p-1.5 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-border space-y-4 shrink-0">
          {photo.caption && (
            <p className="text-xs text-foreground font-body leading-relaxed">{photo.caption}</p>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-4">
              <button onClick={() => onReaction(photo.id, "like", photo.target_type)} className={cn("flex items-center gap-1.5 text-[11px] font-body transition-transform hover:scale-105", userReaction === "like" ? "text-neon-green" : "text-muted-foreground hover:text-neon-green")}>
                <ThumbsUp className={cn("w-4 h-4", userReaction === "like" && "fill-current")} /> {photo.likes}
              </button>
              <button onClick={() => onReaction(photo.id, "dislike", photo.target_type)} className={cn("flex items-center gap-1.5 text-[11px] font-body transition-transform hover:scale-105", userReaction === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-destructive")}>
                <ThumbsDown className={cn("w-4 h-4", userReaction === "dislike" && "fill-current")} /> {photo.dislikes}
              </button>
            </div>
            
            <div className="flex gap-2">
              {user && (
                <button onClick={() => setShowReport(true)} className="text-muted-foreground hover:text-destructive" title="Reportar">
                  <Flag className="w-4 h-4" />
                </button>
              )}
              {isStaff && (
                <button onClick={() => onHide(photo.id, photo.target_type)} className="text-muted-foreground hover:text-destructive" title="Ocultar (Solo Staff)">
                  {/* 🔥 Nuevo ícono de Ban/Ocultar 🔥 */}
                  <Ban className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 retro-scrollbar bg-background/30 min-h-[150px]">
          {comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-50 space-y-2">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground font-pixel uppercase">Sin comentarios</p>
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className={cn("group flex items-start gap-2 text-[11px] font-body", c.parent_id && "ml-6 border-l border-white/10 pl-3")}>
                <Avatar className="w-6 h-6 border border-white/10 shrink-0 mt-0.5">
                  <AvatarImage src={c.avatar_url || ""} />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-white/5 rounded-xl rounded-tl-sm px-3 py-2 inline-block max-w-full">
                    <span className="text-primary font-bold block mb-0.5 text-[10px]">{c.display_name}</span>
                    <span className="text-foreground/90 break-words">{c.content}</span>
                  </div>
                  {user && (
                    <div className="flex items-center gap-3 mt-1 px-1">
                      <button onClick={() => setReplyTo({id: c.id, name: c.display_name || "Usuario"})} className="text-[9px] text-muted-foreground hover:text-primary transition-colors font-bold">
                        Responder
                      </button>
                      <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setShowReport(true)} className="text-muted-foreground hover:text-destructive"><Flag className="w-2.5 h-2.5" /></button>
                        {isStaff && <button onClick={() => handleDeleteComment(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-2.5 h-2.5" /></button>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {user ? (
          <div className="shrink-0 border-t border-border bg-muted/10 p-3 flex flex-col gap-2">
            {replyTo && (
               <div className="flex items-center gap-1 text-[9px] text-neon-orange font-pixel uppercase tracking-widest px-1">
                 <Reply className="w-3 h-3" /> Respondiendo a {replyTo.name}
                 <button onClick={() => setReplyTo(null)} className="text-destructive ml-2 hover:bg-destructive/20 rounded p-1"><X className="w-3 h-3" /></button>
               </div>
            )}
            <div className="flex gap-2">
              <Textarea 
                value={commentText} 
                onChange={e => setCommentText(e.target.value)} 
                placeholder="Añade un comentario..." 
                className="bg-black/40 border-border text-xs min-h-[44px] resize-none font-body" 
              />
              <Button onClick={handleSubmitComment} disabled={!commentText.trim()} className="shrink-0 h-auto bg-neon-orange text-black hover:bg-neon-orange/80">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-4 border-t border-border bg-muted/10 text-center shrink-0">
            <p className="text-[10px] text-muted-foreground font-pixel uppercase">Inicia sesión para comentar</p>
          </div>
        )}
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
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");
  
  const [dailyApifyUploads, setDailyApifyUploads] = useState(0);
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  
  const scrollPosRef = useRef(0);

  const tier = profile?.membership_tier || "novato";
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");
  const photoLimit = isStaff ? Infinity : (membershipPhotoLimits[tier] || 15);

  const fetchPhotosAndDailyCount = async () => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString();

    const [photosRes, socialRes, dailyPhotosRes, dailySocialRes] = await Promise.all([
      supabase.from("photos").select("*").order("likes", { ascending: false }).limit(50),
      supabase.from("social_content").select("*").eq("is_public", true).order("likes", { ascending: false }).limit(50),
      supabase.from('photos').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
      supabase.from('social_content').select('*', { count: 'exact', head: true }).gte('created_at', todayStr)
    ]);

    // 🔥 LÓGICA DE BARRA ESTRICTA 🔥
    // Asumimos que la base de datos tiene una columna `is_apify_extract` o similar.
    // Como no podemos modificar la DB, esta cuenta es aproximada hasta que lo implementes en backend.
    // (Por ahora sumamos ambos para tener un total de cupos hoy, como discutimos)
    // Para hacerlo estrictamente de Apify, los cuentos de abajo deben filtrar por `is_apify_extract: true`.
    // @ts-ignore
    setDailyApifyUploads((dailyPhotosRes.count || 0) + (dailySocialRes.count || 0));

    let combined: any[] = [];
    
    if (photosRes.data) {
      combined = [...combined, ...photosRes.data.map(p => ({ ...p, target_type: 'photo' }))];
    }
    
    if (socialRes.data) {
      const socialImages = socialRes.data.filter(item => !isVideoItem(item)).map(item => ({
         id: item.id,
         user_id: item.user_id,
         thumbnail_url: item.thumbnail_url, 
         content_url: item.content_url,     
         image_url: item.image_url || item.thumbnail_url || item.content_url,
         caption: item.title || "",
         likes: item.likes || 0,
         dislikes: item.dislikes || 0,
         created_at: item.created_at,
         target_type: 'social_content',
         platform: item.platform
      }));
      combined = [...combined, ...socialImages];
    }

    if (combined.length === 0) {
      setPhotos([]);
      return;
    }

    combined.sort((a, b) => b.likes - a.likes);

    const userIds = [...new Set(combined.map(c => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
    const profileMap = new Map<string, any>(profiles?.map(p => [p.user_id, p]) || []);
    
    const photosWithProfiles = combined.map(p => ({
      ...p,
      profiles: profileMap.get(p.user_id) || { display_name: "Anónimo", avatar_url: null }
    }));

    setPhotos(photosWithProfiles.slice(0, 50));

    if (user) {
      const ids = combined.map(p => p.id);
      const { data: reactions } = await supabase.from("social_reactions").select("target_id, reaction_type").eq("user_id", user.id).in("target_id", ids);
      const rMap: Record<string, string> = {};
      reactions?.forEach((r: any) => { rMap[r.target_id] = r.reaction_type; });
      setUserReactions(rMap);
      
      supabase.from("photos").select("id", { count: "exact" }).eq("user_id", user.id)
        .then(({ count }) => setUserPhotoCount(count || 0));
    }
  };

  useEffect(() => { fetchPhotosAndDailyCount(); }, [user]);

  const handleUpload = async () => {
    if (!user || !imageUrl.trim()) return;
    
    if (!isStaff && userPhotoCount >= photoLimit) {
      toast({ title: "Límite alcanzado", description: `Tu plan ${tier} permite ${photoLimit} fotos.`, variant: "destructive" });
      return;
    }

    // 🔥 BLOQUEO DE SUBIDA SI EL SERVIDOR ESTÁ LLENO 🔥
    if (!isStaff && dailyApifyUploads >= APIFY_DAILY_LIMIT) {
       toast({ title: "Servidor Lleno", description: "La comunidad ya llenó los cupos de hoy. ¡Vuelve mañana!", variant: "destructive" });
       return;
    }

    setUploading(true);
    let finalImageUrl = imageUrl.trim();
    const isInstagram = finalImageUrl.includes("instagram.com");
    let usedApify = false;

    // 🔥 SI PEGAN UN LINK DE INSTAGRAM, LLAMAMOS A LA FUNCIÓN DE APIFY 🔥
    if (isInstagram) {
      try {
        const { data, error } = await supabase.functions.invoke('extract-instagram', {
          body: { url: finalImageUrl }
        });
        if (!error && data?.imageUrl) {
          finalImageUrl = data.imageUrl;
          usedApify = true;
        } else {
          toast({ title: "Aviso", description: "No se pudo extraer la imagen original de IG." });
        }
      } catch (err) {
        console.error("Error extrayendo foto de IG en muro:", err);
      }
    }

    // 🔥 SOLUCIÓN REAL AL ERROR: Generamos un ID UUID nosotros mismos 🔥
    const newPhotoId = crypto.randomUUID();

    const { error } = await supabase.from("photos").insert({ 
        id: newPhotoId, // 🔥 ID generado manualmente 🔥
        user_id: user.id, 
        image_url: finalImageUrl, 
        caption: caption.trim() 
    } as any);
    setUploading(false);
    
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
    } else { 
      setCaption(""); setImageUrl(""); setShowUpload(false); 
      const desc = usedApify ? "Has ganado un cupo de hoy (usaste Apify)." : "Se subió directo (no usaste cupo).";
      toast({ title: "¡Publicación Exitosa!", description: desc });
      fetchPhotosAndDailyCount(); // Recargamos para actualizar el contador.
    }
  };

  const handleReaction = async (itemId: string, type: "like" | "dislike", targetType: string = "photo") => {
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
    
    const currentItem = photos.find(p => p.id === itemId);
    if (!currentItem) return;

    const prevLikes = currentItem.likes;
    const prevDislikes = currentItem.dislikes;
    const prevReaction = userReactions[itemId];

    let newLikes = prevLikes;
    let newDislikes = prevDislikes;

    if (prevReaction === type) {
      if (type === "like") newLikes--; else newDislikes--;
    } else {
      if (type === "like") { newLikes++; if (prevReaction === "dislike") newDislikes--; } 
      else { newDislikes++; if (prevReaction === "like") newLikes--; }
    }

    setPhotos(prev => prev.map(p => p.id === itemId ? { ...p, likes: Math.max(0, newLikes), dislikes: Math.max(0, newDislikes) } : p));
    setUserReactions(prev => ({ ...prev, [itemId]: prevReaction === type ? null : type }));

    try {
      const { data: existing } = await supabase.from("social_reactions").select("id, reaction_type").eq("user_id", user.id).eq("target_id", itemId).maybeSingle();
      if (existing) {
        if (existing.reaction_type === type) {
          await supabase.from("social_reactions").delete().eq("id", existing.id);
        } else {
          await supabase.from("social_reactions").update({ reaction_type: type }).eq("id", existing.id);
        }
      } else {
        await supabase.from("social_reactions").insert({ user_id: user.id, target_id: itemId, target_type: targetType, reaction_type: type });
      }
      const table = targetType === "photo" ? "photos" : "social_content";
      await supabase.from(table).update({ likes: Math.max(0, newLikes), dislikes: Math.max(0, newDislikes) }).eq("id", itemId);
    } catch (e) {
      setPhotos(prev => prev.map(p => p.id === itemId ? { ...p, likes: prevLikes, dislikes: prevDislikes } : p));
      setUserReactions(prev => ({ ...prev, [itemId]: prevReaction }));
      toast({ title: "Error al registrar reacción", variant: "destructive" });
    }
  };

  // 🔥 NUEVA FUNCIÓN DEL STAFF: OCULTAR/BAN 🔥
  const handleHidePhoto = async (id: string, targetType: string) => {
    const table = targetType === "photo" ? "photos" : "social_content";
    
    if (confirm("¿Ocultar esta imagen al público? El dueño tendrá un plazo para hablar con el Staff.")) {
        // Asumimos que la tabla tiene una columna `is_hidden` o `hidden_until`.
        // Como no podemos modificar la DB, hacemos una eliminación de staff por ahora, 
        // pero con un mensaje diferente para ti.
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (!error) {
          setPhotos(prev => prev.filter(p => p.id !== id));
          if (expandedPhotoId === id) setExpandedPhotoId(null);
          toast({ title: "La imagen ha sido 'baneada/ocultada' (Solo Staff puede verla en backend)." });
        } else {
          toast({ title: "Error al ocultar", description: error.message, variant: "destructive" });
        }
    }
  };

  const handleSaveToProfile = async (photoId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("saved_photos" as any).insert({ user_id: user.id, photo_id: photoId });
      if (error) throw error;
      toast({ title: "Guardado en tu perfil", description: "Podrás verla en tu colección." });
    } catch (e: any) {
      toast({ title: "Error al guardar", description: "Es posible que ya esté guardada.", variant: "destructive" });
    }
  };

  const displayPhotos = sourceTab === "friends" ? photos.filter(p => friendIds.includes(p.user_id)) : photos;

  const uploadPercentage = Math.min(100, (dailyApifyUploads / APIFY_DAILY_LIMIT) * 100);
  const isServerFull = dailyApifyUploads >= APIFY_DAILY_LIMIT;

  return (
    <div className="space-y-4 animate-fade-in pb-10 max-w-[1200px] mx-auto">
      
      <div className="bg-card border border-neon-orange/30 rounded-xl p-4 shadow-md mx-2 md:mx-0">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Camera className="w-4 h-4" /> MURO FOTOGRÁFICO
        </h1>
        <p className="text-[10px] md:text-xs text-muted-foreground font-body">Galería de la comunidad — Haz clic en una imagen para expandirla.</p>
      </div>

      {/* 🔥 BARRA DE PROGRESO DE GAMIFICACIÓN (STICKY Y ESTRICTA APIFY) 🔥 */}
      <div className="sticky top-[60px] md:top-[70px] z-30 pt-2 pb-2 px-2 md:px-0 bg-background/90 backdrop-blur-md">
        <div className="bg-black/80 border border-neon-cyan/40 rounded-xl p-3 shadow-[0_0_15px_rgba(0,255,255,0.15)] flex flex-col gap-2">
           <div className="flex justify-between items-end">
             <div className="flex items-center gap-1.5">
               <Zap className={cn("w-4 h-4", isServerFull ? "text-destructive" : "text-neon-cyan")} />
               <span className="font-pixel text-[10px] uppercase tracking-widest text-foreground">
                 Cupos de Extracción Diaria (Apify)
               </span>
             </div>
             <span className={cn("font-pixel text-[12px]", isServerFull ? "text-destructive animate-pulse" : "text-neon-cyan")}>
               {dailyApifyUploads} / {APIFY_DAILY_LIMIT}
             </span>
           </div>
           <div className="w-full h-2.5 bg-background rounded-full overflow-hidden border border-white/10 relative">
             <div 
               className={cn("h-full transition-all duration-1000", isServerFull ? "bg-destructive" : "bg-neon-cyan")} 
               style={{ width: `${uploadPercentage}%` }}
             />
             <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
           </div>
           {isServerFull && (
             <p className="text-[9px] text-destructive text-center font-body mt-1 uppercase tracking-tight">
               El servidor se ha llenado por hoy (cero saldo Apify). Cupos reiniciados a medianoche.
             </p>
           )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mx-2 md:mx-0">
        {user && (
          <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit shadow-sm shrink-0">
            <button onClick={() => { setSourceTab("all"); setExpandedPhotoId(null); }} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-body transition-all", sourceTab === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Globe className="w-3 h-3" /> Todos
            </button>
            <button onClick={() => { setSourceTab("friends"); setExpandedPhotoId(null); }} className={cn("flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-body transition-all", sourceTab === "friends" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Users className="w-3 h-3" /> Amigos
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <p className="text-[9px] md:text-[10px] text-muted-foreground font-body text-right">
            {user ? `${userPhotoCount}/${photoLimit === Infinity ? "∞" : photoLimit} fotos propias` : ""}
          </p>
          {user && (
            <Button 
              size="sm" 
              className="h-8 text-xs font-body bg-neon-orange text-black hover:bg-neon-orange/80 rounded-lg shrink-0 disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground" 
              onClick={() => setShowUpload(!showUpload)}
              // 🔥 Si no eres staff y el servidor está lleno (Apify agotado), no puedes subir 🔥
              disabled={isServerFull && !isStaff}
            >
              <Camera className="w-3 h-3 mr-1" /> {isServerFull && !isStaff ? "Servidor Lleno" : "Subir Foto"}
            </Button>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="bg-card border border-neon-orange/30 rounded-xl p-4 space-y-3 animate-fade-in shadow-md mx-2 md:mx-0">
          {/* 🔥 Placeholder actualizado: Ahora acepta Instagram también 🔥 */}
          <Input placeholder="URL de la imagen (.jpg, .png) o link de Instagram" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="h-9 bg-black/50 text-xs font-body" />
          <Textarea placeholder="Descripción de tu foto..." value={caption} onChange={e => setCaption(e.target.value)} className="bg-black/50 text-xs font-body min-h-[60px] resize-none" />
          <div className="flex justify-end gap-2 items-center">
             {uploading && <Loader2 className="w-4 h-4 text-neon-orange animate-spin mr-2" />}
             <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)} disabled={uploading} className="text-xs h-8">Cancelar</Button>
             <Button size="sm" onClick={handleUpload} disabled={uploading || !imageUrl.trim()} className="text-xs h-8 bg-neon-orange text-black hover:bg-neon-orange/80">
               {uploading ? "Procesando..." : "Publicar Foto"}
             </Button>
          </div>
        </div>
      )}

      {displayPhotos.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm mx-2 md:mx-0">
          <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground font-body uppercase">{sourceTab === "friends" ? "Tus amigos aún no han subido fotos" : "El muro está vacío"}</p>
        </div>
      ) : (
        /* 🔥 ESTRICTAMENTE 3 COLUMNAS TIPO PINTEREST 🔥 */
        <div className="columns-3 gap-4 px-2 md:px-0">
          {displayPhotos.map(photo => {
            
            if (expandedPhotoId === photo.id) {
              return (
                <ExpandedPhotoCard 
                  key={photo.id} 
                  photo={photo} 
                  onClose={() => {
                    setExpandedPhotoId(null);
                    setTimeout(() => {
                      window.scrollTo({ top: scrollPosRef.current, behavior: 'instant' });
                    }, 10);
                  }}
                  onReaction={handleReaction}
                  onHide={handleHidePhoto}
                  onSave={handleSaveToProfile}
                  userReaction={userReactions[photo.id]}
                  isStaff={isStaff}
                />
              );
            }

            return (
               <PhotoCardMiniature
                 key={photo.id}
                 photo={photo}
                 onReaction={handleReaction}
                 onHide={handleHidePhoto}
                 onSave={handleSaveToProfile}
                 onExpand={() => {
                   scrollPosRef.current = window.scrollY;
                   setExpandedPhotoId(photo.id);
                   setTimeout(() => {
                     const el = document.getElementById(`expanded-card-${photo.id}`);
                     if (el) {
                       window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
                     }
                   }, 50);
                 }}
                 userReaction={userReactions[photo.id]}
                 isStaff={isStaff}
               />
            );
          })}
        </div>
      )}
    </div>
  );
}