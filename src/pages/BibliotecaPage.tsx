import { useState, useEffect, useMemo } from "react";
import { Gamepad2, Monitor, Trophy, Play, User, Lightbulb, Send, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getNameStyle } from "@/lib/profileAppearance";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { allGames } from "@/lib/gameLibrary";
import { supabase } from "@/integrations/supabase/client";
import { useGameBubble } from "@/contexts/GameBubbleContext"; // 🔥 IMPORTAMOS LA BURBUJA 🔥

type ConsoleType = "nes" | "snes" | "gba" | "n64";

const consoles: { id: ConsoleType; label: string; color: string }[] = [
  { id: "nes", label: "NES", color: "text-neon-green" },
  { id: "snes", label: "SNES", color: "text-neon-cyan" },
  { id: "gba", label: "Game Boy Advance", color: "text-neon-magenta" },
  { id: "n64", label: "Nintendo 64", color: "text-[#ffff00]" },
];

interface LeaderboardScore {
  id: string;
  display_name: string;
  game_name: string;
  score: number;
  user_id: string;
}

export default function BibliotecaPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { launchGame } = useGameBubble(); // 🔥 INICIALIZAMOS LA BURBUJA 🔥

  const [selectedConsole, setSelectedConsole] = useState<ConsoleType>("snes");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardScore[]>([]);
  const [leaderboardColors, setLeaderboardColors] = useState<Record<string, string | null>>({});

  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  // 🔥 LÓGICA DE BÚSQUEDA Y FILTRADO 🔥
  const currentGames = useMemo(() => {
    return allGames.filter((game) => {
      const matchesSearch = game.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConsole = game.console === selectedConsole;
      return matchesSearch && matchesConsole;
    });
  }, [searchQuery, selectedConsole]);

  // 🔥 FUNCIÓN PARA OBTENER EL CORE CORRECTO 🔥
  const getCoreForConsole = (consoleId: string) => {
    const cores: Record<string, string> = {
      nes: "fceumm",
      snes: "snes9x",
      gba: "mgba",
      n64: "mupen64plus_next",
      gbc: "gambatte",
      sega: "genesis_plus_gx",
      ps1: "pcsx_rearmed",
      arcade: "fbneo"
    };
    return cores[consoleId] || "fceumm";
  };

  // 🔥 FETCH DE LEADERBOARD EXACTO DE EMULATORPAGE 🔥
  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("leaderboard_scores")
        .select("id, display_name, game_name, score, user_id")
        .eq("console_type", selectedConsole)
        .order("score", { ascending: false })
        .limit(50);

      if (data) {
        // Deduplicate: keep only highest score per user
        const best: Record<string, LeaderboardScore> = {};
        (data as LeaderboardScore[]).forEach(s => {
          const key = s.user_id;
          if (!best[key] || s.score > best[key].score) best[key] = s;
        });
        const deduped = Object.values(best).sort((a, b) => b.score - a.score).slice(0, 10);
        setLeaderboard(deduped);
        
        const uids = [...new Set(deduped.map(s => s.user_id).filter(Boolean))];
        if (uids.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("user_id, color_name").in("user_id", uids);
          const cm: Record<string, string | null> = {};
          profiles?.forEach((p: any) => { cm[p.user_id] = p.color_name || null; });
          setLeaderboardColors(cm);
        }
      } else {
        setLeaderboard([]);
      }
    };
    fetchLeaderboard();
  }, [selectedConsole]);

  const consoleInfo = consoles.find((c) => c.id === selectedConsole)!;

  // 🔥 ENVIAR SUGERENCIA AL STAFF COMO UN BOT 🔥
  const handleSuggestSubmit = async () => {
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
    if (!gameName.trim()) return;
    setSending(true);

    try {
      const { error } = await supabase.from("game_suggestions").insert({
        user_id: user.id, console_type: selectedConsole, game_name: gameName.trim(), description: description.trim(),
      } as any);

      if (error) throw error;

      // Notificar al Staff (Bot)
      const { data: staffRoles } = await supabase.from("user_roles").select("user_id").in("role", ["master_web", "admin", "moderator"]);
      if (staffRoles && staffRoles.length > 0) {
        const staffIds = Array.from(new Set(staffRoles.map(r => r.user_id)));
        const messageContent = `🤖 [BOT SISTEMA] NUEVA SUGERENCIA DE JUEGO:\n\n🎮 Juego: ${gameName}\n🕹️ Consola: ${selectedConsole.toUpperCase()}\n💬 Comentario: ${description || "Sin comentario adicional."}`;

        const messages = staffIds.map(id => ({
          sender_id: user.id, receiver_id: id, content: messageContent, is_read: false
        }));
        await supabase.from("inbox_messages").insert(messages as any);
      }

      toast({ title: "Sugerencia enviada", description: "El staff la revisará pronto" }); 
      setGameName(""); 
      setDescription("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Hubo un error.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-12 px-4 md:px-0">
      
      {/* HEADER COPIADO DE EMULATORPAGE */}
      <div className="bg-card border border-neon-green/30 rounded-lg p-4">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> SALAS DE JUEGO
        </h1>
        <p className="text-xs text-muted-foreground font-body">Selecciona una consola, elige un juego y empieza a jugar.</p>
      </div>

      {/* BOTONES (PESTAÑAS) COPIADOS DE EMULATORPAGE */}
      <div className="flex gap-2 flex-wrap">
        {consoles.map((c) => (
          <Button
            key={c.id}
            variant={selectedConsole === c.id ? "default" : "outline"}
            size="sm"
            onClick={() => { setSelectedConsole(c.id); setSearchQuery(""); }}
            className={cn("text-xs font-body transition-all duration-300", selectedConsole === c.id ? "bg-primary text-primary-foreground shadow-lg" : "border-border")}
          >
            <Monitor className="w-3 h-3 mr-1" /> {c.label}
          </Button>
        ))}
      </div>

      {/* BARRA DE BÚSQUEDA ADAPTADA AL ESTILO */}
      <div className="relative w-full max-w-sm mt-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder={`Buscar en ${consoleInfo.label}...`} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 bg-card border-border font-body text-xs focus:border-primary transition-colors"
        />
      </div>

      {/* TITULO DE JUEGOS Y GRID (5 COLUMNAS) COPIADO DE EMULATORPAGE */}
      <div>
        <h2 className={cn("font-pixel text-xs mb-2 flex items-center gap-1.5 mt-2", consoleInfo.color)}>
          <Gamepad2 className="w-3.5 h-3.5" /> BIBLIOTECA {consoleInfo.label.toUpperCase()}
        </h2>
        
        {currentGames.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center text-[10px] text-muted-foreground font-body">
             {selectedConsole === "n64" ? "Próximamente se subirán los juegos de Nintendo 64 a través del servidor." : "No se encontraron juegos para esta búsqueda."}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {currentGames.map((game) => (
              // 🔥 SOLUCIÓN: Cambiado de <Link> a <div> para que abra con GameBubble sin redireccionar 🔥
              <div
                key={game.id}
                onClick={() => launchGame({
                  romUrl: game.romUrl,
                  consoleName: selectedConsole,
                  gameName: game.name,
                  consoleCore: getCoreForConsole(selectedConsole),
                  score: 0,
                  playTime: 0
                })}
                className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 text-left flex flex-col cursor-pointer"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  <img src={game.coverUrl} alt={game.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-1.5 flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <p className="text-[10px] font-body text-foreground truncate">{game.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ZONA INFERIOR (LEADERBOARD Y SUGERENCIAS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        
        {/* LEADERBOARD EXACTO AL EMULATORPAGE */}
        <div className="bg-card border border-neon-yellow/20 rounded-lg overflow-hidden h-fit">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-neon-yellow" />
            <h2 className="font-pixel text-[10px] text-neon-yellow">LEADERBOARD — {consoleInfo.label.toUpperCase()}</h2>
          </div>
          {leaderboard.length === 0 ? (
            <div className="p-4 text-center text-[10px] text-muted-foreground font-body">Sin puntuaciones aún. ¡Sé el primero!</div>
          ) : (
            leaderboard.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 text-[10px] font-body hover:bg-muted/30 transition-colors">
                <span className={cn("w-5 font-bold text-center", i === 0 ? "text-neon-yellow" : i === 1 ? "text-muted-foreground" : i === 2 ? "text-neon-orange" : "text-muted-foreground")}>
                  {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                </span>
                <User className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="flex-1 text-foreground truncate font-medium" style={getNameStyle(leaderboardColors[s.user_id])}>{s.display_name}</span>
                <span className="text-muted-foreground truncate max-w-[80px]">{s.game_name}</span>
                <span className="text-neon-green font-bold">{s.score.toLocaleString()}</span>
              </div>
            ))
          )}
        </div>

        {/* SUGERENCIAS EXACTAS AL EMULATORPAGE */}
        <div className="bg-card border border-neon-cyan/20 rounded-lg p-3 space-y-2 h-fit">
          <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> SUGERIR UN JUEGO
          </h3>
          <Input placeholder="Nombre del juego" value={gameName} onChange={e => setGameName(e.target.value)} className="h-7 bg-muted text-xs font-body" />
          
          {/* 🔥 LÍMITE DE 500 CARACTERES APLICADO 🔥 */}
          <div className="space-y-1">
            <Textarea 
              placeholder="¿Por qué lo recomiendas? (opcional)" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              maxLength={500}
              className="bg-muted text-xs font-body min-h-[40px]" 
            />
            <div className="text-[9px] text-muted-foreground text-right">
              {description.length}/500 caracteres
            </div>
          </div>

          <Button size="sm" onClick={handleSuggestSubmit} disabled={sending || !gameName.trim()} className="text-xs gap-1 h-7 w-full">
            <Send className="w-3 h-3" /> {sending ? "Enviando..." : "Enviar sugerencia"}
          </Button>
        </div>

      </div>

    </div>
  );
}