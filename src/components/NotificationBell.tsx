import { useState, useEffect, useRef } from "react";
import { Bell, UserPlus, Heart, MessageCircle, Users, Star, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  friend_request: { icon: <UserPlus className="w-3.5 h-3.5" />, color: "text-neon-cyan" },
  friend_accepted: { icon: <UserPlus className="w-3.5 h-3.5" />, color: "text-neon-green" },
  follow: { icon: <Heart className="w-3.5 h-3.5" />, color: "text-neon-magenta" },
  comment: { icon: <MessageCircle className="w-3.5 h-3.5" />, color: "text-neon-green" },
  mention: { icon: <Users className="w-3.5 h-3.5" />, color: "text-neon-orange" },
  achievement: { icon: <Trophy className="w-3.5 h-3.5" />, color: "text-neon-yellow" },
  general: { icon: <Star className="w-3.5 h-3.5" />, color: "text-muted-foreground" },
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 🔥 Usamos tu hook para saber si estamos en celular
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data);
      setUnread(data.filter((n: any) => !n.is_read).length);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (!user) return;
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isMobile]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    fetchNotifications();
  };

  // 🔥 Lógica híbrida: Navegar en Móvil / Desplegar en PC
  const handleBellClick = () => {
    if (isMobile) {
      markAllRead();
      navigate("/notificaciones"); // Vamos directo a la página
    } else {
      setOpen(!open); // Abrimos el menú flotante
      if (!open) markAllRead();
    }
  };

  const timeAgo = (date: string) => {
    if (!date) return "ahora";
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  if (!user) return null;
  const cfg = (type: string) => typeConfig[type] || typeConfig.general;

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        onClick={handleBellClick}
        className="relative p-1.5 rounded-full hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center font-bold animate-pulse shadow-sm">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* 🔥 SOLO SE RENDERIZA EL DESPLEGABLE SI NO ES MÓVIL */}
      {open && !isMobile && (
        <div
          ref={dropdownRef}
          className="absolute left-0 md:left-auto md:right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-[9999]"
          style={{ maxHeight: '400px' }}
        >
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
            <span className="font-pixel text-[10px] text-neon-cyan tracking-wider">NOTIFICACIONES</span>
            <button onClick={() => setOpen(false)} className="p-0.5 rounded-full hover:bg-muted transition-colors"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
          <div className="max-h-80 overflow-y-auto retro-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground font-body text-xs">Todo al día 🎉</div>
            ) : (
              notifications.map((n) => {
                const c = cfg(n.type);
                return (
                  <div key={n.id} className={cn("flex gap-3 px-4 py-3 border-b border-border/20 last:border-0 hover:bg-muted/30", !n.is_read && "bg-primary/5")}>
                    <div className={cn("shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center", c.color)}>{c.icon}</div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-body font-medium text-foreground leading-snug">{n.title}</p>
                      <p className="text-[10px] font-body text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-muted-foreground/70">{timeAgo(n.created_at)}</span>
                        {n.type === "friend_request" && n.related_id && (
                          <Link to={`/usuario/${n.related_id}`} onClick={() => setOpen(false)} className="text-[9px] text-primary hover:underline">Ver perfil</Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}