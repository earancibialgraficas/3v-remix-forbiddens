import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Gamepad2, Tv, Bike, ShoppingBag, Users, Home,
  Flame, Calendar, Star, HelpCircle, ChevronDown, ChevronRight,
  Search, User, Settings, LogOut, PanelLeftClose, PanelLeft, Mail, AlertTriangle, BookOpen, Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
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

  // Consulta simplificada para evitar bloqueos
  useEffect(() => {
    if (!user?.id) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("inbox_messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("is_read", false);
      setUnreadMessages(count || 0);
    };
    fetchUnread();
  }, [user?.id]);

  const navItems = [
    { label: "Inicio", icon: Home, to: "/", color: "text-foreground" },
    { label: "Salas de Juego", icon: Gamepad2, color: "text-neon-green", children: [{ label: "Emuladores", to: "/arcade/salas" }, { label: "Biblioteca", to: "/arcade/biblioteca" }] },
    { label: "Gaming & Anime", icon: Tv, color: "text-neon-cyan", children: [{ label: "Foro General", to: "/gaming-anime/foro" }] },
    { label: "Motociclismo", icon: Bike, color: "text-neon-magenta" },
    { label: "Trending", icon: Flame, to: "/trending", color: "text-destructive" },
    { label: "Discord", icon: Users, to: "https://discord.gg/ZHNRKVUfVF", color: "#5865F2" },
  ];

  return (
    <TooltipProvider>
      <aside className={cn("bg-card border-r border-border flex flex-col h-full transition-all duration-300 relative z-50", collapsed ? "w-14" : "w-60")}>
        
        <div className="flex flex-col items-center py-5 px-2 border-b border-border gap-3 shrink-0">
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground">
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <Link to="/" className="font-pixel text-[10px] tracking-widest text-[#de1839]">
            {collapsed ? "F" : "FORBIDDENS"}
          </Link>
        </div>

        {/* BOTONES DE USUARIO - SIN DEPENDENCIAS EXTERNAS */}
        <div className={cn("flex flex-col border-b border-border bg-muted/5 p-2 gap-3", collapsed ? "items-center" : "px-3")}>
          <div className={cn("flex items-center w-full gap-1", collapsed ? "flex-col gap-4" : "justify-between")}>
            <div className={cn("flex items-center gap-1", collapsed && "flex-col gap-4")}>
              
              {/* Botón de Notificaciones (Básico) */}
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link to="/notificaciones"><Bell className="w-4 h-4" /></Link>
              </Button>
              
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link to="/perfil"><User className="w-4 h-4" /></Link>
              </Button>

              <div className="relative">
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <Link to="/mensajes"><Mail className="w-4 h-4" /></Link>
                </Button>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-white text-[7px] font-bold h-3 w-3 flex items-center justify-center rounded-full">
                    {unreadMessages}
                  </span>
                )}
              </div>

              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link to="/configuracion"><Settings className="w-4 h-4" /></Link>
              </Button>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {navItems.map((item) => (
            <Tooltip key={item.label} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link 
                  to={item.to || "#"} 
                  className={cn(
                    "flex items-center gap-3 p-2 rounded transition-all", 
                    location.pathname === item.to ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-muted/50",
                    collapsed && "justify-center"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", item.color)} />
                  {!collapsed && <span className="text-xs">{item.label}</span>}
                </Link>
              </TooltipTrigger>
              {collapsed && (
                <TooltipPortal>
                  <TooltipContent side="right" className="z-[9999] bg-card border-border p-2">
                    {item.label}
                  </TooltipContent>
                </TooltipPortal>
              )}
            </Tooltip>
          ))}
        </nav>
      </aside>
    </TooltipProvider>
  );
}