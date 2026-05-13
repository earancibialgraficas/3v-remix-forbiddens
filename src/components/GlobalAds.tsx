import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function GlobalAds() {
  // 🔥 Agregamos "user" a la extracción para saber si alguien inició sesión
  const { user, profile, roles, isAdmin, isMasterWeb } = useAuth();

  useEffect(() => {
    // 🛑 SEGURO ANTI-RACE CONDITION:
    // Si hay un usuario, pero la base de datos aún no trae su "profile",
    // significa que está cargando. Nos salimos y ESPERAMOS.
    if (user && !profile) {
      return; 
    }

    // 1. Calculamos si es Staff o Premium
    const isStaff = isAdmin || isMasterWeb || (roles || []).includes("moderator");
    const userTier = profile?.membership_tier?.toLowerCase() || 'novato';
    
    // Es premium si no es 'novato' o si pertenece al Staff
    const isPremium = userTier !== 'novato' || isStaff || isAdmin || isMasterWeb;

    // Si es premium, no inyectamos la publicidad
    if (isPremium) {
      return; 
    }

    // 🔥 PREVENCIÓN DE DUPLICADOS:
    // Si por alguna razón el script ya existe en la página, no lo volvemos a poner.
    if (document.getElementById("adsterra-global-script")) {
      return;
    }

    // 2. Si definitivamente es gratuito o invitado, inyectamos el script
    const script = document.createElement("script");
    script.id = "adsterra-global-script"; // Le ponemos un ID para reconocerlo
    script.src = "https://pl29430791.profitablecpmratenetwork.com/82/c9/02/82c902b8c7cbb51e937b4d6c95cc4d91.js"; 
    script.async = true;
    
    document.head.appendChild(script);

    // Función de limpieza
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [user, profile, roles, isAdmin, isMasterWeb]); // Agregamos "user" a las dependencias

  return null; 
}