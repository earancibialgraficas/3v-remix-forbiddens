import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Play, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { useToast } from "@/hooks/use-toast";

type PlayerState = "loading" | "ready" | "running" | "error";

const PSP_PREFETCH_ASSETS = [
  "/emulatorjs-data/loader.js",
  "/emulatorjs-data/emulator.min.js",
  "/emulatorjs-data/cores/reports/ppsspp.json",
  "/emulatorjs-data/cores/ppsspp-thread-wasm.data",
  "/emulatorjs-data/cores/ppsspp-assets.zip",
];

const getStoredGameName = (fileId: string) => {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(sessionStorage.getItem(`psp_launch_${fileId}`) || "null")?.name || null;
  } catch {
    return null;
  }
};

const prefetchPspAssets = () => {
  PSP_PREFETCH_ASSETS.forEach((url) => {
    fetch(url, { cache: "force-cache" }).catch(() => {});
  });
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
};

export default function PspPlayerPage() {
  const [searchParams] = useSearchParams();
  const { launchGame, activeGames } = useGameBubble();
  const { toast } = useToast();
  const startedRef = useRef(false);
  const [state, setState] = useState<PlayerState>("loading");
  const [message, setMessage] = useState("Preparando PPSSPP para PSP...");

  const fileId = searchParams.get("file") || "";
  const gameName = getStoredGameName(fileId) || searchParams.get("name") || "Juego PSP";
  const isGameActive = activeGames.some((game) => game.romUrl === `local:${fileId}`);

  useEffect(() => {
    if (!fileId || startedRef.current) return;
    startedRef.current = true;

    const loadPspFromDrive = async () => {
      if (!window.crossOriginIsolated) {
        setState("error");
        setMessage(
          "PSP necesita modo aislado del navegador. Abre este jugador desde el dominio publicado para activar SharedArrayBuffer."
        );
        return;
      }

      if (typeof (window as any).SharedArrayBuffer === "undefined") {
        setState("error");
        setMessage("El navegador no expone SharedArrayBuffer. PPSSPP no puede arrancar sin el.");
        return;
      }

      const token = localStorage.getItem("drive_access_token");
      const expiry = Number(localStorage.getItem("drive_token_expiry") || 0);
      if (!token || Date.now() >= expiry) {
        setState("error");
        setMessage("La sesion de Google Drive expiro. Vuelve a la biblioteca, actualiza y abre el juego PSP otra vez.");
        return;
      }

      try {
        prefetchPspAssets();
        setMessage("Descargando ROM PSP desde Drive...");
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("No se pudo leer la ROM PSP desde Drive.");

        const totalBytes = Number(response.headers.get("content-length") || 0);
        let blob: Blob;

        if (response.body && totalBytes > 0) {
          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let receivedBytes = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;
            chunks.push(value);
            receivedBytes += value.byteLength;
            const pct = Math.max(1, Math.min(99, Math.round((receivedBytes / totalBytes) * 100)));
            setMessage(`Descargando ROM PSP desde Drive... ${pct}% (${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)})`);
          }

          blob = new Blob(chunks as BlobPart[], { type: response.headers.get("content-type") || "application/octet-stream" });
        } else {
          blob = await response.blob();
        }

        const file = new File([blob], gameName, { type: blob.type || "application/octet-stream" });

        if (!(window as any).__localRoms) (window as any).__localRoms = {};
        (window as any).__localRoms[fileId] = file;

        setState("ready");
        setMessage("Iniciando PPSSPP...");

        launchGame({
          romUrl: `local:${fileId}`,
          consoleName: "psp",
          gameName,
          consoleCore: "ppsspp",
          score: 0,
          playTime: 0,
        });
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

    loadPspFromDrive();
  }, [fileId, gameName, launchGame, toast]);

  useEffect(() => {
    if (isGameActive) {
      setState("running");
      setMessage("PSP en ejecucion");
    }
  }, [isGameActive]);

  if (!fileId) {
    return (
      <main className="flex min-h-[calc(100vh-120px)] items-center justify-center bg-background p-4 text-foreground">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-card p-5 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">No se recibio el juego PSP desde la biblioteca.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/arcade/biblioteca?console=psp">Volver a biblioteca</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <div
      id="batocera-screen"
      className="relative h-[calc(100vh-5.5rem)] min-h-[600px] w-full flex-1 overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] selection:bg-transparent"
    >
      <div className="absolute inset-0">
        <img
          src="/consolasimg/PSP.png"
          alt="PlayStation Portable"
          className="h-full w-full scale-105 object-contain opacity-20 blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/45 to-black/95" />
      </div>

      <div id="batocera-target" className="absolute inset-0 z-10 pointer-events-none" />

      {state !== "running" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 p-6 text-center">
          {state === "error" ? (
            <ShieldAlert className="h-10 w-10 text-destructive" />
          ) : (
            <Loader2 className="h-10 w-10 animate-spin text-neon-cyan" />
          )}
          <div className="space-y-2">
            <h1 className="font-pixel text-sm text-neon-cyan">PSP | PPSSPP</h1>
            <p className="max-w-xl text-sm text-muted-foreground">{message}</p>
            <p className="max-w-xl truncate text-xs text-white/50">{gameName}</p>
          </div>
          {state === "error" && (
            <Button asChild variant="outline" size="sm">
              <Link to="/arcade/biblioteca?console=psp">
                <ArrowLeft className="mr-2 h-4 w-4" /> Biblioteca
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="absolute left-3 top-3 z-30 flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="h-9 border-white/20 bg-black/60 text-white hover:bg-white/10">
          <Link to="/arcade/biblioteca?console=psp">
            <ArrowLeft className="mr-2 h-4 w-4" /> Biblioteca
          </Link>
        </Button>
        <div className="hidden rounded border border-neon-cyan/30 bg-black/60 px-3 py-2 sm:block">
          <p className="font-pixel text-[10px] uppercase text-neon-cyan">PSP</p>
          <p className="max-w-[40vw] truncate text-xs text-white/70">{gameName}</p>
        </div>
      </div>

      <div className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded border border-neon-cyan/30 bg-neon-cyan/10">
        {state === "running" ? (
          <Play className="h-4 w-4 text-neon-cyan" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" />
        )}
      </div>
    </div>
  );
}
