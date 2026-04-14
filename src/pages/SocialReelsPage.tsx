import { useState, useEffect, useRef } from "react";
import { Instagram, Youtube, Music2, Globe, ExternalLink, Video, Image, FileText, X, Download, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useFriendIds } from "@/hooks/useFriendIds";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { getAvatarBorderStyle, getNameStyle } from "@/lib/profileAppearance";

interface SocialItem {
  id: string;
  user_id: string;
  platform: string;
  content_url: string;
  title: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  created_at: string;
  display_name?: string;
  avatar_url?: string | null;
  color_name?: string | null;
  color_avatar_border?: string | null;
}

const platformIcon = (p: string) => {
  if (p === "youtube") return <Youtube className="w-3.5 h-3.5 text-destructive" />;
  if (p === "instagram") return <Instagram className="w-3.5 h-3.5 text-neon-magenta" />;
  if (p === "tiktok") return <Music2 className="w-3.5 h-3.5 text-neon-cyan" />;
  return <Globe className="w-3.5 h-3.5 text-muted-foreground" />;
};

const platformLabel = (p: string) => {
  if (p === "youtube") return "YouTube";
  if (p === "instagram") return "Instagram";
  if (p === "tiktok") return "TikTok";
  return p;
};

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

const isVideoContent = (item: SocialItem) => {
  return item.platform === "youtube" || item.platform === "tiktok" ||
    item.content_url.includes("reel") || item.content_url.includes("shorts");
};

const isImageContent = (item: SocialItem) => {
  return item.content_url.match(/\.(jpg|jpeg|png|gif|webp)/i) ||
    (item.platform === "instagram" && !item.content_url.includes("reel"));
};

// TikTok-style scroll snap card
function SnapCard({ item, isVisible }: { item: SocialItem; isVisible: boolean }) {
  const embedUrl = getEmbedUrl(item.content_url, item.platform);
  const isVideo = isVideoContent(item);

  return (
    <div className="snap-start w-full flex-shrink-0 flex items-center justify-center" style={{ height: 'calc(100dvh - 200px)', minHeight: '400px' }}>
      <div className="w-full max-w-lg mx-auto bg-card border border-border rounded-lg overflow-hidden flex flex-col" style={{ height: '100%' }}>
        {/* Content area */}
        <div className="flex-1 relative bg-muted/30 flex items-center justify-center overflow-hidden">
          {isVideo && embedUrl ? (
            <iframe
              src={isVisible ? `${embedUrl}?autoplay=1&mute=1` : embedUrl}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : item.thumbnail_url ? (
            <img src={item.thumbnail_url} alt="" className="w-full h-full object-contain" />
          ) : embedUrl ? (
            <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
          ) : (
            <a href={item.content_url} target="_blank" rel="noopener" className="text-primary text-xs font-body hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Ver en {platformLabel(item.platform)}
            </a>
          )}
        </div>

        {/* Info bar */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden" style={getAvatarBorderStyle(item.color_avatar_border)}>
              {item.avatar_url ? (
                <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : <span className="text-[10px]">👤</span>}
            </div>
            <Link to={`/usuario/${item.user_id}`} className="text-[11px] font-body font-medium text-foreground hover:text-primary transition-colors" style={getNameStyle(item.color_name)}>
              {item.display_name}
            </Link>
            <div className="ml-auto flex items-center gap-1">
              {platformIcon(item.platform)}
              <span className="text-[9px] font-body text-muted-foreground">{platformLabel(item.platform)}</span>
            </div>
          </div>
          <p className="text-xs font-body text-foreground truncate">{item.title || "Sin título"}</p>
          <a href={item.content_url} target="_blank" rel="noopener" className="text-[10px] text-primary hover:underline font-body flex items-center gap-1 mt-1">
            <ExternalLink className="w-3 h-3" /> Abrir original
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SocialReelsPage() {
  const { user } = useAuth();
  const { friendIds } = useFriendIds(user?.id);
  const [items, setItems] = useState<SocialItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [sourceTab, setSourceTab] = useState<"all" | "friends">("all");
  const [visibleIndex, setVisibleIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPublicContent = async () => {
      const { data: content } = await supabase
        .from("social_content")
        .select("*")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!content || content.length === 0) { setItems([]); return; }

      const userIds = [...new Set(content.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, color_name, color_avatar_border")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const enriched = content.map(c => ({
        ...c,
        display_name: profileMap.get(c.user_id)?.display_name || "Anónimo",
        avatar_url: profileMap.get(c.user_id)?.avatar_url,
        color_name: profileMap.get(c.user_id)?.color_name || null,
        color_avatar_border: profileMap.get(c.user_id)?.color_avatar_border || null,
      }));
      setItems(enriched);
    };
    fetchPublicContent();
  }, []);

  // Intersection observer for scroll snap autoplay
  useEffect(() => {
    if (!containerRef.current) return;
    const cards = containerRef.current.querySelectorAll("[data-card-index]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt((entry.target as HTMLElement).dataset.cardIndex || "0");
            setVisibleIndex(idx);
          }
        });
      },
      { threshold: 0.6 }
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items, filter]);

  const sourceFiltered = sourceTab === "friends"
    ? items.filter(i => friendIds.includes(i.user_id))
    : items;

  const filtered = filter === "all"
    ? sourceFiltered
    : filter === "videos"
    ? sourceFiltered.filter(isVideoContent)
    : filter === "images"
    ? sourceFiltered.filter(isImageContent)
    : sourceFiltered.filter(i => !isVideoContent(i) && !isImageContent(i));

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="bg-card border border-neon-orange/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Music2 className="w-4 h-4" /> SOCIAL HUB
        </h1>
        <p className="text-xs text-muted-foreground font-body">
          Contenido compartido por la comunidad — scroll vertical estilo reels. Agrega el tuyo desde tu <Link to="/perfil" className="text-primary hover:underline">perfil</Link>.
        </p>
      </div>

      {/* Source tabs */}
      {user && (
        <div className="flex gap-1 bg-card border border-border rounded p-1">
          <button onClick={() => setSourceTab("all")}
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all",
              sourceTab === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Globe className="w-3 h-3" /> Todos
          </button>
          <button onClick={() => setSourceTab("friends")}
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all",
              sourceTab === "friends" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <Users className="w-3 h-3" /> Amigos
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-1 bg-card border border-border rounded p-1 flex-wrap">
        {[
          { id: "all", label: "Todos", icon: Globe },
          { id: "videos", label: "Videos", icon: Video },
          { id: "images", label: "Imágenes", icon: Image },
          { id: "other", label: "Otros", icon: FileText },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all",
              filter === f.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <f.icon className="w-3 h-3" /> {f.label}
          </button>
        ))}
      </div>

      {/* Scroll snap content */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded p-6 text-center">
          <p className="text-xs text-muted-foreground font-body">No hay contenido público aún. ¡Sé el primero en compartir!</p>
          <Button size="sm" asChild className="mt-3 text-xs"><Link to="/perfil">Agregar Contenido</Link></Button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="snap-y snap-mandatory overflow-y-auto"
          style={{ height: 'calc(100dvh - 200px)', scrollBehavior: 'smooth' }}
        >
          {filtered.map((item, i) => (
            <div key={item.id} data-card-index={i}>
              <SnapCard item={item} isVisible={i === visibleIndex} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
