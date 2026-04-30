import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Gamepad2, AlertCircle, Trophy, Send, Loader2, MonitorPlay } from "lucide-react";
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

// 🔥 CONFIGURACIÓN EXACTA DEL DISEÑO DE EMULADORES 🔥
const CONSOLES = [
  { 
    id: "nes", 
    name: "Nintendo (NES)", 
    tabColor: "hover:border-[#ff0000] hover:bg-[#ff0000]/10 hover:text-[#ff0000]", 
    activeTab: "border-[#ff0000] bg-[#ff0000]/20 text-[#ff0000]",
    cardHover: "group-hover:border-[#ff0000] group-hover:shadow-[0_0_15px_rgba(255,0,0,0.4)]",
    iconColor: "text-[#ff0000]"
  },
  { 
    id: "snes", 
    name: "Super Nintendo", 
    tabColor: "hover:border-[#a248ff] hover:bg-[#a248ff]/10 hover:text-[#a248ff]", 
    activeTab: "border-[#a248ff] bg-[#a248ff]/20 text-[#a248ff]",
    cardHover: "group-hover:border-[#a248ff] group-hover:shadow-[0_0_15px_rgba(162,72,255,0.4)]",
    iconColor: "text-[#a248ff]"
  },
  { 
    id: "gba", 
    name: "GameBoy Advance", 
    tabColor: "hover:border-[#00ffff] hover:bg-[#00ffff]/10 hover:text-[#00ffff]", 
    activeTab: "border-[#00ffff] bg-[#00ffff]/20 text-[#00ffff]",
    cardHover: "group-hover:border-[#00ffff] group-hover:shadow-[0_0_15px_rgba(0,255,255,0.4)]",
    iconColor: "text-[#00ffff]"
  },
  { 
    id: "n64", 
    name: "Nintendo 64", 
    tabColor: "hover:border-[#ffff00] hover:bg-[#ffff00]/10 hover:text-[#ffff00]", 
    activeTab: "border-[#ffff00] bg-[#ffff00]/20 text-[#ffff00]",
    cardHover: "group-hover:border-[#ffff00] group-hover:shadow-[0_0_15px_rgba(255,255,0,0.4)]",
    iconColor: "text-[#ffff00]"
  }
];

