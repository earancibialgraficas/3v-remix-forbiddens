import { Link } from "react-router-dom";
import logo from "@/assets/forbiddens_logo.svg";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 py-8 mt-8">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Forbiddens" className="w-6 h-6" />
            <span className="font-pixel text-[9px] text-neon-green text-glow-green">FORBIDDENS</span>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground font-body">
            <Link to="/ayuda" className="hover:text-foreground transition-colors">Ayuda</Link>
            <Link to="/reglas" className="hover:text-foreground transition-colors">Reglas</Link>
            <Link to="/contacto" className="hover:text-foreground transition-colors">Contacto</Link>
            <Link to="/privacidad" className="hover:text-foreground transition-colors">Privacidad</Link>
          </div>
          <p className="text-[10px] text-muted-foreground font-body">© 2026 Forbiddens. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
