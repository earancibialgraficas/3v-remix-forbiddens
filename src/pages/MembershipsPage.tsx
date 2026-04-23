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

// Datos actualizados exactamente según los Excel del cliente
const tiers = [
  {
    name: "Novato", basePrice: 0, color: "border-muted-foreground/30", textColor: "text-muted-foreground", isVIP: false,
    features: [
      { label: "Emuladores", value: "3 juegos en simultáneo" },
      { label: "Avatar/Perfil", value: "25 avatares Pixel-Art" },
      { label: "Subir Avatar", value: "No", bad: true },
      { label: "Post en Foro", value: "Texto plano ilimitado" },
      { label: "Comentarios", value: "500 caracteres máximo" },
      { label: "Amigos", value: "Máximo 25" },
      { label: "Almacenamiento", value: "50 MB" },
      { label: "Social Hub", value: "15 imágenes/videos" },
      { label: "Muro Fotográfico", value: "15 fotos" },
      { label: "Firma en posts", value: "No", bad: true },
      { label: "Paleta de Colores", value: "No", bad: true },
    ],
  },
  {
    name: "Entusiasta", basePrice: 10, color: "border-neon-orange/50", textColor: "text-neon-orange", isVIP: false,
    features: [
      { label: "Emuladores", value: "4 juegos en simultáneo" },
      { label: "Avatar/Perfil", value: "55 avatares (Adventurer + Bots)" },
      { label: "Subir Avatar", value: "No", bad: true },
      { label: "Post en Foro", value: "Ilimitado - Texto + Bold + Imágenes" },
      { label: "Comentarios", value: "1000 caracteres máximo" },
      { label: "Amigos", value: "Máximo 50" },
      { label: "Almacenamiento", value: "150 MB" },
      { label: "Social Hub", value: "30 imágenes/videos" },
      { label: "Muro Fotográfico", value: "30 fotos" },
      { label: "Firma en posts", value: "Texto personalizable con color y tipografía" },
      { label: "Paleta de Colores", value: "No", bad: true },
    ],
  },
  {
    name: "Coleccionista", basePrice: 15, color: "border-foreground/30", textColor: "text-foreground", isVIP: false,
    features: [
      { label: "Emuladores", value: "5 juegos en simultáneo" },
      { label: "Avatar/Perfil", value: "60 avatares" },
      { label: "Subir Avatar", value: "Sí (500x500px)" },
      { label: "Post en Foro", value: "Ilimitado - Formato completo + Multimedia" },
      { label: "Comentarios", value: "1500 caracteres máximo" },
      { label: "Amigos", value: "Máximo 100" },
      { label: "Almacenamiento", value: "500 MB" },
      { label: "Social Hub", value: "50 imágenes/videos" },
      { label: "Muro Fotográfico", value: "50 fotos" },
      { label: "Firma en posts", value: "Texto + Imagen + Tipografía avanzada" },
      { label: "Paleta de Colores", value: "RGB personalizado" },
    ],
  },
  {
    name: "Miembro del Legado", basePrice: 18, color: "border-neon-green/80", textColor: "text-neon-green", isVIP: true,
    shadow: "shadow-[0_0_15px_rgba(57,255,20,0.2)]", // Brillo VIP verde
    features: [
      { label: "Emuladores", value: "6 juegos en simultáneo" },
      { label: "Avatar/Perfil", value: "Avatares Desbloqueados" },
      { label: "Subir Avatar", value: "Sí (500x500px)" },
      { label: "Post en Foro", value: "Ilimitado - Formato Completo" },
      { label: "Comentarios", value: "2000 caracteres máximo" },
      { label: "Amigos", value: "Máximo 200" },
      { label: "Almacenamiento", value: "1000 MB" },
      { label: "Social Hub", value: "90 imágenes/videos" },
      { label: "Muro Fotográfico", value: "90 fotos" },
      { label: "Firma en posts", value: "Diseño personalizado completo" },
      { label: "Paleta de Colores", value: "RGB personalizado" },
      { label: "Badge Exclusivo", value: "🏛️ LEGADO" },
    ],
  },
  {
    name: "Leyenda Arcade", basePrice: 20, color: "border-neon-yellow/50", textColor: "text-neon-yellow", isVIP: false,
    requirements: "Requisitos: 750+ seguidores y 30 horas en el sitio",
    features: [
      { label: "Emuladores", value: "8 juegos en simultáneo" },
      { label: "Avatar/Perfil", value: "Avatares Desbloqueados" },
      { label: "Subir Avatar", value: "Sí (500x500px)" },
      { label: "Post en Foro", value: "Ilimitado - Todo tipo de contenido" },
      { label: "Comentarios", value: "3000 caracteres máximo" },
      { label: "Amigos", value: "Máximo 500" },
      { label: "Almacenamiento", value: "3000 MB" },
      { label: "Social Hub", value: "100 imágenes/videos" },
      { label: "Muro Fotográfico", value: "100 fotos" },
      { label: "Firma en posts", value: "Diseño Premium Completo" },
      { label: "Paleta de Colores", value: "RGB personalizado" },
      { label: "Badge Exclusivo", value: "⭐ LEYENDA ARCADE ⭐" },
    ],
  },
  {
    name: "Creador de Contenido", basePrice: 25, color: "border-neon-cyan/80", textColor: "text-neon-cyan", isVIP: true,
    shadow: "shadow-[0_0_20px_rgba(0,255,255,0.25)]", // Brillo VIP cyan
    requirements: "Requisitos: 1000+ seguidores y 50 horas en el sitio",
    features: [
      { label: "Emuladores", value: "10 juegos en simultáneo" },
      { label: "Avatar/Perfil", value: "Avatares Desbloqueados" },
      { label: "Subir Avatar", value: "Sí (500x500px)" },
      { label: "Post en Foro", value: "Ilimitado - Todo + HTML + Embeds" },
      { label: "Comentarios", value: "5000 caracteres máximo" },
      { label: "Amigos", value: "Ilimitados" },
      { label: "Almacenamiento", value: "5000 MB" },
      { label: "Social Hub", value: "Ilimitado" },
      { label: "Muro Fotográfico", value: "Ilimitado" },
      { label: "Firma en posts", value: "Diseño personalizable total" },
      { label: "Paleta de Colores", value: "RGB personalizado" },
      { label: "Badge Exclusivo", value: "🎬 CREADOR VERIFICADO ✅" },
    ],
  },
];

