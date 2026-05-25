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
  launcherInfo?: () => Promise<{ version: string; website_url: string }>;
  openExternal?: (url: string) => Promise<boolean>;
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

const buildBridgeFromTauri = (): LauncherBridge | null => {
  if (typeof window === "undefined") return null;
  const invoke = (window as any).__TAURI__?.core?.invoke;
  if (typeof invoke !== "function") return null;

  const bridge: LauncherBridge = {
    launcherInfo: () => invoke("launcher_info"),
    openExternal: async (url: string) => {
      await invoke("open_external_url", { url });
      return true;
    },
    checkUpdate: () => invoke("check_launcher_update"),
    restartLauncher: () => invoke("restart_launcher"),
    nativeEngineStatus: (consoleId: string) => invoke("native_engine_status", { consoleId }),
    installNativeEngine: (consoleId: string) => invoke("install_native_engine", { consoleId }),
    pickNativeRom: (consoleId: string) => invoke("pick_native_rom", { consoleId }),
    openNativeEmulator: (consoleId: string, romPath?: string | null) => invoke("open_native_emulator", { consoleId, romPath: romPath || null }),
    openDriveRomNative: (args) => invoke("open_drive_rom_native", args || {}),
  };

  (window as any).forbiddensLauncher = bridge;
  return bridge;
};

export const getLauncherBridge = (): LauncherBridge | null => {
  if (typeof window === "undefined") return null;
  return ((window as any).forbiddensLauncher || buildBridgeFromTauri()) as LauncherBridge | null;
};

export const isForbiddensLauncher = () => Boolean(getLauncherBridge());

export const launcherSupportsNative = (consoleId: string) => {
  const supported = new Set(["psp", "ps2", "ps1", "ds", "nes", "snes", "gba", "gbc", "sega", "n64", "arcade"]);
  return isForbiddensLauncher() && supported.has(consoleId);
};
