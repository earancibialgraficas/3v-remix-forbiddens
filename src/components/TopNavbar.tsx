import { Link } from "react-router-dom";
import { PanelLeftClose, PanelLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/forbiddens_logo.svg";

interface TopNavbarProps {
  onMenuToggle?: () => void;
  sidebarCollapsed?: boolean;
}

export default function TopNavbar({ onMenuToggle, sidebarCollapsed }: TopNavbarProps) {
  return (
    <div className="fixed top-3 left-3 z-[60] flex items-center gap-2">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 md:hidden bg-card/90 backdrop-blur border border-border shadow-lg text-muted-foreground hover:text-foreground"
        onClick={onMenuToggle}
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Desktop sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 hidden md:flex bg-card/90 backdrop-blur border border-border shadow-lg text-muted-foreground hover:text-foreground transition-colors duration-200"
        onClick={onMenuToggle}
      >
        {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
      </Button>

      <Link to="/" className="flex items-center gap-2 bg-card/90 backdrop-blur border border-border rounded-md px-2.5 py-1.5 shadow-lg">
        <img src={logo} alt="Forbiddens" className="w-6 h-6" />
        <span className="font-pixel text-[10px] text-neon-green text-glow-green hidden sm:inline">
          FORBIDDENS
        </span>
      </Link>
    </div>
  );
}
