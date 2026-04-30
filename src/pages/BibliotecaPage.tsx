import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Monitor, Play, User, Lightbulb, Trophy, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { allGames } from "@/lib/gameLibrary";

const games = allGames || [];

type ConsoleType = "nes" | "snes" | "gba" | "n64";

// 🔥 PESTAÑAS EXACTAS DEL EMULATORPAGE 🔥
const consoles: { id: ConsoleType; label: string; color: string }[] = [
  { id: "nes", label: "NES", color: "text-neon-green" },
  { id: "snes", label: "SNES", color: "text-neon-cyan" },
  { id: "gba", label: "Game Boy Advance", color: "text-neon-magenta" },
  { id: "n64", label: "Nintendo 64", color: "text-[#ffff00]" },
];

// 🔥 COMPONENTE DE LEADERBOARD CLONADO DEL EMULATORPAGE 🔥
function LeaderboardConsole({ consoleId, colorClass }: { consoleId: string; colorClass: string }) {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchScores = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leaderboard_scores")
        .select(`*, profiles(display_name, avatar_url, color_name)`)
        .eq("console_type", consoleId)
        .order("score", { ascending: false })
        .limit(20);
      
      if (isMounted) {
        if (data && !error) {
          // Filtrar para mostrar solo el mejor puntaje de cada usuario
          const uniqueUsers = new Set();
          const filtered = data.filter((s: any) => {
            if (uniqueUsers.has(s.user_id)) return false;
            uniqueUsers.add(s.user_id);
            return true;
          }).slice(0, 10);
          setScores(filtered);
        }
        setLoading(false);
      }
    };
    fetchScores();
    return () => { isMounted = false; };
  }, [consoleId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 opacity-50">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <p className="text-[10px] font-pixel uppercase">Cargando récords...</p>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-xs text-muted-foreground font-body italic">No hay récords en esta consola aún.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {scores.map((s, i) => (
        <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/20 border border-white/5 hover:bg-muted/40 transition-colors">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className={cn("font-pixel text-[10px] w-4 text-center shrink-0", i === 0 ? "text-neon-yellow" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground")}>
              #{i + 1}
            </span>
            <div className="w-8 h-8 rounded-full bg-black overflow-hidden border border-white/10 shrink-0">
              {s.profiles?.avatar_url ? <img src={s.profiles.avatar_url} className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-2 text-muted-foreground" />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-foreground truncate" style={s.profiles?.color_name ? { color: s.profiles.color_name } : {}}>
                {s.profiles?.display_name || "Anónimo"}
              </span>
              <span className="text-[9px] text-muted-foreground font-body uppercase truncate max-w-[120px]">
                {s.game_name}
              </span>
            </div>
          </div>
          <span className={cn("font-pixel text-[11px] shrink-0", colorClass.split(' ')[0])}>
            {s.score.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function BibliotecaPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ConsoleType>("snes");

  // Estados para Sugerencias
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  // Filtrado de juegos
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConsole = game.console === activeTab;
      return matchesSearch && matchesConsole;
    });
  }, [searchQuery, activeTab]);

  const activeColor = consoles.find(c => c.id === activeTab)?.color || "";

  // ENVIAR SUGERENCIA (CON BOT DE NOTIFICACIÓN)
  const handleSubmit = async () => {
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
    if (!gameName.trim()) return;
    
    setSending(true);
    try {
      const { error } = await supabase.from("game_suggestions").insert({
        user_id: user.id, console_type: activeTab, game_name: gameName.trim(), description: description.trim(),
      } as any);

      if (error) throw error;

      // Bot notificador
      const { data: staffRoles } = await supabase.from("user_roles").select("user_id").in("role", ["master_web", "admin", "moderator"]);
      if (staffRoles && staffRoles.length > 0) {
        const staffIds = Array.from(new Set(staffRoles.map(r => r.user_id)));
        const messageContent = `🤖 [BOT SISTEMA] NUEVA SUGERENCIA:\n\n🎮 Juego: ${gameName}\n🕹️ Consola: ${activeTab.toUpperCase()}\n💬 Comentario: ${description || "Sin comentario."}`;

        const messages = staffIds.map(id => ({
          sender_id: user.id, receiver_id: id, content: messageContent, is_read: false
        }));
        await supabase.from("inbox_messages").insert(messages as any);
      }

      toast({ title: "Sugerencia enviada", description: "El staff la revisará pronto" }); 
      setGameName(""); 
      setDescription("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo enviar.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto pb-12 px-4 md:px-0">
      
      {/* HEADER IDÉNTICO AL EMULATORPAGE */}
      <div className="flex items-center gap-3 mb-6">
        <Monitor className="w-6 h-6 text-neon-cyan" />
        <div>
          <h1 className="font-pixel text-xl text-neon-cyan uppercase">Salas de Arcade</h1>
          <p className="text-[11px] text-muted-foreground font-body">Selecciona una consola y elige un juego para empezar</p>
        </div>
      </div>

      {/* PESTAÑAS IDÉNTICAS AL EMULATORPAGE */}
      <div className="flex gap-2 border-b border-white/5 pb-0 overflow-x-auto custom-scrollbar">
        {consoles.map((c) => (
          <button
            key={c.id}
            onClick={() => { setActiveTab(c.id); setSearchQuery(""); }}
            className={cn(
              "px-6 py-3 font-pixel text-[10px] uppercase transition-all whitespace-nowrap",
              activeTab === c.id
                ? `bg-white/5 border-t-2 border-t-current ${c.color} opacity-100`
                : "border-t-2 border-t-transparent text-muted-foreground opacity-50 hover:opacity-100 hover:bg-white/5"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* BUSCADOR COMPACTO */}
      <div className="relative w-full max-w-sm mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder={`Buscar en ${activeTab.toUpperCase()}...`} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-card border-border font-body text-xs h-9 focus:border-neon-cyan"
        />
      </div>

      {/* GRID DE JUEGOS (5 COLUMNAS) */}
      {filteredGames.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-lg p-12 text-center shadow-sm mt-6">
           <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
           <p className="text-xs text-muted-foreground font-body max-w-md mx-auto leading-relaxed">
             {activeTab === "n64" 
               ? "Próximamente se subirán los juegos de Nintendo 64 a través de nuestro servidor en la base de datos." 
               : "No encontramos juegos que coincidan con tu búsqueda en esta consola."}
           </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
          {filteredGames.map((game) => (
            <Link 
              to={`/arcade/salas?console=${activeTab}&game=${game.id}`}
              key={game.id}
              className="group flex flex-col bg-card border border-border rounded-lg overflow-hidden hover:border-neon-cyan/50 transition-all text-left shadow-sm"
            >
              <div className="relative aspect-[3/4] w-full bg-black overflow-hidden">
                <img 
                  src={game.coverUrl} 
                  alt={game.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Play className="w-12 h-12 text-white/80 group-hover:text-neon-cyan transition-colors" />
                </div>
              </div>
              <div className="p-3 border-t border-border bg-black/20">
                <h4 className="font-pixel text-[9px] text-muted-foreground group-hover:text-foreground line-clamp-1 truncate w-full" title={game.name}>
                  {game.name}
                </h4>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* SECCIÓN INFERIOR COMPACTA (SUGERENCIAS Y LEADERBOARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t border-border/50">
         
         {/* COLUMNA IZQUIERDA: SUGERENCIAS */}
         <div className="md:col-span-1">
           <div className="bg-card border border-neon-cyan/20 rounded-lg p-3 space-y-2 sticky top-4">
             <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1">
               <Lightbulb className="w-3 h-3" /> SUGERIR UN JUEGO
             </h3>
             <Input placeholder="Nombre del juego" value={gameName} onChange={e => setGameName(e.target.value)} className="h-7 bg-muted text-xs font-body" />
             <Textarea placeholder="¿Por qué lo recomiendas? (opcional)" value={description} onChange={e => setDescription(e.target.value)} className="bg-muted text-xs font-body min-h-[40px] resize-none" />
             <Button size="sm" onClick={handleSubmit} disabled={sending} className="w-full h-7 text-[9px] font-pixel bg-neon-cyan text-black hover:bg-neon-cyan/80">
               {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : "ENVIAR AL STAFF"}
             </Button>
           </div>
         </div>

         {/* COLUMNA DERECHA: LEADERBOARDS */}
         <div className="md:col-span-2">
           <div className="bg-card border border-border rounded-lg p-4">
             <h3 className={cn("font-pixel text-[11px] flex items-center gap-2 mb-4 uppercase", activeColor)}>
               <Trophy className="w-4 h-4" /> Top Récords {activeTab}
             </h3>
             {/* Componente que carga y renderiza el Top 10 */}
             <LeaderboardConsole consoleId={activeTab} colorClass={activeColor} />
           </div>
         </div>

      </div>
    </div>
  );
}