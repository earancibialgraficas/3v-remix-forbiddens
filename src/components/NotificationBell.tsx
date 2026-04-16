import { useState, useEffect } from "react";
import { Bell, UserPlus, Heart, MessageCircle, Users, Star, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
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
  const isMobile = useIsMobile();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
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
    if (!user?.id) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    setUnread(0);
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

  // --- VISTA PARA MÓVIL (Simple Link, Cero JS complejo) ---
  if (isMobile) {
    return (
      <Link 
        to="/notificaciones" 
        onClick={markAllRead}
        className="relative flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center font-bold animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    );
  }

  // --- VISTA PARA PC (Con Desplegable) ---
  return (
    <div className="relative inline-block">
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-white text-[8px] flex items-center justify-center font-bold animate-pulse shadow-sm">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-[9999]">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
            <span className="font-pixel text-[10px] text-neon-cyan tracking-wider">NOTIFICACIONES</span>
            <button onClick={() => setOpen(false)} className="p-0.5 rounded-full hover:bg-muted transition-colors"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
          </div>
          <div className="max-h-80 overflow-y-auto retro-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground font-body text-xs">Todo al día 🎉</div>
            ) : (
              notifications.map((n) => {
                const c = typeConfig[n.type] || typeConfig.general;
                return (
                  <div key={n.id} className={cn("flex gap-3 px-4 py-3 border-b border-border/20 last:border-0 hover:bg-muted/30 text-left", !n.is_read && "bg-primary/5")}>
                    <div className={cn("shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs", c.color)}>{c.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-body font-medium text-foreground leading-snug">{n.title}</p>
                      <p className="text-[10px] font-body text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-muted-foreground/70">{timeAgo(n.created_at)}</span>
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