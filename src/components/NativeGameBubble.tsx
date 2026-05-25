import { useEffect, useMemo, useRef, useState } from "react";
import { Cpu, Minus, Pause, Play, Square, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useNativeSession } from "@/contexts/NativeSessionContext";

const POINTS_INTERVAL_MS = 10_000;
const POINTS_PER_INTERVAL = 10;

export default function NativeGameBubble() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { sessions, currentSessionIndex, minimized, updateNativeSession, closeNativeSession, minimizeNativeSession, maximizeNativeSession } = useNativeSession();
  const session = sessions[currentSessionIndex];
  const [paused, setPaused] = useState(false);
  const latestSessionRef = useRef(session);

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

  const saveScore = async (silent = false) => {
    const current = latestSessionRef.current;
    if (!user || !current || current.score <= 0) return;
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

      if (existing && Number((existing as any).score || 0) >= current.score) {
        if (!silent) {
          toast({
            title: "Puntaje no superado",
            description: `Tu récord actual es ${(existing as any).score}.`,
          });
        }
        return;
      }

      const payload = {
        score: current.score,
        play_time_seconds: current.playTime,
        display_name: profile?.display_name || "Anónimo",
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

      if (!silent) toast({ title: "STATS guardados", description: `${current.score} puntos en ${current.gameName}` });
    } catch (error: any) {
      if (!silent) toast({ title: "Error al guardar STATS", description: error?.message || "No se pudo guardar.", variant: "destructive" });
    }
  };

  const finishSession = async () => {
    const current = latestSessionRef.current;
    if (!current) return;
    await saveScore(false);
    closeNativeSession(current.id);
  };

  if (!session) return null;

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => maximizeNativeSession()}
        className="fixed bottom-5 left-5 z-[80] flex max-w-[260px] items-center gap-2 rounded-full border border-neon-cyan/40 bg-black/85 px-4 py-3 text-left shadow-[0_0_28px_rgba(34,211,238,0.28)] backdrop-blur-xl"
      >
        <Cpu className="h-4 w-4 shrink-0 text-neon-cyan" />
        <span className="min-w-0">
          <span className="block truncate font-pixel text-[9px] uppercase text-neon-cyan">Sesión nativa</span>
          <span className="block truncate text-[11px] text-white/70">{session.gameName}</span>
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 left-5 z-[80] w-[min(94vw,380px)] overflow-hidden rounded-lg border border-neon-cyan/30 bg-[#080a10]/92 shadow-[0_0_40px_rgba(34,211,238,0.22)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded border border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan">
            <Cpu className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-pixel text-[9px] uppercase tracking-widest text-neon-cyan">{session.engineName}</p>
            <p className="truncate text-[11px] text-white/65">{session.consoleName.toUpperCase()} nativo</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={minimizeNativeSession} aria-label="Minimizar sesión">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={finishSession} aria-label="Cerrar sesión">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="p-3">
        <div className="rounded border border-white/10 bg-black/45 p-3">
          <p className="truncate text-sm font-semibold text-white">{session.gameName}</p>
          <p className="mt-1 truncate text-[10px] text-white/45">{session.romPath || "ROM local"}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded border border-neon-green/20 bg-neon-green/10 px-3 py-2">
              <p className="font-pixel text-[8px] uppercase text-neon-green">STATS</p>
              <p className="mt-1 flex items-center gap-1 text-lg font-bold text-neon-green">
                <Trophy className="h-4 w-4" />
                {session.score}
              </p>
            </div>
            <div className="rounded border border-neon-cyan/20 bg-neon-cyan/10 px-3 py-2">
              <p className="font-pixel text-[8px] uppercase text-neon-cyan">Tiempo</p>
              <p className="mt-1 text-lg font-bold text-neon-cyan">{formattedTime}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPaused((value) => !value)}
            className={cn("h-9 flex-1 border-white/10 bg-white/5 text-xs", paused && "border-neon-yellow/40 text-neon-yellow")}
          >
            {paused ? <Play className="mr-2 h-3.5 w-3.5" /> : <Pause className="mr-2 h-3.5 w-3.5" />}
            {paused ? "Reanudar STATS" : "Pausar STATS"}
          </Button>
          <Button size="sm" onClick={finishSession} className="h-9 flex-1 bg-neon-cyan/20 text-neon-cyan hover:bg-neon-cyan/30">
            <Square className="mr-2 h-3.5 w-3.5" />
            Guardar y cerrar
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-white/40">El emulador corre nativo; esta ventana registra la sesión en FORBIDDENS.</p>
      </div>
    </div>
  );
}
