import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Gamepad2, Monitor, Trophy, Play, User, Lightbulb, Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { allGames } from "@/lib/gameLibrary";
import { supabase } from "@/integrations/supabase/client";

type ConsoleType = "nes" | "snes" | "gba" | "n64";

// 🔥 CONFIGURACIÓN DE CONSOLAS (CLONADO DE EMULATORPAGE) 🔥
const consoles: { id: ConsoleType; label: string; color: string }[] = [
  { id: "nes", label: "NES", color: "text-neon-green" },
  { id: "snes", label: "SNES", color: "text-neon-cyan" },
  { id: "gba", label: "Game Boy Advance", color: "text-neon-magenta" },
  { id: "n64", label: "Nintendo 64", color: "text-[#ffff00]" },
];

export default function BibliotecaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ConsoleType>("snes");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estados para Leaderboard dinámico
  const [scores, setScores] = useState<any[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);

  // Estados para Sugerencias
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  // Filtrado de juegos por búsqueda y por la pestaña activa
  const filteredGames = useMemo(() => {
    return allGames.filter((game) => {
      const matchesSearch = game.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConsole = game.console === activeTab;
      return matchesSearch && matchesConsole;
    });
  }, [searchQuery, activeTab]);

  // 🔥 LÓGICA DE LEADERBOARD (CLONADO DE EMULATORPAGE) 🔥
  useEffect(() => {
    const fetchScores = async () => {
      setLoadingScores(true);
      const { data, error } = await supabase
        .from("leaderboard_scores")
        .select(`*, profiles(display_name, avatar_url)`)
        .eq("console_type", activeTab)
        .order("score", { ascending: false })
        .limit(10);
      if (!error && data) setScores(data);
      setLoadingScores(false);
    };
    fetchScores();
  }, [activeTab]);

  // 🔥 SISTEMA DE SUGERENCIAS (CON NOTIFICACIÓN AL STAFF) 🔥
  const handleSuggestSubmit = async () => {
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
    if (!gameName.trim()) return;
    
    setSending(true);
    try {
      // 1. Guardar sugerencia
      await supabase.from("game_suggestions").insert({
        user_id: user.id, console_type: activeTab, game_name: gameName.trim(), description: description.trim(),
      } as any);

      // 2. Enviar mensaje al Inbox del Staff
      const { data: staffRoles } = await supabase.from("user_roles").select("user_id").in("role", ["master_web", "admin", "moderator"]);
      if (staffRoles && staffRoles.length > 0) {
        const staffIds = Array.from(new Set(staffRoles.map(r => r.user_id)));
        const messageContent = `🤖 [BOT BIBLIOTECA] NUEVA SUGERENCIA:\n🎮 Juego: ${gameName}\n🕹️ Consola: ${activeTab.toUpperCase()}\n💬 Motivo: ${description || "Sin descripción."}`;
        
        const notifications = staffIds.map(id => ({
          sender_id: user.id, receiver_id: id, content: messageContent, is_read: false
        }));
        await supabase.from("inbox_messages").insert(notifications as any);
      }

      toast({ title: "Sugerencia enviada", description: "El equipo de moderación ha sido notificado." });
      setGameName(""); setDescription("");
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto pb-20 px-4 md:px-0">
      
      {/* 🔥 HEADER EXACTO (Round Icon + Typography) 🔥 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/30 shrink-0 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
          <Monitor className="w-7 h-7 text-neon-cyan" />
        </div>
        <div>
          <h1 className="font-pixel text-2xl text-neon-cyan uppercase tracking-tighter leading-none">Salas de Arcade</h1>
          <p className="text-[11px] text-muted-foreground font-body mt-1.5">Elige una consola y prepárate para jugar</p>
        </div>
      </div>

      {/* 🔥 TABS EXACTAS (Border-top-2 + Font-pixel-10px) 🔥 */}
      <div className="flex gap-2 border-b border-white/5 pb-0 overflow-x-auto custom-scrollbar mb-6">
        {consoles.map((c) => (
          <button
            key={c.id}
            onClick={() => { setActiveTab(c.id); setSearchQuery(""); }}
            className={cn(
              "px-6 py-3 font-pixel text-[10px] uppercase transition-all shrink-0 border-t-2",
              activeTab === c.id
                ? `bg-white/5 border-t-current ${c.color} opacity-100`
                : "border-t-transparent text-muted-foreground opacity-50 hover:opacity-100 hover:bg-white/5"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* BARRA DE BÚSQUEDA ADAPTADA */}
      <div className="relative w-full md:w-80 mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder={`Buscar en ${activeTab.toUpperCase()}...`} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-black/20 border-white/10 font-body text-xs focus:border-neon-cyan"
        />
      </div>

      {/* GRID DE JUEGOS (5 COLUMNAS EN PC) */}
      {filteredGames.length === 0 ? (
        <div className="bg-card border border-white/5 rounded-xl p-16 text-center shadow-lg">
           <AlertCircle className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
           <p className="text-sm text-muted-foreground font-body max-w-md mx-auto leading-relaxed">
             {activeTab === "n64" 
               ? "Estamos preparando los juegos de Nintendo 64. Se subirán muy pronto directamente a la base de datos." 
               : "No hay resultados para esta búsqueda."}
           </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredGames.map((game) => (
            <Link 
              key={game.id}
              to={`/arcade/salas?console=${activeTab}&game=${game.id}`}
              className="group flex flex-col bg-card border border-white/5 rounded-lg overflow-hidden hover:border-neon-cyan/50 transition-all shadow-sm"
            >
              <div className="relative aspect-[3/4] w-full bg-black overflow-hidden">
                <img src={game.coverUrl} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-90 group-hover:opacity-100" loading="lazy" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Play className="w-12 h-12 text-white/80 group-hover:text-neon-cyan transition-all" />
                </div>
              </div>
              <div className="p-3 border-t border-white/5 bg-black/20 text-center">
                <h4 className="font-pixel text-[9px] text-muted-foreground group-hover:text-white truncate" title={game.name}>
                  {game.name}
                </h4>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 🔥 SECCIÓN INFERIOR: LEADERBOARD Y SUGERENCIAS (ESTILO EMULADOR) 🔥 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-20 pt-10 border-t border-white/10">
        
        {/* LEADERBOARD DINÁMICO POR CONSOLA */}
        <div className="bg-card border border-white/5 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-pixel text-[11px] text-neon-green flex items-center gap-2 uppercase">
              <Trophy className="w-4 h-4" /> MEJORES RÉCORDS {activeTab}
            </h3>
            <span className="text-[8px] font-pixel text-muted-foreground">TOP 10</span>
          </div>

          <div className="space-y-2 min-h-[300px]">
            {loadingScores ? (
              <div className="flex flex-col items-center justify-center h-full py-20 opacity-30">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : scores.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground italic text-xs font-body">No hay récords en esta consola aún.</div>
            ) : (
              scores.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between p-2.5 rounded bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className={cn("font-pixel text-[10px] w-5 text-center shrink-0", i === 0 ? "text-neon-yellow" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted-foreground")}>
                      #{i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-muted overflow-hidden border border-white/10 shrink-0">
                      {s.profiles?.avatar_url ? <img src={s.profiles.avatar_url} className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-1.5 text-muted-foreground" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-bold text-foreground group-hover:text-neon-green transition-colors truncate">{s.profiles?.display_name || "Anónimo"}</span>
                      <span className="text-[8px] text-muted-foreground font-body uppercase truncate">{s.game_name}</span>
                    </div>
                  </div>
                  <span className="font-pixel text-[11px] text-neon-green pr-2 shrink-0">{s.score.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FORMULARIO DE SUGERENCIAS */}
        <div className="bg-card border border-white/5 rounded-xl p-5 space-y-4 shadow-xl flex flex-col h-fit">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Lightbulb className="w-4 h-4 text-neon-cyan" />
            <h3 className="font-pixel text-[11px] text-neon-cyan uppercase">Sugerir un Juego</h3>
          </div>
          
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            ¿Buscas un juego que no está? Cuéntanos qué título te gustaría ver en la biblioteca de <span className="text-foreground font-bold">{activeTab.toUpperCase()}</span>.
          </p>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
               <label className="text-[9px] font-pixel text-muted-foreground uppercase pl-1">Nombre del juego</label>
               <Input 
                 placeholder="Ej: Donkey Kong Country" 
                 value={gameName} 
                 onChange={e => setGameName(e.target.value)} 
                 className="h-10 bg-black/30 border-white/10 text-xs font-body" 
               />
            </div>
            <div className="space-y-1.5">
               <label className="text-[9px] font-pixel text-muted-foreground uppercase pl-1">¿Por qué lo recomiendas?</label>
               <Textarea 
                 placeholder="Opcional..." 
                 value={description} 
                 onChange={e => setDescription(e.target.value)} 
                 className="min-h-[100px] bg-black/30 border-white/10 text-xs font-body resize-none" 
               />
            </div>
            <Button 
              onClick={handleSuggestSubmit} 
              disabled={sending || !gameName.trim()} 
              className="w-full h-11 bg-neon-cyan text-black hover:bg-neon-cyan/80 font-pixel text-[10px] uppercase shadow-[0_0_20px_rgba(0,240,255,0.2)] mt-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "ENVIAR SUGERENCIA AL STAFF"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}