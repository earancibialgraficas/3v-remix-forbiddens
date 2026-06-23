export const LOCAL_LAUNCHER_VERSION = "0.1.17";

export const LOCAL_LAUNCHER_DOWNLOAD_URL = `/desktop/FORBIDDENS_${LOCAL_LAUNCHER_VERSION}_x64-setup.exe`;

export const GITHUB_LAUNCHER_DOWNLOAD_URL =
  `https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/FORBIDDENS_${LOCAL_LAUNCHER_VERSION}_x64-setup.exe`;

export const RECOMMENDED_LAUNCHER_VERSION =
  import.meta.env.VITE_RECOMMENDED_LAUNCHER_VERSION || LOCAL_LAUNCHER_VERSION;

export const LAUNCHER_DOWNLOAD_URL =
  import.meta.env.VITE_LAUNCHER_DOWNLOAD_URL || GITHUB_LAUNCHER_DOWNLOAD_URL;
