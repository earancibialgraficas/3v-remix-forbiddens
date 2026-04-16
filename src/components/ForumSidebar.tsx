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
  TooltipTrigger,
  TooltipPortal,
  TooltipProvider
} from "@/components/ui/tooltip";

export default function ForumSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Salas de Juego"]);
  const { user, profile, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      try {
        const { count } = await supabase
          .from("inbox_messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("is_read", false);
        setUnreadMessages(count || 0);
      } catch (e) { console.error("Error unread:", e); }
    };
    fetchUnread();
  }, [user?.id]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  };

  const navItems = [
    { label: "Inicio", icon: Home, to: "/", color: "text-foreground" },
    { label: "Salas de Juego", icon: Gamepad2, color: "text-neon-green", children: [{ label: "Emuladores", to: "/arcade/salas" }, { label: "Biblioteca", to: "/arcade/biblioteca" }, { label: "Leaderboards", to: "/arcade/leaderboards" }] },
    { label: "Consejos Gaming", icon: BookOpen, to: "/arcade/consejos", color: "text-neon-green" },
    { label: "Gaming & Anime", icon: Tv, color: "text-neon-cyan", children: [{ label: "Foro General", to: "/gaming-anime/foro" }, { label: "Anime & Manga", to: "/gaming-anime/anime" }, { label: "Gaming", to: "/gaming-anime/gaming" }, { label: "Rincón del Creador", to: "/gaming-anime/creador" }] },
    { label: "Motociclismo", icon: Bike, color: "text-neon-magenta", children: [{ label: "Foro de Riders", to: "/motociclismo/riders" }, { label: "Taller & Mecánica", to: "/motociclismo/taller" }, { label: "Rutas & Quedadas", to: "/motociclismo/rutas" }] },
    { label: "Mercado & Trueque", icon: ShoppingBag, color: "text-neon-yellow", children: [{ label: "Gaming", to: "/mercado/gaming" }, { label: "Bikers", to: "/mercado/motor" }] },
    { label: "Social Hub", icon: Users, color: "text-neon-orange", children: [{ label: "Feed", to: "/social/feed" }, { label: "Reels & Videos", to: "/social/reels" }, { label: "Muro Fotográfico", to: "/social/fotos" }] },
    { label: "Trending", icon: Flame, to: "/trending", color: "text-destructive" },
    { label: "Eventos", icon: Calendar, to: "/eventos", color: "text-muted-foreground" },
    { label: "Membresías", icon: Star, to: "/membresias", color: "text-neon-yellow" },
    { label: "Reglas", icon: AlertTriangle, to: "/reglas", color: "text-neon-orange" },
    { label: "Ayuda", icon: HelpCircle, to: "/ayuda", color: "text-muted-foreground" },
    { label: "Discord", icon: Users, to: "https://discord.gg/ZHNRKVUfVF", color: "text-[#5865F2]" },
  ];

  return (
    <TooltipProvider>
      {showLogoutModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg p-5 max-w-sm w-full text-center shadow-2xl space-y-4">
            <h3 className="font-pixel text-[9px] uppercase tracking-widest text-foreground tracking-tighter">¿Cerrar Sesión?</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLogoutModal(false)} className="flex-1 font-pixel text-[8px] h-7">NO</Button>
              <Button variant="destructive" onClick={async () => { await signOut(); setShowLogoutModal(false); }} className="flex-1 font-pixel text-[8px] h-7">SÍ, SALIR</Button>
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
                 {"FORBIDDENS".split("").map((l, i) => (
                   <span key={i} className="font-pixel text-[8px] leading-none" style={{ color: '#de1839' }}>{l}</span>
                 ))}
               </div>
             ) : (
               <span className="font-pixel text-[10px] tracking-widest text-center" style={{ color: '#de1839', textShadow: '0 0 8px rgba(222, 24, 57, 0.6)' }}>FORBIDDENS</span>
             )}
          </Link>
        </div>

        {/* SECCIÓN DE USUARIO (SIEMPRE VISIBLE) */}
        <div className={cn("p-2 border-b border-border bg-muted/5 flex flex-col gap-2", collapsed ? "items-center" : "px-3")}>
          {!collapsed && (
            <div className="relative mb-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input placeholder="Buscar..." className="h-7 pl-7 bg-background text-[10px]" />
            </div>
          )}
          
          <div className={cn("flex items-center gap-1", collapsed ? "flex-col gap-3" : "justify-between")}>
            <div className={cn("flex items-center gap-1", collapsed && "flex-col gap-3")}>
              <NotificationBell />
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link to="/perfil"><User className="w-3.5 h-3.5" /></Link></Button>
              <div className="relative">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link to="/mensajes"><Mail className="w-3.5 h-3.5" /></Link></Button>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-[7px] font-bold h-3 w-3 flex items-center justify-center rounded-full animate-pulse">
                    {unreadMessages > 9 ? "+" : unreadMessages}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link to="/configuracion"><Settings className="w-3.5 h-3.5" /></Link></Button>
            </div>

            {!collapsed && user && (
              <div className="flex items-center gap-1.5 ml-auto min-w-0">
                <span 
                  className="text-[9px] font-pixel text-neon-green truncate max-w-[60px]" 
                  style={profile ? getNameStyle(profile.color_name) : {}}
                >
                  {profile?.display_name || "..."}
                </span>
                <button onClick={() => setShowLogoutModal(true)} className="text-muted-foreground hover:text-destructive"><LogOut className="w-3 h-3" /></button>
              </div>
            )}
          </div>
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
                    <Link to={item.to || "#"} className={cn("flex items-center justify-center p-2 rounded transition-all mb-0.5", isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50")}>
                      <item.icon className={cn("w-4 h-4", item.color)} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent side="right" className="bg-card border-border shadow-2xl p-2 min-w-[140px] z-[9999]">
                      <p className={cn("text-[9px] font-pixel mb-1.5 border-b border-border pb-1 uppercase tracking-tighter", item.color)}>{item.label}</p>
                      {hasChildren && (
                        <div className="flex flex-col gap-0.5">
                          {item.children!.map((child) => (
                            <Link key={child.to} to={child.to} className="text-[10px] py-1 px-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground font-body">
                              {child.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </TooltipContent>
                  </TooltipPortal>
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