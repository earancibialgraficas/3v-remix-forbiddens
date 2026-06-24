import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import VaultHint from "@/components/VaultHint";
import { Gamepad2, Trophy, Play, User, Lightbulb, Send, Search, Cloud, Lock, Loader2, RefreshCw, Pencil, Cpu, Download, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getNameStyle } from "@/lib/profileAppearance";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { allGames } from "@/lib/gameLibrary";
import { canPlayExtraConsole } from "@/lib/membershipLimits";
import { supabase } from "@/integrations/supabase/client";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { useSearchParams, Link, useLocation } from "react-router-dom";
import VaultPasswordModal from "@/components/VaultPasswordModal";
import MultiplayerGameBubble from "@/components/MultiplayerGameBubble";
import { consoleTypeToId, dedupeDriveRomCandidates, getConsoleType, listDriveRomFiles, ROM_FILE_REGEX } from "@/lib/driveRomUtils";
import { buildCoverBackupMap, getCoverBackup, loadLocalCoverBackups, saveLocalCoverBackups } from "@/lib/driveCoverBackup";
import { formatLauncherBridgeError, getLauncherBridge, launcherSupportsNative, type NativeDownloadProgressEvent, type NativeEngineStatus } from "@/lib/launcherBridge";
import { useNativeSession } from "@/contexts/NativeSessionContext";
import { getDriveOAuthChannelName, storeDriveAccessToken } from "@/lib/driveOAuthBridge";
import { getNativeCloudSaveKind, restoreNativeCloudSave } from "@/lib/nativeCloudSaves";

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

type NativeDownloadUiJob = {
  jobId: string;
  gameId: string;
  gameName: string;
  consoleId: string;
  engineName: string;
  romPath: string;
  source: "drive" | "public";
  autoOpen: boolean;
  progress: number;
  downloaded: number;
  total: number;
  status: "downloading" | "completed" | "error";
  error?: string | null;
};

const formatDownloadBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
};

const baseConsoles = [
  { id: "nes", label: "NES", color: "text-neon-green" },
  { id: "snes", label: "SNES", color: "text-neon-cyan" },
  { id: "gba", label: "Game Boy Advance", color: "text-neon-magenta" },
  { id: "n64", label: "Nintendo 64", color: "text-[#ffff00]" },
];

const DRIVE_SYNC_OAUTH_STATE_KEY = "drive_sync_oauth_external_state";
const DRIVE_SYNC_OAUTH_RETURN_KEY = "drive_sync_oauth_return_path";

const getCachedDriveToken = () => {
  const cachedToken = localStorage.getItem("drive_access_token") || sessionStorage.getItem("drive_access_token");
  const tokenExpiry = Number(localStorage.getItem("drive_token_expiry") || sessionStorage.getItem("drive_token_expiry") || 0);
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) return cachedToken;
  return null;
};

