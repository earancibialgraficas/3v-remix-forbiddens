import { handleMembershipError } from "@/components/UpgradeModal";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Flame, MessageSquare, ArrowUp, ArrowDown, Plus, Flag, X, Send, Reply, Image, Video, Bold, Italic, Underline, Link2, Smile, Maximize2, Download, Bookmark, Shield, Ban, Copy, User as UserIcon, Check, Edit2, Trash2, Search, ArrowLeft, Clock, AlignLeft, AlignCenter, AlignRight, Trophy, Users, UserPlus, Gamepad2, Star } from "lucide-react";
import RoleBadge from "@/components/RoleBadge";
import MembershipBadge from "@/components/MembershipBadge";
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
import { getAvatarBorderStyle, getNameStyle, getRoleStyle, getStaffRoleStyle } from "@/lib/profileAppearance";
import CommentModMenu from "@/components/CommentModMenu";
import { EditableCommentContent } from "@/components/EditableCommentContent";

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

function getSocialEmbed(url: string): { src: string; aspect: string } | null {
  // TikTok
  const tiktokMatch = url.match(/tiktok\.com\/(?:@[\w.-]+\/video|v)\/(\d+)/) || url.match(/vm\.tiktok\.com\/([\w]+)/);
  if (tiktokMatch) {
    return { src: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`, aspect: "aspect-[9/16] max-w-[360px] mx-auto" };
  }
  // Instagram (reel / p / tv)
  const igMatch = url.match(/instagram\.com\/(?:reel|p|tv)\/([\w-]+)/);
  if (igMatch) {
    return { src: `https://www.instagram.com/p/${igMatch[1]}/embed`, aspect: "aspect-[9/14] max-w-[420px] mx-auto" };
  }
  // Facebook (videos / watch / reels)
  if (/facebook\.com\/.+\/videos?\//.test(url) || /facebook\.com\/watch\/?\?v=/.test(url) || /facebook\.com\/reel\//.test(url) || /fb\.watch\//.test(url)) {
    return { src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`, aspect: "aspect-video" };
  }
  return null;
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
      // Embeds sociales (TikTok, Instagram, Facebook)
      const social = getSocialEmbed(part);
      if (social) {
        if (!permissions.allowVideo) return permissions.allowLinks ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{part}</a> : <span key={i}>{part}</span>;
        return (
          <div key={i} className={cn("relative w-full mt-2 mb-1 rounded overflow-hidden border border-border group", social.aspect)}>
            <iframe src={social.src} className="w-full h-full" allowFullScreen allow="autoplay; encrypted-media; picture-in-picture" title="Embed" />
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenMedia(social.src, "video"); }} className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 hover:bg-black border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm" title="Maximizar"><Maximize2 className="w-4 h-4 text-white" /></button>
          </div>
        );
      }
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

function renderAlignedContent(content: string, permissions: ContentPermissions, onOpenMedia: (src: string, type: "image"|"video") => void) {
  if (!content) return null;
  // Divide en bloques por [align=left|center|right]...[/align]. El resto queda como left por defecto.
  const regex = /\[align=(left|center|right)\]([\s\S]*?)\[\/align\]/g;
  const blocks: { align: "left"|"center"|"right"; text: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const before = content.slice(lastIndex, match.index);
      if (before.trim()) blocks.push({ align: "left", text: before });
    }
    blocks.push({ align: match[1] as any, text: match[2] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    const tail = content.slice(lastIndex);
    if (tail.trim()) blocks.push({ align: "left", text: tail });
  }
  if (blocks.length === 0) blocks.push({ align: "left", text: content });

  return blocks.map((b, idx) => (
    <div key={`align-${idx}`} style={{ textAlign: b.align }} className="w-full">
      {renderContent(b.text, permissions, onOpenMedia)}
    </div>
  ));
}

interface Comment { id: string; post_id: string; user_id: string; content: string; membership_tier: string; created_at: string; parent_id: string | null; profile?: any; roles?: string[]; original_content?: string | null; edited?: boolean; }
interface PostProfile { display_name: string; avatar_url: string | null; role_icon: string | null; show_role_icon: boolean; membership_tier: string; color_avatar_border: string | null; color_name: string | null; color_role: string | null; color_staff_role: string | null; signature: string | null; signature_image_url: string | null; }

export default function ForumPage() {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [authorStats, setAuthorStats] = useState<{ totalScore: number; followers: number; following: number; forum: number; social: number; games: number } | null>(null);
  const [authorStatColors, setAuthorStatColors] = useState<{ points?: string; followers?: string; following?: string; forum?: string; social?: string; games?: string }>({});

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

  const processedDeepLinkRef = useRef<string | null>(null);

  useEffect(() => { fetchPosts(); }, [category, sortBy, filterCategory, user?.id]);

  // Si cambia la categoría (ruta) mientras hay un post abierto, lo cerramos
  // para evitar que se quede "cargando" un post que no pertenece a esta sección.
  useEffect(() => {
    setSelectedPostId(null);
    setReplyTo(null);
    setCommentText("");
    setEditingPost(null);
    processedDeepLinkRef.current = null;
  }, [location.pathname]);

  useEffect(() => {
    if (directPostId && posts.length > 0 && processedDeepLinkRef.current !== directPostId) {
      processedDeepLinkRef.current = directPostId;
      setSelectedPostId(directPostId);
      fetchComments(directPostId);
    }
    // Si la URL ya no tiene ?post (back del navegador), cerramos el post abierto
    if (!directPostId && selectedPostId) {
      setSelectedPostId(null);
      setReplyTo(null);
      setCommentText("");
      setEditingPost(null);
      processedDeepLinkRef.current = null;
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
        } else if (attempts > 30) {
          clearInterval(scrollInterval);
        }
      } else {
        if (attempts === 1) window.scrollTo({ top: 0, behavior: 'smooth' });
        clearInterval(scrollInterval);
      }
    }, 100);

    return () => clearInterval(scrollInterval);
  }, [selectedPostId, directCommentId, posts, comments]);

  // Cargar estadísticas del autor del post abierto
  useEffect(() => {
    if (!selectedPostId) { setAuthorStats(null); return; }
    const post = posts.find(p => p.id === selectedPostId);
    if (!post?.user_id) { setAuthorStats(null); return; }
    const uid = post.user_id;
    let cancel = false;
    (async () => {
      try {
        const [profRes, followersRes, followingRes, forumRes, socialRes, scoresRes] = await Promise.all([
          supabase.from("profiles").select("total_score, color_stat_points, color_stat_followers, color_stat_following, color_stat_posts_forum, color_stat_posts_social, color_stat_games").eq("user_id", uid).maybeSingle(),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", uid),
          supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", uid),
          supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", uid).neq("is_banned", true),
          supabase.from("social_content" as any).select("*", { count: "exact", head: true }).eq("user_id", uid),
          supabase.from("leaderboard_scores").select("game_name, console_type").eq("user_id", uid),
        ]);
        if (cancel) return;
        const games = new Set((scoresRes.data || []).map((g: any) => `${g.game_name}|${g.console_type}`)).size;
        const p: any = profRes.data || {};
        setAuthorStats({
          totalScore: p.total_score || 0,
          followers: followersRes.count || 0,
          following: followingRes.count || 0,
          forum: forumRes.count || 0,
          social: socialRes.count || 0,
          games,
        });
        setAuthorStatColors({
          points: p.color_stat_points, followers: p.color_stat_followers, following: p.color_stat_following,
          forum: p.color_stat_posts_forum, social: p.color_stat_posts_social, games: p.color_stat_games,
        });
      } catch { if (!cancel) setAuthorStats(null); }
    })();
    return () => { cancel = true; };
  }, [selectedPostId, posts]);

  const openPost = (postId: string) => {
    setSelectedPostId(postId);
    fetchComments(postId);
    navigate(`${location.pathname}?post=${postId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closePost = () => {
    setSelectedPostId(null);
    setReplyTo(null);
    setCommentText("");
    setEditingPost(null);
    // Push (no replace) para que el botón "atrás" del navegador pueda volver al post
    navigate(location.pathname);
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
    if (title.trim().length > 150) { toast({ title: "Título muy largo", description: "Máx 150 caracteres.", variant: "destructive" }); return; }
    if (content.length > limits.maxForumChars) { toast({ title: "Contenido muy largo", description: `Tu membresía permite hasta ${limits.maxForumChars} caracteres.`, variant: "destructive" }); return; }
    setPosting(true);
    
    const customSig = (profile as any)?.signature;
    const signature = canUseSignature ? (customSig ? customSig : ((profile?.membership_tier && profile.membership_tier !== "novato") || isStaff ? `— ${profile?.display_name} [${isMasterWeb ? "MASTER WEB" : isAdmin ? "ADMIN" : "STAFF"}]` : null)) : null;

    const { error } = await supabase.from("posts").insert({ user_id: user.id, title: title.trim(), content: content.trim(), category: category === "trending" ? "gaming-anime-foro" : category, signature } as any);
    setPosting(false);
    if (error) { if (!handleMembershipError(error)) toast({ title: "Error", description: error.message, variant: "destructive" }); }
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
      // Primero intentamos el RPC atómico. Si la otra copia no lo tiene compatible,
      // hacemos fallback directo sobre post_votes con ids como string/text.
      const { data: rpcData, error: rpcErr } = await supabase.rpc("toggle_post_vote", {
        p_post_id: postId, p_user_id: user.id, p_vote_type: voteType,
      });

      let savedVote = newVote;
      let savedUpvotes = Math.max(0, newUp);
      let savedDownvotes = Math.max(0, newDown);

      if (rpcErr) {
        const { data: existingVote, error: existingErr } = await supabase
          .from("post_votes")
          .select("id, vote_type")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingErr) throw existingErr;

        if (existingVote) {
          if (existingVote.vote_type === voteType) {
            const { error: deleteErr } = await supabase
              .from("post_votes")
              .delete()
              .eq("id", existingVote.id);
            if (deleteErr) throw deleteErr;
            savedVote = null;
          } else {
            const { error: updateErr } = await supabase
              .from("post_votes")
              .update({ vote_type: voteType })
              .eq("id", existingVote.id);
            if (updateErr) throw updateErr;
            savedVote = voteType;
          }
        } else {
          const { error: insertErr } = await supabase
            .from("post_votes")
            .insert({ id: crypto.randomUUID(), post_id: postId, user_id: user.id, vote_type: voteType, created_at: new Date().toISOString() } as any);
          if (insertErr) throw insertErr;
          savedVote = voteType;
        }

        const { count: upCount, error: upCountErr } = await supabase
          .from("post_votes")
          .select("id", { count: "exact", head: true })
          .eq("post_id", postId)
          .eq("vote_type", "up");
        if (upCountErr) throw upCountErr;

        const { count: downCount, error: downCountErr } = await supabase
          .from("post_votes")
          .select("id", { count: "exact", head: true })
          .eq("post_id", postId)
          .eq("vote_type", "down");
        if (downCountErr) throw downCountErr;

        savedUpvotes = upCount ?? 0;
        savedDownvotes = downCount ?? 0;

        const { error: postUpdateErr } = await supabase
          .from("posts")
          .update({ upvotes: savedUpvotes, downvotes: savedDownvotes })
          .eq("id", postId);
        if (postUpdateErr) throw postUpdateErr;
      } else if (rpcData) {
        const r: any = rpcData;
        savedUpvotes = r.upvotes ?? savedUpvotes;
        savedDownvotes = r.downvotes ?? savedDownvotes;
        savedVote = r.user_vote ?? null;
      }

      setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: savedUpvotes, downvotes: savedDownvotes } : p));
      setUserVotes(prev => ({ ...prev, [postId]: savedVote }));
    } catch (error) {
      console.error("Vote save failed", error);
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
    
    if (error) { if (!handleMembershipError(error)) toast({ title: "Error", description: error.message, variant: "destructive" });
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
    else if (format === "align-left") setCommentText(prev => prev + "\n[align=left]texto[/align]\n");
    else if (format === "align-center") setCommentText(prev => prev + "\n[align=center]texto[/align]\n");
    else if (format === "align-right") setCommentText(prev => prev + "\n[align=right]texto[/align]\n");
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
        <div className="flex justify-end mb-2">
          <Button variant="ghost" size="sm" onClick={closePost} className="text-muted-foreground hover:text-foreground font-body font-bold text-xs uppercase">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver a la lista
          </Button>
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm" id={`post-${post.id}`}>
            <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="border-b lg:border-b-0 lg:border-r border-border/70 p-5 min-w-0">
                {post.user_id && authorProfile ? (
                  <div className="flex flex-col lg:items-center gap-3 lg:gap-0 w-full">
                    <div className="flex flex-row lg:flex-col items-stretch lg:items-center gap-3 sm:gap-4 lg:gap-0 w-full">
                      <div className="w-44 h-44 lg:w-24 lg:h-24 rounded-md lg:rounded-full border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-sm" style={getAvatarBorderStyle(authorProfile.color_avatar_border)}>
                        {authorProfile.avatar_url ? <img src={authorProfile.avatar_url} className="w-full h-full object-cover"/> : <UserIcon className="w-10 h-10 text-muted-foreground"/>}
                      </div>
                      <div className="min-w-0 flex-1 lg:w-full flex flex-col justify-center lg:items-center gap-2 lg:gap-1">
                        <UserPopup
                          userId={post.user_id} displayName={authorProfile.display_name} avatarUrl={authorProfile.avatar_url}
                          roles={authorRoles} roleIcon={authorProfile.role_icon} showRoleIcon={authorProfile.show_role_icon}
                          membershipTier={authorProfile.membership_tier} colorAvatarBorder={authorProfile.color_avatar_border}
                          colorName={authorProfile.color_name} colorRole={authorProfile.color_role} colorStaffRole={authorProfile.color_staff_role}
                          className="flex flex-row lg:flex-col flex-wrap items-center gap-1.5 lg:gap-1 hover:no-underline w-full"
                        >
                          <span className="text-[11px] sm:text-sm font-body font-semibold break-words" style={getNameStyle(authorProfile.color_name)}>
                            {authorProfile.display_name}
                          </span>
                          {authorRoles.some(r => ["master_web","admin","moderator"].includes((r||"").toLowerCase())) ? (
                            <>
                              <span className="inline-flex items-center text-[9px] sm:text-xs font-pixel px-1.5 py-0.5 rounded border bg-destructive/15 text-destructive border-destructive/30">
                                STAFF
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-[9px] sm:text-xs font-pixel px-1.5 py-0.5 rounded border",
                                  authorRoles.includes("master_web")
                                    ? "bg-neon-magenta/15 text-neon-magenta border-neon-magenta/30"
                                    : authorRoles.includes("admin")
                                    ? "bg-neon-yellow/15 text-neon-yellow border-neon-yellow/30"
                                    : "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/30"
                                )}
                                style={getStaffRoleStyle(authorProfile.color_staff_role)}
                              >
                                {authorProfile.show_role_icon !== false && authorProfile.role_icon && !authorRoles.includes("moderator") && (
                                  <span className="text-xs sm:text-sm">{authorProfile.role_icon}</span>
                                )}
                                {authorRoles.includes("master_web") ? "WebMaster" : authorRoles.includes("admin") ? "Admin" : "MOD"}
                              </span>
                            </>
                          ) : (
                            <MembershipBadge tier={authorProfile.membership_tier || "novato"} size="sm" colorRole={authorProfile.color_role} />
                          )}
                        </UserPopup>
                        {(authorProfile.signature || authorProfile.signature_image_url) && (
                          <div className="lg:hidden w-full mt-1 pt-2 border-t border-border/50">
                            <p className="text-[10px] text-muted-foreground font-body font-bold mb-1 uppercase text-left">Firma</p>
                            <SignatureDisplay text={authorProfile.signature} profile={authorProfile as any} fontSize={11} />
                          </div>
                        )}
                      </div>
                    </div>
                    {(authorProfile.signature || authorProfile.signature_image_url) && (
                      <div className="hidden lg:block w-full mt-4 pt-4 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground font-body font-bold mb-2 uppercase text-left">Firma</p>
                        <SignatureDisplay text={authorProfile.signature} profile={authorProfile as any} fontSize={11} />
                      </div>
                    )}
                    {authorStats && (
                      <div className="hidden lg:block w-full mt-4 pt-4 border-t border-border/50">
                        <p className="text-[10px] text-muted-foreground font-body font-bold mb-3 uppercase text-left tracking-wider flex items-center gap-1.5">
                          <Star className="w-3 h-3 text-neon-yellow" /> Estadísticas
                        </p>
                        <ul className="space-y-1.5">
                          {[
                            { icon: Trophy, label: "Puntos", value: authorStats.totalScore.toLocaleString(), color: authorStatColors.points || "#39ff14", glow: "rgba(57,255,20,0.55)" },
                            { icon: Users, label: "Seguidores", value: authorStats.followers.toLocaleString(), color: authorStatColors.followers || "#00ffff", glow: "rgba(0,255,255,0.55)" },
                            { icon: UserPlus, label: "Siguiendo", value: authorStats.following.toLocaleString(), color: authorStatColors.following || "#ff00ff", glow: "rgba(255,0,255,0.55)" },
                            { icon: MessageSquare, label: "Posts Foro", value: authorStats.forum.toLocaleString(), color: authorStatColors.forum || "#ffff00", glow: "rgba(255,255,0,0.55)" },
                            { icon: Image, label: "Posts Social", value: authorStats.social.toLocaleString(), color: authorStatColors.social || "#ff8c00", glow: "rgba(255,140,0,0.55)" },
                            { icon: Gamepad2, label: "Juegos", value: authorStats.games.toLocaleString(), color: authorStatColors.games || "#ff3366", glow: "rgba(255,51,102,0.55)" },
                          ]
                            .sort((a, b) => Number(String(b.value).replace(/[^\d-]/g, '')) - Number(String(a.value).replace(/[^\d-]/g, '')))
                            .map(({ icon: Icon, label, value, color, glow }) => (
                              <li
                                key={label}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border bg-black/30 backdrop-blur-sm"
                                style={{ borderColor: `${color}55`, boxShadow: `0 0 10px ${glow}, inset 0 0 8px rgba(0,0,0,0.5)` }}
                              >
                                <span className="flex items-center gap-1.5 text-[10px] font-pixel tracking-wider" style={{ color, textShadow: `0 0 6px ${glow}` }}>
                                  <Icon className="w-3 h-3" /> {label.toUpperCase()}
                                </span>
                                <span className="font-pixel text-[11px] tabular-nums" style={{ color, textShadow: `0 0 8px ${glow}` }}>
                                  {value}
                                </span>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-xs text-muted-foreground">Sistema</div>
                )}
              </aside>

              <section className="min-w-0 p-5">
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
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} maxLength={150} className="h-9 bg-muted text-sm font-body font-bold" />
                    <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} maxLength={limits.maxForumChars} className="bg-muted text-sm font-body min-h-[140px]" />
                    <div className="flex justify-between text-[9px] font-body text-muted-foreground -mt-1">
                      <span>Título: {editTitle.length}/150</span>
                      <span className={cn(editContent.length >= limits.maxForumChars ? "text-destructive font-bold" : "")}>{editContent.length}/{limits.maxForumChars}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {canUseImages && <button onClick={() => setEditContent(prev => prev + "![descripción](URL_de_imagen)")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Insertar imagen"><Image className="w-4 h-4" /></button>}
                      {canUseVideo && <button onClick={() => setEditContent(prev => prev + "https://youtube.com/watch?v=")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Insertar video"><Video className="w-4 h-4" /></button>}
                      {canUseBoldItalic && <button onClick={() => setEditContent(prev => prev + "**texto**")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Negrita"><Bold className="w-4 h-4" /></button>}
                      {canUseBoldItalic && <button onClick={() => setEditContent(prev => prev + "*texto*")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Itálica"><Italic className="w-4 h-4" /></button>}
                      {canUseBoldItalic && <button onClick={() => setEditContent(prev => prev + "[u]texto[/u]")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Subrayado"><Underline className="w-4 h-4" /></button>}
                      {canUseLinks && <button onClick={() => setEditContent(prev => prev + "[texto](URL)")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Enlace"><Link2 className="w-4 h-4" /></button>}
                      <div className="w-px h-5 bg-border mx-1" />
                      <button onClick={() => setEditContent(prev => prev + "\n[align=left]texto[/align]\n")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-neon-cyan transition-colors" title="Alinear izquierda"><AlignLeft className="w-4 h-4" /></button>
                      <button onClick={() => setEditContent(prev => prev + "\n[align=center]texto[/align]\n")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-neon-cyan transition-colors" title="Centrar"><AlignCenter className="w-4 h-4" /></button>
                      <button onClick={() => setEditContent(prev => prev + "\n[align=right]texto[/align]\n")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-neon-cyan transition-colors" title="Alinear derecha"><AlignRight className="w-4 h-4" /></button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEditPost(post.id)} className="text-xs gap-1 h-8"><Check className="w-3 h-3" /> Guardar</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPost(null)} className="text-xs h-8">Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl break-words" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, textAlign: (post.title_align as any) || 'left' }}>{post.title}</h1>
                    <div className="text-sm text-foreground leading-relaxed font-body mt-4 min-w-0">
                      {renderAlignedContent(post.content, postPermissions, (src, type) => setForumModal({ src, type }))}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 w-full">
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
                const commentRoles = comment.roles || [];
                const commentIsStaff = commentRoles.some(role => staffRoleNames.includes((role || '').toLowerCase()));
                return (
                  <div key={comment.id} id={`comment-${comment.id}`} className={cn("p-4 rounded bg-muted/20 border border-white/5", comment.parent_id && "ml-4 sm:ml-10 border-l-2 border-l-neon-cyan/50")}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <UserPopup
                        userId={comment.user_id} displayName={comment.profile?.display_name || "Anónimo"} avatarUrl={comment.profile?.avatar_url}
                        roles={commentRoles} roleIcon={comment.profile?.role_icon} showRoleIcon={comment.profile?.show_role_icon !== false}
                        membershipTier={comment.profile?.membership_tier || comment.membership_tier} colorAvatarBorder={comment.profile?.color_avatar_border}
                        colorName={comment.profile?.color_name} colorRole={comment.profile?.color_role} colorStaffRole={comment.profile?.color_staff_role}
                        className="flex items-center gap-3 text-left hover:no-underline min-w-0"
                      >
                        <div className="w-[50px] h-[50px] rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0" style={getAvatarBorderStyle(comment.profile?.color_avatar_border)}>
                          {comment.profile?.avatar_url ? <img src={comment.profile.avatar_url} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-body font-semibold truncate" style={getNameStyle(comment.profile?.color_name)}>{comment.profile?.display_name || "Anónimo"}</span>
                            {commentIsStaff ? (
                              <RoleBadge roles={commentRoles} roleIcon={comment.profile?.role_icon} showIcon={comment.profile?.show_role_icon !== false} colorStaffRole={comment.profile?.color_staff_role} />
                            ) : (
                              <MembershipBadge tier={comment.profile?.membership_tier || comment.membership_tier || 'novato'} size="xs" colorRole={comment.profile?.color_role} />
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-1"><Clock className="w-2.5 h-2.5"/> {new Date(comment.created_at).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </UserPopup>
                      <div className="flex items-center gap-2 sm:pt-1 sm:ml-auto">
                        {user && <button onClick={() => setReplyTo(comment.id)} className="text-muted-foreground hover:text-primary transition-colors text-[10px] flex items-center gap-0.5"><Reply className="w-3 h-3" /> <span>Responder</span></button>}
                        {user && comment.user_id !== user.id && <button onClick={() => setReportTarget({ userId: comment.user_id, userName: comment.profile?.display_name || "Anónimo", postId: comment.post_id, commentId: comment.id })} className="text-muted-foreground hover:text-destructive transition-colors text-[10px] flex items-center gap-0.5"><Flag className="w-3 h-3" /></button>}
                        <CommentModMenu commentId={comment.id} authorId={comment.user_id} authorName={comment.profile?.display_name} table="comments" onDeleted={(id) => setComments(prev => ({ ...prev, [post.id]: (prev[post.id] || []).filter(c => c.id !== id) }))} />
                      </div>
                    </div>
                    <div className="text-foreground text-xs leading-relaxed font-body pl-0 sm:pl-[62px] min-w-0">
                      <EditableCommentContent
                        commentId={comment.id}
                        content={comment.content}
                        originalContent={comment.original_content}
                        edited={comment.edited}
                        isOwner={!!user && comment.user_id === user.id}
                        table="comments"
                        renderContent={(c) => renderAlignedContent(c, commentPermissions, (src, type) => setForumModal({ src, type }))}
                        onUpdated={(newContent) => setComments(prev => ({ ...prev, [post.id]: (prev[post.id] || []).map(c => c.id === comment.id ? { ...c, content: newContent, edited: true, original_content: c.original_content || c.content } : c) }))}
                      />
                    </div>
                  </div>
                );
              })}
              {sortedComments.length === 0 && <p className="text-xs text-muted-foreground text-center py-4 italic">No hay comentarios aún. ¡Sé el primero!</p>}
            </div>

            {user ? (
              <div className="space-y-3 bg-muted/10 border border-border/50 rounded-lg p-4 w-full">
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
        {forumModal && <MediaModalForum src={forumModal.src} type={forumModal.type} onClose={() => setForumModal(null)} />}
        {reportTarget && <ReportModal reportedUserId={reportTarget.userId} reportedUserName={reportTarget.userName} postId={reportTarget.postId} commentId={reportTarget.commentId} contentLabel={reportTarget.commentId ? "Comentario" : "Publicación"} onClose={() => setReportTarget(null)} />}
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
          <Input placeholder="Título del post (máx 150)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} className="h-9 bg-muted text-sm font-body font-bold" />
          <Textarea placeholder={`Escribe tu contenido... (Máx ${limits.maxForumChars} carac.)`} value={content} onChange={(e) => setContent(e.target.value)} maxLength={limits.maxForumChars} className="bg-muted text-sm font-body min-h-[120px]" />
          <div className="flex justify-between text-[9px] font-body text-muted-foreground -mt-1">
            <span>Título: {title.length}/150</span>
            <span className={cn(content.length >= limits.maxForumChars ? "text-destructive font-bold" : "")}>{content.length}/{limits.maxForumChars}</span>
          </div>
          
          <div className="flex items-center gap-1 flex-wrap">
            {canUseImages && <button onClick={() => setContent(prev => prev + "![descripción](URL_de_imagen)")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Insertar imagen"><Image className="w-4 h-4" /></button>}
            {canUseVideo && <button onClick={() => setContent(prev => prev + "https://youtube.com/watch?v=")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Insertar video"><Video className="w-4 h-4" /></button>}
            {canUseBoldItalic && <button onClick={() => setContent(prev => prev + "**texto**")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Negrita"><Bold className="w-4 h-4" /></button>}
            {canUseBoldItalic && <button onClick={() => setContent(prev => prev + "*texto*")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Itálica"><Italic className="w-4 h-4" /></button>}
            {canUseBoldItalic && <button onClick={() => setContent(prev => prev + "[u]texto[/u]")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Subrayado"><Underline className="w-4 h-4" /></button>}
            {canUseLinks && <button onClick={() => setContent(prev => prev + "[texto](URL)")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Enlace"><Link2 className="w-4 h-4" /></button>}
            <div className="w-px h-5 bg-border mx-1" />
            <button onClick={() => setContent(prev => prev + "\n[align=left]texto[/align]\n")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-neon-cyan transition-colors" title="Alinear izquierda"><AlignLeft className="w-4 h-4" /></button>
            <button onClick={() => setContent(prev => prev + "\n[align=center]texto[/align]\n")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-neon-cyan transition-colors" title="Centrar"><AlignCenter className="w-4 h-4" /></button>
            <button onClick={() => setContent(prev => prev + "\n[align=right]texto[/align]\n")} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-neon-cyan transition-colors" title="Alinear derecha"><AlignRight className="w-4 h-4" /></button>
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
                  <h3 className="text-base truncate group-hover:text-neon-cyan transition-colors flex items-center gap-1.5" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, textAlign: (post.title_align as any) || 'left', justifyContent: post.title_align === 'center' ? 'center' : post.title_align === 'right' ? 'flex-end' : 'flex-start' }}>
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
                          >
                            <span className="text-xs font-body font-semibold truncate" style={getNameStyle(authorProfile.color_name)}>{authorProfile.display_name}</span>
                          </UserPopup>
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

      {reportTarget && <ReportModal reportedUserId={reportTarget.userId} reportedUserName={reportTarget.userName} postId={reportTarget.postId} commentId={reportTarget.commentId} contentLabel={reportTarget.commentId ? "Comentario" : "Publicación"} onClose={() => setReportTarget(null)} />}
    </div>
  );
}