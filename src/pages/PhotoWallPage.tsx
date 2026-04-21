import { useState, useEffect } from "react";
import { Camera, ThumbsDown, ThumbsUp, Flag, Image as ImageIcon, Globe, Users, Trash2, MessageSquare, X, Reply, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useFriendIds } from "@/hooks/useFriendIds";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [reportTarget, setReportTarget] = useState<{ userId: string; name: string } | null>(null);
  
  const [commentModal, setCommentModal] = useState<any | null>(null);
  const [modalComments, setModalComments] = useState<SocialComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const tier = profile?.membership_tier || "novato";
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");
  const photoLimit = isStaff ? Infinity : (membershipPhotoLimits[tier] || 15);

  const fetchPhotos = async () => {
    const [photosRes, socialRes] = await Promise.all([
      supabase.from("photos").select("*").order("likes", { ascending: false }).limit(50),
      supabase.from("social_content").select("*").eq("is_public", true).order("likes", { ascending: false }).limit(50)
    ]);

    let combined: any[] = [];
    
    if (photosRes.data) {
      combined = [...combined, ...photosRes.data.map(p => ({ ...p, target_type: 'photo' }))];
    }
    
    if (socialRes.data) {
      const socialImages = socialRes.data.filter(item => !isVideoItem(item)).map(item => ({
         id: item.id,
         user_id: item.user_id,
         image_url: item.thumbnail_url || item.content_url,
         caption: item.title || "",
         likes: item.likes || 0,
         dislikes: item.dislikes || 0,
         created_at: item.created_at,
         target_type: 'social_content',
         platform: item.platform
      }));
      combined = [...combined, ...socialImages];
    }

    combined.sort((a, b) => b.likes - a.likes);
    setPhotos(combined.slice(0, 50));

    if (user && combined.length > 0) {
      const ids = combined.map(p => p.id);
      const { data: reactions } = await supabase
        .from("social_reactions")
        .select("target_id, reaction_type")
        .eq("user_id", user.id)
        .in("target_id", ids);
        
      const rMap: Record<string, string> = {};
      reactions?.forEach((r: any) => { rMap[r.target_id] = r.reaction_type; });
      setUserReactions(rMap);
    }
  };

  useEffect(() => {
    fetchPhotos();
    if (user) {
      supabase.from("photos").select("id", { count: "exact" }).eq("user_id", user.id)
        .then(({ count }) => setUserPhotoCount(count || 0));
    }
  }, [user]);

  useEffect(() => {
    if (!commentModal) return;
    const loadComments = async () => {
      const { data } = await supabase
        .from("social_comments")
        .select("*")
        .eq("content_id", commentModal.id)
        .order("created_at", { ascending: true })
        .limit(50);
        
      if (!data || data.length === 0) { 
        setModalComments([]); 
        return; 
      }
      
      const uids = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uids);
      const pMap = new Map<string, any>(profiles?.map(p => [p.user_id, p]) || []);
      
      setModalComments(data.map(c => {
        const p = pMap.get(c.user_id);
        return { ...c, display_name: p?.display_name || "Anónimo", avatar_url: p?.avatar_url };
      }));
    };
    loadComments();
  }, [commentModal]);

  const handleUpload = async () => {
    if (!user || !imageUrl.trim()) return;
    if (!isStaff && userPhotoCount >= photoLimit) {
      toast({ title: "Límite alcanzado", description: `Tu plan ${tier} permite ${photoLimit} fotos.`, variant: "destructive" });
      return;
    }
    setUploading(true);
    const { error } = await supabase.from("photos").insert({ user_id: user.id, image_url: imageUrl.trim(), caption: caption.trim() } as any);
    setUploading(false);
    if (error) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
    } else { 
      setCaption(""); setImageUrl(""); setShowUpload(false); setUserPhotoCount(p => p + 1); fetchPhotos(); 
      toast({ title: "Foto publicada" }); 
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
      const { data: existing } = await supabase.from("social_reactions")
        .select("id, reaction_type").eq("user_id", user.id).eq("target_id", itemId).maybeSingle();

      if (existing) {
        if (existing.reaction_type === type) {
          await supabase.from("social_reactions").delete().eq("id", existing.id);
        } else {
          await supabase.from("social_reactions").update({ reaction_type: type }).eq("id", existing.id);
        }
      } else {
        await supabase.from("social_reactions").insert({
          user_id: user.id, target_id: itemId, target_type: targetType, reaction_type: type
        });
      }

      const table = targetType === "photo" ? "photos" : "social_content";
      await supabase.from(table).update({ likes: Math.max(0, newLikes), dislikes: Math.max(0, newDislikes) }).eq("id", itemId);
    } catch (e) {
      setPhotos(prev => prev.map(p => p.id === itemId ? { ...p, likes: prevLikes, dislikes: prevDislikes } : p));
      setUserReactions(prev => ({ ...prev, [itemId]: prevReaction }));
      toast({ title: "Error al registrar reacción", variant: "destructive" });
    }
  };

  const handleDeletePhoto = async (id: string, targetType: string) => {
    if (!confirm("¿Eliminar foto permanentemente?")) return;
    const table = targetType === "photo" ? "photos" : "social_content";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) {
      setPhotos(prev => prev.filter(p => p.id !== id));
      toast({ title: "Foto eliminada por el Staff" });
    } else {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const submitModalComment = async () => {
    if (!user || !commentModal || !commentText.trim()) return;
    try {
      const { error } = await supabase.from("social_comments").insert({ 
        user_id: user.id, content_id: commentModal.id, content: commentText.trim(), parent_id: replyTo 
      });
      if (error) throw error;
      
      setCommentText("");
      setReplyTo(null);
      
      const { data } = await supabase.from("social_comments").select("*").eq("content_id", commentModal.id).order("created_at", { ascending: true });
      if (data) {
        const uids = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", uids);
        const pMap = new Map<string, any>(profiles?.map(p => [p.user_id, p]) || []);
        setModalComments(data.map(c => {
          const p = pMap.get(c.user_id);
          return { ...c, display_name: p?.display_name || "Anónimo", avatar_url: p?.avatar_url };
        }));
      }
    } catch (e: any) {
      toast({ title: "Error", description: "No se pudo publicar tu comentario.", variant: "destructive" });
    }
  };

  const handleDeleteModalComment = async (commentId: string) => {
    if (!confirm("¿Seguro que deseas eliminar este comentario?")) return;
    try {
      await supabase.from("social_comments").delete().eq("id", commentId);
      setModalComments(prev => prev.filter(c => c.id !== commentId));
      toast({ title: "Comentario eliminado" });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const displayPhotos = sourceTab === "friends" ? photos.filter(p => friendIds.includes(p.user_id)) : photos;
  const topPhotos = displayPhotos.slice(0, 6);
  const restPhotos = displayPhotos.slice(6);

  // 🔥 CORRECCIÓN: Renderizado Absoluto y Object-Cover para responsividad perfecta 🔥
  const renderImage = (photo: any) => {
    if (photo.target_type === 'social_content' && photo.platform === 'instagram' && !photo.image_url.includes('.jpg') && !photo.image_url.includes('.png')) {
      const embed = getEmbedUrl(photo.image_url, photo.platform);
      if (embed) {
        return (
          <div className="absolute inset-0 w-full h-full overflow-hidden bg-white pointer-events-none">
            <iframe src={embed} className="absolute inset-0 w-full h-full transform scale-[1.05]" style={{ transformOrigin: 'top center' }} />
          </div>
        );
      }
    }
    return <img src={photo.image_url} alt={photo.caption || "Foto"} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />;
  };

  return (
    <div className="space-y-4 animate-fade-in pb-10">
      <div className="bg-card border border-neon-orange/30 rounded p-4 shadow-md">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Camera className="w-4 h-4" /> MURO FOTOGRÁFICO
        </h1>
        <p className="text-xs text-muted-foreground font-body">Galería de la comunidad — Las fotos más populares aparecen primero</p>
      </div>

      {user && (
        <div className="flex gap-1 bg-card border border-border rounded p-1 w-fit shadow-sm">
          <button onClick={() => setSourceTab("all")} className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all", sourceTab === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Globe className="w-3 h-3" /> Todos
          </button>
          <button onClick={() => setSourceTab(prev => prev === "friends" ? "all" : "friends")} className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all", sourceTab === "friends" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Users className="w-3 h-3" /> Amigos
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground font-body">
          {user ? `${userPhotoCount}/${photoLimit === Infinity ? "∞" : photoLimit} fotos subidas (Plan ${isStaff ? "STAFF" : tier.toUpperCase()})` : "Inicia sesión para subir fotos directas"}
        </p>
        {user && (
          <Button size="sm" className="h-7 text-xs font-body bg-primary text-primary-foreground" onClick={() => setShowUpload(!showUpload)}>
            Subir Foto Directa
          </Button>
        )}
      </div>

      {showUpload && (
        <div className="bg-card border border-neon-orange/30 rounded p-4 space-y-3 animate-fade-in shadow-md">
          <Input placeholder="URL de la imagen (.jpg, .png)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="h-8 bg-muted text-xs font-body" />
          <Textarea placeholder="Descripción (opcional)..." value={caption} onChange={e => setCaption(e.target.value)} className="bg-muted text-xs font-body min-h-[60px]" />
          <Button size="sm" onClick={handleUpload} disabled={uploading || !imageUrl.trim()} className="text-xs">{uploading ? "Subiendo..." : "Publicar"}</Button>
        </div>
      )}

      {/* 🔥 CORRECCIÓN: aspect-square para hacerlo cuadrado y perfecto 🔥 */}
      {topPhotos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {topPhotos.map((photo, i) => (
            <div key={photo.id} className={cn("relative group rounded-xl overflow-hidden bg-black border border-border/50 shadow-md transition-all duration-300 hover:scale-[1.02] hover:border-neon-orange aspect-square", i === 0 && "col-span-2 row-span-2")}>
              {renderImage(photo)}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                <div className="flex items-center gap-3 text-[10px] font-body w-full">
                  <button onClick={() => handleReaction(photo.id, "like", photo.target_type)} className={cn("flex items-center gap-1 transition-transform hover:scale-110", userReactions[photo.id] === "like" ? "text-neon-green" : "text-white hover:text-neon-green")}>
                    <ThumbsUp className={cn("w-4 h-4", userReactions[photo.id] === "like" && "fill-current")} /> {photo.likes}
                  </button>
                  <button onClick={() => handleReaction(photo.id, "dislike", photo.target_type)} className={cn("flex items-center gap-1 transition-transform hover:scale-110", userReactions[photo.id] === "dislike" ? "text-destructive" : "text-white hover:text-destructive")}>
                    <ThumbsDown className={cn("w-4 h-4", userReactions[photo.id] === "dislike" && "fill-current")} /> {photo.dislikes}
                  </button>
                  <button onClick={() => setCommentModal(photo)} className="flex items-center gap-1 transition-transform hover:scale-110 text-white hover:text-neon-cyan">
                    <MessageSquare className="w-4 h-4" />
                  </button>
                  <div className="flex ml-auto gap-2">
                    {user && (
                      <button onClick={() => setReportTarget({ userId: photo.user_id, name: "usuario" })} className="text-white hover:text-destructive transition-colors">
                        <Flag className="w-4 h-4" />
                      </button>
                    )}
                    {isStaff && (
                      <button onClick={() => handleDeletePhoto(photo.id, photo.target_type)} className="text-white hover:text-destructive transition-colors" title="Eliminar (Staff)">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🔥 CORRECCIÓN: aspect-square para hacerlo cuadrado y perfecto 🔥 */}
      {restPhotos.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
          {restPhotos.map(photo => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden bg-black aspect-square border border-border/50 shadow-sm transition-all duration-200 hover:border-neon-orange hover:scale-[1.02]">
              {renderImage(photo)}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                <div className="flex items-center gap-4">
                  <button onClick={() => handleReaction(photo.id, "like", photo.target_type)} className={cn("text-[10px] flex items-center gap-1 transition-transform hover:scale-110", userReactions[photo.id] === "like" ? "text-neon-green" : "text-white hover:text-neon-green")}>
                    <ThumbsUp className={cn("w-4 h-4", userReactions[photo.id] === "like" && "fill-current")} /> {photo.likes}
                  </button>
                  <button onClick={() => handleReaction(photo.id, "dislike", photo.target_type)} className={cn("text-[10px] flex items-center gap-1 transition-transform hover:scale-110", userReactions[photo.id] === "dislike" ? "text-destructive" : "text-white hover:text-destructive")}>
                    <ThumbsDown className={cn("w-4 h-4", userReactions[photo.id] === "dislike" && "fill-current")} /> {photo.dislikes}
                  </button>
                </div>
                <button onClick={() => setCommentModal(photo)} className="text-[10px] flex items-center gap-1 text-white hover:text-neon-cyan transition-transform hover:scale-110">
                  <MessageSquare className="w-4 h-4" /> Comentar
                </button>
                {isStaff && (
                  <button onClick={() => handleDeletePhoto(photo.id, photo.target_type)} className="absolute top-2 right-2 text-white hover:text-destructive transition-colors bg-black/50 rounded-full p-1.5">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {displayPhotos.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center shadow-sm">
          <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-sm text-muted-foreground font-body uppercase">{sourceTab === "friends" ? "Tus amigos aún no han subido fotos" : "Aún no hay fotos"}</p>
        </div>
      )}

      {/* MODAL FLOTANTE DE COMENTARIOS */}
      {commentModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setCommentModal(null); setReplyTo(null); }} />
          <div className="relative bg-card border border-neon-orange/30 rounded-xl p-5 max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4 shrink-0 border-b border-white/10 pb-3">
              <h3 className="font-pixel text-[11px] text-neon-orange flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> COMENTARIOS ({modalComments.length})
              </h3>
              <button onClick={() => { setCommentModal(null); setReplyTo(null); }} className="text-muted-foreground hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 retro-scrollbar">
              {modalComments.map(c => (
                <div key={c.id} className={cn("group text-[11px] font-body flex items-start justify-between gap-3", c.parent_id && "ml-5 border-l border-white/10 pl-3")}>
                  <div className="flex-1">
                    <span className="text-primary font-bold">{c.display_name}: </span>
                    <span className="text-foreground/90">{c.content}</span>
                    {user && (
                      <button onClick={() => setReplyTo(c.id)} className="flex items-center gap-1 mt-1.5 text-[9px] text-muted-foreground hover:text-primary transition-colors uppercase font-pixel tracking-wider">
                        <Reply className="w-3 h-3" /> Responder
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setReportTarget({ userId: c.user_id, name: c.display_name || "Anónimo" })} className="text-muted-foreground hover:text-destructive" title="Reportar">
                       <Flag className="w-3.5 h-3.5" />
                    </button>
                    {isStaff && (
                      <button onClick={() => handleDeleteModalComment(c.id)} className="text-muted-foreground hover:text-destructive" title="Eliminar (Staff)">
                         <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {modalComments.length === 0 && <p className="text-[11px] text-muted-foreground font-body text-center py-6 opacity-70">Aún no hay comentarios. ¡Sé el primero!</p>}
            </div>

            {user ? (
              <div className="shrink-0 flex flex-col border-t border-white/10 pt-4 gap-2">
                {replyTo && (
                   <div className="flex items-center gap-1 text-[10px] text-neon-cyan font-pixel uppercase tracking-widest px-1">
                     <Reply className="w-3 h-3" /> Respondiendo
                     <button onClick={() => setReplyTo(null)} className="text-destructive ml-2 hover:bg-destructive/20 rounded p-1"><X className="w-3 h-3" /></button>
                   </div>
                )}
                <div className="flex gap-2">
                  <Textarea 
                    value={commentText} 
                    onChange={e => setCommentText(e.target.value)} 
                    placeholder="Escribe tu comentario..." 
                    className="bg-black/50 border-white/10 text-xs min-h-[44px] resize-none" 
                  />
                  <Button onClick={submitModalComment} disabled={!commentText.trim()} className="shrink-0 h-auto bg-neon-cyan text-black hover:bg-neon-cyan/80">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
               <p className="text-[11px] text-muted-foreground font-body text-center mt-2 shrink-0 border-t border-white/10 pt-4">Inicia sesión para comentar</p>
            )}
          </div>
        </div>
      )}

      {reportTarget && <ReportModal reportedUserId={reportTarget.userId} reportedUserName={reportTarget.name} onClose={() => setReportTarget(null)} />}
    </div>
  );
}