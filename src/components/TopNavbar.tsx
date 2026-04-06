import { Link } from "react-router-dom";
import { Search, Bell, User, LogIn, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/forbiddens_logo.svg";

interface TopNavbarProps {
  onMenuToggle?: () => void;
}

export default function TopNavbar({ onMenuToggle }: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full h-12 bg-card/95 backdrop-blur border-b border-border flex items-center px-4 gap-3 transition-all duration-300">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:hidden text-muted-foreground hover:text-foreground"
        onClick={onMenuToggle}
      >
        <Menu className="w-4 h-4" />
      </Button>

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
            className="h-8 pl-8 bg-muted border-border text-sm font-body transition-colors duration-200 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors duration-200">
          <Bell className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors duration-200" asChild>
          <Link to="/perfil">
            <User className="w-4 h-4" />
          </Link>
        </Button>
        <Button size="sm" className="h-8 bg-primary text-primary-foreground hover:bg-primary/80 font-body text-xs gap-1 transition-all duration-200" asChild>
          <Link to="/login">
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Entrar</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
