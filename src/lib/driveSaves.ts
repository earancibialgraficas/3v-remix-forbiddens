// Helpers para guardar/cargar partidas (save states) en Google Drive del usuario.
// Carpeta: "RetroSaves" (creada en root del Drive, scope drive.file).
import { supabase } from "@/integrations/supabase/client";

const FOLDER_NAME = "RetroSaves";

function getDriveToken(): string | null {
  const tok = localStorage.getItem("drive_access_token") || sessionStorage.getItem("drive_access_token");
  const exp = Number(localStorage.getItem("drive_token_expiry") || sessionStorage.getItem("drive_token_expiry") || 0);
  if (!tok) return null;
  if (exp && Date.now() > exp) return null;
  return tok;
}

export function isDriveLinked(): boolean {
  return !!getDriveToken();
}

async function ensureFolder(token: string): Promise<string> {
  const q = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.files && data.files.length > 0) return data.files[0].id;

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const created = await createRes.json();
  if (!created.id) throw new Error("No se pudo crear la carpeta RetroSaves en Drive");
  return created.id;
}

function safeFileName(gameName: string, consoleType: string) {
  const slug = `${consoleType}_${gameName}`.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 80);
  return `${slug}.save.json`;
}

async function uploadOrUpdateFile(
  token: string,
  folderId: string,
  fileName: string,
  existingFileId: string | null,
  contentJson: string,
): Promise<{ id: string; size: number }> {
  const metadata: any = { name: fileName };
  if (!existingFileId) metadata.parents = [folderId];

  const boundary = "----lovableRetroSaves" + Math.random().toString(36).slice(2);
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) + `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    contentJson + `\r\n` +
    `--${boundary}--`;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,size`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,size`;

  const res = await fetch(url, {
    method: existingFileId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const data = await res.json();
  if (!data.id) throw new Error(`Upload Drive falló: ${JSON.stringify(data)}`);
  return { id: data.id, size: Number(data.size || contentJson.length) };
}

export async function uploadSaveSlotsToDrive(params: {
  userId: string;
  gameName: string;
  consoleType: string;
  slotsJson: string;
}): Promise<{ driveFileId: string; sizeBytes: number }> {
  const token = getDriveToken();
  if (!token) throw new Error("Google Drive no está vinculado.");

  const folderId = await ensureFolder(token);

  // Buscar registro previo para reusar drive_file_id
  const { data: existing } = await supabase
    .from("user_drive_saves" as any)
    .select("drive_file_id")
    .eq("user_id", params.userId)
    .eq("game_name", params.gameName)
    .eq("console_type", params.consoleType)
    .maybeSingle();

  const fileName = safeFileName(params.gameName, params.consoleType);
  const existingId = (existing as any)?.drive_file_id || null;

  const { id, size } = await uploadOrUpdateFile(token, folderId, fileName, existingId, params.slotsJson);

  await supabase.from("user_drive_saves" as any).upsert(
    {
      user_id: params.userId,
      game_name: params.gameName,
      console_type: params.consoleType,
      drive_file_id: id,
      file_name: fileName,
      size_bytes: size,
    },
    { onConflict: "user_id,game_name,console_type" },
  );

  return { driveFileId: id, sizeBytes: size };
}

export async function downloadSaveSlotsFromDrive(params: {
  userId: string;
  gameName: string;
  consoleType: string;
}): Promise<string | null> {
  const token = getDriveToken();
  if (!token) return null;

  const { data } = await supabase
    .from("user_drive_saves" as any)
    .select("drive_file_id")
    .eq("user_id", params.userId)
    .eq("game_name", params.gameName)
    .eq("console_type", params.consoleType)
    .maybeSingle();

  const fileId = (data as any)?.drive_file_id;
  if (!fileId) return null;

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return await res.text();
}

export async function deleteSaveFromDrive(params: { userId: string; driveFileId: string; recordId: string }): Promise<void> {
  const token = getDriveToken();
  if (token) {
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${params.driveFileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }
  await supabase.from("user_drive_saves" as any).delete().eq("id", params.recordId);
}
