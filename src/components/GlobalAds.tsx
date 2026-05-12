import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function GlobalAds() {
  // Extraemos solo lo que tu useAuth realmente devuelve
  const { profile, roles, isAdmin, isMasterWeb } = useAuth();

  useEffect(() => {
    // 1. Calculamos si es Staff o Premium igual que en tus otras páginas
    const isStaff = isAdmin || isMasterWeb || (roles || []).includes("moderator");
    const userTier = profile?.membership_tier?.toLowerCase() || 'novato';
    
    // Es premium si no es 'novato' o si pertenece al Staff
    const isPremium = userTier !== 'novato' || isStaff || isAdmin || isMasterWeb;

    // Si es premium, nos salimos y no cargamos nada
    if (isPremium) {
      return; 
    }

    // 2. Si es usuario gratuito, inyectamos el script de la red de anuncios
    const script = document.createElement("script");
    
    // IMPORTANTE: Aquí debes poner la URL real que te dé tu red de anuncios
    script.src = "https://pl29430791.profitablecpmratenetwork.com/82/c9/02/82c902b8c7cbb51e937b4d6c95cc4d91.js"; 
    script.async = true;
    
    // Si tu red te pide un ID de cliente, descomenta la línea de abajo:
    // script.setAttribute("data-ad-client", "ca-pub-XXXXXXXXXXXXXXX");

    document.head.appendChild(script);

    // Función de limpieza para eliminar el script si el usuario sube de nivel 
    // o cambia de página y el componente se desmonta
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [profile, roles, isAdmin, isMasterWeb]);

  return null; 
}