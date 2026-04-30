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

// 🔥 CONFIGURACIÓN DE CONSOLAS (MISMO DISEÑO QUE EMULATORPAGE) 🔥
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
  
  // Estados para Leaderboard
  const [scores, setScores] = useState<any[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);

  // Estados para Sugerencias
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  // Filtrado de juegos
  const filteredGames = useMemo(() => {
    return allGames.filter((game) => {
      const matchesSearch = game.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConsole = game.console === activeTab;
      return matchesSearch && matchesConsole;
    });
  }, [searchQuery, activeTab]);

  // 🔥 CARGAR LEADERBOARD (CÓDIGO DE EMULATORPAGE) 🔥
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

  // 🔥 ENVIAR SUGERENCIA AL STAFF (BOT SISTEMA) 🔥
  const handleSuggestSubmit = async () => {
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
    if (!gameName.trim()) return;
    
    setSending(true);
    try {
      // 1. Guardar en tabla de sugerencias
      await supabase.from("game_suggestions").insert({
        user_id: user.id, console_type: activeTab, game_name: gameName.trim(), description: description.trim(),
      } as any);

      // 2. Notificar al Staff vía Inbox (Bot)
      const { data: staffRoles } = await supabase.from("user_roles").select("user_id").in("role", ["master_web", "admin", "moderator"]);
      if (staffRoles && staffRoles.length > 0) {
        const staffIds = Array.from(new Set(staffRoles.map(r => r.user_id)));
        const messageContent = `🤖 [BOT BIBLIOTECA] SUGERENCIA:\n🎮 Juego: ${gameName}\n🕹️ Consola: ${activeTab.toUpperCase()}\n💬 Comentario: ${description || "Sin comentarios."}`;
        
        const notifications = staffIds.map(id => ({
          sender_id: user.id, receiver_id: id, content: messageContent, is_read: false
        }));
        await supabase.from("inbox_messages").insert(notifications as any);
      }

      toast({ title: "Sugerencia enviada", description: "El staff ha recibido la notificación." });
      setGameName("");
      setDescription("");
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto pb-20 px-4 md:px-0">
      
      {/* 🔥 HEADER (MISMO QUE EMULATORPAGE / IMAGEN) 🔥 */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/30 shrink-0 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
          <Monitor className="w-7 h-7 text-neon-cyan" />
        </div>
        <div>
          <h1 className="font-pixel text-2xl text-neon-cyan uppercase tracking-tighter">Salas de Arcade</h1>
          <p className="text-[11px] text-muted-foreground font-body">Elige una consola y prepárate para jugar</p>
        </div>
      </div>

      {/* 🔥 TABS (MISMO QUE EMULATORPAGE / IMAGEN) 🔥 */}
      <div className="flex gap-2 border-b border-white/5 pb-0 overflow-x-auto custom-scrollbar">
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

      {/* BARRA DE BÚSQUEDA */}
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder={`Buscar en ${activeTab.toUpperCase()}...`} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-black/20 border-white/10 font-body text-xs focus:border-neon-cyan"
        />
      </div>

      {/* GRID DE JUEGOS (5 COLUMNAS) */}
      {filteredGames.length === 0 ? (
        <div className="bg-card border border-white/5 rounded-xl p-16 text-center shadow-lg">
           <AlertCircle className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
           <p className="text-sm text-muted-foreground font-body max-w-md mx-auto leading-relaxed">
             {activeTab === "n64" 
               ? "Estamos preparando los juegos de Nintendo 64. Se subirán pronto mediante los buckets de la base de datos." 
               : "No hay resultados para esta búsqueda."}
           </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredGames.map((game) => (
            <Link 
              key={game.id}
              to={`/arcade/salas?console=${activeTab}&game=${game.id}`}
              className="group flex flex-col bg-card border border-white/5 rounded-lg overflow-hidden hover:border-neon-cyan/50 transition-all shadow-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.15)]"
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

      {/* 🔥 SECCIÓN INFERIOR: LEADERBOARD Y SUGERENCIAS 🔥 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-20 pt-10 border-t border-white/10">
        
        {/* LEADERBOARD (CÓDIGO EXACTO DE EMULATORPAGE) */}
        <div className="bg-card border border-white/5 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="font-pixel text-[11px] text-neon-green flex items-center gap-2 uppercase">
              <Trophy className="w-4 h-4" /> MEJORES PUNTAJES {activeTab}
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
                  <div className="flex items-center gap-3">
                    <span className={cn("font-pixel text-[10px] w-5 text-center", i === 0 ? "text-neon-yellow" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted-foreground")}>
                      #{i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-muted overflow-hidden border border-white/10">
                      {s.profiles?.avatar_url ? <img src={s.profiles.avatar_url} className="w-full h-full object-cover" /> : <User className="w-4 h-4 m-1.5 text-muted-foreground" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-foreground group-hover:text-neon-green transition-colors">{s.profiles?.display_name || "Anónimo"}</span>
                      <span className="text-[8px] text-muted-foreground font-body uppercase">{s.game_name}</span>
                    </div>
                  </div>
                  <span className="font-pixel text-[11px] text-neon-green pr-2">{s.score.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SUGERENCIAS (DISEÑO EMULATORPAGE) */}
        <div className="bg-card border border-white/5 rounded-xl p-5 space-y-4 shadow-xl flex flex-col h-fit">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Lightbulb className="w-4 h-4 text-neon-cyan" />
            <h3 className="font-pixel text-[11px] text-neon-cyan uppercase">Sugerir un Juego</h3>
          </div>
          
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            ¿Falta algún clásico? Cuéntanos qué juego te gustaría ver en la biblioteca de <span className="text-foreground font-bold">{activeTab.toUpperCase()}</span>.
          </p>

          <div className="space-y-3 pt-2">
            <Input 
              placeholder="Nombre del juego" 
              value={gameName} 
              onChange={e => setGameName(e.target.value)} 
              className="h-10 bg-black/30 border-white/10 text-xs font-body" 
            />
            <Textarea 
              placeholder="¿Por qué deberíamos subirlo? (opcional)" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="min-h-[100px] bg-black/30 border-white/10 text-xs font-body resize-none" 
            />
            <Button 
              onClick={handleSuggestSubmit} 
              disabled={sending || !gameName.trim()} 
              className="w-full h-11 bg-neon-cyan text-black hover:bg-neon-cyan/80 font-pixel text-[10px] uppercase shadow-[0_0_20px_rgba(0,240,255,0.2)]"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : "ENVIAR SUGERENCIA AL STAFF"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}