export const LAUNCHER_VERSION = "0.1.39";

export const LAUNCHER_LATEST_JSON_URL =
  "https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/latest.json";

export const GITHUB_LAUNCHER_DOWNLOAD_URL =
  `https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/FORBIDDENS_${LAUNCHER_VERSION}_x64-setup.exe`;

export const RECOMMENDED_LAUNCHER_VERSION =
  import.meta.env.VITE_RECOMMENDED_LAUNCHER_VERSION || LAUNCHER_VERSION;

export const LAUNCHER_DOWNLOAD_URL =
  import.meta.env.VITE_LAUNCHER_DOWNLOAD_URL || GITHUB_LAUNCHER_DOWNLOAD_URL;

export async function resolveLatestLauncherDownloadUrl() {
  if (import.meta.env.VITE_LAUNCHER_DOWNLOAD_URL) return LAUNCHER_DOWNLOAD_URL;

  try {
    const response = await fetch(`${LAUNCHER_LATEST_JSON_URL}?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`latest.json ${response.status}`);

    const latest = await response.json();
    const url = latest?.platforms?.["windows-x86_64"]?.url
      || latest?.platforms?.["windows-x86_64-pc-windows-msvc"]?.url;

    return typeof url === "string" && url.startsWith("https://")
      ? url
      : LAUNCHER_DOWNLOAD_URL;
  } catch {
    return LAUNCHER_DOWNLOAD_URL;
  }
}
