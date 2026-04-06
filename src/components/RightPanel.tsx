import { Users, Trophy, Star, Zap, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/forbiddens_logo.svg";

export default function RightPanel() {
  return (
    <aside className="w-72 shrink-0 space-y-4 sticky top-12 h-fit hidden lg:block">
      {/* Community Card */}
      <div className="bg-card border border-border rounded p-4">
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
        <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-body text-xs h-8">
          <Link to="/registro">Unirse a la comunidad</Link>
        </Button>
      </div>

      {/* Membresías Preview */}
      <div className="bg-card border border-neon-yellow/30 rounded p-4">
        <h3 className="font-pixel text-[10px] text-neon-yellow mb-3 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5" /> MEMBRESÍAS
        </h3>
        <div className="space-y-2 font-body">
          {[
            { name: "Novato", price: "Gratis", color: "text-muted-foreground" },
            { name: "Entusiasta", price: "$10/mes", color: "text-neon-orange" },
            { name: "Coleccionista", price: "$15/mes", color: "text-foreground" },
            { name: "Leyenda Arcade", price: "$25/mes", color: "text-neon-yellow" },
            { name: "Creador Verificado", price: "$20/mes", color: "text-neon-cyan" },
          ].map((tier) => (
            <div key={tier.name} className="flex items-center justify-between text-xs">
              <span className={tier.color}>{tier.name}</span>
              <span className="text-muted-foreground">{tier.price}</span>
            </div>
          ))}
        </div>
        <Link
          to="/membresias"
          className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 mt-3 font-body"
        >
          Ver todas <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      {/* Top Usuarios */}
      <div className="bg-card border border-border rounded p-4">
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
      <div className="bg-card border border-border rounded p-4">
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
