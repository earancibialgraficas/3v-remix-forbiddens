import { Star, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Novato", price: "Gratis", color: "border-muted-foreground/30", textColor: "text-muted-foreground",
    features: { upload: "20 MB", ads: true, verification: false, avatar: "Estático", signature: "Solo texto", messages: "20 msgs", rank: "Estándar", tools: "Básicas", vip: false, nickChange: false },
  },
  {
    name: "Entusiasta", price: "$10/mes", color: "border-neon-orange/50", textColor: "text-neon-orange",
    features: { upload: "50 MB", ads: false, verification: false, avatar: "Animado (GIF)", signature: "Texto + Imagen", messages: "200 msgs", rank: "Color Bronce", tools: "Crear Encuestas", vip: "Solo lectura", nickChange: "Cada 6 meses" },
  },
  {
    name: "Coleccionista", price: "$15/mes", color: "border-foreground/30", textColor: "text-foreground",
    features: { upload: "100 MB", ads: false, verification: false, avatar: "Animado + Marco", signature: "Texto + GIF/Links", messages: "500 msgs", rank: "Color Plata", tools: "Post con Formato", vip: "Chat y Foro VIP", nickChange: "Cada 3 meses" },
  },
  {
    name: "Leyenda Arcade", price: "$25/mes", color: "border-neon-yellow/50", textColor: "text-neon-yellow", highlight: true,
    features: { upload: "250 MB", ads: false, verification: "Rango Oro", avatar: "Animado + Efectos", signature: "Diseño HTML/CSS", messages: "Ilimitados", rank: "Color Oro + Brillo", tools: "Fijar 1 Post/Semana", vip: "VIP + Mercado Retro", nickChange: "Mensual" },
  },
  {
    name: "Creador Verificado", price: "$20/mes", color: "border-neon-cyan/50", textColor: "text-neon-cyan",
    features: { upload: "300 MB", ads: false, verification: "Check ✅", avatar: "Personalización Total", signature: "Banner de Redes", messages: "Ilimitados", rank: "Neon / Arcoiris", tools: "Post de Promoción", vip: "Sala de Prensa", nickChange: "Quincenal" },
    requirement: "1k Seguidores + 50h en web",
  },
];

export default function MembershipsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="font-pixel text-sm text-neon-yellow mb-2">⭐ MEMBRESÍAS</h1>
        <p className="text-xs text-muted-foreground font-body">Elige el plan que mejor se adapte a tu estilo</p>
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
            <h3 className={cn("font-pixel text-[11px] mb-1", tier.textColor)}>{tier.name}</h3>
            <p className="text-lg font-bold font-body text-foreground mb-3">{tier.price}</p>
            {tier.requirement && (
              <p className="text-[10px] text-muted-foreground font-body mb-2 italic">Requisito: {tier.requirement}</p>
            )}
            <div className="space-y-1.5 text-[11px] font-body">
              <div className="flex justify-between"><span className="text-muted-foreground">Subida</span><span className="text-foreground">{tier.features.upload}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Publicidad</span>{tier.features.ads ? <span className="text-destructive">Con anuncios</span> : <span className="text-neon-green">Sin anuncios</span>}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">Avatar</span><span className="text-foreground">{tier.features.avatar}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Mensajes</span><span className="text-foreground">{tier.features.messages}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rango</span><span className="text-foreground">{tier.features.rank}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">VIP</span>{tier.features.vip ? <span className="text-foreground">{tier.features.vip}</span> : <X className="w-3 h-3 text-destructive" />}</div>
            </div>
            <Button className="w-full mt-4 h-8 text-xs font-body bg-primary text-primary-foreground hover:bg-primary/80 transition-all duration-200">
              {tier.price === "Gratis" ? "Plan Actual" : "Suscribirse"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
