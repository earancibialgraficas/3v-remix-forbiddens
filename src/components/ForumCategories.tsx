import { Gamepad2, Tv, Bike, ShoppingBag, Users, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const categories = [
  {
    title: "Zona Arcade",
    description: "Emuladores retro, salas de juego y leaderboards",
    icon: Gamepad2,
    color: "text-neon-green",
    borderClass: "border-neon-green/30 hover:border-neon-green/60",
    glowClass: "text-glow-green",
    link: "/arcade/salas",
    subs: ["NES / SNES / GBA", "Biblioteca de Juegos", "Clasificaciones"],
  },
  {
    title: "Gaming & Anime",
    description: "Foros de discusión, reseñas y comunidad creativa",
    icon: Tv,
    color: "text-neon-cyan",
    borderClass: "border-neon-cyan/30 hover:border-neon-cyan/60",
    glowClass: "text-glow-cyan",
    link: "/gaming-anime/foro",
    subs: ["Off-Topic", "Anime & Manga", "Rincón del Creador"],
  },
  {
    title: "Motociclismo",
    description: "Riders, tutoriales, manuales y consejos que ofrezcan",
    icon: Bike,
    color: "text-neon-magenta",
    borderClass: "border-neon-magenta/30 hover:border-neon-magenta/60",
    glowClass: "text-glow-magenta",
    link: "/motociclismo/riders",
    subs: ["Foro de Riders", "Taller & Mecánica", "Rutas & Quedadas"],
  },
  {
    title: "Mercado & Trueque",
    description: "Compra, vende e intercambia con la comunidad",
    icon: ShoppingBag,
    color: "text-neon-yellow",
    borderClass: "border-neon-yellow/30 hover:border-neon-yellow/60",
    glowClass: "",
    link: "/mercado/gaming",
    subs: ["Gaming", "Motor"],
  },
  {
    title: "Social Hub",
    description: "Feed, reels, galería y contenido social",
    icon: Users,
    color: "text-neon-orange",
    borderClass: "border-neon-orange/30 hover:border-neon-orange/60",
    glowClass: "",
    link: "/social/feed",
    subs: ["Feed Principal", "Reels & Videos", "Muro Fotográfico"],
  },
  {
    title: "Eventos",
    description: "Torneos retro, estrenos de anime y rodadas",
    icon: Calendar,
    color: "text-accent",
    borderClass: "border-accent/30 hover:border-accent/60",
    glowClass: "text-glow-cyan",
    link: "/eventos",
    subs: ["Torneos", "Estrenos", "Rodadas"],
  },
];

export default function ForumCategories() {
  return (
    <section>
      <h2 className="text-sm text-neon-green text-glow-green mb-4">// CATEGORÍAS</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.map((cat) => (
          <Link
            key={cat.title}
            to={cat.link}
            className={cn(
              "group bg-card border rounded p-4 transition-all duration-200 hover:bg-muted/30",
              cat.borderClass
            )}
          >
            <div className="flex items-start gap-3">
              <cat.icon className={cn("w-6 h-6 shrink-0 mt-0.5", cat.color, cat.glowClass)} />
              <div className="min-w-0">
                <h3 className={cn("font-pixel text-xs mb-1", cat.color)}>{cat.title}</h3>
                <p className="text-xs text-muted-foreground font-body mb-2">{cat.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.subs.map((sub) => (
                    <span
                      key={sub}
                      className="text-[10px] font-body px-2 py-0.5 rounded bg-muted text-muted-foreground"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
