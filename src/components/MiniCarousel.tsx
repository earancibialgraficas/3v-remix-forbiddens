import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryRoute } from "@/lib/categoryRoutes";

// 🔥 Definimos la duración exacta de la diapositiva (5 segundos)
const SLIDE_DURATION = 5000;

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
  // 🔥 Nuevo estado para rastrear el progreso (0 a 100)
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchPopular = async () => {
      const { data } = await supabase.from("posts")
        .select("id, title, content, category, upvotes")
        .order("upvotes", { ascending: false })
        .limit(3);
      
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

  // Temporizador principal para cambiar de diapositiva
  useEffect(() => {
    if (items.length === 0) return;
    const timer = setInterval(() => {
      setCurrent(p => (p + 1) % items.length);
      // Reiniciamos el progreso visual al cambiar
      setProgress(0); 
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [items.length]);

  // 🔥 Temporizador de PRECISIÓN para la barra de progreso (idéntico al Home)
  useEffect(() => {
    if (items.length === 0) return;
    
    // Reiniciamos al inicio de cada diapositiva
    setProgress(0); 
    
    const step = 50; // Frecuencia de actualización en ms (rápido para suavidad)
    const inc = 100 / (SLIDE_DURATION / step); // Cuánto aumentar en cada paso
    
    const timer = setInterval(() => {
      setProgress(p => Math.min(p + inc, 100)); // Aumentamos sin pasar de 100
    }, step);
    
    return () => clearInterval(timer); // Limpieza crucial
  }, [current, items.length]); // Se ejecuta cada vez que cambia la diapositiva

  if (items.length === 0) return null;
  const item = items[current];

  return (
    // 🔥 Wrapper principal con flex flex-col para acomodar la barra abajo
    <div className="relative w-full rounded overflow-hidden border border-border group shadow-lg bg-card flex flex-col">
      {/* Contenedor de la imagen y texto (altura fija h-36) */}
      <Link to={getCategoryRoute(item.category || "general", item.id)} className="block w-full h-36 relative shrink-0">
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
      
      {/* 🔥 LA BARRA DE PROGRESO (Idéntica al HomeCarousel) */}
      {/* Contenedor de la barra (h-1 para que sea fina en el mini) */}
      <div className="h-1 bg-muted relative overflow-hidden shrink-0 mt-auto">
        {/* Barra de progreso dinámica con el gradiente neón */}
        <div 
          className="h-full bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green transition-all duration-100 ease-linear retro-progress"
          style={{ width: `${progress}%` }} // 🔥 Ancho dinámico basado en el estado
        />
      </div>

      {/* Botones de navegación (solo visibles en hover) */}
      <button onClick={() => setCurrent(p => (p - 1 + items.length) % items.length)} className="absolute left-1 top-1/2 -translate-y-1/2 p-0.5 bg-black/50 rounded text-white/70 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <ChevronLeft className="w-3 h-3" />
      </button>
      <button onClick={() => setCurrent(p => (p + 1) % items.length)} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 bg-black/50 rounded text-white/70 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}