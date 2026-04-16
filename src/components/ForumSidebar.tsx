import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Gamepad2, Tv, Bike, ShoppingBag, Users, Home,
  Flame, Calendar, Star, HelpCircle, ChevronDown, ChevronRight,
  Search, User, Settings, LogOut, PanelLeftClose, PanelLeft, Mail, AlertTriangle, BookOpen, Bell
} from "lucide-react";
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
        const { count } = await supabase.from("inbox_messages").select("id", { count: "exact", head: true }).eq("receiver_id", user.id).eq("is_read", false);
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
    { label: "Salas de Juego", icon: Gamepad2, color: "text-neon-green", children: [{ label: "Emuladores", to: "/arcade/salas" }, { label: "Biblioteca", to: "/arcade/biblioteca" }] },
    { label: "Gaming & Anime", icon: Tv, color: "text-neon-cyan", children: [{ label: "Foro General", to: "/gaming-anime/foro" }] },
    { label: "Motociclismo", icon: Bike, color: "text-neon-magenta" },
    { label: "Social Hub", icon: Users, color: "text-neon-orange" },
    { label: "Trending", icon: Flame, to: "/trending", color: "text-destructive" },
    { label: "Discord", icon: Users, to: "https://discord.gg/ZHNRKVUfVF", color: "#5865F2" },
  ];

  return (
    <TooltipProvider>
      <aside className={cn("bg-card border-r border-border flex flex-col h-full transition-all duration-300", collapsed ? "w-14" : "w-60")}>
        
        {/* LOGO */}
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
               <span className="font-pixel text-[10px] tracking-widest text-center" style={{ color: '#de1839' }}>FORBIDDENS</span>
             )}
          </Link>
        </div>

        {/* BOTONES DE USUARIO (VERSIÓN BLINDADA CON ICONOS BÁSICOS) */}
        <div className={cn("p-2 border-b border-border bg-muted/5 flex flex-col gap-2", collapsed ? "items-center" : "px-3")}>
          <div className={cn("flex items-center gap-1", collapsed ? "flex-col gap-3" : "justify-between")}>
            <div className={cn("flex items-center gap-1", collapsed && "flex-col gap-3")}>
              {/* Notificaciones (Icono simple para evitar el error) */}
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link to="/notificaciones"><Bell className="w-3.5 h-3.5" /></Link>
              </Button>
              
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link to="/perfil"><User className="w-3.5 h-3.5" /></Link>
              </Button>

              <div className="relative">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link to="/mensajes"><Mail className="w-3.5 h-3.5" /></Link>
                </Button>
                {unreadMessages > 0 && <span className="absolute -top-1 -right-1 bg-destructive text-white text-[7px] font-bold h-3 w-3 flex items-center justify-center rounded-full">{unreadMessages}</span>}
              </div>

              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link to="/configuracion"><Settings className="w-3.5 h-3.5" /></Link>
              </Button>
            </div>

            {!collapsed && user && (
              <div className="flex items-center gap-1.5 ml-auto overflow-hidden">
                <span className="text-[9px] font-pixel text-neon-green truncate max-w-[50px]">
                  {profile?.display_name || "..."}
                </span>
                <button onClick={() => signOut()} className="text-muted-foreground hover:text-destructive"><LogOut className="w-3 h-3" /></button>
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

            return (
              <div key={item.label}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => hasChildren && !collapsed ? toggleExpand(item.label) : null}
                      className={cn("w-full flex items-center gap-2.5 px-2 py-1.5 rounded transition-all", isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}
                    >
                      <item.icon className={cn("w-4 h-4", item.color)} />
                      {!collapsed && <span className="font-body text-xs flex-1 text-left">{item.label}</span>}
                    </button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipPortal>
                      <TooltipContent side="right" className="bg-card border-border shadow-2xl p-2 min-w-[140px] z-[9999]">
                        <p className={cn("text-[9px] font-pixel uppercase", item.color)}>{item.label}</p>
                      </TooltipContent>
                    </TooltipPortal>
                  )}
                </Tooltip>
              </div>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}