import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  Gamepad2, Tv, Bike, ShoppingBag, Users, Home,
  Flame, Calendar, Star, HelpCircle, ChevronDown, ChevronRight,
  User, LogOut, PanelLeftClose, PanelLeft, Mail, AlertTriangle, BookOpen, Settings, MessageSquare, Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getNameStyle } from "@/lib/profileAppearance";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavChild {
  label?: string;
  to?: string;
  isSeparator?: boolean;
  isTitle?: boolean;
  color?: string;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  to?: string;
  color: string;
  children?: NavChild[];
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
  
  { label: "Trending", icon: Flame, to: "/trending", color: "text-destructive" },
  
  {
    label: "Zona de Debate", icon: MessageSquare, color: "text-neon-cyan", isDropdownOnly: true,
    children: [
      { isTitle: true, label: "GAMING & ANIME", color: "text-neon-green" }, 
      { label: "🎮 Foro General", to: "/gaming-anime/foro" },
      { label: "📺 Anime & Manga", to: "/gaming-anime/anime" },
      { label: "🕹️ Gaming", to: "/gaming-anime/gaming" },
      { label: "💡 Consejos Gaming", to: "/arcade/consejos" },
      { label: "🎨 Rincón del Creador", to: "/gaming-anime/creador" },
      { isSeparator: true },
      { isTitle: true, label: "MOTOCICLISMO", color: "text-[#ff3b00]" }, 
      { label: "🏍️ Foro de Riders", to: "/motociclismo/riders" },
      { label: "🔧 Taller & Mecánica", to: "/motociclismo/taller" },
      { label: "🛣️ Rutas & Quedadas", to: "/motociclismo/rutas" },
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
  { label: "Eventos", icon: Calendar, to: "/eventos", color: "text-muted-foreground" },
  { label: "Membresías", icon: Star, to: "/membresias", color: "text-neon-yellow" },
  { label: "Reglas", icon: AlertTriangle, to: "/reglas", color: "text-neon-orange" },
  { label: "Ayuda", icon: HelpCircle, to: "/ayuda", color: "text-muted-foreground" },
  { label: "Discord", icon: Users, to: "https://discord.gg/ZHNRKVUfVF", color: "text-[#5865F2]" },
];

export default function ForumSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(["Salas de Juego", "Zona de Debate"]);
  const { user, profile, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const isMobile = useIsMobile();
  
  const [unreadPublic, setUnreadPublic] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const fetchInboxCount = async () => {
      try {
        const { count } = await supabase.from("inbox_messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false);
        setUnreadPublic(count || 0);
      } catch (e) {}
    };
    fetchInboxCount();
    window.addEventListener("updateBadges", fetchInboxCount);
    
    // 🔥 Si es celular, detenemos la suscripción en tiempo real para evitar pantallas negras 🔥
    if (isMobile) {
      return () => window.removeEventListener("updateBadges", fetchInboxCount);
    }

    const channel = supabase.channel(`sidebar-inbox-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "inbox_messages", filter: `receiver_id=eq.${user.id}` }, () => fetchInboxCount()).subscribe();
    return () => { window.removeEventListener("updateBadges", fetchInboxCount); supabase.removeChannel(channel); };
  }, [user?.id, isMobile]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchNotifsCount = async () => {
      try {
        const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false);
        const { count: reqCount } = await supabase.from("friend_requests").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("status", "pending");
        setUnreadNotifications((count || 0) + (reqCount || 0));
      } catch (e) {}
    };
    fetchNotifsCount();
    window.addEventListener("updateBadges", fetchNotifsCount);

    // 🔥 Si es celular, detenemos la suscripción en tiempo real para evitar pantallas negras 🔥
    if (isMobile) {
      return () => window.removeEventListener("updateBadges", fetchNotifsCount);
    }

    const channel1 = supabase.channel(`sidebar-notifs-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifsCount()).subscribe();
    const channel2 = supabase.channel(`sidebar-reqs-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${user.id}` }, () => fetchNotifsCount()).subscribe();
    return () => { window.removeEventListener("updateBadges", fetchNotifsCount); supabase.removeChannel(channel1); supabase.removeChannel(channel2); };
  }, [user?.id, isMobile]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  };

  return (
    <TooltipProvider>
      {showLogoutModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg p-5 max-w-sm w-full text-center space-y-4">
            <h3 className="font-pixel text-[9px] text-foreground tracking-tighter uppercase">¿CERRAR SESIÓN?</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLogoutModal(false)} className="flex-1 font-pixel text-[8px] h-7">NO</Button>
              <Button variant="destructive" onClick={async () => { await signOut(); setShowLogoutModal(false); }} className="flex-1 font-pixel text-[8px] h-7">SÍ</Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <aside className={cn("bg-card border-r border-border flex flex-col h-full transition-all duration-300 relative z-40", collapsed ? "w-14" : "w-60 xl:w-64")}>
        <div className="flex flex-col items-center py-5 px-2 border-b border-border gap-3 shrink-0">
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground transition-all">
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <Link to="/" className="flex flex-col items-center w-full">
             {collapsed ? (
               <div
                 className="relative w-full flex items-center justify-center rounded-sm border border-[#de1839]/40 bg-background/40 px-0.5 py-1"
                 aria-label="FORBIDDENS"
                 style={{
                   boxShadow: '0 0 6px rgba(222, 24, 57, 0.35), inset 0 0 4px rgba(222, 24, 57, 0.25)',
                 }}
               >
                 <span
                   className="font-pixel leading-none w-full text-center"
                   style={{
                     color: '#ff4d6d',
                     fontSize: '6px',
                     letterSpacing: '0.5px',
                     textShadow: '0 0 3px rgba(222, 24, 57, 0.9), 0 0 6px rgba(222, 24, 57, 0.6)',
                   }}
                 >
                   FORBIDDENS
                 </span>
               </div>
             ) : (
               <span className="font-pixel text-[10px] xl:text-[12px] tracking-widest text-center" style={{ color: '#de1839', textShadow: '0 0 8px rgba(222, 24, 57, 0.6)' }}>FORBIDDENS</span>
             )}
          </Link>
        </div>

        <div className={cn("p-2 border-b border-border flex flex-col bg-muted/5", collapsed ? "items-center gap-2 py-3" : "px-3 items-start gap-2")}>
          <div className={cn("flex items-center", collapsed ? "flex-col gap-1.5" : "gap-2")}>
            <div className="relative">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Perfil y Avisos">
                <Link to="/perfil"><User className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Link>
              </Button>
              {/* 🔥 Se oculta la campana dentro del Sidebar en celular porque ahora vive afuera 🔥 */}
              {!isMobile && unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-white h-4 w-4 flex items-center justify-center rounded-full animate-pulse shadow-sm pointer-events-none z-30">
                  <Bell className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
            <div className="relative">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Bandeja Pública">
                <Link to="/bandeja-publica"><Mail className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Link>
              </Button>
              {unreadPublic > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-white text-[7px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full animate-pulse shadow-sm pointer-events-none z-30">{unreadPublic > 9 ? "9+" : unreadPublic}</span>}
            </div>
            <div className="relative">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild title="Configuraciones">
                <Link to="/perfil?edit=true"><Settings className="w-4 h-4 text-muted-foreground hover:text-foreground" /></Link>
              </Button>
            </div>
          </div>
          {!collapsed && user && (
            <div className="flex items-center justify-between w-full gap-2 mt-1">
              <span className="font-pixel text-[9px] xl:text-[10px] text-neon-green truncate max-w-[90px] xl:max-w-[110px] uppercase" style={(() => { try { return profile ? getNameStyle(profile.color_name) : {}; } catch(e) { return {}; } })()}>
                {profile?.display_name || "..."}
              </span>
              <button onClick={() => setShowLogoutModal(true)} className="text-muted-foreground hover:text-destructive transition-colors"><LogOut className="w-3.5 h-3.5 xl:w-4 xl:h-4" /></button>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-1.5 retro-scrollbar">
          <div className="flex flex-col min-h-full space-y-0.5 xl:space-y-1">
            {navItems.map((item, i) => {
              const isActive = item.to ? location.pathname === item.to : item.children?.some(c => location.pathname === c.to);
              const isExpanded = expandedItems.includes(item.label);
              const hasChildren = item.children && item.children.length > 0;
              const isLast = i === navItems.length - 1;

              if (collapsed) {
                return (
                  <div key={item.label} className={cn(isLast && "mt-auto pt-4")}>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Link 
                          to={item.to || "#"} onClick={(e) => { if (!item.to) e.preventDefault(); }}
                          className={cn("flex items-center justify-center p-2 rounded transition-all mb-0.5", isActive ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground")}
                        >
                          <item.icon className={cn("w-4 h-4 xl:w-5 xl:h-5", item.color)} />
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8} className="bg-card border-border shadow-2xl p-2 min-w-[140px] z-[9999]">
                        <p className={cn("text-[9px] font-pixel mb-1.5 border-b border-border pb-1 uppercase tracking-tighter", item.color)}>{item.label}</p>
                        {hasChildren && (
                          <div className="flex flex-col gap-0.5">
                            {item.children!.map((child, idx) => (
                              child.isSeparator ? (
                                <div key={`sep-${idx}`} className="my-1 border-b border-border/40 mx-1" />
                              ) : child.isTitle ? (
                                <span key={`title-${idx}`} className={cn("block px-1 pt-1.5 pb-0.5 text-[8px] font-pixel opacity-90 uppercase tracking-widest", child.color || "text-muted-foreground")}>{child.label}</span>
                              ) : (
                                <Link key={child.to} to={child.to!} className="text-[10px] py-1 px-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-body">{child.label}</Link>
                              )
                            ))}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              }

              return (
                <div key={item.label} className={cn(isLast && "mt-auto pt-2 pb-1")}>
                  <button onClick={() => hasChildren ? toggleExpand(item.label) : null} className={cn("w-full flex items-center gap-2.5 px-2 py-1.5 rounded transition-all", isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}>
                    {item.to && !hasChildren ? (
                      <Link to={item.to} className="flex items-center gap-2.5 w-full">
                        <item.icon className={cn("w-4 h-4 xl:w-5 xl:h-5", item.color)} />
                        <span className="font-body text-xs xl:text-sm flex-1 text-left">{item.label}</span>
                      </Link>
                    ) : (
                      <>
                        <item.icon className={cn("w-4 h-4 xl:w-5 xl:h-5", item.color)} />
                        <span className="font-body text-xs xl:text-sm flex-1 text-left">{item.label}</span>
                        {hasChildren && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
                      </>
                    )}
                  </button>
                  {hasChildren && isExpanded && (
                    <div className="ml-7 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
                      {item.children!.map((child, idx) => (
                        child.isSeparator ? (
                           <div key={`sep-${idx}`} className="my-1.5 border-b border-border/40 mx-2" />
                        ) : child.isTitle ? (
                           <span key={`title-${idx}`} className={cn("block px-2 pt-2 pb-1 text-[9px] font-pixel opacity-90 uppercase tracking-widest", child.color || "text-muted-foreground")}>{child.label}</span>
                        ) : (
                           <Link key={child.to} to={child.to!} className={cn("block py-1 px-2 rounded-sm text-[11px] xl:text-xs transition-colors", location.pathname === child.to ? "text-primary font-bold bg-muted/30" : "text-muted-foreground hover:text-foreground hover:bg-muted/10")}>{child.label}</Link>
                        )
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
      </aside>
    </TooltipProvider>
  );
}