import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Flame, MessageSquare, ArrowUp, ArrowDown, Plus, Flag, X, Send, Reply, Image, Video, Bold, Italic, Underline, Link2, Smile, Maximize2, Download, Bookmark, Shield, Ban, Copy, User as UserIcon, Check, Edit2, Trash2, Search, ArrowLeft, Clock } from "lucide-react";
import RoleBadge from "@/components/RoleBadge";
import UserPopup from "@/components/UserPopup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SignatureDisplay from "@/components/SignatureDisplay";
import ReportModal from "@/components/ReportModal";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits"; 
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getCategoryRoute } from "@/lib/categoryRoutes";
import { getAvatarBorderStyle, getNameStyle, getRoleStyle } from "@/lib/profileAppearance";

const pageTitles: Record<string, { title: string; description: string; color: string }> = {
  "/arcade": { title: "ZONA ARCADE", description: "Emuladores retro, salas de juego y leaderboards", color: "text-neon-green" },
  "/gaming-anime": { title: "GAMING & ANIME", description: "Comunidad de gaming, anime y manga", color: "text-neon-cyan" },
  "/gaming-anime/foro": { title: "FORO GENERAL", description: "Espacio para hablar de todo un poco", color: "text-neon-cyan" },
  "/gaming-anime/anime": { title: "ANIME & MANGA", description: "Debates, recomendaciones y reseñas", color: "text-neon-cyan" },
  "/gaming-anime/gaming": { title: "GAMING", description: "Debates, noticias y todo sobre videojuegos", color: "text-neon-green" },
  "/gaming-anime/creador": { title: "RINCÓN DEL CREADOR", description: "Comparte tu Fanart, Cosplays y proyectos creativos", color: "text-neon-cyan" },
  "/motociclismo": { title: "MOTOCICLISMO", description: "Riders, mecánica, rutas y quedadas", color: "text-neon-magenta" },
  "/motociclismo/riders": { title: "FORO DE RIDERS", description: "Discusiones sobre marcas, estilos y noticias motor", color: "text-neon-magenta" },
  "/motociclismo/taller": { title: "TALLER & MECÁNICA", description: "Tutoriales, manuales y consejos", color: "text-neon-magenta" },
  "/motociclismo/rutas": { title: "RUTAS & QUEDADAS", description: "Organiza viajes grupales y comparte rutas", color: "text-neon-magenta" },
  "/mercado": { title: "MERCADO & TRUEQUE", description: "Compra, vende e intercambia", color: "text-neon-yellow" },
  "/mercado/gaming": { title: "MERCADO GAMING", description: "Consolas retro, cartuchos y accesorios", color: "text-neon-yellow" },
  "/mercado/motor": { title: "MERCADO BIKERS", description: "Repuestos, cascos, chaquetas y motos", color: "text-neon-yellow" },
  "/social": { title: "SOCIAL HUB", description: "Feed, reels, galería y contenido social", color: "text-neon-orange" },
  "/social/feed": { title: "FEED PRINCIPAL", description: "Muro al estilo red social", color: "text-neon-orange" },
  "/trending": { title: "TRENDING", description: "Lo más popular del momento en el sitio", color: "text-destructive" },
  "/reglas": { title: "REGLAS", description: "Normas de convivencia del foro", color: "text-muted-foreground" },
  "/contacto": { title: "CONTACTO", description: "Reporta bugs o comportamiento inapropiado", color: "text-muted-foreground" },
  "/privacidad": { title: "PRIVACIDAD", description: "Política de privacidad", color: "text-muted-foreground" },
  "/faq": { title: "FAQ", description: "Preguntas frecuentes", color: "text-muted-foreground" },
  "/mensajes": { title: "MENSAJES", description: "Bandeja de mensajes privados", color: "text-neon-cyan" },
};

const forumCategories = [
  { id: "all", label: "Categorías" },
  { id: "gaming-anime-foro", label: "Foro General" },
  { id: "gaming-anime-anime", label: "Anime & Manga" },
  { id: "gaming-anime-gaming", label: "Gaming" },
  { id: "arcade-consejos", label: "Consejos Gaming" },
  { id: "gaming-anime-creador", label: "Rincón del Creador" },
  { id: "motociclismo-riders", label: "Foro de Riders" },
  { id: "motociclismo-taller", label: "Taller & Mecánica" },
  { id: "motociclismo-rutas", label: "Rutas & Quedadas" },
  { id: "mercado-gaming", label: "Mercado Gaming" },
  { id: "mercado-motor", label: "Mercado Motor" },
];

const mockPostsByCategory: Record<string, Array<any>> = {
  "gaming-anime": [
    { id: "ga1", title: "🎮 Los 10 mejores RPGs de la historia", content: "Después de una encuesta con más de 500 votos, aquí están los resultados.", upvotes: 245, downvotes: 12, is_pinned: true, user_id: "", created_at: new Date(Date.now() - 86400000).toISOString(), category: "gaming-anime" },
  ],
};

function MediaModalForum({ src, type, onClose }: { src: string; type: "image" | "video"; onClose: () => void }) {
  const isImage = type === "image";
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => { document.body.style.overflow = 'auto'; window.removeEventListener('keydown', handleKeyDown); };
  }, [onClose]);
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-5xl max-h-[92vh] flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.9)]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end mb-2 gap-2 w-full z-10">
          {isImage && <a href={src} download target="_blank" rel="noopener" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm" title="Descargar"><Download className="w-5 h-5 text-white" /></a>}
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-destructive/80 transition-colors border border-white/20 backdrop-blur-sm text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-black border border-white/10 rounded-xl overflow-hidden w-fit max-w-full relative flex items-center justify-center">
          {type === "video" ? <div className="aspect-video w-[min(90vw,960px)]"><iframe src={src} className="w-full h-full" allowFullScreen /></div> : <img src={src} alt="" className="block max-w-full max-h-[82vh] object-contain rounded-xl" />}
        </div>
      </div>
    </div>, document.body
  );
}

