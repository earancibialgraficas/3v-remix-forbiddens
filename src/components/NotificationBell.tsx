import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Position dropdown relative to trigger button using a portal
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const ddWidth = 320;
    let left = rect.right - ddWidth;
    if (left < 8) left = 8;
    if (left + ddWidth > window.innerWidth - 8) left = window.innerWidth - ddWidth - 8;
    setDropdownPos({ top: rect.bottom + 8, left });
  }, [open]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    fetchNotifications();
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "ahora";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  if (!user) return null;

  const cfg = (type: string) => typeConfig[type] || typeConfig.general;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative p-1.5 rounded-full hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[8px] flex items-center justify-center font-bold animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={dropdownRef}
          className="fixed w-80 max-w-[calc(100vw-16px)] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
          style={{ zIndex: 100000, top: dropdownPos.top, left: dropdownPos.left, maxHeight: 'min(400px, calc(100vh - 80px))' }}
        >
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
            <span className="font-pixel text-[10px] text-neon-cyan tracking-wider">NOTIFICACIONES</span>
            <button onClick={() => setOpen(false)} className="p-0.5 rounded-full hover:bg-muted transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground font-body font-medium">Todo al día 🎉</p>
                <p className="text-[10px] text-muted-foreground/60 font-body mt-1">No tienes notificaciones nuevas</p>
              </div>
            ) : (
              notifications.map((n) => {
                const c = cfg(n.type);
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0",
                      !n.is_read && "bg-primary/5"
                    )}
                  >
                    <div className={cn("flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center", c.color)}>
                      {c.icon}
                    </div>
                    <div className="flex-1 min-w-0">
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
                    {!n.is_read && (
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
