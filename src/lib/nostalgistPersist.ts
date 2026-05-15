// Persistencia de configs internas (retroarch.cfg, remaps, etc.) del emulador Nostalgist
// usando localStorage + emscripten FS. Permite guardar configuración por consola.

const KEY_PREFIX = "nostalgist_cfg_v1__";

type FileEntry = { path: string; data: string }; // base64

const CONFIG_PATHS = [
  "/home/web_user/retroarch/userdata/retroarch.cfg",
  "/home/web_user/retroarch/userdata/config",
  "/home/web_user/retroarch/userdata/remaps",
];

function getFS(instance: any): any | null {
  try {
    const emu = instance?.getEmulator?.();
    const em = emu?.getEmscripten?.();
    return em?.FS ?? null;
  } catch {
    return null;
  }
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function walkAndCollect(FS: any, path: string, out: FileEntry[]) {
  let stat: any;
  try { stat = FS.stat(path); } catch { return; }
  const isDir = FS.isDir(stat.mode);
  if (isDir) {
    let entries: string[] = [];
    try { entries = FS.readdir(path); } catch { return; }
    for (const e of entries) {
      if (e === "." || e === "..") continue;
      walkAndCollect(FS, path + "/" + e, out);
    }
  } else {
    try {
      const data = FS.readFile(path);
      out.push({ path, data: bytesToB64(data) });
    } catch {}
  }
}

function ensureDir(FS: any, dirPath: string) {
  const parts = dirPath.split("/").filter(Boolean);
  let cur = "";
  for (const p of parts) {
    cur += "/" + p;
    try { FS.mkdir(cur); } catch {}
  }
}

export function saveEmulatorConfig(instance: any, consoleName: string) {
  const FS = getFS(instance);
  if (!FS) return;
  const out: FileEntry[] = [];
  for (const p of CONFIG_PATHS) walkAndCollect(FS, p, out);
  if (out.length === 0) return;
  try {
    localStorage.setItem(KEY_PREFIX + consoleName, JSON.stringify(out));
  } catch {}
}

export function restoreEmulatorConfig(instance: any, consoleName: string) {
  const FS = getFS(instance);
  if (!FS) return;
  const raw = localStorage.getItem(KEY_PREFIX + consoleName);
  if (!raw) return;
  try {
    const list: FileEntry[] = JSON.parse(raw);
    for (const f of list) {
      const dir = f.path.substring(0, f.path.lastIndexOf("/"));
      ensureDir(FS, dir);
      try { FS.writeFile(f.path, b64ToBytes(f.data)); } catch {}
    }
  } catch {}
}

// 🇪🇸 Asegura que el menú interno de RetroArch (Nostalgist) esté en español.
// user_language = 7 corresponde a Spanish en RetroArch.
export function ensureSpanishLanguage(instance: any) {
  const FS = getFS(instance);
  if (!FS) return;
  const cfgPath = "/home/web_user/retroarch/userdata/retroarch.cfg";
  let existing = "";
  try {
    const data = FS.readFile(cfgPath);
    existing = new TextDecoder().decode(data);
  } catch {}

  // Si ya tiene la línea, no la duplicamos
  if (/user_language\s*=/.test(existing)) {
    if (!/user_language\s*=\s*"?7"?/.test(existing)) {
      existing = existing.replace(/user_language\s*=\s*"?\d+"?/g, 'user_language = "7"');
    }
  } else {
    existing += `\nuser_language = "7"\n`;
  }

  // También fuerza menu en xmb con strings ES
  if (!/menu_driver\s*=/.test(existing)) {
    existing += `menu_driver = "ozone"\n`;
  }

  ensureDir(FS, "/home/web_user/retroarch/userdata");
  try {
    FS.writeFile(cfgPath, new TextEncoder().encode(existing));
  } catch {}
}

