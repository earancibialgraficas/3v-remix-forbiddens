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
        const { count } = await supabase.from("inbox_messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false);
        setUnreadMessages(count || 0);
      } catch (e) { console.error(e); }
    };
    fetchUnread();
    const channel = supabase.channel("sidebar-unread").on("postgres_changes", { event: "*", schema: "public", table: "inbox_messages", filter: `receiver_id=eq.${user.id}` }, () => fetchUnread()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  };

  return (
    <TooltipProvider>
      {showLogoutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
          <div className="relative bg-card border border-border rounded-lg p-6 max-w-sm w-full animate-scale-in text-center space-y-4 shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-neon-yellow mx-auto" />
            <h3 className="font-pixel text-[10px] uppercase">¿Cerrar Sesión?</h3>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowLogoutModal(false)} className="flex-1 font-pixel text-[8px]">NO</Button>
              <Button variant="destructive" onClick={async () => { await signOut(); setShowLogoutModal(false); }} className="flex-1 font-pixel text-[8px]">SÍ</Button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={cn(
          "bg-card border-r border-border flex flex-col transition-all duration-300 h-full overflow-y-auto overflow-x-hidden retro-scrollbar",
          collapsed ? "w-14" : "w-60",
          "relative z-50" // Cambiamos a relative para que MainLayout controle el posicionamiento
        )}
      >
        {/* LOGO SECTION - CORREGIDO */}
        <div className="flex flex-col items-center py-6 px-2 border-b border-border gap-4">
          <button onClick={onToggle} className="p-2 rounded-md hover:bg-muted/50 text-muted-foreground transition-colors">
            {collapsed ? <PanelLeft className="w-6 h-6" /> : <PanelLeftClose className="w-6 h-6" />}
          </button>
          
          <Link to="/" className="flex flex-col items-center group">
             {collapsed ? (
               <div className="flex flex-col items-center leading-none">
                 {"FORBIDDENS".split("").map((l, i) => (
                   <span key={i} className="font-pixel text-[9px] mb-[1px]" style={{ color: '#de1839', textShadow: '0 0 5px rgba(222, 24, 57, 0.5)' }}>{l}</span>
                 ))}
               </div>
             ) : (
               <span className="font-pixel text-xs tracking-widest text-center" style={{ color: '#de1839', textShadow: '0 0 8px rgba(222, 24, 57, 0.6)' }}>FORBIDDENS</span>
             )}
          </Link>
        </div>

        {/* PROFILE SECTION */}
        {!collapsed && (
          <div className="p-4 space-y-4 border-b border-border bg-muted/10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="h-9 pl-10 bg-background border-border text-xs" />
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <NotificationBell />
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link to="/perfil"><User className="w-4 h-4" /></Link></Button>
              </div>

              {user ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span 
                    className="text-[10px] font-pixel truncate max-w-[80px] text-neon-green"
                    style={(() => { try { return profile ? getNameStyle(profile.color_name) : {}; } catch(e) { return {}; } })()}
                  >
                    {profile?.display_name || "..."}
                  </span>
                  <button onClick={() => setShowLogoutModal(true)} className="text-muted-foreground hover:text-destructive"><LogOut className="w-4 h-4" /></button>
                </div>
              ) : (
                <Button size="sm" className="h-8 text-[9px] font-pixel bg-primary" asChild><Link to="/login">ENTRAR</Link></Button>
              )}
            </div>
          </div>
        )}

        {/* NAVIGATION */}
        <nav className="flex-1 px-2 py-4 space-y-2">
          {navItems.map((item) => {
            const isActive = item.to ? location.pathname === item.to : item.children?.some(c => location.pathname === c.to);
            const isExpanded = expandedItems.includes(item.label);
            const hasChildren = item.children && item.children.length > 0;

            if (collapsed) {
              return (
                <Tooltip key={item.label} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link to={item.to || "#"} className={cn("flex items-center justify-center p-3 rounded-lg transition-all", isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted")}>
                      <item.icon className={cn("w-6 h-6", item.color)} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-card border-border shadow-2xl">
                    <p className={cn("text-xs font-pixel", item.color)}>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => hasChildren && toggleExpand(item.label)}
                  className={cn("flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all", isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}
                >
                  <item.icon className={cn("w-5 h-5 shrink-0", item.color)} />
                  <span className="flex-1 text-left font-body truncate">{item.label}</span>
                  {hasChildren && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                </button>
                
                {hasChildren && isExpanded && (
                  <div className="ml-8 space-y-1 border-l border-border/50 pl-2">
                    {item.children!.map((child) => (
                      <Link key={child.to} to={child.to} className={cn("block py-2 px-2 text-xs transition-colors", location.pathname === child.to ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground")}>
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