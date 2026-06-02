import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { Copy, Cpu, Gem, Minus, RefreshCw, Square, Trophy, X } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useNativeSession } from "@/contexts/NativeSessionContext";
import { getLauncherBridge } from "@/lib/launcherBridge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useActiveStatBoost } from "@/hooks/useActiveStatBoost";

const formatNumber = (value: number) => Math.trunc(Number(value || 0)).toLocaleString("es-CL");

type PointWalletTable = {
  Row: {
    user_id: string;
    balance: number;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    user_id: string;
    balance?: number;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    user_id?: string;
    balance?: number;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
};

type LauncherDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      point_wallets: PointWalletTable;
    };
  };
};

const launcherSupabase = supabase as SupabaseClient<LauncherDatabase>;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
};

export default function DesktopLauncherTitleBar() {
  const { user, profile, isAdmin, isMasterWeb, isMod, isStaff } = useAuth();
  const { sessions, currentSessionIndex } = useNativeSession();
  const { toast } = useToast();
  const [visible, setVisible] = useState(() => Boolean(getLauncherBridge()));
  const [checking, setChecking] = useState(false);
  const [wallet, setWallet] = useState<number | null>(null);
  const [maximized, setMaximized] = useState(false);
  const activeStatBoost = useActiveStatBoost(user?.id);

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
      const { data } = await launcherSupabase
        .from("point_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setWallet(Number(data?.balance ?? 0));
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
  }, [user]);

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
    if (action === "toggle_maximize") setMaximized((current) => !current);
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("button,a,input,select,textarea,[data-no-tauri-drag]")) return;
    void getLauncherBridge()?.startLauncherDrag?.();
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
    } catch (error: unknown) {
      toast({
        title: "No se pudo actualizar",
        description: getErrorMessage(error, "El updater aun no esta configurado."),
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
      onPointerDown={startDrag}
      className="desktop-launcher-titlebar fixed inset-x-0 top-0 z-[300] flex h-10 select-none items-center border-b border-neon-cyan/20 bg-[#05070d]/95 text-white shadow-[0_10px_28px_rgba(0,0,0,0.45)] backdrop-blur-xl"
    >
      <div data-tauri-drag-region className="flex h-full min-w-0 flex-1 items-center gap-3 px-3">
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center bg-contain bg-center bg-no-repeat text-transparent drop-shadow-[0_0_10px_rgba(222,24,57,0.34)]"
            style={{ backgroundImage: "url('/forbiddens-logo.png')" }}
            aria-hidden="true"
          />
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
            {activeStatBoost.active && <span className="rounded bg-neon-green/20 px-1 font-pixel text-[7px] uppercase leading-none">x{activeStatBoost.multiplier}</span>}
          </div>
          <div className="flex items-center gap-1.5 rounded border border-[#f7d28b]/25 bg-[#f7d28b]/10 px-2 py-1 text-[#f7d28b]">
            <Gem className="h-3.5 w-3.5" />
            <span className="font-pixel text-[8px] uppercase">F-coin</span>
            <span className="text-[11px] font-bold tabular-nums">{formatNumber(wallet ?? 0)}</span>
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
          className="grid h-full w-11 place-items-center text-neon-cyan/75 transition-all duration-150 hover:bg-neon-cyan/15 hover:text-neon-cyan hover:shadow-[inset_0_-2px_0_rgba(34,211,238,0.75)] active:bg-neon-cyan/20 disabled:cursor-wait"
          title="Buscar actualizacion"
          aria-label="Buscar actualizacion"
        >
          <RefreshCw className={cn("h-4 w-4", checking && "animate-spin")} />
        </button>
        <button
          type="button"
          onClick={() => windowAction("minimize")}
          className="grid h-full w-11 place-items-center text-white/70 transition-all duration-150 hover:bg-neon-cyan/10 hover:text-neon-cyan hover:shadow-[inset_0_-2px_0_rgba(34,211,238,0.65)] active:bg-neon-cyan/15"
          aria-label="Minimizar"
          title="Minimizar"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => windowAction("toggle_maximize")}
          className="grid h-full w-11 place-items-center text-white/70 transition-all duration-150 hover:bg-neon-green/10 hover:text-neon-green hover:shadow-[inset_0_-2px_0_rgba(57,255,20,0.65)] active:bg-neon-green/15"
          aria-label={maximized ? "Restaurar" : "Maximizar"}
          title={maximized ? "Restaurar" : "Maximizar"}
        >
          {maximized ? <Copy className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => windowAction("close")}
          className="grid h-full w-11 place-items-center text-white/70 transition-all duration-150 hover:bg-neon-red/85 hover:text-white hover:shadow-[inset_0_-2px_0_rgba(255,255,255,0.38)] active:bg-neon-red"
          aria-label="Cerrar"
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
