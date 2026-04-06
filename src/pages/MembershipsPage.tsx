import { useState, useEffect } from "react";
import { Star, Check, X, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    name: "Novato", basePrice: 0, color: "border-muted-foreground/30", textColor: "text-muted-foreground",
    features: { upload: "20 MB", ads: true, verification: false, avatar: "Estático", signature: "Solo texto", messages: "20 msgs", rank: "Estándar", tools: "Básicas", vip: false, nickChange: false, socialLimit: 0 },
  },
  {
    name: "Entusiasta", basePrice: 10, color: "border-neon-orange/50", textColor: "text-neon-orange",
    features: { upload: "50 MB", ads: false, verification: false, avatar: "Animado (GIF)", signature: "Texto + Imagen", messages: "200 msgs", rank: "Color Bronce", tools: "Crear Encuestas", vip: "Solo lectura", nickChange: "Cada 6 meses", socialLimit: 5 },
  },
  {
    name: "Coleccionista", basePrice: 15, color: "border-foreground/30", textColor: "text-foreground",
    features: { upload: "100 MB", ads: false, verification: false, avatar: "Animado + Marco", signature: "Texto + GIF/Links", messages: "500 msgs", rank: "Color Plata", tools: "Post con Formato", vip: "Chat y Foro VIP", nickChange: "Cada 3 meses", socialLimit: 15 },
  },
  {
    name: "Leyenda Arcade", basePrice: 25, color: "border-neon-yellow/50", textColor: "text-neon-yellow", highlight: true,
    features: { upload: "250 MB", ads: false, verification: "Rango Oro", avatar: "Animado + Efectos", signature: "Diseño HTML/CSS", messages: "Ilimitados", rank: "Color Oro + Brillo", tools: "Fijar 1 Post/Semana", vip: "VIP + Mercado Retro", nickChange: "Mensual", socialLimit: 50 },
  },
  {
    name: "Creador Verificado", basePrice: 20, color: "border-neon-cyan/50", textColor: "text-neon-cyan",
    features: { upload: "300 MB", ads: false, verification: "Check ✅", avatar: "Personalización Total", signature: "Banner de Redes", messages: "Ilimitados", rank: "Neon / Arcoiris", tools: "Post de Promoción", vip: "Sala de Prensa", nickChange: "Quincenal", socialLimit: 100 },
    requirement: "1k Seguidores + 50h en web",
  },
];

export default function MembershipsPage() {
  const [userCountry, setUserCountry] = useState("US");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Detect country via timezone or free API
    const detectCountry = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data.country_code && countryPricing[data.country_code]) {
          setUserCountry(data.country_code);
        }
      } catch {
        // Default to US
      }
      setLoading(false);
    };
    detectCountry();
  }, []);

  const pricing = countryPricing[userCountry] || countryPricing.US;

  const formatPrice = (basePrice: number) => {
    if (basePrice === 0) return "Gratis";
    const localPrice = Math.round(basePrice * pricing.multiplier);
    return `${pricing.symbol}${localPrice.toLocaleString()}/mes`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="font-pixel text-sm text-neon-yellow mb-2">⭐ MEMBRESÍAS</h1>
        <p className="text-xs text-muted-foreground font-body">Elige el plan que mejor se adapte a tu estilo</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Globe className="w-3 h-3 text-muted-foreground" />
          <select
            value={userCountry}
            onChange={(e) => setUserCountry(e.target.value)}
            className="bg-muted border border-border rounded px-2 py-1 text-[10px] font-body text-foreground"
          >
            {Object.keys(countryPricing).map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground font-body">
            {loading ? "Detectando..." : `Precios en ${pricing.symbol}`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={cn(
              "bg-card border rounded p-4 transition-all duration-300 hover:scale-[1.02]",
              tier.color,
              tier.highlight && "ring-1 ring-neon-yellow/30"
            )}
          >
            <h3 className={cn("font-body text-sm font-bold mb-1 tracking-wide", tier.textColor)}>{tier.name}</h3>
            <p className="text-lg font-bold font-body text-foreground mb-3">{formatPrice(tier.basePrice)}</p>
            {tier.requirement && (
              <p className="text-[10px] text-muted-foreground font-body mb-2 italic">Requisito: {tier.requirement}</p>
            )}
            <div className="space-y-1.5 text-[11px] font-body">
              <div className="flex justify-between"><span className="text-muted-foreground">Subida</span><span className="text-foreground">{tier.features.upload}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Publicidad</span>{tier.features.ads ? <span className="text-destructive">Con anuncios</span> : <span className="text-neon-green">Sin anuncios</span>}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avatar</span><span className="text-foreground">{tier.features.avatar}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mensajes</span><span className="text-foreground">{tier.features.messages}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rango</span><span className="text-foreground">{tier.features.rank}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Contenido Social</span><span className="text-foreground">{tier.features.socialLimit ? `${tier.features.socialLimit} posts` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VIP</span>{tier.features.vip ? <span className="text-foreground">{tier.features.vip}</span> : <X className="w-3 h-3 text-destructive" />}</div>
            </div>
            <Button className="w-full mt-4 h-8 text-xs font-body bg-primary text-primary-foreground hover:bg-primary/80 transition-all duration-200">
              {tier.basePrice === 0 ? "Plan Actual" : "Suscribirse"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
