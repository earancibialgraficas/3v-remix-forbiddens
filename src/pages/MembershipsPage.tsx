import { useState, useEffect } from "react";
import { Globe, Sparkles } from "lucide-react";
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
    requirements: "Requisitos: 1000+ Seguidores y 50 Horas",
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
    requirements: "Requisitos: 750+ Seguidores y 30 Horas",
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
  
  const isStaff = isAdmin || isMasterWeb || (currentRoles || []).includes("moderator");
  const currentTier = isStaff ? "staff" : (profile?.membership_tier?.toLowerCase() || "novato");

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

  const handleCheckout = (checkoutUrl: string | null) => {
    if (!checkoutUrl) return;
    if (!user) {
      alert("Debes iniciar sesión o registrarte para adquirir una membresía.");
      return;
    }
    const finalUrl = `${checkoutUrl}?checkout[custom][user_id]=${user.id}`;
    window.location.href = finalUrl;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 px-2 sm:px-4 max-w-7xl mx-auto">
      <div className="text-center space-y-3">
        <h1 className="font-pixel text-xl sm:text-2xl text-neon-yellow uppercase tracking-tighter">⭐ Membresías</h1>
        <p className="text-[10px] sm:text-xs text-muted-foreground font-body max-w-2xl mx-auto leading-relaxed">
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
        <div className="border-2 border-neon-magenta/60 rounded-2xl p-5 bg-gradient-to-br from-neon-magenta/10 via-card to-neon-cyan/10 shadow-[0_0_25px_rgba(255,0,255,0.15)] text-center">
          <h2 className="font-pixel text-sm sm:text-base text-neon-magenta tracking-tight mb-1">⚡ MEMBRESÍA STAFF</h2>
          <p className="text-[10px] sm:text-xs text-foreground/90 font-body">
            Tu plan actual es <span className="font-bold text-neon-magenta">STAFF</span>.
          </p>
        </div>
      )}

      {/* 🔥 CAMBIADO: lg:grid-cols-3 para tener 3 columnas en PC 🔥 */}
      <div className="grid gap-4 sm:gap-6 mt-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map(tier => (
          <div 
            key={tier.name} 
            className={cn(
              "bg-card rounded-2xl p-5 sm:p-6 transition-all duration-500 hover:-translate-y-1 relative overflow-hidden flex flex-col h-full min-h-[400px]",
              tier.isVIP ? `border-2 ${tier.color} ${tier.shadow}` : `border ${tier.color} hover:border-white/20`
            )}
          >
            <div className="relative z-10 flex-1 flex flex-col h-full">
              <div className="flex items-center justify-between mb-1">
                <h3 className={cn("font-pixel text-[11px] sm:text-xs tracking-tight", tier.textColor)}>
                  {tier.name}
                </h3>
                {tier.isVIP && <Sparkles className={cn("w-4 h-4 animate-pulse text-white/40")} />}
              </div>
              
              {tier.requirements && (
                <p className="text-[8px] sm:text-[9px] text-muted-foreground font-body italic mb-2 border-b border-border/20 pb-2">
                  {tier.requirements}
                </p>
              )}
              
              <div className="my-4 sm:my-6">
                <p className="text-xl sm:text-3xl font-bold font-body text-foreground tracking-tight">
                  {formatPrice(tier.basePrice)}
                </p>
              </div>

              <div className="space-y-1.5 sm:space-y-2 text-[10px] sm:text-[11px] font-body flex-1">
                {tier.features.map((f, i) => (
                  <div key={i} className="flex justify-between gap-x-3 border-b border-white/[0.03] py-1 last:border-0">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className={cn("text-right font-medium", f.bad ? "text-destructive/60" : "text-foreground/90")}>
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>

              <Button 
                disabled={currentTier === tier.name.toLowerCase()}
                onClick={() => handleCheckout(tier.checkoutUrl)}
                className={cn(
                  "w-full mt-6 h-10 sm:h-12 font-pixel text-[9px] sm:text-[10px] uppercase tracking-wider transition-all duration-300 border-none",
                  "bg-[#39FF14] text-black", 
                  "hover:bg-[#00FFFF] hover:text-black hover:shadow-[0_0_20px_#00FFFF] active:scale-95",
                  "disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed"
                )}
              >
                {currentTier === tier.name.toLowerCase() ? "Plan Actual" : tier.basePrice === 0 ? "Plan Gratuito" : "Obtener Rango"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}