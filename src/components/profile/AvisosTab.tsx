import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Trash2, UserPlus, Heart, MessageSquare, Users, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAvatarBorderStyle, getNameStyle } from "@/lib/profileAppearance";

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  friend_request: { icon: <UserPlus className="w-3.5 h-3.5" />, color: "text-neon-cyan" },
  friend_accepted: { icon: <UserPlus className="w-3.5 h-3.5" />, color: "text-neon-green" },
  follow: { icon: <Heart className="w-3.5 h-3.5" />, color: "text-neon-magenta" },
  comment: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: "text-neon-green" },
  mention: { icon: <Users className="w-3.5 h-3.5" />, color: "text-neon-orange" },
  achievement: { icon: <Trophy className="w-3.5 h-3.5" />, color: "text-neon-yellow" },
  general: { icon: <Star className="w-3.5 h-3.5" />, color: "text-muted-foreground" },
};

export default function AvisosTab({ notifications, pendingRequests, handleMarkAsRead, handleClearNotifications, handleAcceptRequest, handleRejectRequest }: any) {
  return (
    <div className="bg-card border border-border rounded p-4 animate-in fade-in">
      <div className="flex justify-between items-center mb-3">
         <h3 className="font-pixel text-[10px] text-muted-foreground uppercase">MIS AVISOS ({(notifications || []).length + (pendingRequests || []).length})</h3>
         <Button variant="outline" size="sm" onClick={handleClearNotifications} className="h-6 text-[9px] gap-1 px-2 border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3 h-3" /> Limpiar Historial
         </Button>
      </div>

      {(pendingRequests || []).length > 0 && (
        <div className="mb-4 space-y-2 border-b border-border/50 pb-4">
          <h4 className="font-pixel text-[9px] text-neon-cyan uppercase">Solicitudes de amistad pendientes</h4>
          {pendingRequests.map((req: any) => (
            <div key={req.id} className="flex gap-3 p-3 border rounded bg-primary/10 border-primary/30 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted overflow-hidden border border-border/50 shrink-0" style={getAvatarBorderStyle(req.profile?.color_avatar_border)}>
                  {req.profile?.avatar_url ? <img src={req.profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-full h-full text-muted-foreground p-1.5" />}
                </div>
                <div className="flex flex-col">
                  <Link to={`/usuario/${req.sender_id}`} className="text-xs font-body font-bold hover:underline transition-colors" style={getNameStyle(req.profile?.color_name)}>{req.profile?.display_name || "Usuario"}</Link>
                  <span className="text-[9px] text-muted-foreground font-body">Quiere ser tu amigo</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" onClick={() => handleAcceptRequest(req.id, req.sender_id, req.profile?.display_name || "Usuario")} className="h-6 text-[9px] px-2 bg-neon-green text-black hover:bg-neon-green/80 font-pixel">Aceptar</Button>
                <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(req.id, req.sender_id, req.profile?.display_name || "Usuario")} className="h-6 text-[9px] px-2 font-pixel">Rechazar</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {notifications.length === 0 && pendingRequests.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body text-center md:text-left py-4">No tienes avisos recientes</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif: any) => {
            const c = typeConfig[notif.type] || typeConfig.general;
            return (
              <div key={notif.id} onClick={() => handleMarkAsRead(notif.id)} className={cn("flex gap-3 p-3 border rounded hover:bg-muted/30 transition-colors text-left cursor-pointer", notif.is_read ? "border-border/50" : "bg-primary/5 border-primary/30")}>
                <div className={cn("shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs", c.color)}>{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-body font-medium text-foreground leading-snug">{notif.title}</p>
                  <p className="text-[10px] font-body text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-muted-foreground/70">{new Date(notif.created_at).toLocaleString("es", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    {notif.type === "friend_request" && notif.related_id && <Link to={`/usuario/${notif.related_id}`} onClick={() => handleMarkAsRead(notif.id)} className="text-[9px] text-primary hover:underline font-body">Ver perfil</Link>}
                    {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan ml-auto" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}