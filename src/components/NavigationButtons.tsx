import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function NavigationButtons() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isHome = location.pathname === "/";

  // En escritorio no se muestran aquí. En la Home de móvil tampoco.
  if (isHome || !isMobile) return null;

  return (
    <div className="fixed top-2 left-12 z-[150] flex items-center gap-0.5 rounded-full border border-border bg-card/90 p-1 shadow-lg backdrop-blur-md">
      {/* Bajamos el z-index a 150 para que el Navbar (que está en 300) pase por encima */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" 
        title="Atrás"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <button 
        onClick={() => navigate(1)} 
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" 
        title="Adelante"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