const encodeDriveOAuthState = (returnPath: string) => {
  const payload = JSON.stringify({
    v: 1,
    nonce: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    returnPath,
  });
  return btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const waitForGoogleIdentity = () =>
  new Promise<any>((resolve, reject) => {
    const existing = (window as any).google;
    if (existing?.accounts?.oauth2) {
      resolve(existing);
      return;
    }

    let settled = false;
    const finish = () => {
      const google = (window as any).google;
      if (google?.accounts?.oauth2) {
        settled = true;
        resolve(google);
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    const script = existingScript || document.createElement("script");
    const timeout = window.setTimeout(() => {
      if (!settled) reject(new Error("Google Identity no termino de cargar."));
    }, 12_000);

    script.onload = () => {
      window.clearTimeout(timeout);
      finish();
      if (!settled) reject(new Error("Google Identity no entrego OAuth."));
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("No se pudo cargar Google Identity."));
    };

    if (!existingScript) {
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      document.body.appendChild(script);
    }
  });

interface LeaderboardScore {
  id: string;
  display_name: string;
  game_name: string;
  console_type: string;
  score: number;
  user_id: string;
}

interface MultiplayerLibraryGame {
  id: string;
  label: string;
  coverUrl: string;
  maxPlayers?: number;
  playersLabel?: string;
  externalUrl?: string;
  rewardSlug?: string;
  extraPoints?: boolean;
  wagerGame?: boolean;
}

export default function BibliotecaPage() {
  const { user, profile, isStaff } = useAuth();
  const { toast } = useToast();
  const { launchGame } = useGameBubble();
  const { launchNativeSession } = useNativeSession();
  const location = useLocation();
  const canExtra = canPlayExtraConsole(profile?.membership_tier, isStaff);
  
  const [activeConsoles, setActiveConsoles] = useState(baseConsoles);
  const [driveGames, setDriveGames] = useState<any[]>([]);
  const [launchingGameId, setLaunchingGameId] = useState<string | null>(null);
  const [nativeBusyGameId, setNativeBusyGameId] = useState<string | null>(null);
  const [selectedNativeStatus, setSelectedNativeStatus] = useState<NativeEngineStatus | null>(null);
  const [selectedNativeBusy, setSelectedNativeBusy] = useState(false);
  const [launcherDetected, setLauncherDetected] = useState(() => Boolean(getLauncherBridge()));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingGame, setEditingGame] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editCover, setEditCover] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  // Eliminamos el tab, todo será controlado por el dropdown
  const [selectedMultiGame, setSelectedMultiGame] = useState<MultiplayerLibraryGame | null>(null);
  
  const [searchParams, setSearchParams] = useSearchParams();

  // 🔄 Lógica de persistencia unificada para Consolas y Multijugador
  const routeTab = location.pathname === "/arcade/bet" ? "bet" : null;
  const savedTab = routeTab || searchParams.get("tab") || (typeof window !== "undefined" ? localStorage.getItem("biblioteca:activeTab") : null);
  const rawInitialConsole = searchParams.get("console") || (typeof window !== "undefined" ? localStorage.getItem("biblioteca:console") : null) || "snes";
  
  const validConsoleIds = ["nes", "snes", "gba", "n64", "ps1", "psp", "arcade"];
  const initialConsoleParam = savedTab === "multi" || savedTab === "bet"
    ? "multiplayer"
    : validConsoleIds.includes(rawInitialConsole) ? rawInitialConsole : "snes";
  
  const [selectedConsole, setSelectedConsole] = useState<string>(initialConsoleParam);
  const [dropdownValue, setDropdownValue] = useState<string>(savedTab === "bet" ? "bet" : savedTab === "multi" ? "multi" : `console:${initialConsoleParam}`);
  const [preferNativeEmulator, setPreferNativeEmulator] = useState(true);
  const [nativeDownloadMode, setNativeDownloadMode] = useState(false);
  const [selectedDriveRomIds, setSelectedDriveRomIds] = useState<Set<string>>(() => new Set());
  const [downloadedDriveRomIds, setDownloadedDriveRomIds] = useState<Set<string>>(() => new Set());
  const [downloadingDriveRomIds, setDownloadingDriveRomIds] = useState<Set<string>>(() => new Set());
  const [nativeDownloadJobs, setNativeDownloadJobs] = useState<NativeDownloadUiJob[]>([]);
  const nativeDownloadJobsRef = useRef<NativeDownloadUiJob[]>([]);

  const downloadedDriveRomsKey = `biblioteca:nativeDownloaded:${user?.id || "anonymous"}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = JSON.parse(localStorage.getItem(downloadedDriveRomsKey) || "[]");
      setDownloadedDriveRomIds(new Set(Array.isArray(saved) ? saved : []));
    } catch {
      setDownloadedDriveRomIds(new Set());
    }
    setSelectedDriveRomIds(new Set());
    setNativeDownloadMode(false);
  }, [downloadedDriveRomsKey]);

  const markDriveRomDownloaded = (fileId: string) => {
    setDownloadedDriveRomIds(prev => {
      const next = new Set(prev);
      next.add(fileId);
      if (typeof window !== "undefined") {
        localStorage.setItem(downloadedDriveRomsKey, JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const upsertNativeDownloadJob = useCallback((job: NativeDownloadUiJob) => {
    setNativeDownloadJobs((prev) => {
      const next = [job, ...prev.filter((item) => item.jobId !== job.jobId)].slice(0, 4);
      nativeDownloadJobsRef.current = next;
      return next;
    });
  }, []);

  const patchNativeDownloadJob = useCallback((jobId: string, patch: Partial<NativeDownloadUiJob>) => {
    setNativeDownloadJobs((prev) => {
      const next = prev.map((item) => (item.jobId === jobId ? { ...item, ...patch } : item));
      nativeDownloadJobsRef.current = next;
      return next;
    });
  }, []);

  const openDownloadedNativeGame = useCallback(async (job: NativeDownloadUiJob) => {
    const bridge = getLauncherBridge();
    if (!bridge?.openNativeEmulator) return;
    try {
      const restoredNativeSave = await restoreNativeCloudSave({
        consoleId: job.consoleId,
        gameName: job.gameName,
        romPath: job.romPath,
      }).catch((error) => {
        console.warn("Native cloud save restore skipped:", error);
        return false;
      });
      const launchResult: any = await bridge.openNativeEmulator(job.consoleId, job.romPath);
      const processId = typeof launchResult === "object" ? Number(launchResult?.process_id || 0) || null : null;
      if (restoredNativeSave && getNativeCloudSaveKind(job.consoleId) === "savestate" && processId) {
        window.setTimeout(() => {
          bridge.nativeEmulatorAction?.(processId, "load_state").catch(() => {});
        }, 1800);
      }
      launchNativeSession({
        consoleName: job.consoleId,
        gameName: job.gameName,
        engineName: job.engineName || "Emulador nativo",
        romPath: job.romPath,
        processId,
      });
      if (job.source === "drive") markDriveRomDownloaded(job.gameId);
      patchNativeDownloadJob(job.jobId, { status: "completed", progress: 100 });
      toast({ title: "Abriendo emulador nativo", description: `${job.engineName} iniciando con ${job.gameName}.` });
    } catch (error: any) {
      patchNativeDownloadJob(job.jobId, {
        status: "error",
        error: formatLauncherBridgeError(error, "La ROM se descargo, pero no se pudo abrir el emulador."),
      });
    }
  }, [launchNativeSession, patchNativeDownloadJob, toast]);

  useEffect(() => {
    const listen = (window as any).__TAURI__?.event?.listen;
    if (typeof listen !== "function") return;

    let unlisten: (() => void) | null = null;
    listen("forbiddens-native-download-progress", (event: any) => {
      const payload = event?.payload as NativeDownloadProgressEvent | undefined;
      if (!payload?.job_id) return;
      const currentJob = nativeDownloadJobsRef.current.find((job) => job.jobId === payload.job_id);
      if (!currentJob) return;

      patchNativeDownloadJob(payload.job_id, {
        status: payload.status,
        progress: Math.max(0, Math.min(100, Number(payload.progress || 0))),
        downloaded: Number(payload.downloaded || 0),
        total: Number(payload.total || 0),
        error: payload.error || null,
      });

      if (payload.status === "completed") {
        const completedJob = {
          ...currentJob,
          romPath: payload.rom_path || currentJob.romPath,
          status: "completed" as const,
          progress: 100,
        };
        if (completedJob.source === "drive") markDriveRomDownloaded(completedJob.gameId);
        setDownloadingDriveRomIds((prev) => {
          const next = new Set(prev);
          next.delete(completedJob.gameId);
          return next;
        });
        setSelectedDriveRomIds((prev) => {
          const next = new Set(prev);
          next.delete(completedJob.gameId);
          return next;
        });
        if (completedJob.autoOpen) {
          void openDownloadedNativeGame(completedJob);
        }
      }
    }).then((cleanup: () => void) => {
      unlisten = cleanup;
    }).catch(() => {});

    return () => {
      unlisten?.();
    };
  }, [openDownloadedNativeGame, patchNativeDownloadJob]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(`biblioteca:nativeMode:${selectedConsole}`);
    setPreferNativeEmulator(saved !== "web");
  }, [selectedConsole]);

  const setNativeModePreference = (checked: boolean) => {
    setPreferNativeEmulator(checked);
    if (!checked) {
      setNativeDownloadMode(false);
      setSelectedDriveRomIds(new Set());
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(`biblioteca:nativeMode:${selectedConsole}`, checked ? "native" : "web");
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("biblioteca:console", selectedConsole);
      localStorage.setItem("biblioteca:activeTab", dropdownValue);
    }
    
    const next = new URLSearchParams();
    // Si es multi, solo guardamos el tab. Si es consola, guardamos la consola.
    if (dropdownValue === "multi") next.set("tab", "multi");
    else if (dropdownValue === "bet") next.set("tab", "bet");
    else next.set("console", selectedConsole);

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [selectedConsole, dropdownValue, searchParams, setSearchParams]);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (launcherDetected) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (getLauncherBridge()) {
        setLauncherDetected(true);
        window.clearInterval(timer);
      } else if (attempts >= 40) {
        window.clearInterval(timer);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [launcherDetected]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const bridge = getLauncherBridge();
      if (!launcherDetected || !launcherSupportsNative(selectedConsole) || !bridge?.nativeEngineStatus) {
        setSelectedNativeStatus(null);
        return;
      }
      try {
        const status = await bridge.nativeEngineStatus(selectedConsole);
        if (!cancelled) setSelectedNativeStatus(status);
      } catch {
        if (!cancelled) setSelectedNativeStatus(null);
      }
    };
    void refresh();
    return () => {
      cancelled = true;
    };
  }, [launcherDetected, selectedConsole]);

  const installSelectedNativeEngine = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    const bridge = getLauncherBridge();
    if (!bridge?.installNativeEngine) return;
    setSelectedNativeBusy(true);
    try {
      const status = await bridge.installNativeEngine(selectedConsole);
      setSelectedNativeStatus(status);
      toast({ title: "Emulador instalado", description: `${status.engine_name} quedo listo para ${selectedConsole.toUpperCase()}.` });
    } catch (error: any) {
      toast({
        title: "No se pudo instalar",
        description: formatLauncherBridgeError(error, "No se pudo preparar el emulador nativo."),
        variant: "destructive",
      });
    } finally {
      setSelectedNativeBusy(false);
    }
  };

  const reinstallSelectedNativeEngine = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    const bridge = getLauncherBridge();
    if (!bridge?.reinstallNativeEngine) return;
    const engineName = selectedNativeStatus?.engine_name || selectedConsole.toUpperCase();
    const wantsReinstall = window.confirm(`¿Reinstalar ${engineName} para ${selectedConsole.toUpperCase()}? Esto reparara archivos incompletos o corruptos del emulador.`);
    if (!wantsReinstall) return;

    setSelectedNativeBusy(true);
    try {
      const status = await bridge.reinstallNativeEngine(selectedConsole);
      setSelectedNativeStatus(status);
      toast({ title: "Emulador reparado", description: `${status.engine_name} quedo reinstalado para ${selectedConsole.toUpperCase()}.` });
    } catch (error: any) {
      toast({
        title: "No se pudo reinstalar",
        description: formatLauncherBridgeError(error, "No se pudo reparar el emulador nativo."),
        variant: "destructive",
      });
    } finally {
      setSelectedNativeBusy(false);
    }
  };
  
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

  const fetchDriveGames = useCallback(async (rescan = false) => {
    if (!user) return;
    if (rescan) setIsRefreshing(true);

    try {
      if (rescan) {
        try {
          const token = await requestGoogleTokenForDrive();
          const folderQuery = "mimeType = 'application/vnd.google-apps.folder' and name = 'RetroRoms' and trashed = false";
          const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(folderQuery)}&fields=files(id,name)`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const folderData = await folderRes.json();

          if (folderData.files && folderData.files.length > 0) {
            const folderId = folderData.files[0].id;
            const driveFiles = await listDriveRomFiles(token, folderId);
            const validFiles = driveFiles.filter((f) => ROM_FILE_REGEX.test(f.name));
            if (validFiles.length > 0) {
              const { data: savedCovers } = await supabase
                .from('user_game_covers' as any)
                .select('file_name, custom_name, custom_cover_url')
                .eq('user_id', user.id);
              const coverMap = buildCoverBackupMap([
                ...((savedCovers || []) as any[]),
                ...loadLocalCoverBackups(user.id),
              ]);
              const dedupedFiles = dedupeDriveRomCandidates(validFiles.map((f) => ({
                ...f,
                file_name: f.name,
                console_type: getConsoleType(f.name, f.parentHint),
                hasHint: !!f.parentHint,
                restored: getCoverBackup(coverMap, f.name),
              })));
              const gamesToSave = dedupedFiles.map((f) => ({
                user_id: user.id,
                drive_file_id: f.id,
                file_name: f.name,
                console_type: f.console_type,
                ...(f.restored?.custom_name ? { custom_name: f.restored.custom_name } : {}),
                ...(f.restored?.custom_cover_url ? { custom_cover_url: f.restored.custom_cover_url } : {}),
              }));
              const keepIds = new Set(gamesToSave.map((g) => g.drive_file_id));
              const { data: existingRows } = await supabase
                .from('user_drive_games' as any)
                .select('drive_file_id')
                .eq('user_id', user.id);
              const stale = (existingRows || [])
                .map((r: any) => r.drive_file_id)
                .filter((id: string) => !keepIds.has(id));
              if (stale.length > 0) {
                await supabase.from('user_drive_games' as any).delete().eq('user_id', user.id).in('drive_file_id', stale);
              }
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
        const coverMap = buildCoverBackupMap([
          ...((coverData || []) as any[]),
          ...loadLocalCoverBackups(user.id),
        ]);
        const validGames = driveData.filter((g: any) => {
          const name = g.file_name.toLowerCase();
          return /\.(sfc|smc|nes|gba|z64|n64|v64|bin|iso|cue|chd|cso|pbp)$/i.test(name);
        }).map((g: any) => {
            const customData: any = getCoverBackup(coverMap, g.file_name);
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
          let id = consoleTypeToId(consoleName);
          let color = "text-foreground";

          if (consoleName === 'PlayStation 1') { id = 'ps1'; color = 'text-gray-400'; }
          if (consoleName === 'PlayStation Portable') { id = 'psp'; color = 'text-neon-cyan'; }
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

  const requestGoogleTokenForDrive = async (): Promise<string> => {
    const cachedToken = getCachedDriveToken();
    if (cachedToken) return cachedToken;

    const launcher = getLauncherBridge();
    if (launcher?.openExternal) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error("Google Drive no esta configurado.");

      const returnPath = `${window.location.pathname}${window.location.search}` || "/arcade/biblioteca";
      const state = encodeDriveOAuthState(returnPath);
      localStorage.setItem(DRIVE_SYNC_OAUTH_STATE_KEY, state);
      localStorage.setItem(DRIVE_SYNC_OAUTH_RETURN_KEY, returnPath);

      const connectionUrl = new URL("/launcher/drive-sync", "https://forbiddens.net");
      connectionUrl.searchParams.set("start", "1");
      connectionUrl.searchParams.set("state", state);
      connectionUrl.searchParams.set("return", returnPath);

      const channelName = getDriveOAuthChannelName(state);
      if (!channelName) throw new Error("No se pudo crear el canal de autorizacion de Drive.");

      toast({
        title: "Autoriza Google Drive",
        description: "Se abrira tu navegador. Al aceptar, el launcher continuara automaticamente.",
      });

      return new Promise((resolve, reject) => {
        const channel = supabase.channel(channelName);
        let settled = false;
        let opened = false;
        let timeout: number;

        const cleanup = async () => {
          window.clearTimeout(timeout);
          localStorage.removeItem(DRIVE_SYNC_OAUTH_STATE_KEY);
          localStorage.removeItem(DRIVE_SYNC_OAUTH_RETURN_KEY);
          await supabase.removeChannel(channel);
        };

        const finish = (handler: () => void) => {
          if (settled) return;
          settled = true;
          void cleanup();
          handler();
        };

        timeout = window.setTimeout(() => {
          finish(() => reject(new Error("No se recibio la autorizacion de Google Drive. Vuelve a intentarlo desde el launcher.")));
        }, 180_000);

        channel.on("broadcast", { event: "drive-token" }, ({ payload }: any) => {
          if (!payload || payload.state !== state || !payload.accessToken) return;
          storeDriveAccessToken(payload.accessToken, payload.expiresIn);
          finish(() => resolve(payload.accessToken));
        });

        channel.subscribe(async status => {
          if (settled) return;
          if (status === "SUBSCRIBED" && !opened) {
            opened = true;
            const ok = await launcher.openExternal?.(connectionUrl.toString());
            if (!ok) {
              finish(() => reject(new Error("No se pudo abrir el navegador para autorizar Google Drive.")));
            }
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            finish(() => reject(new Error("No se pudo preparar la verificacion con el launcher. Intenta de nuevo.")));
          }
        });
      });
    }

    const google = await waitForGoogleIdentity();
    if (!google?.accounts?.oauth2) throw new Error("Google Identity no entrego OAuth.");

    return new Promise((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
        prompt: "",
        callback: (response: any) => {
          if (response.error) {
            reject(response);
            return;
          }

          storeDriveAccessToken(response.access_token, response.expires_in);
          resolve(response.access_token);
        },
        error_callback: (error: any) => reject(error),
      });
      client.requestAccessToken();
    });
  };

const handlePlayCloudGame = async (game: any) => {
    // Si ya hay un juego abriéndose, no hacemos nada
    if (launchingGameId) return;
    if (game.console === "psp") {
      toast({
        title: "Solo disponible en launcher",
        description: "Los juegos PSP de Drive ahora se abren con PPSSPP nativo desde FORBIDDENS Launcher.",
        variant: "destructive",
      });
      return;
    }
    
    // Guardamos la ID del juego específico que clickeó el usuario
    setLaunchingGameId(game.id);
    const isPspCloudGame = game.console === "psp";
    let pspWindow: Window | null = null;
    toast({
      title: "Iniciando...",
      description: isPspCloudGame ? "Abriendo EmulatorJS PSP en una ventana dedicada." : "Conectando al servidor en la nube.",
    });

    try {
      if (isPspCloudGame) {
        pspWindow = window.open("", "_blank", "popup=yes,width=1280,height=820");
        if (pspWindow) {
          pspWindow.document.write(`<!doctype html><html><head><title>FORBIDDENS PSP</title><style>html,body{height:100%;margin:0;background:#020617;color:#00f2fe;display:grid;place-items:center;font:900 13px 'Courier New',monospace}div{text-align:center}span{display:block;width:38px;height:38px;margin:0 auto 14px;border-radius:50%;border:3px solid #123;border-top-color:#00f2fe;animation:s .8s linear infinite}@keyframes s{to{transform:rotate(360deg)}}</style></head><body><div><span></span>Preparando EmulatorJS PSP...</div></body></html>`);
          pspWindow.document.close();
        }
      }

      if (isPspCloudGame) {
        const accessToken = await requestGoogleTokenForDrive();
        const pspFileName = game.fileName || game.originalName || game.name;
        sessionStorage.setItem(`psp_launch_${game.id}`, JSON.stringify({ name: pspFileName }));
        const pspUrl = `/psp-standalone.html?file=${encodeURIComponent(game.id)}&name=${encodeURIComponent(pspFileName)}&direct=1&speed=max`;
        if (pspWindow && !pspWindow.closed) {
          pspWindow.location.replace(pspUrl);
          pspWindow.focus();
        } else {
          const opened = window.open(pspUrl, "_blank");
          if (opened) opened.focus();
          else toast({ title: "Ventana bloqueada", description: "Permite ventanas emergentes para abrir PSP sin reemplazar el sitio.", variant: "destructive" });
        }
        return;
      }

      if (!(window as any).__localRoms) (window as any).__localRoms = {};
      (window as any).__localRoms[game.id] = (async () => {
        const accessToken = await requestGoogleTokenForDrive();
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${game.id}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!response.ok) throw new Error("No se pudo descargar la ROM desde Drive.");

        const blob = await response.blob();
        const fileName = game.fileName || game.originalName || game.name;
        const file = new File([blob], fileName, { type: blob.type });
        (window as any).__localRoms[game.id] = file;
        return file;
      })();

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
      if (pspWindow && !pspWindow.closed) pspWindow.close();
      toast({ title: "Acceso denegado", description: "Hubo un error al leer la ROM desde tu Drive.", variant: "destructive" });
    } finally {
      // Cuando termina de cargar, limpiamos la ID
      window.setTimeout(() => setLaunchingGameId(null), isPspCloudGame ? 900 : 350);
    }
  };

  const handlePlayCloudGameNative = async (game: any, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const bridge = getLauncherBridge();
    if (!bridge?.nativeEngineStatus || ((!bridge?.startDriveRomDownloadForNative && !bridge?.downloadDriveRomForNative) || !bridge?.openNativeEmulator)) {
      toast({
        title: "Launcher desactualizado",
        description: "Actualiza FORBIDDENS Launcher para abrir ROMs de Drive en nativo.",
        variant: "destructive",
      });
      return;
    }
    if (nativeBusyGameId || launchingGameId) return;

    setNativeBusyGameId(game.id);
    try {
      let status = await bridge.nativeEngineStatus(game.console);
      if (!status.installed) {
        const wantsInstall = window.confirm(`Para jugar ${game.name} con mejor rendimiento hay que instalar ${status.engine_name} en este PC. ¿Instalar ahora?`);
        if (!wantsInstall) return;
        if (!bridge.installNativeEngine) throw new Error("El launcher no tiene instalador nativo disponible.");
        toast({ title: "Instalando motor nativo", description: `Preparando ${status.engine_name} para ${game.console.toUpperCase()}.` });
        status = await bridge.installNativeEngine(game.console);
      }

      if (!downloadedDriveRomIds.has(game.id)) {
        const wantsDownload = window.confirm(`Esta ROM aun no esta descargada para modo nativo. ¿Descargar "${game.name}" y abrirla ahora?`);
        if (!wantsDownload) return;
      }

      const accessToken = await requestGoogleTokenForDrive();
      if (bridge.startDriveRomDownloadForNative) {
        const job = await bridge.startDriveRomDownloadForNative({
          consoleId: game.console,
          fileId: game.id,
          fileName: game.fileName || game.originalName || game.name,
          accessToken,
        });
        const uiJob: NativeDownloadUiJob = {
          jobId: job.job_id,
          gameId: game.id,
          gameName: game.name,
          consoleId: game.console,
          engineName: status.engine_name || "Emulador nativo",
          romPath: job.rom_path,
          source: "drive",
          autoOpen: true,
          progress: job.cached ? 100 : 0,
          downloaded: 0,
          total: 0,
          status: job.cached ? "completed" : "downloading",
        };
        upsertNativeDownloadJob(uiJob);
        if (job.cached) {
          await openDownloadedNativeGame(uiJob);
        } else {
          toast({ title: "Descarga en segundo plano", description: `Puedes seguir usando el launcher mientras baja ${game.name}.` });
        }
        return;
      }

      toast({ title: "Descargando desde Drive", description: "Guardando una copia local para el emulador nativo." });
      const romPath = await bridge.downloadDriveRomForNative({
        consoleId: game.console,
        fileId: game.id,
        fileName: game.fileName || game.originalName || game.name,
        accessToken,
      });
      const restoredNativeSave = await restoreNativeCloudSave({
        consoleId: game.console,
        gameName: game.name,
        romPath,
      }).catch((error) => {
        console.warn("Native cloud save restore skipped:", error);
        return false;
      });
      const launchResult: any = await bridge.openNativeEmulator(game.console, romPath);
      const processId = typeof launchResult === "object" ? Number(launchResult?.process_id || 0) || null : null;
      if (restoredNativeSave && getNativeCloudSaveKind(game.console) === "savestate" && processId) {
        window.setTimeout(() => {
          bridge.nativeEmulatorAction?.(processId, "load_state").catch(() => {});
        }, 1800);
      }
      launchNativeSession({
        consoleName: game.console,
        gameName: game.name,
        engineName: status.engine_name || "Emulador nativo",
        romPath,
        processId,
      });
      markDriveRomDownloaded(game.id);
      toast({ title: "Abriendo emulador nativo", description: `${status.engine_name} iniciando con ${game.name}.` });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "No se pudo abrir en nativo",
        description: formatLauncherBridgeError(error, "Hubo un error descargando desde Drive o abriendo el emulador."),
        variant: "destructive",
      });
    } finally {
      setNativeBusyGameId(null);
    }
  };

  const handlePlayLibraryGameNative = async (game: any, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const bridge = getLauncherBridge();
    if (!bridge?.nativeEngineStatus || (((!bridge?.startRemoteRomDownloadForNative && !bridge?.downloadRemoteRomForNative) || !bridge?.openNativeEmulator) && !bridge?.openRemoteRomNative && (!bridge?.pickNativeRom || !bridge?.openNativeEmulator))) {
      toast({
        title: "Launcher desactualizado",
        description: "Actualiza FORBIDDENS Launcher para abrir juegos en emulador nativo.",
        variant: "destructive",
      });
      return;
    }
    if (nativeBusyGameId || launchingGameId) return;
    if (!user) {
      toast({ title: "Acceso denegado", description: "Debes iniciar sesion para emular tus juegos.", variant: "destructive" });
      return;
    }

    setNativeBusyGameId(game.id);
    try {
      let status = await bridge.nativeEngineStatus(game.console);
      if (!status.installed) {
        const wantsInstall = window.confirm(`Para jugar en nativo hay que instalar ${status.engine_name} en este PC. ¿Instalar ahora?`);
        if (!wantsInstall) return;
        if (!bridge.installNativeEngine) throw new Error("El launcher no tiene instalador nativo disponible.");
        toast({ title: "Instalando motor nativo", description: `Preparando ${status.engine_name} para ${game.console.toUpperCase()}.` });
        status = await bridge.installNativeEngine(game.console);
        if (game.console === selectedConsole) setSelectedNativeStatus(status);
      }

      let launchResult: any;
      let romPath: string | null = null;
      let restoredNativeSave = false;

      if (bridge.startRemoteRomDownloadForNative && bridge.openNativeEmulator && game.romUrl) {
        const romUrl = new URL(game.romUrl, window.location.origin).href;
        const fileName = decodeURIComponent(romUrl.split("/").pop() || `${game.id}.rom`);
        const job = await bridge.startRemoteRomDownloadForNative({
          consoleId: game.console,
          gameId: game.id,
          fileName,
          romUrl,
        });
        const uiJob: NativeDownloadUiJob = {
          jobId: job.job_id,
          gameId: game.id,
          gameName: game.name,
          consoleId: game.console,
          engineName: status.engine_name || "Emulador nativo",
          romPath: job.rom_path,
          source: "public",
          autoOpen: true,
          progress: job.cached ? 100 : 0,
          downloaded: 0,
          total: 0,
          status: job.cached ? "completed" : "downloading",
        };
        upsertNativeDownloadJob(uiJob);
        if (job.cached) {
          await openDownloadedNativeGame(uiJob);
        } else {
          toast({ title: "Descarga en segundo plano", description: `Puedes seguir usando el launcher mientras baja ${game.name}.` });
        }
        return;
      } else if (bridge.downloadRemoteRomForNative && bridge.openNativeEmulator && game.romUrl) {
        const romUrl = new URL(game.romUrl, window.location.origin).href;
        const fileName = decodeURIComponent(romUrl.split("/").pop() || `${game.id}.rom`);
        toast({
          title: "Preparando ROM nativa",
          description: "Descargando una copia local para abrirla mas rapido la proxima vez.",
        });
        romPath = await bridge.downloadRemoteRomForNative({
          consoleId: game.console,
          gameId: game.id,
          fileName,
          romUrl,
        });
        restoredNativeSave = await restoreNativeCloudSave({
          consoleId: game.console,
          gameName: game.name,
          romPath,
        }).catch((error) => {
          console.warn("Native cloud save restore skipped:", error);
          return false;
        });
        launchResult = await bridge.openNativeEmulator(game.console, romPath);
      } else if (bridge.openRemoteRomNative && game.romUrl) {
        const romUrl = new URL(game.romUrl, window.location.origin).href;
        const fileName = decodeURIComponent(romUrl.split("/").pop() || `${game.id}.rom`);
        toast({
          title: "Preparando ROM nativa",
          description: "Descargando una copia local para abrirla mas rapido la proxima vez.",
        });
        launchResult = await bridge.openRemoteRomNative({
          consoleId: game.console,
          gameId: game.id,
          fileName,
          romUrl,
        });
        romPath = typeof launchResult === "string" ? launchResult : (launchResult?.rom_path || null);
      } else {
        toast({
          title: "Selecciona tu ROM",
          description: `${status.engine_name} abrira el archivo local que elijas para ${game.console.toUpperCase()}.`,
        });
        const pickedRomPath = await bridge.pickNativeRom?.(game.console);
        if (!pickedRomPath) return;
        romPath = pickedRomPath;
        restoredNativeSave = await restoreNativeCloudSave({
          consoleId: game.console,
          gameName: game.name,
          romPath,
        }).catch((error) => {
          console.warn("Native cloud save restore skipped:", error);
          return false;
        });
        launchResult = await bridge.openNativeEmulator?.(game.console, pickedRomPath);
      }

      const processId = typeof launchResult === "object" ? Number(launchResult?.process_id || 0) || null : null;
      if (restoredNativeSave && getNativeCloudSaveKind(game.console) === "savestate" && processId) {
        window.setTimeout(() => {
          bridge.nativeEmulatorAction?.(processId, "load_state").catch(() => {});
        }, 1800);
      }
      launchNativeSession({
        consoleName: game.console,
        gameName: game.name,
        engineName: status.engine_name || "Emulador nativo",
        romPath,
        processId,
      });
      toast({ title: "Abriendo emulador nativo", description: `${status.engine_name} iniciando desde FORBIDDENS Launcher.` });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "No se pudo abrir en nativo",
        description: formatLauncherBridgeError(error, "Hubo un error abriendo el emulador nativo."),
        variant: "destructive",
      });
    } finally {
      setNativeBusyGameId(null);
    }
  };

  const getCoreForConsole = (consoleId: string) => {
    const cores: Record<string, string> = {
      nes: "fceumm", snes: "snes9x", gba: "mgba", n64: "mupen64plus_next", ps1: "pcsx_rearmed", psp: "ppsspp", arcade: "fbneo"
    };
    return cores[consoleId] || "fceumm";
  };

  const isLocked = (consoleId: string) => {
    const premiumConsoles = ["n64", "ps1", "psp", "arcade"];
    return premiumConsoles.includes(consoleId) && !canExtra;
  };

  const currentGames = useMemo(() => {
    const official = allGames.filter(g => g.console === selectedConsole && g.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const dedupedDriveGames = dedupeDriveRomCandidates(driveGames);

    const cloud = dedupedDriveGames.filter(g => {
      const mId = consoleTypeToId(g.console_type);
      const displayName = (g.custom_name || g.file_name.replace(/\.[^/.]+$/, "")).toLowerCase();
      return mId === selectedConsole && displayName.includes(searchQuery.toLowerCase());
    }).map(g => {
      const rawName = g.file_name.replace(/\.[^/.]+$/, "");
      return {
        id: g.drive_file_id,
        name: g.custom_name || rawName,
        originalName: g.file_name,
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

  const canUseWebCloudMode = selectedConsole !== "psp";
  const selectedConsoleHasNativeOption = ["psp", "ps2", "ps1", "ds", "nes", "snes", "gba", "gbc", "sega", "n64", "arcade"].includes(selectedConsole);
  const canOfferNativeMode = launcherDetected && launcherSupportsNative(selectedConsole);
  const forceNativeMode = canOfferNativeMode && !canUseWebCloudMode;
  const playCloudGamesNative = canOfferNativeMode && (forceNativeMode || preferNativeEmulator);
  const visibleDriveRoms = currentGames.filter((game: any) => game.isCloud);
  const canManageNativeDriveRoms = selectedConsoleHasNativeOption;
  const selectedDriveRoms = visibleDriveRoms.filter((game: any) => selectedDriveRomIds.has(game.id));
  const isBatchDownloadingDriveRoms = downloadingDriveRomIds.size > 0;

  const toggleDriveRomSelection = (fileId: string) => {
    setSelectedDriveRomIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const ensureDriveRomIsAccessible = async (game: any, accessToken: string) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(game.id)}?fields=id,name,trashed`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.ok) return;

    if (response.status === 404) {
      throw new Error(`Google Drive no encontro "${game.name}". Puede que la ROM pertenezca a otra cuenta, haya sido movida/eliminada, o la biblioteca este usando una sincronizacion vieja. Vuelve a sincronizar Drive y selecciona la ROM nuevamente.`);
    }

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("drive_access_token");
      localStorage.removeItem("drive_token_expiry");
      sessionStorage.removeItem("drive_access_token");
      sessionStorage.removeItem("drive_token_expiry");
      throw new Error("Google Drive rechazo el permiso para esta ROM. Autoriza Drive otra vez con la misma cuenta donde esta la carpeta RetroRoms.");
    }

    throw new Error(`Google Drive no pudo validar "${game.name}" (${response.status}).`);
  };

  const downloadSelectedDriveRomsForNative = async () => {
    const bridge = getLauncherBridge();
    if (!bridge?.startDriveRomDownloadForNative && !bridge?.downloadDriveRomForNative) {
      toast({
        title: "Launcher desactualizado",
        description: "Actualiza FORBIDDENS Launcher para descargar ROMs nativas en lote.",
        variant: "destructive",
      });
      return;
    }
    if (selectedDriveRoms.length === 0) {
      toast({ title: "Selecciona ROMs", description: "Marca una o mas ROMs de Drive para descargarlas." });
      return;
    }

    try {
      const accessToken = await requestGoogleTokenForDrive();
      let completed = 0;
      for (const game of selectedDriveRoms) {
        setDownloadingDriveRomIds(prev => new Set(prev).add(game.id));
        try {
          await ensureDriveRomIsAccessible(game, accessToken);
          if (bridge.startDriveRomDownloadForNative) {
            const job = await bridge.startDriveRomDownloadForNative({
              consoleId: game.console,
              fileId: game.id,
              fileName: game.fileName || game.originalName || game.name,
              accessToken,
            });
            const uiJob: NativeDownloadUiJob = {
              jobId: job.job_id,
              gameId: game.id,
              gameName: game.name,
              consoleId: game.console,
              engineName: selectedNativeStatus?.engine_name || "Emulador nativo",
              romPath: job.rom_path,
              source: "drive",
              autoOpen: false,
              progress: job.cached ? 100 : 0,
              downloaded: 0,
              total: 0,
              status: job.cached ? "completed" : "downloading",
            };
            upsertNativeDownloadJob(uiJob);
            if (job.cached) {
              markDriveRomDownloaded(game.id);
              setDownloadingDriveRomIds(prev => {
                const next = new Set(prev);
                next.delete(game.id);
                return next;
              });
              setSelectedDriveRomIds(prev => {
                const next = new Set(prev);
                next.delete(game.id);
                return next;
              });
            }
            completed += 1;
          } else {
            await bridge.downloadDriveRomForNative?.({
              consoleId: game.console,
              fileId: game.id,
              fileName: game.fileName || game.originalName || game.name,
              accessToken,
            });
            markDriveRomDownloaded(game.id);
            setSelectedDriveRomIds(prev => {
              const next = new Set(prev);
              next.delete(game.id);
              return next;
            });
            completed += 1;
          }
        } finally {
          if (!bridge.startDriveRomDownloadForNative) {
            setDownloadingDriveRomIds(prev => {
              const next = new Set(prev);
              next.delete(game.id);
              return next;
            });
          }
        }
      }

      toast({
        title: bridge.startDriveRomDownloadForNative ? "Descargas iniciadas" : "ROMs listas para nativo",
        description: bridge.startDriveRomDownloadForNative
          ? `${completed} descarga${completed === 1 ? "" : "s"} corriendo en segundo plano.`
          : `${completed} ROM${completed === 1 ? "" : "s"} guardada${completed === 1 ? "" : "s"} en el cache del launcher.`,
      });
      if (completed > 0 && !bridge.startDriveRomDownloadForNative) setNativeDownloadMode(false);
    } catch (error: any) {
      const message = formatLauncherBridgeError(error, "Hubo un error descargando las ROMs seleccionadas.");
      if (/sincronizacion vieja|no encontro|cuenta correcta|misma cuenta|permiso/i.test(message)) {
        setSelectedDriveRomIds(new Set());
        void fetchDriveGames(true);
      }
      toast({
        title: "No se pudieron descargar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDownloadingDriveRomIds(new Set());
    }
  };

  const leaderboardConsole = dropdownValue === "multi" ? "multiplayer" : dropdownValue === "bet" ? "bet" : selectedConsole;

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
        saveLocalCoverBackups(user.id, [{
          file_name: editingGame.fileName,
          custom_name: newName,
          custom_cover_url: newCover,
        }]);

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

  const allMultiplayerGames: MultiplayerLibraryGame[] = [
    { id: 'pong', label: 'Pong / Air Hockey', coverUrl: '/games/covers/pong-air-hockey.svg', maxPlayers: 2, playersLabel: '2P' },
    { id: 'agar-server', label: 'Agar.io Clon', coverUrl: '/games/covers/agar-io-clon.svg', maxPlayers: 10, playersLabel: '10P', externalUrl: import.meta.env.VITE_AGAR_SERVER_URL, rewardSlug: 'agar' },
    { id: 'voidstrike', label: 'Voidstrike', coverUrl: '/games/covers/voidstrike.svg', maxPlayers: 2, playersLabel: '2P', externalUrl: 'https://voidstrike-five.vercel.app' },
    { id: 'tosios', label: 'TOSIOS', coverUrl: '/games/covers/tosios.svg', maxPlayers: 16, playersLabel: 'MULTI', externalUrl: 'https://tosios.online' },
    { id: 'monopoly', label: 'Monopolio Arcade', coverUrl: '/games/covers/monopoly.svg', maxPlayers: 8, playersLabel: '2-8P' },
    { id: 'chess', label: 'Ajedrez Arcade', coverUrl: '/games/covers/chess.svg', maxPlayers: 10, playersLabel: '2P + 8 ESP' },
    { id: 'casino-roulette', label: 'Ruleta Retro', coverUrl: '/games/covers/casino-roulette.svg', maxPlayers: 10, playersLabel: 'BET', extraPoints: true, wagerGame: true },
    { id: 'casino-blackjack', label: 'Blackjack Drag', coverUrl: '/games/covers/casino-blackjack.svg', maxPlayers: 6, playersLabel: 'BET', extraPoints: true, wagerGame: true },
    { id: 'casino-chess', label: 'Ajedrez con Apuesta', coverUrl: '/games/covers/casino-chess.svg', maxPlayers: 2, playersLabel: 'BET', extraPoints: true, wagerGame: true },
    { id: 'casino-horses', label: 'Carrera de Caballos', coverUrl: '/games/covers/casino-horses.svg', maxPlayers: 10, playersLabel: 'BET', extraPoints: true, wagerGame: true },
    { id: 'casino-bingo', label: 'Bingo BET', coverUrl: '/games/covers/casino-bingo-modes.svg', maxPlayers: 20, playersLabel: 'BET', extraPoints: true, wagerGame: true },
    { id: 'massive-decks', label: 'Massive Decks', coverUrl: '/games/covers/massive-decks.svg', maxPlayers: 20, playersLabel: 'PARTY' },
    { id: 'watch-together', label: 'Watch Together', coverUrl: '/games/covers/watch-together.svg', maxPlayers: 20, playersLabel: 'WATCH' },
    { id: 'tic-tac-toe', label: 'Tic Tac Toe', coverUrl: '/games/covers/tic-tac-toe.svg', maxPlayers: 2, playersLabel: '2P' },
    { id: 'card-duel', label: 'Card Duel (Hearthstone lite)', coverUrl: '/games/covers/card-duel.svg', maxPlayers: 2, playersLabel: '2P' }
  ];
  const multiplayerGames = allMultiplayerGames.filter((game) => !game.wagerGame);
  const betGames = allMultiplayerGames.filter((game) => game.wagerGame);
  const visibleMultiplayerGames = multiplayerGames.filter((game) => game.label.toLowerCase().includes(searchQuery.toLowerCase()));
  const visibleBetGames = betGames.filter((game) => game.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const getConsoleShortLabel = (consoleId: string, label: string) => {
    const shortLabels: Record<string, string> = {
      nes: "NES",
      snes: "SNES",
      gba: "GBA",
      n64: "N64",
      gbc: "GBC",
      sega: "SEGA",
      ps1: "PS1",
      psp: "PSP",
      arcade: "ARC",
    };
    return shortLabels[consoleId] || label;
  };

  // Opciones para el dropdown unificado
  const dropdownOptions: Array<{ type: string; label: string; value?: string; color?: string }> = [
    ...activeConsoles.map(c => ({
      type: 'console',
      value: `console:${c.id}`,
      label: getConsoleShortLabel(c.id, c.label),
      color: c.color
    })),
    { type: 'section', label: '────────────' },
    { type: 'multiplayer', value: 'multi', label: 'MULTI', color: 'text-neon-magenta' },
    { type: 'bet', value: 'bet', label: 'BET', color: 'text-neon-yellow' }
  ];

  const consoleInfo = dropdownValue === 'multi'
    ? { id: 'multiplayer', label: 'Multijugador', color: 'text-neon-magenta' }
    : dropdownValue === 'bet'
      ? { id: 'bet', label: 'Juegos BET', color: 'text-neon-yellow' }
    : activeConsoles.find((c) => c.id === selectedConsole) || activeConsoles[0];

  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden px-3 pb-12 sm:px-4 lg:px-0 animate-fade-in max-w-7xl mx-auto">
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
              } else if (val === 'bet') {
                setSelectedConsole('multiplayer');
                setSelectedMultiGame(null);
              }
            }}
            className="library-console-select h-10 rounded-lg border border-border bg-card text-xs font-body px-3 text-foreground outline-none shadow-lg focus:border-neon-cyan/50 transition-colors min-w-[160px]"
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

      <div className="flex w-full min-w-0 items-center gap-1.5 overflow-hidden pb-1 lg:gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 lg:gap-2">
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
              } else if (val === 'bet') {
                setSelectedConsole('multiplayer');
                setSelectedMultiGame(null);
              }
            }}
            className="library-console-select h-9 w-20 shrink-0 rounded-lg border border-border bg-card px-2 font-body text-xs text-foreground shadow-lg outline-none transition-colors focus:border-neon-cyan/50 sm:w-28 lg:w-40"
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
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Buscar en ${consoleInfo?.label}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 border-border bg-card pl-9 font-body text-xs transition-colors focus:border-primary"
            />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
          className="group relative inline-flex h-8 shrink-0 items-center overflow-hidden rounded-lg border border-destructive/50 bg-gradient-to-br from-destructive/25 via-card to-destructive/10 px-2 transition-all hover:border-destructive hover:shadow-[0_0_18px_-8px_hsl(var(--destructive))]"
          title="Cómo sincronizar tus ROMs con Google Drive"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <span className="relative truncate font-pixel text-[8px] uppercase tracking-wider text-destructive">IMPORTANTE</span>
        </Link>
        </div>
      </div>

      {/* Mostrar juegos clásicos o multijugador según el dropdown */}
      {dropdownValue.startsWith('console:') ? (
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
            <>
              {selectedConsoleHasNativeOption && (
                <div className="mb-3 rounded-lg border border-neon-cyan/25 bg-black/35 px-3 py-2 shadow-[0_0_24px_rgba(34,211,238,0.06)] backdrop-blur-sm">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded border",
                        !launcherDetected
                          ? "border-destructive/45 bg-destructive/10 text-destructive"
                          : selectedNativeStatus?.installed
                            ? "border-neon-green/45 bg-neon-green/10 text-neon-green"
                            : "border-neon-cyan/45 bg-neon-cyan/10 text-neon-cyan"
                      )}>
                        {selectedNativeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-pixel text-[9px] uppercase tracking-widest text-neon-cyan">
                          {selectedNativeStatus?.engine_name || "Emulador nativo"}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {!launcherDetected
                            ? "Launcher no detectado"
                            : !canOfferNativeMode
                              ? "Puente nativo no disponible"
                              : selectedNativeStatus?.installed
                                ? "Instalado"
                                : "Pendiente de instalar"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                        <span className={cn("font-pixel text-[8px] uppercase tracking-widest", !playCloudGamesNative ? "text-neon-cyan" : "text-muted-foreground")}>
                          Web
                        </span>
                        <Switch
                          checked={playCloudGamesNative}
                          disabled={!canOfferNativeMode || forceNativeMode}
                          onCheckedChange={setNativeModePreference}
                          className="data-[state=checked]:bg-neon-green data-[state=unchecked]:bg-neon-cyan/45"
                          aria-label="Alternar entre emulador web y emulador nativo"
                        />
                        <span className={cn("font-pixel text-[8px] uppercase tracking-widest", playCloudGamesNative ? "text-neon-green" : "text-muted-foreground")}>
                          Nativo
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const bridge = getLauncherBridge();
                          if (!bridge) {
                            toast({
                              title: "Launcher no detectado",
                              description: "Recarga FORBIDDENS Launcher. Si estas en navegador normal, este boton solo prepara descargas dentro del launcher.",
                              variant: "destructive",
                            });
                            return;
                          }
                          if (!bridge.startDriveRomDownloadForNative && !bridge.downloadDriveRomForNative) {
                            toast({
                              title: "Launcher desactualizado",
                              description: "Actualiza FORBIDDENS Launcher para descargar ROMs nativas desde Biblioteca.",
                              variant: "destructive",
                            });
                            return;
                          }
                          if (!playCloudGamesNative) setNativeModePreference(true);
                          if (visibleDriveRoms.length === 0) {
                            toast({
                              title: "Sin ROMs de Drive",
                              description: `No hay ROMs de Drive visibles para ${consoleInfo?.label}. Sincroniza Drive o limpia la busqueda para seleccionarlas.`,
                            });
                            return;
                          }
                          setNativeDownloadMode(prev => !prev);
                          setSelectedDriveRomIds(new Set());
                        }}
                        className={cn(
                          "h-8 border-neon-green/35 bg-neon-green/10 font-pixel text-[8px] uppercase tracking-widest text-neon-green hover:bg-neon-green/20",
                          nativeDownloadMode && "border-neon-yellow/45 bg-neon-yellow/10 text-neon-yellow hover:bg-neon-yellow/20"
                        )}
                      >
                        <Download className="mr-2 h-3.5 w-3.5" />
                        {nativeDownloadMode ? "Cancelar" : "ROMs"}
                      </Button>
                      {playCloudGamesNative && selectedNativeStatus && !selectedNativeStatus.installed && (
                        <Button
                          size="sm"
                          onClick={installSelectedNativeEngine}
                          disabled={selectedNativeBusy}
                          className="h-8 shrink-0 border border-neon-cyan/40 bg-neon-cyan/15 font-pixel text-[8px] uppercase tracking-widest text-neon-cyan hover:bg-neon-cyan/25"
                        >
                          {selectedNativeBusy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Cpu className="mr-2 h-3.5 w-3.5" />}
                          Instalar
                        </Button>
                      )}
                      {playCloudGamesNative && selectedNativeStatus?.installed && (
                        <Button
                          size="sm"
                          onClick={reinstallSelectedNativeEngine}
                          disabled={selectedNativeBusy || !getLauncherBridge()?.reinstallNativeEngine}
                          className="h-8 shrink-0 border border-neon-yellow/40 bg-neon-yellow/10 font-pixel text-[8px] uppercase tracking-widest text-neon-yellow hover:bg-neon-yellow/20"
                        >
                          {selectedNativeBusy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                          Reinstalar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {nativeDownloadMode && canManageNativeDriveRoms && (
                <div className="mb-3 rounded-lg border border-neon-green/25 bg-neon-green/10 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-pixel text-[9px] uppercase tracking-widest text-neon-green">
                        Selecciona ROMs de Drive
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Marcadas: {selectedDriveRomIds.size}. Ya descargadas: {visibleDriveRoms.filter((game: any) => downloadedDriveRomIds.has(game.id)).length}.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDriveRomIds(new Set(visibleDriveRoms.map((game: any) => game.id)))}
                        disabled={isBatchDownloadingDriveRoms}
                        className="h-8 border-white/15 bg-white/5 font-pixel text-[8px] uppercase tracking-widest"
                      >
                        Seleccionar todo
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={downloadSelectedDriveRomsForNative}
                        disabled={isBatchDownloadingDriveRoms || selectedDriveRomIds.size === 0}
                        className="h-8 border border-neon-green/45 bg-neon-green/20 font-pixel text-[8px] uppercase tracking-widest text-neon-green hover:bg-neon-green/30"
                      >
                        {isBatchDownloadingDriveRoms ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
                        Descargar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {currentGames.map((game: any) => {
                const needsNativeInstall = Boolean(
                  playCloudGamesNative &&
                  selectedNativeStatus &&
                  !selectedNativeStatus.installed
                );
                const isDriveRomSelected = game.isCloud && selectedDriveRomIds.has(game.id);
                const isDriveRomDownloaded = game.isCloud && downloadedDriveRomIds.has(game.id);
                const isDriveRomDownloading = game.isCloud && downloadingDriveRomIds.has(game.id);
                return (
                <div
                  key={game.id}
                  onClick={(event) => {
                    if (nativeDownloadMode) {
                      if (game.isCloud) toggleDriveRomSelection(game.id);
                      return;
                    }
                    if (needsNativeInstall) {
                      void installSelectedNativeEngine(event);
                      return;
                    }
                    if (game.isCloud) {
                      if (playCloudGamesNative) {
                        void handlePlayCloudGameNative(game, event);
                      } else {
                        void handlePlayCloudGame(game);
                      }
                      return;
                    }
                    if (playCloudGamesNative) {
                      void handlePlayLibraryGameNative(game, event);
                      return;
                    }
                    launchGame({ romUrl: game.romUrl, consoleName: selectedConsole, gameName: game.name, consoleCore: getCoreForConsole(selectedConsole), score: 0, playTime: 0 });
                  }}
                  className={cn(
                    "group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer relative",
                    nativeDownloadMode && "hover:border-neon-green/50",
                    nativeDownloadMode && game.isCloud && "grayscale opacity-70",
                    nativeDownloadMode && !game.isCloud && "cursor-not-allowed opacity-35 grayscale",
                    isDriveRomSelected && "border-neon-green/70 opacity-100 grayscale-0 shadow-[0_0_20px_rgba(57,255,20,0.18)]",
                    isDriveRomDownloaded && nativeDownloadMode && "border-neon-cyan/50"
                  )}
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
                    <GameCover 
                      gameName={game.originalName || game.name} 
                      consoleId={game.console} 
                      isCloud={game.isCloud} 
                      defaultCover={game.coverUrl} 
                      customCover={game.customCover}
                    />
                    {launchingGameId === game.id && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/72 backdrop-blur-[2px]">
                        <Loader2 className="h-6 w-6 animate-spin text-neon-cyan drop-shadow-[0_0_10px_rgba(34,211,238,0.75)]" />
                        <span className="font-pixel text-[8px] uppercase tracking-wider text-neon-cyan">
                          {game.console === "psp" ? "Abriendo EmulatorJS" : "Cargando"}
                        </span>
                      </div>
                    )}
                    {nativeBusyGameId === game.id && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/72 backdrop-blur-[2px]">
                        <Loader2 className="h-6 w-6 animate-spin text-neon-green drop-shadow-[0_0_10px_rgba(57,255,20,0.75)]" />
                        <span className="font-pixel text-[8px] uppercase tracking-wider text-neon-green">
                          Preparando nativo
                        </span>
                      </div>
                    )}
                    {needsNativeInstall && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/62 px-3 text-center backdrop-blur-[2px]">
                        <Cpu className="h-6 w-6 text-neon-cyan drop-shadow-[0_0_10px_rgba(34,211,238,0.75)]" />
                        <span className="font-pixel text-[8px] uppercase tracking-widest text-neon-cyan">
                          Instala {selectedNativeStatus?.engine_name || "emulador"} arriba
                        </span>
                      </div>
                    )}
                    {nativeDownloadMode && game.isCloud && (
                      <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-black/52 px-3 text-center backdrop-blur-[1px]">
                        <span className={cn(
                          "grid h-8 w-8 place-items-center rounded-full border",
                          isDriveRomSelected
                            ? "border-neon-green/70 bg-neon-green/25 text-neon-green"
                            : isDriveRomDownloaded
                              ? "border-neon-cyan/60 bg-neon-cyan/20 text-neon-cyan"
                              : "border-white/35 bg-white/10 text-white/70"
                        )}>
                          {isDriveRomDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : isDriveRomSelected || isDriveRomDownloaded ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                        </span>
                        <span className={cn(
                          "font-pixel text-[8px] uppercase tracking-widest",
                          isDriveRomSelected ? "text-neon-green" : isDriveRomDownloaded ? "text-neon-cyan" : "text-white/75"
                        )}>
                          {isDriveRomDownloading ? "Descargando" : isDriveRomSelected ? "Seleccionada" : isDriveRomDownloaded ? "Lista" : "Marcar"}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-1.5 flex items-center gap-1">
                    {playCloudGamesNative ? (
                      <Cpu className="w-2.5 h-2.5 text-neon-green transition-colors shrink-0" />
                    ) : (
                      <Play className="w-2.5 h-2.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    )}
                    <p className="text-[10px] font-body text-foreground truncate">{game.name}</p>
                    {canOfferNativeMode && (
                      <span className={cn(
                        "ml-auto shrink-0 rounded border px-1 py-0.5 font-pixel text-[7px] uppercase tracking-wider",
                        playCloudGamesNative
                          ? "border-neon-green/35 bg-neon-green/10 text-neon-green"
                          : "border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan"
                      )}>
                        {playCloudGamesNative ? "NAT" : "WEB"}
                      </span>
                    )}
                  </div>
                </div>
                );
              })}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className={cn("font-pixel text-xs mb-2 flex items-center gap-1.5 mt-2", dropdownValue === "bet" ? "text-neon-yellow" : "text-neon-magenta")}>
            <h2 className="contents">
              <User className="w-3.5 h-3.5" /> {dropdownValue === "bet" ? "JUEGOS BET" : "MULTIJUGADOR"}
            </h2>
          </div>
          {dropdownValue === "bet" && (
            <div className="rounded-lg border border-neon-yellow/25 bg-neon-yellow/10 p-3 text-xs text-muted-foreground">
              Juegos con apuestas de F-coin separados del multijugador normal. El leaderboard de esta vista solo usa resultados BET.
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {(dropdownValue === "bet" ? visibleBetGames : visibleMultiplayerGames).map(g => (
              <div
                key={g.id}
                onClick={() => setSelectedMultiGame(g)}
                className={cn(
                  "group bg-card border border-border rounded-lg overflow-hidden transition-all duration-300 cursor-pointer relative",
                  dropdownValue === "bet"
                    ? "hover:border-neon-yellow/70 hover:shadow-[0_0_18px_-4px_rgba(250,204,21,0.65)]"
                    : "hover:border-neon-magenta/60 hover:shadow-[0_0_18px_-4px_hsl(var(--primary))]",
                )}
              >
                <div className="aspect-square bg-muted overflow-hidden relative">
                  <img src={g.coverUrl} alt={g.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute right-2 top-2 rounded border border-neon-cyan/40 bg-black/75 px-1.5 py-1 font-pixel text-[8px] text-neon-cyan shadow-lg">
                    {g.playersLabel}
                  </div>
                  {g.extraPoints && (
                    <div className="absolute left-2 top-2 rounded border border-neon-yellow/50 bg-black/80 px-1.5 py-1 font-pixel text-[7px] text-neon-yellow shadow-lg">
                      EXTRA PTS
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
                    <div className="text-[11px] font-bold text-white drop-shadow">{g.label}</div>
                  </div>
                </div>
                <div className="p-2 flex items-center gap-1">
                  <Play className={cn("w-3 h-3 shrink-0", dropdownValue === "bet" ? "text-neon-yellow" : "text-neon-magenta")} />
                  <p className="text-[10px] font-body text-foreground truncate">{g.label}</p>
                  <span className="ml-auto shrink-0 font-pixel text-[8px] text-neon-cyan">{g.playersLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 pt-4 xl:grid-cols-2">
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
        <select value={suggestConsole} onChange={(e) => setSuggestConsole(e.target.value)} className="library-console-select h-8 rounded-md border border-border bg-muted text-xs font-body px-2 text-foreground outline-none focus:border-neon-cyan/50 transition-colors">
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

      {nativeDownloadJobs.length > 0 && (
        <div className="fixed bottom-3 left-1/2 z-[260] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 space-y-2">
          {nativeDownloadJobs.map((job) => (
            <div key={job.jobId} className="rounded-lg border border-neon-cyan/30 bg-black/88 p-3 shadow-[0_12px_34px_rgba(0,0,0,0.55),0_0_24px_rgba(34,211,238,0.18)] backdrop-blur-xl">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded border border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan">
                  {job.status === "downloading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : job.status === "completed" ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-pixel text-[8px] uppercase tracking-widest text-neon-cyan">
                      {job.status === "downloading" ? "Descargando ROM nativa" : job.status === "completed" ? "ROM lista" : "Error de descarga"}
                    </p>
                    <span className="shrink-0 font-pixel text-[8px] text-white/65">{Math.round(job.progress || 0)}%</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-white/80">{job.gameName}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", job.status === "error" ? "bg-neon-red" : "bg-neon-cyan")}
                      style={{ width: `${Math.max(4, Math.min(100, job.progress || 0))}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-white/45">
                    <span>{job.total > 0 ? `${formatDownloadBytes(job.downloaded)} / ${formatDownloadBytes(job.total)}` : "Preparando descarga..."}</span>
                    <span className="truncate">{job.error || (job.status === "completed" ? "Abriendo emulador..." : "Puedes seguir usando el launcher")}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNativeDownloadJobs((prev) => {
                      const next = prev.filter((item) => item.jobId !== job.jobId);
                      nativeDownloadJobsRef.current = next;
                      return next;
                    });
                  }}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Ocultar descarga"
                  title="Ocultar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
