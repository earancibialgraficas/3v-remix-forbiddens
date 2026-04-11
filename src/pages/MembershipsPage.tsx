import { useState, useEffect } from "react";
import { Star, Globe, Shield } from "lucide-react";
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
    name: "Novato", basePrice: 0, color: "border-muted-foreground/30", textColor: "text-muted-foreground",
    features: [
      { label: "Emuladores", value: "3 juegos simultáneos" },
      { label: "Avatares", value: "25 avatares pixel-art" },
      { label: "Subir avatar", value: "No", bad: true },
      { label: "Mensajes privados", value: "Ilimitados" },
      { label: "Posts en foro", value: "Solo texto plano, sin formato" },
      { label: "Comentarios", value: "Hasta 500 caracteres" },
      { label: "Amigos", value: "Máximo 25" },
      { label: "Almacenamiento", value: "50 MB" },
      { label: "Contenido social", value: "15 posts públicos" },
      { label: "Firma en posts", value: "No" },
      { label: "Cambio de nick", value: "1 vez cada 30 días" },
      { label: "Paleta de colores", value: "No", bad: true },
      { label: "Publicidad", value: "Con anuncios", bad: true },
    ],
  },
  {
    name: "Entusiasta", basePrice: 10, color: "border-neon-orange/50", textColor: "text-neon-orange",
    features: [
      { label: "Emuladores", value: "4 juegos simultáneos" },
      { label: "Avatares", value: "55 avatares (adventurer + bottts)" },
      { label: "Subir avatar", value: "No", bad: true },
      { label: "Mensajes privados", value: "Ilimitados" },
      { label: "Posts en foro", value: "Texto + negrita + imágenes/videos por enlace" },
      { label: "Comentarios", value: "Hasta 1000 caracteres" },
      { label: "Amigos", value: "Máximo 50" },
      { label: "Almacenamiento", value: "150 MB" },
      { label: "Contenido social", value: "30 posts públicos" },
      { label: "Firma en posts", value: "Texto [ENTUSIASTA]. Editable en color, tipografía, bold/italic y enlace a imagen (1000x300) opcional." },
      { label: "Cambio de nick", value: "1 vez cada 15 días" },
      { label: "Paleta de colores", value: "No", bad: true },
      { label: "Publicidad", value: "Sin anuncios" },
    ],
  },
  {
    name: "Coleccionista", basePrice: 15, color: "border-foreground/30", textColor: "text-foreground",
    features: [
      { label: "Emuladores", value: "5 juegos simultáneos" },
      { label: "Avatares", value: "60+ avatares + subir avatar propio (500x500 JPG/PNG/GIF)" },
      { label: "Subir avatar", value: "Sí ✓" },
      { label: "Mensajes privados", value: "Ilimitados" },
      { label: "Posts en foro", value: "Texto + negrita + itálica + tamaño + multimedia por enlace" },
      { label: "Comentarios", value: "Hasta 1500 caracteres" },
      { label: "Amigos", value: "Máximo 100" },
      { label: "Almacenamiento", value: "500 MB" },
      { label: "Contenido social", value: "50 posts públicos" },
      { label: "Firma en posts", value: "Texto + GIF/Links. Editable en color, tipografía, bold/italic y enlace a imagen (1000x300) opcional." },
      { label: "Cambio de nick", value: "1 vez cada 7 días" },
      { label: "Paleta de colores", value: "Selección RGB personalizada" },
      { label: "Publicidad", value: "Sin anuncios" },
    ],
  },
  {
    name: "Miembro del Legado", basePrice: 18, color: "border-neon-green/50", textColor: "text-neon-green",
    features: [
      { label: "Emuladores", value: "6 juegos simultáneos" },
      { label: "Avatares", value: "Todos los avatares + subir avatar propio (500x500 JPG/PNG/GIF)" },
      { label: "Subir avatar", value: "Sí ✓" },
      { label: "Mensajes privados", value: "Ilimitados" },
      { label: "Posts en foro", value: "Todo tipo de formato + multimedia" },
      { label: "Comentarios", value: "Hasta 2000 caracteres" },
      { label: "Amigos", value: "Máximo 200" },
      { label: "Almacenamiento", value: "1000 MB" },
      { label: "Contenido social", value: "90 posts públicos" },
      { label: "Firma en posts", value: "Diseño personalizado. Editable en color, tipografía, bold/italic y enlace a imagen (1000x300) opcional." },
      { label: "Cambio de nick", value: "1 vez cada 10 días" },
      { label: "Paleta de colores", value: "Selección RGB personalizada" },
      { label: "Badge exclusivo", value: "🏛️ LEGADO" },
      { label: "Publicidad", value: "Sin anuncios" },
      { label: "Requisitos", value: "Sin requisitos previos" },
    ],
  },
  {
    name: "Leyenda Arcade", basePrice: 20, color: "border-neon-yellow/50", textColor: "text-neon-yellow",
    requirements: "Requisitos: 1000+ seguidores y 50hrs en el sitio",
    features: [
      { label: "Emuladores", value: "8 juegos simultáneos" },
      { label: "Avatares", value: "Todos los avatares + subir avatar propio (500x500 JPG/PNG/GIF)" },
      { label: "Subir avatar", value: "Sí ✓" },
      { label: "Mensajes privados", value: "Ilimitados" },
      { label: "Posts en foro", value: "Todo tipo de contenido + HTML + formato completo + color" },
      { label: "Comentarios", value: "Hasta 3000 caracteres" },
      { label: "Amigos", value: "Máximo 500" },
      { label: "Almacenamiento", value: "3000 MB" },
      { label: "Contenido social", value: "100 posts públicos" },
      { label: "Firma en posts", value: "Diseño personalizado premium. Editable en color, tipografía, bold/italic y enlace a imagen (1000x300) opcional." },
      { label: "Cambio de nick", value: "1 vez cada 3 días" },
      { label: "Paleta de colores", value: "Selección RGB personalizada" },
      { label: "Badge exclusivo", value: "⭐ LEYENDA ARCADE ⭐" },
      { label: "Publicidad", value: "Sin anuncios" },
    ],
  },
  {
    name: "Creador de Contenido", basePrice: 25, color: "border-neon-cyan/50", textColor: "text-neon-cyan", highlight: true,
    requirements: "Requisitos: 1000+ seguidores y 50hrs en el sitio",
    features: [
      { label: "Emuladores", value: "10 juegos simultáneos" },
      { label: "Avatares", value: "Todos los avatares + subir avatar propio (500x500 JPG/PNG/GIF)" },
      { label: "Subir avatar", value: "Sí ✓" },
      { label: "Mensajes privados", value: "Ilimitados" },
      { label: "Posts en foro", value: "Todo tipo de contenido + HTML + formato completo + color + embeds" },
      { label: "Comentarios", value: "Hasta 5000 caracteres" },
      { label: "Amigos", value: "Ilimitado" },
      { label: "Almacenamiento", value: "5000 MB" },
      { label: "Contenido social", value: "Ilimitado" },
      { label: "Firma en posts", value: "Diseño totalmente personalizable. Editable en color, tipografía, bold/italic y enlace a imagen (1000x300) opcional." },
      { label: "Cambio de nick", value: "1 vez cada 3 días" },
      { label: "Paleta de colores", value: "Selección RGB personalizada" },
      { label: "Badge exclusivo", value: "🎬 CREADOR VERIFICADO ✓" },
      { label: "Publicidad", value: "Sin anuncios" },
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
        if (data.country_code && countryPricing[data.country_code]) {
          setUserCountry(data.country_code);
        }
      } catch {}
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
          <select value={userCountry} onChange={(e) => setUserCountry(e.target.value)} className="bg-muted border border-border rounded px-2 py-1 text-[10px] font-body text-foreground">
            {Object.keys(countryPricing).map((code) => (<option key={code} value={code}>{code}</option>))}
          </select>
          <span className="text-[10px] text-muted-foreground font-body">{loading ? "Detectando..." : `Precios en ${pricing.symbol}`}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
        {tiers.map((tier) => (
          <div key={tier.name} className={cn("bg-card border rounded p-4 transition-all duration-300 hover:scale-[1.02]", tier.color, (tier as any).highlight && "ring-1 ring-neon-cyan/30")}>
            <h3 className={cn("font-body text-sm font-bold mb-1 tracking-wide", tier.textColor)}>{tier.name}</h3>
            {(tier as any).requirements && (
              <p className="text-[9px] text-muted-foreground font-body italic mb-1">{(tier as any).requirements}</p>
            )}
            <p className="text-lg font-bold font-body text-foreground mb-3">{formatPrice(tier.basePrice)}</p>
            <div className="space-y-1.5 text-[11px] font-body">
              {tier.features.map((f, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className={cn("text-right", (f as any).bad ? "text-destructive" : "text-foreground")}>{f.value}</span>
                </div>
              ))}
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
