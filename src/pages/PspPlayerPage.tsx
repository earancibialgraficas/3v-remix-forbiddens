import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Play, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type PlayerState = "loading" | "ready" | "running" | "error";

export default function PspPlayerPage() {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const [state, setState] = useState<PlayerState>("loading");
  const [message, setMessage] = useState("Preparando PPSSPP para PSP...");

  const fileId = searchParams.get("file") || "";
  const gameName =
    (typeof window !== "undefined" &&
      (() => {
        try {
          return (
            JSON.parse(sessionStorage.getItem(`psp_launch_${fileId}`) || "null")?.name ||
            null
          );
        } catch {
          return null;
        }
      })()) ||
    searchParams.get("name") ||
    "Juego PSP";

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      // Cleanup EmulatorJS globals so re-entry works
      const w = window as any;
      try {
        w.EJS_emulator?.callEvent?.("exit");
      } catch {}
      [
        "EJS_player",
        "EJS_core",
        "EJS_gameUrl",
        "EJS_gameName",
        "EJS_pathtodata",
        "EJS_startOnLoaded",
        "EJS_threads",
        "EJS_language",
        "EJS_volume",
        "EJS_disableDatabases",
        "EJS_onGameStart",
        "EJS_emulator",
        "EJS_Buttons",
      ].forEach((k) => {
        try {
          delete w[k];
        } catch {}
      });
    };
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const loadPsp = async () => {
      if (!fileId) {
        setState("error");
        setMessage("No se recibió el juego PSP desde la biblioteca.");
        return;
      }

      if (!window.crossOriginIsolated) {
        setState("error");
        setMessage(
          "PSP necesita modo aislado del navegador (crossOriginIsolated). Verifica que estés en el dominio publicado (ej. forbiddens.net) y no en el preview de Lovable."
        );
        return;
      }

      if (typeof (window as any).SharedArrayBuffer === "undefined") {
        setState("error");
        setMessage(
          "El navegador no expone SharedArrayBuffer. PPSSPP no puede arrancar sin él."
        );
        return;
      }

      const token = localStorage.getItem("drive_access_token");
      const expiry = Number(localStorage.getItem("drive_token_expiry") || 0);
      if (!token || Date.now() >= expiry) {
        setState("error");
        setMessage(
          "La sesión de Google Drive expiró. Vuelve a la biblioteca, pulsa actualizar y abre el juego PSP otra vez."
        );
        return;
      }

      try {
        setMessage("Descargando ROM PSP desde Drive...");
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!response.ok) throw new Error("No se pudo leer la ROM PSP desde Drive.");

        const blob = await response.blob();
        const romUrl = URL.createObjectURL(blob);
        objectUrlRef.current = romUrl;

        setMessage("Iniciando PPSSPP...");

        const container = playerContainerRef.current;
        if (!container) throw new Error("No se pudo montar el reproductor PSP.");

        const w = window as any;
        w.EJS_player = "#psp-player-root";
        w.EJS_core = "psp";
        w.EJS_gameUrl = romUrl;
        w.EJS_gameName = gameName;
        w.EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
        w.EJS_startOnLoaded = true;
        w.EJS_threads = true;
        w.EJS_language = "es-ES";
        w.EJS_volume = 1;
        w.EJS_disableDatabases = true;
        w.EJS_onGameStart = () => {
          setState("running");
          setMessage("PSP en ejecución");
        };

        setState("ready");

        // Load EmulatorJS loader script directly on the same document (inherits COOP/COEP)
        const existing = document.querySelector(
          'script[data-ejs-loader="psp"]'
        ) as HTMLScriptElement | null;
        if (existing) existing.remove();

        const script = document.createElement("script");
        script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
        script.async = true;
        script.dataset.ejsLoader = "psp";
        script.onerror = () => {
          setState("error");
          setMessage("No se pudo cargar PPSSPP desde el CDN de EmulatorJS.");
        };
        document.body.appendChild(script);
      } catch (error: any) {
        setState("error");
        setMessage(error?.message || "No se pudo iniciar el emulador PSP.");
        toast({
          title: "PSP no pudo iniciar",
          description: error?.message || "Error cargando PPSSPP.",
          variant: "destructive",
        });
      }
    };

    loadPsp();
  }, [fileId, gameName, toast]);

  return (
    <main className="min-h-[calc(100vh-120px)] bg-background text-foreground">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3">
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link to="/arcade/biblioteca?console=psp">
            <ArrowLeft className="mr-2 h-4 w-4" /> Biblioteca
          </Link>
        </Button>
        <div className="min-w-0 text-center">
          <h1 className="truncate text-xs text-neon-cyan">PSP · PPSSPP</h1>
          <p className="truncate text-xs text-muted-foreground">{gameName}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded border border-neon-cyan/30 bg-neon-cyan/10">
          {state === "running" ? (
            <Play className="h-4 w-4 text-neon-cyan" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />
          )}
        </div>
      </div>

      <section className="relative h-[calc(100vh-180px)] min-h-[420px] bg-retro-darker">
        {state !== "running" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-background/80 p-6 text-center backdrop-blur-sm">
            {state === "error" ? (
              <ShieldAlert className="h-10 w-10 text-destructive" />
            ) : (
              <Loader2 className="h-10 w-10 animate-spin text-neon-cyan" />
            )}
            <p className="max-w-xl text-sm text-muted-foreground">{message}</p>
          </div>
        )}
        <div
          id="psp-player-root"
          ref={playerContainerRef}
          className="h-full w-full bg-black"
        />
      </section>
    </main>
  );
}
