export type MusicLibrarySong = {
  id: string;
  title: string;
  url: string;
  type: "local";
  category: string;
};

type MusicFolder = {
  path: string;
  name: string;
};

type ManifestFile =
  | string
  | {
      id?: string;
      name?: string;
      title?: string;
      path?: string;
      url?: string;
      category?: string;
    };

type ManifestFolder = {
  path: string;
  name?: string;
  files?: ManifestFile[];
};

type ManifestSong = {
  id?: string;
  title?: string;
  name?: string;
  path?: string;
  file?: string;
  url?: string;
  category?: string;
};

type MusicManifest =
  | ManifestSong[]
  | {
      baseUrl?: string;
      songs?: ManifestSong[];
      folders?: ManifestFolder[];
    };

export const MUSIC_LIBRARY_FOLDERS: MusicFolder[] = [
  { path: "Lofi Hip Hop zelda", name: "Lofi Hip-Hop" },
  { path: "metal", name: "Metal" },
  { path: "Rap", name: "Rap" },
];

const DEFAULT_R2_MUSIC_MANIFEST_URL =
  "/chillmusicplayer-manifest.json";

const playableAudioPattern = /\.(mp3|m4a|aac|ogg|oga|wav|flac|webm)$/i;

const stripSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

const encodePath = (path: string) =>
  stripSlashes(path)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const songTitleFromPath = (path: string) => {
  const fileName = path.split("/").pop() || path;
  return fileName.replace(/\.[^/.]+$/, "");
};

const isPlayableAudioFile = (path: string) => playableAudioPattern.test(path);

const resolveMusicUrl = (baseUrl: string, pathOrUrl: string) => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${baseUrl.replace(/\/+$/g, "")}/${encodePath(pathOrUrl)}`;
};

const normalizeManifestSong = (
  entry: ManifestSong,
  baseUrl: string,
  fallbackCategory: string,
  index: number,
): MusicLibrarySong | null => {
  const pathOrUrl = entry.url || entry.path || entry.file || entry.name;
  if (!pathOrUrl || !isPlayableAudioFile(pathOrUrl)) return null;
  const category = entry.category || fallbackCategory;

  return {
    id: entry.id || `${category}:${pathOrUrl}:${index}`,
    title: entry.title || songTitleFromPath(pathOrUrl),
    url: resolveMusicUrl(baseUrl, pathOrUrl),
    type: "local",
    category,
  };
};

const normalizeFolderFile = (
  file: ManifestFile,
  folder: ManifestFolder,
  baseUrl: string,
  index: number,
): MusicLibrarySong | null => {
  const folderName =
    folder.name ||
    MUSIC_LIBRARY_FOLDERS.find((knownFolder) => knownFolder.path === folder.path)?.name ||
    folder.path;
  const filePath =
    typeof file === "string"
      ? file
      : file.url || file.path || file.name || "";
  const relativePath = /^https?:\/\//i.test(filePath)
    ? filePath
    : `${stripSlashes(folder.path)}/${stripSlashes(filePath)}`;
  if (!relativePath || !isPlayableAudioFile(relativePath)) return null;

  return {
    id: typeof file === "string" ? `${folder.path}:${file}:${index}` : file.id || `${folder.path}:${filePath}:${index}`,
    title: typeof file === "string" ? songTitleFromPath(file) : file.title || songTitleFromPath(filePath),
    url: resolveMusicUrl(baseUrl, relativePath),
    type: "local",
    category: typeof file === "string" ? folderName : file.category || folderName,
  };
};

const manifestBaseUrlFrom = (manifestUrl: string) => manifestUrl.replace(/\/[^/]*$/, "");

const loadR2MusicLibrary = async (): Promise<MusicLibrarySong[]> => {
  const manifestUrl = import.meta.env.VITE_MUSIC_LIBRARY_MANIFEST_URL || DEFAULT_R2_MUSIC_MANIFEST_URL;
  if (!manifestUrl) return [];

  const response = await fetch(manifestUrl, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Music manifest failed with ${response.status}`);
  }

  const manifest = (await response.json()) as MusicManifest;
  const baseUrl =
    (!Array.isArray(manifest) && manifest.baseUrl) ||
    import.meta.env.VITE_MUSIC_LIBRARY_BASE_URL ||
    manifestBaseUrlFrom(manifestUrl);

  const songs: MusicLibrarySong[] = [];
  const directSongs = Array.isArray(manifest) ? manifest : manifest.songs || [];
  directSongs.forEach((entry, index) => {
    const song = normalizeManifestSong(entry, baseUrl, entry.category || "Todos", index);
    if (song) songs.push(song);
  });

  if (!Array.isArray(manifest)) {
    (manifest.folders || []).forEach((folder) => {
      (folder.files || []).forEach((file, index) => {
        const song = normalizeFolderFile(file, folder, baseUrl, index);
        if (song) songs.push(song);
      });
    });
  }

  return songs;
};

export const loadMusicLibrary = async (): Promise<MusicLibrarySong[]> => {
  try {
    return await loadR2MusicLibrary();
  } catch (error) {
    console.warn("No se pudo cargar la musica desde R2.", error);
    return [];
  }
};
