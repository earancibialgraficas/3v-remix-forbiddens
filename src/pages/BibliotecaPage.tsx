import { useState, useEffect, useMemo, useCallback } from "react";
import VaultHint from "@/components/VaultHint";
import { Gamepad2, Monitor, Trophy, Play, User, Lightbulb, Send, Search, Cloud, Lock, Loader2, RefreshCw, Flame, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import VaultPasswordModal from "@/components/VaultPasswordModal";
import MultiplayerGameBubble from "@/components/MultiplayerGameBubble";

// --- MINI COMPONENTE PARA PORTADAS INTELIGENTES ---
const GameCover = ({ gameName, consoleId, isCloud, defaultCover, customCover }: { gameName: string, consoleId: string, isCloud: boolean, defaultCover?: string, customCover?: string | null }) => {
  const [stage, setStage] = useState(isCloud ? 0 : -1);
  const [imgSrc, setImgSrc] = useState(customCover || defaultCover || "/placeholder.svg");

  useEffect(() => {
    if (customCover) { setImgSrc(customCover); return; }
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

    const noExt = gameName.replace(/\.[^/.]+$/, "").trim();
    const libretroName = noExt
      .replace(/&/g, "_")
      .replace(/\*/g, "_")
      .replace(/\//g, "_")
      .replace(/:/g, "_")
      .replace(/\?/g, "_");
    const encoded = encodeURIComponent(libretroName).replace(/%20/g, "%20");

    let hash = 0;
    for (let i = 0; i < gameName.length; i++) hash = gameName.charCodeAt(i) + ((hash << 5) - hash);
    const fixedSeed = Math.abs(hash);

    const cleanName = encodeURIComponent(noExt.replace(/\[.*?\]|\(.*?\)/g, '').trim());
    const consoleName = consoleId.toUpperCase();

    const urls = [
      `https://thumbnails.libretro.com/${system}/Named_Boxarts/${encoded}.png`,
      `https://thumbnails.libretro.com/${system}/Named_Titles/${encoded}.png`,
      `https://thumbnails.libretro.com/${system}/Named_Snaps/${encoded}.png`,
      `https://image.pollinations.ai/prompt/Retro%20box%20art%20cover%20for%20the%20game%20${cleanName}%20on%20${consoleName}?width=300&height=400&nologo=true&seed=${fixedSeed}`,
      "/placeholder.svg"
    ];

    setImgSrc(urls[stage] || "/placeholder.svg");
  }, [gameName, consoleId, isCloud, defaultCover, customCover, stage]);

  return (
    <img 
      src={imgSrc} 
      alt={gameName} 
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
      loading="lazy"
      onError={() => {
        if (isCloud && stage < 4) {
          setStage(prev => prev + 1);
        } else if (!isCloud || stage >= 4) {
          setImgSrc("/placeholder.svg");
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
  console_type: string;
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
  const [launchingGameId, setLaunchingGameId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingGame, setEditingGame] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editCover, setEditCover] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  // Eliminamos el tab, todo será controlado por el dropdown
  const [selectedMultiGame, setSelectedMultiGame] = useState<{ id: string; label: string; maxPlayers?: number; playersLabel?: string } | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();

  // 🔄 Lógica de persistencia unificada para Consolas y Multijugador
  const savedTab = searchParams.get("tab") || (typeof window !== "undefined" ? localStorage.getItem("biblioteca:activeTab") : null);
  const rawInitialConsole = searchParams.get("console") || (typeof window !== "undefined" ? localStorage.getItem("biblioteca:console") : null) || "snes";
  
  const validConsoleIds = ["nes", "snes", "gba", "n64", "ps1", "arcade"];
  const initialConsoleParam = savedTab === "multi"
    ? "multiplayer"
    : validConsoleIds.includes(rawInitialConsole) ? rawInitialConsole : "snes";
  
  const [selectedConsole, setSelectedConsole] = useState<string>(initialConsoleParam);
  const [dropdownValue, setDropdownValue] = useState<string>(savedTab === "multi" ? "multi" : `console:${initialConsoleParam}`);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("biblioteca:console", selectedConsole);
      localStorage.setItem("biblioteca:activeTab", dropdownValue);
    }
    
    const next = new URLSearchParams();
    // Si es multi, solo guardamos el tab. Si es consola, guardamos la consola.
    if (dropdownValue === "multi") next.set("tab", "multi");
    else next.set("console", selectedConsole);

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [selectedConsole, dropdownValue, searchParams, setSearchParams]);

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

      const { data: driveData, error: driveError } = await supabase
        .from("user_drive_games" as any)
        .select("*")
        .eq("user_id", user.id);

      if (driveError) throw driveError;

      const { data: coverData, error: coverError } = await supabase
        .from("user_game_covers" as any)
        .select("*")
        .eq("user_id", user.id);

      if (coverError) {
          console.warn("No se pudo leer user_game_covers", coverError);
      }

      if (driveData) {
        const validGames = driveData.filter((g: any) => {
          const name = g.file_name.toLowerCase();
          return /\.(sfc|smc|nes|gba|z64|n64|bin|iso|cue|chd)$/i.test(name);
        }).map((g: any) => {
            const customData: any = (coverData as any[] | null)?.find((c: any) => c.file_name === g.file_name);
            return {
                ...g,
                custom_name: customData?.custom_name || g.custom_name,
                custom_cover_url: customData?.custom_cover_url || g.custom_cover_url
            };
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
    const tabParam = searchParams.get("tab");
    if (tabParam === "multi") {
      setSelectedConsole("multiplayer");
      setDropdownValue("multi");
    } else {
      const consoleParam = searchParams.get("console");
      if (consoleParam && activeConsoles.some(c => c.id === consoleParam)) {
        setSelectedConsole(consoleParam);
        setDropdownValue(`console:${consoleParam}`);
      }
    }
  }, [searchParams, activeConsoles]);

  useEffect(() => {
    setSuggestConsole(selectedConsole);
  }, [selectedConsole]);

  const requestGoogleToken = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const cachedToken = localStorage.getItem('drive_access_token');
      const tokenExpiry = localStorage.getItem('drive_token_expiry');

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
        scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
        prompt: '',
        callback: (response: any) => {
          if (response.error) {
            reject(response.error);
          } else {
            const ttlMs = (response.expires_in ? response.expires_in * 1000 : 55 * 60 * 1000) - 60_000;
            localStorage.setItem('drive_access_token', response.access_token);
            localStorage.setItem('drive_token_expiry', (Date.now() + ttlMs).toString());
            localStorage.setItem('drive_linked_until', (Date.now() + 24 * 60 * 60 * 1000).toString());
            resolve(response.access_token);
          }
        }
      });
      client.requestAccessToken();
    });
  };

