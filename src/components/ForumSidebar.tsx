import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Gamepad2, Tv, Bike, ShoppingBag, Users, Home,
  Flame, Calendar, Star, HelpCircle, ChevronDown, ChevronRight,
  Search, User, LogIn, Settings, BookOpen, LogOut,
  PanelLeftClose, PanelLeft, X, AlertTriangle, Mail
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { getNameStyle } from "@/lib/profileAppearance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavItem {
  label: string;
  icon: React.ElementType;
  to?: string;
  color: string;
  children?: { label: string; to: string }[];
  isDropdownOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Inicio", icon: Home, to: "/", color: "text-foreground" },
  {
    label: "Salas de Juego", icon: Gamepad2, color: "text-neon-green", isDropdownOnly: true,
    children: [
      { label: "Emuladores", to: "/arcade/salas" },
      { label: "Biblioteca", to: "/arcade/biblioteca" },
      { label: "Leaderboards", to: "/arcade/leaderboards" },
    ],
  },
  { label: "Consejos Gaming", icon: BookOpen, to: "/arcade/consejos", color: "text-neon-green" },
  {
    label: "Gaming & Anime", icon: Tv, color: "text-neon-cyan", isDropdownOnly: true,
    children: [
      { label: "Foro General", to: "/gaming-anime/foro" },
      { label: "Anime & Manga", to: "/gaming-anime/anime" },
      { label: "Gaming", to: "/gaming-anime/gaming" },
      { label: "Rincón del Creador", to: "/gaming-anime/creador" },
    ],
  },
  {
    label: "Motociclismo", icon: Bike, color: "text-neon-magenta", isDropdownOnly: true,
    children: [
      { label: "Foro de Riders", to: "/motociclismo/riders" },
      { label: "Taller & Mecánica", to: "/motociclismo/taller" },
      { label: "Rutas & Quedadas", to: "/motociclismo/rutas" },
    ],
  },
  {
    label: "Mercado & Trueque", icon: ShoppingBag, color: "text-neon-yellow", isDropdownOnly: true,
    children: [
      { label: "Gaming", to: "/mercado/gaming" },
      { label: "Bikers", to: "/mercado/motor" },
    ],
  },
  {
    label: "Social Hub", icon: Users, color: "text-neon-orange", isDropdownOnly: true,
    children: [
      { label: "Feed", to: "/social/feed" },
      { label: "Reels & Videos", to: "/social/reels" },
      { label: "Muro Fotográfico", to: "/social/fotos" },
    ],
  },
  { label: "Trending", icon: Flame, to: "/trending", color: "text-destructive" },
  { label: "Eventos", icon: Calendar, to: "/eventos", color: "text-muted-foreground" },
  { label: "Membresías", icon: Star, to: "/membresias", color: "text-neon-yellow" },
  { label: "Reglas", icon: AlertTriangle, to: "/reglas", color: "text-neon-orange" },
  { label: "Ayuda", icon: HelpCircle, to: "/ayuda", color: "text-muted-foreground" },
  { label: "Discord", icon: Users, to: "https://discord.gg/ZHNRKVUfVF", color: "text-[#5865F2]" },
];

export default function ForumSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Salas de Juego"]);
  const { user, profile, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  };

  return (
    <TooltipProvider>
      {showLogoutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full text-center space-y-4">
            <h3 className="font-pixel text-xs text-foreground">¿CERRAR SESIÓN?</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLogoutModal(false)} className="flex-1 font-pixel text-[8px]">NO</Button>
              <Button variant="destructive" onClick={async () => { await signOut(); setShowLogoutModal(false); }} className="flex-1 font-pixel text-[8px]">SÍ</Button>
            </div>
          </div>
        </div>
      )}

      <aside className={cn("bg-card border-r border-border flex flex-col h-full transition-all duration-300", collapsed ? "w-16" : "w-64")}>
        {/* LOGO - UNIDO Y GRANDE */}
        <div className="p-6 border-b border-border flex flex-col items-center gap-4">
          <button onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors">
            {collapsed ? <PanelLeft className="w-8 h-8" /> : <PanelLeftClose className="w-8 h-8" />}
          </button>
          <Link to="/" className="font-pixel text-center" style={{ color: '#de1839', textShadow: '0 0 8px rgba(222, 24, 57, 0.6)' }}>
            {collapsed ? <span className="text-xl">F</span> : <span className="text-sm tracking-widest">FORBIDDENS</span>}
          </Link>
        </div>

        {/* PERFIL */}
        {!collapsed && user && (
          <div className="p-4 border-b border-border flex items-center justify-between gap-2">
            <span className="font-pixel text-[10px] text-neon-green truncate max-w-[100px]" style={profile ? getNameStyle(profile.color_name) : {}}>
              {profile?.display_name || "..."}
            </span>
            <button onClick={() => setShowLogoutModal(true)} className="text-muted-foreground hover:text-destructive"><LogOut className="w-4 h-4" /></button>
          </div>
        )}

        {/* NAVEGACIÓN - ICONOS GRANDES */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-2 retro-scrollbar">
          {navItems.map((item) => {
            const isActive = item.to ? location.pathname === item.to : item.children?.some(c => location.pathname === c.to);
            const isExpanded = expandedItems.includes(item.label);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.label}>
                <button
                  onClick={() => hasChildren ? toggleExpand(item.label) : null}
                  className={cn("w-full flex items-center gap-3 p-3 rounded-lg transition-all", isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50")}
                >
                  {item.to && !hasChildren ? (
                    <Link to={item.to} className="flex items-center gap-3 w-full">
                      <item.icon className={cn("w-6 h-6", item.color)} />
                      {!collapsed && <span className="font-body text-sm flex-1 text-left">{item.label}</span>}
                    </Link>
                  ) : (
                    <>
                      <item.icon className={cn("w-6 h-6", item.color)} />
                      {!collapsed && <span className="font-body text-sm flex-1 text-left">{item.label}</span>}
                      {!collapsed && hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                    </>
                  )}
                </button>
                {!collapsed && hasChildren && isExpanded && (
                  <div className="ml-9 mt-1 space-y-1 border-l border-border/50 pl-2">
                    {item.children!.map((child) => (
                      <Link key={child.to} to={child.to} className={cn("block py-2 text-xs transition-colors", location.pathname === child.to ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}