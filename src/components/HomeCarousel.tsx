import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryRoute } from "@/lib/categoryRoutes";

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

const fallbackItems = [
  {
    id: "1", title: "Torneo Retro: Super Mario Bros 3",
    content: "¡Inscripciones abiertas para el torneo mensual! Premios exclusivos para los top 3.",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=400&fit=crop",
    category: "general", upvotes: 50,
  },
  {
    id: "2", title: "Nuevo anime: Chainsaw Man Temporada 2",
    content: "La segunda temporada confirma fecha de estreno. ¡Discutamos las teorías!",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=400&fit=crop",
    category: "gaming-anime-anime", upvotes: 40,
  },
  {
    id: "3", title: "Rodada Nocturna: Santiago Centro",
    content: "Este sábado a las 22:00. Punto de encuentro: Plaza Italia. ¡Todos invitados!",
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&h=400&fit=crop",
    category: "motociclismo-rutas", upvotes: 30,
  },
];

const SLIDE_DURATION = 5000;

export default function HomeCarousel() {
  const [items, setItems] = useState(fallbackItems);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  // Fetch popular posts in real-time
  useEffect(() => {
    const fetchPopular = async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, content, category, upvotes")
        .order("upvotes", { ascending: false })
        .limit(5);
      if (data && data.length > 0) {
        setItems(data.map((p, i) => ({
          id: p.id,
          title: p.title,
          content: p.content || "",
          image: fallbackItems[i % fallbackItems.length]?.image || fallbackItems[0].image,
          category: p.category,
          upvotes: p.upvotes,
        })));
      }
    };
    fetchPopular();
    const channel = supabase.channel("carousel-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => fetchPopular())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
      setProgress(0);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [items.length]);

  useEffect(() => {
    setProgress(0);
    const step = 50;
    const inc = 100 / (SLIDE_DURATION / step);
    const timer = setInterval(() => {
      setProgress((prev) => Math.min(prev + inc, 100));
    }, step);
    return () => clearInterval(timer);
  }, [current]);

  const item = items[current];
  const cat = categoryColors[item?.category] || { color: "text-foreground", label: item?.category || "General" };

  return (
    <section className="relative w-full rounded overflow-hidden bg-card border border-border">
      <Link to={getCategoryRoute(item?.category || "general", item?.id)} className="block relative h-48 sm:h-56 overflow-hidden group">
        <img
          src={item?.image}
          alt={item?.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent z-10" />
        <div className="retro-scanlines absolute inset-0 z-10 pointer-events-none opacity-30" />
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <span className={cn("font-pixel text-[8px] mb-1 block", cat.color)}>{cat.label}</span>
          <h3 className="font-pixel text-xs text-foreground mb-1">{item?.title}</h3>
          <p className="text-[11px] font-body text-muted-foreground line-clamp-2">{item?.content?.replace(/!\[.*?\]\(.*?\)/g, "[imagen]")}</p>
          {item?.upvotes > 0 && <span className="text-[10px] text-neon-green font-body mt-1">▲ {item.upvotes}</span>}
        </div>
      </Link>

      {/* Navigation */}
      <div className="absolute top-1/2 -translate-y-1/2 left-2 z-20">
        <button onClick={() => setCurrent((p) => (p - 1 + items.length) % items.length)} className="p-1 bg-card/80 rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20">
        <button onClick={() => setCurrent((p) => (p + 1) % items.length)} className="p-1 bg-card/80 rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Retro progress bar */}
      <div className="h-2 bg-muted relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green transition-all duration-100 ease-linear retro-progress"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 retro-scanlines opacity-40" />
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1 py-1.5 bg-card">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); setProgress(0); }}
            className={cn(
              "w-1.5 h-1.5 rounded-sm transition-all duration-300",
              i === current ? "bg-neon-green w-4" : "bg-muted-foreground/40"
            )}
          />
        ))}
      </div>
    </section>
  );
}
