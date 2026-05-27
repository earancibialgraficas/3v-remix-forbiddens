import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function GlobalAds() {
  const { user, profile, roles, isAdmin, isMasterWeb, loading, isReady } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const purgeAds = () => {
    document.getElementById("adsterra-global-script")?.remove();
    document
      .querySelectorAll(
        [
          'iframe[src*="profitablecpmratenetwork"]',
          'iframe[src*="adsterra"]',
          'script[src*="profitablecpmratenetwork"]',
          'script[src*="adsterra"]',
          '[id^="atOptions"]',
        ].join(","),
      )
      .forEach((el) => el.remove());
  };

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const authStillResolving = loading || !isReady || (user && !profile);
    if (authStillResolving) {
      purgeAds();
      return;
    }

    const isStaff = isAdmin || isMasterWeb || (roles || []).includes("moderator");
    const userTier = (profile?.membership_tier || "novato").toLowerCase();
    const isPremium = isStaff || userTier !== "novato";

    if (isPremium) {
      purgeAds();
      return;
    }

    if (document.getElementById("adsterra-global-script")) return;

    timeoutRef.current = setTimeout(() => {
      const script = document.createElement("script");
      script.id = "adsterra-global-script";
      script.src = "https://pl29430791.profitablecpmratenetwork.com/82/c9/02/82c902b8c7cbb51e937b4d6c95cc4d91.js";
      script.async = true;
      document.head.appendChild(script);
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [user, profile, roles, isAdmin, isMasterWeb, loading, isReady]);

  return null;
}
