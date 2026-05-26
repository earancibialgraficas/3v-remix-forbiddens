import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Cpu, Minus, Move, Pause, Play, Square, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNativeSession } from "@/contexts/NativeSessionContext";
import { getLauncherBridge } from "@/lib/launcherBridge";

const POINTS_INTERVAL_MS = 10_000;
const POINTS_PER_INTERVAL = 10;

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
  const latestSessionRef = useRef(session);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  useEffect(() => {
    latestSessionRef.current = session;
  }, [session]);

  useEffect(() => {
    setPaused(false);
  }, [session?.id]);

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

  useEffect(() => {
    const listen = (window as any).__TAURI__?.event?.listen;
    if (typeof listen !== "function") return;

    let unlisten: (() => void) | null = null;
    listen("forbiddens-native-emulator-exit", async (event: any) => {
      const current = latestSessionRef.current;
      const payload = event?.payload || {};
      if (!current) return;
      const sameProcess = payload.process_id && current.processId && Number(payload.process_id) === Number(current.processId);
      const sameRom = payload.rom_path && current.romPath && String(payload.rom_path) === String(current.romPath);
      const sameConsole = payload.console_id && String(payload.console_id).toLowerCase() === current.consoleName.toLowerCase();
      if (!sameProcess && !sameRom && !sameConsole) return;

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
  }, [closeNativeSession, saveScore, toastSessionResult]);

  const finishSession = async () => {
    const current = latestSessionRef.current;
    if (!current) return;
    const result = await saveScore();
    if (current.processId) {
      await getLauncherBridge()?.closeNativeEmulator?.(current.processId).catch(() => {});
    }
    closeNativeSession(current.id);
    toastSessionResult(current.gameName, result);
  };

  const minimizeSession = async () => {
    const current = latestSessionRef.current;
    if (current?.processId) {
      await getLauncherBridge()?.setNativeEmulatorState?.(current.processId, "minimize").catch(() => {});
    }
    minimizeNativeSession();
  };

  const restoreSession = async (index?: number) => {
    const current = latestSessionRef.current;
    if (current?.processId) {
      await getLauncherBridge()?.setNativeEmulatorState?.(current.processId, "restore").catch(() => {});
    }
    maximizeNativeSession(index);
  };

  if (!session) return null;

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => restoreSession()}
        className="fixed z-[80] flex max-w-[240px] items-center gap-2 rounded-full border border-neon-cyan/40 bg-black/85 px-3 py-2 text-left shadow-[0_0_28px_rgba(34,211,238,0.28)] backdrop-blur-xl"
        style={{ left: position.x, top: position.y }}
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
        "fixed z-[80] w-[min(94vw,330px)] overflow-hidden rounded-lg border border-neon-cyan/30 bg-[#080a10]/92 shadow-[0_0_40px_rgba(34,211,238,0.22)] backdrop-blur-xl",
        dragging && "select-none",
      )}
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="flex cursor-move items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-2.5 py-1.5"
        onPointerDown={startDrag}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded border border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan">
            <Cpu className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-pixel text-[8px] uppercase tracking-widest text-neon-cyan">{session.engineName}</p>
            <p className="truncate text-[10px] text-white/65">{session.consoleName.toUpperCase()} nativo</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Move className="h-3.5 w-3.5 text-white/35" />
          <Button data-native-action size="icon" variant="ghost" className="h-6 w-6" onClick={minimizeSession} aria-label="Minimizar sesion">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button data-native-action size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:text-destructive" onClick={finishSession} aria-label="Cerrar sesion">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-2.5">
        <div className="rounded border border-white/10 bg-black/45 p-2.5">
          <p className="truncate text-xs font-semibold text-white">{session.gameName}</p>
          <p className="mt-1 truncate text-[10px] text-white/45">{session.romPath || "ROM local"}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded border border-neon-green/20 bg-neon-green/10 px-2.5 py-1.5">
              <p className="font-pixel text-[8px] uppercase text-neon-green">STATS</p>
              <p className="mt-1 flex items-center gap-1 text-base font-bold text-neon-green">
                <Trophy className="h-3.5 w-3.5" />
                {session.score}
              </p>
            </div>
            <div className="rounded border border-neon-cyan/20 bg-neon-cyan/10 px-2.5 py-1.5">
              <p className="font-pixel text-[8px] uppercase text-neon-cyan">Tiempo</p>
              <p className="mt-1 text-base font-bold text-neon-cyan">{formattedTime}</p>
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPaused((value) => !value)}
            className={cn("h-8 flex-1 border-white/10 bg-white/5 text-[10px]", paused && "border-neon-yellow/40 text-neon-yellow")}
          >
            {paused ? <Play className="mr-2 h-3.5 w-3.5" /> : <Pause className="mr-2 h-3.5 w-3.5" />}
            {paused ? "Reanudar STATS" : "Pausar STATS"}
          </Button>
          <Button size="sm" onClick={finishSession} className="h-8 flex-1 bg-neon-cyan/20 text-[10px] text-neon-cyan hover:bg-neon-cyan/30">
            <Square className="mr-2 h-3.5 w-3.5" />
            Guardar y cerrar
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[9px] text-white/40">El emulador corre nativo; esta ventana registra la sesion.</p>
      </div>
    </div>
  );
}