export default function MembershipsPage() {
  const { isAdmin, isMasterWeb, roles } = useAuth();
  const [userCountry, setUserCountry] = useState("US");
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
    if (basePrice === 0) return "Gratuito";
    return `${pricing.symbol}${Math.round(basePrice * pricing.multiplier).toLocaleString()}/mes`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="text-center">
        <h1 className="font-pixel text-xl text-neon-yellow mb-2">⭐ MEMBRESÍAS</h1>
        <p className="text-xs text-muted-foreground font-body max-w-lg mx-auto">
          Elige el plan que mejor se adapte a tu estilo. Todos los planes permiten posts ilimitados en el foro. El límite de "Social Hub" y "Muro Fotográfico" se refiere a la cantidad de imágenes/videos que puedes publicar.
        </p>
        
        <div className="flex items-center justify-center gap-2 mt-4 bg-card/50 border border-border w-fit mx-auto px-4 py-2 rounded-full">
          <Globe className="w-4 h-4 text-neon-cyan" />
          <select 
            value={userCountry} 
            onChange={e => setUserCountry(e.target.value)} 
            className="bg-transparent outline-none border-none text-[11px] font-pixel text-foreground uppercase cursor-pointer"
          >
            {Object.keys(countryPricing).map(code => <option key={code} value={code} className="bg-background">{code}</option>)}
          </select>
          <span className="text-[10px] text-muted-foreground font-body ml-2">
            {loading ? "Detectando..." : `Precios mostrados en ${pricing.symbol}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {tiers.map(tier => (
          <div 
            key={tier.name} 
            className={cn(
              "bg-card rounded-xl p-5 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col",
              tier.isVIP ? `border-2 ${tier.color} ${tier.shadow}` : `border ${tier.color} hover:shadow-lg`
            )}
          >
            {/* Si es VIP, le ponemos un degradado sutil al fondo */}
            {tier.isVIP && (
              <div className={cn("absolute inset-0 opacity-5 pointer-events-none bg-gradient-to-br from-current to-transparent", tier.textColor)} />
            )}

            <div className="relative z-10 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1">
                <h3 className={cn("font-pixel text-sm tracking-wide", tier.textColor)}>
                  {tier.name}
                </h3>
                {tier.isVIP && <Sparkles className={cn("w-4 h-4 animate-pulse", tier.textColor)} />}
              </div>
              
              {tier.requirements && (
                <p className="text-[9px] text-muted-foreground font-body italic mb-2 border-b border-border/50 pb-2">
                  {tier.requirements}
                </p>
              )}
              
              <div className="my-4">
                <p className="text-2xl font-bold font-body text-foreground">
                  {formatPrice(tier.basePrice)}
                </p>
              </div>

              <div className="space-y-2 text-[11px] font-body flex-1 mt-2">
                {tier.features.map((f, i) => (
                  <div key={i} className="flex justify-between gap-3 border-b border-border/30 pb-1.5 last:border-0">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className={cn("text-right font-medium", f.bad ? "text-destructive/80" : "text-foreground")}>
                      {f.value}
                    </span>
                  </div>
                ))}
              </div>

              <Button 
                className={cn(
                  "w-full mt-6 h-10 font-pixel text-[10px] uppercase tracking-wider transition-all",
                  tier.isVIP 
                    ? `bg-transparent border-2 ${tier.color} ${tier.textColor} hover:bg-current hover:text-black` 
                    : "bg-primary text-primary-foreground hover:bg-primary/80"
                )}
              >
                {tier.basePrice === 0 ? "Plan Base" : "Adquirir Rango"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}