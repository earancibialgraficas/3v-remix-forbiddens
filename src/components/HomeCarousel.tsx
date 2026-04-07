import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const carouselItems = [
  {
    title: "Torneo Retro: Super Mario Bros 3",
    description: "¡Inscripciones abiertas para el torneo mensual! Premios exclusivos para los top 3.",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=400&fit=crop",
    link: "/eventos",
    color: "text-neon-green",
    category: "EVENTO",
  },
  {
    title: "Nuevo anime: Chainsaw Man Temporada 2",
    description: "La segunda temporada confirma fecha de estreno. ¡Discutamos las teorías!",
    image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&h=400&fit=crop",
    link: "/gaming-anime/anime",
    color: "text-neon-cyan",
    category: "ANIME",
  },
  {
    title: "Rodada Nocturna: Santiago Centro",
    description: "Este sábado a las 22:00. Punto de encuentro: Plaza Italia. ¡Todos invitados!",
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&h=400&fit=crop",
    link: "/motociclismo/rutas",
    color: "text-neon-magenta",
    category: "MOTOCICLISMO",
  },
  {
    title: "Ofertas del Mercado: Consolas Retro",
    description: "Nuevos listings: SNES con 5 juegos, Game Boy Color edición Pokémon y más.",
    image: "https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?w=800&h=400&fit=crop",
    link: "/mercado/gaming",
    color: "text-neon-yellow",
    category: "MERCADO",
  },
  {
    title: "Concurso de Cosplay del Mes",
    description: "Comparte tus mejores cosplays y gana premios. ¡Vota por tu favorito!",
    image: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=800&h=400&fit=crop",
    link: "/social/fotos",
    color: "text-neon-orange",
    category: "SOCIAL",
  },
];

const SLIDE_DURATION = 5000;

export default function HomeCarousel() {
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % carouselItems.length);
      setProgress(0);
    }, SLIDE_DURATION);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setProgress(0);
    const step = 50;
    const inc = 100 / (SLIDE_DURATION / step);
    const timer = setInterval(() => {
      setProgress((prev) => Math.min(prev + inc, 100));
    }, step);
    return () => clearInterval(timer);
  }, [current]);

  const item = carouselItems[current];

  return (
    <section className="relative w-full rounded overflow-hidden bg-card border border-border">
      <Link to={item.link} className="block relative h-48 sm:h-56 overflow-hidden group">
        <img
          src={item.image}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent z-10" />
        <div className="retro-scanlines absolute inset-0 z-10 pointer-events-none opacity-30" />
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <span className={cn("font-pixel text-[8px] mb-1 block", item.color)}>{item.category}</span>
          <h3 className="font-pixel text-xs text-foreground mb-1">{item.title}</h3>
          <p className="text-[11px] font-body text-muted-foreground line-clamp-2">{item.description}</p>
        </div>
      </Link>

      {/* Navigation */}
      <div className="absolute top-1/2 -translate-y-1/2 left-2 z-20">
        <button onClick={() => setCurrent((p) => (p - 1 + carouselItems.length) % carouselItems.length)} className="p-1 bg-card/80 rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 right-2 z-20">
        <button onClick={() => setCurrent((p) => (p + 1) % carouselItems.length)} className="p-1 bg-card/80 rounded-full text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Retro progress bar */}
      <div className="h-2 bg-muted relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-neon-green via-neon-cyan to-neon-green transition-all duration-100 ease-linear retro-progress"
          style={{ width: `${progress}%` }}
        />
        {/* Pixel dots overlay */}
        <div className="absolute inset-0 retro-scanlines opacity-40" />
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1 py-1.5 bg-card">
        {carouselItems.map((_, i) => (
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
