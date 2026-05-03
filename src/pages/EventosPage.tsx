import { useState, useEffect } from "react";
import { Calendar, Gamepad2, Tv, Bike, Plus, Send, X, Sparkles, MonitorPlay, Gift, Users, Mic, Star, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type EventType = "all" | "torneo" | "estreno" | "rodada" | "stream" | "sorteo" | "comunidad" | "podcast" | "otro";

const eventTabs: { id: EventType; label: string; icon: React.ElementType; color: string }[] = [
  { id: "all", label: "Todos", icon: Calendar, color: "text-foreground" },
  { id: "torneo", label: "Torneos Gaming", icon: Gamepad2, color: "text-neon-green" },
  { id: "estreno", label: "Estrenos", icon: Tv, color: "text-neon-cyan" },
  { id: "rodada", label: "Rodadas", icon: Bike, color: "text-neon-magenta" },
  { id: "stream", label: "Streams", icon: MonitorPlay, color: "text-neon-yellow" },
  { id: "sorteo", label: "Sorteos", icon: Gift, color: "text-green-400" },
  { id: "comunidad", label: "Comunidad", icon: Users, color: "text-blue-400" },
  { id: "podcast", label: "Podcasts", icon: Mic, color: "text-purple-400" },
  { id: "otro", label: "Otros", icon: Star, color: "text-orange-400" },
];

const TITLE_ICONS = ["🎮","🕹️","🏆","🎯","⚔️","🎬","📺","🍿","🏍️","🛣️","🌟","🔥","⚡","🎉","💎","👾","🎊","🚀","🎤","🎧"];
const COLOR_OPTIONS = [
  { name: "Verde", value: "text-neon-green" },
  { name: "Cian", value: "text-neon-cyan" },
  { name: "Magenta", value: "text-neon-magenta" },
  { name: "Amarillo", value: "text-neon-yellow" },
  { name: "Blanco", value: "text-foreground" },
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
  const { user, isStaff } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<EventType>("all");
  const [dbEvents, setDbEvents] = useState<any[]>([]);

  // Sugerir evento
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [sgTitle, setSgTitle] = useState("");
  const [sgType, setSgType] = useState<EventType>("torneo");
  const [sgDate, setSgDate] = useState("");
  const [sgTime, setSgTime] = useState("");
  const [sgLocation, setSgLocation] = useState("");
  const [sgDescription, setSgDescription] = useState("");
  const [sending, setSending] = useState(false);

  // Crear/Editar evento (staff)
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [crIcon, setCrIcon] = useState("🎮");
  const [crColor, setCrColor] = useState(COLOR_OPTIONS[0].value);
  const [crTitle, setCrTitle] = useState("");
  const [crType, setCrType] = useState<EventType>("torneo");
  const [crDate, setCrDate] = useState("");
  const [crTime, setCrTime] = useState("");
  const [crLocation, setCrLocation] = useState("");
  const [crDescription, setCrDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    if (data) setDbEvents(data);
  };

  useEffect(() => { fetchEvents(); }, []);

  const allEvents = [...dbEvents, ...placeholderEvents.filter(pe => !dbEvents.some(de => de.title === pe.title))];
  const filtered = filter === "all" ? allEvents : allEvents.filter(e => e.event_type === filter);

  const typeColors: Record<string, string> = { 
    torneo: "text-neon-green", 
    estreno: "text-neon-cyan", 
    rodada: "text-neon-magenta",
    stream: "text-neon-yellow",
    sorteo: "text-green-400",
    comunidad: "text-blue-400",
    podcast: "text-purple-400",
    otro: "text-orange-400"
  };
  
  const typeIcons: Record<string, React.ElementType> = { 
    torneo: Gamepad2, 
    estreno: Tv, 
    rodada: Bike,
    stream: MonitorPlay,
    sorteo: Gift,
    comunidad: Users,
    podcast: Mic,
    otro: Star
  };

  const handleSuggest = async () => {
    if (!user) { toast({ title: "Inicia sesión para sugerir", variant: "destructive" }); return; }
    if (!sgTitle.trim()) { toast({ title: "Falta el título", variant: "destructive" }); return; }
    setSending(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
      const name = profile?.display_name || 'Usuario';
      
      const content = `[COLOR:#ef4444]🤖 [SISTEMA] NUEVA SUGERENCIA DE EVENTO[/COLOR]

[COLOR:#3b82f6]👤 Sugerido por: ${name}[/COLOR]
[COLOR:#06b6d4]📧 Email: ${user.email || 'desconocido'}[/COLOR]

[COLOR:#eab308]🏷️ Título: ${sgTitle}[/COLOR]
[COLOR:#ffffff]🎯 Tipo: ${sgType.toUpperCase()}[/COLOR]
[COLOR:#ffffff]📅 Fecha: ${sgDate || '—'}[/COLOR]
[COLOR:#ffffff]🕐 Hora: ${sgTime || '—'}[/COLOR]
[COLOR:#06b6d4]📍 Lugar: ${sgLocation || '—'}[/COLOR]

[COLOR:#ffffff]💬 Descripción:
${sgDescription || 'Sin descripción.'}[/COLOR]

[COLOR:#3b82f6]🔗 ENLACE:[/COLOR] [LINK:${typeof window !== 'undefined' ? window.location.origin + '/eventos' : ''}]Ir a Eventos[/LINK]`;

      const { error } = await supabase.rpc("send_system_staff_message", {
        p_title: `Sugerencia de evento: ${sgTitle}`,
        p_content: content,
        p_message_type: 'event_suggestion',
      });
      if (error) throw error;
      toast({ title: "Sugerencia enviada", description: "El staff la revisará pronto" });
      setSuggestOpen(false);
      setSgTitle(""); setSgDate(""); setSgTime(""); setSgLocation(""); setSgDescription("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSending(false); }
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setCrIcon("🎮");
    setCrTitle("");
    setCrType("torneo");
    setCrDate("");
    setCrTime("");
    setCrLocation("");
    setCrDescription("");
    setCrColor(COLOR_OPTIONS[0].value);
    setCreateOpen(true);
  };

  const handleEditClick = (ev: any) => {
    setEditingId(ev.id);
    const firstSpace = ev.title.indexOf(" ");
    let titleText = ev.title;
    let iconText = "🎮";
    if (firstSpace !== -1) {
      const possibleIcon = ev.title.substring(0, firstSpace);
      if (TITLE_ICONS.includes(possibleIcon)) {
        iconText = possibleIcon;
        titleText = ev.title.substring(firstSpace + 1);
      }
    }
    
    setCrIcon(iconText);
    setCrTitle(titleText);
    setCrType(ev.event_type);
    setCrDate(ev.event_date || "");
    setCrTime(ev.event_time || "");
    setCrLocation(ev.location || "");
    setCrDescription(ev.description || "");
    setCrColor(ev.image_url || COLOR_OPTIONS[0].value);
    setCreateOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este evento?")) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Evento eliminado" });
      fetchEvents();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!user || !isStaff) return;
    if (!crTitle.trim()) { toast({ title: "Falta el título", variant: "destructive" }); return; }
    setCreating(true);
    try {
      const fullTitle = `${crIcon} ${crTitle}`.trim();
      const payload = {
        title: fullTitle,
        description: crDescription,
        event_type: crType,
        event_date: crDate || null,
        event_time: crTime || null,
        location: crLocation || null,
        image_url: crColor, // reutilizamos para guardar la clase de color del título
      };

      if (editingId) {
        const { error } = await supabase.from("events").update(payload as any).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Evento actualizado" });
      } else {
        const { error } = await supabase.from("events").insert({ ...payload, created_by: user.id } as any);
        if (error) throw error;
        toast({ title: "Evento creado" });
      }
      
      setCreateOpen(false);
      fetchEvents();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-border rounded p-4">
        <h1 className="font-pixel text-sm text-neon-cyan text-glow-cyan mb-1 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> EVENTOS
        </h1>
        <p className="text-xs text-muted-foreground font-body">Torneos gaming, estrenos de anime y rodadas</p>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {/* 🔥 FILTRO DESPLEGABLE EN LUGAR DE MÚLTIPLES BOTONES 🔥 */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as EventType)}
          className="h-8 rounded-md border border-border bg-card text-xs font-body px-3 text-foreground outline-none focus:border-neon-cyan/50 transition-colors"
        >
          {eventTabs.map(tab => (
            <option key={tab.id} value={tab.id}>{tab.label}</option>
          ))}
        </select>
        
        <div className="flex-1" />
        
        <Button size="sm" variant="outline" onClick={() => setSuggestOpen(true)}
          className="text-xs font-body border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/10">
          <Sparkles className="w-3 h-3 mr-1" /> Sugerir evento
        </Button>
        {isStaff && (
          <Button size="sm" onClick={openCreateDialog}
            className="text-xs font-body font-bold bg-neon-magenta text-background hover:bg-neon-magenta/80 shadow-[0_0_15px_rgba(236,72,153,0.4)]">
            <Plus className="w-3 h-3 mr-1" /> Crear evento
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map(event => {
          const Icon = typeIcons[event.event_type] || Calendar;
          const titleColor = (event.image_url && event.image_url.startsWith("text-")) ? event.image_url : null;
          return (
            <div key={event.id} className="bg-card border border-border rounded p-4 hover:border-neon-cyan/30 transition-all duration-300">
              <div className="flex items-start gap-3">
                <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", typeColors[event.event_type] || "text-foreground")} />
                <div className="min-w-0 flex-1">
                  <span className={cn("text-[9px] font-pixel", typeColors[event.event_type])}>{event.event_type?.toUpperCase()}</span>
                  <h3 className={cn("text-sm font-body font-medium mt-0.5", titleColor || "text-foreground")}>{event.title}</h3>
                  <p className="text-xs text-muted-foreground font-body mt-1">{event.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-body text-muted-foreground">
                    {event.event_date && <span>📅 {event.event_date}</span>}
                    {event.event_time && <span>🕐 {event.event_time}</span>}
                    {event.location && <span className="flex items-center gap-0.5">📍 {event.location}</span>}
                  </div>

                  {/* 🔥 BOTONES DE EDICIÓN Y ELIMINACIÓN PARA EL STAFF 🔥 */}
                  {/* Se ocultan en los placeholders ("p1", "p2") porque no existen en la base de datos real */}
                  {isStaff && !event.id.startsWith("p") && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                      <Button variant="ghost" size="sm" onClick={() => handleEditClick(event)} className="h-6 text-[10px] font-body px-2 text-neon-cyan hover:bg-neon-cyan/10">
                        <Edit className="w-3 h-3 mr-1" /> Editar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(event.id)} className="h-6 text-[10px] font-body px-2 text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                      </Button>
                    </div>
                  )}

                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SUGERIR EVENTO */}
      <Dialog open={suggestOpen} onOpenChange={setSuggestOpen}>
        <DialogContent className="bg-card border-neon-cyan/30 max-w-md shadow-[0_0_50px_rgba(34,211,238,0.15)]">
          <DialogHeader>
            <DialogTitle className="font-pixel text-[11px] text-neon-cyan flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> SUGERIR EVENTO
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
            <Input placeholder="Título del evento *" value={sgTitle} onChange={e => setSgTitle(e.target.value)} className="bg-black/40 text-xs" maxLength={120} />
            <select value={sgType} onChange={e => setSgType(e.target.value as any)} className="w-full h-9 rounded-md border border-border bg-black/40 text-xs px-3 text-foreground outline-none">
              {eventTabs.filter(t => t.id !== "all").map(t => (
                 <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={sgDate} onChange={e => setSgDate(e.target.value)} className="bg-black/40 text-xs" />
              <Input type="time" value={sgTime} onChange={e => setSgTime(e.target.value)} className="bg-black/40 text-xs" />
            </div>
            <Input placeholder="Lugar / plataforma" value={sgLocation} onChange={e => setSgLocation(e.target.value)} className="bg-black/40 text-xs" maxLength={200} />
            <Textarea placeholder="Descripción / por qué es relevante..." value={sgDescription} onChange={e => setSgDescription(e.target.value)} className="bg-black/40 text-xs min-h-[100px]" maxLength={1000} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button variant="outline" size="sm" onClick={() => setSuggestOpen(false)} className="text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleSuggest} disabled={sending} className="text-xs font-pixel bg-neon-cyan text-background hover:bg-neon-cyan/80">
              <Send className="w-3 h-3 mr-1" /> {sending ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CREAR/EDITAR EVENTO (STAFF) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-neon-magenta/30 max-w-lg shadow-[0_0_50px_rgba(236,72,153,0.15)]">
          <DialogHeader>
            <DialogTitle className="font-pixel text-[11px] text-neon-magenta flex items-center gap-2">
              {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
              {editingId ? "EDITAR EVENTO" : "CREAR EVENTO"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
            <div>
              <label className="text-[10px] font-pixel text-muted-foreground uppercase tracking-widest block mb-1">Icono del título</label>
              <div className="flex flex-wrap gap-1 p-2 bg-black/40 rounded border border-border">
                {TITLE_ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setCrIcon(ic)}
                    className={cn("w-8 h-8 rounded text-base hover:bg-white/10 transition", crIcon === ic && "bg-neon-magenta/20 ring-1 ring-neon-magenta")}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-pixel text-muted-foreground uppercase tracking-widest block mb-1">Color del título</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button key={c.value} type="button" onClick={() => setCrColor(c.value)}
                    className={cn("px-3 h-7 rounded border text-[10px] font-pixel transition", c.value, crColor === c.value ? "border-neon-magenta bg-white/5" : "border-border")}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <Input placeholder="Título *" value={crTitle} onChange={e => setCrTitle(e.target.value)} className="bg-black/40 text-xs" maxLength={120} />
            <div className="text-[10px] text-muted-foreground font-body">
              Vista previa: <span className={cn("font-medium text-sm", crColor)}>{crIcon} {crTitle || "Tu evento"}</span>
            </div>
            <select value={crType} onChange={e => setCrType(e.target.value as any)} className="w-full h-9 rounded-md border border-border bg-black/40 text-xs px-3 text-foreground outline-none">
              {eventTabs.filter(t => t.id !== "all").map(t => (
                 <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={crDate} onChange={e => setCrDate(e.target.value)} className="bg-black/40 text-xs" />
              <Input type="time" value={crTime} onChange={e => setCrTime(e.target.value)} className="bg-black/40 text-xs" />
            </div>
            <Input placeholder="Lugar / plataforma" value={crLocation} onChange={e => setCrLocation(e.target.value)} className="bg-black/40 text-xs" maxLength={200} />
            <Textarea placeholder="Descripción del evento..." value={crDescription} onChange={e => setCrDescription(e.target.value)} className="bg-black/40 text-xs min-h-[100px]" maxLength={1000} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} className="text-xs">Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={creating} className="text-xs font-pixel bg-neon-magenta text-background hover:bg-neon-magenta/80">
              {editingId ? <Edit className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />} 
              {creating ? "Guardando..." : (editingId ? "Actualizar" : "Crear")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}