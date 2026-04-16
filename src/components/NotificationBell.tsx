import { useState, useEffect, useRef } from "react";
import { Bell, UserPlus, Heart, MessageCircle, Users, Star, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: false })
        .limit(10);
      if (data) {
        setNotifications(data);
        setUnread(data.filter((n: any) => !n.is_read).length);
      }
    } catch (e) { console.error("Error notifications:", e); }
  };

  useEffect(() => {
    fetchNotifications();
    if (!user?.id) return;
    const channel = supabase.channel("notifications-bell")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => { setOpen(!open); if (!open) supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false).then(() => fetchNotifications()); }}
        className="relative p-1.5 rounded-full hover:bg-muted/50 transition-all active:scale-95"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-destructive text-white text-[7px] flex items-center justify-center font-bold animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div 
          ref={dropdownRef}
          className="absolute left-0 mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-[1000] overflow-hidden animate-in fade-in slide-in-from-top-2"
        >
          <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-muted/20">
            <span className="font-pixel text-[9px] text-neon-cyan uppercase">Notificaciones</span>
            <X className="w-3 h-3 cursor-pointer text-muted-foreground" onClick={() => setOpen(false)} />
          </div>
          <div className="max-h-60 overflow-y-auto retro-scrollbar">
            {notifications.length === 0 ? (
              <p className="p-4 text-[10px] text-center text-muted-foreground font-body">Todo al día 🎉</p>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={cn("flex gap-2 p-3 border-b border-border/20 last:border-0 hover:bg-muted/10", !n.is_read && "bg-primary/5")}>
                  <div className={cn("shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center", typeConfig[n.type]?.color)}>
                    {typeConfig[n.type]?.icon || typeConfig.general.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-foreground leading-tight">{n.title}</p>
                    <p className="text-[9px] text-muted-foreground line-clamp-2">{n.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}