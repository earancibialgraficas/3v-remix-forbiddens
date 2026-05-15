import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function GlobalAds() {
  const { user, profile, roles, isAdmin, isMasterWeb } = useAuth();
  
  // Usamos un Ref para guardar nuestro temporizador y poder cancelarlo
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🧹 Limpieza profunda de Adsterra ya inyectado
  const purgeAds = () => {
    document.getElementById("adsterra-global-script")?.remove();
    // Adsterra suele inyectar iframes y divs sueltos en el body
    document.querySelectorAll('iframe[src*="profitablecpmratenetwork"], iframe[src*="adsterra"]').forEach((el) => el.remove());
    document.querySelectorAll('script[src*="profitablecpmratenetwork"]').forEach((el) => el.remove());
    document.querySelectorAll('[id^="atOptions"]').forEach((el) => el.remove());
  };

  useEffect(() => {
    // 1. Calculamos si es Staff o Premium
    const isStaff = isAdmin || isMasterWeb || (roles || []).includes("moderator");
    const userTier = profile?.membership_tier?.toLowerCase() || 'novato';
    
    const isPremium = userTier !== 'novato' || isStaff || isAdmin || isMasterWeb;

    // 🛑 Si es premium, cancelamos cualquier intento + limpiamos ads ya inyectados
    if (isPremium) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      purgeAds();
      return; 
    }

    // 🛑 Si hay usuario pero no hay perfil, la base de datos sigue cargando. Esperamos.
    if (user && !profile) {
      return; 
    }

    // 🛑 Si ya existe el script en el código, no hacemos nada para evitar duplicados
    if (document.getElementById("adsterra-global-script")) {
      return;
    }

    // 🔥 LA MAGIA: Esperamos 2 segundos antes de inyectar la publicidad.
    // Esto le da tiempo a Supabase de leer la sesión y avisarnos si el usuario es VIP.
    timeoutRef.current = setTimeout(() => {
      const script = document.createElement("script");
      script.id = "adsterra-global-script";
      script.src = "https://pl29430791.profitablecpmratenetwork.com/82/c9/02/82c902b8c7cbb51e937b4d6c95cc4d91.js"; 
      script.async = true;
      
      document.head.appendChild(script);
    }, 2000); // 2000 milisegundos = 2 segundos de gracia

    // Función de limpieza: si el componente se actualiza antes de los 2 segundos, se cancela la inyección
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user, profile, roles, isAdmin, isMasterWeb]);

  return null; 
}