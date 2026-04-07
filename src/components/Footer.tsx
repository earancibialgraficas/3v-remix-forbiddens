import { Link } from "react-router-dom";
import logo from "@/assets/forbiddens_logo.svg";

export default function Footer() {
  return (
    <div className="border-t border-border bg-card/50 py-4 mt-4 rounded">
      <div className="px-3">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Forbiddens" className="w-5 h-5" />
            <span className="font-pixel text-[8px] text-neon-green text-glow-green">FORBIDDENS</span>
          </div>
          <div className="flex gap-4 text-[10px] text-muted-foreground font-body">
            <Link to="/ayuda" className="hover:text-foreground transition-colors">Ayuda</Link>
            <Link to="/reglas" className="hover:text-foreground transition-colors">Reglas</Link>
            <Link to="/contacto" className="hover:text-foreground transition-colors">Contacto</Link>
            <Link to="/privacidad" className="hover:text-foreground transition-colors">Privacidad</Link>
          </div>
          <p className="text-[9px] text-muted-foreground font-body">© 2026 Forbiddens. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
