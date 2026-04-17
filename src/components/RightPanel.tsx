import { useState, useEffect } from "react";
import { Users, Trophy, Newspaper, ChevronLeft, ChevronRight, Type, Star, BookOpen } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { getNameStyle, getRoleStyle } from "@/lib/profileAppearance";
import Footer from "@/components/Footer";
import ChillMusicPlayer from "@/components/ChillMusicPlayer";
import { getCategoryRoute } from "@/lib/categoryRoutes";

interface TopUser { display_name: string; total_score: number; color_name?: string | null; }
interface PremiumUser { display_name: string; membership_tier: string; created_at: string; color_name?: string | null; color_role?: string | null; }
interface PopularPost { id: string; title: string; category: string; upvotes: number; }

const categoryColors: Record<string, { color: string; label: string }> = {
  "general": { color: "text-foreground", label: "General" },
  "gaming-anime-foro": { color: "text-neon-cyan", label: "Gaming & Anime" },
  "gaming-anime-anime": { color: "text-neon-cyan", label: "Anime & Manga" },
  "gaming-anime-creador": { color: "text-neon-cyan", label: "Creador" },
  "motociclismo-riders": { color: "text-neon-magenta", label: "Riders" },
  "motociclismo-taller": { color: "text-neon-magenta", label: "Taller" },
  "motociclismo-rutas": { color: "text-neon-magenta", label: "Rutas" },
  "mercado-gaming": { color: "text-neon-yellow", label: "Mercado Gaming" },
  "mercado-motor": { color: "text-neon-yellow", label: "Mercado Bikers" },
  "social-feed": { color: "text-neon-orange", label: "Social" },
  "trending": { color: "text-destructive", label: "Trending" },
};

const fallbackNews = [
  { id: "1", title: "Torneo Retro de Super Mario Bros 3 — ¡Inscripciones abiertas!", category: "eventos", upvotes: 50 },
  { id: "2", title: "One Piece capítulo 1150: Discusión semanal", category: "gaming-anime-anime", upvotes: 40 },
  { id: "3", title: "Rodada nocturna CDMX — Sábado 12 de Abril", category: "motociclismo-rutas", upvotes: 30 },
];

const SLIDE_DURATION = 4000;

type TextSize = "sm" | "md" | "lg";
const textSizeMap: Record<TextSize, { body: string; title: string; stat: string }> = {
  sm: { body: "text-[9px]", title: "text-[8px]", stat: "text-[10px]" },
  md: { body: "text-[11px]", title: "text-[10px]", stat: "text-xs" },
  lg: { body: "text-[13px]", title: "text-xs", stat: "text-sm" },
};

