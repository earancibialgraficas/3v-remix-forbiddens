import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Gamepad2, Tv, Bike, ShoppingBag, Users, Home,
  Flame, Calendar, Star, HelpCircle, ChevronDown, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  color: string;
  children?: { label: string; to: string }[];
}

const navItems: NavItem[] = [
  { label: "Inicio", icon: Home, to: "/", color: "text-foreground" },
  {
    label: "Zona Arcade", icon: Gamepad2, to: "/arcade", color: "text-neon-green",
    children: [
      { label: "Salas de Juego", to: "/arcade/salas" },
      { label: "Biblioteca", to: "/arcade/biblioteca" },
      { label: "Leaderboards", to: "/arcade/leaderboards" },
    ],
  },
  {
    label: "Gaming & Anime", icon: Tv, to: "/gaming-anime", color: "text-neon-cyan",
    children: [
      { label: "Foro General", to: "/gaming-anime/foro" },
      { label: "Anime & Manga", to: "/gaming-anime/anime" },
      { label: "Rincón del Creador", to: "/gaming-anime/creador" },
    ],
  },
  {
    label: "Motociclismo", icon: Bike, to: "/motociclismo", color: "text-neon-magenta",
    children: [
      { label: "Foro de Riders", to: "/motociclismo/riders" },
      { label: "Taller & Mecánica", to: "/motociclismo/taller" },
      { label: "Rutas & Quedadas", to: "/motociclismo/rutas" },
    ],
  },
  {
    label: "Mercado & Trueque", icon: ShoppingBag, to: "/mercado", color: "text-neon-yellow",
    children: [
      { label: "Gaming", to: "/mercado/gaming" },
      { label: "Motor", to: "/mercado/motor" },
    ],
  },
  {
    label: "Social Hub", icon: Users, to: "/social", color: "text-neon-orange",
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
  const [expandedItems, setExpandedItems] = useState<string[]>(["Zona Arcade"]);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  return (
    <aside
      className={cn(
        "sticky top-12 h-[calc(100vh-3rem)] bg-card border-r border-border overflow-y-auto transition-all duration-300 shrink-0",
        collapsed ? "w-12" : "w-56"
      )}
    >
      <nav className="px-1 py-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          const isExpanded = expandedItems.includes(item.label);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.label}>
              <div className="flex items-center">
                <Link
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded text-sm font-body transition-all duration-200 flex-1 min-w-0",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 shrink-0", item.color)} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
                {!collapsed && hasChildren && (
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>

              <div
                className={cn(
                  "ml-6 space-y-0.5 overflow-hidden transition-all duration-300",
                  !collapsed && hasChildren && isExpanded ? "max-h-40 mt-0.5 opacity-100" : "max-h-0 opacity-0"
                )}
              >
                {hasChildren && item.children!.map((child) => (
                  <Link
                    key={child.to}
                    to={child.to}
                    className={cn(
                      "block px-2 py-1 rounded text-xs font-body transition-all duration-200",
                      location.pathname === child.to
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
  );
}
