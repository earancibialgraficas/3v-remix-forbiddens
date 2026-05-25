export interface NativeEngineStatus {
  console_id: string;
  engine_name: string;
  native_supported: boolean;
  install_supported: boolean;
  installed: boolean;
  executable_path?: string | null;
  install_dir: string;
  package_url: string;
  download_page: string;
}

type LauncherBridge = {
  checkUpdate?: () => Promise<string>;
  restartLauncher?: () => Promise<void>;
  nativeEngineStatus?: (consoleId: string) => Promise<NativeEngineStatus>;
  installNativeEngine?: (consoleId: string) => Promise<NativeEngineStatus>;
  pickNativeRom?: (consoleId: string) => Promise<string | null>;
  openNativeEmulator?: (consoleId: string, romPath?: string | null) => Promise<string>;
  openDriveRomNative?: (args: {
    consoleId: string;
    fileId: string;
    fileName: string;
    accessToken: string;
  }) => Promise<string>;
};

export const getLauncherBridge = (): LauncherBridge | null => {
  if (typeof window === "undefined") return null;
  return ((window as any).forbiddensLauncher || null) as LauncherBridge | null;
};

export const isForbiddensLauncher = () => Boolean(getLauncherBridge());

export const launcherSupportsNative = (consoleId: string) => {
  const supported = new Set(["psp", "ps2", "ps1", "ds", "nes", "snes", "gba", "gbc", "sega", "n64", "arcade"]);
  return isForbiddensLauncher() && supported.has(consoleId);
};
