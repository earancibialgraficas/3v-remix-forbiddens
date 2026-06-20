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

export interface NativeEmulatorLaunchResult {
  console_id: string;
  rom_path?: string | null;
  engine_path: string;
  process_id: number;
}

export interface NativeBiosStatus {
  console_id: string;
  required: boolean;
  configured: boolean;
  bios_dir: string;
  selected_bios?: string | null;
  bioses?: Array<{
    file_name: string;
    region: string;
    description: string;
    size: number;
    selected: boolean;
  }>;
}

type LauncherBridge = {
  launcherInfo?: () => Promise<{ version: string; website_url: string }>;
  openExternal?: (url: string) => Promise<boolean>;
  checkUpdate?: () => Promise<string>;
  restartLauncher?: () => Promise<void>;
  startLauncherDrag?: () => Promise<void>;
  launcherWindowAction?: (action: "minimize" | "toggle_maximize" | "maximize" | "close") => Promise<void>;
  nativeEngineStatus?: (consoleId: string) => Promise<NativeEngineStatus>;
  installNativeEngine?: (consoleId: string) => Promise<NativeEngineStatus>;
  nativeBiosStatus?: (consoleId: string) => Promise<NativeBiosStatus>;
  importNativeBios?: (consoleId: string) => Promise<NativeBiosStatus | null>;
  importNativeBiosFolder?: (consoleId: string) => Promise<NativeBiosStatus | null>;
  selectNativeBios?: (consoleId: string, fileName: string) => Promise<NativeBiosStatus>;
  pickNativeRom?: (consoleId: string) => Promise<string | null>;
  openNativeEmulator?: (consoleId: string, romPath?: string | null) => Promise<NativeEmulatorLaunchResult | string>;
  closeNativeEmulator?: (processId: number) => Promise<void>;
  setNativeEmulatorState?: (processId: number, action: "minimize" | "restore" | "show" | "maximize") => Promise<void>;
  openDriveRomNative?: (args: {
    consoleId: string;
    fileId: string;
    fileName: string;
    accessToken: string;
  }) => Promise<NativeEmulatorLaunchResult | string>;
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
    startLauncherDrag: () => invoke("start_launcher_drag"),
    launcherWindowAction: (action: "minimize" | "toggle_maximize" | "maximize" | "close") => invoke("launcher_window_action", { action }),
    nativeEngineStatus: (consoleId: string) => invoke("native_engine_status", { consoleId }),
    installNativeEngine: (consoleId: string) => invoke("install_native_engine", { consoleId }),
    nativeBiosStatus: (consoleId: string) => invoke("native_bios_status", { consoleId }),
    importNativeBios: (consoleId: string) => invoke("import_native_bios", { consoleId }),
    importNativeBiosFolder: (consoleId: string) => invoke("import_native_bios_folder", { consoleId }),
    selectNativeBios: (consoleId: string, fileName: string) => invoke("select_native_bios", { consoleId, fileName }),
    pickNativeRom: (consoleId: string) => invoke("pick_native_rom", { consoleId }),
    openNativeEmulator: (consoleId: string, romPath?: string | null) => invoke("open_native_emulator", { consoleId, romPath: romPath || null }),
    closeNativeEmulator: (processId: number) => invoke("close_native_emulator", { processId }),
    setNativeEmulatorState: (processId: number, action: "minimize" | "restore" | "show" | "maximize") => invoke("set_native_emulator_state", { processId, action }),
    openDriveRomNative: (args) => invoke("open_drive_rom_native", args || {}),
  };

  (window as any).forbiddensLauncher = bridge;
  return bridge;
};

export const getLauncherBridge = (): LauncherBridge | null => {
  if (typeof window === "undefined") return null;
  return ((window as any).forbiddensLauncher || buildBridgeFromTauri()) as LauncherBridge | null;
};

export const formatLauncherBridgeError = (error: any, fallback: string) => {
  const message = error?.message || String(error || "");
  if (/not allowed by ACL/i.test(message)) {
    return "Tu FORBIDDENS Launcher instalado esta desactualizado o no tiene permisos para esta accion. Instala la version nueva del launcher y vuelve a abrirlo.";
  }
  return message || fallback;
};

export const isForbiddensLauncher = () => Boolean(getLauncherBridge());

export const launcherSupportsNative = (consoleId: string) => {
  const supported = new Set(["psp", "ps2", "ps1", "ds", "nes", "snes", "gba", "gbc", "sega", "n64", "arcade"]);
  return isForbiddensLauncher() && supported.has(consoleId);
};