function extractThumbnail(content: string): string | null {
  if (!content) return null;
  const imgMatch = content.match(/\!\[.*?\]\((.*?)\)/);
  if (imgMatch) return imgMatch[1];
  const ytMatch = content.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  const rawImgMatch = content.match(/https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)/i);
  if (rawImgMatch) return rawImgMatch[0];
  return null;
}

type ContentPermissions = { allowRichText: boolean; allowImages: boolean; allowLinks: boolean; allowVideo: boolean; };
const elevatedTiers = ['coleccionista', 'miembro del legado', 'leyenda arcade', 'creador de contenido'];
const staffRoleNames = ['master_web', 'admin', 'moderator', 'master web', 'moderador', 'staff'];

function getContentPermissions(tier?: string | null, roles: string[] = []): ContentPermissions {
  const normalizedTier = (tier || 'novato').toLowerCase();
  const isAuthorStaff = roles.some(role => staffRoleNames.includes((role || '').toLowerCase())) || staffRoleNames.includes(normalizedTier);
  return {
    allowRichText: isAuthorStaff || normalizedTier !== 'novato',
    allowImages: isAuthorStaff || normalizedTier !== 'novato',
    allowLinks: isAuthorStaff || elevatedTiers.includes(normalizedTier),
    allowVideo: isAuthorStaff || elevatedTiers.includes(normalizedTier),
  };
}

function renderTextWithBreaks(text: string, keyPrefix: string) {
  return text.split('\n').map((line, j) => <span key={`${keyPrefix}-${j}`}>{line}{j < text.split('\n').length - 1 && <br />}</span>);
}

function renderInlineFormatting(text: string, permissions: ContentPermissions, keyPrefix: string) {
  if (!permissions.allowRichText) return renderTextWithBreaks(text, keyPrefix);
  return text.split(/(\*\*[\s\S]+?\*\*|\*[^*\n]+?\*|\[u\][\s\S]+?\[\/u\])/g).map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**')) return <strong key={`${keyPrefix}-b-${idx}`} className="font-semibold text-foreground">{renderTextWithBreaks(token.slice(2, -2), `${keyPrefix}-bt-${idx}`)}</strong>;
    if (token.startsWith('*') && token.endsWith('*')) return <em key={`${keyPrefix}-i-${idx}`} className="italic">{renderTextWithBreaks(token.slice(1, -1), `${keyPrefix}-it-${idx}`)}</em>;
    if (token.startsWith('[u]') && token.endsWith('[/u]')) return <span key={`${keyPrefix}-u-${idx}`} className="underline underline-offset-2">{renderTextWithBreaks(token.slice(3, -4), `${keyPrefix}-ut-${idx}`)}</span>;
    return <span key={`${keyPrefix}-t-${idx}`}>{renderTextWithBreaks(token, `${keyPrefix}-tt-${idx}`)}</span>;
  });
}

function renderContent(content: string, permissions: ContentPermissions, onOpenMedia: (src: string, type: "image"|"video") => void) {
  if (!content) return null;
  const parts = content.split(/(\!\[.*?\]\(.*?\)|\[.*?\]\(https?:\/\/.*?\)|https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[\w-]+|https?:\/\/(?:www\.)?youtu\.be\/[\w-]+|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    const imgMatch = part.match(/^\!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch && !permissions.allowImages) return <span key={i}>{renderInlineFormatting(part, permissions, `img-locked-${i}`)}</span>;
    if (imgMatch) return (
      <div key={i} className="relative group mt-3 mb-2 cursor-zoom-in w-fit max-w-full bg-black/40 rounded border border-border overflow-hidden mx-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenMedia(imgMatch[2], "image"); }}>
        <img src={imgMatch[2]} alt={imgMatch[1]} className="block max-w-full max-h-[70vh] w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"><div className="bg-black/60 p-2 rounded-full backdrop-blur-sm border border-white/20"><Maximize2 className="w-5 h-5 text-white" /></div></div>
      </div>
    );
    const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/.*?)\)$/);
    if (linkMatch) {
      if (!permissions.allowLinks) return <span key={i}>{renderInlineFormatting(part, permissions, `link-locked-${i}`)}</span>;
      return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{renderInlineFormatting(linkMatch[1], permissions, `link-${i}`)}</a>;
    }
    const ytMatch = part.match(/youtube\.com\/watch\?v=([\w-]+)/) || part.match(/youtu\.be\/([\w-]+)/);
    if (ytMatch) {
      if (!permissions.allowVideo) return permissions.allowLinks ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a> : <span key={i}>{part}</span>;
      const embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
      return (
        <div key={i} className="relative w-full aspect-video mt-2 mb-1 rounded overflow-hidden border border-border group">
          <iframe src={embedSrc} className="w-full h-full" allowFullScreen title="Video" />
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenMedia(embedSrc, "video"); }} className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 hover:bg-black border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm" title="Maximizar"><Maximize2 className="w-4 h-4 text-white" /></button>
        </div>
      );
    }
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      const isMedia = /\.(jpg|jpeg|png|gif|webp|mp4|webm)(\?.*)?$/i.test(part);
      if (isMedia && /\.(mp4|webm)(\?.*)?$/i.test(part)) {
        if (!permissions.allowVideo) return permissions.allowLinks ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a> : <span key={i}>{part}</span>;
        return (
          <div key={i} className="relative group mt-2 mb-1">
            <video src={part} controls className="w-full max-h-64 rounded border border-border" />
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenMedia(part, "video"); }} className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 hover:bg-black border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm" title="Maximizar"><Maximize2 className="w-4 h-4 text-white" /></button>
          </div>
        );
      }
      if (isMedia) {
        if (!permissions.allowImages) return permissions.allowLinks ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a> : <span key={i}>{part}</span>;
        return (
          <div key={i} className="relative group mt-3 mb-2 cursor-zoom-in w-fit max-w-full bg-black/40 rounded border border-border overflow-hidden mx-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenMedia(part, "image"); }}>
            <img src={part} alt="" className="block max-w-full max-h-[70vh] w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"><div className="bg-black/60 p-2 rounded-full backdrop-blur-sm border border-white/20"><Maximize2 className="w-5 h-5 text-white" /></div></div>
          </div>
        );
      }
      return permissions.allowLinks ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a> : <span key={i}>{part}</span>;
    }
    return <span key={i}>{renderInlineFormatting(part, permissions, `text-${i}`)}</span>;
  });
}

