import { useState, useEffect, useRef } from "react";
import { Instagram, Youtube, Music2, Globe, ExternalLink, Video, Image, FileText, Heart, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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

function ContentCard({ item, isVisible }: { item: SocialItem; isVisible: boolean }) {
  const isVideo = isVideoContent(item);

  return (
    <div className="bg-card border border-border rounded overflow-hidden hover:border-neon-cyan/30 transition-colors">
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
  const [items, setItems] = useState<SocialItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
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

  const filtered = filter === "all"
    ? items
    : filter === "videos"
    ? items.filter(isVideoContent)
    : filter === "images"
    ? items.filter(isImageContent)
    : items.filter(i => !isVideoContent(i) && !isImageContent(i));

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
        <div ref={containerRef} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((item, i) => (
            <div key={item.id} data-card-index={i}>
              <ContentCard item={item} isVisible={i === visibleIndex} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
