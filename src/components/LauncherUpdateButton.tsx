import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getLauncherBridge } from "@/lib/launcherBridge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
