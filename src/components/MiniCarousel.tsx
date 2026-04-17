import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryRoute } from "@/lib/categoryRoutes";

// Mismos colores que tu carrusel original
const categoryColors: Record<string, string> = {
  "gaming-anime-foro": "text-neon-cyan",
  "gaming-anime-anime": "text-neon-cyan",
  "motociclismo-rutas": "text-neon-magenta",
  "mercado-gaming": "text-neon-yellow",
  "social-feed": "text-neon-orange",
  "trending": "text-destructive",
};

export default function MiniCarousel() {
  const [items, setItems] = useState<any[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetchPopular = async () => {
      const { data } = await supabase.from("posts")
        .select("id, title, content, category, upvotes")
        .order("upvotes", { ascending: false })
        .limit(3); // Solo 3 para máxima ligereza
      
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
    const timer = setInterval(() => setCurrent(p => (p + 1) % items.length), 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;
  const item = items[current];

  return (
    <div className="relative w-full h-36 rounded overflow-hidden border border-border group shadow-lg bg-card">
      <Link to={getCategoryRoute(item.category || "general", item.id)} className="block w-full h-full relative">
        <img src={item.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <span className={cn("font-pixel text-[7px] uppercase", categoryColors[item.category] || "text-foreground")}>
            {item.category?.replace(/-/g, ' ')}
          </span>
          <h3 className="font-pixel text-[9px] text-white leading-tight mt-0.5 line-clamp-2 uppercase tracking-tighter">
            {item.title}
          </h3>
        </div>
      </Link>
      
      <button onClick={() => setCurrent(p => (p - 1 + items.length) % items.length)} className="absolute left-1 top-1/2 -translate-y-1/2 p-0.5 bg-black/50 rounded text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronLeft className="w-3 h-3" />
      </button>
      <button onClick={() => setCurrent(p => (p + 1) % items.length)} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 bg-black/50 rounded text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}