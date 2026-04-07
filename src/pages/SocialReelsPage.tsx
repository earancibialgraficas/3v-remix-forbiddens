import { useState, useEffect, useRef } from "react";
import { Instagram, Youtube, Music2, Globe, ExternalLink, Video, Image, FileText, ChevronDown, X, Download, Maximize2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useFriendIds } from "@/hooks/useFriendIds";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

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

const getEmbedUrl = (url: string, platform: string, autoplay = false) => {
  if (platform === "youtube") {
    const shortMatch = url.match(/youtube\.com\/shorts\/([\w-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}${autoplay ? "?autoplay=1&mute=1" : ""}`;
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}${autoplay ? "?autoplay=1&mute=1" : ""}`;
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

function AutoplayVideo({ item, isVisible }: { item: SocialItem; isVisible: boolean }) {
  const embedUrl = getEmbedUrl(item.content_url, item.platform, isVisible);
  if (!embedUrl) {
    return (
      <div className="aspect-video bg-muted/30 flex items-center justify-center">
        <a href={item.content_url} target="_blank" rel="noopener" className="text-primary text-xs font-body hover:underline flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> Ver en {platformLabel(item.platform)}
        </a>
      </div>
    );
  }
  return (
    <div className="aspect-video">
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

function MediaModal({ item, onClose }: { item: SocialItem; onClose: () => void }) {
  const isVideo = isVideoContent(item);
  const isImage = isImageContent(item);
  const embedUrl = isVideo ? getEmbedUrl(item.content_url, item.platform) : null;

  const handleDownload = async () => {
    if (item.thumbnail_url || item.content_url) {
      const url = item.thumbnail_url || item.content_url;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-background/90 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2 w-full">
          <p className="text-xs font-body text-muted-foreground truncate">{item.title || "Sin título"}</p>
          <div className="flex items-center gap-2">
            {isImage && !isVideo && (
              <button onClick={handleDownload} className="p-1.5 rounded bg-muted hover:bg-muted/80 transition-colors" title="Descargar / Abrir original">
                <Download className="w-4 h-4 text-foreground" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded bg-muted hover:bg-muted/80 transition-colors">
              <X className="w-4 h-4 text-foreground" />
            </button>
          </div>
        </div>
        <div className="bg-card border border-border rounded overflow-hidden w-full">
          {isVideo && embedUrl ? (
            <div className="aspect-video">
              <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          ) : item.thumbnail_url ? (
            <img src={item.thumbnail_url} alt="" className="w-full max-h-[80vh] object-contain" />
          ) : (
            <div className="aspect-video flex items-center justify-center">
              <a href={item.content_url} target="_blank" rel="noopener" className="text-primary text-sm hover:underline flex items-center gap-2">
                <ExternalLink className="w-4 h-4" /> Abrir original
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContentCard({ item, isVisible, onMaximize }: { item: SocialItem; isVisible: boolean; onMaximize: () => void }) {
  const isVideo = isVideoContent(item);

  return (
    <div className="bg-card border border-border rounded overflow-hidden hover:border-neon-cyan/30 transition-colors relative group">
      {/* Maximize button */}
      <button
        onClick={onMaximize}
        className="absolute top-2 right-2 z-10 p-1 rounded bg-background/70 hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Maximizar"
      >
        <Maximize2 className="w-3.5 h-3.5 text-foreground" />
      </button>

      {isVideo ? (
        <AutoplayVideo item={item} isVisible={isVisible} />
      ) : (
        <div className="aspect-video bg-muted/30 flex items-center justify-center">
          {item.thumbnail_url ? (
            <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <a href={item.content_url} target="_blank" rel="noopener" className="text-primary text-xs font-body hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Ver en {platformLabel(item.platform)}
            </a>
          )}
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {item.avatar_url ? (
              <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : <span className="text-[10px]">👤</span>}
          </div>
          <Link to={`/usuario/${item.user_id}`} className="text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors">
            {item.display_name}
          </Link>
          <div className="ml-auto flex items-center gap-1">
            {platformIcon(item.platform)}
            <span className="text-[8px] font-body text-muted-foreground">{platformLabel(item.platform)}</span>
          </div>
        </div>
        <p className="text-xs font-body text-foreground truncate">{item.title || "Sin título"}</p>
        <a href={item.content_url} target="_blank" rel="noopener" className="text-[10px] text-primary hover:underline font-body flex items-center gap-1 mt-1">
          <ExternalLink className="w-3 h-3" /> Abrir original
        </a>
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
  const [modalItem, setModalItem] = useState<SocialItem | null>(null);
  const [showScrollHint, setShowScrollHint] = useState(true);
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
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const enriched = content.map(c => ({
        ...c,
        display_name: profileMap.get(c.user_id)?.display_name || "Anónimo",
        avatar_url: profileMap.get(c.user_id)?.avatar_url,
      }));
      setItems(enriched);
    };
    fetchPublicContent();
  }, []);

  // Intersection observer for autoplay
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

  // Hide scroll hint on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) setShowScrollHint(false);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-orange/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Music2 className="w-4 h-4" /> SOCIAL HUB
        </h1>
        <p className="text-xs text-muted-foreground font-body">
          Contenido compartido por la comunidad — organizado por tipo. Agrega el tuyo desde tu <Link to="/perfil" className="text-primary hover:underline">perfil</Link>.
        </p>
      </div>

      {/* Filters by content type */}
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

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded p-6 text-center">
          <p className="text-xs text-muted-foreground font-body">No hay contenido público aún. ¡Sé el primero en compartir!</p>
          <Button size="sm" asChild className="mt-3 text-xs"><Link to="/perfil">Agregar Contenido</Link></Button>
        </div>
      ) : (
        <div className="relative">
          <div ref={containerRef} className="grid grid-cols-1 gap-3">
            {filtered.map((item, i) => (
              <div key={item.id} data-card-index={i}>
                <ContentCard item={item} isVisible={i === visibleIndex} onMaximize={() => setModalItem(item)} />
              </div>
            ))}
          </div>

          {/* Floating scroll hint */}
          {showScrollHint && filtered.length > 1 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center animate-bounce pointer-events-none">
              <span className="text-[10px] font-body text-muted-foreground bg-card/80 backdrop-blur px-3 py-1 rounded-full border border-border">
                Desliza para ver más
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground mt-0.5" />
            </div>
          )}
        </div>
      )}

      {/* Media modal */}
      {modalItem && <MediaModal item={modalItem} onClose={() => setModalItem(null)} />}
    </div>
  );
}
