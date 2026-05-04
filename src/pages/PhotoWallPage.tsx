import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Camera, ThumbsDown, ThumbsUp, Flag, Image as ImageIcon, Globe, Users, Trash2, MessageSquare, X, Reply, Send, Maximize2, Bookmark, ExternalLink, Zap, Loader2, Ban, Shield, Copy, User as UserIcon, Flame, Sparkles, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useFriendIds } from "@/hooks/useFriendIds";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ReportModal from "@/components/ReportModal";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

// 🔥 SISTEMA DE IMÁGENES RÁPIDO DE LA V1 RESTAURADO 🔥
const getProxyUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('wsrv.nl')) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
};

const NEON_COLORS = ['#39ff14', '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00', '#ff00aa', '#ff5500'];

const getPhotoNeonStyle = (photo: any) => {
  const isApify = photo.is_apify === true || photo.target_type === 'social_content';
  if (!isApify) return {}; 
  const sum = String(photo.id).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const color = NEON_COLORS[sum % NEON_COLORS.length];
  return {
    borderColor: color,
    boxShadow: `0 0 20px ${color}60, inset 0 0 10px ${color}30`,
    borderWidth: '2px'
  };
};

/* 🔥 COMPONENTE: TARJETA MINIATURA 🔥 */
function PhotoCardMiniature({ photo, onExpand, onReaction, onHide, onDelete, onSave, userReaction, isStaff, onReport }: any) {
  const { user } = useAuth();
  const { toast } = useToast();
  const targetUrl = photo.thumbnail_url || photo.image_url;
  const neonStyle = getPhotoNeonStyle(photo);
  const hasNeon = Object.keys(neonStyle).length > 0;
  
  const isOwner = user?.id === photo.user_id;

  return (
    <div 
      className={cn(
        "relative group rounded-xl bg-[#09090b] cursor-pointer transition-all duration-300 overflow-hidden shadow-sm h-full w-full",
        !hasNeon && "border border-border/50 hover:border-neon-orange hover:shadow-[0_0_15px_rgba(255,107,0,0.3)]"
      )}
      style={neonStyle}
      onClick={onExpand}
    >
      <div className="relative w-full h-full overflow-hidden rounded-xl bg-black flex items-center justify-center min-h-[150px]">
        {/* Imagen cargada directamente con el proxy, igual que en la V1 */}
        <img 
          src={getProxyUrl(targetUrl)} 
          alt={photo.caption || "Foto"} 
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          className="w-full h-auto object-cover rounded-xl transition-transform duration-500 group-hover:scale-105" 
          loading="lazy" 
          onError={(e) => {
            if (!e.currentTarget.src.includes('wsrv.nl')) return;
            e.currentTarget.src = targetUrl;
          }}
        />
        
        {/* OVERLAY: Todo este div es invisible hasta que haces hover (opacity-0 group-hover:opacity-100) */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-2 sm:p-3 rounded-xl z-10">
          <div className="flex justify-between items-start">
            
            {/* MENÚ DE MODERACIÓN STAFF */}
            {isStaff && !isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button onClick={e => e.stopPropagation()} className="p-1 sm:p-1.5 text-muted-foreground hover:text-neon-magenta bg-black/40 rounded-lg backdrop-blur-sm transition-colors z-20">
                    <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-[200] bg-card border-border">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onHide(photo.id, photo.target_type); }} className="text-neon-orange focus:bg-neon-orange/10 cursor-pointer">
                    <Ban className="w-3 h-3 mr-2" /> Ocultar / Banear
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(photo.id, photo.target_type); }} className="text-destructive focus:bg-destructive/10 cursor-pointer">
                    <Trash2 className="w-3 h-3 mr-2" /> Eliminar Permanente
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* 🔥 ICONOS PEQUEÑOS ESTILO FORO + BOTONES REPORTAR/GUARDAR 🔥 */}
            <div className={cn("ml-auto flex items-center gap-1 sm:gap-1.5 z-20", (!isStaff || isOwner) && "ml-auto")}>
               {isOwner && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); onExpand(); }} className="p-1 sm:p-1.5 text-muted-foreground hover:text-neon-yellow bg-black/40 rounded-lg backdrop-blur-sm transition-colors" title="Editar">
                      <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(photo.id, photo.target_type); }} className="p-1 sm:p-1.5 text-muted-foreground hover:text-destructive bg-black/40 rounded-lg backdrop-blur-sm transition-colors" title="Eliminar">
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </>
               )}
               {user && !isOwner && (
                 <button onClick={(e) => { e.stopPropagation(); onReport(); }} className="p-1 sm:p-1.5 text-muted-foreground hover:text-destructive bg-black/40 rounded-lg backdrop-blur-sm transition-colors" title="Reportar">
                   <Flag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                 </button>
               )}
               {user && (
                 <button onClick={(e) => { e.stopPropagation(); onSave(photo); }} className="p-1 sm:p-1.5 text-muted-foreground hover:text-neon-cyan bg-black/40 rounded-lg backdrop-blur-sm transition-colors" title="Guardar">
                   <Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                 </button>
               )}
            </div>

          </div>
          <div className="flex flex-col items-center gap-2 sm:gap-4">
             <Maximize2 className="w-6 h-6 sm:w-8 sm:h-8 text-white/50 mb-1 sm:mb-2 pointer-events-none" />
             <div className="flex items-center gap-2 sm:gap-4 text-white font-body text-[10px] sm:text-xs">
                
                {/* 1. VOTO POSITIVO */}
                <button onClick={(e) => { e.stopPropagation(); onReaction(photo.id, "like", photo.target_type); }} className={cn("flex items-center gap-1 sm:gap-1.5 transition-transform hover:scale-105 z-20", userReaction === "like" ? "text-neon-green" : "text-white hover:text-neon-green")}>
                   <ThumbsUp className={cn("w-3 h-3 sm:w-4 sm:h-4", userReaction === "like" && "fill-current")} /> <span className="hidden sm:inline">{photo.likes}</span>
                </button>

                {/* 2. VOTO NEGATIVO */}
                <button onClick={(e) => { e.stopPropagation(); onReaction(photo.id, "dislike", photo.target_type); }} className={cn("flex items-center gap-1 sm:gap-1.5 transition-transform hover:scale-105 z-20", userReaction === "dislike" ? "text-destructive" : "text-white hover:text-destructive")}>
                   <ThumbsDown className={cn("w-3 h-3 sm:w-4 sm:h-4", userReaction === "dislike" && "fill-current")} /> <span className="hidden sm:inline">{photo.dislikes}</span>
                </button>

                {/* 3. ICONO DE COMENTARIOS */}
                <span className="flex items-center gap-1 sm:gap-1.5 pointer-events-none"><MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" /></span>

             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 🔥 COMPONENTE: MODAL EXPANDIDO (CENTRO MAGISTRAL CON PORTAL) 🔥 */
