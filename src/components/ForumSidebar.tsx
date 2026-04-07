import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Gamepad2, Tv, Bike, ShoppingBag, Users, Home,
  Flame, Calendar, Star, HelpCircle, ChevronDown, ChevronRight,
  Search, Bell, User, LogIn, Settings, BookOpen, LogOut,
  PanelLeftClose, PanelLeft, X, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/forbiddens_logo.svg";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
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
      { label: "Motor", to: "/mercado/motor" },
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
  { label: "Ayuda", icon: HelpCircle, to: "/ayuda", color: "text-muted-foreground" },
];

interface ForumSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function ForumSidebar({ collapsed, onToggle }: ForumSidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Salas de Juego"]);
  const { user, profile, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const handleLogout = async () => {
    await signOut();
    setShowLogoutModal(false);
  };

  return (
    <>
      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
          <div className="relative bg-card border border-border rounded-lg p-5 max-w-xs w-full mx-4 animate-scale-in space-y-4">
            <button onClick={() => setShowLogoutModal(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
            <div className="text-center space-y-2">
              <AlertTriangle className="w-10 h-10 text-neon-yellow mx-auto" />
              <h3 className="font-pixel text-[10px] text-foreground">¿CERRAR SESIÓN?</h3>
              <p className="text-xs font-body text-muted-foreground">¿Estás seguro de que quieres salir?</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowLogoutModal(false)} className="flex-1 text-xs font-body">Cancelar</Button>
              <Button size="sm" variant="destructive" onClick={handleLogout} className="flex-1 text-xs font-body">Aceptar</Button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 h-screen bg-card border-r border-border overflow-y-auto transition-all duration-300 shrink-0 flex flex-col z-40 retro-scrollbar",
          collapsed ? "w-12" : "w-56"
        )}
      >
        {/* Logo + Toggle: vertical when collapsed, horizontal with text below when expanded */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5 py-2 px-1 border-b border-border">
            <button
              onClick={onToggle}
              className="flex items-center justify-center p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <Link to="/" className="flex items-center justify-center p-1">
              <img src={logo} alt="Forbiddens" className="w-7 h-7" />
            </Link>
            <div className="flex flex-col items-center gap-1.5">
              {"FORBIDDENS".split("").map((letter, i) => (
                <span
                  key={i}
                  className="font-pixel text-[11px] text-neon-green text-glow-green leading-none"
                  style={{ display: "block", writingMode: "initial" }}
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-2 border-b border-border">
            <button
              onClick={onToggle}
              className="flex items-center justify-center p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
            <Link to="/" className="flex items-center gap-2 flex-1 min-w-0">
              <img src={logo} alt="Forbiddens" className="w-6 h-6 shrink-0" />
              <span className="font-pixel text-[9px] text-neon-green text-glow-green truncate">FORBIDDENS</span>
            </Link>
          </div>
        )}

        {/* Search & user actions inside sidebar */}
        {!collapsed && (
          <div className="px-2 py-2 space-y-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Buscar..." className="h-7 pl-8 bg-muted border-border text-xs font-body transition-colors duration-200 focus:ring-primary/50" />
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors duration-200">
                <Bell className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors duration-200" asChild>
                <Link to="/perfil"><User className="w-3.5 h-3.5" /></Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors duration-200" asChild>
                <Link to="/configuracion"><Settings className="w-3.5 h-3.5" /></Link>
              </Button>
              {user ? (
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[9px] font-body text-neon-green truncate max-w-[60px]">{profile?.display_name}</span>
                  <Button size="sm" variant="ghost" onClick={() => setShowLogoutModal(true)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                    <LogOut className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <Button size="sm" className="h-7 bg-primary text-primary-foreground hover:bg-primary/80 font-body text-[10px] gap-1 ml-auto transition-all duration-200" asChild>
                  <Link to="/login"><LogIn className="w-3 h-3" /> Entrar</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn("px-1 space-y-0.5 retro-scrollbar", collapsed ? "py-1" : "flex-1 py-2")}>

          {collapsed && (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={user ? "/perfil" : "/login"}
                  className="flex items-center justify-center p-2 rounded transition-all duration-200 text-neon-cyan hover:bg-muted/50 hover:text-foreground"
                >
                  <User className="w-4 h-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-card border-border p-2 z-[100]">
                {user ? (
                  <div className="space-y-1">
                    <p className="text-xs font-body font-medium text-neon-green">{profile?.display_name}</p>
                    <Link to="/perfil" className="block text-[11px] font-body py-0.5 px-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">Mi Perfil</Link>
                    <Link to="/configuracion" className="block text-[11px] font-body py-0.5 px-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">Configuración</Link>
                    <button onClick={() => setShowLogoutModal(true)} className="block w-full text-left text-[11px] font-body py-0.5 px-1 rounded hover:bg-muted/50 text-destructive transition-colors">Cerrar Sesión</button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Link to="/login" className="block text-[11px] font-body py-0.5 px-1 rounded hover:bg-muted/50 text-neon-green transition-colors">Iniciar Sesión</Link>
                    <Link to="/registro" className="block text-[11px] font-body py-0.5 px-1 rounded hover:bg-muted/50 text-neon-cyan transition-colors">Registrarse</Link>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          )}

          {navItems.map((item) => {
            const isActive = item.to ? location.pathname === item.to : item.children?.some(c => location.pathname === c.to);
            const isExpanded = expandedItems.includes(item.label);
            const hasChildren = item.children && item.children.length > 0;

            if (collapsed) {
              return (
                <Tooltip key={item.label} delayDuration={0}>
                  <TooltipTrigger asChild>
                    {item.to && !item.isDropdownOnly ? (
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center justify-center p-2 rounded transition-all duration-200",
                          isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4", item.color)} />
                      </Link>
                    ) : (
                      <button
                        className={cn(
                          "flex items-center justify-center p-2 rounded transition-all duration-200 w-full",
                          isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4", item.color)} />
                      </button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-card border-border p-2 z-[100]">
                    <p className={cn("text-xs font-body font-medium", item.color)}>{item.label}</p>
                    {hasChildren && item.children!.map((child) => (
                      <Link
                        key={child.to}
                        to={child.to}
                        className={cn(
                          "block text-[11px] font-body py-0.5 px-1 rounded hover:bg-muted/50 transition-colors",
                          location.pathname === child.to ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <div key={item.label}>
                <div className="flex items-center">
                  {item.isDropdownOnly ? (
                    <button
                      onClick={() => hasChildren && toggleExpand(item.label)}
                      className={cn(
                        "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm font-body transition-all duration-200 flex-1 min-w-0",
                        isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 shrink-0", item.color)} />
                      <span className="truncate">{item.label}</span>
                      {hasChildren && (
                        isExpanded ? <ChevronDown className="w-3.5 h-3.5 ml-auto shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" />
                      )}
                    </button>
                  ) : (
                    <>
                      <Link
                        to={item.to!}
                        className={cn(
                          "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm font-body transition-all duration-200 flex-1 min-w-0",
                          isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        )}
                      >
                        <item.icon className={cn("w-4 h-4 shrink-0", item.color)} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                      {hasChildren && (
                        <button
                          onClick={() => toggleExpand(item.label)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div
                  className={cn(
                    "ml-6 space-y-0.5 overflow-hidden transition-all duration-300",
                    hasChildren && isExpanded ? "max-h-40 mt-0.5 opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  {hasChildren && item.children!.map((child) => (
                    <Link
                      key={child.to}
                      to={child.to}
                      className={cn(
                        "block px-2 py-1 rounded text-xs font-body transition-all duration-200",
                        location.pathname === child.to ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
