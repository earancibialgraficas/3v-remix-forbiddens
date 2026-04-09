import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function NavigationButtons() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  if (isHome) return null;

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1 md:left-12 p-1">
      <button onClick={() => navigate(-1)} className="p-1.5 rounded-r-lg bg-card/90 border border-border border-l-0 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors backdrop-blur" title="Atrás">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button onClick={() => navigate(1)} className="p-1.5 rounded-r-lg bg-card/90 border border-border border-l-0 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors backdrop-blur" title="Adelante">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
