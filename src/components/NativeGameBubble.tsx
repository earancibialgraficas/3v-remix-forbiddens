import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CloudDownload, CloudUpload, Cpu, Download, ListFilter, Minus, Move, Pause, Play, RotateCcw, Settings, SkipBack, SkipForward, Trophy, Upload, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNativeSession } from "@/contexts/NativeSessionContext";
import { getLauncherBridge } from "@/lib/launcherBridge";
import { getNativeCloudSaveKind, isNativeCloudSaveSupported, restoreNativeCloudSave, syncNativeCloudSave } from "@/lib/nativeCloudSaves";

const POINTS_INTERVAL_MS = 10_000;
const POINTS_PER_INTERVAL = 10;
const DEFAULT_MUSIC_OPTIONS = [
  { id: "Todos", label: "Todos", category: "Todos" },
  { id: "Metal", label: "Metal", category: "Metal" },
  { id: "Rap", label: "Rap", category: "Rap" },
  { id: "Lofi Hip-Hop", label: "Lofi Hip-Hop", category: "Lofi Hip-Hop" },
];

const nativeButtonClass =
  "relative overflow-hidden rounded-md border text-[10px] font-semibold transition duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-px";
const nativeIconButtonClass =
  "relative overflow-hidden rounded-md border transition duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-px";
const nativePanelClass =
  "rounded border bg-black/35 shadow-[0_14px_34px_rgba(0,0,0,0.24)]";

type MusicOption = {
  id: string;
  label: string;
  category: string;
  playlistId?: string;
};

type SaveScoreResult =
  | { status: "none"; score: number; previousBest: number }
  | { status: "saved"; score: number; previousBest: number }
  | { status: "not_best"; score: number; previousBest: number }
  | { status: "error"; score: number; previousBest: number; message: string };

const initialPosition = () => {
  if (typeof window === "undefined") return { x: 20, y: 420 };
  return { x: 20, y: Math.max(16, window.innerHeight - 248) };
};

