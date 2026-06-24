export const LAUNCHER_VERSION = "0.1.18";

export const GITHUB_LAUNCHER_DOWNLOAD_URL =
  `https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/FORBIDDENS_${LAUNCHER_VERSION}_x64-setup.exe`;

export const RECOMMENDED_LAUNCHER_VERSION =
  import.meta.env.VITE_RECOMMENDED_LAUNCHER_VERSION || LAUNCHER_VERSION;

export const LAUNCHER_DOWNLOAD_URL =
  import.meta.env.VITE_LAUNCHER_DOWNLOAD_URL || GITHUB_LAUNCHER_DOWNLOAD_URL;
