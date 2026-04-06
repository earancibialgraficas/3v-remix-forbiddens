import { Flame, MessageSquare, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

const mockPosts = [
  {
    id: 1,
    title: "Top 10 juegos de NES que debes completar",
    category: "Zona Arcade",
    author: "RetroKing_99",
    replies: 47,
    upvotes: 182,
    color: "text-neon-green",
  },
  {
    id: 2,
    title: "¿Mejor anime de la temporada Spring 2026?",
    category: "Anime & Manga",
    author: "OtakuSamurai",
    replies: 93,
    upvotes: 256,
    color: "text-neon-cyan",
  },
  {
    id: 3,
    title: "Ruta Madrid-Sierra de Guadarrama en Yamaha MT-07",
    category: "Motociclismo",
    author: "RiderNocturno",
    replies: 28,
    upvotes: 89,
    color: "text-neon-magenta",
  },
  {
    id: 4,
    title: "Vendo Game Boy Advance SP con 12 juegos",
    category: "Mercado",
    author: "VintageGamer",
    replies: 15,
    upvotes: 34,
    color: "text-neon-yellow",
  },
  {
    id: 5,
    title: "Mi cosplay de Tifa Lockhart - fotos del evento",
    category: "Rincón del Creador",
    author: "CosplayQueen",
    replies: 61,
    upvotes: 340,
    color: "text-neon-orange",
  },
];

export default function TrendingPosts() {
  return (
    <section>
      <h2 className="text-sm text-neon-green text-glow-green mb-4 flex items-center gap-2">
        <Flame className="w-4 h-4" /> // TRENDING
      </h2>
      <div className="space-y-2">
        {mockPosts.map((post) => (
          <div
            key={post.id}
            className="bg-card border border-border rounded p-3 hover:bg-muted/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-0.5 text-muted-foreground shrink-0">
                <ArrowUp className="w-4 h-4 hover:text-primary cursor-pointer" />
                <span className="text-xs font-body font-semibold">{post.upvotes}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-body text-foreground group-hover:text-primary transition-colors leading-snug">
                  {post.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-body">
                  <span className={cn("font-medium", post.color)}>{post.category}</span>
                  <span>•</span>
                  <span>por {post.author}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> {post.replies}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
