import { useEffect, useMemo, useState } from "react";
import { Cpu, Gem, Minus, RefreshCw, Square, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNativeSession } from "@/contexts/NativeSessionContext";
import { getLauncherBridge } from "@/lib/launcherBridge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const formatNumber = (value: number) => Math.trunc(Number(value || 0)).toLocaleString("es-CL");

export default function DesktopLauncherTitleBar() {
  const { user, profile, isAdmin, isMasterWeb, isMod, isStaff } = useAuth();
  const { sessions, currentSessionIndex } = useNativeSession();
  const { toast } = useToast();
  const [visible, setVisible] = useState(() => Boolean(getLauncherBridge()));
  const [checking, setChecking] = useState(false);
  const [wallet, setWallet] = useState<number | null>(null);

  const activeSession = sessions[currentSessionIndex];

  useEffect(() => {
    if (visible) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (getLauncherBridge() || attempts >= 40) {
        setVisible(Boolean(getLauncherBridge()));
        window.clearInterval(timer);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [visible]);

  useEffect(() => {
    if (!user) {
      setWallet(null);
      return;
    }

    let cancelled = false;
    const loadWallet = async () => {
      const { data } = await (supabase as any)
        .from("point_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setWallet(Number(data?.balance ?? profile?.total_score ?? 0));
    };

    loadWallet();
    const channel = supabase
      .channel(`launcher-wallet-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "point_wallets", filter: `user_id=eq.${user.id}` }, loadWallet)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [profile?.total_score, user]);

  const profileTitle = useMemo(() => {
    if (!profile?.display_name) return "";
    const parts = [profile.display_name];
    const tier = isStaff ? "STAFF" : (profile.membership_tier || "novato").trim();
    if (tier && tier.toLowerCase() !== "novato") parts.push(tier.toUpperCase());

    if (isMasterWeb) parts.push("WebMaster");
    else if (isAdmin) parts.push("Admin");
    else if (isMod) parts.push("Moderador");

    return parts.join(" ");
  }, [isAdmin, isMasterWeb, isMod, isStaff, profile?.display_name, profile?.membership_tier]);

  const windowAction = (action: "minimize" | "toggle_maximize" | "close") => {
    void getLauncherBridge()?.launcherWindowAction?.(action);
  };

  const checkUpdate = async () => {
    const bridge = getLauncherBridge();
    if (!bridge?.checkUpdate) return;

    setChecking(true);
    try {
      const result = await bridge.checkUpdate();
      if (result.startsWith("installed:")) {
        const version = result.replace("installed:", "");
        toast({
          title: "Actualizacion instalada",
          description: `FORBIDDENS Launcher ${version} se reiniciara para aplicar cambios.`,
        });
        window.setTimeout(() => {
          void bridge.restartLauncher?.();
        }, 1400);
        return;
      }

      if (result.startsWith("manual-download:")) {
        toast({
          title: "Descarga abierta",
          description: "El updater firmado aun no esta activo, asi que abrimos el instalador mas reciente del launcher.",
        });
        return;
      }

      toast({
        title: "Launcher actualizado",
        description: "Ya tienes la ultima version disponible.",
      });
    } catch (error: any) {
      toast({
        title: "No se pudo actualizar",
        description: error?.message || String(error || "El updater aun no esta configurado."),
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      data-tauri-drag-region
      className="fixed inset-x-0 top-0 z-[300] flex h-10 select-none items-center border-b border-neon-cyan/20 bg-[#05070d]/95 text-white shadow-[0_10px_28px_rgba(0,0,0,0.45)] backdrop-blur-xl"
    >
      <div data-tauri-drag-region className="flex h-full min-w-0 flex-1 items-center gap-3 px-3">
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center bg-contain bg-center bg-no-repeat text-transparent drop-shadow-[0_0_10px_rgba(222,24,57,0.34)]"
            style={{ backgroundImage: "url('/forbiddens-logo.png')" }}
          >
            ✽
          </span>
          <div data-tauri-drag-region className="min-w-0 leading-none">
            <p className="font-pixel text-[9px] uppercase tracking-[0.24em] text-neon-cyan">FORBIDDENS</p>
            <p className="mt-0.5 w-full font-pixel text-[8px] uppercase text-white/55 [letter-spacing:0.44em]">LAUNCHER</p>
          </div>
        </div>

        <div data-tauri-drag-region className="hidden h-5 w-px bg-white/10 md:block" />

        {profile && (
          <div data-tauri-drag-region className="hidden min-w-0 items-center gap-2 md:flex">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded border border-neon-cyan/30 object-cover" />
            ) : (
              <span className="h-6 w-6 rounded border border-neon-cyan/30 bg-neon-cyan/10" />
            )}
            <span className="max-w-[220px] truncate text-[11px] font-semibold text-white/80">{profileTitle}</span>
          </div>
        )}

        <div data-tauri-drag-region className="ml-auto hidden items-center gap-2 sm:flex">
          <div className="flex items-center gap-1.5 rounded border border-neon-green/25 bg-neon-green/10 px-2 py-1 text-neon-green">
            <Trophy className="h-3.5 w-3.5" />
            <span className="font-pixel text-[8px] uppercase">STATS</span>
            <span className="text-[11px] font-bold tabular-nums">{formatNumber(profile?.total_score || 0)}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded border border-[#f7d28b]/25 bg-[#f7d28b]/10 px-2 py-1 text-[#f7d28b]">
            <Gem className="h-3.5 w-3.5" />
            <span className="font-pixel text-[8px] uppercase">F-coin</span>
            <span className="text-[11px] font-bold tabular-nums">{formatNumber(wallet ?? profile?.total_score ?? 0)}</span>
          </div>
          {activeSession && (
            <div className="hidden items-center gap-1.5 rounded border border-neon-cyan/25 bg-neon-cyan/10 px-2 py-1 text-neon-cyan lg:flex">
              <Cpu className="h-3.5 w-3.5" />
              <span className="max-w-[180px] truncate text-[10px]">{activeSession.engineName}</span>
              <span className="font-pixel text-[8px] uppercase text-neon-green">+{formatNumber(activeSession.score)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-full items-center border-l border-white/10">
        <button
          type="button"
          onClick={checkUpdate}
          disabled={checking}
          className="grid h-full w-11 place-items-center text-neon-cyan/75 transition-colors hover:bg-neon-cyan/10 hover:text-neon-cyan disabled:cursor-wait"
          title="Buscar actualizacion"
          aria-label="Buscar actualizacion"
        >
          <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} />
        </button>
        <button
          type="button"
          onClick={() => windowAction("minimize")}
          className="grid h-full w-11 place-items-center text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Minimizar"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => windowAction("toggle_maximize")}
          className="grid h-full w-11 place-items-center text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Maximizar"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => windowAction("close")}
          className="grid h-full w-11 place-items-center text-white/70 transition-colors hover:bg-neon-red/80 hover:text-white"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