function ExpandedPhotoModal({ photo, onClose, onReaction, onHide, onEdit, onDelete, onSave, userReaction, isStaff, limits }: any) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{id: string, name: string} | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportingComment, setReportingComment] = useState<{ userId: string; userName: string; commentId: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(photo.caption || photo.title || "");
  
  const targetUrl = photo.thumbnail_url || photo.image_url;
  const originalUrl = photo.content_url || targetUrl;
  const neonStyle = getPhotoNeonStyle(photo);
  const isOwner = user?.id === photo.user_id;

  const displayDate = photo.created_at ? new Date(photo.created_at).toLocaleDateString() : "Recientemente";

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const fetchComments = async () => {
    const { data: rawComments } = await supabase.from("social_comments").select("*").eq("content_id", photo.id).order("created_at", { ascending: true });
    if (rawComments && rawComments.length > 0) {
      const userIds = [...new Set(rawComments.map((c: any) => c.user_id))];
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
      const pMap: Record<string, any> = {};
      if (profs) profs.forEach((p: any) => { pMap[p.user_id] = p; });
      setComments(rawComments.map((c: any) => ({ ...c, display_name: pMap[c.user_id]?.display_name || "Anónimo", avatar_url: pMap[c.user_id]?.avatar_url })));
    } else {
      setComments([]);
    }
  };

  useEffect(() => { fetchComments(); }, [photo.id]);

  const handleSubmitComment = async () => {
    if (!user || !commentText.trim()) return;
    if (commentText.length > limits.maxForumChars) {
      toast({ title: "Límite excedido", description: `Máx ${limits.maxForumChars} caracteres.`, variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("social_comments").insert({ 
        user_id: user.id, content_id: photo.id, content: replyTo ? `@${replyTo.name} ${commentText.trim()}` : commentText.trim(), parent_id: replyTo?.id || null 
      } as any);
      if (error) throw error;
      setCommentText(""); setReplyTo(null); fetchComments();
    } catch (e) { toast({ title: "Error al comentar", variant: "destructive" }); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("¿Eliminar este comentario?")) return;
    try {
      await supabase.from("social_comments").delete().eq("id", commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) { }
  };

  // Restaurado el chequeo de embed de la V1
  const isEmbed = !photo.thumbnail_url && photo.target_type === 'social_content' && photo.platform === 'instagram' && !photo.content_url?.includes('.jpg') && !photo.content_url?.includes('.png');
  const embedSrc = isEmbed ? getEmbedUrl(photo.content_url, photo.platform) : null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[6000] bg-black/90 backdrop-blur-md animate-fade-in flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div 
        className="w-[95%] max-w-5xl max-h-[90vh] bg-card rounded-xl flex flex-col md:flex-row overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-scale-in border border-white/10" 
        onClick={e => e.stopPropagation()}
        style={neonStyle}
      >
        <div className="relative bg-black w-full md:w-[60%] flex flex-col items-center justify-center p-4 shrink-0 h-[40vh] md:h-[85vh] min-h-[300px]">
          <a 
            href={originalUrl} target="_blank" rel="noopener noreferrer" 
            className="absolute bottom-4 left-4 z-20 bg-black/70 border border-white/10 hover:border-neon-cyan p-2 rounded-lg text-white hover:text-neon-cyan backdrop-blur-md flex items-center gap-2 font-pixel text-[9px] uppercase tracking-widest transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5"/> <span className="hidden sm:inline">Ver original</span>
          </a>

          {isEmbed && embedSrc ? (
             <iframe src={embedSrc} className="w-full h-full object-contain rounded" allowFullScreen />
          ) : (
             <img 
               src={getProxyUrl(targetUrl)} alt={photo.caption} referrerPolicy="no-referrer" crossOrigin="anonymous"
               className="w-auto h-full max-w-full object-contain rounded shadow-2xl" 
               onError={(e) => { if (!e.currentTarget.src.includes('wsrv.nl')) return; e.currentTarget.src = targetUrl; }}
             />
          )}
        </div>

        <div className="relative w-full md:w-[40%] flex flex-col bg-background/95 backdrop-blur-md border-t md:border-t-0 md:border-l border-border h-[50vh] md:h-[85vh]">
          <button onClick={onClose} className="absolute top-2 right-2 z-50 bg-black/50 p-1.5 rounded-full text-white hover:bg-destructive hover:text-white transition-colors border border-white/10">
            <X className="w-4 h-4" />
          </button>

          <div className="p-3 border-b border-border flex items-center gap-3 bg-muted/10 shrink-0 pr-10">
            <Avatar className="w-8 h-8 border border-neon-orange/30">
              <AvatarImage src={photo.profiles?.avatar_url} />
              <AvatarFallback className="font-pixel text-[10px]">?</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-foreground">{photo.profiles?.display_name || "Anónimo"}</p>
              <p className="text-[9px] text-muted-foreground font-body">{displayDate}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 retro-scrollbar">
            {isEditing ? (
              <div className="mb-2 space-y-2">
                <Textarea value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-xs font-body min-h-[50px] resize-none bg-black/50 border-white/10" placeholder="Escribe tu descripción..." />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { onEdit(photo.id, editTitle, photo.target_type); setIsEditing(false); }} className="text-[10px] h-6 bg-neon-cyan text-black">Guardar</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="text-[10px] h-6 border-white/10">Cancelar</Button>
                </div>
              </div>
            ) : (
              (photo.caption || photo.title) && <p className="text-[11px] leading-relaxed text-foreground/90 bg-white/5 p-2 rounded-lg border border-white/5 font-body italic">"{photo.caption || photo.title}"</p>
            )}

            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center opacity-30 py-4">
                  <MessageSquare className="w-6 h-6 mb-1" />
                  <p className="text-[9px] uppercase font-pixel tracking-widest">Sin comentarios</p>
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id} id={`comment-${c.id}`} className={cn("group flex items-start gap-2 text-[10px] font-body", c.parent_id && "ml-4 border-l border-white/10 pl-2")}>
                    <Avatar className="w-5 h-5 shrink-0 mt-1"><AvatarImage src={c.avatar_url || ""} /></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="bg-white/5 rounded-lg px-2 py-1.5 inline-block max-w-full">
                        <span className="text-primary font-bold block text-[9px] mb-0.5">{c.display_name}</span>
                        <span className="text-foreground/90 break-words">{c.content}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <button onClick={() => setReplyTo({id: c.id, name: c.display_name || "Usuario"})} className="text-[8px] text-muted-foreground hover:text-primary font-bold transition-colors">Responder</button>
                        {/* Botón reportar comentario de la V2 */}
                        {user && user.id !== c.user_id && (
                          <button onClick={() => setReportingComment({ userId: c.user_id, userName: c.display_name || "Anónimo", commentId: c.id })} className="text-muted-foreground hover:text-destructive transition-colors" title="Reportar comentario">
                            <Flag className="w-2.5 h-2.5" />
                          </button>
                        )}
                        {isStaff && <button onClick={() => handleDeleteComment(c.id)} className="text-[8px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">Eliminar</button>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 border-t border-border bg-muted/5 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                <button onClick={() => onReaction(photo.id, "like", photo.target_type)} className={cn("flex items-center gap-1 text-[11px] transition-transform hover:scale-110", userReaction === "like" ? "text-neon-green" : "text-muted-foreground hover:text-neon-green")}><ThumbsUp className={cn("w-3.5 h-3.5", userReaction === "like" && "fill-current")} /> {photo.likes}</button>
                <button onClick={() => onReaction(photo.id, "dislike", photo.target_type)} className={cn("flex items-center gap-1 text-[11px] transition-transform hover:scale-110", userReaction === "dislike" ? "text-destructive" : "text-muted-foreground hover:text-destructive")}><ThumbsDown className={cn("w-3.5 h-3.5", userReaction === "dislike" && "fill-current")} /> {photo.dislikes}</button>
              </div>
              
              {/* 🔥 BOTONES DE EDICIÓN Y ELIMINAR (ICONOS PEQUEÑOS JUNTO A GUARDAR) 🔥 */}
              <div className="flex gap-2 items-center">
                {user && !isOwner && <button onClick={() => setShowReport(true)} className="text-muted-foreground hover:text-destructive transition-colors" title="Reportar"><Flag className="w-3.5 h-3.5" /></button>}
                
                {isOwner && (
                  <>
                    <button onClick={() => setIsEditing(!isEditing)} className="text-muted-foreground hover:text-neon-yellow transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(photo.id, photo.target_type)} className="text-muted-foreground hover:text-destructive transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}

                {user && <button onClick={() => onSave(photo)} className="text-muted-foreground hover:text-neon-cyan transition-colors" title="Guardar"><Bookmark className="w-3.5 h-3.5" /></button>}
                
                {isStaff && !isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="text-muted-foreground hover:text-neon-magenta transition-colors">
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-[200] bg-card border-border">
                      <DropdownMenuItem onClick={() => onHide(photo.id, photo.target_type)} className="text-neon-orange cursor-pointer focus:bg-neon-orange/10">
                        <Ban className="w-3 h-3 mr-2" /> Ocultar / Banear
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(photo.id, photo.target_type)} className="text-destructive cursor-pointer focus:bg-destructive/10">
                        <Trash2 className="w-3 h-3 mr-2" /> Eliminar Permanente
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {user ? (
              <div className="space-y-1.5">
                {replyTo && (
                   <div className="flex items-center justify-between bg-neon-orange/10 px-2 py-0.5 rounded text-[8px] text-neon-orange font-bold">
                     <span>Respondiendo a {replyTo.name}</span>
                     <button onClick={() => setReplyTo(null)} className="hover:text-white"><X className="w-2.5 h-2.5"/></button>
                   </div>
                )}
                <div className="flex gap-2">
                  <Input 
                    value={commentText} 
                    onChange={e => setCommentText(e.target.value)} 
                    placeholder={`Comentar... (Máx ${limits.maxForumChars} carac.)`} 
                    maxLength={limits.maxForumChars}
                    className="h-7 text-[10px] bg-black/40 border-border" 
                  />
                  <Button onClick={handleSubmitComment} size="sm" className="h-7 px-2 bg-neon-orange text-black shrink-0 hover:bg-neon-orange/80"><Send className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ) : <p className="text-[9px] text-center text-muted-foreground font-pixel uppercase py-1">Inicia sesión</p>}
          </div>
        </div>
      </div>
      {showReport && <ReportModal reportedUserId={photo.user_id} reportedUserName={photo.profiles?.display_name || "Anónimo"} postId={photo.id} onClose={() => setShowReport(false)} />}
      {reportingComment && <ReportModal reportedUserId={reportingComment.userId} reportedUserName={reportingComment.userName} postId={photo.id} commentId={reportingComment.commentId} contentLabel="Comentario" onClose={() => setReportingComment(null)} />}
    </div>,
    document.body
  );
}

// 🔥 COMPONENTE PRINCIPAL (PHOTO WALL) 🔥
export default function PhotoWallPage() {
  const { user, profile, roles, isMasterWeb, isAdmin } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const { toast } = useToast();
  const location = useLocation();
  const [searchParams] = useSearchParams(); 
  
  // 🔥 ESTADOS MAESTROS EXACTOS 🔥
  const [sort, setSort] = useState<'new' | 'popular'>('new');
  const [photos, setPhotos] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Estados extra
  const [showUpload, setShowUpload] = useState(false);
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [userPhotoCount, setUserPhotoCount] = useState(0);
  const [dailyApifyCount, setDailyApifyCount] = useState(0);
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");
  const [expandedPhotoId, setExpandedPhotoId] = useState<string | null>(null);
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [hasScrolled, setHasScrolled] = useState(false);
  const [reportingPhotoIdMini, setReportingPhotoIdMini] = useState<string | null>(null);
  
  const observerRef = useRef<HTMLDivElement>(null);
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");
  const userTier = (profile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const limits = isStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[userTier];

  const ITEMS_PER_PAGE = 20;

  // 🔥 FETCH CENTRALIZADO Y SIN CONFLICTOS 🔥
  const fetchContent = async (resetPage: boolean, sortMode: 'new' | 'popular') => {
    if (isFetching) return;
    setIsFetching(true);

    try {
      const pageNum = resetPage ? 0 : page;
      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const orderCol = sortMode === "popular" ? "likes" : "created_at";

      // 1. Obtener límite diario Apify (solo primera página)
      if (pageNum === 0) {
        const getChileMidnightISO = () => {
          const now = new Date();
          const santiagoTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
          const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
          const offsetHours = Math.round((santiagoTime.getTime() - utcTime.getTime()) / 3600000);
          const offsetSign = offsetHours >= 0 ? '+' : '-';
          const offsetStr = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;
          const year = santiagoTime.getFullYear();
          const month = String(santiagoTime.getMonth() + 1).padStart(2, '0');
          const day = String(santiagoTime.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}T00:00:00${offsetStr}`;
        };
        const midnightChile = getChileMidnightISO();
        const { count } = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('is_apify', true).gte('created_at', midnightChile);
        
        setDailyApifyCount(count || 0);
      }

      // 2. Traer Fotos
      const { data: photosRes, error: pErr } = await supabase.from("photos")
        .select("*").neq("is_banned", true)
        .order(orderCol, { ascending: false }).order('created_at', { ascending: false })
        .range(from, to);

      // 3. Traer Social Content (solo fotos, ignoramos videos/reels)
      const { data: socialRes, error: sErr } = await supabase.from("social_content")
        .select("*").eq("is_public", true).neq("is_banned", true)
        .order(orderCol, { ascending: false }).order('created_at', { ascending: false })
        .range(from, to);

      let combined: any[] = [];
      
      if (photosRes) {
        combined = [...combined, ...photosRes.map((p: any) => ({ ...p, target_type: 'photo', likes: p.likes || 0, dislikes: p.dislikes || 0, created_at: p.created_at || new Date().toISOString() }))];
      }
      
      if (socialRes) {
        const socialImages = socialRes.filter((item: any) => !isVideoItem(item)).map((item: any) => ({
          ...item, id: item.id, target_type: 'social_content', image_url: item.thumbnail_url || item.content_url, caption: item.title || "", platform: item.platform, likes: item.likes || 0, dislikes: item.dislikes || 0, created_at: item.created_at || new Date().toISOString()
        }));
        combined = [...combined, ...socialImages];
      }

      const userIds = [...new Set(combined.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, color_name, color_avatar_border").in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

      const processed = combined.map((p: any) => ({
        ...p, profiles: profileMap[p.user_id] || { display_name: "Anónimo", avatar_url: null }
      }));

      // 🔥 ORDEN FINAL ABSOLUTO 🔥
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
        setPhotos(processed);
        setPage(1);
      } else {
        setPhotos(prev => {
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
        setPage(prev => prev + 1);
      }

      if ((photosRes?.length || 0) < ITEMS_PER_PAGE && (socialRes?.length || 0) < ITEMS_PER_PAGE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (user && pageNum === 0) {
        const { data: reactions } = await supabase.from("social_reactions").select("target_id, reaction_type").eq("user_id", user.id);
        const rMap: Record<string, string> = {};
        reactions?.forEach((r: any) => { rMap[r.target_id] = r.reaction_type; });
        setUserReactions(rMap);
        supabase.from("photos").select("id", { count: "exact" }).eq("user_id", user.id).then(({ count }) => setUserPhotoCount(count || 0));
      }

    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsFetching(false); 
    }
  };

  // 🔥 EFECTO INICIAL Y CUANDO CAMBIA SORT 🔥
  useEffect(() => { 
    fetchContent(true, sort); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const handleUpload = async () => {
    if (!user || !imageUrl.trim()) return;
    
    if (!isStaff && userPhotoCount >= limits.maxPhotos) {
      toast({ title: "Límite de Membresía", description: `Tu plan permite un máximo de ${limits.maxPhotos} fotos.`, variant: "destructive" }); return;
    }

    if (!isStaff && dailyApifyCount >= APIFY_DAILY_LIMIT) {
       toast({ title: "Servidor Lleno", description: "Cupos agotados.", variant: "destructive" }); return;
    }

    setUploading(true);
    let finalUrl = imageUrl.trim();
    let usedApify = false;

    if (finalUrl.includes("instagram.com")) {
      try {
        const { data, error } = await supabase.functions.invoke('extract-instagram', { body: { url: finalUrl } });
        if (!error && data?.imageUrl) { finalUrl = data.imageUrl; usedApify = true; }
      } catch (err) { console.error("Error IG:", err); }
    }

    const { error } = await supabase.from("photos").insert({ id: crypto.randomUUID(), user_id: user.id, image_url: finalUrl, caption: caption.trim(), is_apify: usedApify } as any);

    if (!error) {
      setCaption(""); setImageUrl(""); setShowUpload(false); 
      fetchContent(true, sort); // Recarga para mostrar la foto nueva
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
    
    const prevReaction = userReactions[itemId];
    const prevLikes = current.likes || 0;
    const prevDislikes = current.dislikes || 0;

    let newLikes = prevLikes;
    let newDislikes = prevDislikes;
    let newReaction: string | null = type;

    if (prevReaction === type) {
      newReaction = null;
      if (type === "like") newLikes--; else newDislikes--;
    } else {
      if (type === "like") {
        newLikes++;
        if (prevReaction === "dislike") newDislikes--;
      } else {
        newDislikes++;
        if (prevReaction === "like") newLikes--;
      }
    }

    newLikes = Math.max(0, newLikes);
    newDislikes = Math.max(0, newDislikes);

    setUserReactions(prev => {
      const next = { ...prev };
      if (newReaction) next[itemId] = newReaction;
      else delete next[itemId];
      return next;
    });

    setPhotos(prev => prev.map(p => p.id === itemId ? { ...p, likes: newLikes, dislikes: newDislikes } : p));
    
    try {
      if (prevReaction === type) {
        await supabase.from("social_reactions").delete().eq("user_id", user.id).eq("target_id", itemId);
      } else {
        await supabase.from("social_reactions").upsert({ user_id: user.id, target_id: itemId, reaction_type: type, target_type: targetType });
      }
      await supabase.from(table).update({ likes: newLikes, dislikes: newDislikes }).eq("id", itemId);
    } catch (err) {
      setUserReactions(prev => {
        const next = { ...prev };
        if (prevReaction) next[itemId] = prevReaction;
        else delete next[itemId];
        return next;
      });
      setPhotos(prev => prev.map(p => p.id === itemId ? { ...p, likes: prevLikes, dislikes: prevDislikes } : p));
    }
  };

  const handleEditPost = async (id: string, newTitle: string, targetType: string) => {
    const table = targetType === "photo" ? "photos" : "social_content";
    const field = targetType === "photo" ? "caption" : "title";
    const { error } = await supabase.from(table).update({ [field]: newTitle } as any).eq("id", id);
    if (!error) {
      setPhotos(prev => prev.map(i => i.id === id ? { ...i, title: newTitle, caption: newTitle } : i));
      toast({ title: "Publicación editada con éxito" });
    } else {
      toast({ title: "Error", description: "No se pudo editar", variant: "destructive" });
    }
  };

  const handleHide = async (id: string, targetType: string) => {
    const table = targetType === "photo" ? "photos" : "social_content";
    const { error } = await supabase.from(table).update({ is_banned: true }).eq("id", id);
    if (!error) { toast({ title: "Publicación baneada." }); setPhotos(prev => prev.filter(i => i.id !== id)); setExpandedPhotoId(null); }
  };

  const handleDeletePost = async (id: string, targetType: string) => {
    if (!confirm("¿Seguro que quieres eliminar esta publicación permanentemente?")) return;
    const table = targetType === "photo" ? "photos" : "social_content";
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) {
      setPhotos(prev => prev.filter(i => i.id !== id));
      toast({ title: "Publicación eliminada" });
      setExpandedPhotoId(null);
    } else {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    }
  };

  const handleSaveToProfile = async (photo: any) => {
    if (!user) return;
    try { 
      const { error } = await supabase.from("saved_items" as any).insert({ 
        user_id: user.id, 
        item_type: photo.target_type || 'photo',
        original_id: photo.id,
        title: photo.caption || 'Foto de la comunidad',
        thumbnail_url: photo.image_url || photo.thumbnail_url,
        redirect_url: '/social/fotos?post=' + photo.id
      }); 
      if (error && error.code === '23505') toast({ title: "Aviso", description: "Ya tienes esta foto guardada en tu perfil." });
      else if (!error) toast({ title: "¡Guardada en tu Perfil!" }); 
    } catch (e) { }
  };

  // 🔥 HANDLER DE BOTONES TOP / NUEVOS 🔥
  const handleSetSort = (newSort: 'new' | 'popular') => {
    if (newSort === sort || isFetching) return;
    setPhotos([]);
    setPage(0);
    setHasMore(true);
    setSort(newSort);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // USEMEMO DE FILTRO (Amigos)
  const displayPhotos = useMemo(() => {
    return sourceTab === "friends" ? photos.filter(p => friendIds.includes(p.user_id)) : photos;
  }, [photos, sourceTab, friendIds]);

  // 🔥 SCROLL MAGIC DESDE GUARDADOS Y REPORTES 🔥
  const directPostId = searchParams.get("post") || searchParams.get("focus");
  const directCommentId = searchParams.get("comment");

  useEffect(() => {
    if (directPostId && !hasScrolled && displayPhotos.length > 0) {
      const index = displayPhotos.findIndex(item => item.id === directPostId);
      if (index !== -1) {
        let attempts = 0;
        const attemptScroll = () => {
          attempts++;
          const el = document.getElementById(`photo-post-${directPostId}`);
          if (el) {
            // 1. Scroll al elemento
            const elRect = el.getBoundingClientRect();
            const absoluteTop = elRect.top + window.pageYOffset;
            const middle = absoluteTop - (window.innerHeight / 2) + (elRect.height / 2);
            window.scrollTo({ top: middle, behavior: 'smooth' });
            
            // 2. Highlight arcade neón
            const cardElement = el.firstElementChild as HTMLElement | null;
            if (cardElement) {
               cardElement.classList.add('arcade-report-highlight');
               setTimeout(() => cardElement.classList.remove('arcade-report-highlight'), 3500);
            }

            // 3. Abrimos el modal de la foto reportada
            setExpandedPhotoId(directPostId);

            // 4. Si hay comentario, scroll dentro del modal cuando carga
            if (directCommentId) {
              let cAttempts = 0;
              const tryComment = () => {
                cAttempts++;
                const cEl = document.getElementById(`comment-${directCommentId}`);
                if (cEl) {
                  cEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  cEl.classList.add('arcade-report-highlight');
                  setTimeout(() => cEl.classList.remove('arcade-report-highlight'), 3500);
                } else if (cAttempts < 80) {
                  setTimeout(tryComment, 120);
                }
              };
              setTimeout(tryComment, 600);
            }

            setHasScrolled(true);
            window.history.replaceState({}, '', location.pathname);
          } else if (attempts < 50) {
            requestAnimationFrame(attemptScroll);
          } else {
            setHasScrolled(true);
          }
        };
        requestAnimationFrame(attemptScroll);
      } else if (hasMore && !isFetching) {
         fetchContent(false, sort);
      } else {
        setHasScrolled(true);
      }
    }
  }, [directPostId, directCommentId, displayPhotos, hasScrolled, location.pathname, hasMore, isFetching, sort]);

  // 🔥 OBSERVER DE SCROLL INFINITO (MASONRY) 🔥
  useEffect(() => {
    const currentRef = observerRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetching) {
          fetchContent(false, sort);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentRef);

    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isFetching, sort, photos.length]);

  const uploadPercentage = Math.min(100, (dailyApifyCount / APIFY_DAILY_LIMIT) * 100);
  const reachedPhotoLimit = !isStaff && userPhotoCount >= limits.maxPhotos;
  const reachedDailyLimit = !isStaff && dailyApifyCount >= APIFY_DAILY_LIMIT;

  return (
    <div className="space-y-6 animate-fade-in pb-20 max-w-[1200px] mx-auto px-1 md:px-4">

      <div className="bg-card border border-neon-orange/30 rounded-xl p-4 shadow-lg text-center md:text-left mx-2 md:mx-0 relative overflow-hidden">
        {isFetching && page === 0 && (
          <div className="absolute top-0 left-0 w-full h-1 bg-neon-orange animate-pulse z-50" />
        )}
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center justify-center md:justify-start gap-2">
          <Camera className="w-4 h-4" /> MURO FOTOGRÁFICO
        </h1>
        <p className="text-[10px] text-muted-foreground font-body uppercase tracking-tight">Galería de la comunidad — Haz clic para expandir</p>
      </div>

      <div className="sticky top-0 z-[100] py-2 bg-background/80 backdrop-blur-md px-2 md:px-0">
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

      <div className="flex justify-between items-center bg-card/30 p-2 rounded-lg border border-border/50 mx-2 md:mx-0 flex-wrap gap-2">
        <div className="flex gap-1 items-center">
          <Button onClick={() => setSourceTab("all")} variant="ghost" size="sm" className={cn("text-[10px] uppercase font-pixel px-2", sourceTab === "all" ? "text-white" : "opacity-50")}><Globe className="w-3 h-3 mr-1 hidden sm:inline" /> Todos</Button>
          <Button onClick={() => setSourceTab("friends")} variant="ghost" size="sm" className={cn("text-[10px] uppercase font-pixel px-2", sourceTab === "friends" ? "text-white" : "opacity-50")}><Users className="w-3 h-3 mr-1 hidden sm:inline" /> Amigos</Button>
          <div className="w-px h-5 bg-border mx-1" />
          {/* 🔥 BOTONES TOP / NUEVOS 🔥 */}
          <Button variant="ghost" size="sm" onClick={() => handleSetSort('popular')} className={cn("text-[10px] font-body h-7 px-3 transition-colors", sort === "popular" ? "bg-background text-neon-orange shadow-sm" : "text-muted-foreground hover:text-neon-orange")}>
             <Flame className={cn("w-3 h-3 mr-1", isFetching && sort === 'popular' && "animate-pulse")} /> Top
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleSetSort('new')} className={cn("text-[10px] font-body h-7 px-3 transition-colors", sort === "new" ? "bg-background text-neon-cyan shadow-sm" : "text-muted-foreground hover:text-neon-cyan")}>
             <Sparkles className={cn("w-3 h-3 mr-1", isFetching && sort === 'new' && "animate-pulse")} /> Nuevos
          </Button>
        </div>
        
        <Button 
          size="sm" 
          className="bg-neon-orange text-black hover:bg-neon-orange/80 h-8 text-[10px] uppercase font-pixel" 
          onClick={() => setShowUpload(!showUpload)} 
          disabled={reachedDailyLimit || reachedPhotoLimit}
        >
          <Camera className="w-3 h-3 mr-1 hidden sm:inline" /> 
          {reachedDailyLimit ? "Servidor Lleno" : reachedPhotoLimit ? "Límite Alcanzado" : "Subir Foto"}
        </Button>
      </div>

      {showUpload && (
        <div className="bg-card border border-neon-orange/30 rounded-xl p-4 space-y-3 animate-fade-in shadow-xl mx-2 md:mx-0">
          <div className="flex justify-between items-center text-[10px] text-muted-foreground font-body">
             <span>Límite de cuenta: {userPhotoCount} / {limits.maxPhotos} fotos</span>
          </div>
          <Input placeholder="URL de imagen o Link de Instagram" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="h-9 bg-black/40 text-xs border-border font-body" />
          <Textarea placeholder="Escribe una descripción..." value={caption} onChange={e => setCaption(e.target.value)} className="bg-black/40 text-xs min-h-[60px] border-border font-body" />
          <div className="flex justify-end gap-2 items-center">
             {uploading && <Loader2 className="w-4 h-4 animate-spin text-neon-orange mr-2" />}
             <Button variant="ghost" size="sm" onClick={() => setShowUpload(false)}>Cancelar</Button>
             <Button size="sm" onClick={handleUpload} disabled={uploading || !imageUrl.trim()} className="bg-neon-orange text-black">Publicar Foto</Button>
          </div>
        </div>
      )}

      {displayPhotos.length === 0 && !isFetching ? (
        <div className="py-20 text-center opacity-30">
          <ImageIcon className="w-16 h-16 mx-auto mb-4" />
          <p className="font-pixel text-xs uppercase">No hay fotos para mostrar</p>
        </div>
      ) : (
        <>
          <div className="columns-2 md:columns-3 lg:columns-3 gap-2 sm:gap-4 px-1 md:px-0 relative">
            {displayPhotos.map(photo => (
              <div 
                key={`${photo.target_type}-${photo.id}`}
                id={`photo-post-${photo.id}`}
                className="w-full mb-2 sm:mb-4 break-inside-avoid relative"
              >
                <PhotoCardMiniature
                  photo={photo}
                  onExpand={() => setExpandedPhotoId(photo.id)}
                  onReaction={handleReaction}
                  onHide={handleHide}
                  onDelete={handleDeletePost}
                  onSave={handleSaveToProfile}
                  userReaction={userReactions[photo.id]}
                  isStaff={isStaff}
                  onReport={() => setReportingPhotoIdMini(photo.id)}
                />
              </div>
            ))}
          </div>

          {hasMore && displayPhotos.length > 0 && (
            <div ref={observerRef} className="py-8 flex justify-center w-full">
               <Loader2 className="animate-spin text-neon-orange w-8 h-8 opacity-50" />
            </div>
          )}
        </>
      )}

      {/* 🔥 MODAL EXPANDIDO MÁGICO 🔥 */}
      {expandedPhotoId && (() => {
        const photo = photos.find(p => p.id === expandedPhotoId);
        if (!photo) return null;
        return (
          <ExpandedPhotoModal 
            photo={photo}
            onClose={() => setExpandedPhotoId(null)}
            onReaction={handleReaction}
            onHide={handleHide}
            onEdit={handleEditPost}
            onDelete={handleDeletePost}
            onSave={handleSaveToProfile}
            userReaction={userReactions[photo.id]}
            isStaff={isStaff}
            limits={limits}
          />
        );
      })()}

      {/* Report Modal from Mini Card */}
      {reportingPhotoIdMini && (() => {
          const photo = photos.find(p => p.id === reportingPhotoIdMini);
          if (!photo) return null;
          return (
              <ReportModal
                  reportedUserId={photo.user_id}
                  reportedUserName={photo.profiles?.display_name || "Anónimo"}
                  postId={photo.id}
                  onClose={() => setReportingPhotoIdMini(null)}
              />
          );
      })()}

    </div>
  );
}