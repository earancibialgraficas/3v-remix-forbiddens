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
    <aside className="w-72 shrink-0 space-y-4 sticky top-16 h-fit">
      {/* Community Card */}
      <div className="bg-card border border-border rounded p-4 transition-all duration-300">
        <div className="flex items-center gap-2 mb-3">
          <img src={logo} alt="Forbiddens" className="w-8 h-8" />
          <div>
            <h3 className="font-pixel text-[10px] text-neon-green text-glow-green">FORBIDDENS</h3>
            <p className="text-[10px] text-muted-foreground font-body">El foro underground</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-sm font-bold text-foreground font-body">12.4k</p>
            <p className="text-[10px] text-muted-foreground">Miembros</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-neon-green font-body">847</p>
            <p className="text-[10px] text-muted-foreground">Online</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground font-body">3.2k</p>
            <p className="text-[10px] text-muted-foreground">Posts hoy</p>
          </div>
        </div>
        <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-body text-xs h-8 transition-all duration-200">
          <Link to="/registro">Unirse a la comunidad</Link>
        </Button>
      </div>

      {/* News Carousel */}
      <div className="bg-card border border-neon-cyan/30 rounded p-4 transition-all duration-300">
        <h3 className="font-pixel text-[10px] text-neon-cyan text-glow-cyan mb-3 flex items-center gap-1.5">
          <Newspaper className="w-3.5 h-3.5" /> NOTICIAS DESTACADAS
        </h3>
        <div className="relative min-h-[80px]">
          <div key={news.id} className="animate-fade-in">
            <span className={`text-[10px] font-body font-medium ${news.color}`}>{news.category}</span>
            <p className="text-xs font-body text-foreground mt-1 leading-relaxed">{news.title}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1">
            {featuredNews.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentNews(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === currentNews ? "bg-neon-cyan w-4" : "bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <button onClick={() => setCurrentNews((p) => (p - 1 + featuredNews.length) % featuredNews.length)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setCurrentNews((p) => (p + 1) % featuredNews.length)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Top Usuarios */}
      <div className="bg-card border border-border rounded p-4 transition-all duration-300">
        <h3 className="font-pixel text-[10px] text-neon-cyan text-glow-cyan mb-3 flex items-center gap-1.5">
          <Trophy className="w-3.5 h-3.5" /> TOP USUARIOS
        </h3>
        <div className="space-y-2 font-body">
          {[
            { name: "RetroKing_99", points: "14,230", badge: "🏆" },
            { name: "OtakuSamurai", points: "11,890", badge: "⚔️" },
            { name: "RiderNocturno", points: "9,450", badge: "🏍️" },
            { name: "CosplayQueen", points: "8,720", badge: "👑" },
            { name: "VintageGamer", points: "7,100", badge: "🎮" },
          ].map((user, i) => (
            <div key={user.name} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-4 text-right">{i + 1}</span>
              <span className="text-foreground flex-1">{user.badge} {user.name}</span>
              <span className="text-neon-green">{user.points}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reglas */}
      <div className="bg-card border border-border rounded p-4 transition-all duration-300">
        <h3 className="font-pixel text-[10px] text-muted-foreground mb-2">REGLAS</h3>
        <ol className="space-y-1.5 text-[11px] text-muted-foreground font-body list-decimal list-inside">
          <li>Respeta a todos los miembros</li>
          <li>No spam ni autopromoción excesiva</li>
          <li>Contenido apropiado solamente</li>
          <li>No compartir ROMs con copyright</li>
          <li>Usa las categorías correctas</li>
        </ol>
      </div>
    </aside>
  );
}
