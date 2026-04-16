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
      } catch (e) { console.error(e); }
    };
    fetchUnread();
  }, [user?.id]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]);
  };

  const navItems = [
    { label: "Inicio", icon: Home, to: "/", color: "text-foreground" },
    { label: "Salas de Juego", icon: Gamepad2, color: "#22c55e", children: [{ label: "Emuladores", to: "/arcade/salas" }, { label: "Biblioteca", to: "/arcade/biblioteca" }, { label: "Leaderboards", to: "/arcade/leaderboards" }] },
    { label: "Consejos Gaming", icon: BookOpen, to: "/arcade/consejos", color: "#22c55e" },
    { label: "Gaming & Anime", icon: Tv, color: "#06b6d4", children: [{ label: "Foro General", to: "/gaming-anime/foro" }, { label: "Anime & Manga", to: "/gaming-anime/anime" }] },
    { label: "Motociclismo", icon: Bike, color: "#d946ef", children: [{ label: "Foros", to: "/motociclismo/riders" }] },
    { label: "Mercado & Trueque", icon: ShoppingBag, color: "#eab308", children: [{ label: "Gaming", to: "/mercado/gaming" }] },
    { label: "Social Hub", icon: Users, color: "#f97316", children: [{ label: "Feed", to: "/social/feed" }] },
    { label: "Trending", icon: Flame, to: "/trending", color: "#ef4444" },
    { label: "Eventos", icon: Calendar, to: "/eventos", color: "text-muted-foreground" },
    { label: "Membresías", icon: Star, to: "/membresias", color: "#eab308" },
    { label: "Reglas", icon: AlertTriangle, to: "/reglas", color: "#f97316" },
    { label: "Ayuda", icon: HelpCircle, to: "/ayuda", color: "text-muted-foreground" },
    { label: "Discord", icon: Users, to: "https://discord.gg/ZHNRKVUfVF", color: "#5865F2" },
  ];

  return (
    <TooltipProvider>
      <aside className={cn("bg-[#0f0f12] border-r border-white/5 flex flex-col h-full transition-all duration-300", collapsed ? "w-14" : "w-64")}>
        
        {/* LOGO - IDÉNTICO A TU FOTO */}
        <div className="flex flex-col items-center py-6 px-2 border-b border-white/5 gap-4">
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground transition-all">
            {collapsed ? <PanelLeft className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          
          <Link to="/" className="flex flex-col items-center">
             {collapsed ? (
               <div className="flex flex-col items-center gap-[1px]">
                 {"FORBIDDENS".split("").map((l, i) => (
                   <span key={i} className="font-pixel text-[8px] leading-none" style={{ color: '#de1839' }}>{l}</span>
                 ))}
               </div>
             ) : (
               <span className="font-pixel text-[11px] tracking-widest text-center" style={{ color: '#de1839', textShadow: '0 0 10px rgba(222, 24, 57, 0.4)' }}>FORBIDDENS</span>
             )}
          </Link>
        </div>

        {/* SECCIÓN DE USUARIO - AQUÍ ESTÁN TUS BOTONES */}
        <div className={cn("p-4 border-b border-white/5 bg-white/[0.02] flex flex-col gap-4", collapsed && "px-1 items-center")}>
          {!collapsed && (
            <div className="relative mb-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Buscar..." className="h-8 pl-9 bg-white/5 border-none text-[10px]" />
            </div>
          )}

          <div className={cn("flex items-center gap-1", collapsed ? "flex-col gap-4" : "justify-between")}>
            {/* HERRAMIENTAS: Notificaciones, Perfil, Inbox, Ajustes */}
            <div className={cn("flex items-center gap-1", collapsed && "flex-col gap-4")}>
              <NotificationBell />
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5" asChild><Link to="/perfil"><User className="w-4 h-4 text-muted-foreground" /></Link></Button>
              <div className="relative">
                <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5" asChild><Link to="/mensajes"><Mail className="w-4 h-4 text-muted-foreground" /></Link></Button>
                {unreadMessages > 0 && <span className="absolute -top-1 -right-1 bg-[#de1839] text-white text-[7px] font-bold h-3.5 w-3.5 flex items-center justify-center rounded-full animate-pulse shadow-lg">{unreadMessages}</span>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-white/5" asChild><Link to="/configuracion"><Settings className="w-4 h-4 text-muted-foreground" /></Link></Button>
            </div>

            {/* NOMBRE Y LOGOUT (ESTILO PIXEL DE TU FOTO) */}
            {!collapsed && user && (
              <div className="flex items-center gap-2 ml-auto min-w-0">
                <span className="font-pixel text-[10px] text-[#de1839] uppercase truncate max-w-[70px]">{profile?.display_name || "Orphen"}</span>
                <button onClick={() => signOut()} className="text-muted-foreground hover:text-white transition-colors"><LogOut className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>

        {/* NAVEGACIÓN - IDÉNTICA A TU FOTO */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 retro-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || item.children?.some(c => location.pathname === c.to);
            const isExpanded = expandedItems.includes(item.label);

            return (
              <div key={item.label}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => item.children && toggleExpand(item.label)} 
                      className={cn("w-full flex items-center gap-3 p-2.5 rounded-md transition-all", isActive ? "bg-white/5 text-white" : "text-[#94a3b8] hover:bg-white/5 hover:text-white")}
                    >
                      {item.to && !item.children ? (
                        <Link to={item.to} className="flex items-center gap-3 w-full">
                          <item.icon className="w-4 h-4" style={{ color: item.color }} />
                          {!collapsed && <span className="text-xs font-body font-medium">{item.label}</span>}
                        </Link>
                      ) : (
                        <>
                          <item.icon className="w-4 h-4" style={{ color: item.color }} />
                          {!collapsed && <span className="text-xs font-body font-medium flex-1 text-left">{item.label}</span>}
                          {!collapsed && item.children && (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipPortal>
                      <TooltipContent side="right" className="z-[9999] bg-[#0f0f12] border border-white/5 p-2 min-w-[140px] shadow-2xl">
                        <p className="text-[9px] font-pixel border-b border-white/10 pb-1.5 mb-1.5 uppercase" style={{ color: item.color }}>{item.label}</p>
                        {item.children?.map(c => <Link key={c.to} to={c.to} className="block text-[10px] py-1.5 px-1 hover:text-white text-muted-foreground transition-colors">{c.label}</Link>)}
                      </TooltipContent>
                    </TooltipPortal>
                  )}
                </Tooltip>
                {!collapsed && isExpanded && item.children && (
                  <div className="ml-9 mt-1 space-y-1 border-l border-white/10 pl-2">
                    {item.children.map(c => <Link key={c.to} to={c.to} className={cn("block py-1.5 text-[11px] transition-colors", location.pathname === c.to ? "text-white" : "text-muted-foreground hover:text-white")}>{c.label}</Link>)}
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