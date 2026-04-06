import { Link } from "react-router-dom";
import { Menu, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/forbiddens_logo.svg";

interface TopNavbarProps {
  onMenuToggle?: () => void;
  sidebarCollapsed?: boolean;
}

export default function TopNavbar({ onMenuToggle, sidebarCollapsed }: TopNavbarProps) {
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

      {/* Desktop sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hidden md:flex text-muted-foreground hover:text-foreground transition-colors duration-200"
        onClick={onMenuToggle}
      >
        {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </Button>

      <Link to="/" className="flex items-center gap-2 shrink-0">
        <img src={logo} alt="Forbiddens" className="w-7 h-7" />
        <span className="font-pixel text-[10px] text-neon-green text-glow-green hidden sm:inline">
          FORBIDDENS
        </span>
      </Link>

      <div className="flex-1" />
    </header>
  );
}
