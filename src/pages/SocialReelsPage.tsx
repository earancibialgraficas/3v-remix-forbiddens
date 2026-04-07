import { useState, useEffect } from "react";
import { Instagram, Youtube, Music2, Globe, Eye, ExternalLink } from "lucide-react";
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
  if (p === "youtube") return <Youtube className="w-4 h-4 text-destructive" />;
  if (p === "instagram") return <Instagram className="w-4 h-4 text-neon-magenta" />;
  if (p === "tiktok") return <Music2 className="w-4 h-4 text-neon-cyan" />;
  return <Globe className="w-4 h-4 text-muted-foreground" />;
};

const getEmbedUrl = (url: string, platform: string) => {
  if (platform === "youtube") {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
};

export default function SocialReelsPage() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<SocialItem[]>([]);
  const [filter, setFilter] = useState<string>("all");

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

  const filtered = filter === "all" ? items : items.filter(i => i.platform === filter);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-orange/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-orange mb-1 flex items-center gap-2">
          <Music2 className="w-4 h-4" /> SOCIAL HUB
        </h1>
        <p className="text-xs text-muted-foreground font-body">
          Contenido compartido por la comunidad. Agrega el tuyo desde tu <Link to="/perfil" className="text-primary hover:underline">perfil</Link>.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-card border border-border rounded p-1 flex-wrap">
        {[
          { id: "all", label: "Todos", icon: Globe },
          { id: "youtube", label: "YouTube", icon: Youtube },
          { id: "instagram", label: "Instagram", icon: Instagram },
          { id: "tiktok", label: "TikTok", icon: Music2 },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded text-xs font-body transition-all",
              filter === f.id ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}>
            <f.icon className="w-3 h-3" /> {f.label}
          </button>
        ))}
      </div>

      {/* Content grid */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded p-6 text-center">
          <p className="text-xs text-muted-foreground font-body">No hay contenido público aún. ¡Sé el primero en compartir!</p>
          <Button size="sm" asChild className="mt-3 text-xs"><Link to="/perfil">Agregar Contenido</Link></Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(item => {
            const embedUrl = getEmbedUrl(item.content_url, item.platform);
            return (
              <div key={item.id} className="bg-card border border-border rounded overflow-hidden hover:border-neon-cyan/30 transition-colors">
                {embedUrl ? (
                  <div className="aspect-video">
                    <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted/30 flex items-center justify-center">
                    {platformIcon(item.platform)}
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {item.avatar_url ? (
                        <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : <span className="text-[10px]">👤</span>}
                    </div>
                    <span className="text-[10px] font-body text-muted-foreground">{item.display_name}</span>
                    {platformIcon(item.platform)}
                  </div>
                  <p className="text-xs font-body text-foreground truncate">{item.title || "Sin título"}</p>
                  <a href={item.content_url} target="_blank" rel="noopener" className="text-[10px] text-primary hover:underline font-body flex items-center gap-1 mt-1">
                    <ExternalLink className="w-3 h-3" /> Abrir en {item.platform}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
