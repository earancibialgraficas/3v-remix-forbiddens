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

export interface NativeSaveFilePayload {
  console_id: string;
  kind: "savestate" | "real_save";
  path: string;
  data: string;
  size: number;
}

export interface NativeDownloadJob {
  job_id: string;
  console_id: string;
  game_id: string;
  file_name: string;
  rom_path: string;
  cached: boolean;
}

export interface NativeDownloadProgressEvent {
  job_id: string;
  console_id: string;
  game_id: string;
  file_name: string;
  rom_path: string;
  status: "downloading" | "completed" | "error";
  progress: number;
  downloaded: number;
  total: number;
  error?: string | null;
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
  reinstallNativeEngine?: (consoleId: string) => Promise<NativeEngineStatus>;
  nativeBiosStatus?: (consoleId: string) => Promise<NativeBiosStatus>;
  importNativeBios?: (consoleId: string) => Promise<NativeBiosStatus | null>;
  importNativeBiosFolder?: (consoleId: string) => Promise<NativeBiosStatus | null>;
  selectNativeBios?: (consoleId: string, fileName: string) => Promise<NativeBiosStatus>;
  pickNativeRom?: (consoleId: string) => Promise<string | null>;
  openNativeEmulator?: (consoleId: string, romPath?: string | null) => Promise<NativeEmulatorLaunchResult | string>;
  closeNativeEmulator?: (processId: number) => Promise<void>;
  setNativeEmulatorState?: (processId: number, action: "minimize" | "restore" | "show" | "maximize") => Promise<void>;
  nativeEmulatorAction?: (processId: number, action: "menu" | "save_state" | "load_state" | "pause_toggle") => Promise<void>;
  readNativeSaveFile?: (args: {
    consoleId: string;
    romPath: string;
    kind?: "savestate" | "real_save" | null;
  }) => Promise<NativeSaveFilePayload | null>;
  writeNativeSaveFile?: (args: {
    consoleId: string;
    romPath: string;
    kind?: "savestate" | "real_save" | null;
    data: string;
  }) => Promise<string | null>;
  exportNativeLocalSave?: (args: {
    consoleId: string;
    gameName: string;
  }) => Promise<string | null>;
  importNativeLocalSave?: (args: {
    consoleId: string;
  }) => Promise<string | null>;
  startDriveRomDownloadForNative?: (args: {
    consoleId: string;
    fileId: string;
    fileName: string;
    accessToken: string;
  }) => Promise<NativeDownloadJob>;
  startRemoteRomDownloadForNative?: (args: {
    consoleId: string;
    gameId: string;
    fileName: string;
    romUrl: string;
  }) => Promise<NativeDownloadJob>;
  downloadRemoteRomForNative?: (args: {
    consoleId: string;
    gameId: string;
    fileName: string;
    romUrl: string;
  }) => Promise<string>;
  openDriveRomNative?: (args: {
    consoleId: string;
    fileId: string;
    fileName: string;
    accessToken: string;
  }) => Promise<NativeEmulatorLaunchResult | string>;
  openRemoteRomNative?: (args: {
    consoleId: string;
    gameId: string;
    fileName: string;
    romUrl: string;
  }) => Promise<NativeEmulatorLaunchResult | string>;
  downloadDriveRomForNative?: (args: {
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
      const href = new URL(String(url || ""), window.location.href).href;
      await invoke("open_external_url", { url: href });
      return true;
    },
    checkUpdate: () => invoke("check_launcher_update"),
    restartLauncher: () => invoke("restart_launcher"),
    startLauncherDrag: () => invoke("start_launcher_drag"),
    launcherWindowAction: (action: "minimize" | "toggle_maximize" | "maximize" | "close") => invoke("launcher_window_action", { action }),
    nativeEngineStatus: (consoleId: string) => invoke("native_engine_status", { consoleId }),
    installNativeEngine: (consoleId: string) => invoke("install_native_engine", { consoleId }),
    reinstallNativeEngine: (consoleId: string) => invoke("reinstall_native_engine", { consoleId }),
    nativeBiosStatus: (consoleId: string) => invoke("native_bios_status", { consoleId }),
    importNativeBios: (consoleId: string) => invoke("import_native_bios", { consoleId }),
    importNativeBiosFolder: (consoleId: string) => invoke("import_native_bios_folder", { consoleId }),
    selectNativeBios: (consoleId: string, fileName: string) => invoke("select_native_bios", { consoleId, fileName }),
    pickNativeRom: (consoleId: string) => invoke("pick_native_rom", { consoleId }),
    openNativeEmulator: (consoleId: string, romPath?: string | null) => invoke("open_native_emulator", { consoleId, romPath: romPath || null }),
    closeNativeEmulator: (processId: number) => invoke("close_native_emulator", { processId }),
    setNativeEmulatorState: (processId: number, action: "minimize" | "restore" | "show" | "maximize") => invoke("set_native_emulator_state", { processId, action }),
    nativeEmulatorAction: (processId: number, action: "menu" | "save_state" | "load_state" | "pause_toggle") => invoke("native_emulator_action", { processId, action }),
    readNativeSaveFile: (args) => invoke("read_native_save_file", args || {}),
    writeNativeSaveFile: (args) => invoke("write_native_save_file", args || {}),
    exportNativeLocalSave: (args) => invoke("export_native_local_save", args || {}),
    importNativeLocalSave: (args) => invoke("import_native_local_save", args || {}),
    startDriveRomDownloadForNative: (args) => invoke("start_drive_rom_download_for_native", args || {}),
    startRemoteRomDownloadForNative: (args) => invoke("start_remote_rom_download_for_native", args || {}),
    downloadRemoteRomForNative: (args) => invoke("download_remote_rom_for_native", args || {}),
    openDriveRomNative: (args) => invoke("open_drive_rom_native", args || {}),
    openRemoteRomNative: (args) => invoke("open_remote_rom_native", args || {}),
    downloadDriveRomForNative: (args) => invoke("download_drive_rom_for_native", args || {}),
  };

  (window as any).forbiddensLauncher = bridge;
  return bridge;
};

export const getLauncherBridge = (): LauncherBridge | null => {
  if (typeof window === "undefined") return null;
  const existing = (window as any).forbiddensLauncher as LauncherBridge | undefined;
  const hasTauriInvoke = typeof (window as any).__TAURI__?.core?.invoke === "function";
  const missingNativeApi = Boolean(
    hasTauriInvoke &&
      existing &&
      (!existing.openNativeEmulator ||
        !existing.nativeEmulatorAction ||
        !existing.startDriveRomDownloadForNative ||
        !existing.startRemoteRomDownloadForNative),
  );

  if (!existing || missingNativeApi) {
    return buildBridgeFromTauri();
  }
  return existing;
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
