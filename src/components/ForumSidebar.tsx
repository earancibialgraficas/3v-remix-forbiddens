import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Gamepad2, Tv, Bike, ShoppingBag, Users, Home,
  Flame, Calendar, Star, HelpCircle, ChevronDown, ChevronRight,
  Search, User, Settings, LogOut, PanelLeftClose, PanelLeft, Mail, AlertTriangle, BookOpen
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { getNameStyle } from "@/lib/profileAppearance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from "@/components/ui/tooltip";

export default function ForumSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Salas de Juego"]);
  const { user, profile, signOut } = useAuth();
  const [unreadPublic, setUnreadPublic] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const fetchCount = async () => {
      try {
        const { count } = await supabase.from("inbox_messages").select("id", { count: "exact", head: true }).eq("is_read", false);
        setUnreadPublic(count || 0);
      } catch (e) { console.warn("Tabla inbox no lista"); }
    };
    fetchCount();
  }, [user?.id]);

  const navItems = [
    { label: "Inicio", icon: Home, to: "/", color: "text-foreground" },
    { label: "Salas de Juego", icon: Gamepad2, color: "text-neon-green", children: [{ label: "Emuladores", to: "/arcade/salas" }, { label: "Biblioteca", to: "/arcade/biblioteca" }, { label: "Leaderboards", to: "/arcade/leaderboards" }] },
    { label: "Consejos Gaming", icon: BookOpen, to: "/arcade/consejos", color: "text-neon-green" },
    { label: "Gaming & Anime", icon: Tv, color: "text-neon-cyan", children: [{ label: "Foro General", to: "/gaming-anime/foro" }, { label: "Anime & Manga", to: "/gaming-anime/anime" }, { label: "Gaming", to: "/gaming-anime/gaming" }, { label: "Rincón del Creador", to: "/gaming-anime/creador" }] },
    { label: "Motociclismo", icon: Bike, color: "text-neon-magenta", children: [{ label: "Foro de Riders", to: "/motociclismo/riders" }, { label: "Taller & Mecánica", to: "/motociclismo/taller" }, { label: "Rutas & Quedadas", to: "/motociclismo/rutas" }] },
    { label: "Mercado & Trueque", icon: ShoppingBag, color: "text-neon-yellow", children: [{ label: "Gaming", to: "/mercado/gaming" }, { label: "Bikers", to: "/mercado/motor" }] },
    { label: "Social Hub", icon: Users, color: "text-neon-orange", children: [{ label: "Feed", to: "/social/feed" }, { label: "Reels", to: "/social/reels" }, { label: "Fotos", to: "/social/fotos" }] },
    { label: "Trending", icon: Flame, to: "/trending", color: "text-destructive" },
    { label: "Eventos", icon: Calendar, to: "/eventos", color: "text-muted-foreground" },
    { label: "Membresías", icon: Star, to: "/membresias", color: "text-neon-yellow" },
    { label: "Reglas", icon: AlertTriangle, to: "/reglas", color: "text-neon-orange" },
    { label: "Ayuda", icon: HelpCircle, to: "/ayuda", color: "text-muted-foreground" },
    { label: "Discord", icon: Users, to: "https://discord.gg/ZHNRKVUfVF", color: "text-[#5865F2]" },
  ];

  return (
    <TooltipProvider>
      <aside className={cn("bg-card border-r border-border flex flex-col h-full transition-all duration-300 relative z-40", collapsed ? "w-14" : "w-60")}>
        
        {/* LOGO */}
        <div className="flex flex-col items-center py-5 px-2 border-b border-border gap-3 shrink-0">
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

        {/* BOTONES DE USUARIO INTEGRADOS */}
        <div className={cn("p-2 border-b border-border bg-muted/5 flex flex-col gap-2", collapsed ? "items-center" : "px-3")}>
          <div className={cn("flex items-center gap-1", collapsed ? "flex-col gap-3" : "justify-between")}>
            <div className={cn("flex items-center gap-1", collapsed && "flex-col gap-3")}>
              <NotificationBell />
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link to="/perfil"><User className="w-3.5 h-3.5" /></Link></Button>
              <div className="relative">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link to="/bandeja-publica"><Mail className="w-3.5 h-3.5" /></Link></Button>
                {unreadPublic > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-white text-[7px] font-bold h-3 w-3 flex items-center justify-center rounded-full animate-pulse">{unreadPublic}</span>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild><Link to="/configuracion"><Settings className="w-3.5 h-3.5" /></Link></Button>
            </div>
            {!collapsed && user && (
              <span className="text-[9px] font-pixel text-neon-green truncate max-w-[50px] ml-auto uppercase" style={profile ? getNameStyle(profile.color_name) : {}}>{profile?.display_name || "User"}</span>
            )}
          </div>
        </div>

        {/* NAVEGACIÓN COMPLETA */}
        <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5 retro-scrollbar">
          {navItems.map((item) => (
            <div key={item.label}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button onClick={() => item.children && !collapsed && setExpandedItems(prev => prev.includes(item.label) ? prev.filter(l => l !== item.label) : [...prev, item.label])} className={cn("w-full flex items-center gap-2.5 px-2 py-1.5 rounded transition-all", location.pathname === item.to ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}>
                    {item.to && !item.children ? <Link to={item.to} className="flex items-center gap-2.5 w-full"><item.icon className={cn("w-4 h-4", item.color)} />{!collapsed && <span className="text-xs">{item.label}</span>}</Link> : <><item.icon className={cn("w-4 h-4", item.color)} />{!collapsed && <span className="text-xs flex-1 text-left">{item.label}</span>}{!collapsed && item.children && (expandedItems.includes(item.label) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}</>}
                  </button>
                </TooltipTrigger>
                {collapsed && <TooltipPortal><TooltipContent side="right" className="bg-card border-border p-2 z-[9999] shadow-2xl min-w-[140px]"><p className={cn("text-[9px] font-pixel border-b pb-1 mb-1 uppercase", item.color)}>{item.label}</p>{item.children?.map(c => <Link key={c.to} to={c.to} className="block text-[10px] py-1 hover:text-foreground text-muted-foreground transition-colors">{c.label}</Link>)}</TooltipContent></TooltipPortal>}
              </Tooltip>
              {!collapsed && item.children && expandedItems.includes(item.label) && (
                <div className="ml-7 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
                  {item.children.map(child => <Link key={child.to} to={child.to} className={cn("block py-1 text-[11px] transition-colors", location.pathname === child.to ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground")}>{child.label}</Link>)}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}