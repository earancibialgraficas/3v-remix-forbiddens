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
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";

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
          <div className="bg-card border border-border rounded-lg p-5 max-w-sm w-full text-center space-y-4">
            <h3 className="font-pixel text-[9px] text-foreground tracking-tighter uppercase">¿CERRAR SESIÓN?</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLogoutModal(false)} className="flex-1 font-pixel text-[8px] h-7">NO</Button>
              <Button variant="destructive" onClick={async () => { await signOut(); setShowLogoutModal(false); }} className="flex-1 font-pixel text-[8px] h-7">SÍ</Button>
            </div>
          </div>
        </div>
      )}

      <aside className={cn("bg-card border-r border-border flex flex-col h-full transition-all duration-300", collapsed ? "w-14" : "w-60")}>
        
        {/* LOGO SECTION */}
        <div className="flex flex-col items-center py-5 px-2 border-b border-border gap-3">
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-all">
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          
          <Link to="/" className="flex flex-col items-center">
             {collapsed ? (
               <div className="flex flex-col items-center gap-[1px]">
                 {"FORBIDDENS".split("").map((letter, i) => (
                   <span key={i} className="font-pixel text-[8px] leading-none" style={{ color: '#de1839', textShadow: '0 0 5px rgba(222, 24, 57, 0.4)' }}>
                     {letter}
                   </span>
                 ))}
               </div>
             ) : (
               <span className="font-pixel text-[10px] tracking-widest text-center" style={{ color: '#de1839', textShadow: '0 0 8px rgba(222, 24, 57, 0.6)' }}>FORBIDDENS</span>
             )}
          </Link>
        </div>

        {/* PROFILE BUTTON - Solo perfil por ahora */}
        <div className={cn("p-2 border-b border-border flex flex-col items-center bg-muted/5", collapsed ? "" : "px-3 items-start")}>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link to="/perfil">
              <User className="w-4 h-4 text-muted-foreground hover:text-foreground" />
            </Link>
          </Button>
          
          {!collapsed && user && (
            <div className="flex items-center justify-between w-full gap-2 mt-1">
              <span className="font-pixel text-[9px] text-neon-green truncate max-w-[90px] uppercase" style={(() => { try { return profile ? getNameStyle(profile.color_name) : {}; } catch(e) { return {}; } })()}>
                {profile?.display_name || "..."}
              </span>
              <button onClick={() => setShowLogoutModal(true)} className="text-muted-foreground hover:text-destructive transition-colors">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5 retro-scrollbar">
          {navItems.map((item) => {
            const isActive = item.to ? location.pathname === item.to : item.children?.some(c => location.pathname === c.to);
            const isExpanded = expandedItems.includes(item.label);
            const hasChildren = item.children && item.children.length > 0;

            if (collapsed) {
              return (
                <Tooltip key={item.label} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link 
                      to={item.to || "#"} 
                      onClick={(e) => { if (!item.to) e.preventDefault(); }}
                      className={cn(
                        "flex items-center justify-center p-2 rounded transition-all mb-0.5", 
                        isActive ? "bg-primary/20 text-primary shadow-[0_0_8px_rgba(var(--primary),0.2)]" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4", item.color)} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-card border-border shadow-2xl p-2 min-w-[140px] z-[999]">
                    <p className={cn("text-[9px] font-pixel mb-1.5 border-b border-border pb-1 uppercase tracking-tighter", item.color)}>
                      {item.label}
                    </p>
                    {hasChildren && (
                      <div className="flex flex-col gap-0.5">
                        {item.children!.map((child) => (
                          <Link 
                            key={child.to} 
                            to={child.to} 
                            className="text-[10px] py-1 px-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-body"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <div key={item.label}>
                <button
                  onClick={() => hasChildren ? toggleExpand(item.label) : null}
                  className={cn("w-full flex items-center gap-2.5 px-2 py-1.5 rounded transition-all", isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}
                >
                  {item.to && !hasChildren ? (
                    <Link to={item.to} className="flex items-center gap-2.5 w-full">
                      <item.icon className={cn("w-4 h-4", item.color)} />
                      <span className="font-body text-xs flex-1 text-left">{item.label}</span>
                    </Link>
                  ) : (
                    <>
                      <item.icon className={cn("w-4 h-4", item.color)} />
                      <span className="font-body text-xs flex-1 text-left">{item.label}</span>
                      {hasChildren && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
                    </>
                  )}
                </button>
                {hasChildren && isExpanded && (
                  <div className="ml-7 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
                    {item.children!.map((child) => (
                      <Link key={child.to} to={child.to} className={cn("block py-1 text-[11px] transition-colors", location.pathname === child.to ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground")}>
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