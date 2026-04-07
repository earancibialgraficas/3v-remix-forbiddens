import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function NavigationButtons() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" title="Atrás">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button onClick={() => navigate(1)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" title="Adelante">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
