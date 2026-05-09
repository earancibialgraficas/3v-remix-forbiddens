import { useState, useEffect, useMemo, useCallback } from "react";
import { Gamepad2, Monitor, Trophy, Play, User, Lightbulb, Send, Search, Cloud, Lock, Loader2, RefreshCw } from "lucide-react";
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

// --- MINI COMPONENTE PARA PORTADAS INTELIGENTES ---
const GameCover = ({ gameName, consoleId, isCloud, defaultCover }: { gameName: string, consoleId: string, isCloud: boolean, defaultCover?: string }) => {
  const [stage, setStage] = useState(isCloud ? 0 : -1);
  const [imgSrc, setImgSrc] = useState(defaultCover || "/placeholder.svg");

  useEffect(() => {
    if (!isCloud) {
      setImgSrc(defaultCover || "/placeholder.svg");
      return;
    }

    const systems: Record<string, string> = {
      nes: "Nintendo_-_Nintendo_Entertainment_System",
      snes: "Nintendo_-_Super_Nintendo_Entertainment_System",
      gba: "Nintendo_-_Game_Boy_Advance",
      n64: "Nintendo_-_Nintendo_64",
      ps1: "Sony_-_PlayStation",
      arcade: "MAME"
    };
    
    const system = systems[consoleId] || "Nintendo_-_Super_Nintendo_Entertainment_System";

    // libretro-thumbnails usa convención No-Intro: respeta espacios, paréntesis y caracteres
    // especiales reemplazando ciertos chars problemáticos (& % por _) y URL-encoding del resto.
    // Quitamos extensión y normalizamos.
    const noExt = gameName.replace(/\.[^/.]+$/, "").trim();
    const libretroName = noExt
      .replace(/&/g, "_")
      .replace(/\*/g, "_")
      .replace(/\//g, "_")
      .replace(/:/g, "_")
      .replace(/\?/g, "_");
    const encoded = encodeURIComponent(libretroName).replace(/%20/g, "%20");

    // Hash matemático: la IA usará la misma seed siempre para no cambiar de imagen al recargar
    let hash = 0;
    for (let i = 0; i < gameName.length; i++) hash = gameName.charCodeAt(i) + ((hash << 5) - hash);
    const fixedSeed = Math.abs(hash);

    const cleanName = encodeURIComponent(noExt.replace(/\[.*?\]|\(.*?\)/g, '').trim());
    const consoleName = consoleId.toUpperCase();

    // Cascada de intentos: portada → título → IA → placeholder
    const urls = [
      `https://thumbnails.libretro.com/${system}/Named_Boxarts/${encoded}.png`,
      `https://thumbnails.libretro.com/${system}/Named_Titles/${encoded}.png`,
      `https://thumbnails.libretro.com/${system}/Named_Snaps/${encoded}.png`,
      `https://image.pollinations.ai/prompt/Retro%20box%20art%20cover%20for%20the%20game%20${cleanName}%20on%20${consoleName}?width=300&height=400&nologo=true&seed=${fixedSeed}`,
      "/placeholder.svg"
    ];

    setImgSrc(urls[stage] || "/placeholder.svg");
  }, [gameName, consoleId, isCloud, defaultCover, stage]);

  return (
    <img 
      src={imgSrc} 
      alt={gameName} 
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
      loading="lazy"
      onError={() => {
        if (isCloud && stage < 4) {
          setStage(prev => prev + 1); // Si falla, pasa al siguiente intento
        } else if (!isCloud || stage >= 4) {
          setImgSrc("/placeholder.svg"); // Seguro de vida final
        }
      }}
    />
  );
};
// ---------------------------------------------------

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
  
  const [activeConsoles, setActiveConsoles] = useState(baseConsoles);
  const [driveGames, setDriveGames] = useState<any[]>([]);
  const [isLaunchingCloud, setIsLaunchingCloud] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  useEffect(() => {
    if (!(window as any).google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const getConsoleType = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    if (['smc', 'sfc'].includes(ext)) return 'Super Nintendo';
    if (['nes'].includes(ext)) return 'Nintendo Entertainment System';
    if (['gba'].includes(ext)) return 'Game Boy Advance';
    if (['z64', 'n64', 'v64'].includes(ext)) return 'Nintendo 64';
    if (['bin', 'iso', 'cue', 'chd'].includes(ext)) return 'PlayStation 1';
    return 'Arcade';
  };

  const fetchDriveGames = useCallback(async (rescan = false) => {
    if (!user) return;
    if (rescan) setIsRefreshing(true);

    try {
      // 🔄 Si rescan = true, re-escaneamos la carpeta de Drive y upserteamos los nuevos juegos
      if (rescan) {
        try {
          const token = await requestGoogleToken();
          const folderQuery = "mimeType = 'application/vnd.google-apps.folder' and name = 'RetroRoms' and trashed = false";
          const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id,name)`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const folderData = await folderRes.json();

          if (folderData.files && folderData.files.length > 0) {
            const folderId = folderData.files[0].id;
            const filesQuery = `'${folderId}' in parents and trashed = false`;
            const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(filesQuery)}&fields=files(id,name)&pageSize=1000`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const filesData = await filesRes.json();
            const validFiles = (filesData.files || []).filter((f: any) => /\.(sfc|smc|nes|gba|z64|n64|bin|iso|cue|chd)$/i.test(f.name));
            if (validFiles.length > 0) {
              const gamesToSave = validFiles.map((f: any) => ({
                user_id: user.id,
                drive_file_id: f.id,
                file_name: f.name,
                console_type: getConsoleType(f.name)
              }));
              await supabase.from('user_drive_games' as any).upsert(gamesToSave, { onConflict: 'user_id,drive_file_id' });
            }
          } else {
            toast({ title: 'Carpeta no encontrada', description: 'Crea una carpeta llamada "RetroRoms" en tu Drive.', variant: 'destructive' });
          }
        } catch (e: any) {
          console.error('Drive rescan error', e);
          toast({ title: 'Error sincronizando Drive', description: 'No se pudo leer tu carpeta. Verifica permisos.', variant: 'destructive' });
        }
      }

      const { data, error } = await supabase
        .from("user_drive_games" as any)
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      if (data) {
        const validGames = data.filter((g: any) => {
          const name = g.file_name.toLowerCase();
          return /\.(sfc|smc|nes|gba|z64|n64|bin|iso|cue|chd)$/i.test(name);
        });

        setDriveGames(validGames);

        const newConsolesList = [...baseConsoles];
        const uniqueDriveConsoles = [...new Set(validGames.map((g: any) => g.console_type))];

        uniqueDriveConsoles.forEach((consoleName: any) => {
          let id = consoleName.toLowerCase().replace(/\s+/g, '');
          let color = "text-white";

          if (consoleName === 'Super Nintendo') id = 'snes';
          if (consoleName === 'Nintendo Entertainment System') id = 'nes';
          if (consoleName === 'Game Boy Advance') id = 'gba';
          if (consoleName === 'Nintendo 64') id = 'n64';
          if (consoleName === 'PlayStation 1') { id = 'ps1'; color = 'text-gray-400'; }
          if (consoleName === 'Arcade') { id = 'arcade'; color = 'text-neon-orange'; }

          if (!newConsolesList.some(c => c.id === id)) {
            newConsolesList.push({ id, label: consoleName, color });
          }
        });
        setActiveConsoles(newConsolesList);
      }

      if (rescan) toast({ title: "Biblioteca actualizada", description: "Se han re-escaneado tus juegos de Drive." });
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchDriveGames();
  }, [fetchDriveGames]);

  useEffect(() => {
    const consoleParam = searchParams.get("console");
    if (consoleParam && activeConsoles.some(c => c.id === consoleParam)) setSelectedConsole(consoleParam);
  }, [searchParams, activeConsoles]);

  useEffect(() => {
    setSuggestConsole(selectedConsole);
  }, [selectedConsole]);

  const requestGoogleToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const cachedToken = sessionStorage.getItem('drive_access_token');
      const tokenExpiry = sessionStorage.getItem('drive_token_expiry');

      if (cachedToken && tokenExpiry && Date.now() < parseInt(tokenExpiry)) {
        resolve(cachedToken);
        return;
      }

      const google = (window as any).google;
      if (!google) {
        reject(new Error("Google Identity no está cargado."));
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response.error) {
            reject(response.error);
          } else {
            sessionStorage.setItem('drive_access_token', response.access_token);
            sessionStorage.setItem('drive_token_expiry', (Date.now() + 55 * 60 * 1000).toString());
            resolve(response.access_token);
          }
        }
      });
      client.requestAccessToken();
    });
  };

  const handlePlayCloudGame = async (game: any) => {
    if (isLaunchingCloud) return;
    setIsLaunchingCloud(true);
    toast({ title: "Iniciando...", description: "Conectando al servidor en la nube." });

    try {
      const accessToken = await requestGoogleToken();

      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${game.id}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!response.ok) throw new Error();
      
      const blob = await response.blob();
      const file = new File([blob], game.name, { type: blob.type });
      
      if (!(window as any).__localRoms) (window as any).__localRoms = {};
      (window as any).__localRoms[game.id] = file;

      launchGame({
        romUrl: `local:${game.id}`,
        consoleName: game.console,
        gameName: game.name,
        consoleCore: getCoreForConsole(game.console),
        score: 0,
        playTime: 0
      });

    } catch (e: any) {
      console.error(e);
      toast({ title: "Acceso denegado", description: "Hubo un error al leer la ROM desde tu Drive.", variant: "destructive" });
    } finally {
      setIsLaunchingCloud(false);
    }
  };

  const getCoreForConsole = (consoleId: string) => {
    const cores: Record<string, string> = {
      nes: "fceumm", snes: "snes9x", gba: "mgba", n64: "mupen64plus_next", ps1: "pcsx_rearmed", arcade: "fbneo"
    };
    return cores[consoleId] || "fceumm";
  };

  const isLocked = (consoleId: string) => {
    const premiumConsoles = ["n64", "ps1", "arcade"];
    return premiumConsoles.includes(consoleId) && !canExtra;
  };

  const currentGames = useMemo(() => {
    const official = allGames.filter(g => g.console === selectedConsole && g.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const cloud = driveGames.filter(g => {
      let mId = g.console_type.toLowerCase().replace(/\s+/g, '');
      if (g.console_type === 'Super Nintendo') mId = 'snes';
      if (g.console_type === 'Nintendo Entertainment System') mId = 'nes';
      if (g.console_type === 'Game Boy Advance') mId = 'gba';
      if (g.console_type === 'Nintendo 64') mId = 'n64';
      if (g.console_type === 'PlayStation 1') mId = 'ps1';
      if (g.console_type === 'Arcade') mId = 'arcade';
      return mId === selectedConsole && g.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    }).map(g => {
      const rawName = g.file_name.replace(/\.[^/.]+$/, "");
      return {
        id: g.drive_file_id,
        name: rawName,
        console: selectedConsole,
        coverUrl: "/placeholder.svg", // Ahora el componente GameCover se encarga de esto
        isCloud: true
      };
    });
    
    return [...official, ...cloud];
  }, [searchQuery, selectedConsole, driveGames]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase.from("leaderboard_scores").select("*").eq("console_type", selectedConsole).order("score", { ascending: false }).limit(10);
      if (data) {
        setLeaderboard(data as any);
        const uids = [...new Set(data.map((s: any) => s.user_id))];
        if (uids.length > 0) {
          const { data: p } = await supabase.from("profiles").select("user_id, color_name").in("user_id", uids);
          const cm: any = {}; p?.forEach((x: any) => cm[x.user_id] = x.color_name);
          setLeaderboardColors(cm);
        }
      }
    };
    fetchLeaderboard();
  }, [selectedConsole]);

  const handleSuggestSubmit = async () => {
    if (!user || !gameName.trim()) return;
    setSending(true);
    try {
      await supabase.from("game_suggestions" as any).insert({ user_id: user.id, console_type: suggestConsole, game_name: gameName.trim(), description: description.trim() } as any);
      toast({ title: "Sugerencia enviada" });
      setGameName(""); setDescription("");
    } finally { setSending(false); }
  };

  const consoleInfo = activeConsoles.find((c) => c.id === selectedConsole) || activeConsoles[0];

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-12 px-4 md:px-0">
      
      <div className="bg-card border border-neon-green/30 rounded-lg p-4">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> SALAS DE JUEGO
        </h1>
        <p className="text-xs text-muted-foreground font-body">Selecciona una consola, elige un juego y empieza a jugar.</p>
      </div>

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

      <div className="flex items-center gap-2 mt-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={`Buscar en ${consoleInfo?.label}...`} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-9 h-8 bg-card border-border font-body text-xs focus:border-primary transition-colors" 
          />
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => fetchDriveGames(true)} 
          disabled={isRefreshing}
          className="h-8 w-8 shrink-0 border-border bg-card hover:bg-muted"
          title="Actualizar biblioteca de Drive"
        >
          <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      <div>
        <h2 className={cn("font-pixel text-xs mb-2 flex items-center gap-1.5 mt-2", consoleInfo?.color)}>
          <Gamepad2 className="w-3.5 h-3.5" /> BIBLIOTECA {consoleInfo?.label.toUpperCase()}
        </h2>
        
        {isLocked(selectedConsole) ? (
          <div className="bg-card border border-dashed border-neon-yellow/40 rounded-lg p-8 text-center space-y-3">
            <Lock className="w-8 h-8 mx-auto text-neon-yellow" />
            <p className="text-xs font-body text-foreground">Esta consola requiere membresía <span className="font-bold">Elite</span>.</p>
            <Link to="/membresias"><Button size="sm" className="text-xs">Ver membresías</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {currentGames.map((game: any) => (
              <div
                key={game.id}
                onClick={() => game.isCloud ? handlePlayCloudGame(game) : launchGame({ romUrl: game.romUrl, consoleName: selectedConsole, gameName: game.name, consoleCore: getCoreForConsole(selectedConsole), score: 0, playTime: 0 })}
                className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer relative"
              >
                {game.isCloud && (
                  <div className="absolute top-1 right-1 bg-black/60 p-1 rounded-full z-10 backdrop-blur-sm border border-white/10">
                    <Cloud className="w-3 h-3 text-[#4285F4]" />
                  </div>
                )}
                <div className="aspect-square overflow-hidden bg-muted flex items-center justify-center relative">
                  {isLaunchingCloud && game.isCloud ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : (
                    <GameCover 
                      gameName={game.name} 
                      consoleId={game.console} 
                      isCloud={game.isCloud} 
                      defaultCover={game.coverUrl} 
                    />
                  )}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <div className="bg-card border border-neon-yellow/20 rounded-lg overflow-hidden h-fit">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-neon-yellow" />
            <h2 className="font-pixel text-[10px] text-neon-yellow">LEADERBOARD — {consoleInfo?.label.toUpperCase()}</h2>
          </div>
          {leaderboard.length === 0 ? <div className="p-4 text-center text-[10px] text-muted-foreground">Sin puntuaciones.</div> : leaderboard.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 text-[10px] font-body">
              <span className={cn("w-5 font-bold text-center", i === 0 ? "text-neon-yellow" : "text-muted-foreground")}>{i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}</span>
              <span className="flex-1 truncate font-medium" style={getNameStyle(leaderboardColors[s.user_id])}>{s.display_name}</span>
              <span className="text-neon-green font-bold">{s.score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <div className="bg-card border border-neon-cyan/20 rounded-lg p-3 space-y-2 h-fit">
          <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1"><Lightbulb className="w-3 h-3" /> SUGERIR UN JUEGO</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Nombre" value={gameName} onChange={e => setGameName(e.target.value)} className="h-8 bg-muted text-xs font-body" />
            <select value={suggestConsole} onChange={(e) => setSuggestConsole(e.target.value)} className="h-8 rounded-md border border-border bg-muted text-xs font-body px-2 text-foreground outline-none focus:border-neon-cyan/50 transition-colors">
              {activeConsoles.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <Textarea placeholder="Descripción..." value={description} onChange={e => setDescription(e.target.value)} className="bg-muted text-xs font-body min-h-[60px]" />
          <Button size="sm" onClick={handleSuggestSubmit} disabled={sending || !gameName.trim()} className="text-xs h-8 w-full"><Send className="w-3 h-3" /> {sending ? "Enviando..." : "Enviar sugerencia"}</Button>
        </div>
      </div>

    </div>
  );
}