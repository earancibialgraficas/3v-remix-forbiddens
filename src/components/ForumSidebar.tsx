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

interface ForumSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function ForumSidebar({ collapsed, onToggle }: ForumSidebarProps) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Salas de Juego"]);
  const { user, profile, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadMessages(0); return; }
    const fetchUnread = async () => {
      try {
        const { count } = await supabase
          .from("inbox_messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("is_read", false);
        setUnreadMessages(count || 0);
      } catch (err) { console.error("Error unread:", err); }
    };
    fetchUnread();
    const channel = supabase.channel("sidebar-unread")
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_messages", filter: `receiver_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  return (
    <TooltipProvider>
      {showLogoutModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center animate-fade-in p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
          <div className="relative bg-card border border-border rounded-lg p-6 max-w-sm w-full animate-scale-in space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <AlertTriangle className="w-12 h-12 text-neon-yellow mx-auto" />
              <h3 className="font-pixel text-xs text-foreground uppercase tracking-widest">Cerrar Sesión</h3>
              <p className="text-sm font-body text-muted-foreground">¿Estás seguro de que quieres salir?</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowLogoutModal(false)} className="flex-1 font-pixel text-[8px]">NO</Button>
              <Button variant="destructive" onClick={async () => { await signOut(); setShowLogoutModal(false); }} className="flex-1 font-pixel text-[8px]">SÍ, SALIR</Button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={cn(
          "bg-card border-r border-border overflow-y-auto transition-all duration-300 shrink-0 flex flex-col retro-scrollbar h-full",
          collapsed ? "w-14" : "w-60",
          // FIX: Solo fixed en escritorio para evitar el bloqueo negro en móvil
          "md:fixed md:top-0 md:left-0 md:h-screen z-40"
        )}
      >
        {/* Logo Section */}
        <div className={cn("flex flex-col border-b border-border py-4 px-2 items-center", collapsed ? "gap-2" : "gap-4")}>
          <button onClick={onToggle} className="p-2 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors">
            {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          
          <Link to="/" className="group flex flex-col items-center">
            <span className="font-pixel text-xl mb-1" style={{ color: '#de1839', textShadow: '0 0 10px rgba(222, 24, 57, 0.5)' }}>F</span>
            {collapsed ? (
              <div className="flex flex-col items-center gap-1 opacity-60">
                {"ORBIDDENS".split("").map((l, i) => (
                  <span key={i} className="font-pixel text-[8px] leading-none" style={{ color: '#de1839' }}>{l}</span>
                ))}
              </div>
            ) : (
              <span className="font-pixel text-[10px] tracking-tighter" style={{ color: '#de1839' }}>ORBIDDENS</span>
            )}
          </Link>
        </div>

        {/* User / Search Section */}
        {!collapsed && (
          <div className="p-3 space-y-3 border-b border-border bg-muted/20">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Buscar en el foro..." className="h-8 pl-8 bg-background border-border text-xs font-body" />
            </div>
            
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link to="/perfil"><User className="w-4 h-4" /></Link>
              </Button>
              <div className="relative">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link to="/mensajes"><Mail className="w-4 h-4" /></Link>
                </Button>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1 rounded-full animate-pulse">{unreadMessages}</span>
                )}
              </div>

              {user ? (
                <div className="flex items-center gap-1 ml-auto">
                  <span 
                    className="text-[10px] font-pixel truncate max-w-[70px] text-neon-green"
                    style={(() => {
                      try { return profile ? getNameStyle(profile.color_name) : {}; }
                      catch(e) { return {}; }
                    })()}
                  >
                    {profile?.display_name || "..."}
                  </span>
                  <button onClick={() => setShowLogoutModal(true)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button size="sm" className="h-7 text-[9px] font-pixel bg-primary ml-auto" asChild>
                  <Link to="/login">LOGIN</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Section */}
        <nav className={cn("px-2 flex-1 retro-scrollbar", collapsed ? "py-4" : "py-4 space-y-1")}>
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
                      className={cn(
                        "flex items-center justify-center p-3 rounded-md transition-all mb-1",
                        isActive ? "bg-primary/20 text-primary shadow-[0_0_10px_rgba(var(--primary),0.2)]" : "text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <item.icon className={cn("w-5 h-5", item.color)} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-card border-border shadow-xl">
                    <p className={cn("text-xs font-pixel mb-1", item.color)}>{item.label}</p>
                    {hasChildren && item.children!.map((child) => (
                      <Link key={child.to} to={child.to} className="block text-[10px] py-1 text-muted-foreground hover:text-foreground">{child.label}</Link>
                    ))}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <div key={item.label} className="mb-1">
                <button
                  onClick={() => hasChildren && toggleExpand(item.label)}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 rounded-md transition-all text-sm font-body",
                    isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 shrink-0", item.color)} />
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                </button>
                
                {hasChildren && isExpanded && (
                  <div className="ml-9 mt-1 space-y-1 border-l border-border/50">
                    {item.children!.map((child) => (
                      <Link 
                        key={child.to} 
                        to={child.to} 
                        className={cn(
                          "block px-3 py-1.5 text-xs font-body transition-colors",
                          location.pathname === child.to ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
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