import { useState, useEffect, useRef } from "react";
import { Bell, UserPlus, Heart, MessageCircle, Users, Star, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
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
    } catch (e) {
      console.warn("Error cargando notificaciones", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    if (!user?.id) return;
    const channel = supabase
      .channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    if (!user?.id) return;
    try {
      await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
      fetchNotifications();
    } catch (e) {
      console.warn("Error actualizando notificaciones", e);
    }
  };

  // Función de tiempo protegida contra datos nulos
  const timeAgo = (date: string) => {
    if (!date) return "ahora";
    try {
      const diff = Date.now() - new Date(date).getTime();
      if (isNaN(diff)) return "ahora";
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return "ahora";
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h`;
      return `${Math.floor(hrs / 24)}d`;
    } catch {
      return "ahora";
    }
  };

  if (!user) return null;
  const cfg = (type: string) => typeConfig[type] || typeConfig.general;

  return (
    <div className="relative inline-block">
      
      {/* EL BOTÓN (Ahora es un Link inteligente) */}
      <Link
        ref={triggerRef}
        to="/notificaciones"
        onClick={(e) => {
          if (window.innerWidth >= 768) {
            // En PC: Prevenimos navegar y abrimos el desplegable
            e.preventDefault(); 
            setOpen(!open);
            if (!open) markAllRead();
          } else {
            // En Móvil: Navegamos a la página sin abrir el desplegable
            markAllRead();
          }
        }}
        className="relative flex items-center justify-center p-1.5 h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center font-bold animate-pulse shadow-sm">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>

      {/* EL DESPLEGABLE (Restringido solo para PC con 'hidden md:block' y 'left-0') */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-20px)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-[9999] hidden md:block"
          style={{ maxHeight: 'min(400px, calc(100vh - 100px))' }}
        >
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
            <span className="font-pixel text-[10px] text-neon-cyan tracking-wider">NOTIFICACIONES</span>
            <button onClick={() => setOpen(false)} className="p-0.5 rounded-full hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto retro-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-body">Todo al día 🎉</p>
              </div>
            ) : (
              notifications.map((n) => {
                const c = cfg(n.type);
                return (
                  <div key={n.id} className={cn("flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0", !n.is_read && "bg-primary/5")}>
                    <div className={cn("flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs", c.color)}>
                      {c.icon}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs font-body font-medium text-foreground leading-snug">{n.title}</p>
                      <p className="text-[10px] font-body text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-muted-foreground/70 font-body">{timeAgo(n.created_at)}</span>
                        {n.type === "friend_request" && n.related_id && (
                          <Link to={`/usuario/${n.related_id}`} onClick={() => setOpen(false)} className="text-[9px] text-primary hover:underline font-body">
                            Ver perfil
                          </Link>
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