interface Comment { id: string; post_id: string; user_id: string; content: string; membership_tier: string; created_at: string; parent_id: string | null; profile?: any; roles?: string[]; }
interface PostProfile { display_name: string; avatar_url: string | null; role_icon: string | null; show_role_icon: boolean; membership_tier: string; color_avatar_border: string | null; color_name: string | null; color_role: string | null; color_staff_role: string | null; signature: string | null; signature_image_url: string | null; }

export default function ForumPage() {
  const location = useLocation();
  const page = pageTitles[location.pathname] || { title: "PÁGINA", description: "Sección del foro", color: "text-foreground" };
  const { user, profile, isAdmin, isMasterWeb, roles } = useAuth();
  const { toast } = useToast();
  
  const [showNewPost, setShowNewPost] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentsSort, setCommentsSort] = useState<"old" | "new">("old");

  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"popular" | "new">("new"); 
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [showRulesPopup, setShowRulesPopup] = useState(false);
  const [forumModal, setForumModal] = useState<{ src: string; type: "image" | "video" } | null>(null);
  const [postProfiles, setPostProfiles] = useState<Record<string, PostProfile>>({});
  const [postRoles, setPostRoles] = useState<Record<string, string[]>>({});
  const [userVotes, setUserVotes] = useState<Record<string, string | null>>({});
  const [reportTarget, setReportTarget] = useState<{ userId: string; userName: string; postId?: string; commentId?: string } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const category = location.pathname.replace(/^\//, "").replace(/\//g, "-") || "general";
  const isTrending = category === "trending";
  
  const isStaff = isAdmin || isMasterWeb || (roles || []).includes("moderator");
  const userTier = (profile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const limits = isStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[userTier];

  const canUseImages = isStaff || userTier !== 'novato';
  const canUseBoldItalic = isStaff || userTier !== 'novato';
  const canUseVideo = isStaff || ['coleccionista', 'miembro del legado', 'leyenda arcade', 'creador de contenido'].includes(userTier);
  const canUseLinks = canUseVideo; 
  const canUseSignature = isStaff || userTier !== 'novato';

  const searchParams = new URLSearchParams(location.search);
  const directPostId = searchParams.get("post") || searchParams.get("focus");
  const directCommentId = searchParams.get("comment");

  useEffect(() => {
    if (showRulesPopup) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [showRulesPopup]);

  const fetchPosts = async () => {
    let query = supabase.from("posts").select("*").neq("is_banned", true);
    if (!isTrending) {
      if (filterCategory !== "all") query = query.eq("category", filterCategory);
      else query = query.eq("category", category);
    } else {
      if (filterCategory !== "all") query = query.eq("category", filterCategory);
    }
    if (searchQuery.trim()) query = query.or(`title.ilike.%${searchQuery.trim()}%,content.ilike.%${searchQuery.trim()}%`);

    if (sortBy === "popular") query = query.order("upvotes", { ascending: false });
    else query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false });

    const { data } = await query.limit(20);
    
    if (data) {
      let finalData = [...data];
      if (directPostId && !finalData.find(p => p.id === directPostId)) {
        const { data: extraPost } = await supabase.from("posts").select("*").eq("id", directPostId).maybeSingle();
        if (extraPost && !extraPost.is_banned) finalData.unshift(extraPost);
      }

      setPosts(finalData);
      const userIds = [...new Set((finalData as any[]).map(p => p.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, role_icon, show_role_icon, membership_tier, color_avatar_border, color_name, color_role, color_staff_role, signature, signature_font, signature_font_family, signature_color, signature_stroke_color, signature_stroke_width, signature_stroke_position, signature_text_align, signature_image_url, signature_image_align, signature_image_width, signature_text_over_image, signature_font_size").in("user_id", userIds);
        const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
        const pMap: Record<string, PostProfile> = {};
        profiles?.forEach(p => pMap[p.user_id] = p as unknown as PostProfile);
        const rMap: Record<string, string[]> = {};
        roles?.forEach((r: any) => { if (!rMap[r.user_id]) rMap[r.user_id] = []; rMap[r.user_id].push(r.role); });
        setPostProfiles(pMap);
        setPostRoles(rMap);
      }
      if (user && finalData.length > 0) {
        const postIds = finalData.map((p: any) => p.id);
        const { data: votes } = await supabase.from("post_votes").select("post_id, vote_type").eq("user_id", user.id).in("post_id", postIds);
        const vMap: Record<string, string | null> = {};
        votes?.forEach((v: any) => { vMap[v.post_id] = v.vote_type; });
        setUserVotes(vMap);
      }
    }
  };

  const fetchComments = async (postId: string) => {
    const { data } = await supabase.from("comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    if (!data) return;
    const userIds = [...new Set((data as any[]).map(c => c.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url, role_icon, show_role_icon, membership_tier, color_avatar_border, color_name, color_role, color_staff_role").in("user_id", userIds);
    const { data: userRoles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);
    const profileMap: Record<string, any> = {};
    profiles?.forEach(p => profileMap[p.user_id] = p);
    const rolesMap: Record<string, string[]> = {};
    userRoles?.forEach((r: any) => { if (!rolesMap[r.user_id]) rolesMap[r.user_id] = []; rolesMap[r.user_id].push(r.role); });
    const enriched = (data as any[]).map(c => ({ ...c, profile: profileMap[c.user_id] || null, roles: rolesMap[c.user_id] || [] }));
    setComments((prev) => ({ ...prev, [postId]: enriched as Comment[] }));
  };

  useEffect(() => { fetchPosts(); }, [category, sortBy, filterCategory]);

  useEffect(() => {
    if (directPostId && posts.length > 0) {
      if (selectedPostId !== directPostId) {
        setSelectedPostId(directPostId);
        fetchComments(directPostId);
      }
    }
  }, [directPostId, posts]);

  useEffect(() => {
    if (!selectedPostId || posts.length === 0) return;

    let attempts = 0;
    const scrollInterval = setInterval(() => {
      attempts++;

      if (directCommentId) {
        const commentEl = document.getElementById(`comment-${directCommentId}`);
        if (commentEl) {
          clearInterval(scrollInterval);
          commentEl.scrollIntoView({ behavior: "smooth", block: "center" });
          commentEl.classList.add('arcade-report-highlight');
          setTimeout(() => commentEl.classList.remove('arcade-report-highlight'), 3500);
          window.history.replaceState({}, '', location.pathname); 
        } else if (attempts > 30) {
          clearInterval(scrollInterval);
          window.history.replaceState({}, '', location.pathname);
        }
      } else {
        if (attempts === 1) window.scrollTo({ top: 0, behavior: 'smooth' });
        clearInterval(scrollInterval);
      }
    }, 100);

    return () => clearInterval(scrollInterval);
  }, [selectedPostId, directCommentId, posts, comments]);

  const openPost = (postId: string) => {
    setSelectedPostId(postId);
    fetchComments(postId);
    window.history.pushState({}, '', `${location.pathname}?post=${postId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closePost = () => {
    setSelectedPostId(null);
    setReplyTo(null);
    setCommentText("");
    setEditingPost(null);
    window.history.pushState({}, '', location.pathname);
  };

  const handleNewPostClick = () => {
    const rulesKey = `rules_accepted_${user?.id}`;
    if (user && !localStorage.getItem(rulesKey)) { setShowRulesPopup(true); return; }
    setShowNewPost(!showNewPost);
  };

  const acceptRules = () => { if (user) localStorage.setItem(`rules_accepted_${user.id}`, "true"); setShowRulesPopup(false); setShowNewPost(true); };

  const handlePost = async () => {
    if (!user) { toast({ title: "Inicia sesión", description: "Debes registrarte", variant: "destructive" }); return; }
    if (!title.trim()) return;
    setPosting(true);
    
    const customSig = (profile as any)?.signature;
    const signature = canUseSignature ? (customSig ? customSig : ((profile?.membership_tier && profile.membership_tier !== "novato") || isStaff ? `— ${profile?.display_name} [${isMasterWeb ? "MASTER WEB" : isAdmin ? "ADMIN" : "STAFF"}]` : null)) : null;

    const { error } = await supabase.from("posts").insert({ user_id: user.id, title: title.trim(), content: content.trim(), category: category === "trending" ? "gaming-anime-foro" : category, signature } as any);
    setPosting(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { setTitle(""); setContent(""); setShowNewPost(false); toast({ title: "Post publicado" }); fetchPosts(); }
  };

  const votingRef = useRef<Record<string, boolean>>({});

  const handleVote = async (postId: string, voteType: "up" | "down") => {
    if (!user) { toast({ title: "Inicia sesión para votar", variant: "destructive" }); return; }
    if (votingRef.current[postId]) return;
    votingRef.current[postId] = true;

    const currentVote = userVotes[postId] || null;
    const post = posts.find(p => p.id === postId);
    if (!post) { votingRef.current[postId] = false; return; }

    let newUp = post.upvotes || 0;
    let newDown = post.downvotes || 0;
    let newVote: string | null;

    if (currentVote === voteType) {
      if (voteType === "up") newUp--; else newDown--; newVote = null;
    } else if (currentVote) {
      if (currentVote === "up") { newUp--; newDown++; } else { newDown--; newUp++; } newVote = voteType;
    } else {
      if (voteType === "up") newUp++; else newDown++; newVote = voteType;
    }

    setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: Math.max(0, newUp), downvotes: Math.max(0, newDown) } : p));
    setUserVotes(prev => ({ ...prev, [postId]: newVote }));

    try {
      const { data: existingVote } = await supabase.from("post_votes").select("id, vote_type").eq("post_id", postId).eq("user_id", user.id).maybeSingle();
      if (!existingVote) { await supabase.from("post_votes").insert({ id: crypto.randomUUID(), post_id: postId, user_id: user.id, vote_type: voteType }); } 
      else if (existingVote.vote_type === voteType) { await supabase.from("post_votes").delete().eq("id", existingVote.id); } 
      else { await supabase.from("post_votes").update({ vote_type: voteType }).eq("id", existingVote.id); }
      await supabase.from("posts").update({ upvotes: Math.max(0, newUp), downvotes: Math.max(0, newDown) }).eq("id", postId);
    } catch (error) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: post.upvotes, downvotes: post.downvotes } : p));
      setUserVotes(prev => ({ ...prev, [postId]: currentVote }));
      toast({ title: "Error", description: "No se pudo guardar tu voto.", variant: "destructive" });
    } finally { votingRef.current[postId] = false; }
  };

  const handleComment = async (postId: string) => {
    if (!user) { toast({ title: "Inicia sesión", description: "Debes registrarte", variant: "destructive" }); return; }
    if (!commentText.trim()) return;
    if (commentText.length > limits.maxForumChars) { toast({ title: "Comentario muy largo", description: `Máx ${limits.maxForumChars} caracteres.`, variant: "destructive" }); return; }

    const tier = isStaff ? (isMasterWeb ? 'Master Web' : isAdmin ? 'Admin' : 'Moderador') : (profile?.membership_tier || "novato");
    const { data: newCommentData, error } = await supabase.from("comments").insert({ post_id: postId, user_id: user.id, content: commentText.trim(), membership_tier: tier, parent_id: replyTo } as any).select().single();
    
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" });
    } else { 
      try {
        const post = posts.find(p => p.id === postId);
        const compositeId = `${postId}|${newCommentData.id}`;

        if (replyTo) {
          const parentComment = comments[postId]?.find(c => c.id === replyTo);
          if (parentComment && parentComment.user_id !== user.id) {
            await supabase.from("notifications").insert({
              id: crypto.randomUUID(), user_id: parentComment.user_id, type: 'reply_post', title: 'Nueva Respuesta',
              body: `${profile?.display_name || 'Alguien'} respondió a tu comentario en el foro.`, related_id: compositeId 
            } as any);
          }
        } else if (post && post.user_id !== user.id) {
          await supabase.from("notifications").insert({
            id: crypto.randomUUID(), user_id: post.user_id, type: 'comment_post', title: 'Nuevo Comentario',
            body: `${profile?.display_name || 'Alguien'} comentó tu publicación en el foro.`, related_id: compositeId 
          } as any);
        }
      } catch (e) {}

      setCommentText(""); setReplyTo(null); fetchComments(postId); 
    }
  };

  const handleReport = (postId: string, postUserId: string) => {
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
    const targetName = postProfiles[postUserId]?.display_name || "Usuario";
    setReportTarget({ userId: postUserId, userName: targetName, postId });
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("¿Eliminar permanentemente?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (!error) { toast({ title: "Post eliminado" }); fetchPosts(); if (selectedPostId === postId) closePost(); }
    else { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleHidePost = async (postId: string) => {
    const { error } = await supabase.from("posts").update({ is_banned: true } as any).eq("id", postId);
    if (!error) { toast({ title: "Post ocultado." }); fetchPosts(); if (selectedPostId === postId) closePost(); }
    else { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleSaveToProfile = async (post: any) => {
    if (!user) return;
    try { 
      const thumb = extractThumbnail(post.content);
      const { error } = await supabase.from("saved_items" as any).insert({ user_id: user.id, item_type: 'post', original_id: post.id, title: post.title || 'Post del Foro', thumbnail_url: thumb, redirect_url: getCategoryRoute(post.category || "gaming-anime-foro", post.id) }); 
      if (error && error.code === '23505') toast({ title: "Aviso", description: "Ya tienes esta publicación guardada." });
      else if (!error) toast({ title: "¡Guardado en tu Perfil!" }); 
    } catch (e) { }
  };

  const startEditPost = (post: any) => { setEditingPost(post.id); setEditTitle(post.title); setEditContent(post.content || ""); };

  const handleEditPost = async (postId: string) => {
    if (!editTitle.trim()) return;
    const { error } = await supabase.from("posts").update({ title: editTitle.trim(), content: editContent.trim() } as any).eq("id", postId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Post editado" }); setEditingPost(null); fetchPosts(); }
  };

  const insertFormat = (format: string) => {
    if (format === "bold") setCommentText(prev => prev + "**texto**");
    else if (format === "italic") setCommentText(prev => prev + "*texto*");
    else if (format === "underline") setCommentText(prev => prev + "[u]texto[/u]");
    else if (format === "image") setCommentText(prev => prev + "![descripción](URL_imagen)");
    else if (format === "link") setCommentText(prev => prev + "[texto](URL)");
    else if (format === "video") setCommentText(prev => prev + "https://youtube.com/watch?v=");
  };

  const mockThreads = posts.length > 0 ? [] : (
    isTrending ? [] : (mockPostsByCategory[category] || [
      { id: "default1", title: "¡Bienvenido a esta sección!", content: "Sé el primero en publicar algo aquí.", upvotes: 10, downvotes: 0, is_pinned: true, user_id: "", created_at: new Date().toISOString(), category },
    ])
  );

  const allPosts = [...posts, ...mockThreads];

  if (selectedPostId) {
    const post = allPosts.find(p => p.id === selectedPostId);
    if (!post) return <div className="p-8 text-center text-muted-foreground">Cargando publicación...</div>;

    const authorProfile = postProfiles[post.user_id];
    const authorRoles = postRoles[post.user_id] || [];
    const postPermissions = getContentPermissions(authorProfile?.membership_tier, authorRoles);
    const myVote = userVotes[post.id] || null;

    const postComments = comments[selectedPostId] || [];
    const sortedComments = [...postComments].sort((a, b) => {
      const tA = new Date(a.created_at).getTime();
      const tB = new Date(b.created_at).getTime();
      return commentsSort === "old" ? tA - tB : tB - tA;
    });

    return (
      <div className="space-y-4 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={closePost} className="text-muted-foreground hover:text-foreground -ml-2 mb-2 font-body font-bold text-xs uppercase">
          <ArrowLeft className="w-4 h-4 mr-1" /> Volver a la lista
        </Button>

        <div className="flex flex-col md:grid md:grid-cols-[30%_70%] gap-4 items-start">
          
          <div className="bg-card border border-border rounded-lg p-5 md:sticky md:top-4 flex flex-col items-center text-center w-full shadow-sm">
            {post.user_id && authorProfile ? (
              <>
                <div className="w-24 h-24 rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden mb-3 shadow-sm" style={getAvatarBorderStyle(authorProfile.color_avatar_border)}>
                  {authorProfile.avatar_url ? <img src={authorProfile.avatar_url} className="w-full h-full object-cover"/> : <UserIcon className="w-10 h-10 text-muted-foreground"/>}
                </div>
                <UserPopup
                  userId={post.user_id} displayName={authorProfile.display_name} avatarUrl={authorProfile.avatar_url}
                  roles={authorRoles} roleIcon={authorProfile.role_icon} showRoleIcon={authorProfile.show_role_icon}
                  membershipTier={authorProfile.membership_tier} colorAvatarBorder={authorProfile.color_avatar_border}
                  colorName={authorProfile.color_name} colorRole={authorProfile.color_role} colorStaffRole={authorProfile.color_staff_role}
                  className="text-base"
                />
                
                {(authorProfile.signature || authorProfile.signature_image_url) && (
                  <div className="w-full mt-5 pt-5 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground font-body font-bold mb-2 uppercase text-left">Firma</p>
                    <SignatureDisplay text={authorProfile.signature} profile={authorProfile as any} fontSize={11} />
                  </div>
                )}
              </>
            ) : (
              <div className="py-4 text-xs text-muted-foreground">Sistema</div>
            )}
          </div>

          <div className="flex flex-col gap-4 min-w-0 w-full" id={`post-${post.id}`}>
            <div className="bg-card border border-border rounded-lg p-5">
              
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-muted/30 px-2 py-1.5 rounded border border-white/5 shadow-inner">
                    <button onClick={() => handleVote(post.id, "up")} className={cn("hover:text-primary transition-colors", myVote === "up" ? "text-primary" : "text-muted-foreground")}><ArrowUp className="w-3.5 h-3.5" /></button>
                    <span className="text-xs font-bold w-6 text-center">{(post.upvotes||0)-(post.downvotes||0)}</span>
                    <button onClick={() => handleVote(post.id, "down")} className={cn("hover:text-destructive transition-colors", myVote === "down" ? "text-destructive" : "text-muted-foreground")}><ArrowDown className="w-3.5 h-3.5" /></button>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-body flex items-center gap-1 bg-muted/50 px-2 py-1.5 rounded">
                    <Clock className="w-3 h-3" /> {new Date(post.created_at).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {isTrending && post.category && <span className="uppercase text-[10px] font-body font-bold text-neon-cyan ml-1 hidden sm:inline-block">{post.category.replace(/-/g, ' ')}</span>}
                </div>

                <div className="flex items-center gap-1.5">
                  {user && user.id === post.user_id && !editingPost && (
                    <>
                      <button onClick={() => startEditPost(post)} className="p-1.5 text-muted-foreground hover:text-neon-cyan bg-muted/20 rounded transition-colors" title="Editar"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeletePost(post.id)} className="p-1.5 text-muted-foreground hover:text-destructive bg-muted/20 rounded transition-colors" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                  {user && <button onClick={() => handleSaveToProfile(post)} className="p-1.5 text-muted-foreground hover:text-neon-cyan bg-muted/20 rounded transition-colors" title="Guardar"><Bookmark className="w-3.5 h-3.5" /></button>}
                  {post.user_id && <button onClick={() => handleReport(post.id, post.user_id)} className="p-1.5 text-muted-foreground hover:text-destructive bg-muted/20 rounded transition-colors" title="Reportar"><Flag className="w-3.5 h-3.5" /></button>}
                  {isStaff && post.user_id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="p-1.5 text-muted-foreground hover:text-neon-magenta bg-muted/20 rounded transition-colors" title="Moderación"><Shield className="w-3.5 h-3.5" /></button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[200] bg-card border-border">
                        <DropdownMenuItem onClick={() => handleHidePost(post.id)} className="text-neon-orange cursor-pointer"><Ban className="w-3 h-3 mr-2" /> Ocultar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeletePost(post.id)} className="text-destructive cursor-pointer"><Trash2 className="w-3 h-3 mr-2" /> Eliminar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => window.location.href = `/usuario/${post.user_id}`} className="cursor-pointer"><UserIcon className="w-3 h-3 mr-2" /> Ver Perfil</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(post.id); toast({title:"ID Copiado"}); }} className="cursor-pointer"><Copy className="w-3 h-3 mr-2" /> Copiar ID</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {editingPost === post.id ? (
                <div className="space-y-3 animate-fade-in">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-9 bg-muted text-sm font-body font-bold" />
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="bg-muted text-sm font-body min-h-[120px]" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEditPost(post.id)} className="text-xs gap-1 h-8"><Check className="w-3 h-3" /> Guardar</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingPost(null)} className="text-xs h-8">Cancelar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl break-words" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>{post.title}</h1>
                  <div className="text-sm text-foreground leading-relaxed font-body mt-4">
                    {renderContent(post.content, postPermissions, (src, type) => setForumModal({ src, type }))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-5 border-b border-border/50 pb-3">
                <h3 className="font-body font-bold text-sm text-neon-cyan">COMENTARIOS ({postComments.length})</h3>
                <select value={commentsSort} onChange={e => setCommentsSort(e.target.value as any)} className="bg-muted border border-border text-[10px] font-body rounded px-2 py-1 outline-none">
                  <option value="old">Más antiguos</option>
                  <option value="new">Más recientes</option>
                </select>
              </div>

              <div className="space-y-3 mb-6">
                {sortedComments.map(comment => {
                  const commentPermissions = getContentPermissions(comment.profile?.membership_tier || comment.membership_tier, comment.roles || []);
                  return (
                    <div key={comment.id} id={`comment-${comment.id}`} className={cn("p-3.5 rounded bg-muted/20 border border-white/5", comment.parent_id && "ml-6 sm:ml-10 border-l-2 border-l-neon-cyan/50")}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <UserPopup
                            userId={comment.user_id} displayName={comment.profile?.display_name || "Anónimo"} avatarUrl={comment.profile?.avatar_url}
                            roles={comment.roles || []} roleIcon={comment.profile?.role_icon} showRoleIcon={comment.profile?.show_role_icon !== false}
                            membershipTier={comment.profile?.membership_tier || comment.membership_tier} colorAvatarBorder={comment.profile?.color_avatar_border}
                            colorName={comment.profile?.color_name} colorRole={comment.profile?.color_role} colorStaffRole={comment.profile?.color_staff_role}
                          />
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5"/> {new Date(comment.created_at).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {user && <button onClick={() => setReplyTo(comment.id)} className="text-muted-foreground hover:text-primary transition-colors text-[10px] flex items-center gap-0.5"><Reply className="w-3 h-3" /> <span className="hidden sm:inline">Responder</span></button>}
                          {user && comment.user_id !== user.id && <button onClick={() => setReportTarget({ userId: comment.user_id, userName: comment.profile?.display_name || "Anónimo", postId: comment.post_id, commentId: comment.id })} className="text-muted-foreground hover:text-destructive transition-colors text-[10px] flex items-center gap-0.5"><Flag className="w-3 h-3" /></button>}
                        </div>
                      </div>
                      <div className="text-foreground text-xs leading-relaxed font-body pl-1">
                        {renderContent(comment.content, commentPermissions, (src, type) => setForumModal({ src, type }))}
                      </div>
                    </div>
                  );
                })}
                {sortedComments.length === 0 && <p className="text-xs text-muted-foreground text-center py-4 italic">No hay comentarios aún. ¡Sé el primero!</p>}
              </div>

              {user ? (
                <div className="space-y-3 bg-muted/10 border border-border/50 rounded-lg p-4">
                  {replyTo && (
                    <div className="flex items-center gap-1 text-[10px] text-neon-cyan font-body mb-2">
                      <Reply className="w-3 h-3" /> Respondiendo al comentario
                      <button onClick={() => setReplyTo(null)} className="text-destructive ml-1 hover:bg-destructive/10 rounded p-0.5"><X className="w-3 h-3" /></button>
                    </div>
                  )}
                  
                  <Textarea placeholder={`Escribe tu comentario... (Máx ${limits.maxForumChars} carac.)`} value={commentText} onChange={(e) => setCommentText(e.target.value)} maxLength={limits.maxForumChars} className="bg-muted/50 text-sm font-body min-h-[90px] resize-y" />
                  
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1">
                      {canUseBoldItalic && <button onClick={() => insertFormat("bold")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Negrita"><Bold className="w-3.5 h-3.5" /></button>}
                      {canUseBoldItalic && <button onClick={() => insertFormat("italic")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Itálica"><Italic className="w-3.5 h-3.5" /></button>}
                      {canUseBoldItalic && <button onClick={() => insertFormat("underline")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Subrayado"><Underline className="w-3.5 h-3.5" /></button>}
                      {canUseImages && <button onClick={() => insertFormat("image")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Imagen"><Image className="w-3.5 h-3.5" /></button>}
                      {canUseLinks && <button onClick={() => insertFormat("link")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Enlace"><Link2 className="w-3.5 h-3.5" /></button>}
                      {canUseVideo && <button onClick={() => insertFormat("video")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Video"><Video className="w-3.5 h-3.5" /></button>}
                      <button onClick={() => setCommentText(prev => prev + "😊")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Emoji"><Smile className="w-3.5 h-3.5" /></button>
                    </div>
                    <span className={cn("text-[9px] font-body", commentText.length >= limits.maxForumChars ? "text-destructive font-bold" : "text-muted-foreground")}>{commentText.length}/{limits.maxForumChars}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/30">
                    <p className="text-[9px] text-muted-foreground font-body italic truncate max-w-[60%]">
                      {canUseSignature ? (isStaff ? `Firma: — ${profile?.display_name} [${isMasterWeb ? "MASTER WEB" : isAdmin ? "ADMIN" : "STAFF"}]` : "") : "Sin firma automática"}
                    </p>
                    <Button size="sm" onClick={() => handleComment(post.id)} disabled={!commentText.trim()} className="h-8 text-xs px-4 gap-1.5 shadow-sm">
                      <Send className="w-3.5 h-3.5" /> Enviar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center border border-border/50 rounded-lg bg-muted/10">
                  <p className="text-xs text-muted-foreground font-body">Debes iniciar sesión para participar en la discusión.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-border rounded p-4">
        <h1 className="text-xl mb-1" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>{page.title}</h1>
        <p className="text-xs text-muted-foreground font-body">{page.description}</p>
      </div>

      <div className="space-y-3">
        {user && !isTrending && (
          <div className="flex justify-start">
            <Button size="sm" className="h-8 text-[10px] font-body bg-primary text-primary-foreground shadow-md" onClick={handleNewPostClick}>
              <Plus className="w-3 h-3 mr-1" /> Nuevo Post
            </Button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded border border-border shadow-sm">
           <div className="flex gap-2 w-full lg:w-auto flex-1">
             <div className="relative flex-1">
               <Search className="absolute left-2.5 top-2 w-4 h-4 text-muted-foreground" />
               <Input 
                 placeholder="Buscar posts..." 
                 value={searchQuery} 
                 onChange={e => setSearchQuery(e.target.value)} 
                 onKeyDown={e => e.key === 'Enter' && fetchPosts()} 
                 className="pl-8 h-8 text-xs bg-muted border-border font-body w-full" 
               />
             </div>
             {isTrending && (
               <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="h-8 rounded border border-border bg-muted text-xs font-body px-2 text-muted-foreground focus:outline-none flex-shrink-0 w-28 sm:w-40 text-ellipsis overflow-hidden whitespace-nowrap cursor-pointer">
                  {forumCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
               </select>
             )}
           </div>
           
           <div className="flex items-center justify-between w-full lg:w-auto gap-2 shrink-0 mt-1 lg:mt-0">
             <div className="flex gap-1 bg-muted/50 p-0.5 rounded border border-border/50 w-full sm:w-auto">
                <Button variant="ghost" size="sm" className={cn("flex-1 sm:flex-none text-[10px] font-body font-bold h-7 px-3", sortBy === "popular" ? "bg-background text-neon-green shadow-sm" : "text-muted-foreground")} onClick={() => setSortBy("popular")}><Flame className="w-3 h-3 mr-1" /> Populares</Button>
                <Button variant="ghost" size="sm" className={cn("flex-1 sm:flex-none text-[10px] font-body font-bold h-7 px-3", sortBy === "new" ? "bg-background text-neon-green shadow-sm" : "text-muted-foreground")} onClick={() => setSortBy("new")}>Nuevos</Button>
             </div>
           </div>
        </div>
      </div>

      {showNewPost && (
        <div className="bg-card border border-neon-green/30 rounded p-4 space-y-3 animate-fade-in shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="font-body font-bold text-sm text-neon-green">NUEVO POST</h3>
            <button onClick={() => setShowNewPost(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <Input placeholder="Título del post" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 bg-muted text-sm font-body font-bold" />
          <Textarea placeholder="Escribe tu contenido..." value={content} onChange={(e) => setContent(e.target.value)} className="bg-muted text-sm font-body min-h-[120px]" />
          
          <div className="flex items-center gap-1 flex-wrap">
            {canUseImages && <button onClick={() => setContent(prev => prev + "![descripción](URL_de_imagen)")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Insertar imagen"><Image className="w-4 h-4" /></button>}
            {canUseVideo && <button onClick={() => setContent(prev => prev + "https://youtube.com/watch?v=")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Insertar video"><Video className="w-4 h-4" /></button>}
            {canUseBoldItalic && <button onClick={() => setContent(prev => prev + "**texto**")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Negrita"><Bold className="w-4 h-4" /></button>}
            {canUseBoldItalic && <button onClick={() => setContent(prev => prev + "*texto*")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Itálica"><Italic className="w-4 h-4" /></button>}
            {canUseBoldItalic && <button onClick={() => setContent(prev => prev + "[u]texto[/u]")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Subrayado"><Underline className="w-4 h-4" /></button>}
            {canUseLinks && <button onClick={() => setContent(prev => prev + "[texto](URL)")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Enlace"><Link2 className="w-4 h-4" /></button>}
          </div>
          
          <Button size="sm" onClick={handlePost} disabled={posting || !title.trim()} className="text-xs w-full sm:w-auto mt-2">
            {posting ? "Publicando..." : "Publicar Ahora"}
          </Button>
        </div>
      )}

      {allPosts.length === 0 ? (
        <div className="py-20 text-center opacity-50">
           <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
           <p className="font-body font-bold text-xs uppercase">No se encontraron resultados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allPosts.map((post) => {
            const authorProfile = postProfiles[post.user_id];
            const authorRoles = postRoles[post.user_id] || [];
            const myVote = userVotes[post.id] || null;

            return (
              <div 
                key={post.id} 
                onClick={() => openPost(post.id)}
                className={cn("flex flex-col sm:flex-row sm:items-center justify-between bg-card border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer gap-3 shadow-sm", post.is_pinned ? "border-neon-green/40 bg-neon-green/5" : "border-border")}
              >
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-base truncate group-hover:text-neon-cyan transition-colors flex items-center gap-1.5" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>
                    {post.is_pinned && <span className="text-neon-green text-xs">📌</span>}
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground font-body">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {new Date(post.created_at).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    {isTrending && post.category && <span className="uppercase bg-muted/50 px-1.5 py-0.5 rounded text-[10px] font-body font-bold text-neon-cyan border border-white/5">{post.category.replace(/-/g, ' ')}</span>}
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded border border-white/5 shadow-inner" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleVote(post.id, "up")} className={cn("hover:text-primary transition-colors", myVote === "up" ? "text-primary" : "text-muted-foreground")}><ArrowUp className="w-3.5 h-3.5" /></button>
                    <span className="text-xs font-bold w-5 text-center text-foreground">{(post.upvotes||0)-(post.downvotes||0)}</span>
                    <button onClick={() => handleVote(post.id, "down")} className={cn("hover:text-destructive transition-colors", myVote === "down" ? "text-destructive" : "text-muted-foreground")}><ArrowDown className="w-3.5 h-3.5" /></button>
                  </div>
                  
                  <div className="flex items-center justify-end w-[130px] gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {authorProfile ? (
                      <>
                        <div className="min-w-0 flex-1 flex justify-end">
                          <UserPopup
                            userId={post.user_id} displayName={authorProfile.display_name} avatarUrl={authorProfile.avatar_url}
                            roles={authorRoles} roleIcon={authorProfile.role_icon} showRoleIcon={authorProfile.show_role_icon}
                            membershipTier={authorProfile.membership_tier} colorAvatarBorder={authorProfile.color_avatar_border}
                            colorName={authorProfile.color_name} colorRole={authorProfile.color_role} colorStaffRole={authorProfile.color_staff_role}
                            className="text-xs hover:bg-muted/30 p-1 rounded-md transition-colors truncate max-w-full text-right"
                          />
                        </div>
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border" style={getAvatarBorderStyle(authorProfile.color_avatar_border)}>
                          {authorProfile.avatar_url ? <img src={authorProfile.avatar_url} className="w-full h-full object-cover"/> : <UserIcon className="w-4 h-4 text-muted-foreground"/>}
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-muted-foreground w-8 h-8 bg-muted rounded-full flex items-center justify-center"><UserIcon className="w-4 h-4"/></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRulesPopup && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[4000] bg-black/90 backdrop-blur-md animate-fade-in" onClick={() => setShowRulesPopup(false)}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-card border border-neon-green/30 rounded-lg p-5 animate-scale-in space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar shadow-[0_0_50px_rgba(0,0,0,0.9)]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowRulesPopup(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            <h3 className="font-body font-bold text-sm text-neon-green text-center">📜 REGLAS DE CONVIVENCIA</h3>
            <div className="text-xs font-body text-muted-foreground space-y-2">
              <p>Antes de publicar, acepta las reglas de la comunidad:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Respeto:</strong> Trata a todos con respeto. No se toleran insultos, acoso ni discriminación.</li>
                <li><strong>No spam:</strong> No publiques contenido repetitivo o publicidad no autorizada.</li>
                <li><strong>Contenido apropiado:</strong> No publiques contenido explícito, violento o ilegal.</li>
                <li><strong>Sin spoilers:</strong> Usa advertencias de spoiler en títulos cuando sea necesario.</li>
                <li><strong>Publica en la categoría correcta:</strong> Asegúrate de que tu post esté en la sección adecuada.</li>
                <li><strong>No doxxing:</strong> No compartas información personal de otros sin su consentimiento.</li>
                <li><strong>Reporta:</strong> Si ves contenido inapropiado, usa el botón de reportar.</li>
              </ul>
              <p className="text-[10px] italic">El incumplimiento puede resultar en suspensión temporal o permanente.</p>
            </div>
            <Button size="sm" onClick={acceptRules} className="w-full text-xs shadow-[0_0_15px_rgba(57,255,20,0.4)]">Acepto las reglas — Continuar</Button>
          </div>
        </div>, document.body
      )}

      {forumModal && <MediaModalForum src={forumModal.src} type={forumModal.type} onClose={() => setForumModal(null)} />}
      {reportTarget && <ReportModal reportedUserId={reportTarget.userId} reportedUserName={reportTarget.userName} postId={reportTarget.postId} commentId={reportTarget.commentId} contentLabel={reportTarget.commentId ? "Comentario" : "Publicación"} onClose={() => setReportTarget(null)} />}
    </div>
  );
}