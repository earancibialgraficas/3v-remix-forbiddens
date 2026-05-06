import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallAppButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const mobile = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua) || window.matchMedia("(max-width: 1024px)").matches;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    setIsMobile(mobile);
    setIsIOS(ios);
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setDeferred(null));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!isMobile || isStandalone) return null;

  const handleInstall = async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    if (isIOS) {
      toast({
        title: "Instalar Forbiddens",
        description: "Toca el botón Compartir en Safari y elige 'Agregar a pantalla de inicio'.",
      });
    } else {
      toast({
        title: "Instalar Forbiddens",
        description: "Abre el menú del navegador y elige 'Agregar a pantalla de inicio'.",
      });
    }
  };

  return (
    <Button
      onClick={handleInstall}
      size="sm"
      className="bg-neon-magenta text-background hover:bg-neon-magenta/80 font-pixel text-[10px] px-5 py-2.5 transition-all duration-200"
    >
      <Download className="w-3 h-3" /> INSTALAR APP
    </Button>
  );
}
