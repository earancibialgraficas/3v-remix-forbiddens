import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Monitor, Play, AlertCircle, Trophy, Send, Loader2, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { allGames } from "@/lib/gameLibrary";

const games = allGames || [];

interface Score {
  id: string;
  game_name: string;
  console_type: string;
  score: number;
  profiles: { display_name: string } | null;
}

type ConsoleType = "nes" | "snes" | "gba" | "n64";

// 🔥 PESTAÑAS EXACTAS DEL EMULATORPAGE 🔥
const consoles: { id: ConsoleType; label: string; color: string }[] = [
  { id: "nes", label: "NES", color: "border-t-neon-green text-neon-green" },
  { id: "snes", label: "SNES", color: "border-t-neon-cyan text-neon-cyan" },
  { id: "gba", label: "Game Boy Advance", color: "border-t-neon-magenta text-neon-magenta" },
  { id: "n64", label: "Nintendo 64", color: "border-t-[#ffff00] text-[#ffff00]" },
];

export default function BibliotecaPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ConsoleType>("snes");

  // Estados para Leaderboards
  const [leaderboards, setLeaderboards] = useState<Record<string, Score[]>>({});
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(true);

  // Estados para Sugerencias
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestConsole, setSuggestConsole] = useState<ConsoleType>("snes");
  const [suggestComment, setSuggestComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrado de juegos
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConsole = game.console === activeTab;
      return matchesSearch && matchesConsole;
    });
  }, [searchQuery, activeTab]);

  // CARGAR LEADERBOARDS
  useEffect(() => {
    const fetchScores = async () => {
      setLoadingLeaderboards(true);
      const { data, error } = await supabase
        .from("leaderboard_scores")
        .select("id, game_name, console_type, score, profiles(display_name)")
        .order("score", { ascending: false })
        .limit(100);

      if (data && !error) {
         const grouped: Record<string, Score[]> = {};
         data.forEach((d: any) => {
           if (!grouped[d.console_type]) grouped[d.console_type] = [];
           if (grouped[d.console_type].length < 5) grouped[d.console_type].push(d);
         });
         setLeaderboards(grouped);
      }
      setLoadingLeaderboards(false);
    };
    fetchScores();
  }, []);

  // ENVIAR SUGERENCIA AL STAFF COMO UN BOT
  const handleSuggestGame = async () => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Debes estar conectado para sugerir un juego.", variant: "destructive" });
      return;
    }
    if (!suggestTitle.trim()) {
      toast({ title: "Faltan datos", description: "Por favor escribe el nombre del juego.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
       const { data: staffRoles } = await supabase.from("user_roles").select("user_id").in("role", ["master_web", "admin", "moderator"]);
       
       if (staffRoles && staffRoles.length > 0) {
          const staffIds = Array.from(new Set(staffRoles.map(r => r.user_id)));
          const messageContent = `🤖 [BOT SISTEMA] NUEVA SUGERENCIA DE JUEGO:\n\n🎮 Juego: ${suggestTitle}\n🕹️ Consola: ${suggestConsole.toUpperCase()}\n💬 Comentario: ${suggestComment || "Sin comentario adicional."}`;

          const messages = staffIds.map(id => ({
             sender_id: user.id, 
             receiver_id: id,
             content: messageContent,
             is_read: false
          }));

          await supabase.from("inbox_messages").insert(messages as any);
       }
       toast({ title: "¡Sugerencia enviada!", description: "El Staff ha recibido tu recomendación en su bandeja de entrada." });
       setSuggestTitle("");
       setSuggestComment("");
    } catch(e) {
       toast({ title: "Error", description: "Hubo un problema al enviar la sugerencia.", variant: "destructive" });
    } finally {
       setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto pb-20">
      
      {/* 🔥 HEADER EXACTO AL DE EMULATORPAGE 🔥 */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-neon-cyan/20 flex items-center justify-center border border-neon-cyan/50 shrink-0">
          <Monitor className="w-6 h-6 text-neon-cyan" />
        </div>
        <div>
          <h1 className="font-pixel text-xl text-neon-cyan uppercase">Salas de Arcade</h1>
          <p className="text-[11px] text-muted-foreground font-body">Selecciona una consola y elige un juego para empezar</p>
        </div>
      </div>

      {/* 🔥 PESTAÑAS EXACTAS AL DE EMULATORPAGE 🔥 */}
      <div className="flex gap-2 border-b border-border/50 pb-2 overflow-x-auto custom-scrollbar">
        {consoles.map((c) => (
          <button
            key={c.id}
            onClick={() => { setActiveTab(c.id); setSearchQuery(""); }}
            className={cn(
              "px-4 py-2 rounded-t-lg font-pixel text-[10px] uppercase transition-all shrink-0",
              activeTab === c.id
                ? `bg-muted/50 border-t-2 ${c.color}`
                : "text-muted-foreground hover:bg-muted/20 hover:text-foreground"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* BÚSQUEDA ADAPTADA AL DISEÑO */}
      <div className="relative w-full md:w-72">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input 
          placeholder="Buscar juego..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 bg-muted text-xs font-body border-border/50"
        />
      </div>

      {/* 🔥 GRID EXACTO AL DE EMULATORPAGE (5 COLUMNAS) 🔥 */}
      {filteredGames.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-lg p-12 text-center shadow-sm">
           <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
           <p className="text-xs text-muted-foreground font-body max-w-md mx-auto leading-relaxed">
             {activeTab === "n64" 
               ? "Próximamente se subirán los juegos de Nintendo 64 a través de nuestro servidor en la base de datos." 
               : "No encontramos juegos que coincidan con tu búsqueda en esta consola."}
           </p>
           {searchQuery && (
             <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4 font-pixel text-[9px] uppercase h-8">
               Limpiar Búsqueda
             </Button>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredGames.map((game) => (
            <Link 
              key={game.id}
              to={`/arcade/salas?console=${activeTab}&game=${game.id}`}
              className="group flex flex-col bg-card border border-border rounded-lg overflow-hidden hover:border-neon-cyan/50 transition-all text-left shadow-sm hover:shadow-md"
            >
              <div className="relative aspect-[3/4] w-full bg-black overflow-hidden">
                <img 
                  src={game.coverUrl} 
                  alt={game.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Play className="w-12 h-12 text-white/80 group-hover:text-neon-cyan transition-colors" />
                </div>
              </div>
              <div className="p-2 border-t border-border bg-black/20">
                <h4 className="font-pixel text-[9px] text-foreground group-hover:text-neon-cyan line-clamp-1 truncate w-full" title={game.name}>
                  {game.name}
                </h4>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 🔥 SECCIÓN INFERIOR: SUGERENCIAS Y LEADERBOARDS 🔥 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12 pt-8 border-t border-border/50">
         
         {/* Formulario de Sugerencias Adaptado al diseño de EmulatorPage */}
         <div className="bg-card border border-neon-cyan/20 rounded-lg p-4 shadow-sm flex flex-col h-fit">
            <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-2 mb-3">
              <Lightbulb className="w-3 h-3" /> SUGERIR UN JUEGO
            </h3>
            <p className="text-xs text-muted-foreground font-body mb-4 leading-relaxed">
              ¿Falta una joya en nuestra biblioteca? Escribe el nombre y el staff lo subirá pronto.
            </p>
            
            <div className="space-y-3">
              <Input 
                placeholder="Nombre del juego (Ej: Chrono Trigger)" 
                value={suggestTitle} 
                onChange={e => setSuggestTitle(e.target.value)} 
                className="h-8 bg-muted text-xs font-body border-border/50" 
              />

              <select 
                value={suggestConsole} 
                onChange={e => setSuggestConsole(e.target.value as ConsoleType)} 
                className="w-full h-8 bg-muted border border-border/50 rounded-md px-3 text-xs font-body text-muted-foreground outline-none focus:border-neon-cyan transition-colors"
              >
                {consoles.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>

              <Textarea 
                placeholder="¿Por qué lo recomiendas? (opcional)" 
                value={suggestComment} 
                onChange={e => setSuggestComment(e.target.value)} 
                className="resize-none min-h-[60px] bg-muted font-body text-xs border-border/50" 
              />

              <Button 
                size="sm"
                onClick={handleSuggestGame} 
                disabled={isSubmitting || !suggestTitle.trim()} 
                className="w-full bg-neon-cyan text-black hover:bg-neon-cyan/80 font-pixel text-[9px] uppercase shadow-[0_0_15px_rgba(0,255,255,0.2)] mt-1"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : "ENVIAR AL STAFF"}
              </Button>
            </div>
         </div>

         {/* Leaderboards Globales */}
         <div className="bg-card border border-border/50 rounded-lg p-4 shadow-sm flex flex-col h-fit">
            <h3 className="font-pixel text-[10px] text-neon-green flex items-center gap-2 mb-3">
              <Trophy className="w-3 h-3" /> TOP RÉCORDS GLOBALES
            </h3>
            <p className="text-xs text-muted-foreground font-body mb-4 leading-relaxed">
              Los mejores jugadores de la comunidad por consola.
            </p>

            {loadingLeaderboards ? (
              <div className="py-8 flex flex-col items-center justify-center opacity-50">
                 <Loader2 className="w-6 h-6 animate-spin text-neon-green mb-2" />
                 <p className="text-[9px] font-pixel uppercase tracking-widest text-neon-green">Cargando...</p>
              </div>
            ) : Object.keys(leaderboards).length === 0 ? (
              <div className="py-8 text-center">
                 <p className="text-xs text-muted-foreground font-body italic opacity-60">Aún no hay récords registrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {consoles.map(c => {
                   const scores = leaderboards[c.id];
                   if (!scores || scores.length === 0) return null;
                   
                   const titleColor = c.id === 'nes' ? 'text-neon-green border-neon-green/30' : c.id === 'snes' ? 'text-neon-cyan border-neon-cyan/30' : c.id === 'gba' ? 'text-neon-magenta border-neon-magenta/30' : 'text-[#ffff00] border-[#ffff00]/30';

                   return (
                     <div key={c.id} className="bg-muted/30 border border-white/5 rounded-lg p-2.5">
                       <h4 className={cn("font-pixel text-[8px] uppercase mb-2 pb-1.5 border-b", titleColor)}>
                         Top {c.label}
                       </h4>
                       <div className="space-y-1.5">
                         {scores.map((score, idx) => (
                           <div key={score.id} className="flex items-center justify-between bg-black/40 p-1.5 rounded border border-white/5">
                             <div className="flex items-center gap-2 overflow-hidden">
                               <span className={cn("font-pixel text-[8px]", idx === 0 ? "text-neon-yellow" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground")}>
                                 #{idx + 1}
                               </span>
                               <span className="text-[9px] font-body text-foreground truncate max-w-[80px]" title={score.profiles?.display_name || "Anónimo"}>
                                 {score.profiles?.display_name || "Anónimo"}
                               </span>
                             </div>
                             <div className="flex flex-col items-end shrink-0 pl-1">
                               <span className="text-[8px] font-bold text-neon-green">{score.score.toLocaleString()}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   );
                })}
              </div>
            )}
         </div>

      </div>
    </div>
  );
}