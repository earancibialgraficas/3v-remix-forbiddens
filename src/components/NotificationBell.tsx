import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // No mostrar la campana si ya estamos en la página de perfil (porque ahí ya están los avisos)
  const isProfilePage = location.pathname.startsWith('/perfil');

  useEffect(() => {
    if (!user) return;

    // Función para revisar si hay notificaciones sin leer
    const checkUnread = async () => {
      try {
        const { count, error } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);

        if (!error && count !== null) {
          setUnreadCount(count);
          setHasUnread(count > 0);
        }
      } catch (err) {
        console.error("Error al contar notificaciones:", err);
      }
    };

    checkUnread();

    // Nos suscribimos a cambios en tiempo real para que la campana se actualice sola
    const channel = supabase.channel('bell-notifs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          checkUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user || isProfilePage) return null;

  // Al hacer clic en la campana, vamos a la pestaña de Avisos del perfil
  const handleClick = () => {
    navigate('/perfil?tab=avisos');
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative p-2 rounded-full transition-all duration-300 group hover:bg-white/10",
        hasUnread ? "text-neon-cyan" : "text-muted-foreground"
      )}
      title={hasUnread ? `Tienes ${unreadCount} avisos nuevos` : "Avisos"}
    >
      <Bell className={cn("w-5 h-5", hasUnread && "animate-[wiggle_1s_ease-in-out_infinite]")} />
      
      {/* El puntito rojo de alerta */}
      {hasUnread && (
        <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive border border-black"></span>
        </span>
      )}
    </button>
  );
}