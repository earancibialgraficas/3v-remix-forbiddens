import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function NavigationButtons() {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  if (isHome) return null;

  return (
    <div className="fixed top-3 right-3 z-[800] flex items-center gap-1 rounded-full border border-border bg-card/90 p-1.5 shadow-2xl backdrop-blur-md">
      <button onClick={() => navigate(-1)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Atrás">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button onClick={() => navigate(1)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Adelante">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
