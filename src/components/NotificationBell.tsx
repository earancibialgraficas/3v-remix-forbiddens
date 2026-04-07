import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
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

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true } as any).eq("user_id", user.id).eq("is_read", false);
    fetchNotifications();
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); if (!open) markAllRead(); }} className="relative p-1.5 rounded hover:bg-muted/50 transition-colors">
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[8px] flex items-center justify-center font-bold animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto animate-fade-in">
          <div className="p-2 border-b border-border flex items-center justify-between">
            <span className="font-pixel text-[9px] text-neon-cyan">NOTIFICACIONES</span>
            <button onClick={() => setOpen(false)} className="text-[9px] text-muted-foreground hover:text-foreground font-body">Cerrar</button>
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-[10px] text-muted-foreground font-body">Sin notificaciones</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={cn("p-2.5 border-b border-border/30 text-xs font-body hover:bg-muted/30 transition-colors", !n.is_read && "bg-primary/5")}>
                <p className="font-medium text-foreground">{n.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{n.body}</p>
                <p className="text-[8px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                {n.type === "friend_request" && n.related_id && (
                  <Link to={`/usuario/${n.related_id}`} className="text-[9px] text-primary hover:underline mt-1 inline-block">Ver perfil</Link>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
