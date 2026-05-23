import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Play, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type PlayerState = "loading" | "ready" | "running" | "error";

export default function PspPlayerPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [state, setState] = useState<PlayerState>("loading");
  const [message, setMessage] = useState("Preparando PPSSPP para PSP...");

  const fileId = searchParams.get("file") || "";
  const launchMeta = useMemo(() => {
    if (!fileId || typeof window === "undefined") return null;
    try {
      return JSON.parse(sessionStorage.getItem(`psp_launch_${fileId}`) || "null") as { name?: string } | null;
    } catch {
      return null;
    }
  }, [fileId]);
  const gameName = launchMeta?.name || searchParams.get("name") || "Juego PSP";

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const loadPsp = async () => {
      if (!fileId) {
        setState("error");
        setMessage("No se recibió el juego PSP desde la biblioteca.");
        return;
      }

      if (!window.crossOriginIsolated) {
        setState("error");
        setMessage("PSP necesita modo aislado del navegador. Publícalo o ábrelo desde el dominio final para que PPSSPP pueda arrancar con hilos.");
        return;
      }

      const token = localStorage.getItem("drive_access_token");
      const expiry = Number(localStorage.getItem("drive_token_expiry") || 0);
      if (!token || Date.now() >= expiry) {
        setState("error");
        setMessage("La sesión de Google Drive expiró. Vuelve a la biblioteca, pulsa actualizar y abre el juego PSP otra vez.");
        return;
      }

      try {
        setMessage("Descargando ROM PSP desde Drive...");
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("No se pudo leer la ROM PSP desde Drive.");

        const blob = await response.blob();
        const romUrl = URL.createObjectURL(blob);
        objectUrlRef.current = romUrl;
        setState("ready");
        setMessage("PPSSPP listo. Iniciando PSP...");

        const frame = frameRef.current;
        if (!frame) return;

        const html = `<!doctype html><html><head><meta charset="utf-8" />
<style>
html,body,#game{margin:0;width:100%;height:100%;background:#000;overflow:hidden;touch-action:none}
#game{position:relative;display:flex;align-items:center;justify-content:center}
#game canvas,.ejs_canvas_parent,div[class*="canvas_parent"]{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;background:#000!important}
.ejs_drop_zone,.ejs_dropzone,.ejs_status,.ejs_message,.ejs_notification,.ejs_loading_text{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important}
</style></head><body><div id="game"></div><script>
window.EJS_player="#game";
window.EJS_core="psp";
window.EJS_gameUrl=${JSON.stringify(romUrl)};
window.EJS_gameName=${JSON.stringify(gameName)};
window.EJS_pathtodata="https://cdn.emulatorjs.org/stable/data/";
window.EJS_startOnLoaded=true;
window.EJS_threads=true;
window.EJS_language="es-ES";
window.EJS_volume=1;
window.EJS_disableDatabases=true;
window.EJS_onGameStart=function(){parent.postMessage({type:"forbiddens-psp-started"},"*")};
</script><script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script></body></html>`;

        const onStarted = (event: MessageEvent) => {
          if (event.data?.type !== "forbiddens-psp-started") return;
          setState("running");
          setMessage("PSP en ejecución");
          window.removeEventListener("message", onStarted);
        };
        window.addEventListener("message", onStarted);

        frame.src = "about:blank";
        const doc = frame.contentDocument;
        if (!doc) throw new Error("No se pudo abrir el reproductor PSP.");
        doc.open();
        doc.write(html);
        doc.close();
      } catch (error: any) {
        setState("error");
        setMessage(error?.message || "No se pudo iniciar el emulador PSP.");
        toast({ title: "PSP no pudo iniciar", description: error?.message || "Error cargando PPSSPP.", variant: "destructive" });
      }
    };

    loadPsp();
  }, [fileId, gameName, toast]);

  return (
    <main className="min-h-[calc(100vh-120px)] bg-background text-foreground">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link to="/arcade/biblioteca?console=psp"><ArrowLeft className="mr-2 h-4 w-4" /> Biblioteca</Link>
        </Button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-xs text-neon-cyan">PSP · PPSSPP</h1>
          <p className="truncate text-xs text-muted-foreground">{gameName}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded border border-neon-cyan/30 bg-neon-cyan/10">
          {state === "running" ? <Play className="h-4 w-4 text-neon-cyan" /> : <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />}
        </div>
      </div>

      <section className="relative h-[calc(100vh-180px)] min-h-[420px] bg-retro-darker">
        {state !== "running" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/80 p-6 text-center backdrop-blur-sm">
            {state === "error" ? <ShieldAlert className="h-10 w-10 text-destructive" /> : <Loader2 className="h-10 w-10 animate-spin text-neon-cyan" />}
            <p className="max-w-xl text-sm text-muted-foreground">{message}</p>
          </div>
        )}
        <iframe ref={frameRef} title="PPSSPP PSP Player" className="h-full w-full border-0" allow="gamepad; fullscreen; autoplay" />
      </section>
    </main>
  );
}