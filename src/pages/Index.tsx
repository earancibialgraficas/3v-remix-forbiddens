import { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, MessageSquare, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import ForumCategories from "@/components/ForumCategories";
import HomeCarousel from "@/components/HomeCarousel";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PostItem {
  id: string;
  title: string;
  content: string;
  category: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  is_pinned: boolean;
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  "gaming-anime": { label: "Gaming & Anime", color: "text-neon-cyan" },
  "gaming-anime-foro": { label: "Foro General", color: "text-neon-cyan" },
  "gaming-anime-anime": { label: "Anime", color: "text-neon-cyan" },
  "gaming-anime-creador": { label: "Creador", color: "text-neon-cyan" },
  "motociclismo": { label: "Motociclismo", color: "text-neon-magenta" },
  "motociclismo-riders": { label: "Riders", color: "text-neon-magenta" },
  "motociclismo-taller": { label: "Taller", color: "text-neon-magenta" },
  "motociclismo-rutas": { label: "Rutas", color: "text-neon-magenta" },
  "mercado-gaming": { label: "Mercado Gaming", color: "text-neon-yellow" },
  "mercado-motor": { label: "Mercado Motor", color: "text-neon-yellow" },
  "social-feed": { label: "Social", color: "text-neon-orange" },
  "trending": { label: "Trending", color: "text-destructive" },
};

export default function Index() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, content, category, upvotes, downvotes, created_at, is_pinned")
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) setPosts(data);
      setLoading(false);
    };
    fetchAll();

    const channel = supabase.channel("all-posts-home")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
      <HeroSection />
      <ForumCategories />
      <HomeCarousel />

      {/* Infinite posts feed */}
      <div>
        <h2 className="font-pixel text-xs text-neon-green text-glow-green mb-3 flex items-center gap-2">
          <Flame className="w-3.5 h-3.5" /> TODOS LOS POSTS
        </h2>
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-muted-foreground font-body">Cargando posts...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground font-body">Aún no hay posts. ¡Sé el primero en publicar!</div>
          ) : (
            posts.map((post) => {
              const cat = categoryLabels[post.category] || { label: post.category, color: "text-foreground" };
              return (
                <Link
                  key={post.id}
                  to={`/${post.category.replace(/-/g, "/")}?post=${post.id}`}
                  className="block bg-card border border-border rounded p-3 hover:bg-muted/30 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-0.5 text-muted-foreground shrink-0">
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-body font-semibold">{(post.upvotes || 0) - (post.downvotes || 0)}</span>
                      <ArrowDown className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("font-pixel text-[8px]", cat.color)}>{cat.label}</span>
                        <span className="text-[9px] text-muted-foreground font-body">{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-body text-foreground group-hover:text-primary transition-colors leading-snug">
                        {post.is_pinned && <span className="text-neon-green text-[10px] mr-1">📌</span>}
                        {post.title}
                      </p>
                      {post.content && (
                        <p className="text-[10px] text-muted-foreground font-body mt-0.5 line-clamp-1">{post.content.replace(/!\[.*?\]\(.*?\)/g, "[imagen]")}</p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
