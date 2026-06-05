import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SAVE_SYNC_URL = "https://forbiddens-save-sync.e-arancibial-graficas.workers.dev";

const getSaveSyncUrl = () =>
  (import.meta.env.VITE_SAVE_SYNC_URL || DEFAULT_SAVE_SYNC_URL).replace(/\/+$/, "");

function safeGameId(gameName: string) {
  const normalized = gameName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

  return normalized || "game";
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.access_token || null;
}

async function requestCloudSave(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  if (!token) throw new Error("Debes iniciar sesion para sincronizar partidas.");

  return fetch(`${getSaveSyncUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
}

export async function uploadSaveSlotsToCloudflare(params: {
  gameName: string;
  consoleType: string;
  slotsJson: string;
}) {
  const gameId = safeGameId(params.gameName);
  const consoleType = safeGameId(params.consoleType.toLowerCase());

  const res = await requestCloudSave(`/saves/${consoleType}/${gameId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: params.slotsJson,
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`Cloudflare save failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  return res.json().catch(() => ({ ok: true }));
}

export async function downloadSaveSlotsFromCloudflare(params: {
  gameName: string;
  consoleType: string;
}) {
  const gameId = safeGameId(params.gameName);
  const consoleType = safeGameId(params.consoleType.toLowerCase());

  const res = await requestCloudSave(`/saves/${consoleType}/${gameId}`, {
    method: "GET",
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(`Cloudflare load failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }

  return res.text();
}
