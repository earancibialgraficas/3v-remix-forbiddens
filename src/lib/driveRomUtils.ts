const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';

export const ROM_FILE_REGEX = /\.(sfc|smc|nes|gba|z64|n64|v64|bin|iso|cue|chd|cso|pbp)$/i;

export interface DriveRomCandidate {
  file_name: string;
  console_type?: string;
  hasHint?: boolean;
}

export interface DriveRomFile {
  id: string;
  name: string;
  parents?: string[];
  parentHint?: string | null;
}

export function folderNameToConsole(rawName: string): string | null {
  const n = rawName.trim().toLowerCase().replace(/[\s_\-]/g, '');
  if (['psp', 'playstationportable'].includes(n)) return 'PlayStation Portable';
  if (['ps1', 'psx', 'playstation', 'playstation1'].includes(n)) return 'PlayStation 1';
  if (['n64', 'nintendo64'].includes(n)) return 'Nintendo 64';
  if (['snes', 'supernintendo', 'supernes'].includes(n)) return 'Super Nintendo';
  if (['nes', 'nintendoentertainmentsystem'].includes(n)) return 'Nintendo Entertainment System';
  if (['gba', 'gameboyadvance'].includes(n)) return 'Game Boy Advance';
  if (['arcade', 'mame', 'fbneo'].includes(n)) return 'Arcade';
  return null;
}

export function getConsoleType(fileName: string, parentHint?: string | null): string {
  if (parentHint) return parentHint;
  const ext = getFileExtension(fileName);
  if (['smc', 'sfc'].includes(ext)) return 'Super Nintendo';
  if (ext === 'nes') return 'Nintendo Entertainment System';
  if (ext === 'gba') return 'Game Boy Advance';
  if (['z64', 'n64', 'v64'].includes(ext)) return 'Nintendo 64';
  if (['cso', 'pbp'].includes(ext)) return 'PlayStation Portable';
  if (['bin', 'iso', 'cue', 'chd'].includes(ext)) return 'PlayStation 1';
  return 'Arcade';
}

export function consoleTypeToId(consoleType: string): string {
  if (consoleType === 'Super Nintendo') return 'snes';
  if (consoleType === 'Nintendo Entertainment System') return 'nes';
  if (consoleType === 'Game Boy Advance') return 'gba';
  if (consoleType === 'Nintendo 64') return 'n64';
  if (consoleType === 'PlayStation 1') return 'ps1';
  if (consoleType === 'PlayStation Portable') return 'psp';
  if (consoleType === 'Arcade') return 'arcade';
  return consoleType.toLowerCase().replace(/\s+/g, '');
}

export function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() || '';
}

export function canonicalRomKey(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/\s*[\[(](track|trk)\s*0*\d+[\])]\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function romPreferenceScore(candidate: DriveRomCandidate): number {
  const ext = getFileExtension(candidate.file_name);
  let score = candidate.hasHint ? 100 : 0;
  if (candidate.console_type && candidate.console_type !== 'Arcade') score += 20;
  if (candidate.console_type === 'PlayStation Portable') score += 8;
  if (ext === 'chd' || ext === 'cso') score += 7;
  else if (ext === 'iso' || ext === 'pbp') score += 6;
  else if (ext === 'bin') score += 5;
  else if (ext === 'cue') score += 1;
  else score += 3;
  return score;
}

export function dedupeDriveRomCandidates<T extends DriveRomCandidate>(items: T[]): T[] {
  const byGame = new Map<string, T>();

  for (const item of items) {
    const key = canonicalRomKey(item.file_name);
    const prev = byGame.get(key);

    if (!prev) {
      byGame.set(key, item);
      continue;
    }

    if (prev.hasHint && item.hasHint && prev.console_type && item.console_type && prev.console_type !== item.console_type) {
      byGame.set(`${key}:${item.console_type}`, item);
      continue;
    }

    if (romPreferenceScore(item) > romPreferenceScore(prev)) {
      byGame.set(key, item);
    }
  }

  return [...byGame.values()];
}

export async function listDriveRomFiles(token: string, rootFolderId: string, maxDepth = 4): Promise<DriveRomFile[]> {
  const queue: Array<{ id: string; hint: string | null; depth: number }> = [{ id: rootFolderId, hint: null, depth: 0 }];
  const files: DriveRomFile[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    let pageToken = '';

    do {
      const query = `'${current.id}' in parents and trashed = false`;
      const params = new URLSearchParams({
        q: query,
        fields: 'nextPageToken,files(id,name,mimeType,parents)',
        pageSize: '1000',
      });
      if (pageToken) params.set('pageToken', pageToken);

      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('No se pudo leer Google Drive.');

      const data = await res.json();
      for (const child of data.files || []) {
        if (child.mimeType === DRIVE_FOLDER_MIME) {
          if (current.depth < maxDepth) {
            queue.push({
              id: child.id,
              hint: folderNameToConsole(child.name) || current.hint,
              depth: current.depth + 1,
            });
          }
        } else {
          files.push({ id: child.id, name: child.name, parents: child.parents, parentHint: current.hint });
        }
      }

      pageToken = data.nextPageToken || '';
    } while (pageToken);
  }

  return files;
}