import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryRoute } from "@/lib/categoryRoutes";

const SLIDE_DURATION = 5000;

// 🔥 Mapeo para nombres "normales" y colores
const categoryInfo: Record<string, { label: string; color: string }> = {
  "general": { label: "General", color: "text-foreground" },
  "gaming-anime-foro": { label: "Foro General", color: "text-neon-cyan" },
  "gaming-anime-anime": { label: "Anime & Manga", color: "text-neon-cyan" },
  "gaming-anime-creador": { label: "Rincón del Creador", color: "text-neon-cyan" },
  "motociclismo-riders": { label: "Foro Riders", color: "text-neon-magenta" },
  "motociclismo-taller": { label: "Taller & Mecánica", color: "text-neon-magenta" },
  "motociclismo-rutas": { label: "Rutas & Quedadas", color: "text-neon-magenta" },
  "mercado-gaming": { label: "Mercado Gaming", color: "text-neon-yellow" },
  "mercado-motor": { label: "Mercado Bikers", color: "text-neon-yellow" },
  "social-feed": { label: "Social Hub", color: "text-neon-orange" },
  "trending": { label: "Trending", color: "text-destructive" },
};

export default function MiniCarousel() {
  const [items, setItems] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchPopular = async () => {
      // 🔥 Aumentamos el límite a 5 para que no falten posts
      const { data } = await supabase.from("posts")
        .select("id, title, content, category, upvotes")
        .order("upvotes", { ascending: false })
        .limit(5); 
      
      if (data) {
        setItems(data.map(p => {
          const imgMatch = p.content?.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
          return {
            id: p.id,
            title: p.title,
            image: imgMatch ? imgMatch[1] : "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&fit=crop",
            category: p.category
          };
        }));
      }
    };
    fetchPopular();
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const timer = setInterval(() => {
      setCurrent(p => (p + 1) % items.length);
      setProgress(0); 
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [items.length]);

  useEffect(() => {
    if (items.length === 0) return;
    setProgress(0); 
    const step = 50;
    const inc = 100 / (SLIDE_DURATION / step);
    const timer = setInterval(() => {
      setProgress(p => Math.min(p + inc, 100));
    }, step);
    return () => clearInterval(timer);
  }, [current, items.length]);

  if (items.length === 0) return null;
  const item = items[current];
  const info = categoryInfo[item.category] || { label: "General", color: "text-foreground" };

  return (
    <div className="relative w-full rounded overflow-hidden border border-border group shadow-lg bg-card flex flex-col">
      {/* Todo el contenedor es linkeable al post */}
      <Link to={getCategoryRoute(item.category || "general", item.id)} className="block w-full h-36 relative shrink-0">
        <img src={item.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-3">
          {/* Categoría con nombre "normal" */}
          <span className={cn("font-pixel text-[7px] uppercase tracking-wider", info.color)}>
            {info.label}
          </span>
          
          {/* Título del post seguido del nombre de la página */}
          <h3 className="font-pixel text-[9px] text-white leading-tight mt-1 line-clamp-2 uppercase tracking-tighter group-hover:text-primary transition-colors">
            {item.title}
          </h3>
        </div>
      </Link>
      
      {/* Barra de progreso tipo carga de videojuego */}
      <div className="h-1 bg-muted relative overflow-hidden shrink-0 mt-auto">
        <div 
          className="h-full bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green transition-all duration-100 ease-linear retro-progress"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controles de navegación */}
      <button onClick={() => setCurrent(p => (p - 1 + items.length) % items.length)} className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/60 rounded-full text-white/70 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:text-white">
        <ChevronLeft className="w-3 h-3" />
      </button>
      <button onClick={() => setCurrent(p => (p + 1) % items.length)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/60 rounded-full text-white/70 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:text-white">
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}