export default function NativeGameBubble() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { sessions, currentSessionIndex, minimized, updateNativeSession, closeNativeSession, minimizeNativeSession, maximizeNativeSession } = useNativeSession();
  const session = sessions[currentSessionIndex];
  const [paused, setPaused] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const [dragging, setDragging] = useState(false);
  const [emulatorPaused, setEmulatorPaused] = useState(false);
  const [musicTitle, setMusicTitle] = useState("FORBIDDENS Player");
  const [musicVolume, setMusicVolume] = useState(80);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicCategory, setMusicCategory] = useState("Todos");
  const [musicOptions, setMusicOptions] = useState<MusicOption[]>(DEFAULT_MUSIC_OPTIONS);
  const [nativeVolume, setNativeVolume] = useState(85);
  const launcherPanelMode = Boolean(getLauncherBridge());
  const latestSessionRef = useRef(session);
  const suppressNextExitProcessRef = useRef<number | null>(null);
  const nativeVolumeTimerRef = useRef<number | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  useEffect(() => {
    latestSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    setPaused(false);
    setEmulatorPaused(false);
  }, [session?.id]);

  useEffect(() => {
    const syncMusicState = () => {
      try {
        const sessionText = localStorage.getItem("forbiddens_music_session_v2");
        const session = sessionText ? JSON.parse(sessionText) : null;
        setMusicTitle(localStorage.getItem("forbiddens_music_current_title") || session?.title || "FORBIDDENS Player");
        setMusicVolume(Number(localStorage.getItem("forbiddens_music_volume") || session?.volume || 80));
        setMusicPlaying(localStorage.getItem("forbiddens_music_playing") === "true" || Boolean(session?.playing));
        setMusicCategory(session?.playlistName || session?.category || localStorage.getItem("forbiddens_music_category") || "Todos");
      } catch {}
    };
    const syncMusicEvent = (event: Event) => {
      const detail = (event as CustomEvent<any>).detail || {};
      if (typeof detail.title === "string") setMusicTitle(detail.title);
      if (typeof detail.volume === "number") setMusicVolume(detail.volume);
      if (typeof detail.playing === "boolean") setMusicPlaying(detail.playing);
      if (typeof detail.playlistName === "string" && detail.playlistName) setMusicCategory(detail.playlistName);
      else if (typeof detail.category === "string" && detail.category) setMusicCategory(detail.category);
    };
    syncMusicState();
    const timer = window.setInterval(syncMusicState, 700);
    window.addEventListener("storage", syncMusicState);
    window.addEventListener("forbiddens-music-state", syncMusicEvent);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", syncMusicState);
      window.removeEventListener("forbiddens-music-state", syncMusicEvent);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadMusicOptions = async () => {
      if (!user) {
        setMusicOptions(DEFAULT_MUSIC_OPTIONS);
        return;
      }
      try {
        const { data, error } = await (supabase as any)
          .from("user_music_playlists")
          .select("id,name,songs")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });
        if (error) throw error;
        const personal = (data || [])
          .filter((row: any) => row?.id && row?.name && Array.isArray(row?.songs) && row.songs.length > 0)
          .map((row: any) => ({
            id: `playlist:${row.id}`,
            label: String(row.name),
            category: String(row.name),
            playlistId: String(row.id),
          }));
        if (!cancelled) setMusicOptions([...DEFAULT_MUSIC_OPTIONS, ...personal]);
      } catch {
        if (!cancelled) setMusicOptions(DEFAULT_MUSIC_OPTIONS);
      }
    };
    void loadMusicOptions();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!session || paused) return;
    const timer = window.setInterval(() => {
      const current = latestSessionRef.current;
      if (!current) return;
      updateNativeSession(current.id, {
        score: current.score + POINTS_PER_INTERVAL,
        playTime: current.playTime + POINTS_INTERVAL_MS / 1000,
      });
    }, POINTS_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [session, paused, updateNativeSession]);

  const formattedTime = useMemo(() => {
    const total = Math.max(0, Number(session?.playTime || 0));
    const minutes = Math.floor(total / 60);
    const seconds = Math.floor(total % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [session?.playTime]);

  const supportsLocalSaveFiles = useMemo(() => {
    const consoleName = session?.consoleName?.toLowerCase();
    return Boolean(consoleName && (consoleName === "ps1" || consoleName === "psp" || consoleName === "ps2" || isNativeCloudSaveSupported(consoleName)));
  }, [session?.consoleName]);

  const supportsCloudSaveControls = useMemo(() => {
    const consoleName = session?.consoleName?.toLowerCase();
    return Boolean(consoleName && isNativeCloudSaveSupported(consoleName));
  }, [session?.consoleName]);

  const selectedMusicOptionId = useMemo(() => {
    return musicOptions.find((option) => option.category === musicCategory || option.label === musicCategory)?.id || DEFAULT_MUSIC_OPTIONS[0].id;
  }, [musicCategory, musicOptions]);

  const skinButtonStyle = useMemo<CSSProperties>(() => ({
    background: "var(--skin-gradient-button, linear-gradient(180deg, rgba(34,211,238,0.18), rgba(236,72,153,0.13)))",
    borderColor: "var(--skin-border, rgba(255,255,255,0.16))",
    borderRadius: "var(--skin-border-radius, 7px)",
    boxShadow: "var(--skin-shadow, 0 10px 24px rgba(0,0,0,0.28))",
    color: "var(--skin-text, #ffffff)",
  }), []);

  const skinSoftButtonStyle = useMemo<CSSProperties>(() => ({
    background: "linear-gradient(180deg, color-mix(in srgb, var(--skin-primary, #22d3ee) 24%, transparent), color-mix(in srgb, var(--skin-secondary, #ec4899) 16%, transparent))",
    borderColor: "color-mix(in srgb, var(--skin-border, rgba(255,255,255,0.18)) 72%, transparent)",
    borderRadius: "var(--skin-border-radius, 7px)",
    boxShadow: "0 10px 24px color-mix(in srgb, var(--skin-primary, #22d3ee) 18%, transparent)",
    color: "var(--skin-text, #ffffff)",
  }), []);

  const skinPanelStyle = useMemo<CSSProperties>(() => ({
    background: "var(--skin-pattern-panel, linear-gradient(135deg, rgba(8,10,16,0.92), rgba(16,8,18,0.88)))",
    borderColor: "color-mix(in srgb, var(--skin-border, rgba(255,255,255,0.16)) 78%, transparent)",
    borderRadius: "var(--skin-border-radius, 8px)",
    boxShadow: "var(--skin-shadow, 0 18px 36px rgba(0,0,0,0.28))",
  }), []);

  const clampPosition = useCallback((x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    const rect = bubbleRef.current?.getBoundingClientRect();
    const width = rect?.width || 330;
    const height = rect?.height || 205;
    return {
      x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - width - 8)),
      y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - height - 8)),
    };
  }, []);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (launcherPanelMode) return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-native-action]")) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (event: PointerEvent) => {
      const nextX = dragRef.current.startPosX + event.clientX - dragRef.current.startX;
      const nextY = dragRef.current.startPosY + event.clientY - dragRef.current.startY;
      setPosition(clampPosition(nextX, nextY));
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [clampPosition, dragging]);

  useEffect(() => {
    const onResize = () => setPosition((current) => clampPosition(current.x, current.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPosition]);

  const saveScore = useCallback(async (): Promise<SaveScoreResult> => {
    const current = latestSessionRef.current;
    if (!current) return { status: "none", score: 0, previousBest: 0 };
    if (!user || current.score <= 0) return { status: "none", score: current.score, previousBest: 0 };
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("leaderboard_scores")
        .select("id, score")
        .eq("user_id", user.id)
        .eq("game_name", current.gameName)
        .eq("console_type", current.consoleName)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const previousBest = Number((existing as any)?.score || 0);
      if (existing && Number((existing as any).score || 0) >= current.score) {
        return { status: "not_best", score: current.score, previousBest };
      }

      const payload = {
        score: current.score,
        play_time_seconds: current.playTime,
        display_name: profile?.display_name || "Anonimo",
      };

      if (existing) {
        await supabase.from("leaderboard_scores").update(payload as any).eq("id", (existing as any).id);
      } else {
        await supabase.from("leaderboard_scores").insert({
          user_id: user.id,
          game_name: current.gameName,
          console_type: current.consoleName,
          ...payload,
        } as any);
      }

      return { status: "saved", score: current.score, previousBest };
    } catch (error: any) {
      return { status: "error", score: current?.score || 0, previousBest: 0, message: error?.message || "No se pudo guardar." };
    }
  }, [profile?.display_name, user]);

  const toastSessionResult = useCallback((gameName: string, result: SaveScoreResult) => {
    if (result.status === "saved") {
      toast({
        title: "Sesion finalizada",
        description: result.previousBest > 0
          ? `Ganaste ${result.score} STATS en ${gameName}. Nuevo record superado.`
          : `Ganaste ${result.score} STATS en ${gameName}.`,
      });
      return;
    }

    if (result.status === "not_best") {
      toast({
        title: "Sesion finalizada",
        description: `Ganaste ${result.score} STATS en ${gameName}. Tu record sigue en ${result.previousBest}.`,
      });
      return;
    }

    if (result.status === "error") {
      toast({
        title: "Sesion finalizada",
        description: `Ganaste ${result.score} STATS, pero no se pudieron guardar: ${result.message}`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Sesion finalizada",
      description: result.score > 0
        ? `Ganaste ${result.score} STATS en ${gameName}.`
        : `No se generaron STATS en ${gameName}.`,
    });
  }, [toast]);

  const syncCurrentNativeSave = useCallback(async () => {
    const current = latestSessionRef.current;
    if (!current?.romPath) return false;
    return syncNativeCloudSave({
      consoleId: current.consoleName,
      gameName: current.gameName,
      romPath: current.romPath,
      processId: current.processId,
    }).catch((error) => {
      console.warn("Native cloud save sync skipped:", error);
      return false;
    });
  }, []);

  const saveNativeCloudNow = async () => {
    const current = latestSessionRef.current;
    if (!current) return;
    try {
      const synced = await syncCurrentNativeSave();
      toast({
        title: synced ? "Partida guardada" : "Sin save detectable",
        description: synced
          ? "Se sincronizo el save nativo con tu nube."
          : "Aun no se encontro un archivo de guardado para subir.",
        variant: synced ? undefined : "destructive",
      });
    } catch (error: any) {
      toast({
        title: "No se pudo guardar",
        description: error?.message || "El save nativo no se pudo sincronizar.",
        variant: "destructive",
      });
    }
  };

  const loadNativeCloudNow = async () => {
    const current = latestSessionRef.current;
    if (!current?.romPath) return;
    try {
      const restored = await restoreNativeCloudSave({
        consoleId: current.consoleName,
        gameName: current.gameName,
        romPath: current.romPath,
      });
      if (!restored) {
        toast({
          title: "No hay save en la nube",
          description: "Todavia no existe una partida nativa guardada para este juego.",
          variant: "destructive",
        });
        return;
      }
      if (getNativeCloudSaveKind(current.consoleName) === "savestate" && current.processId) {
        await getLauncherBridge()?.nativeEmulatorAction?.(current.processId, "load_state").catch(() => {});
        toast({ title: "Partida cargada", description: "Se cargo el savestate nativo desde la nube." });
        return;
      }
      toast({
        title: "Save preparado",
        description: "Reinicia el juego nativo para que el emulador lea el save restaurado.",
      });
    } catch (error: any) {
      toast({
        title: "No se pudo cargar",
        description: error?.message || "El save nativo no se pudo restaurar.",
        variant: "destructive",
      });
    }
  };

  const sendMusicPayload = (payload: Record<string, unknown>) => {
    try {
      const nextPayload = { type: "forbiddens-music-command", source: "native-panel", at: Date.now(), ...payload };
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("forbiddens_music_player");
        channel.postMessage(nextPayload);
        channel.close();
      }
      localStorage.setItem("forbiddens_music_command", JSON.stringify(nextPayload));
      window.dispatchEvent(new CustomEvent("forbiddens-music-command", { detail: nextPayload }));
      window.dispatchEvent(new StorageEvent("storage", { key: "forbiddens_music_command", newValue: JSON.stringify(nextPayload) }));
    } catch {}
  };

  const sendMusicCommand = (command: "prev" | "playPause" | "next" | "volumeUp" | "volumeDown" | "mute") => {
    sendMusicPayload({ command });
  };

  const changeMusicCategory = (optionId: string) => {
    const option = musicOptions.find((item) => item.id === optionId) || DEFAULT_MUSIC_OPTIONS[0];
    setMusicCategory(option.category);
    sendMusicPayload({
      command: "category",
      category: option.category,
      playlistId: option.playlistId || "",
    });
  };

  const changeNativeVolume = (value: number) => {
    const nextVolume = Math.max(0, Math.min(100, Math.round(value)));
    setNativeVolume(nextVolume);
    const current = latestSessionRef.current;
    if (!current?.processId) return;
    if (nativeVolumeTimerRef.current) window.clearTimeout(nativeVolumeTimerRef.current);
    nativeVolumeTimerRef.current = window.setTimeout(() => {
      const active = latestSessionRef.current;
      if (!active?.processId) return;
      getLauncherBridge()?.setNativeEmulatorVolume?.(active.processId, nextVolume).catch((error) => {
        console.warn("No se pudo ajustar volumen nativo", error);
      });
    }, 140);
  };

  const toggleEmulatorPause = async () => {
    const current = latestSessionRef.current;
    if (!current?.processId) return;
    const bridge = getLauncherBridge();
    try {
      await bridge?.nativeEmulatorAction?.(current.processId, "pause_toggle");
      setEmulatorPaused((value) => !value);
      maximizeNativeSession();
    } catch (error: any) {
      toast({
        title: "No se pudo pausar",
        description: error?.message || "No se pudo enviar la pausa al emulador.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const listen = (window as any).__TAURI__?.event?.listen;
    if (typeof listen !== "function") return;

    let unlisten: (() => void) | null = null;
    listen("forbiddens-native-emulator-exit", async (event: any) => {
      const current = latestSessionRef.current;
      const payload = event?.payload || {};
      if (!current) return;
      const payloadProcessId = payload.process_id ? Number(payload.process_id) : null;
      if (payloadProcessId && suppressNextExitProcessRef.current === payloadProcessId) {
        suppressNextExitProcessRef.current = null;
        return;
      }
      const sameProcess = payloadProcessId && current.processId && payloadProcessId === Number(current.processId);
      const sameRom = payload.rom_path && current.romPath && String(payload.rom_path) === String(current.romPath);
      const sameConsole = payload.console_id && String(payload.console_id).toLowerCase() === current.consoleName.toLowerCase();
      if (!sameProcess && !sameRom && !sameConsole) return;

      await syncCurrentNativeSave();
      const result = await saveScore();
      closeNativeSession(current.id);
      toastSessionResult(current.gameName, result);
    })
      .then((cleanup: () => void) => {
        unlisten = cleanup;
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, [closeNativeSession, saveScore, syncCurrentNativeSave, toastSessionResult]);

  useEffect(() => {
    const listen = (window as any).__TAURI__?.event?.listen;
    if (typeof listen !== "function") return;

    let unlisten: (() => void) | null = null;
    listen("forbiddens-native-emulator-window-state", (event: any) => {
      const current = latestSessionRef.current;
      const payload = event?.payload || {};
      if (!current?.processId || Number(payload.process_id) !== Number(current.processId)) return;

      if (payload.state === "minimized") {
        minimizeNativeSession();
        return;
      }

      if (payload.state === "restored") {
        maximizeNativeSession();
      }
    })
      .then((cleanup: () => void) => {
        unlisten = cleanup;
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, [maximizeNativeSession, minimizeNativeSession]);

  useEffect(() => {
    const listen = (window as any).__TAURI__?.event?.listen;
    if (typeof listen !== "function") return;

    let unlisten: (() => void) | null = null;
    listen("forbiddens-launcher-window-state", async (event: any) => {
      const current = latestSessionRef.current;
      const payload = event?.payload || {};
      if (!current?.processId) return;

      if (payload.state === "minimized") {
        minimizeNativeSession();
        return;
      }

      if (payload.state === "restored") {
        maximizeNativeSession();
      }
    })
      .then((cleanup: () => void) => {
        unlisten = cleanup;
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, [maximizeNativeSession, minimizeNativeSession]);

  const finishSession = async () => {
    const current = latestSessionRef.current;
    if (!current) return;
    await syncCurrentNativeSave();
    const result = await saveScore();
    if (current.processId) {
      await getLauncherBridge()?.closeNativeEmulator?.(current.processId).catch(() => {});
    }
    closeNativeSession(current.id);
    toastSessionResult(current.gameName, result);
  };

  const minimizeSession = async () => {
    const current = latestSessionRef.current;
    const bridge = getLauncherBridge();
    if (current?.processId) {
      await bridge?.setNativeEmulatorState?.(current.processId, "minimize").catch(() => {});
    }
    minimizeNativeSession();
    await bridge?.launcherWindowAction?.("minimize").catch(() => {});
  };

  const restoreSession = async (index?: number) => {
    const current = latestSessionRef.current;
    const bridge = getLauncherBridge();
    if (current?.processId) {
      await bridge?.setNativeEmulatorState?.(current.processId, "restore").catch(() => {});
    }
    await bridge?.launcherWindowAction?.("restore").catch(() => {});
    maximizeNativeSession(index);
  };

  const openEmulatorSettings = async () => {
    const current = latestSessionRef.current;
    if (!current?.processId) return;
    const bridge = getLauncherBridge();
    try {
      if (bridge?.nativeEmulatorAction) {
        await bridge.nativeEmulatorAction(current.processId, "menu");
      } else {
        await bridge?.setNativeEmulatorState?.(current.processId, "restore");
        toast({
          title: "Actualiza el launcher",
          description: "Esta version puede enfocar el emulador, pero el boton de configuracion necesita el launcher nuevo.",
        });
      }
      maximizeNativeSession();
    } catch (error: any) {
      toast({
        title: "No se pudo abrir configuracion",
        description: error?.message || "Vuelve a enfocar el emulador e intenta otra vez.",
        variant: "destructive",
      });
    }
  };

  const restartNativeConsole = async (options?: { silent?: boolean; skipClose?: boolean }) => {
    const current = latestSessionRef.current;
    if (!current?.romPath) {
      if (!options?.silent) {
        toast({
          title: "No se pudo reiniciar",
          description: "No se encontro la ruta de la ROM para reabrir el emulador.",
          variant: "destructive",
        });
      }
      return false;
    }
    const bridge = getLauncherBridge();
    if (!bridge?.openNativeEmulator) {
      if (!options?.silent) {
        toast({
          title: "Actualiza el launcher",
          description: "Reiniciar la consola necesita el launcher nuevo.",
          variant: "destructive",
        });
      }
      return false;
    }
    try {
      if (current.processId && !options?.skipClose) {
        suppressNextExitProcessRef.current = Number(current.processId);
        await bridge.closeNativeEmulator?.(current.processId).catch(() => {});
        await new Promise((resolve) => window.setTimeout(resolve, 400));
      }
      const result = await bridge.openNativeEmulator(current.consoleName, current.romPath);
      const processId = result && typeof result === "object" && "process_id" in result
        ? Number((result as any).process_id) || null
        : null;
      const romPath = result && typeof result === "object" && "rom_path" in result
        ? String((result as any).rom_path || current.romPath)
        : current.romPath;
      updateNativeSession(current.id, { processId, romPath });
      maximizeNativeSession();
      if (!options?.silent) {
        toast({
          title: "Consola reiniciada",
          description: "El emulador nativo se volvio a abrir con el juego actual.",
        });
      }
      return true;
    } catch (error: any) {
      if (!options?.silent) {
        toast({
          title: "No se pudo reiniciar",
          description: error?.message || "No se pudo volver a abrir el emulador nativo.",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const exportLocalSave = async () => {
    const current = latestSessionRef.current;
    if (!current) return;
    const bridge = getLauncherBridge();
    if (!bridge?.exportNativeLocalSave) {
      toast({
        title: "Actualiza el launcher",
        description: "La exportacion de saves locales necesita el launcher nuevo.",
        variant: "destructive",
      });
      return;
    }
    try {
      const consoleName = current.consoleName.toLowerCase();
      if (current.processId && isNativeCloudSaveSupported(consoleName)) {
        await bridge.nativeEmulatorAction?.(current.processId, "save_state").catch(() => {});
        await new Promise((resolve) => window.setTimeout(resolve, 900));
      }
      const exportedPath = await bridge.exportNativeLocalSave({
        consoleId: current.consoleName,
        gameName: current.gameName,
        romPath: current.romPath || null,
      });
      if (!exportedPath) return;
      toast({
        title: "Save exportado",
        description: consoleName === "psp"
          ? "Se guardo un ZIP con tus saves de PPSSPP."
          : consoleName === "ps2"
            ? "Se guardo la memory card de PCSX2."
            : consoleName === "ps1"
              ? "Se guardo la memory card de DuckStation."
              : "Se guardo el savestate local del juego.",
      });
    } catch (error: any) {
      toast({
        title: "No se pudo exportar",
        description: error?.message || "Aun no hay save local para esta consola.",
        variant: "destructive",
      });
    }
  };

  const importLocalSave = async () => {
    const current = latestSessionRef.current;
    if (!current) return;
    const bridge = getLauncherBridge();
    if (!bridge?.importNativeLocalSave) {
      toast({
        title: "Actualiza el launcher",
        description: "La carga de saves locales necesita el launcher nuevo.",
        variant: "destructive",
      });
      return;
    }
    try {
      const consoleName = current.consoleName.toLowerCase();
      const needsRestartAfterImport = ["ps1", "psp", "ps2"].includes(consoleName);
      if (needsRestartAfterImport && current.processId) {
        suppressNextExitProcessRef.current = Number(current.processId);
        await bridge.closeNativeEmulator?.(current.processId).catch(() => {});
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
      const importedPath = await bridge.importNativeLocalSave({
        consoleId: current.consoleName,
        romPath: current.romPath || null,
      });
      if (!importedPath) {
        if (needsRestartAfterImport) await restartNativeConsole({ silent: true, skipClose: true });
        return;
      }
      if (current.processId && !["ps1", "psp", "ps2"].includes(consoleName) && isNativeCloudSaveSupported(consoleName)) {
        await bridge.nativeEmulatorAction?.(current.processId, "load_state").catch(() => {});
      } else if (needsRestartAfterImport) {
        await restartNativeConsole({ silent: true, skipClose: true });
      }
      toast({
        title: "Save cargado",
        description: consoleName === "ps1" || consoleName === "psp" || consoleName === "ps2"
          ? "Se cargo el save local y se reinicio la consola para que el emulador lo lea."
          : "Se cargo el savestate local en el emulador.",
      });
    } catch (error: any) {
      toast({
        title: "No se pudo cargar",
        description: error?.message || "El archivo seleccionado no se pudo aplicar.",
        variant: "destructive",
      });
    }
  };

  if (!session) return null;

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => restoreSession()}
        className="fixed z-[80] flex max-w-[240px] items-center gap-2 border px-3 py-2 text-left backdrop-blur-xl transition hover:brightness-110"
        style={{ ...skinButtonStyle, left: position.x, top: position.y }}
      >
        <Cpu className="h-4 w-4 shrink-0 text-neon-cyan" />
        <span className="min-w-0">
          <span className="block truncate font-pixel text-[8px] uppercase text-neon-cyan">Sesion nativa</span>
          <span className="block truncate text-[10px] text-white/70">{session.gameName}</span>
        </span>
      </button>
    );
  }

  return (
    <div
      ref={bubbleRef}
      className={cn(
        launcherPanelMode
          ? "fixed bottom-2 left-2 right-2 top-2 z-[80] flex flex-col overflow-hidden rounded-lg border border-neon-cyan/30 bg-[#080a10]/92 shadow-[0_0_40px_rgba(34,211,238,0.22)] backdrop-blur-xl"
          : "fixed z-[80] w-[min(94vw,330px)] overflow-hidden rounded-lg border border-neon-cyan/30 bg-[#080a10]/92 shadow-[0_0_40px_rgba(34,211,238,0.22)] backdrop-blur-xl",
        dragging && "select-none",
      )}
      style={launcherPanelMode ? undefined : { left: position.x, top: position.y }}
    >
      <div
        className={cn("flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-2.5 py-1.5", !launcherPanelMode && "cursor-move")}
        onPointerDown={startDrag}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded border text-neon-cyan" style={skinSoftButtonStyle}>
            <Cpu className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-pixel text-[8px] uppercase tracking-widest text-neon-cyan">{session.engineName}</p>
            <p className="truncate text-[10px] text-white/65">{session.consoleName.toUpperCase()} nativo</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!launcherPanelMode && <Move className="h-3.5 w-3.5 text-white/35" />}
          <Button data-native-action size="icon" variant="ghost" className={cn(nativeIconButtonClass, "h-6 w-6")} style={skinSoftButtonStyle} onClick={minimizeSession} aria-label="Minimizar sesion">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button data-native-action size="icon" variant="ghost" className={cn(nativeIconButtonClass, "h-6 w-6 text-destructive hover:text-destructive")} style={skinSoftButtonStyle} onClick={finishSession} aria-label="Cerrar sesion">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className={cn("p-2.5", launcherPanelMode && "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto")}>
        <div className={cn(nativePanelClass, "p-2.5")} style={skinPanelStyle}>
          <p className="truncate text-xs font-semibold text-white">{session.gameName}</p>
          <p className="mt-1 truncate text-[10px] text-white/45">{session.romPath || "ROM local"}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded border px-2.5 py-1.5" style={skinSoftButtonStyle}>
              <p className="font-pixel text-[8px] uppercase text-neon-green">STATS</p>
              <p className="mt-1 flex items-center gap-1 text-base font-bold text-neon-green">
                <Trophy className="h-3.5 w-3.5" />
                {session.score}
              </p>
            </div>
            <div className="rounded border px-2.5 py-1.5" style={skinSoftButtonStyle}>
              <p className="font-pixel text-[8px] uppercase text-neon-cyan">Tiempo</p>
              <p className="mt-1 text-base font-bold text-neon-cyan">{formattedTime}</p>
            </div>
          </div>
        </div>

        <div className={cn(nativePanelClass, "p-2")} style={skinPanelStyle}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-pixel text-[8px] uppercase text-neon-magenta">Mini reproductor</p>
            <span className="flex items-center gap-1 text-[9px] text-neon-cyan">
              {musicVolume <= 0 ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              {musicVolume}%
            </span>
          </div>
          <div className="mt-1 rounded border px-2 py-1.5" style={skinSoftButtonStyle}>
            <p className="truncate font-pixel text-[8px] uppercase text-neon-magenta/80">{musicCategory || "Todos"}</p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-white">{musicTitle}</p>
          </div>
          <label className="mt-2 flex h-9 items-center gap-2 rounded border px-2" style={skinSoftButtonStyle}>
            <ListFilter className="h-3.5 w-3.5 shrink-0 text-neon-magenta" />
            <select
              data-native-action
              value={selectedMusicOptionId}
              onChange={(event) => changeMusicCategory(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[10px] text-white outline-none"
              aria-label="Lista de reproduccion"
            >
              {musicOptions.map((option) => (
                <option key={option.id} value={option.id} className="bg-[#160817] text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" onClick={() => sendMusicCommand("prev")} className={cn(nativeButtonClass, "h-9")} style={skinButtonStyle} title="Anterior" aria-label="Anterior">
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => sendMusicCommand("playPause")} className={cn(nativeButtonClass, "h-9")} style={skinButtonStyle} title={musicPlaying ? "Pausar musica" : "Reproducir musica"} aria-label={musicPlaying ? "Pausar musica" : "Reproducir musica"}>
              {musicPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => sendMusicCommand("next")} className={cn(nativeButtonClass, "h-9")} style={skinButtonStyle} title="Siguiente" aria-label="Siguiente">
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" onClick={() => sendMusicCommand("volumeDown")} className={cn(nativeButtonClass, "h-8 text-[12px]")} style={skinSoftButtonStyle} title="Bajar volumen" aria-label="Bajar volumen">-</Button>
            <Button size="sm" variant="outline" onClick={() => sendMusicCommand("mute")} className={cn(nativeButtonClass, "h-8")} style={skinSoftButtonStyle} title="Mutear volumen" aria-label="Mutear volumen">
              {musicVolume <= 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => sendMusicCommand("volumeUp")} className={cn(nativeButtonClass, "h-8 text-[12px]")} style={skinSoftButtonStyle} title="Subir volumen" aria-label="Subir volumen">+</Button>
          </div>
        </div>

        <div className={cn(nativePanelClass, "p-2")} style={skinPanelStyle}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-pixel text-[8px] uppercase text-neon-cyan">Volumen emulador</p>
            <span className="text-[10px] font-semibold text-white/75">{nativeVolume}%</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <VolumeX className="h-3.5 w-3.5 shrink-0 text-neon-cyan/70" />
            <input
              data-native-action
              type="range"
              min={0}
              max={100}
              step={1}
              value={nativeVolume}
              onChange={(event) => changeNativeVolume(Number(event.target.value))}
              className="h-2 min-w-0 flex-1 accent-cyan-300"
              aria-label="Volumen del emulador nativo"
            />
            <Volume2 className="h-3.5 w-3.5 shrink-0 text-neon-cyan/70" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={toggleEmulatorPause}
            className={cn(nativeButtonClass, "h-9", emulatorPaused && "text-neon-yellow")}
            style={skinButtonStyle}
          >
            {emulatorPaused ? <Play className="mr-2 h-3.5 w-3.5" /> : <Pause className="mr-2 h-3.5 w-3.5" />}
            {emulatorPaused ? "Play" : "Pausa"}
          </Button>
          <Button size="sm" variant="outline" onClick={openEmulatorSettings} className={cn(nativeButtonClass, "h-9")} style={skinButtonStyle}>
            <Settings className="mr-2 h-3.5 w-3.5" />
            Config
          </Button>
          <Button size="sm" variant="outline" onClick={() => restartNativeConsole()} className={cn(nativeButtonClass, "h-9")} style={skinButtonStyle}>
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        {supportsCloudSaveControls && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={saveNativeCloudNow}
              className={cn(nativeButtonClass, "h-9 text-neon-green")}
              style={skinButtonStyle}
            >
              <CloudUpload className="mr-2 h-3.5 w-3.5" />
              Guardar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={loadNativeCloudNow}
              className={cn(nativeButtonClass, "h-9 text-neon-cyan")}
              style={skinButtonStyle}
            >
              <CloudDownload className="mr-2 h-3.5 w-3.5" />
              Cargar
            </Button>
          </div>
        )}

        {supportsLocalSaveFiles && (
          <>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={exportLocalSave}
                className={cn(nativeButtonClass, "h-8")}
                style={skinSoftButtonStyle}
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Guardar local
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={importLocalSave}
                className={cn(nativeButtonClass, "h-8")}
                style={skinSoftButtonStyle}
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                Cargar local
              </Button>
            </div>
            <p className="mt-1.5 text-center text-[9px] leading-snug text-white/42">
              Si cargas un save con el juego abierto, reinicia el emulador para que el archivo se lea correctamente.
            </p>
          </>
        )}
        <p className="mt-1.5 text-center text-[9px] text-white/40">El emulador corre nativo; esta ventana registra la sesion.</p>
      </div>
    </div>
  );
}
