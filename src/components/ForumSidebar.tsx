import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Gamepad2, Tv, Bike, ShoppingBag, Users, Home,
  Flame, Calendar, Star, HelpCircle, ChevronDown, ChevronRight,
  BookOpen, LogOut,
  PanelLeftClose, PanelLeft, AlertTriangle
} from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { getNameStyle } from "@/lib/profileAppearance";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
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
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  return (
    <TooltipProvider>
      {showLogoutModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg p-5 max-w-sm w-full text-center space-y-4">
            <h3 className="font-pixel text-[9px] uppercase">¿CERRAR SESIÓN?</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLogoutModal(false)} className="flex-1 text-[8px] h-7">NO</Button>
              <Button variant="destructive" onClick={async () => { await signOut(); setShowLogoutModal(false); }} className="flex-1 text-[8px] h-7">SÍ</Button>
            </div>
          </div>
        </div>
      )}

      <aside className={cn("bg-card border-r border-border flex flex-col h-full transition-all duration-300", collapsed ? "w-14" : "w-60")}>

        {/* LOGO */}
        <div className="flex flex-col items-center py-5 px-2 border-b border-border gap-3">
          <button onClick={onToggle} className="p-1.5 hover:bg-muted/50">
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <Link to="/" className="flex flex-col items-center">
            {collapsed ? (
              <div className="flex flex-col items-center gap-[1px]">
                {"FORBIDDENS".split("").map((l, i) => (
                  <span key={i} className="text-[8px]" style={{ color: '#de1839' }}>{l}</span>
                ))}
              </div>
            ) : (
              <span className="text-[10px]" style={{ color: '#de1839' }}>FORBIDDENS</span>
            )}
          </Link>
        </div>

        {/* PROFILE + BOTONES (FIX REAL) */}
        {!collapsed && (
          <div className="p-3 border-b border-border flex items-center justify-between gap-2 bg-muted/5">

            {/* 👤 NOMBRE */}
            <span
              className="text-[9px] truncate max-w-[90px]"
              style={profile?.color_name ? getNameStyle(profile.color_name) : {}}
            >
              {profile?.display_name || "Cargando..."}
            </span>

            {/* 🔘 BOTONES SIEMPRE VISIBLES */}
            <div className="flex items-center gap-2">

              <NotificationBell user={user} />

              <button
                onClick={() => setShowLogoutModal(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* NAV */}
        <nav className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.to
              ? location.pathname === item.to
              : item.children?.some(c => location.pathname === c.to);

            const isExpanded = expandedItems.includes(item.label);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.label}>
                <button
                  onClick={() => hasChildren && toggleExpand(item.label)}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded",
                    isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50")}
                >
                  <item.icon className={cn("w-4 h-4", item.color)} />
                  <span className="text-xs flex-1 text-left">{item.label}</span>
                  {hasChildren && (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
                </button>

                {hasChildren && isExpanded && (
                  <div className="ml-7 mt-0.5 border-l pl-2">
                    {item.children!.map((child) => (
                      <Link key={child.to} to={child.to} className="block py-1 text-[11px]">
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