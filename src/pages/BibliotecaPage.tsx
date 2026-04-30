import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Gamepad2, AlertCircle, Library, Trophy, Send, Loader2 } from "lucide-react";
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

export default function BibliotecaPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConsole, setSelectedConsole] = useState<string>("todas");
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  // Estados para Leaderboards
  const [leaderboards, setLeaderboards] = useState<Record<string, Score[]>>({});
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(true);

  // Estados para Sugerencias
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestConsole, setSuggestConsole] = useState("snes");
  const [suggestComment, setSuggestComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const consoles = ["todas", "nes", "snes", "gba", "ps1", "n64", "sega"];
  const filterConsoles = consoles.filter(c => c !== "todas");

  // 🔥 FIX: Filtramos usando game.name en lugar de game.title 🔥
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConsole = selectedConsole === "todas" || game.console === selectedConsole;
      return matchesSearch && matchesConsole;
    });
  }, [searchQuery, selectedConsole]);

  const getConsoleColor = (consoleId: string) => {
    switch (consoleId) {
      case "nes": return "text-[#ff0000] border-[#ff0000]/30 bg-[#ff0000]/10";
      case "snes": return "text-[#a248ff] border-[#a248ff]/30 bg-[#a248ff]/10";
      case "gba": return "text-[#00ffff] border-[#00ffff]/30 bg-[#00ffff]/10";
      case "ps1": return "text-[#00ff00] border-[#00ff00]/30 bg-[#00ff00]/10";
      case "n64": return "text-[#ffff00] border-[#ffff00]/30 bg-[#ffff00]/10";
      case "sega": return "text-[#0088ff] border-[#0088ff]/30 bg-[#0088ff]/10";
      default: return "text-muted-foreground border-white/10 bg-white/5";
    }
  };

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
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto pb-12">
      
      {/* HEADER DE BIBLIOTECA */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <h1 className="font-pixel text-xl md:text-2xl text-neon-cyan mb-2 flex items-center gap-3 uppercase">
            <Library className="w-6 h-6" />
            Biblioteca de Roms
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-body">
            Explora nuestra colección completa de juegos retro. Juega directamente en tu navegador sin descargas.
          </p>
        </div>
      </div>

      {/* CONTROLES DE BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por título del juego..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 bg-card border-border font-body text-xs"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar shrink-0">
          {consoles.map(c => (
            <button
              key={c}
              onClick={() => setSelectedConsole(c)}
              className={cn(
                "px-4 h-10 rounded text-[9px] font-pixel uppercase tracking-widest shrink-0 transition-all border",
                selectedConsole === c 
                  ? "bg-neon-cyan text-black border-neon-cyan shadow-[0_0_10px_rgba(0,255,255,0.3)]" 
                  : "bg-card border-border/50 text-muted-foreground hover:text-white hover:border-white/30"
              )}
            >
              {c === "todas" ? "Todas" : c}
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE JUEGOS */}
      {filteredGames.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center shadow-lg">
           <AlertCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
           <h3 className="font-pixel text-sm text-muted-foreground uppercase mb-2">Sin Resultados</h3>
           <p className="text-xs font-body text-muted-foreground/70">No encontramos juegos que coincidan con tu búsqueda.</p>
           <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedConsole("todas"); }} className="mt-4 font-pixel text-[9px] uppercase">Ver todos los juegos</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredGames.map((game) => (
            <Link 
              to={`/arcade/salas?console=${game.console}&game=${game.id}`}
              key={`${game.console}-${game.id}`}
              onMouseEnter={() => setHoveredGame(game.id)}
              onMouseLeave={() => setHoveredGame(null)}
              className="group flex flex-col bg-card border border-border rounded-lg overflow-hidden hover:border-neon-cyan/50 transition-all hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(0,0,0,0.5)]"
            >
              <div className="relative aspect-[3/4] w-full bg-black overflow-hidden">
                {/* 🔥 FIX: Usamos game.name en el alt 🔥 */}
                <img 
                  src={game.coverUrl} 
                  alt={`Portada de ${game.name}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                   <Gamepad2 className="w-10 h-10 text-neon-cyan drop-shadow-md animate-pulse" />
                   <span className="font-pixel text-[9px] text-black bg-neon-cyan px-3 py-1.5 rounded uppercase tracking-widest shadow-[0_0_15px_rgba(0,255,255,0.5)]">
                     Jugar Ahora
                   </span>
                </div>
                <div className={cn("absolute top-2 right-2 px-2 py-1 rounded text-[8px] font-pixel uppercase font-bold border backdrop-blur-md shadow-sm z-10", getConsoleColor(game.console))}>
                  {game.console}
                </div>
              </div>
              <div className="p-3 border-t border-border flex flex-col items-center text-center bg-black/20 group-hover:bg-black/40 transition-colors">
                {/* 🔥 FIX: Usamos game.name en el título 🔥 */}
                <h3 className="font-pixel text-[10px] text-foreground group-hover:text-neon-cyan transition-colors line-clamp-1 leading-tight w-full truncate" title={game.name}>
                  {game.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* SECCIÓN INFERIOR: SUGERENCIAS Y LEADERBOARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-12 pt-8 border-t border-border">
         
         <div className="bg-card border border-border rounded-lg p-5 shadow-lg flex flex-col h-fit">
            <h3 className="font-pixel text-[11px] text-neon-cyan uppercase mb-4 flex items-center gap-2">
              <Send className="w-5 h-5" /> Sugerir un Juego
            </h3>
            <p className="text-xs text-muted-foreground font-body mb-5 leading-relaxed">
              ¿No encuentras tu juego favorito? Rellena este formulario y enviaremos una notificación directa a todo nuestro equipo de moderación para que lo suban.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-pixel text-foreground uppercase">Nombre del Juego</label>
                 <Input 
                   placeholder="Ej: Chrono Trigger" 
                   value={suggestTitle} 
                   onChange={e => setSuggestTitle(e.target.value)} 
                   className="h-10 bg-muted font-body text-xs" 
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-pixel text-foreground uppercase">Consola</label>
                 <select 
                   value={suggestConsole} 
                   onChange={e => setSuggestConsole(e.target.value)} 
                   className="w-full h-10 bg-muted border border-border rounded-md px-3 text-xs font-body text-foreground outline-none focus:border-neon-cyan transition-colors"
                 >
                   {filterConsoles.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                 </select>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-pixel text-foreground uppercase">Comentario Adicional (Opcional)</label>
                 <Textarea 
                   placeholder="Añade algún detalle sobre la versión, idioma, etc..." 
                   value={suggestComment} 
                   onChange={e => setSuggestComment(e.target.value)} 
                   className="resize-none h-20 bg-muted font-body text-xs" 
                 />
              </div>

              <Button 
                onClick={handleSuggestGame} 
                disabled={isSubmitting || !suggestTitle.trim()} 
                className="w-full h-12 bg-neon-cyan text-black hover:bg-neon-cyan/80 font-pixel text-[10px] uppercase shadow-[0_0_15px_rgba(0,255,255,0.3)] mt-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "ENVIAR SUGERENCIA AL STAFF"}
              </Button>
            </div>
         </div>

         <div className="bg-card border border-border rounded-lg p-5 shadow-lg flex flex-col h-fit">
            <h3 className="font-pixel text-[11px] text-neon-green uppercase mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5" /> Top Récords Globales
            </h3>
            <p className="text-xs text-muted-foreground font-body mb-5 leading-relaxed">
              Descubre quiénes son los mejores jugadores de nuestra comunidad agrupados por su consola favorita.
            </p>

            {loadingLeaderboards ? (
              <div className="py-12 flex flex-col items-center justify-center opacity-50">
                 <Loader2 className="w-8 h-8 animate-spin text-neon-green mb-3" />
                 <p className="text-[10px] font-pixel uppercase tracking-widest text-neon-green">Cargando Récords...</p>
              </div>
            ) : Object.keys(leaderboards).length === 0 ? (
              <div className="py-12 text-center">
                 <p className="text-xs text-muted-foreground font-body italic">Aún no hay récords registrados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filterConsoles.map(c => {
                   const scores = leaderboards[c];
                   if (!scores || scores.length === 0) return null;
                   return (
                     <div key={c} className="bg-muted/10 border border-white/5 rounded-lg p-3">
                       <h4 className={cn("font-pixel text-[9px] uppercase mb-3 pb-2 border-b", getConsoleColor(c).replace("bg", "border").replace("/10", "/30"))}>
                         Top {c}
                       </h4>
                       <div className="space-y-2">
                         {scores.map((score, idx) => (
                           <div key={score.id} className="flex items-center justify-between bg-black/40 p-1.5 rounded border border-white/5 hover:border-neon-green/30 transition-colors">
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