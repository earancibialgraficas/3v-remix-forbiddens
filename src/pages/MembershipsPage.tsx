import { useState, useEffect } from "react";
import { Star, Globe, Shield, Sparkles } from "lucide-react";
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

// Datos exactos de tus membresías
const tiers = [
  {
    name: "Novato", basePrice: 0, color: "border-muted-foreground/30", textColor: "text-muted-foreground", isVIP: false,
    features: [
      { label: "Emuladores", value: "3 juegos" },
      { label: "Avatar", value: "25 Pixel-Art" },
      { label: "Subir Avatar", value: "No", bad: true },
      { label: "Foro", value: "Texto Plano" },
      { label: "Comentarios", value: "500 caracteres" },
      { label: "Amigos", value: "Max 25" },
      { label: "Storage", value: "50 MB" },
      { label: "Social Hub", value: "15 archivos" },
      { label: "Muro", value: "15 fotos" },
    ],
  },
  {
    name: "Entusiasta", basePrice: 10, color: "border-neon-orange/50", textColor: "text-neon-orange", isVIP: false,
    features: [
      { label: "Emuladores", value: "4 juegos" },
      { label: "Avatar", value: "55 predefinidos" },
      { label: "Subir Avatar", value: "No", bad: true },
      { label: "Foro", value: "Texto + Bold" },
      { label: "Comentarios", value: "1000 caracteres" },
      { label: "Amigos", value: "Max 50" },
      { label: "Storage", value: "150 MB" },
      { label: "Social Hub", value: "30 archivos" },
      { label: "Muro", value: "30 fotos" },
    ],
  },
  {
    name: "Coleccionista", basePrice: 15, color: "border-foreground/30", textColor: "text-foreground", isVIP: false,
    features: [
      { label: "Emuladores", value: "5 juegos" },
      { label: "Avatar", value: "60 + Propio" },
      { label: "Subir Avatar", value: "Sí" },
      { label: "Foro", value: "Formato Full" },
      { label: "Comentarios", value: "1500 caracteres" },
      { label: "Amigos", value: "Max 100" },
      { label: "Storage", value: "500 MB" },
      { label: "Social Hub", value: "50 archivos" },
      { label: "Muro", value: "50 fotos" },
    ],
  },
  {
    name: "Miembro del Legado", basePrice: 18, color: "border-neon-green/80", textColor: "text-neon-green", isVIP: true,
    shadow: "shadow-[0_0_15px_rgba(57,255,20,0.1)]",
    features: [
      { label: "Emuladores", value: "6 juegos" },
      { label: "Avatar", value: "Todos + Propio" },
      { label: "Subir Avatar", value: "Sí" },
      { label: "Foro", value: "Formato Full" },
      { label: "Comentarios", value: "2000 caracteres" },
      { label: "Amigos", value: "Max 200" },
      { label: "Storage", value: "1000 MB" },
      { label: "Social Hub", value: "90 archivos" },
      { label: "Muro", value: "90 fotos" },
    ],
  },
  {
    name: "Leyenda Arcade", basePrice: 20, color: "border-neon-yellow/50", textColor: "text-neon-yellow", isVIP: false,
    requirements: "Requisitos: 750+ Seg. / 30 Hrs",
    features: [
      { label: "Emuladores", value: "8 juegos" },
      { label: "Avatar", value: "Todos + Propio" },
      { label: "Subir Avatar", value: "Sí" },
      { label: "Foro", value: "Multimedia" },
      { label: "Comentarios", value: "3000 caracteres" },
      { label: "Amigos", value: "Max 500" },
      { label: "Storage", value: "3000 MB" },
      { label: "Social Hub", value: "100 archivos" },
      { label: "Muro", value: "100 fotos" },
    ],
  },
  {
    name: "Creador de Contenido", basePrice: 25, color: "border-neon-cyan/80", textColor: "text-neon-cyan", isVIP: true,
    shadow: "shadow-[0_0_20px_rgba(0,255,255,0.15)]",
    requirements: "Requisitos: 1000+ Seg. / 50 Hrs",
    features: [
      { label: "Emuladores", value: "10 juegos" },
      { label: "Avatar", value: "Todos + Propio" },
      { label: "Subir Avatar", value: "Sí" },
      { label: "Foro", value: "HTML + Embeds" },
      { label: "Comentarios", value: "5000 caracteres" },
      { label: "Amigos", value: "Ilimitados" },
      { label: "Storage", value: "5000 MB" },
      { label: "Social Hub", value: "Ilimitado" },
      { label: "Muro", value: "Ilimitado" },
    ],
  },
];

