import { useLocation } from "react-router-dom";
import { Flame, MessageSquare, ArrowUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, { title: string; description: string; color: string }> = {
  "/arcade": { title: "ZONA ARCADE", description: "Emuladores retro, salas de juego y leaderboards", color: "text-neon-green" },
  "/arcade/salas": { title: "SALAS DE JUEGO", description: "Juega NES, SNES y GBA directamente en tu navegador", color: "text-neon-green" },
  "/arcade/biblioteca": { title: "BIBLIOTECA", description: "Catálogo navegable de juegos retro", color: "text-neon-green" },
  "/arcade/leaderboards": { title: "LEADERBOARDS", description: "Tablas de clasificación y récords", color: "text-neon-green" },
  "/gaming-anime": { title: "GAMING & ANIME", description: "Comunidad de gaming, anime y manga", color: "text-neon-cyan" },
  "/gaming-anime/foro": { title: "FORO GENERAL", description: "Espacio para hablar de todo un poco", color: "text-neon-cyan" },
  "/gaming-anime/anime": { title: "ANIME & MANGA", description: "Debates, recomendaciones y reseñas", color: "text-neon-cyan" },
  "/gaming-anime/creador": { title: "RINCÓN DEL CREADOR", description: "Comparte tu Fanart, Cosplays y proyectos creativos", color: "text-neon-cyan" },
  "/motociclismo": { title: "MOTOCICLISMO", description: "Riders, mecánica, rutas y quedadas", color: "text-neon-magenta" },
  "/motociclismo/riders": { title: "FORO DE RIDERS", description: "Discusiones sobre marcas, estilos y noticias motor", color: "text-neon-magenta" },
  "/motociclismo/taller": { title: "TALLER & MECÁNICA", description: "Tutoriales, manuales y consejos", color: "text-neon-magenta" },
  "/motociclismo/rutas": { title: "RUTAS & QUEDADAS", description: "Organiza viajes grupales y comparte rutas", color: "text-neon-magenta" },
  "/mercado": { title: "MERCADO & TRUEQUE", description: "Compra, vende e intercambia", color: "text-neon-yellow" },
  "/mercado/gaming": { title: "MERCADO GAMING", description: "Consolas retro, cartuchos y accesorios", color: "text-neon-yellow" },
  "/mercado/motor": { title: "MERCADO MOTOR", description: "Repuestos, cascos, chaquetas y motos", color: "text-neon-yellow" },
  "/social": { title: "SOCIAL HUB", description: "Feed, reels, galería y contenido social", color: "text-neon-orange" },
  "/social/feed": { title: "FEED PRINCIPAL", description: "Muro al estilo red social", color: "text-neon-orange" },
  "/social/reels": { title: "REELS & VIDEOS", description: "Videos cortos de la comunidad", color: "text-neon-orange" },
  "/social/fotos": { title: "MURO FOTOGRÁFICO", description: "Galería de imágenes de la comunidad", color: "text-neon-orange" },
  "/trending": { title: "TRENDING", description: "Lo más popular del momento", color: "text-destructive" },
  "/eventos": { title: "EVENTOS", description: "Torneos, estrenos y rodadas", color: "text-neon-cyan" },
  "/membresias": { title: "MEMBRESÍAS", description: "Planes y beneficios exclusivos", color: "text-neon-yellow" },
  "/ayuda": { title: "AYUDA", description: "Centro de ayuda y preguntas frecuentes", color: "text-muted-foreground" },
  "/reglas": { title: "REGLAS", description: "Normas de convivencia del foro", color: "text-muted-foreground" },
  "/contacto": { title: "CONTACTO", description: "Reporta bugs o comportamiento inapropiado", color: "text-muted-foreground" },
  "/privacidad": { title: "PRIVACIDAD", description: "Política de privacidad", color: "text-muted-foreground" },
  "/faq": { title: "FAQ", description: "Preguntas frecuentes", color: "text-muted-foreground" },
  "/perfil": { title: "MI PERFIL", description: "Tu tarjeta de presentación", color: "text-neon-cyan" },
  "/configuracion": { title: "CONFIGURACIÓN", description: "Gestión de tu cuenta", color: "text-muted-foreground" },
  "/mensajes": { title: "MENSAJES", description: "Bandeja de mensajes privados", color: "text-neon-cyan" },
};

const mockThreads = [
  { id: 1, title: "¿Cuál es tu juego retro favorito de todos los tiempos?", author: "RetroKing_99", replies: 47, upvotes: 182, time: "hace 2h" },
  { id: 2, title: "Guía completa para principiantes - Lee esto primero", author: "Staff", replies: 12, upvotes: 340, time: "Fijado", pinned: true },
  { id: 3, title: "Comparto mi colección de cartuchos SNES", author: "VintageGamer", replies: 23, upvotes: 95, time: "hace 4h" },
  { id: 4, title: "Debate: ¿Mejor consola portátil retro?", author: "OtakuSamurai", replies: 56, upvotes: 128, time: "hace 6h" },
  { id: 5, title: "Nuevo miembro aquí, ¡saludos desde México!", author: "NuevoRider", replies: 8, upvotes: 42, time: "hace 8h" },
];

export default function ForumPage() {
  const location = useLocation();
  const page = pageTitles[location.pathname] || { title: "PÁGINA", description: "Sección del foro", color: "text-foreground" };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-border rounded p-4">
        <h1 className={cn("font-pixel text-sm mb-1", page.color)}>{page.title}</h1>
        <p className="text-xs text-muted-foreground font-body">{page.description}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs font-body h-7 text-neon-green">
            <Flame className="w-3 h-3 mr-1" /> Populares
          </Button>
          <Button variant="ghost" size="sm" className="text-xs font-body h-7 text-muted-foreground">
            Nuevos
          </Button>
        </div>
        <Button size="sm" className="h-7 text-xs font-body bg-primary text-primary-foreground">
          <Plus className="w-3 h-3 mr-1" /> Nuevo Post
        </Button>
      </div>

      <div className="space-y-2">
        {mockThreads.map((post) => (
          <div
            key={post.id}
            className={cn(
              "bg-card border rounded p-3 hover:bg-muted/30 transition-all duration-200 cursor-pointer group",
              post.pinned ? "border-neon-green/30" : "border-border"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-0.5 text-muted-foreground shrink-0">
                <ArrowUp className="w-4 h-4 hover:text-primary cursor-pointer transition-colors" />
                <span className="text-xs font-body font-semibold">{post.upvotes}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-body text-foreground group-hover:text-primary transition-colors leading-snug">
                  {post.pinned && <span className="text-neon-green text-[10px] mr-1">📌</span>}
                  {post.title}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-body">
                  <span>por {post.author}</span>
                  <span>•</span>
                  <span>{post.time}</span>
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
    </div>
  );
}
