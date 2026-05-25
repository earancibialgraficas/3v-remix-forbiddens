import { useState, useEffect } from "react";
import VaultHint from "@/components/VaultHint";
import { Globe, Sparkles, Hammer, Crown, Ticket, Volume2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PriceByCountry {
  [country: string]: { symbol: string; multiplier: number; currency: string };
}

const countryPricing: PriceByCountry = {
  US: { symbol: "$", multiplier: 1, currency: "USD" },
  MX: { symbol: "MX$", multiplier: 17, currency: "MXN" },
  AR: { symbol: "ARS$", multiplier: 900, currency: "ARS" },
  CL: { symbol: "CLP$", multiplier: 950, currency: "CLP" },
  CO: { symbol: "COP$", multiplier: 4000, currency: "COP" },
  PE: { symbol: "S/", multiplier: 3.7, currency: "PEN" },
  ES: { symbol: "€", multiplier: 0.92, currency: "EUR" },
  BR: { symbol: "R$", multiplier: 5, currency: "BRL" },
  GB: { symbol: "£", multiplier: 0.79, currency: "GBP" },
};

const MAKE_MEMBERSHIP_CHECKOUT_WEBHOOK = "https://hook.us2.make.com/d0btggh83pj91o020ezq18hl1yqs7td7";

const boosterText = (count: number) =>
  count > 0
    ? `${count} stack${count === 1 ? "" : "s"} semanales de puntos x3 por 7 dias`
    : "Sin potenciadores incluidos";

const tiers = [
  {
    name: "Novato", basePrice: 0, boosters: 0, color: "border-muted-foreground/30", textColor: "text-muted-foreground", isVIP: false,
    checkoutUrl: null,
    features: [
      { label: "Potenciadores x3", value: boosterText(0) },
      { label: "Emuladores", value: "3 Juegos en simultaneo" },
      { label: "Avatar/Perfil", value: "25 Avatares Pixel-Art" },
      { label: "Subir Avatar", value: "No", bad: true },
      { label: "Post en Foro", value: "Texto Plano Ilimitado" },
      { label: "Comentarios", value: "500 Caracteres Maximo" },
      { label: "Amigos", value: "Maximo 25" },
      { label: "Almacenamiento", value: "50 MB" },
      { label: "Social Hub", value: "15 Imagenes/Videos" },
      { label: "Muro Fotografico", value: "15 Fotos" },
    ],
  },
  {
    name: "Lite", basePrice: 5, boosters: 1, color: "border-neon-cyan/50", textColor: "text-neon-cyan", isVIP: false,
    checkoutUrl: "https://mpago.li/11TpqQK", 
    features: [
      { label: "Potenciadores x3", value: boosterText(1) },
      { label: "Emuladores", value: "3 Juegos en simultaneo" },
      { label: "Consolas Extra", value: "✅ N64 / PS1 / PS2" },
      { label: "Avatar/Perfil", value: "28 Avatares Pixel-Art" },
      { label: "Subir Avatar", value: "No", bad: true },
      { label: "Post en Foro", value: "Texto + Imagenes" },
      { label: "Comentarios", value: "500 Caracteres Maximo" },
      { label: "Amigos", value: "Maximo 25" },
      { label: "Almacenamiento", value: "75 MB" },
      { label: "Social Hub", value: "15 Imagenes/Videos" },
      { label: "Muro Fotografico", value: "15 Fotos" },
    ],
  },
  {
    name: "Miembro del Legado", basePrice: 18, boosters: 7, color: "border-neon-green/80", textColor: "text-neon-green", isVIP: true,
    shadow: "shadow-[0_0_20px_rgba(57,255,20,0.15)]",
    checkoutUrl: "https://mpago.li/16EaVeh", 
    features: [
      { label: "Potenciadores x3", value: boosterText(7) },
      { label: "Emuladores", value: "6 Juegos en simultaneo" },
      { label: "Consolas Extra", value: "✅ N64 / PS1 / PS2" },
      { label: "Avatar/Perfil", value: "Avatares Desbloqueados" },
      { label: "Subir Avatar", value: "Si (500x500px)" },
      { label: "Post en Foro", value: "Ilimitado - Formato Completo" },
      { label: "Comentarios", value: "2000 Caracteres Maximo" },
      { label: "Amigos", value: "Maximo 200" },
      { label: "Almacenamiento", value: "1000 MB" },
      { label: "Social Hub", value: "90 Imagenes/Videos" },
      { label: "Muro Fotografico", value: "90 Fotos" },
      { label: "Firma en posts", value: "Diseño Personalizado" },
      { label: "Badge Exclusivo", value: "🏛️ LEGADO" },
    ],
  },
  {
    name: "Creador de Contenido", basePrice: 25, boosters: 10, color: "border-neon-cyan/80", textColor: "text-neon-cyan", isVIP: true,
    shadow: "shadow-[0_0_25px_rgba(0,255,255,0.2)]",
    requirements: "Requisitos: 1000+ Seguidores y 100.000 Puntos",
    checkoutUrl: "https://mpago.li/1JWBWQb", 
    features: [
      { label: "Potenciadores x3", value: boosterText(10) },
      { label: "Emuladores", value: "10 Juegos en simultaneo" },
      { label: "Consolas Extra", value: "✅ N64 / PS1 / PS2" },
      { label: "Avatar/Perfil", value: "Avatares Desbloqueados" },
      { label: "Subir Avatar", value: "Si (500x500px)" },
      { label: "Post en Foro", value: "Todo + HTML + Embeds" },
      { label: "Comentarios", value: "5000 Caracteres Maximo" },
      { label: "Amigos", value: "Ilimitados" },
      { label: "Almacenamiento", value: "5000 MB" },
      { label: "Social Hub", value: "Ilimitado" },
      { label: "Muro Fotografico", value: "Ilimitado" },
      { label: "Firma en posts", value: "Diseño Total" },
      { label: "Badge Exclusivo", value: "🎬 CREADOR VERIFICADO" },
    ],
  },
  {
    name: "Entusiasta", basePrice: 10, boosters: 3, color: "border-neon-orange/50", textColor: "text-neon-orange", isVIP: false,
    checkoutUrl: "https://mpago.li/2wzhSPp", 
    features: [
      { label: "Potenciadores x3", value: boosterText(3) },
      { label: "Emuladores", value: "4 Juegos en simultaneo" },
      { label: "Consolas Extra", value: "✅ N64 / PS1 / PS2" },
      { label: "Avatar/Perfil", value: "55 Avatares" },
      { label: "Subir Avatar", value: "Si" },
      { label: "Post en Foro", value: "Ilimitado - Texto + Imagenes" },
      { label: "Comentarios", value: "1000 Caracteres Maximo" },
      { label: "Amigos", value: "Maximo 50" },
      { label: "Almacenamiento", value: "150 MB" },
      { label: "Social Hub", value: "30 Imagenes/Videos" },
      { label: "Muro Fotografico", value: "30 Fotos" },
    ],
  },
  {
    name: "Coleccionista", basePrice: 15, boosters: 5, color: "border-foreground/30", textColor: "text-foreground", isVIP: false,
    checkoutUrl: "https://mpago.li/2Jckx8W", 
    features: [
      { label: "Potenciadores x3", value: boosterText(5) },
      { label: "Emuladores", value: "5 Juegos en simultaneo" },
      { label: "Consolas Extra", value: "✅ N64 / PS1 / PS2" },
      { label: "Avatar/Perfil", value: "60 Avatares" },
      { label: "Subir Avatar", value: "Si (500x500px)" },
      { label: "Post en Foro", value: "Formato Completo + Multimedia" },
      { label: "Comentarios", value: "1500 Caracteres Maximo" },
      { label: "Amigos", value: "Maximo 100" },
      { label: "Almacenamiento", value: "500 MB" },
      { label: "Social Hub", value: "50 Imagenes/Videos" },
      { label: "Muro Fotografico", value: "50 Fotos" },
    ],
  },
  {
    name: "Leyenda Arcade", basePrice: 20, boosters: 9, color: "border-neon-yellow/50", textColor: "text-neon-yellow", isVIP: false,
    requirements: "Requisitos: 750+ Seguidores y 50.000 Puntos",
    checkoutUrl: "https://mpago.li/28qU5Gn", 
    features: [
      { label: "Potenciadores x3", value: boosterText(9) },
      { label: "Emuladores", value: "8 Juegos en simultaneo" },
      { label: "Consolas Extra", value: "✅ N64 / PS1 / PS2" },
      { label: "Avatar/Perfil", value: "Avatares Desbloqueados" },
      { label: "Subir Avatar", value: "Si (500x500px)" },
      { label: "Post en Foro", value: "Todo tipo de contenido" },
      { label: "Comentarios", value: "3000 Caracteres Maximo" },
      { label: "Amigos", value: "Maximo 500" },
      { label: "Almacenamiento", value: "3000 MB" },
      { label: "Social Hub", value: "100 Imagenes/Videos" },
      { label: "Muro Fotografico", value: "100 Fotos" },
      { label: "Badge Exclusivo", value: "⭐ LEYENDA ARCADE" },
    ],
  },
];

export default function MembershipsPage() {
  const [userCountry, setUserCountry] = useState("CL");
  const [loading, setLoading] = useState(true);
  const [processingTier, setProcessingTier] = useState<string | null>(null);
  const [pendingPurchaseTier, setPendingPurchaseTier] = useState<any | null>(null);
  const { user, profile, isAdmin, isMasterWeb, roles: currentRoles } = useAuth();
  const { toast } = useToast();
  
  const isUnderMaintenance = false;

  const isStaff = isAdmin || isMasterWeb || (currentRoles || []).includes("moderator");
  const currentTier = isStaff ? "staff" : (profile?.membership_tier?.toLowerCase() || "novato");

  const [userFollowers, setUserFollowers] = useState<number>((profile as any)?.follower_count || 0);
  const userPoints = profile?.total_score || 0;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", user.id)
      .then(({ count, error }) => {
        if (!error && typeof count === "number") setUserFollowers(count);
      });
  }, [user?.id]);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data.country_code && countryPricing[data.country_code]) {
          setUserCountry(data.country_code);
        }
      } catch (err) {
        console.error("Error detectando país:", err);
      } finally {
        setLoading(false);
      }
    };
    detectCountry();
  }, []);

  const pricing = countryPricing[userCountry] || countryPricing.US;
  const formatPrice = (basePrice: number) => {
    if (basePrice === 0) return "Gratuito";
    return `${pricing.symbol}${Math.round(basePrice * pricing.multiplier).toLocaleString()}/mes`;
  };

  const checkRequirements = (tierName: string) => {
    if (isStaff) return { canBuy: true, reason: "" };

    if (tierName === "Creador de Contenido") {
      const ok = userFollowers >= 1000 && userPoints >= 100000;
      return { 
        canBuy: ok, 
        reason: ok ? "" : `Faltan requisitos: 1000 seguidores y 100k puntos (Tienes ${userFollowers.toLocaleString()} seg / ${userPoints.toLocaleString()} pts)` 
      };
    }

    if (tierName === "Leyenda Arcade") {
      const ok = userFollowers >= 750 && userPoints >= 50000;
      return { 
        canBuy: ok, 
        reason: ok ? "" : `Faltan requisitos: 750 seguidores y 50k puntos (Tienes ${userFollowers.toLocaleString()} seg / ${userPoints.toLocaleString()} pts)` 
      };
    }

    return { canBuy: true, reason: "" }; 
  };

  // 🚀 NUEVA FUNCION DINAMICA DE COBRO:
  const speakPurchaseInfo = (tierName: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const text = `Antes de comprar ${tierName}, recuerda: la suscripcion es mensual. Recibiras un ticket en tu inventario, ese ticket no expira y puedes activarlo cuando quieras. Al usarlo, tu membresia quedara activa por treinta dias.`;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-CL";
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  };

  const openPurchaseInfo = (tier: any) => {
    if (processingTier) return;
    if (!user) {
      toast({
        title: "Inicia sesion",
        description: "Debes iniciar sesion para adquirir una membresia.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      alert("Debes iniciar sesiÃ³n para adquirir una membresÃ­a.");
      return;
    }

    const validation = checkRequirements(tier.name);
    if (!validation.canBuy) {
      toast({
        title: "Requisitos pendientes",
        description: validation.reason,
        variant: "destructive",
      });
      return;
    }
    if (!validation.canBuy) {
      alert(`Lo sentimos, no cumples los requisitos: ${validation.reason}`);
      return;
    }

    setPendingPurchaseTier(tier);
    speakPurchaseInfo(tier.name);
  };

  const closePurchaseInfo = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPendingPurchaseTier(null);
  };

  const handleCheckout = async (tierName: string, basePrice: number) => {
    if (processingTier) return;
    if (!user) {
      toast({
        title: "Inicia sesion",
        description: "Debes iniciar sesion para adquirir una membresia.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      alert("Debes iniciar sesión para adquirir una membresía.");
      return;
    }

    const validation = checkRequirements(tierName);
    if (!validation.canBuy) {
      toast({
        title: "Requisitos pendientes",
        description: validation.reason,
        variant: "destructive",
      });
      return;
    }
    if (!validation.canBuy) {
      alert(`Lo sentimos, no cumples los requisitos: ${validation.reason}`);
      return;
    }

    try {
      setProcessingTier(tierName);
      setPendingPurchaseTier(null);
      const selectedTier = tiers.find((tier) => tier.name.toLowerCase() === tierName.toLowerCase());
      const fallbackCheckoutUrl = selectedTier?.checkoutUrl || null;
      const calculatedPrice = Math.round(basePrice * pricing.multiplier);
      const rangoFormateado = tierName.toLowerCase();
      const { data: checkoutSession, error: checkoutError } = await (supabase as any).rpc("create_membership_checkout_session", {
        p_tier: rangoFormateado,
        p_amount: calculatedPrice,
        p_currency: pricing.currency,
      });

      if (checkoutError) throw checkoutError;
      if (!checkoutSession?.ok) {
        throw new Error(checkoutSession?.reason || "No se pudo crear la orden de membresia");
      }

      // Envia los datos a tu Fabrica en Make.com
      const response = await fetch(MAKE_MEMBERSHIP_CHECKOUT_WEBHOOK, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create_membership_checkout",
          checkout_id: checkoutSession.checkout_id,
          external_reference: checkoutSession.external_reference,
          user_id: checkoutSession.user_id,
          rango: checkoutSession.tier,
          tier_label: checkoutSession.tier_label,
          precio: checkoutSession.amount,
          currency: checkoutSession.currency,
          site_url: window.location.origin,
          success_url: `${window.location.origin}/membresias?payment=success`,
          pending_url: `${window.location.origin}/membresias?payment=pending`,
          failure_url: `${window.location.origin}/membresias?payment=failure`,
        }),
      });

      const rawResponse = await response.text();
      if (!response.ok) {
        throw new Error(`Make respondio ${response.status}: ${rawResponse || "sin detalle"}`);
      }

      let data: any = {};
      try {
        data = rawResponse.trim() ? JSON.parse(rawResponse) : {};
      } catch {
        if (fallbackCheckoutUrl) {
          console.warn("Make no devolvio JSON valido, usando checkout directo:", rawResponse);
          toast({
            title: "Abriendo checkout",
            description: "La pasarela confirmo la solicitud. Te llevamos al pago seguro.",
          });
          window.location.href = fallbackCheckoutUrl;
          return;
        }
        throw new Error("La pasarela recibio la solicitud, pero no entrego el link de pago. Intenta otra vez en unos segundos.");
      }
      
      // Si Make nos devuelve el link, enviamos al usuario
      const paymentUrl = data?.init_point || data?.sandbox_init_point || data?.payment_url || data?.url;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else if (fallbackCheckoutUrl) {
        console.warn("Make no devolvio init_point, usando checkout directo:", rawResponse);
        toast({
          title: "Abriendo checkout",
          description: "Te llevamos al pago seguro de esta membresia.",
        });
        window.location.href = fallbackCheckoutUrl;
      } else {
        throw new Error("La pasarela no entrego el link de pago. Intenta otra vez en unos segundos.");
      }
    } catch (error) {
      console.error("Error en checkout:", error);
      const message = error instanceof Error ? error.message : "Error desconocido";
      toast({
        title: "No se pudo generar el pago",
        description: message,
        variant: "destructive",
      });
    } finally {
      setProcessingTier(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 px-2 sm:px-6 w-full max-w-none">
      {pendingPurchaseTier && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-xl border-2 border-neon-cyan/50 bg-[#101018] p-5 shadow-2xl shadow-neon-cyan/20">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-yellow" />
            <button onClick={closePurchaseInfo} className="absolute right-3 top-3 rounded border border-border bg-black/30 p-1.5 text-muted-foreground hover:text-white">
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-start gap-3 pr-8">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-neon-yellow/50 bg-neon-yellow/10 text-neon-yellow shadow-[0_0_18px_rgba(250,204,21,0.18)]">
                <Ticket className="h-6 w-6" />
              </div>
              <div>
                <p className="font-pixel text-[11px] uppercase text-neon-cyan">Antes de comprar</p>
                <h2 className="mt-1 font-pixel text-sm uppercase text-foreground">{pendingPurchaseTier.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Tu compra genera un ticket de membresia en el inventario. Ese ticket no tiene fecha de expiracion: puedes guardarlo, comerciarlo o activarlo cuando quieras con click derecho. Al usarlo, la membresia queda activa por 30 dias y recibes los potenciadores incluidos en el plan.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 rounded-lg border border-neon-magenta/25 bg-neon-magenta/10 p-3 text-xs text-foreground sm:grid-cols-3">
              <div className="flex items-center gap-2"><Crown className="h-4 w-4 text-neon-magenta" /> 30 dias activos</div>
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-neon-yellow" /> {boosterText(pendingPurchaseTier.boosters)}</div>
              <button type="button" onClick={() => speakPurchaseInfo(pendingPurchaseTier.name)} className="flex items-center gap-2 text-left text-neon-cyan hover:text-white">
                <Volume2 className="h-4 w-4" /> Repetir voz
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={closePurchaseInfo} className="h-10 text-xs">Cancelar</Button>
              <Button onClick={() => handleCheckout(pendingPurchaseTier.name, pendingPurchaseTier.basePrice)} disabled={processingTier === pendingPurchaseTier.name} className="h-10 bg-neon-green text-black hover:bg-neon-cyan">
                {processingTier === pendingPurchaseTier.name ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar al pago"}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header adaptable */}
      <div className="text-center space-y-3 pt-4">
        <h1 className="font-pixel text-xl sm:text-4xl text-neon-yellow uppercase tracking-tighter">⭐ <VaultHint letter="M" position={3} color="text-neon-magenta" />embresías</h1>
        <p className="text-[10px] sm:text-base text-muted-foreground font-body max-w-3xl mx-auto leading-relaxed mb-4">
          Elige el plan que mejor se adapte a tu estilo. Todos los planes incluyen navegación libre de publicidad.
        </p>

        <div className="flex items-center justify-center gap-2 mt-4 bg-card/40 border border-border/50 w-fit mx-auto px-4 py-2 rounded-full backdrop-blur-md">
          <Globe className="w-4 h-4 text-neon-cyan" />
          <select 
            value={userCountry} 
            onChange={e => setUserCountry(e.target.value)} 
            className="bg-transparent outline-none border-none text-[11px] font-pixel text-foreground uppercase cursor-pointer"
          >
            {Object.keys(countryPricing).map(code => <option key={code} value={code} className="bg-background">{code}</option>)}
          </select>
          <span className="text-[10px] text-muted-foreground font-body uppercase tracking-widest ml-1">
            {loading ? "Detectando..." : `Precios en ${pricing.symbol}`}
          </span>
        </div>
      </div>

      {isStaff && (
        <div className="border-2 border-neon-magenta/60 rounded-2xl p-5 bg-gradient-to-br from-neon-magenta/10 via-card to-neon-cyan/10 shadow-[0_0_25px_rgba(255,0,255,0.15)] text-center max-w-4xl mx-auto mt-4">
          <h2 className="font-pixel text-sm sm:text-base text-neon-magenta tracking-tight mb-1">⚡ MODO STAFF ACTIVO</h2>
          <p className="text-[10px] sm:text-xs text-foreground/90 font-body">
            Eres administrador. Las restricciones están desactivadas para ti.
          </p>
        </div>
      )}

      {isUnderMaintenance ? (
        <div className="flex flex-col items-center justify-center py-24 px-4 mt-10 border-2 border-dashed border-neon-yellow/30 rounded-3xl bg-neon-yellow/5 animate-pulse max-w-6xl mx-auto">
          <Hammer className="w-16 h-16 text-neon-yellow mb-6" />
          <h2 className="font-pixel text-2xl text-neon-yellow mb-4 text-center">SISTEMA EN MANTENIMIENTO</h2>
          <p className="font-body text-muted-foreground text-center max-w-lg leading-relaxed">
            Estamos terminando de configurar nuestra pasarela de pagos. 
            <br /><br />
            <span className="text-neon-cyan font-bold">¡Volveremos en breve!</span>
          </p>
        </div>
      ) : (

        <div className="grid gap-6 mt-8 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
          {tiers.map(tier => {
            const hasPlan = currentTier === tier.name.toLowerCase();
            const { canBuy, reason } = checkRequirements(tier.name); 

            return (
              <div 
                key={tier.name} 
                className={cn(
                  "bg-card rounded-2xl p-6 sm:p-7 transition-all duration-500 hover:-translate-y-2 relative overflow-hidden flex flex-col h-full min-h-[500px]",
                  tier.isVIP ? `border-2 ${tier.color} ${tier.shadow}` : `border ${tier.color} hover:border-white/20`,
                  (!canBuy && !hasPlan && !isStaff) && "opacity-70 grayscale-[0.3]"
                )}
              >
                <div className="relative z-10 flex-1 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={cn("font-pixel text-xs sm:text-sm tracking-tight", tier.textColor)}>
                      {tier.name}
                    </h3>
                    {tier.isVIP && <Sparkles className={cn("w-5 h-5 animate-pulse text-white/40")} />}
                  </div>
                  
                  {tier.requirements && (
                    <p className={cn("text-[9px] sm:text-[10px] font-body italic mb-3 border-b border-border/20 pb-2", 
                      (canBuy || isStaff) ? "text-muted-foreground" : "text-destructive"
                    )}>
                      {tier.requirements}
                    </p>
                  )}
                  
                  <div className="my-6">
                    <p className="text-3xl sm:text-4xl font-bold font-body text-foreground tracking-tighter">
                      {formatPrice(tier.basePrice)}
                    </p>
                  </div>

                  <div className="space-y-3 text-[11px] sm:text-xs font-body flex-1">
                    {tier.features.map((f, i) => (
                      <div key={i} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-white/[0.04] py-2.5 last:border-0">
                        <span className="text-muted-foreground leading-tight">{f.label}</span>
                        <span className={cn(
                          "sm:text-right font-bold leading-tight break-words", 
                          f.bad ? "text-destructive/70" : "text-foreground"
                        )}>
                          {f.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8">
                    <Button 
                      disabled={hasPlan || (!canBuy && !isStaff) || processingTier === tier.name} 
                      onClick={() => openPurchaseInfo(tier)}
                      className={cn(
                        "w-full h-12 sm:h-14 font-pixel text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 border-none",
                        "bg-[#39FF14] text-black", 
                        "hover:bg-[#00FFFF] hover:text-black hover:shadow-[0_0_25px_#00FFFF] active:scale-95",
                        processingTier === tier.name && "scale-[0.98] bg-neon-cyan shadow-[0_0_22px_rgba(0,255,255,0.55)]",
                        "disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed"
                      )}
                    >
                      {processingTier === tier.name ? <span className="inline-flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Procesando...</span> : hasPlan ? "Plan Actual" : (!canBuy && !isStaff) ? "Bloqueado" : tier.basePrice === 0 ? "Gratis" : "Obtener Rango"}
                    </Button>

                    {!canBuy && !hasPlan && !isStaff && (
                      <p className="text-[9px] text-destructive/90 mt-3 text-center font-body leading-tight">
                        {reason}
                      </p>
                    )}
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