export default function MembershipsPage() {
  const [userCountry, setUserCountry] = useState("CL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data.country_code && countryPricing[data.country_code]) setUserCountry(data.country_code);
      } catch {}
      setLoading(false);
    };
    detectCountry();
  }, []);

  const pricing = countryPricing[userCountry] || countryPricing.US;
  const formatPrice = (basePrice: number) => {
    if (basePrice === 0) return "Gratis";
    return `${pricing.symbol}${Math.round(basePrice * pricing.multiplier).toLocaleString()}`;
  };

  return (
    <div className="space-y-4 animate-fade-in pb-20 px-1 sm:px-4">
      <div className="text-center space-y-1">
        <h1 className="font-pixel text-base sm:text-xl text-neon-yellow uppercase tracking-tighter">Planes VIP</h1>
        <p className="text-[9px] sm:text-xs text-muted-foreground font-body max-w-xs mx-auto leading-tight">
          Mejora tu cuenta y desbloquea límites.
        </p>
        
        <div className="flex items-center justify-center gap-1.5 mt-2 bg-card/30 border border-border/50 w-fit mx-auto px-2 py-1 rounded-full">
          <Globe className="w-3 h-3 text-neon-cyan" />
          <select 
            value={userCountry} 
            onChange={e => setUserCountry(e.target.value)} 
            className="bg-transparent outline-none border-none text-[9px] font-pixel text-foreground uppercase cursor-pointer"
          >
            {Object.keys(countryPricing).map(code => <option key={code} value={code} className="bg-background">{code}</option>)}
          </select>
          <span className="text-[8px] text-muted-foreground font-body uppercase tracking-tighter">
            {loading ? "..." : pricing.symbol}
          </span>
        </div>
      </div>

      {/* 🔥 GRID DE 2 COLUMNAS EN MÓVIL 🔥 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6 mt-4">
        {tiers.map(tier => (
          <div 
            key={tier.name} 
            className={cn(
              "bg-card rounded-xl p-3 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden flex flex-col h-full",
              tier.isVIP ? `border-2 ${tier.color} ${tier.shadow}` : `border ${tier.color}`
            )}
          >
            {tier.isVIP && (
              <div className={cn("absolute inset-0 opacity-[0.03] pointer-events-none bg-gradient-to-br from-current to-transparent", tier.textColor)} />
            )}

            <div className="relative z-10 flex-1 flex flex-col h-full">
              <div className="flex items-center justify-between mb-0.5">
                <h3 className={cn("font-pixel text-[9px] sm:text-xs tracking-tighter leading-none", tier.textColor)}>
                  {tier.name}
                </h3>
                {tier.isVIP && <Sparkles className="w-3 h-3 animate-pulse text-white/50" />}
              </div>
              
              {tier.requirements && (
                <p className="text-[7px] sm:text-[8px] text-muted-foreground font-body italic mb-1 border-b border-border/20 pb-1">
                  {tier.requirements}
                </p>
              )}
              
              <div className="my-1.5 sm:my-3">
                <p className="text-sm sm:text-2xl font-bold font-body text-foreground leading-none">
                  {formatPrice(tier.basePrice)}
                </p>
              </div>

              <div className="space-y-0.5 sm:space-y-1.5 text-[8px] sm:text-[10px] font-body flex-1 mt-1">
                {tier.features.map((f, i) => (
                  <div key={i} className="flex justify-between gap-x-1 border-b border-border/5 py-0.5 last:border-0">
                    <span className="text-muted-foreground truncate max-w-[50px] sm:max-w-[100px]">{f.label}</span>
                    <span className={cn("text-right font-medium", f.bad ? "text-destructive/60" : "text-foreground/90")}>
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>

              <Button 
                className={cn(
                  "w-full mt-3 h-7 sm:h-10 font-pixel text-[8px] sm:text-[10px] uppercase tracking-wider transition-all",
                  tier.isVIP 
                    ? `bg-transparent border ${tier.color} ${tier.textColor} hover:bg-white/5` 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {tier.basePrice === 0 ? "Actual" : "Adquirir"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}