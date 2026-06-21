import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Cloud, Loader2, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DRIVE_SYNC_RESUME_KEY = "drive_sync_resume_after_reload";

type CallbackState = "authorize" | "processing" | "ready" | "error";

export default function LauncherDriveSyncPage() {
  const navigate = useNavigate();
  const isStartPage = new URLSearchParams(window.location.search).get("start") === "1";
  const [status, setStatus] = useState<CallbackState>(isStartPage ? "authorize" : "processing");
  const [message, setMessage] = useState(isStartPage ? "Continua desde FORBIDDENS para autorizar Google Drive." : "Validando la autorizacion de Google Drive...");

  const destination = useMemo(() => {
    const fallback = "/perfil?tab=storage";
    if (typeof window === "undefined") return fallback;
    const stored = localStorage.getItem("drive_sync_oauth_return_path");
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const encodedState = new URLSearchParams(hash).get("state");
    if (encodedState) {
      try {
        const normalized = encodedState.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
        const parsed = JSON.parse(atob(padded));
        if (typeof parsed?.returnPath === "string" && parsed.returnPath.startsWith("/")) return parsed.returnPath;
      } catch {
        // The stored destination remains the safe fallback for legacy callbacks.
      }
    }
    return stored || fallback;
  }, []);

  useEffect(() => {
    if (isStartPage) {
      const query = new URLSearchParams(window.location.search);
      const state = query.get("state");
      const returnPath = query.get("return");
      if (state) localStorage.setItem("drive_sync_oauth_external_state", state);
      if (returnPath?.startsWith("/")) localStorage.setItem("drive_sync_oauth_return_path", returnPath);
      return;
    }
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
    const params = new URLSearchParams(hash);
    const error = params.get("error");
    const token = params.get("access_token");

    if (error) {
      setStatus("error");
      setMessage(params.get("error_description") || "Google no autorizo la sincronizacion.");
      return;
    }
    if (!token) {
      setStatus("error");
      setMessage("No se recibio una autorizacion valida. Puedes cerrar esta pestana e intentarlo otra vez desde el launcher.");
      return;
    }

    const expiresIn = Number(params.get("expires_in") || 3300);
    const ttlMs = Math.max(60_000, expiresIn * 1000 - 60_000);
    localStorage.setItem("drive_access_token", token);
    localStorage.setItem("drive_token_expiry", (Date.now() + ttlMs).toString());
    localStorage.setItem("drive_linked_until", (Date.now() + 24 * 60 * 60 * 1000).toString());
    sessionStorage.setItem("drive_access_token", token);
    sessionStorage.setItem("drive_token_expiry", (Date.now() + ttlMs).toString());
    sessionStorage.setItem(DRIVE_SYNC_RESUME_KEY, "1");
    window.history.replaceState(null, "", window.location.pathname);
    setStatus("ready");
    setMessage("Google Drive quedo autorizado. Ya puedes continuar hacia tu almacenamiento.");
  }, [isStartPage]);

  const beginAuthorization = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setStatus("error");
      setMessage("Google Drive no esta configurado en FORBIDDENS.");
      return;
    }
    const state = localStorage.getItem("drive_sync_oauth_external_state") || "";
    const redirectUri = import.meta.env.VITE_GOOGLE_DRIVE_REDIRECT_URI || "https://forbiddens.net/launcher/drive-sync";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file",
      include_granted_scopes: "true",
      prompt: "consent select_account",
      state,
    });
    window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  };

  const continueToStorage = () => navigate(destination.startsWith("/") ? destination : "/perfil?tab=storage", { replace: true });

  return (
    <main className="min-h-screen bg-background text-foreground grid place-items-center p-5">
      <section className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
        <div className="border-b border-border bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded border border-primary/35 bg-primary/10 text-primary"><Cloud className="h-5 w-5" /></span>
            <div>
              <h1 className="font-pixel text-[11px] uppercase text-primary">FORBIDDENS Drive Sync</h1>
              <p className="mt-1 text-xs text-muted-foreground">Conexion segura para el launcher</p>
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3 rounded border border-border bg-background/60 p-4">
            {status === "processing" && <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-primary" />}
            {status === "ready" && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-neon-green" />}
            {status === "error" && <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}
            <div>
              <p className="text-sm font-semibold">{status === "authorize" ? "Conectar Google Drive" : status === "processing" ? "Procesando" : status === "ready" ? "Autorizacion completada" : "No se pudo sincronizar"}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
            </div>
          </div>
          <button type="button" onClick={status === "authorize" ? beginAuthorization : continueToStorage} disabled={status === "processing"} className="mt-4 h-10 w-full rounded border border-primary/45 bg-primary/15 px-4 text-xs font-semibold text-primary transition-colors hover:bg-primary/25 disabled:cursor-wait disabled:opacity-50">
            {status === "authorize" ? "Vincular con Google" : status === "error" ? "Volver a almacenamiento" : "Continuar en FORBIDDENS"}
          </button>
          <p className="mt-3 text-center text-[10px] text-muted-foreground">Esta pagina solo procesa conexiones iniciadas desde FORBIDDENS.</p>
        </div>
      </section>
    </main>
  );
}
