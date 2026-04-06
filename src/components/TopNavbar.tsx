import { Link } from "react-router-dom";
import { Search, Bell, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/forbiddens_logo.svg";

export default function TopNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full h-12 bg-card/95 backdrop-blur border-b border-border flex items-center px-4 gap-3">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <img src={logo} alt="Forbiddens" className="w-7 h-7" />
        <span className="font-pixel text-[10px] text-neon-green text-glow-green hidden sm:inline">
          FORBIDDENS
        </span>
      </Link>

      <div className="flex-1 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en Forbiddens..."
            className="h-8 pl-8 bg-muted border-border text-sm font-body"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <User className="w-4 h-4" />
        </Button>
        <Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/80 font-body text-xs gap-1">
          <LogIn className="w-3.5 h-3.5" />
          Entrar
        </Button>
      </div>
    </header>
  );
}
