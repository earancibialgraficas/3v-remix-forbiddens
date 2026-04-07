import { useState, useEffect } from "react";
import { Users, Trophy, Newspaper, ChevronLeft, ChevronRight, Type, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/forbiddens_logo.svg";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";
import { getCategoryRoute } from "@/lib/categoryRoutes";

interface TopUser {
  display_name: string;
  total_score: number;
}

interface PremiumUser {
  display_name: string;
  membership_tier: string;
  created_at: string;
}

interface PopularPost {
  id: string;
  title: string;
  category: string;
  upvotes: number;
}

const categoryColors: Record<string, { color: string; label: string }> = {
  "general": { color: "text-foreground", label: "General" },
  "gaming-anime-foro": { color: "text-neon-cyan", label: "Gaming & Anime" },
  "gaming-anime-anime": { color: "text-neon-cyan", label: "Anime & Manga" },
  "gaming-anime-creador": { color: "text-neon-cyan", label: "Creador" },
  "motociclismo-riders": { color: "text-neon-magenta", label: "Riders" },
  "motociclismo-taller": { color: "text-neon-magenta", label: "Taller" },
  "motociclismo-rutas": { color: "text-neon-magenta", label: "Rutas" },
  "mercado-gaming": { color: "text-neon-yellow", label: "Mercado Gaming" },
  "mercado-motor": { color: "text-neon-yellow", label: "Mercado Motor" },
  "social-feed": { color: "text-neon-orange", label: "Social" },
  "trending": { color: "text-destructive", label: "Trending" },
};

const fallbackNews = [
  { id: "1", title: "Torneo Retro de Super Mario Bros 3 — ¡Inscripciones abiertas!", category: "eventos", upvotes: 50 },
  { id: "2", title: "One Piece capítulo 1150: Discusión semanal", category: "gaming-anime-anime", upvotes: 40 },
  { id: "3", title: "Rodada nocturna CDMX — Sábado 12 de Abril", category: "motociclismo-rutas", upvotes: 30 },
  { id: "4", title: "Nuevo emulador disponible en la Zona Arcade", category: "general", upvotes: 25 },
  { id: "5", title: "Concurso de Fanart: Mejor personaje retro del mes", category: "gaming-anime-creador", upvotes: 20 },
];

const SLIDE_DURATION = 4000;

type TextSize = "sm" | "md" | "lg";
const textSizeMap: Record<TextSize, { body: string; title: string; stat: string }> = {
  sm: { body: "text-[9px]", title: "text-[8px]", stat: "text-[10px]" },
  md: { body: "text-[11px]", title: "text-[10px]", stat: "text-xs" },
  lg: { body: "text-[13px]", title: "text-xs", stat: "text-sm" },
};

export default function RightPanel() {
  const [currentNews, setCurrentNews] = useState(0);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [popularPosts, setPopularPosts] = useState<PopularPost[]>([]);
  const [textSize, setTextSize] = useState<TextSize>("md");
  const [progress, setProgress] = useState(0);

  const sizes = textSizeMap[textSize];
  const cycleSize = () => setTextSize((p) => p === "sm" ? "md" : p === "md" ? "lg" : "sm");

  const newsItems = popularPosts.length > 0 ? popularPosts : fallbackNews;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentNews((p) => (p + 1) % newsItems.length);
      setProgress(0);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [newsItems.length]);

  useEffect(() => {
    setProgress(0);
    const step = 50;
    const inc = 100 / (SLIDE_DURATION / step);
    const timer = setInterval(() => setProgress((p) => Math.min(p + inc, 100)), step);
    return () => clearInterval(timer);
  }, [currentNews]);

  useEffect(() => {
    const fetchTop = async () => {
      const { data } = await supabase.from("profiles").select("display_name, total_score").order("total_score", { ascending: false }).limit(5);
      if (data && data.length > 0) setTopUsers(data as unknown as TopUser[]);
    };
    fetchTop();
    const channel = supabase.channel("top-users").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchTop()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const fetchPremium = async () => {
      const { data } = await supabase.from("profiles")
        .select("display_name, membership_tier, created_at")
        .neq("membership_tier", "novato")
        .order("created_at", { ascending: true })
        .limit(3);
      if (data && data.length > 0) setPremiumUsers(data as unknown as PremiumUser[]);
    };
    fetchPremium();
  }, []);

  useEffect(() => {
    const fetchPopular = async () => {
      const { data } = await supabase.from("posts").select("id, title, category, upvotes").order("upvotes", { ascending: false }).limit(5);
      if (data && data.length > 0) setPopularPosts(data);
    };
    fetchPopular();
    const channel = supabase.channel("popular-posts").on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchPopular()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const news = newsItems[currentNews % newsItems.length];
  const catInfo = categoryColors[news?.category] || { color: "text-foreground", label: news?.category || "General" };
  const badges = ["🏆", "⚔️", "🏍️", "👑", "🎮"];

  const displayUsers = topUsers.length > 0 ? topUsers : [
    { display_name: "RetroKing_99", total_score: 14230 },
    { display_name: "OtakuSamurai", total_score: 11890 },
    { display_name: "RiderNocturno", total_score: 9450 },
    { display_name: "CosplayQueen", total_score: 8720 },
    { display_name: "VintageGamer", total_score: 7100 },
  ];

  const getLink = (cat: string, postId?: string) => getCategoryRoute(cat, postId);

  return (
    <aside className="w-full shrink-0 space-y-3 sticky top-3 h-fit">
      <div className="flex justify-end">
        <button onClick={cycleSize} className="flex items-center gap-1 px-2 py-1 rounded bg-card border border-border text-muted-foreground hover:text-foreground transition-colors" title="Cambiar tamaño del texto">
          <Type className="w-3 h-3" />
          <span className={cn("font-body", sizes.body)}>{textSize === "sm" ? "Pequeño" : textSize === "md" ? "Mediano" : "Grande"}</span>
        </button>
      </div>

      {/* Community Card */}
      <div className="bg-card border border-border rounded p-2.5">
        <div className="flex items-center gap-2 mb-2">
          <img src={logo} alt="Forbiddens" className="w-5 h-5" />
          <div>
            <h3 className={cn("font-pixel text-neon-green text-glow-green", sizes.title)}>FORBIDDENS</h3>
            <p className={cn("text-muted-foreground font-body", sizes.title)}>El foro underground</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div className="text-center">
            <p className={cn("font-bold text-foreground font-body", sizes.stat)}>12.4k</p>
            <p className={cn("text-muted-foreground", sizes.title)}>Miembros</p>
          </div>
          <div className="text-center">
            <p className={cn("font-bold text-neon-green font-body", sizes.stat)}>847</p>
            <p className={cn("text-muted-foreground", sizes.title)}>Online</p>
          </div>
          <div className="text-center">
            <p className={cn("font-bold text-foreground font-body", sizes.stat)}>3.2k</p>
            <p className={cn("text-muted-foreground", sizes.title)}>Posts</p>
          </div>
        </div>
        <Button asChild className={cn("w-full bg-primary text-primary-foreground hover:bg-primary/80 font-body h-6", sizes.body)}>
          <Link to="/registro">Unirse</Link>
        </Button>
      </div>

      {/* News Carousel with retro progress bar */}
      <div className="bg-card border border-neon-cyan/30 rounded overflow-hidden">
        <div className="p-2.5">
          <h3 className={cn("font-pixel text-neon-cyan text-glow-cyan mb-2 flex items-center gap-1", sizes.title)}>
            <Newspaper className="w-3 h-3" /> TRENDING
          </h3>
          <Link to={getLink(news?.category || "trending", news?.id)} className="block relative min-h-[50px] group">
            <div key={news?.id} className="animate-fade-in">
              <span className={cn("font-body font-medium", catInfo.color, sizes.title)}>{catInfo.label}</span>
              <p className={cn("font-body text-foreground mt-0.5 leading-relaxed group-hover:text-primary transition-colors", sizes.body)}>{news?.title}</p>
              {news?.upvotes > 0 && <span className={cn("text-neon-green font-body", sizes.title)}>▲ {news.upvotes}</span>}
            </div>
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-0.5">
              {newsItems.map((_, i) => (
                <button key={i} onClick={() => setCurrentNews(i)} className={`w-1 h-1 rounded-full transition-all duration-300 ${i === currentNews % newsItems.length ? "bg-neon-cyan w-2.5" : "bg-muted-foreground/40"}`} />
              ))}
            </div>
            <div className="flex gap-0.5">
              <button onClick={() => setCurrentNews((p) => (p - 1 + newsItems.length) % newsItems.length)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="w-2.5 h-2.5" /></button>
              <button onClick={() => setCurrentNews((p) => (p + 1) % newsItems.length)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="w-2.5 h-2.5" /></button>
            </div>
          </div>
        </div>
        {/* Retro progress bar */}
        <div className="h-1.5 bg-muted relative overflow-hidden">
          <div className="h-full bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green transition-all duration-100 ease-linear retro-progress" style={{ width: `${progress}%` }} />
          <div className="absolute inset-0 retro-scanlines opacity-40" />
        </div>
      </div>

      {/* Top Usuarios */}
      <div className="bg-card border border-border rounded p-2.5">
        <h3 className={cn("font-pixel text-neon-cyan text-glow-cyan mb-2 flex items-center gap-1", sizes.title)}>
          <Trophy className="w-3 h-3" /> TOP USUARIOS
        </h3>
        <div className="space-y-1 font-body">
          {displayUsers.map((user, i) => (
            <div key={user.display_name} className={cn("flex items-center gap-1", sizes.body)}>
              <span className="text-muted-foreground w-3 text-right">{i + 1}</span>
              <span className="text-foreground flex-1 truncate">{badges[i] || "🎯"} {user.display_name}</span>
              <span className="text-neon-green">{user.total_score.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Usuarios Premium */}
      <div className="bg-card border border-neon-yellow/30 rounded p-2.5">
        <h3 className={cn("font-pixel text-neon-yellow mb-2 flex items-center gap-1", sizes.title)}>
          <Star className="w-3 h-3" /> TOP PREMIUM
        </h3>
        <div className="space-y-1.5 font-body">
          {premiumUsers.length > 0 ? premiumUsers.map((pu, i) => (
            <div key={pu.display_name} className={cn("flex items-center gap-1.5", sizes.body)}>
              <span className={cn("font-bold w-3 text-right", i === 0 ? "text-neon-yellow" : i === 1 ? "text-muted-foreground" : "text-neon-orange")}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </span>
              <span className="text-foreground flex-1 truncate font-medium">{pu.display_name}</span>
              <span className={cn("font-pixel", sizes.title, "text-neon-yellow")}>{pu.membership_tier.toUpperCase()}</span>
            </div>
          )) : (
            <p className={cn("text-muted-foreground italic", sizes.body)}>Aún no hay usuarios premium</p>
          )}
        </div>
      </div>

      {/* Footer inside right panel */}
      <Footer />
    </aside>
  );
}
