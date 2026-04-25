import { useState, useEffect, useRef } from "react";
import { Bell, UserPlus, Heart, MessageCircle, Users, Star, Trophy, X, Trash2 } from "lucide-react";
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    try {
      const [notifsRes, requestsRes] = await Promise.all([
         supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
         supabase.from("friend_requests").select("id, sender_id, created_at, status").eq("receiver_id", user.id).neq("status", "accepted")
      ]);

      let combined: any[] = [];
      if (notifsRes.data) {
         combined = [...notifsRes.data];
      }

      if (requestsRes.data && requestsRes.data.length > 0) {
         // 🔥 ELIMINAMOS SOLICITUDES DUPLICADAS AGRUPANDO POR SENDER 🔥
         const uniqueSenders = Array.from(new Set(requestsRes.data.map(r => r.sender_id))).filter(Boolean) as string[];
         if (uniqueSenders.length > 0) {
             const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", uniqueSenders);
             
             const reqNotifs = uniqueSenders.map(senderId => {
                const r = requestsRes.data.find(req => req.sender_id === senderId);
                return {
                  id: `req_${r.id}`,
                  type: 'friend_request',
                  title: 'Nueva solicitud de amistad',
                  body: `${profs?.find(p => p.user_id === senderId)?.display_name || 'Alguien'} quiere ser tu amigo.`,
                  created_at: r.created_at,
                  is_read: false,
                  is_request: true,
                  related_id: senderId
                };
             });
             combined = [...combined, ...reqNotifs];
         }
      }

      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(combined);
      setUnread(combined.filter((n: any) => !n.is_read).length);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    if (user?.id) fetchNotifications();
    if (!user?.id) return;
    
    const channel1 = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();
      
    const channel2 = supabase
      .channel("friend-req-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests", filter: `receiver_id=eq.${user.id}` }, () => fetchNotifications())
      .subscribe();

    return () => { 
      supabase.removeChannel(channel1); 
      supabase.removeChannel(channel2); 
    };
  }, [user?.id]);

  const handleMarkAsRead = async (id: string, is_request?: boolean) => {
    if (!user?.id || is_request) return; 
    try {
      await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnread(prev => Math.max(0, prev - 1));
    } catch(e) {}
  };

  const clearAllNotifications = async () => {
    if (!user?.id) return;
    if (!confirm("¿Borrar todo tu historial de notificaciones?")) return;
    try {
      await supabase.from("notifications").delete().eq("user_id", user.id);
      fetchNotifications();
    } catch(e) {}
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

  if (isMobile) {
    return (
      <Link 
        to="/perfil?tab=avisos"
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

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
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
        <div className="absolute right-0 md:-right-4 mt-2 w-[320px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 z-[9999]">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between bg-muted/30">
            <span className="font-pixel text-[10px] text-neon-cyan tracking-wider">NOTIFICACIONES</span>
            <div className="flex items-center gap-2">
              <button onClick={clearAllNotifications} className="text-[9px] text-destructive hover:text-destructive/80 uppercase font-pixel tracking-tighter flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Limpiar
              </button>
              <button onClick={() => setOpen(false)} className="p-0.5 rounded-full hover:bg-muted transition-colors"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
            </div>
          </div>
          <div className="max-h-[350px] overflow-y-auto retro-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground font-body text-xs">Todo al día 🎉</div>
            ) : (
              notifications.map((n) => {
                const c = typeConfig[n.type] || typeConfig.general;
                return (
                  <Link 
                    key={n.id} 
                    to={n.is_request ? "/perfil?tab=avisos" : (n.related_id ? `/usuario/${n.related_id}` : "/perfil?tab=avisos")}
                    onClick={() => { handleMarkAsRead(n.id, n.is_request); setOpen(false); }}
                    className={cn("flex gap-3 px-4 py-3 border-b border-border/20 last:border-0 hover:bg-muted/30 text-left cursor-pointer transition-colors block", !n.is_read && "bg-primary/5")}
                  >
                    <div className={cn("shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs mt-0.5", c.color)}>{c.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-body font-medium text-foreground leading-snug">{n.title}</p>
                      <p className="text-[10px] font-body text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded">{timeAgo(n.created_at)}</span>
                        {n.is_request && <span className="text-[9px] text-neon-cyan font-bold bg-neon-cyan/10 px-1.5 py-0.5 rounded">Revisar</span>}
                        {!n.is_read && !n.is_request && <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan ml-auto" />}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}