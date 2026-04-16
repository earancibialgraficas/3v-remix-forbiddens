import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Gamepad2, Tv, Bike, ShoppingBag, Users, Home,
  Flame, Calendar, Star, HelpCircle, ChevronDown, ChevronRight,
  Search, User, Settings, LogOut, PanelLeftClose, PanelLeft, Mail, AlertTriangle
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function ForumSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { label: "Inicio", icon: Home, to: "/", color: "text-foreground" },
    { label: "Salas de Juego", icon: Gamepad2, color: "text-neon-green" },
    { label: "Gaming & Anime", icon: Tv, color: "text-neon-cyan" },
    { label: "Motociclismo", icon: Bike, color: "text-neon-magenta" },
    { label: "Social Hub", icon: Users, color: "text-neon-orange" },
    { label: "Trending", icon: Flame, to: "/trending", color: "text-destructive" },
  ];

  return (
    <aside className={cn("bg-card border-r border-border flex flex-col h-full transition-all duration-300 relative z-50", collapsed ? "w-14" : "w-60")}>
      
      {/* LOGO */}
      <div className="flex flex-col items-center py-5 px-2 border-b border-border gap-3">
        <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground">
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        <Link to="/" className="font-pixel text-[10px] tracking-widest text-[#de1839]">
          {collapsed ? "F" : "FORBIDDENS"}
        </Link>
      </div>

      {/* BOTONES DE USUARIO (VERSIÓN DIRECTA) */}
      <div className={cn("flex flex-col border-b border-border bg-muted/5 p-2 gap-3", collapsed ? "items-center" : "px-3")}>
        <div className={cn("flex items-center w-full gap-1", collapsed && "flex-col gap-4")}>
          <NotificationBell />
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link to="/perfil"><User className="w-4 h-4" /></Link></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link to="/mensajes"><Mail className="w-4 h-4" /></Link></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link to="/configuracion"><Settings className="w-4 h-4" /></Link></Button>
        </div>
      </div>

      {/* NAVEGACIÓN SIMPLE */}
      <nav className="flex-1 overflow-y-auto p-1.5 space-y-1">
        {navItems.map((item) => (
          <Link 
            key={item.label} 
            to={item.to || "#"} 
            className={cn(
              "flex items-center gap-3 p-2 rounded transition-all", 
              location.pathname === item.to ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50",
              collapsed && "justify-center"
            )}
          >
            <item.icon className={cn("w-4 h-4", item.color)} />
            {!collapsed && <span className="text-xs">{item.label}</span>}
          </Link>
        ))}
        {user && !collapsed && (
          <button onClick={() => signOut()} className="flex items-center gap-3 p-2 w-full text-muted-foreground hover:text-destructive">
            <LogOut className="w-4 h-4" />
            <span className="text-xs">Cerrar Sesión</span>
          </button>
        )}
      </nav>
    </aside>
  );
}