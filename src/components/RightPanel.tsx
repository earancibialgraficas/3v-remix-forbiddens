import { useState, useEffect } from "react";
import { Users, Trophy, Newspaper, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/forbiddens_logo.svg";

const featuredNews = [
  { id: 1, title: "Torneo Retro de Super Mario Bros 3 — ¡Inscripciones abiertas!", category: "Zona Arcade", color: "text-neon-green" },
  { id: 2, title: "One Piece capítulo 1150: Discusión semanal", category: "Anime & Manga", color: "text-neon-cyan" },
  { id: 3, title: "Rodada nocturna CDMX — Sábado 12 de Abril", category: "Motociclismo", color: "text-neon-magenta" },
  { id: 4, title: "Nuevo emulador GBA disponible en la Zona Arcade", category: "Zona Arcade", color: "text-neon-green" },
  { id: 5, title: "Concurso de Fanart: Mejor personaje retro del mes", category: "Rincón del Creador", color: "text-neon-orange" },
];

export default function RightPanel() {
  const [currentNews, setCurrentNews] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentNews((prev) => (prev + 1) % featuredNews.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const news = featuredNews[currentNews];

  return (
    <aside className="w-56 shrink-0 space-y-3 sticky top-16 h-fit">
      {/* Community Card */}
      <div className="bg-card border border-border rounded p-3 transition-all duration-300">
        <div className="flex items-center gap-2 mb-2">
          <img src={logo} alt="Forbiddens" className="w-6 h-6" />
          <div>
            <h3 className="font-pixel text-[9px] text-neon-green text-glow-green">FORBIDDENS</h3>
            <p className="text-[9px] text-muted-foreground font-body">El foro underground</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 mb-2">
          <div className="text-center">
            <p className="text-xs font-bold text-foreground font-body">12.4k</p>
            <p className="text-[9px] text-muted-foreground">Miembros</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-neon-green font-body">847</p>
            <p className="text-[9px] text-muted-foreground">Online</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-bold text-foreground font-body">3.2k</p>
            <p className="text-[9px] text-muted-foreground">Posts</p>
          </div>
        </div>
        <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-body text-[10px] h-7 transition-all duration-200">
          <Link to="/registro">Unirse</Link>
        </Button>
      </div>

      {/* News Carousel */}
      <div className="bg-card border border-neon-cyan/30 rounded p-3 transition-all duration-300">
        <h3 className="font-pixel text-[9px] text-neon-cyan text-glow-cyan mb-2 flex items-center gap-1">
          <Newspaper className="w-3 h-3" /> NOTICIAS
        </h3>
        <div className="relative min-h-[60px]">
          <div key={news.id} className="animate-fade-in">
            <span className={`text-[9px] font-body font-medium ${news.color}`}>{news.category}</span>
            <p className="text-[10px] font-body text-foreground mt-0.5 leading-relaxed">{news.title}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            {featuredNews.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentNews(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentNews ? "bg-neon-cyan w-3" : "bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-0.5">
            <button onClick={() => setCurrentNews((p) => (p - 1 + featuredNews.length) % featuredNews.length)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button onClick={() => setCurrentNews((p) => (p + 1) % featuredNews.length)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Usuarios */}
      <div className="bg-card border border-border rounded p-3 transition-all duration-300">
        <h3 className="font-pixel text-[9px] text-neon-cyan text-glow-cyan mb-2 flex items-center gap-1">
          <Trophy className="w-3 h-3" /> TOP USUARIOS
        </h3>
        <div className="space-y-1.5 font-body">
          {[
            { name: "RetroKing_99", points: "14,230", badge: "🏆" },
            { name: "OtakuSamurai", points: "11,890", badge: "⚔️" },
            { name: "RiderNocturno", points: "9,450", badge: "🏍️" },
            { name: "CosplayQueen", points: "8,720", badge: "👑" },
            { name: "VintageGamer", points: "7,100", badge: "🎮" },
          ].map((user, i) => (
            <div key={user.name} className="flex items-center gap-1.5 text-[10px]">
              <span className="text-muted-foreground w-3 text-right">{i + 1}</span>
              <span className="text-foreground flex-1 truncate">{user.badge} {user.name}</span>
              <span className="text-neon-green">{user.points}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reglas */}
      <div className="bg-card border border-border rounded p-3 transition-all duration-300">
        <h3 className="font-pixel text-[9px] text-muted-foreground mb-1.5">REGLAS</h3>
        <ol className="space-y-1 text-[10px] text-muted-foreground font-body list-decimal list-inside">
          <li>Respeta a todos</li>
          <li>No spam</li>
          <li>Contenido apropiado</li>
          <li>No compartir ROMs ©</li>
          <li>Usa categorías correctas</li>
        </ol>
      </div>
    </aside>
  );
}
