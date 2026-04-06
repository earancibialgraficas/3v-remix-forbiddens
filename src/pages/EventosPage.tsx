import { useState, useEffect } from "react";
import { Calendar, Gamepad2, Tv, Bike, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type EventType = "all" | "torneo" | "estreno" | "rodada";

const eventTabs: { id: EventType; label: string; icon: React.ElementType; color: string }[] = [
  { id: "all", label: "Todos", icon: Calendar, color: "text-foreground" },
  { id: "torneo", label: "Torneos Gaming", icon: Gamepad2, color: "text-neon-green" },
  { id: "estreno", label: "Estrenos", icon: Tv, color: "text-neon-cyan" },
  { id: "rodada", label: "Rodadas", icon: Bike, color: "text-neon-magenta" },
];

const placeholderEvents = [
  { id: "p1", title: "Torneo Retro: Super Mario Bros 3", description: "Inscripciones abiertas. Premios para top 3.", event_type: "torneo", event_date: "2026-04-20", event_time: "18:00", location: "Discord FORBIDDENS" },
  { id: "p2", title: "Estreno: One Piece temporada 3", description: "Nuevo arco en Crunchyroll. Discusión en el foro.", event_type: "estreno", event_date: "2026-04-15", event_time: "14:00", location: "Crunchyroll" },
  { id: "p3", title: "Rodada nocturna CDMX", description: "Punto de encuentro: Reforma 222. Ruta hacia Coyoacán.", event_type: "rodada", event_date: "2026-04-18", event_time: "20:00", location: "Reforma 222, CDMX" },
  { id: "p4", title: "Juegos gratis en Epic Games", description: "Esta semana: Celeste y Hollow Knight gratis en Epic Store.", event_type: "torneo", event_date: "2026-04-12", event_time: "00:00", location: "Epic Games Store" },
  { id: "p5", title: "Estreno: Attack on Titan Final", description: "Último episodio disponible en Netflix.", event_type: "estreno", event_date: "2026-04-25", event_time: "12:00", location: "Netflix" },
  { id: "p6", title: "Rodada Sierra de Guadarrama", description: "Ruta de montaña, nivel intermedio. Llevar casco y protección.", event_type: "rodada", event_date: "2026-04-22", event_time: "09:00", location: "Madrid, España" },
];

export default function EventosPage() {
  const [filter, setFilter] = useState<EventType>("all");
  const [dbEvents, setDbEvents] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("events").select("*").order("event_date", { ascending: true }).then(({ data }) => {
      if (data) setDbEvents(data);
    });
  }, []);

  const allEvents = [...dbEvents, ...placeholderEvents.filter(pe => !dbEvents.some(de => de.title === pe.title))];
  const filtered = filter === "all" ? allEvents : allEvents.filter(e => e.event_type === filter);

  const typeColors: Record<string, string> = { torneo: "text-neon-green", estreno: "text-neon-cyan", rodada: "text-neon-magenta" };
  const typeIcons: Record<string, React.ElementType> = { torneo: Gamepad2, estreno: Tv, rodada: Bike };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-border rounded p-4">
        <h1 className="font-pixel text-sm text-neon-cyan text-glow-cyan mb-1 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> EVENTOS
        </h1>
        <p className="text-xs text-muted-foreground font-body">Torneos gaming, estrenos de anime y rodadas</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {eventTabs.map(tab => (
          <Button key={tab.id} variant={filter === tab.id ? "default" : "outline"} size="sm" onClick={() => setFilter(tab.id)}
            className={cn("text-xs font-body transition-all", filter === tab.id ? "bg-primary text-primary-foreground" : "border-border")}>
            <tab.icon className="w-3 h-3 mr-1" /> {tab.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map(event => {
          const Icon = typeIcons[event.event_type] || Calendar;
          return (
            <div key={event.id} className="bg-card border border-border rounded p-4 hover:border-neon-cyan/30 transition-all duration-300">
              <div className="flex items-start gap-3">
                <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", typeColors[event.event_type] || "text-foreground")} />
                <div className="min-w-0 flex-1">
                  <span className={cn("text-[9px] font-pixel", typeColors[event.event_type])}>{event.event_type?.toUpperCase()}</span>
                  <h3 className="text-sm font-body font-medium text-foreground mt-0.5">{event.title}</h3>
                  <p className="text-xs text-muted-foreground font-body mt-1">{event.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-body text-muted-foreground">
                    {event.event_date && <span>📅 {event.event_date}</span>}
                    {event.event_time && <span>🕐 {event.event_time}</span>}
                    {event.location && <span className="flex items-center gap-0.5">📍 {event.location}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
