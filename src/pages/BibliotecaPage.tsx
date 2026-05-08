import { useState, useEffect, useMemo } from "react";
import { Gamepad2, Monitor, Trophy, Play, User, Lightbulb, Send, Search, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getNameStyle } from "@/lib/profileAppearance";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { allGames } from "@/lib/gameLibrary";
import { canPlayExtraConsole } from "@/lib/membershipLimits";
import { supabase } from "@/integrations/supabase/client";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { useSearchParams, Link } from "react-router-dom";
import { Lock } from "lucide-react";

// Las consolas base oficiales de la web
const baseConsoles = [
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
  const { user, profile, isStaff } = useAuth();
  const { toast } = useToast();
  const { launchGame } = useGameBubble();
  const canExtra = canPlayExtraConsole(profile?.membership_tier, isStaff);
  
  // Lista dinámica de consolas (Base + Las de Google Drive)
  const [activeConsoles, setActiveConsoles] = useState(baseConsoles);
  const [driveGames, setDriveGames] = useState<any[]>([]);

  const [searchParams] = useSearchParams();
  const initialConsoleParam = searchParams.get("console") || "snes";

  const [selectedConsole, setSelectedConsole] = useState<string>(initialConsoleParam);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardScore[]>([]);
  const [leaderboardColors, setLeaderboardColors] = useState<Record<string, string | null>>({});

  const [gameName, setGameName] = useState("");
  const [suggestConsole, setSuggestConsole] = useState<string>("snes");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  // Reglas de bloqueo por consola
  const isLocked = (consoleId: string) => {
    const premiumConsoles = ["n64", "ps1", "ps2", "arcade"];
    return premiumConsoles.includes(consoleId) && !canExtra;
  };

  // Cargar juegos de Google Drive y crear pestañas dinámicas
  useEffect(() => {
    const fetchDriveGames = async () => {
      if (!user) return;
      const { data } = await supabase.from("user_drive_games" as any).select("*").eq("user_id", user.id);
      
      if (data && data.length > 0) {
        setDriveGames(data);
        
        const newConsolesList = [...baseConsoles];
        const uniqueDriveConsoles = [...new Set(data.map((g: any) => g.console_type))];
        
        uniqueDriveConsoles.forEach((consoleName: any) => {
          let id = consoleName.toLowerCase().replace(/\s+/g, '');
          let color = "text-white";

          // Mapeos automáticos para que los juegos del Drive encajen en las pestañas correctas
          if (consoleName === 'Super Nintendo') id = 'snes';
          if (consoleName === 'Nintendo Entertainment System') id = 'nes';
          if (consoleName === 'Game Boy Advance') id = 'gba';
          if (consoleName === 'Nintendo 64') id = 'n64';
          
          if (consoleName === 'PlayStation 1') { id = 'ps1'; color = 'text-gray-400'; }
          if (consoleName === 'Arcade') { id = 'arcade'; color = 'text-neon-orange'; }

          // Si la pestaña no existe, la creamos mágicamente
          if (!newConsolesList.some(c => c.id === id)) {
            newConsolesList.push({ id, label: consoleName, color });
          }
        });
        setActiveConsoles(newConsolesList);
      }
    };
    fetchDriveGames();
  }, [user]);

  useEffect(() => {
    const consoleParam = searchParams.get("console");
    if (consoleParam && activeConsoles.some(c => c.id === consoleParam)) {
      setSelectedConsole(consoleParam);
    }
  }, [searchParams, activeConsoles]);

  useEffect(() => {
    setSuggestConsole(selectedConsole);
  }, [selectedConsole]);

  const currentGames = useMemo(() => {
    // 1. Juegos oficiales de tu web
    const officialGames = allGames.filter((game) => {
      const matchesSearch = game.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesConsole = game.console === selectedConsole;
      return matchesSearch && matchesConsole;
    });

    // 2. Juegos personales de la nube del usuario
    const userCloudGames = driveGames.filter((game) => {
      const matchesSearch = game.file_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      let mappedId = game.console_type.toLowerCase().replace(/\s+/g, '');
      if (game.console_type === 'Super Nintendo') mappedId = 'snes';
      if (game.console_type === 'Nintendo Entertainment System') mappedId = 'nes';
      if (game.console_type === 'Game Boy Advance') mappedId = 'gba';
      if (game.console_type === 'Nintendo 64') mappedId = 'n64';
      if (game.console_type === 'PlayStation 1') mappedId = 'ps1';
      if (game.console_type === 'Arcade') mappedId = 'arcade';
      
      const matchesConsole = mappedId === selectedConsole;
      return matchesSearch && matchesConsole;
    }).map(game => ({
      id: game.drive_file_id,
      name: game.file_name.replace(/\.[^/.]+$/, ""),
      console: selectedConsole,
      coverUrl: "/placeholder.svg", // Por ahora, placeholder. Luego le meteremos la API.
      romUrl: `DRIVE_FILE:${game.drive_file_id}`, // Etiqueta especial para que el emulador sepa que viene de Drive
      isCloud: true
    }));

    return [...officialGames, ...userCloudGames];
  }, [searchQuery, selectedConsole, driveGames]);

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

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from("leaderboard_scores")
        .select("id, display_name, game_name, score, user_id")
        .eq("console_type", selectedConsole)
        .order("score", { ascending: false })
        .limit(50);

      if (data) {
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

  const consoleInfo = activeConsoles.find((c) => c.id === selectedConsole) || activeConsoles[0];

  const handleSuggestSubmit = async () => {
    if (!user) { toast({ title: "Inicia sesión", variant: "destructive" }); return; }
    if (!gameName.trim()) return;
    setSending(true);

    try {
      const { error } = await supabase.from("game_suggestions" as any).insert({
        user_id: user.id, 
        console_type: suggestConsole, 
        game_name: gameName.trim(), 
        description: description.trim(),
      } as any);

      if (error) throw error;

      const targetUrl = typeof window !== 'undefined' ? `${window.location.pathname}?console=${suggestConsole}` : `/?console=${suggestConsole}`;
      const messageContent = `[COLOR:#ef4444]🤖 [SISTEMA] NUEVA SUGERENCIA DE JUEGO[/COLOR]\n[COLOR:#3b82f6]👤 Usuario: ${user.user_metadata?.username || user.email || 'Anónimo'}[/COLOR]\n[COLOR:#eab308]🎮 Juego: ${gameName}[/COLOR]\n[COLOR:#ffffff]🕹️ Consola elegida: ${suggestConsole.toUpperCase()}[/COLOR]\n[COLOR:#3b82f6]🔗 ENLACE:[/COLOR] [LINK:${targetUrl}]Ir a la consola sugerida[/LINK]`;

      await supabase.rpc("send_system_staff_message" as any, {
        p_title: `Sugerencia de juego: ${gameName}`,
        p_content: messageContent,
        p_message_type: 'game_suggestion',
      });

      toast({ title: "Sugerencia enviada", description: "El staff la revisará pronto" }); 
      setGameName(""); setDescription("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Hubo un error.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-12 px-4 md:px-0">
      
      <div className="bg-card border border-neon-green/30 rounded-lg p-4">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> SALAS DE JUEGO
        </h1>
        <p className="text-xs text-muted-foreground font-body">Selecciona una consola, elige un juego y empieza a jugar.</p>
      </div>

      {/* --- PESTAÑAS DINÁMICAS --- */}
      <div className="flex gap-2 flex-wrap">
        {activeConsoles.map((c) => (
          <Button
            key={c.id}
            variant={selectedConsole === c.id ? "default" : "outline"}
            size="sm"
            onClick={() => { setSelectedConsole(c.id); setSearchQuery(""); }}
            className={cn("text-xs font-body transition-all duration-300", selectedConsole === c.id ? "bg-primary text-primary-foreground shadow-lg" : "border-border")}
          >
            <Monitor className="w-3 h-3 mr-1" /> {c.label} {isLocked(c.id) && <Lock className="w-3 h-3 ml-1 text-neon-yellow" />}
          </Button>
        ))}
      </div>

      <div className="relative w-full max-w-sm mt-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder={`Buscar en ${consoleInfo?.label}...`} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 bg-card border-border font-body text-xs focus:border-primary transition-colors"
        />
      </div>

      <div>
        <h2 className={cn("font-pixel text-xs mb-2 flex items-center gap-1.5 mt-2", consoleInfo?.color)}>
          <Gamepad2 className="w-3.5 h-3.5" /> BIBLIOTECA {consoleInfo?.label.toUpperCase()}
        </h2>
        
        {isLocked(selectedConsole) ? (
          <div className="bg-card border border-dashed border-neon-yellow/40 rounded-lg p-8 text-center space-y-3">
            <Lock className="w-8 h-8 mx-auto text-neon-yellow" />
            <p className="text-xs font-body text-foreground">Esta consola está bloqueada para miembros <span className="font-bold">Novato</span>.</p>
            <p className="text-[10px] text-muted-foreground font-body">Mejora tu membresía a <b>Lite</b> o superior para desbloquear N64, PS1 y Arcade.</p>
            <Link to="/membresias"><Button size="sm" className="text-xs">Ver membresías</Button></Link>
          </div>
        ) : currentGames.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center text-[10px] text-muted-foreground font-body">
             No se encontraron juegos para esta búsqueda.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {currentGames.map((game: any) => (
              <div
                key={game.id}
                onClick={() => {
                  if (game.isCloud) {
                    toast({ title: 'Cargando de la Nube', description: 'Conectando con Google Drive...' });
                    // En el futuro paso conectaremos esto al emulador para leer Google Drive
                  } else {
                    launchGame({
                      romUrl: game.romUrl,
                      consoleName: selectedConsole,
                      gameName: game.name,
                      consoleCore: getCoreForConsole(selectedConsole),
                      score: 0,
                      playTime: 0
                    });
                  }
                }}
                className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 text-left flex flex-col cursor-pointer relative"
              >
                {/* Etiqueta de la nube */}
                {game.isCloud && (
                  <div className="absolute top-1 right-1 bg-black/60 p-1 rounded-full z-10 backdrop-blur-sm border border-white/10">
                    <Cloud className="w-3 h-3 text-[#4285F4]" />
                  </div>
                )}
                
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

      {/* --- RESTO DEL CÓDIGO INTACTO (LEADERBOARD Y SUGERENCIAS) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        
        <div className="bg-card border border-neon-yellow/20 rounded-lg overflow-hidden h-fit">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-neon-yellow" />
            <h2 className="font-pixel text-[10px] text-neon-yellow">LEADERBOARD — {consoleInfo?.label.toUpperCase()}</h2>
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

        <div className="bg-card border border-neon-cyan/20 rounded-lg p-3 space-y-2 h-fit">
          <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1">
            <Lightbulb className="w-3 h-3" /> SUGERIR UN JUEGO
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Nombre del juego" value={gameName} onChange={e => setGameName(e.target.value)} className="h-8 bg-muted text-xs font-body" />
            <select value={suggestConsole} onChange={(e) => setSuggestConsole(e.target.value)} className="h-8 rounded-md border border-border bg-muted text-xs font-body px-2 text-foreground outline-none focus:border-neon-cyan/50 transition-colors">
              {activeConsoles.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          
          <div className="space-y-1">
            <Textarea placeholder="¿Por qué lo recomiendas? (opcional)" value={description} onChange={e => setDescription(e.target.value)} maxLength={500} className="bg-muted text-xs font-body min-h-[60px]" />
            <div className="text-[9px] text-muted-foreground text-right">{description.length}/500 caracteres</div>
          </div>

          <Button size="sm" onClick={handleSuggestSubmit} disabled={sending || !gameName.trim()} className="text-xs gap-1 h-8 w-full">
            <Send className="w-3 h-3" /> {sending ? "Enviando..." : "Enviar sugerencia"}
          </Button>
        </div>

      </div>

    </div>
  );
}