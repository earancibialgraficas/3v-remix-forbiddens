import { canonicalRomKey } from "@/lib/driveRomUtils";

export interface DriveCoverBackup {
  file_name: string;
  custom_name?: string | null;
  custom_cover_url?: string | null;
}

const LOCAL_KEY_PREFIX = "forbiddens_drive_covers:";

export function buildCoverBackupMap(covers: DriveCoverBackup[] | null | undefined) {
  const map = new Map<string, DriveCoverBackup>();

  (covers || []).forEach((cover) => {
    if (!cover?.file_name) return;
    map.set(cover.file_name, cover);
    map.set(canonicalRomKey(cover.file_name), cover);
  });

  return map;
}

export function getCoverBackup(map: Map<string, DriveCoverBackup>, fileName: string) {
  return map.get(fileName) || map.get(canonicalRomKey(fileName)) || null;
}

export function loadLocalCoverBackups(userId: string): DriveCoverBackup[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY_PREFIX}${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalCoverBackups(userId: string, covers: DriveCoverBackup[]) {
  try {
    const existing = buildCoverBackupMap(loadLocalCoverBackups(userId));
    covers.forEach((cover) => {
      if (!cover.file_name || (!cover.custom_name && !cover.custom_cover_url)) return;
      existing.set(cover.file_name, cover);
      existing.set(canonicalRomKey(cover.file_name), cover);
    });

    const unique = new Map<string, DriveCoverBackup>();
    existing.forEach((cover) => unique.set(cover.file_name, cover));
    localStorage.setItem(`${LOCAL_KEY_PREFIX}${userId}`, JSON.stringify([...unique.values()]));
  } catch {}
}