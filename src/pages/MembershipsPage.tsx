import { useState, useEffect } from "react";
import { Globe, Sparkles, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface PriceByCountry {
  [country: string]: { symbol: string; multiplier: number };
}

const countryPricing: PriceByCountry = {
  US: { symbol: "$", multiplier: 1 },
  MX: { symbol: "MX$", multiplier: 17 },
  AR: { symbol: "ARS$", multiplier: 900 },
  CL: { symbol: "CLP$", multiplier: 950 },
  CO: { symbol: "COP$", multiplier: 4000 },
  PE: { symbol: "S/", multiplier: 3.7 },
  ES: { symbol: "€", multiplier: 0.92 },
  BR: { symbol: "R$", multiplier: 5 },
  GB: { symbol: "£", multiplier: 0.79 },
};

const tiers = [
  {
    name: "Novato", basePrice: 0, color: "border-muted-foreground/30", textColor: "text-muted-foreground", isVIP: false,
    checkoutUrl: null,
    features: [
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
    name: "Lite", basePrice: 5, color: "border-neon-cyan/50", textColor: "text-neon-cyan", isVIP: false,
    checkoutUrl: "https://forbiddens.lemonsqueezy.com/checkout/buy/4a363da2-6a4b-4179-9130-cabce74151a1",
    features: [
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
    name: "Miembro del Legado", basePrice: 18, color: "border-neon-green/80", textColor: "text-neon-green", isVIP: true,
    shadow: "shadow-[0_0_20px_rgba(57,255,20,0.15)]",
    checkoutUrl: "https://forbiddens.lemonsqueezy.com/checkout/buy/70b40054-06ea-408c-984c-34b48f8bee62",
    features: [
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
    name: "Creador de Contenido", basePrice: 25, color: "border-neon-cyan/80", textColor: "text-neon-cyan", isVIP: true,
    shadow: "shadow-[0_0_25px_rgba(0,255,255,0.2)]",
    requirements: "Requisitos: 1000+ Seguidores y 100.000 Puntos",
    checkoutUrl: "https://forbiddens.lemonsqueezy.com/checkout/buy/3a052872-c7af-42eb-85ce-449deaff996c",
    features: [
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
    name: "Entusiasta", basePrice: 10, color: "border-neon-orange/50", textColor: "text-neon-orange", isVIP: false,
    checkoutUrl: "https://forbiddens.lemonsqueezy.com/checkout/buy/7dde60e7-66c1-4a4d-899f-6aa7c9eb68a6",
    features: [
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
    name: "Coleccionista", basePrice: 15, color: "border-foreground/30", textColor: "text-foreground", isVIP: false,
    checkoutUrl: "https://forbiddens.lemonsqueezy.com/checkout/buy/55122696-dcd6-4efa-a20d-aef3f5dbf183",
    features: [
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
    name: "Leyenda Arcade", basePrice: 20, color: "border-neon-yellow/50", textColor: "text-neon-yellow", isVIP: false,
    requirements: "Requisitos: 750+ Seguidores y 50.000 Puntos",
    checkoutUrl: "https://forbiddens.lemonsqueezy.com/checkout/buy/36769b6f-e093-48d3-9244-1a424c3bb6ec",
    features: [
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
  const [userCountry, setUserCountry] = useState("US");
  const [loading, setLoading] = useState(true);
  const { user, profile, isAdmin, isMasterWeb, roles: currentRoles } = useAuth();
  
  const isUnderMaintenance = true;   // 🛠️ CAMBIAR A FALSE PARA QUE SE VEAN LAS MEMBRESIAS:

  const isStaff = isAdmin || isMasterWeb || (currentRoles || []).includes("moderator");
  const currentTier = isStaff ? "staff" : (profile?.membership_tier?.toLowerCase() || "novato");

  // 🛠️ CORRECCIÓN DE COLUMNAS:
  // Cambiamos 'puntos' por 'total_score'
  // Cambiamos 'seguidores' por 'follower_count' (Revisa si en Supabase se llama así!)
  const userFollowers = profile?.follower_count || 0; 
  const userPoints = profile?.total_score || 0; 

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

  const handleCheckout = (tierName: string, checkoutUrl: string | null) => {
    if (!checkoutUrl) return;
    if (!user) {
      alert("Debes iniciar sesión para adquirir una membresía.");
      return;
    }

    const validation = checkRequirements(tierName);
    if (!validation.canBuy) {
      alert(`Lo sentimos, no cumples los requisitos: ${validation.reason}`);
      return;
    }

    const rangoFormateado = tierName.toLowerCase();
    const finalUrl = `${checkoutUrl}?checkout[custom][user_id]=${user.id}&checkout[custom][rango]=${rangoFormateado}`;
    window.location.href = finalUrl;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 px-2 sm:px-6 w-full max-w-none">
      
      {/* Header adaptable */}
      <div className="text-center space-y-3 pt-4">
        <h1 className="font-pixel text-xl sm:text-4xl text-neon-yellow uppercase tracking-tighter">⭐ Membresías</h1>
        <p className="text-[10px] sm:text-base text-muted-foreground font-body max-w-3xl mx-auto leading-relaxed">
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
        <div className="border-2 border-neon-magenta/60 rounded-2xl p-5 bg-gradient-to-br from-neon-magenta/10 via-card to-neon-cyan/10 shadow-[0_0_25px_rgba(255,0,255,0.15)] text-center max-w-4xl mx-auto">
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
            Estamos terminando de configurar nuestra pasarela de pagos con Lemon Squeezy para brindarte la mejor seguridad. 
            <br /><br />
            <span className="text-neon-cyan font-bold">¡Volveremos en breve con todos los rangos activos!</span>
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
                      disabled={hasPlan || (!canBuy && !isStaff)} 
                      onClick={() => handleCheckout(tier.name, tier.checkoutUrl)}
                      className={cn(
                        "w-full h-12 sm:h-14 font-pixel text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-300 border-none",
                        "bg-[#39FF14] text-black", 
                        "hover:bg-[#00FFFF] hover:text-black hover:shadow-[0_0_25px_#00FFFF] active:scale-95",
                        "disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed"
                      )}
                    >
                      {hasPlan ? "Plan Actual" : (!canBuy && !isStaff) ? "Bloqueado" : tier.basePrice === 0 ? "Gratis" : "Obtener Rango"}
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