export default function RightPanel() {
  const { user } = useAuth();
  const [currentNews, setCurrentNews] = useState(0);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [textSize, setTextSize] = useState<TextSize>("md");
  const [progress, setProgress] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);

  const sizes = textSizeMap[textSize];
  const cycleSize = () => setTextSize(p => p === "sm" ? "md" : p === "md" ? "lg" : "sm");
  const newsItems = popularPosts.length > 0 ? popularPosts : fallbackNews;

  // Lógica del Carrusel Trending
  useEffect(() => {
    const timer = setInterval(() => { 
      setCurrentNews(p => (p + 1) % newsItems.length); 
      setProgress(0); 
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [newsItems.length]);

  useEffect(() => {
    setProgress(0);
    const step = 50;
    const inc = 100 / (SLIDE_DURATION / step);
    const timer = setInterval(() => setProgress(p => Math.min(p + inc, 100)), step);
    return () => clearInterval(timer);
  }, [currentNews]);

  // Obtención de datos con protecciones
  useEffect(() => {
    const fetchTop = async () => {
      try {
        const { data } = await supabase.from("profiles").select("display_name, total_score, color_name").order("total_score", { ascending: false }).limit(5);
        if (data) setTopUsers(data as unknown as TopUser[]);
      } catch (e) { console.error("Error fetching top users:", e); }
    };
    fetchTop();
  }, []);

  useEffect(() => {
    const fetchPremium = async () => {
      try {
        const { data } = await supabase.from("profiles").select("display_name, membership_tier, created_at, color_name, color_role").neq("membership_tier", "novato").order("created_at", { ascending: true }).limit(3);
        if (data) setPremiumUsers(data as unknown as PremiumUser[]);
      } catch (e) { console.error("Error fetching premium users:", e); }
    };
    fetchPremium();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: members } = await supabase.from("profiles").select("*", { count: "exact", head: true });
        setMemberCount(members || 0);
        const { count: posts } = await supabase.from("posts").select("*", { count: "exact", head: true });
        setPostCount(posts || 0);
        setOnlineCount(100 + Math.floor(Math.random() * 20)); 
      } catch (e) { console.error("Error fetching stats:", e); }
    };
    fetchStats();
  }, []);

  const news = newsItems[currentNews % newsItems.length];
  const catInfo = categoryColors[news?.category] || { color: "text-foreground", label: news?.category || "General" };
  const badges = ["🏆", "⚔️", "🏍️", "👑", "🎮"];
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    /* 🔥 CAMBIO APLICADO: Altura fija, scroll habilitado y barra oculta */
    <aside className="w-full shrink-0 space-y-3 pb-6 h-[calc(100vh-80px)] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* Controles superiores */}
      <div className="flex items-center justify-end gap-1 sticky top-0 bg-background/80 backdrop-blur-sm z-10 py-1">
        {!isHome && (
          <div className="flex items-center gap-0.5 rounded bg-card border border-border p-0.5">
            <button onClick={() => navigate(-1)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button onClick={() => navigate(1)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        )}
        <button onClick={cycleSize} className="flex items-center gap-1 px-2 py-1 rounded bg-card border border-border text-muted-foreground hover:text-foreground">
          <Type className="w-3 h-3" />
          <span className={cn("font-body uppercase font-pixel tracking-tighter", sizes.body)}>{textSize}</span>
        </button>
      </div>

      {/* Caja de Comunidad */}
      <div className="bg-card border border-border rounded p-3">
        <h3 className={cn("font-pixel mb-1", sizes.title)} style={{ color: '#de1839', textShadow: '0 0 8px rgba(222, 24, 57, 0.6)' }}>FORBIDDENS</h3>
        <div className="grid grid-cols-3 gap-1 my-3">
          <div className="text-center"><p className={cn("font-bold text-foreground font-body", sizes.stat)}>{memberCount}</p><p className={cn("text-muted-foreground", sizes.title)}>Miembros</p></div>
          <div className="text-center"><p className={cn("font-bold text-neon-green font-body", sizes.stat)}>{onlineCount}</p><p className={cn("text-muted-foreground", sizes.title)}>Online</p></div>
          <div className="text-center"><p className={cn("font-bold text-foreground font-body", sizes.stat)}>{postCount}</p><p className={cn("text-muted-foreground", sizes.title)}>Posts</p></div>
        </div>
        <div className="flex gap-2">
          {!user && <Button asChild className="flex-1 bg-primary text-[10px] h-7"><Link to="/registro">Unirse</Link></Button>}
          <Button asChild className="flex-1 bg-[#5865F2] text-white text-[10px] h-7">
            <a href="https://discord.gg/ZHNRKVUfVF" target="_blank" rel="noopener noreferrer">Discord</a>
          </Button>
        </div>
      </div>

      {/* Caja de Trending */}
      <div className="bg-card border border-neon-cyan/30 rounded overflow-hidden">
        <div className="p-3">
          <h3 className={cn("font-pixel text-neon-cyan mb-2 flex items-center gap-1", sizes.title)}><Newspaper className="w-3 h-3" /> TRENDING</h3>
          <div className="min-h-[45px]">
             <span className={cn("font-body font-medium", catInfo.color, sizes.title)}>{catInfo.label}</span>
             <p className={cn("font-body text-foreground leading-tight mt-1", sizes.body)}>{news?.title}</p>
          </div>
          <div className="h-1 bg-muted mt-3 relative overflow-hidden">
            <div className="h-full bg-neon-cyan transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="bg-card border border-border rounded p-3 space-y-4">
        <div>
          <h3 className={cn("font-pixel text-neon-cyan mb-2", sizes.title)}>TOP USUARIOS</h3>
          <div className="space-y-1.5">
            {topUsers.map((u, i) => (
              <div key={i} className={cn("flex items-center gap-2", sizes.body)}>
                <span className="text-muted-foreground w-3 text-right">{i+1}</span>
                <span className="truncate flex-1" style={u.color_name ? getNameStyle(u.color_name) : {}}>{badges[i] || "🎯"} {u.display_name}</span>
                <span className="text-neon-green font-bold">{u.total_score}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <h3 className={cn("font-pixel text-neon-yellow mb-2", sizes.title)}>TOP PREMIUM</h3>
          <div className="space-y-1.5">
            {premiumUsers.map((pu, i) => (
              <div key={i} className={cn("flex items-center gap-2", sizes.body)}>
                <span className="text-neon-yellow">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                <span className="truncate flex-1" style={pu.color_name ? getNameStyle(pu.color_name) : {}}>{pu.display_name}</span>
                <span className={cn("font-pixel text-neon-yellow text-[8px]")} style={pu.color_role ? getRoleStyle(pu.color_role) : {}}>{pu.membership_tier.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* REPRODUCTOR Y FOOTER */}
      <div className="mt-6 pt-4 border-t border-border space-y-4">
        <ChillMusicPlayer />
        <Footer />
      </div>
    </aside>
  );
}