export default function BibliotecaPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("snes"); // Por defecto SNES

  // Estados para Leaderboards
  const [leaderboards, setLeaderboards] = useState<Record<string, Score[]>>({});
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(true);

  // Estados para Sugerencias
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestConsole, setSuggestConsole] = useState("snes");
  const [suggestComment, setSuggestComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtramos la biblioteca por consola y búsqueda
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConsole = game.console === activeTab;
      return matchesSearch && matchesConsole;
    });
  }, [searchQuery, activeTab]);

  const activeConsoleConfig = CONSOLES.find(c => c.id === activeTab) || CONSOLES[1];

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
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto pb-12 px-2 md:px-0">
      
      {/* HEADER ESTILO EMULADORES */}
      <div className="flex flex-col gap-2 mb-6 mt-4">
        <h1 className="font-pixel text-2xl md:text-3xl text-neon-cyan uppercase flex items-center gap-3">
          <MonitorPlay className="w-8 h-8" /> Salas de Arcade
        </h1>
        <p className="text-sm text-muted-foreground font-body">
          Selecciona una consola para ver el catálogo y jugar directamente en tu navegador.
        </p>
      </div>

      {/* CONTROLES DE PESTAÑAS Y BÚSQUEDA */}
      <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar w-full md:w-auto shrink-0">
          {CONSOLES.map((c) => (
            <button
              key={c.id}
              onClick={() => { setActiveTab(c.id); setSearchQuery(""); }}
              className={cn(
                "px-4 py-2.5 rounded-md font-pixel text-[10px] uppercase transition-all border shrink-0",
                activeTab === c.id ? c.activeTab : `border-white/5 text-muted-foreground ${c.tabColor}`
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={`Buscar en ${activeConsoleConfig.name}...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-card border-white/10 font-body text-xs focus:border-neon-cyan transition-colors"
          />
        </div>
      </div>

      {/* GRID DE JUEGOS (5 COLUMNAS EN PC) */}
      {filteredGames.length === 0 ? (
        <div className="bg-card border border-white/5 rounded-lg p-12 md:p-16 flex flex-col items-center justify-center text-center shadow-lg">
           <AlertCircle className={cn("w-16 h-16 mb-4 opacity-50", activeConsoleConfig.iconColor)} />
           <h3 className="font-pixel text-sm text-foreground uppercase mb-2">Catálogo Vacío</h3>
           <p className="text-xs font-body text-muted-foreground/70 max-w-md leading-relaxed">
             {activeTab === "n64" 
               ? "Próximamente se subirán los juegos de Nintendo 64 a través de nuestro servidor de almacenamiento en la base de datos." 
               : "No encontramos juegos que coincidan con tu búsqueda en esta consola."}
           </p>
           {searchQuery && (
             <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-6 font-pixel text-[9px] uppercase border-white/10 hover:bg-white/5">
               Limpiar Búsqueda
             </Button>
           )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
          {filteredGames.map((game) => (
            <Link 
              to={`/arcade/salas?console=${game.console}&game=${game.id}`}
              key={`${game.console}-${game.id}`}
              className="group flex flex-col gap-2.5"
            >
              <div className={cn(
                "relative aspect-[3/4] w-full bg-black rounded-lg overflow-hidden border-2 border-white/5 transition-all duration-300",
                activeConsoleConfig.cardHover
              )}>
                <img 
                  src={game.coverUrl} 
                  alt={`Portada de ${game.name}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                   <Gamepad2 className={cn("w-12 h-12 drop-shadow-md animate-pulse", activeConsoleConfig.iconColor)} />
                </div>
              </div>
              
              <h3 className="font-pixel text-[10px] text-center text-muted-foreground group-hover:text-white transition-colors line-clamp-2 leading-snug px-1" title={game.name}>
                {game.name}
              </h3>
            </Link>
          ))}
        </div>
      )}

      {/* SECCIÓN INFERIOR: SUGERENCIAS Y LEADERBOARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-16 pt-8 border-t border-white/10">
         
         {/* Formulario de Sugerencia */}
         <div className="bg-card border border-white/5 rounded-lg p-6 shadow-lg flex flex-col h-fit">
            <h3 className="font-pixel text-[11px] text-neon-cyan uppercase mb-4 flex items-center gap-2">
              <Send className="w-5 h-5" /> Sugerir un Juego
            </h3>
            <p className="text-xs text-muted-foreground font-body mb-6 leading-relaxed">
              ¿No encuentras tu juego favorito? Rellena este formulario y enviaremos una notificación directa a todo nuestro equipo de moderación para que lo suban.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-pixel text-foreground uppercase opacity-80">Nombre del Juego</label>
                 <Input 
                   placeholder="Ej: Chrono Trigger" 
                   value={suggestTitle} 
                   onChange={e => setSuggestTitle(e.target.value)} 
                   className="h-10 bg-black/50 border-white/10 font-body text-xs" 
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-pixel text-foreground uppercase opacity-80">Consola</label>
                 <select 
                   value={suggestConsole} 
                   onChange={e => setSuggestConsole(e.target.value)} 
                   className="w-full h-10 bg-black/50 border border-white/10 rounded-md px-3 text-xs font-body text-foreground outline-none focus:border-neon-cyan transition-colors"
                 >
                   {CONSOLES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                 </select>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-pixel text-foreground uppercase opacity-80">Comentario (Opcional)</label>
                 <Textarea 
                   placeholder="Añade algún detalle sobre la versión, idioma, etc..." 
                   value={suggestComment} 
                   onChange={e => setSuggestComment(e.target.value)} 
                   className="resize-none h-20 bg-black/50 border-white/10 font-body text-xs" 
                 />
              </div>

              <Button 
                onClick={handleSuggestGame} 
                disabled={isSubmitting || !suggestTitle.trim()} 
                className="w-full h-12 bg-neon-cyan text-black hover:bg-neon-cyan/80 font-pixel text-[10px] uppercase mt-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "ENVIAR SUGERENCIA AL STAFF"}
              </Button>
            </div>
         </div>

         {/* Leaderboards Globales */}
         <div className="bg-card border border-white/5 rounded-lg p-6 shadow-lg flex flex-col h-fit">
            <h3 className="font-pixel text-[11px] text-neon-green uppercase mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" /> Top Récords Globales
            </h3>
            <p className="text-xs text-muted-foreground font-body mb-6 leading-relaxed">
              Descubre quiénes son los mejores jugadores de nuestra comunidad agrupados por su consola favorita.
            </p>

            {loadingLeaderboards ? (
              <div className="py-12 flex flex-col items-center justify-center opacity-50">
                 <Loader2 className="w-8 h-8 animate-spin text-neon-green mb-3" />
                 <p className="text-[10px] font-pixel uppercase tracking-widest text-neon-green">Cargando Récords...</p>
              </div>
            ) : Object.keys(leaderboards).length === 0 ? (
              <div className="py-12 text-center">
                 <p className="text-xs text-muted-foreground font-body italic opacity-60">Aún no hay récords registrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {CONSOLES.map(c => {
                   const scores = leaderboards[c.id];
                   if (!scores || scores.length === 0) return null;
                   return (
                     <div key={c.id} className="bg-muted/10 border border-white/5 rounded-lg p-3">
                       <h4 className={cn("font-pixel text-[9px] uppercase mb-3 pb-2 border-b border-white/10", c.iconColor)}>
                         Top {c.id}
                       </h4>
                       <div className="space-y-2">
                         {scores.map((score, idx) => (
                           <div key={score.id} className="flex items-center justify-between bg-black/40 p-2 rounded border border-white/5 hover:border-white/20 transition-colors">
                             <div className="flex items-center gap-2 overflow-hidden">
                               <span className={cn("font-pixel text-[8px]", idx === 0 ? "text-neon-yellow" : idx === 1 ? "text-slate-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground")}>
                                 #{idx + 1}
                               </span>
                               <span className="text-[10px] font-body text-foreground truncate max-w-[80px] font-medium" title={score.profiles?.display_name || "Anónimo"}>
                                 {score.profiles?.display_name || "Anónimo"}
                               </span>
                             </div>
                             <div className="flex flex-col items-end shrink-0 pl-2">
                               <span className="text-[9px] font-bold text-neon-green">{score.score.toLocaleString()}</span>
                               <span className="text-[7px] font-body text-muted-foreground uppercase truncate max-w-[60px]" title={score.game_name}>{score.game_name}</span>
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