const handlePlayCloudGame = async (game: any) => {
    // Si ya hay un juego abriéndose, no hacemos nada
    if (launchingGameId) return; 
    
    // Guardamos la ID del juego específico que clickeó el usuario
    setLaunchingGameId(game.id);
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
      // Cuando termina de cargar, limpiamos la ID
      setLaunchingGameId(null);
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
      const displayName = (g.custom_name || g.file_name.replace(/\.[^/.]+$/, "")).toLowerCase();
      return mId === selectedConsole && displayName.includes(searchQuery.toLowerCase());
    }).map(g => {
      const rawName = g.file_name.replace(/\.[^/.]+$/, "");
      return {
        id: g.drive_file_id,
        name: g.custom_name || rawName,
        originalName: rawName,
        console: selectedConsole,
        coverUrl: "/placeholder.svg",
        customCover: g.custom_cover_url || null,
        driveRowId: g.id,
        fileName: g.file_name,
        isCloud: true,
      };
    });
    
    return [...official, ...cloud];
  }, [searchQuery, selectedConsole, driveGames]);

  const leaderboardConsole = dropdownValue === "multi" ? "multiplayer" : selectedConsole;

  const fetchLeaderboard = useCallback(async () => {
    const { data, error } = await supabase
      .from("leaderboard_scores")
      .select("id, display_name, game_name, console_type, score, user_id")
      .eq("console_type", leaderboardConsole)
      .order("score", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[Biblioteca] leaderboard error", error);
      setLeaderboard([]);
      setLeaderboardColors({});
      return;
    }

    const bestByUser = new Map<string, LeaderboardScore>();
    ((data || []) as LeaderboardScore[]).forEach((score) => {
      const key = String(score.user_id || score.display_name || score.id);
      const previous = bestByUser.get(key);
      if (!previous || Number(score.score || 0) > Number(previous.score || 0)) {
        bestByUser.set(key, score);
      }
    });

    const visibleScores = Array.from(bestByUser.values())
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      .slice(0, 10);

    setLeaderboard(visibleScores);

    const uids = [...new Set(visibleScores.map((s) => s.user_id).filter(Boolean))];
    if (uids.length > 0) {
      const { data: p } = await supabase.from("profiles").select("user_id, color_name").in("user_id", uids);
      const cm: Record<string, string | null> = {};
      p?.forEach((x: any) => cm[x.user_id] = x.color_name);
      setLeaderboardColors(cm);
    } else {
      setLeaderboardColors({});
    }
  }, [leaderboardConsole]);

  useEffect(() => {
    fetchLeaderboard();

    const channel = supabase
      .channel(`biblioteca-leaderboard-${leaderboardConsole}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard_scores", filter: `console_type=eq.${leaderboardConsole}` },
        () => fetchLeaderboard(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard, leaderboardConsole]);

  const handleSuggestSubmit = async () => {
    if (!user || !gameName.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("game_suggestions" as any).insert({ user_id: user.id, console_type: suggestConsole, game_name: gameName.trim(), description: description.trim() } as any);
      if (error) {
        toast({ title: "Error al enviar", description: error.message, variant: "destructive" });
        return;
      }
      // Notificar SOLO a master_web + admin (no moderadores) y SIN link
      try {
        const content = `[COLOR:#22c55e]🎮 NUEVA SUGERENCIA DE JUEGO[/COLOR]\n\n[COLOR:#3b82f6]👤 ${user.user_metadata?.username || user.email || 'Anónimo'}[/COLOR]\n[COLOR:#eab308]🕹️ Consola: ${suggestConsole}[/COLOR]\n[COLOR:#eab308]🎯 Juego: ${gameName}[/COLOR]\n\n[COLOR:#ffffff]${description || '(sin descripción)'}[/COLOR]`;
        await supabase.rpc("send_system_admin_message" as any, {
          p_title: `Sugerencia de juego: ${gameName}`,
          p_content: content,
          p_message_type: 'game_suggestion',
        });
      } catch {}
      toast({ title: "Sugerencia enviada", description: "El staff la revisará pronto." });
      setGameName(""); setDescription("");
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "No se pudo enviar", variant: "destructive" });
    } finally { setSending(false); }
  };

  const openEdit = (game: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingGame(game);
    setEditName(game.name);
    setEditCover(game.customCover || "");
  };

  const saveGameEdit = async () => {
    if (!editingGame || !user) return;
    setSavingEdit(true);
    try {
      const newName = editName.trim() || null;
      const newCover = editCover.trim() || null;
      
      // 1. Guardar en tabla antigua
      await supabase.from("user_drive_games" as any).update({
        custom_name: newName,
        custom_cover_url: newCover,
      }).eq("id", editingGame.driveRowId).eq("user_id", user.id);

      // 2. Guardar en nueva tabla (Evitando el UPSERT problemático)
      if (editingGame.fileName) {
        // Primero buscamos si ya existe el registro para este usuario y archivo
        const { data: existingRaw } = await supabase
          .from("user_game_covers" as any)
          .select("id")
          .eq("user_id", user.id)
          .eq("file_name", editingGame.fileName)
          .maybeSingle();
        const existing: any = existingRaw;

        if (existing) {
          // Si existe, actualizamos
          const { error: updateErr } = await supabase
            .from("user_game_covers" as any)
            .update({
              custom_name: newName,
              custom_cover_url: newCover,
              updated_at: new Date().toISOString()
            })
            .eq("id", existing.id);
            
          if (updateErr) throw new Error("Error de base de datos (Actualizar): " + updateErr.message);
        } else {
          // Si no existe, insertamos
          const { error: insertErr } = await supabase
            .from("user_game_covers" as any)
            .insert({
              user_id: user.id,
              file_name: editingGame.fileName,
              custom_name: newName,
              custom_cover_url: newCover
            });
            
          if (insertErr) throw new Error("Error de base de datos (Insertar): " + insertErr.message);
        }
      }

      setDriveGames(prev => prev.map(g => g.id === editingGame.driveRowId ? { ...g, custom_name: newName, custom_cover_url: newCover } : g));
      toast({ title: "Juego actualizado" });
      setEditingGame(null);
    } catch (e: any) {
      console.error(e);
      // ESTA ALERTA AHORA SÍ TE DIRÁ EXACTAMENTE QUÉ FALLA EN LA BASE DE DATOS
      toast({ title: "Error", description: e.message || "Error desconocido", variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  const multiplayerGames = [
    { id: 'pong', label: 'Pong / Air Hockey', coverUrl: '/games/covers/pong-air-hockey.svg', maxPlayers: 2, playersLabel: '2P' },
    { id: 'agar', label: 'Agar.io-like', coverUrl: '/games/covers/agar-io-like.svg', maxPlayers: 10, playersLabel: '10P' },
    { id: 'chess', label: 'Ajedrez Arcade', coverUrl: '/games/covers/chess.svg', maxPlayers: 10, playersLabel: '2P + 8 ESP' },
    { id: 'massive-decks', label: 'Massive Decks', coverUrl: '/games/covers/massive-decks.svg', maxPlayers: 20, playersLabel: 'PARTY' },
    { id: 'tic-tac-toe', label: 'Tic Tac Toe', coverUrl: '/games/covers/tic-tac-toe.svg', maxPlayers: 2, playersLabel: '2P' },
    { id: 'card-duel', label: 'Card Duel (Hearthstone lite)', coverUrl: '/games/covers/card-duel.svg', maxPlayers: 2, playersLabel: '2P' }
  ];

  // Opciones para el dropdown unificado
  const dropdownOptions: Array<{ type: string; label: string; value?: string; color?: string }> = [
    ...activeConsoles.map(c => ({
      type: 'console',
      value: `console:${c.id}`,
      label: c.label,
      color: c.color
    })),
    { type: 'section', label: '────────────' },
    { type: 'multiplayer', value: 'multi', label: '🎮 Multijugador', color: 'text-neon-magenta' }
  ];

  const consoleInfo = dropdownValue === 'multi'
    ? { id: 'multiplayer', label: 'Multijugador', color: 'text-neon-magenta' }
    : activeConsoles.find((c) => c.id === selectedConsole) || activeConsoles[0];

  return (
    <div className="space-y-4 animate-fade-in max-w-7xl mx-auto pb-12 px-4 md:px-0">
      {/* Selector unificado debajo del cuadro de título */}
      <div className="hidden">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={dropdownValue}
            onChange={e => {
              const val = e.target.value;
              setDropdownValue(val);
              if (val.startsWith('console:')) {
                setSelectedConsole(val.replace('console:', ''));
                setSelectedMultiGame(null);
                setSearchQuery('');
              } else if (val === 'multi') {
                setSelectedConsole('multiplayer');
                setSelectedMultiGame(null);
              }
            }}
            className="h-10 rounded-lg border border-border bg-card text-xs font-body px-3 text-foreground outline-none shadow-lg focus:border-neon-cyan/50 transition-colors min-w-[160px]"
            aria-label="Seleccionar consola o multijugador"
          >
            {dropdownOptions.map((opt, i) =>
              opt.type === 'section' ? (
                <option key={i} disabled>────────────</option>
              ) : (
                <option key={opt.value || i} value={opt.value} className={opt.color ? opt.color : ''}>{opt.label}</option>
              )
            )}
          </select>
        </div>
        <div className="relative flex-1 max-w-sm md:ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={`Buscar en ${consoleInfo?.label}...`} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-9 h-8 bg-card border-border font-body text-xs focus:border-primary transition-colors" 
          />
        </div>
      </div>

      {/* Encabezado y bóveda */}
      <div className="bg-card border border-neon-green/30 rounded-lg p-4 relative">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> SALAS DE JUE<VaultHint letter="G" position={10} color="text-neon-magenta" />O
        </h1>
        <p className="text-xs text-muted-foreground font-body">Selecciona una consola, elige un juego y empieza a jugar.</p>
        <button
          aria-label="."
          title=""
          onClick={() => setVaultModalOpen(true)}
          className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-neon-yellow/10 hover:bg-neon-yellow/40 transition-colors"
        />
      </div>
      <VaultPasswordModal open={vaultModalOpen} onOpenChange={setVaultModalOpen} />

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex w-full items-center gap-2 md:w-auto">
          <select
            value={dropdownValue}
            onChange={e => {
              const val = e.target.value;
              setDropdownValue(val);
              if (val.startsWith('console:')) {
                setSelectedConsole(val.replace('console:', ''));
                setSelectedMultiGame(null);
                setSearchQuery('');
              } else if (val === 'multi') {
                setSelectedConsole('multiplayer');
                setSelectedMultiGame(null);
              }
            }}
            className="h-9 w-full min-w-[160px] rounded-lg border border-border bg-card px-3 font-body text-xs text-foreground shadow-lg outline-none transition-colors focus:border-neon-cyan/50 md:w-auto"
            aria-label="Seleccionar consola o multijugador"
          >
            {dropdownOptions.map((opt, i) =>
              opt.type === 'section' ? (
                <option key={i} disabled>────────────</option>
              ) : (
                <option key={opt.value || i} value={opt.value} className={opt.color ? opt.color : ''}>{opt.label}</option>
              )
            )}
          </select>
          <div className="relative flex-1 md:w-80 md:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Buscar en ${consoleInfo?.label}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 border-border bg-card pl-9 font-body text-xs transition-colors focus:border-primary"
            />
          </div>
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
        <Link
          to="/arcade/consejos#retroroms-tutorial"
          className="group relative overflow-hidden rounded-lg border border-destructive/50 bg-gradient-to-br from-destructive/30 via-card to-destructive/10 px-3 h-8 inline-flex items-center gap-2 shrink-0 transition-all hover:border-destructive hover:shadow-[0_0_24px_-6px_hsl(var(--destructive))]"
          title="Cómo sincronizar tus ROMs con Google Drive"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <Flame className="relative w-3.5 h-3.5 text-destructive drop-shadow-[0_0_6px_hsl(var(--destructive))]" />
          <span className="relative font-pixel text-[10px] uppercase tracking-wider text-destructive">IMPORTANTE</span>
        </Link>
      </div>

      {/* Mostrar juegos clásicos o multijugador según el dropdown */}
      {dropdownValue !== 'multi' ? (
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
                    <>
                      <div className="absolute top-1 right-1 bg-black/60 p-1 rounded-full z-10 backdrop-blur-sm border border-white/10">
                        <Cloud className="w-3 h-3 text-[#4285F4]" />
                      </div>
                      <button
                        onClick={(e) => openEdit(game, e)}
                        className="absolute top-1 left-1 bg-black/60 p-1 rounded-full z-10 backdrop-blur-sm border border-white/10 hover:bg-neon-cyan/30 transition-colors"
                        title="Editar nombre o portada"
                      >
                        <Pencil className="w-3 h-3 text-neon-cyan" />
                      </button>
                    </>
                  )}
                  <div className="aspect-square overflow-hidden bg-muted flex items-center justify-center relative">
                    {launchingGameId === game.id ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                      <GameCover 
                        gameName={game.originalName || game.name} 
                        consoleId={game.console} 
                        isCloud={game.isCloud} 
                        defaultCover={game.coverUrl} 
                        customCover={game.customCover}
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
      ) : (
        <div className="space-y-4">
          <div className="bg-card border border-neon-magenta/30 rounded-lg p-4">
            <h1 className="font-pixel text-sm text-neon-magenta text-glow-magenta mb-1 flex items-center gap-2">
              <User className="w-4 h-4" /> MULTIJUGADOR
            </h1>
            <p className="text-xs text-muted-foreground font-body">Juegos web para jugar con amigos a través del servidor integrado.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {multiplayerGames.map(g => (
              <div
                key={g.id}
                onClick={() => setSelectedMultiGame(g)}
                className="group bg-card border border-border rounded-lg overflow-hidden hover:border-neon-magenta/60 hover:shadow-[0_0_18px_-4px_hsl(var(--primary))] transition-all duration-300 cursor-pointer relative"
              >
                <div className="aspect-square bg-muted overflow-hidden relative">
                  <img src={g.coverUrl} alt={g.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute right-2 top-2 rounded border border-neon-cyan/40 bg-black/75 px-1.5 py-1 font-pixel text-[8px] text-neon-cyan shadow-lg">
                    {g.playersLabel}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
                    <div className="text-[11px] font-bold text-white drop-shadow">{g.label}</div>
                  </div>
                </div>
                <div className="p-2 flex items-center gap-1">
                  <Play className="w-3 h-3 text-neon-magenta shrink-0" />
                  <p className="text-[10px] font-body text-foreground truncate">{g.label}</p>
                  <span className="ml-auto shrink-0 font-pixel text-[8px] text-neon-cyan">{g.playersLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
        <div className="bg-card border border-neon-yellow/20 rounded-lg overflow-hidden h-fit">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-neon-yellow" />
            <h2 className="font-pixel text-[10px] text-neon-yellow">LEADERBOARD — {consoleInfo?.label.toUpperCase()}</h2>
          </div>
          {leaderboard.length === 0 ? <div className="p-4 text-center text-[10px] text-muted-foreground">Sin puntuaciones.</div> : leaderboard.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-border/30 text-[10px] font-body">
              <span className={cn("w-5 font-bold text-center", i === 0 ? "text-neon-yellow" : "text-muted-foreground")}>{i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium" style={getNameStyle(leaderboardColors[s.user_id])}>{s.display_name}</span>
                <span className="truncate text-[8px] text-muted-foreground">{s.game_name}</span>
              </span>
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

      {/* Bloque legacy de multijugador desactivado: el dropdown ya renderiza esta vista arriba.
        <div className="space-y-4">
          <div className="bg-card border border-neon-magenta/30 rounded-lg p-4">
            <h1 className="font-pixel text-sm text-neon-magenta text-glow-magenta mb-1 flex items-center gap-2">
              <User className="w-4 h-4" /> MULTIJUGADOR
            </h1>
            <p className="text-xs text-muted-foreground font-body">Juegos web para jugar con amigos a través del servidor integrado.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {multiplayerGames.map(g => (
              <div
                key={g.id}
                onClick={() => { setSelectedMultiGame(g.id); setMultiGameOpen(true); }}
                className="group bg-card border border-border rounded-lg overflow-hidden hover:border-neon-magenta/60 hover:shadow-[0_0_18px_-4px_hsl(var(--primary))] transition-all duration-300 cursor-pointer relative"
              >
                <div className="aspect-square bg-gradient-to-br from-neon-magenta/30 via-card to-neon-cyan/20 flex items-center justify-center">
                  <div className="text-center text-[12px] px-2">{g.label}</div>
                </div>
                <div className="p-2 flex items-center gap-1">
                  <Play className="w-3 h-3 text-neon-magenta shrink-0" />
                  <p className="text-[10px] font-body text-foreground truncate">{g.label}</p>
                  <span className="ml-auto font-pixel text-[8px] text-neon-cyan">2P</span>
                </div>
              </div>
            ))}
          </div>

          <Dialog open={multiGameOpen} onOpenChange={(o) => { if(!o){ setSelectedMultiGame(null); setMultiGameOpen(false); } else setMultiGameOpen(o); }}>
            <DialogContent className="max-w-5xl w-[95vw] h-[85vh] bg-black border-2 border-neon-magenta/50 p-2 flex flex-col">
              <DialogHeader className="px-2 pt-1 pb-2 flex-shrink-0">
                <DialogTitle className="font-pixel text-xs text-neon-magenta flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4" /> {selectedMultiGame ? multiplayerGames.find(x=>x.id===selectedMultiGame)?.label : 'Juego'}
                </DialogTitle>
              </DialogHeader>
              <iframe
                src={selectedMultiGame ? `/games/${selectedMultiGame}/index.html` : undefined}
                title={selectedMultiGame || 'multijugador'}
                className="w-full flex-1 rounded border border-neon-magenta/30 bg-black"
                allow="gamepad; fullscreen; autoplay"
              />
            </DialogContent>
          </Dialog>
        </div>
      */}

      <Dialog open={!!editingGame} onOpenChange={(o) => !o && setEditingGame(null)}>
        <DialogContent className="bg-card border-neon-cyan/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-pixel text-xs text-neon-cyan flex items-center gap-2">
              <Pencil className="w-4 h-4" /> EDITAR JUEGO
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">Nombre personalizado</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder={editingGame?.originalName} className="bg-muted text-sm mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">URL de portada</label>
              <Input value={editCover} onChange={(e) => setEditCover(e.target.value)} placeholder="https://..." className="bg-muted text-sm mt-1" />
              {editCover && (
                <div className="mt-2 aspect-square w-32 bg-muted rounded overflow-hidden border border-border">
                  <img src={editCover} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setEditingGame(null)}>Cancelar</Button>
            <Button size="sm" onClick={saveGameEdit} disabled={savingEdit} className="bg-neon-cyan/80 text-black hover:bg-neon-cyan">
              {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MultiplayerGameBubble game={selectedMultiGame} onClose={() => setSelectedMultiGame(null)} />

    </div>
  );
}
