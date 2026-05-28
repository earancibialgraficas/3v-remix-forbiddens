import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getLauncherBridge } from "@/lib/launcherBridge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const RECOMMENDED_LAUNCHER_VERSION = "0.1.8";
const MANUAL_LAUNCHER_DOWNLOAD_URL = "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/FORBIDDENS_0.1.8_x64-setup.exe";

const isOlderVersion = (current: string, target: string) => {
  const currentParts = current.split(".").map((part) => Number(part) || 0);
  const targetParts = target.split(".").map((part) => Number(part) || 0);
  for (let index = 0; index < Math.max(currentParts.length, targetParts.length); index += 1) {
    const left = currentParts[index] || 0;
    const right = targetParts[index] || 0;
    if (left < right) return true;
    if (left > right) return false;
  }
  return false;
};

export default function LauncherUpdateButton() {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const syncVisibility = () => {
      const bridge = getLauncherBridge();
      if (bridge?.checkUpdate) {
        setVisible(true);
        return true;
      }
      return false;
    };

    if (syncVisibility()) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (syncVisibility() || attempts >= 40) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  const checkUpdate = async () => {
    const bridge = getLauncherBridge();
    if (!bridge?.checkUpdate) return;
    const openManualInstaller = async () => {
      if (bridge.openExternal) {
        await bridge.openExternal(MANUAL_LAUNCHER_DOWNLOAD_URL);
        return;
      }
      window.open(MANUAL_LAUNCHER_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
    };

    setChecking(true);
    try {
      const info = await bridge.launcherInfo?.().catch(() => null);
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
        await openManualInstaller();
        toast({
          title: "Descarga del launcher abierta",
          description: "No se pudo aplicar el updater automatico, pero abrimos el instalador nuevo.",
        });
        return;
      }

      if (info?.version && isOlderVersion(info.version, RECOMMENDED_LAUNCHER_VERSION)) {
        await openManualInstaller();
        toast({
          title: "Hay una version nueva",
          description: `Tu launcher es ${info.version}. Abrimos el instalador ${RECOMMENDED_LAUNCHER_VERSION}.`,
        });
        return;
      }

      toast({
        title: "Launcher actualizado",
        description: "Ya tienes la ultima version disponible.",
      });
    } catch (error: any) {
      try {
        await openManualInstaller();
      } catch {
        // Keep the original updater error visible if the fallback also fails.
      }
      toast({
        title: "Descarga del launcher abierta",
        description: error?.message
          ? `El updater automatico fallo, pero abrimos el instalador nuevo. Detalle: ${error.message}`
          : "El updater automatico fallo, pero abrimos el instalador nuevo.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={checkUpdate}
      disabled={checking}
      className={cn(
        "fixed bottom-3 left-12 z-[120] grid h-8 w-8 place-items-center rounded-full border border-neon-cyan/35 bg-black/55 text-neon-cyan opacity-55 shadow-lg backdrop-blur-md transition-all hover:bg-neon-cyan/15 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/60 disabled:cursor-wait",
        checking && "opacity-100",
      )}
      title="Buscar actualizacion del launcher"
      aria-label="Buscar actualizacion del launcher"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", checking && "animate-spin")} />
    </button>
  );
}
