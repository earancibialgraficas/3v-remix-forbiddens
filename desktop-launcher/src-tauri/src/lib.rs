use std::{
    env, fs,
    io::{self, BufRead, BufReader},
    net::UdpSocket,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::atomic::{AtomicU32, Ordering},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize)]
struct LauncherInfo {
    version: String,
    website_url: String,
}

#[derive(Clone)]
struct NativeEngineConfig {
    console_id: &'static str,
    engine_name: &'static str,
    package_urls: &'static [&'static str],
    package_file_name: &'static str,
    package_sha256: &'static str,
    executable_rel: &'static str,
    download_page: &'static str,
}

#[derive(Serialize)]
struct NativeEngineStatus {
    console_id: String,
    engine_name: String,
    native_supported: bool,
    install_supported: bool,
    installed: bool,
    executable_path: Option<String>,
    install_dir: String,
    package_url: String,
    download_page: String,
}

#[derive(Serialize, Clone)]
struct NativeBiosEntry {
    file_name: String,
    region: String,
    description: String,
    size: u64,
    selected: bool,
}

#[derive(Serialize)]
struct NativeBiosStatus {
    console_id: String,
    required: bool,
    configured: bool,
    bios_dir: String,
    selected_bios: Option<String>,
    bioses: Vec<NativeBiosEntry>,
}

#[derive(Serialize, Clone)]
struct NativeEmulatorExitEvent {
    console_id: String,
    rom_path: Option<String>,
    engine_path: String,
    process_id: u32,
    success: bool,
}

#[derive(Serialize, Clone)]
struct NativeEmulatorLaunchResult {
    console_id: String,
    rom_path: Option<String>,
    engine_path: String,
    process_id: u32,
}

#[derive(Serialize, Clone)]
struct NativeEmulatorWindowStateEvent {
    console_id: String,
    rom_path: Option<String>,
    process_id: u32,
    state: String,
}

#[derive(Serialize, Clone)]
struct LauncherWindowStateEvent {
    state: String,
}

#[derive(Serialize)]
struct NativeSaveFilePayload {
    console_id: String,
    kind: String,
    path: String,
    data: String,
    size: u64,
}

#[derive(Serialize, Clone)]
struct NativeDownloadJob {
    job_id: String,
    console_id: String,
    game_id: String,
    file_name: String,
    rom_path: String,
    cached: bool,
}

#[derive(Serialize, Clone)]
struct NativeDownloadProgressEvent {
    job_id: String,
    console_id: String,
    game_id: String,
    file_name: String,
    rom_path: String,
    status: String,
    progress: f64,
    downloaded: u64,
    total: u64,
    error: Option<String>,
}

const WEBSITE_URL: &str = "https://forbiddens.net/?launcher_version=0.1.37";
const LAUNCHER_DOWNLOAD_URL: &str = "https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/FORBIDDENS_0.1.37_x64-setup.exe";
static ACTIVE_NATIVE_PROCESS_ID: AtomicU32 = AtomicU32::new(0);
const CREATE_NO_WINDOW: u32 = 0x08000000;
const LAUNCHER_BRIDGE_SCRIPT: &str = r#"
(function () {
  if (window.__FORBIDDENS_LAUNCHER_BRIDGE__) return;
  window.__FORBIDDENS_LAUNCHER_BRIDGE__ = true;

  var invoke = function (cmd, args) {
    if (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke) {
      return window.__TAURI__.core.invoke(cmd, args || {});
    }
    return Promise.reject(new Error("Tauri bridge unavailable"));
  };

  var toAbsoluteUrl = function (url) {
    if (!url) return "";
    try {
      return new URL(String(url), window.location.href).href;
    } catch (_) {
      return String(url || "");
    }
  };

  var normalizeGoogleAuthUrl = function (url) {
    var href = toAbsoluteUrl(url);
    if (!href) return "";
    try {
      var parsed = new URL(href);
      if (/(^|\.)accounts\.google\.com$/.test(parsed.hostname) && /\/o\/oauth2\//.test(parsed.pathname)) {
        parsed.searchParams.set("redirect_uri", "https://forbiddens.net/launcher/drive-sync");
        return parsed.href;
      }
    } catch (_) {}
    return href;
  };

  var openExternal = function (url) {
    var href = normalizeGoogleAuthUrl(url);
    if (!href) return Promise.resolve(false);
    return invoke("open_external_url", { url: href }).then(function () {
      return true;
    }).catch(function (error) {
      console.warn("[FORBIDDENS Launcher] No se pudo abrir fuera del launcher", error);
      return false;
    });
  };

  var isGoogleAuthUrl = function (url) {
    if (!url) return false;
    try {
      var parsed = new URL(String(url), window.location.href);
      return /(^|\.)accounts\.google\.com$/.test(parsed.hostname) ||
        /(^|\.)googleusercontent\.com$/.test(parsed.hostname);
    } catch (_) {
      return String(url || "").indexOf("accounts.google.com") !== -1;
    }
  };

    window.forbiddensLauncher = Object.assign({}, window.forbiddensLauncher || {}, {
    openExternal: openExternal,
    launcherInfo: function () { return invoke("launcher_info"); },
    checkUpdate: function () { return invoke("check_launcher_update"); },
    restartLauncher: function () { return invoke("restart_launcher"); },
    startLauncherDrag: function () { return invoke("start_launcher_drag"); },
    launcherWindowAction: function (action) { return invoke("launcher_window_action", { action: action }); },
    nativeEngineStatus: function (consoleId) { return invoke("native_engine_status", { consoleId: consoleId }); },
    installNativeEngine: function (consoleId) { return invoke("install_native_engine", { consoleId: consoleId }); },
    reinstallNativeEngine: function (consoleId) { return invoke("reinstall_native_engine", { consoleId: consoleId }); },
    nativeBiosStatus: function (consoleId) { return invoke("native_bios_status", { consoleId: consoleId }); },
    importNativeBios: function (consoleId) { return invoke("import_native_bios", { consoleId: consoleId }); },
    importNativeBiosFolder: function (consoleId) { return invoke("import_native_bios_folder", { consoleId: consoleId }); },
    selectNativeBios: function (consoleId, fileName) { return invoke("select_native_bios", { consoleId: consoleId, fileName: fileName }); },
    pickNativeRom: function (consoleId) { return invoke("pick_native_rom", { consoleId: consoleId }); },
    openNativeEmulator: function (consoleId, romPath) { return invoke("open_native_emulator", { consoleId: consoleId, romPath: romPath || null }); },
    closeNativeEmulator: function (processId) { return invoke("close_native_emulator", { processId: processId }); },
    setNativeEmulatorState: function (processId, action) { return invoke("set_native_emulator_state", { processId: processId, action: action }); },
    nativeEmulatorAction: function (processId, action) { return invoke("native_emulator_action", { processId: processId, action: action }); },
    setNativeEmulatorVolume: function (processId, volume) { return invoke("set_native_emulator_volume", { processId: processId, volume: volume }); },
    syncNativeCompanionLayout: function (processId) { return invoke("sync_native_companion_layout", { processId: processId }); },
    readNativeSaveFile: function (args) { return invoke("read_native_save_file", args || {}); },
    writeNativeSaveFile: function (args) { return invoke("write_native_save_file", args || {}); },
    exportNativeLocalSave: function (args) { return invoke("export_native_local_save", args || {}); },
    importNativeLocalSave: function (args) { return invoke("import_native_local_save", args || {}); },
    startDriveRomDownloadForNative: function (args) { return invoke("start_drive_rom_download_for_native", args || {}); },
    startRemoteRomDownloadForNative: function (args) { return invoke("start_remote_rom_download_for_native", args || {}); },
    downloadRemoteRomForNative: function (args) { return invoke("download_remote_rom_for_native", args || {}); },
    downloadDriveRomForNative: function (args) { return invoke("download_drive_rom_for_native", args || {}); },
    openDriveRomNative: function (args) { return invoke("open_drive_rom_native", args || {}); },
    openRemoteRomNative: function (args) { return invoke("open_remote_rom_native", args || {}); },
    detectPpsspp: function () { return invoke("detect_ppsspp_native"); },
    openPpsspp: function (romPath) {
      return invoke("open_native_emulator", { consoleId: "psp", romPath: romPath || null });
    }
  });

  var nativeOpen = window.open ? window.open.bind(window) : null;
  window.open = function (url, target, features) {
    var targetName = String(target || "_blank").toLowerCase();
    if (targetName === "_blank" || targetName === "blank" || !target) {
      if (!url && nativeOpen) {
        return nativeOpen(url || "about:blank", target || "_blank", features);
      }
      var proxy = {
        closed: false,
        focus: function () {},
        close: function () { this.closed = true; },
        document: {
          write: function () {},
          close: function () {}
        },
        location: {
          replace: function (nextUrl) {
            proxy.closed = true;
            openExternal(nextUrl);
          },
          assign: function (nextUrl) {
            proxy.closed = true;
            openExternal(nextUrl);
          }
        }
      };
      Object.defineProperty(proxy.location, "href", {
        set: function (nextUrl) {
          proxy.closed = true;
          openExternal(nextUrl);
        }
      });
      if (url) {
        proxy.closed = true;
        openExternal(url);
      }
      return proxy;
    }
    return nativeOpen ? nativeOpen(url, target, features) : null;
  };

  document.addEventListener("click", function (event) {
    var target = event.target;
    var anchor = target && target.closest ? target.closest("a[href]") : null;
    if (!anchor) return;
    var isBlank = String(anchor.target || "").toLowerCase() === "_blank";
    var modified = event.ctrlKey || event.metaKey || event.shiftKey;
    if (isBlank || modified) {
      event.preventDefault();
      openExternal(anchor.getAttribute("href") || "");
    }
  }, true);
})();
"#;

#[tauri::command]
fn launcher_info() -> LauncherInfo {
    LauncherInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        website_url: WEBSITE_URL.to_string(),
    }
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    let allowed = trimmed.starts_with("https://")
        || trimmed.starts_with("http://")
        || trimmed.starts_with("mailto:")
        || trimmed.starts_with("tel:");

    if !allowed {
        return Err("URL externa no permitida.".to_string());
    }

    tauri_plugin_opener::open_url(trimmed, None::<&str>).map_err(|error| error.to_string())
}

#[tauri::command]
async fn check_launcher_update(app: AppHandle) -> Result<String, String> {
    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(Some(update)) => {
                let version = update.version.clone();
                if let Err(error) = update
                    .download_and_install(|_, _| {}, || {})
                    .await
                {
                    let _ = tauri_plugin_opener::open_url(LAUNCHER_DOWNLOAD_URL, None::<&str>);
                    return Ok(format!("manual-download:{}", error));
                }
                Ok(format!("installed:{version}"))
            }
            Ok(None) => Ok("up-to-date".to_string()),
            Err(error) => {
                let _ = tauri_plugin_opener::open_url(LAUNCHER_DOWNLOAD_URL, None::<&str>);
                Ok(format!("manual-download:{}", error))
            }
        },
        Err(error) => {
            let _ = tauri_plugin_opener::open_url(LAUNCHER_DOWNLOAD_URL, None::<&str>);
            Ok(format!("manual-download:{}", error))
        }
    }
}

#[tauri::command]
fn restart_launcher(app: AppHandle) {
    app.restart();
}

#[tauri::command]
fn start_launcher_drag(app: AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("No se encontro la ventana principal.".to_string());
    };

    window.start_dragging().map_err(|error| error.to_string())
}

#[tauri::command]
fn launcher_window_action(app: AppHandle, action: String) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("No se encontro la ventana principal.".to_string());
    };

    match action.trim().to_lowercase().as_str() {
        "minimize" => window.minimize().map_err(|error| error.to_string()),
        "restore" | "show" => {
            let _ = window.unminimize();
            window.set_focus().map_err(|error| error.to_string())
        }
        "toggle_maximize" | "maximize" => {
            if window.is_maximized().map_err(|error| error.to_string())? {
                window.unmaximize().map_err(|error| error.to_string())
            } else {
                window.maximize().map_err(|error| error.to_string())
            }
        }
        "close" => window.close().map_err(|error| error.to_string()),
        _ => Err("Accion de ventana no soportada.".to_string()),
    }
}

fn monitor_launcher_window_state(app: AppHandle) {
    thread::spawn(move || {
        let mut last_minimized: Option<bool> = None;
        loop {
            thread::sleep(Duration::from_millis(450));
            let Some(window) = app.get_webview_window("main") else {
                break;
            };
            let Ok(is_minimized) = window.is_minimized() else {
                continue;
            };
            if last_minimized == Some(is_minimized) {
                continue;
            }
            last_minimized = Some(is_minimized);
            let state = if is_minimized { "minimized" } else { "restored" };
            let process_id = ACTIVE_NATIVE_PROCESS_ID.load(Ordering::SeqCst);
            if process_id != 0 {
                let action = if is_minimized { "minimize" } else { "restore" };
                let _ = set_native_emulator_state(process_id, action.to_string());
            }
            let _ = app.emit(
                "forbiddens-launcher-window-state",
                LauncherWindowStateEvent {
                    state: state.to_string(),
                },
            );
        }
    });
}

fn check_update_on_start(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let Ok(updater) = app.updater() else {
            return;
        };

        let Ok(Some(update)) = updater.check().await else {
            return;
        };

        let install_result = update.download_and_install(|_, _| {}, || {}).await;
        if install_result.is_ok() {
            let _ = app
                .dialog()
                .message("Hay una actualizacion lista. La app se reiniciara para aplicarla.")
                .title("FORBIDDENS Launcher")
                .blocking_show();
            app.restart();
        }
    });
}

fn native_engine_configs() -> Vec<NativeEngineConfig> {
    const PCSX2_PACKAGE_URLS: &[&str] = &[
        concat!(
            "https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/",
            "pcsx2-v2.6.3-windows-x64-Qt.zip"
        ),
    ];
    const DUCKSTATION_PACKAGE_URLS: &[&str] = &[
        concat!(
            "https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/",
            "duckstation-windows-x64-release.zip"
        ),
    ];
    const RETROARCH_PACKAGE_URLS: &[&str] = &[
        concat!(
            "https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/",
            "RetroArch-Win64.zip"
        ),
    ];

    vec![
        NativeEngineConfig {
            console_id: "psp",
            engine_name: "PPSSPP",
            package_urls: &[concat!(
                "https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/",
                "ppsspp_win.zip"
            )],
            package_file_name: "ppsspp_win.zip",
            package_sha256: "a60f04ebdb0b5f1655422bd7f88349a46999b17ad5115d6ddb290c3934bd5163",
            executable_rel: "PPSSPPWindows64.exe",
            download_page: "https://www.ppsspp.org/download/",
        },
        NativeEngineConfig {
            console_id: "ps2",
            engine_name: "PCSX2",
            package_urls: PCSX2_PACKAGE_URLS,
            package_file_name: "pcsx2-v2.6.3-windows-x64-Qt.zip",
            package_sha256: "6d666a18011878faf422934a1e0d7307110f7e57a3d4e4dbfe5a6127cce7514d",
            executable_rel: "pcsx2-qt.exe",
            download_page: "https://pcsx2.net/downloads/",
        },
        NativeEngineConfig {
            console_id: "ps1",
            engine_name: "DuckStation",
            package_urls: DUCKSTATION_PACKAGE_URLS,
            package_file_name: "duckstation-windows-x64-release.zip",
            package_sha256: "a8a61c8f9c783ea5737a297f2a3d1470ca3597a6ddcb67b0d7410306c1d9e59e",
            executable_rel: "duckstation-qt-x64-ReleaseLTCG.exe",
            download_page: "https://www.duckstation.org/",
        },
        NativeEngineConfig {
            console_id: "ds",
            engine_name: "melonDS",
            package_urls: &[concat!(
                "https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/",
                "melonDS_0.9.5_win_x64.zip"
            )],
            package_file_name: "melonDS_0.9.5_win_x64.zip",
            package_sha256: "289b1644004d8762987dc1daf3a61eedfafb0a5f442801bfb9d2a18299fd39a9",
            executable_rel: "melonDS.exe",
            download_page: "https://melonds.kuribo64.net/downloads.php",
        },
        NativeEngineConfig {
            console_id: "nes",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch-Win64.zip",
            package_sha256: "45341b02820cb7df45ddc48a7f325b9dea6bf3f30d10f88f805e34810eb49f6a",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "snes",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch-Win64.zip",
            package_sha256: "45341b02820cb7df45ddc48a7f325b9dea6bf3f30d10f88f805e34810eb49f6a",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "gba",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch-Win64.zip",
            package_sha256: "45341b02820cb7df45ddc48a7f325b9dea6bf3f30d10f88f805e34810eb49f6a",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "gbc",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch-Win64.zip",
            package_sha256: "45341b02820cb7df45ddc48a7f325b9dea6bf3f30d10f88f805e34810eb49f6a",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "sega",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch-Win64.zip",
            package_sha256: "45341b02820cb7df45ddc48a7f325b9dea6bf3f30d10f88f805e34810eb49f6a",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "n64",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch-Win64.zip",
            package_sha256: "45341b02820cb7df45ddc48a7f325b9dea6bf3f30d10f88f805e34810eb49f6a",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "arcade",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch-Win64.zip",
            package_sha256: "45341b02820cb7df45ddc48a7f325b9dea6bf3f30d10f88f805e34810eb49f6a",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
    ]
}

fn get_engine_config(console_id: &str) -> Option<NativeEngineConfig> {
    native_engine_configs()
        .into_iter()
        .find(|config| config.console_id == console_id.trim().to_lowercase())
}

fn console_extensions(console_id: &str) -> &'static [&'static str] {
    match console_id {
        "psp" => &["iso", "cso", "pbp", "chd"],
        "ps2" => &["iso", "cso", "chd", "isz", "bin", "elf"],
        "ps1" => &["iso", "bin", "cue", "chd"],
        "n64" => &["n64", "z64", "v64"],
        "ds" => &["nds", "zip"],
        "gba" => &["gba", "zip"],
        "snes" => &["sfc", "smc", "zip"],
        "nes" => &["nes", "zip"],
        "gbc" => &["gb", "gbc", "zip"],
        "sega" => &["md", "smd", "gen", "bin", "zip"],
        "arcade" => &["zip", "7z"],
        _ => &["iso", "bin", "zip", "rom"],
    }
}

fn local_app_data_dir() -> PathBuf {
    env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
        .join("FORBIDDENS")
}

fn engine_install_dir(config: &NativeEngineConfig) -> PathBuf {
    local_app_data_dir()
        .join("engines")
        .join(config.console_id)
        .join(config.engine_name.to_lowercase())
}

fn native_bios_dir(console_id: &str) -> PathBuf {
    get_engine_config(console_id)
        .and_then(|config| find_native_engine(&config))
        .and_then(|path| path.parent().map(|parent| parent.join("bios")))
        .unwrap_or_else(|| local_app_data_dir().join("bios").join(console_id))
}

fn is_valid_ps2_bios(path: &Path) -> bool {
    let valid_extension = path
        .extension()
        .map(|ext| matches!(ext.to_string_lossy().to_lowercase().as_str(), "bin" | "rom"))
        .unwrap_or(false);
    let valid_size = fs::metadata(path)
        .map(|metadata| (512 * 1024..=16 * 1024 * 1024).contains(&metadata.len()))
        .unwrap_or(false);
    path.is_file() && valid_extension && valid_size
}

fn detect_bios_region(file_name: &str) -> (String, String) {
    let name = file_name.to_lowercase().replace(['-', '.', '_'], " ");
    let compact = name.replace(' ', "");
    let detected = if name.contains("europe") || name.contains("eur") || name.contains(" pal") || compact.contains("scph39004") {
        ("Europa", "PAL")
    } else if name.contains("japan") || name.contains("jap") || name.contains("ntsc j") || compact.contains("scph39000") {
        ("Japon", "NTSC-J")
    } else if name.contains("china") || name.contains(" chn") || compact.contains("scph39009") {
        ("China", "NTSC-C")
    } else if name.contains("usa") || name.contains("america") || name.contains("ntsc u") || compact.contains("scph39001") {
        ("USA", "NTSC-U")
    } else {
        ("Desconocida", "Region sin identificar")
    };
    (detected.0.to_string(), detected.1.to_string())
}

fn pcsx2_root() -> Option<PathBuf> {
    get_engine_config("ps2")
        .and_then(|config| find_native_engine(&config))
        .and_then(|path| path.parent().map(Path::to_path_buf))
}

fn pcsx2_ini_path() -> Option<PathBuf> {
    pcsx2_root().map(|root| root.join("inis").join("PCSX2.ini"))
}

fn read_ini_value(path: &Path, section: &str, key: &str) -> Option<String> {
    let content = fs::read_to_string(path).ok()?;
    let mut in_section = false;
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            in_section = &trimmed[1..trimmed.len() - 1] == section;
        } else if in_section {
            if let Some((candidate, value)) = trimmed.split_once('=') {
                if candidate.trim().eq_ignore_ascii_case(key) {
                    let value = value.trim();
                    return (!value.is_empty()).then(|| value.to_string());
                }
            }
        }
    }
    None
}

fn write_ini_value(path: &Path, section: &str, key: &str, value: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let original = fs::read_to_string(path).unwrap_or_default();
    let mut output = Vec::new();
    let mut in_section = false;
    let mut section_found = false;
    let mut key_written = false;

    for line in original.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with('[') && trimmed.ends_with(']') {
            if in_section && !key_written {
                output.push(format!("{key} = {value}"));
                key_written = true;
            }
            in_section = &trimmed[1..trimmed.len() - 1] == section;
            section_found |= in_section;
        }
        if in_section && trimmed.split_once('=').map(|(candidate, _)| candidate.trim().eq_ignore_ascii_case(key)).unwrap_or(false) {
            output.push(format!("{key} = {value}"));
            key_written = true;
        } else {
            output.push(line.to_string());
        }
    }
    if in_section && !key_written {
        output.push(format!("{key} = {value}"));
    }
    if !section_found {
        if !output.is_empty() {
            output.push(String::new());
        }
        output.push(format!("[{section}]"));
        output.push(format!("{key} = {value}"));
    }
    fs::write(path, format!("{}\n", output.join("\n"))).map_err(|error| error.to_string())
}

fn ensure_pcsx2_portable_config() -> Result<PathBuf, String> {
    let root = pcsx2_root().ok_or_else(|| "Instala PCSX2 antes de configurar una BIOS.".to_string())?;
    let marker = root.join("portable.ini");
    if !marker.exists() {
        fs::write(&marker, b"").map_err(|error| error.to_string())?;
    }
    let ini = root.join("inis").join("PCSX2.ini");
    if !ini.exists() {
        let documents_ini = env::var("USERPROFILE")
            .map(PathBuf::from)
            .unwrap_or_default()
            .join("Documents")
            .join("PCSX2")
            .join("inis")
            .join("PCSX2.ini");
        if documents_ini.exists() {
            if let Some(parent) = ini.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            fs::copy(documents_ini, &ini).map_err(|error| error.to_string())?;
        }
    }
    write_ini_value(&ini, "Folders", "Bios", "bios")?;
    write_ini_value(&ini, "UI", "SetupWizardIncomplete", "false")?;
    Ok(ini)
}

fn copy_bios_file(source: &Path, destination_dir: &Path) -> Result<String, String> {
    if !is_valid_ps2_bios(source) {
        return Err("El archivo no tiene un formato o tamano valido para una BIOS de PS2.".to_string());
    }
    fs::create_dir_all(destination_dir).map_err(|error| error.to_string())?;
    let file_name = source.file_name().and_then(|name| name.to_str()).ok_or_else(|| "La BIOS no tiene un nombre valido.".to_string())?;
    let destination = destination_dir.join(file_name);
    if source.canonicalize().ok() != destination.canonicalize().ok() {
        fs::copy(source, &destination).map_err(|error| error.to_string())?;
    }
    Ok(file_name.to_string())
}

fn collect_bios_files(root: &Path, depth: usize, output: &mut Vec<PathBuf>) {
    if depth == 0 || !root.is_dir() {
        return;
    }
    let Ok(entries) = fs::read_dir(root) else { return; };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_bios_files(&path, depth - 1, output);
        } else if is_valid_ps2_bios(&path) {
            output.push(path);
        }
    }
}

#[tauri::command]
fn native_bios_status(console_id: String) -> NativeBiosStatus {
    let normalized = console_id.trim().to_lowercase();
    let bios_dir = native_bios_dir(&normalized);
    let selected_bios = pcsx2_ini_path().and_then(|path| read_ini_value(&path, "Filenames", "BIOS"));
    let mut bioses: Vec<NativeBiosEntry> = fs::read_dir(&bios_dir)
        .ok()
        .into_iter()
        .flat_map(|entries| entries.flatten())
        .filter_map(|entry| {
            let path = entry.path();
            if !is_valid_ps2_bios(&path) { return None; }
            let file_name = path.file_name()?.to_string_lossy().to_string();
            let (region, description) = detect_bios_region(&file_name);
            Some(NativeBiosEntry {
                selected: selected_bios.as_deref().map(|selected| selected.eq_ignore_ascii_case(&file_name)).unwrap_or(false),
                size: fs::metadata(&path).map(|metadata| metadata.len()).unwrap_or(0),
                file_name,
                region,
                description,
            })
        })
        .collect();
    bioses.sort_by(|left, right| left.region.cmp(&right.region).then(left.file_name.cmp(&right.file_name)));
    let mut effective_selection = selected_bios.filter(|selected| bioses.iter().any(|bios| bios.file_name.eq_ignore_ascii_case(selected)));
    if normalized == "ps2" && effective_selection.is_none() && !bioses.is_empty() {
        if let Ok(ini) = ensure_pcsx2_portable_config() {
            let automatic = bioses[0].file_name.clone();
            if write_ini_value(&ini, "Filenames", "BIOS", &automatic).is_ok() {
                effective_selection = Some(automatic.clone());
                for bios in &mut bioses {
                    bios.selected = bios.file_name.eq_ignore_ascii_case(&automatic);
                }
            }
        }
    }
    NativeBiosStatus {
        console_id: normalized.clone(),
        required: normalized == "ps2",
        configured: effective_selection.is_some(),
        bios_dir: bios_dir.to_string_lossy().to_string(),
        selected_bios: effective_selection,
        bioses,
    }
}

#[tauri::command]
fn import_native_bios(app: AppHandle, console_id: String) -> Result<Option<NativeBiosStatus>, String> {
    let normalized = console_id.trim().to_lowercase();
    if normalized != "ps2" {
        return Err("La importacion guiada de BIOS solo esta habilitada para PS2.".to_string());
    }
    let Some(engine_config) = get_engine_config(&normalized) else {
        return Err("No se encontro la configuracion del emulador.".to_string());
    };
    let Some(engine_path) = find_native_engine(&engine_config) else {
        return Err("Instala PCSX2 antes de importar la BIOS.".to_string());
    };

    let picked = app
        .dialog()
        .file()
        .add_filter("BIOS de PlayStation 2", &["bin", "rom"])
        .blocking_pick_file();
    let Some(source) = picked.and_then(|file| file.into_path().ok()) else {
        return Ok(None);
    };
    let engine_root = engine_path.parent().ok_or_else(|| "No se encontro la carpeta de PCSX2.".to_string())?;
    let bios_dir = engine_root.join("bios");
    let file_name = copy_bios_file(&source, &bios_dir)?;
    let ini = ensure_pcsx2_portable_config()?;
    write_ini_value(&ini, "Filenames", "BIOS", &file_name)?;
    Ok(Some(native_bios_status(normalized)))
}

#[tauri::command]
fn import_native_bios_folder(app: AppHandle, console_id: String) -> Result<Option<NativeBiosStatus>, String> {
    let normalized = console_id.trim().to_lowercase();
    if normalized != "ps2" {
        return Err("La importacion desde carpeta solo esta habilitada para PS2.".to_string());
    }
    let folder = app.dialog().file().blocking_pick_folder();
    let Some(folder) = folder.and_then(|value| value.into_path().ok()) else { return Ok(None); };
    let bios_dir = native_bios_dir("ps2");
    let mut candidates = Vec::new();
    collect_bios_files(&folder, 6, &mut candidates);
    if candidates.is_empty() {
        return Err("No se encontraron BIOS validas dentro de la carpeta seleccionada.".to_string());
    }
    let mut imported = Vec::new();
    for candidate in candidates {
        if let Ok(file_name) = copy_bios_file(&candidate, &bios_dir) {
            if !imported.contains(&file_name) { imported.push(file_name); }
        }
    }
    if imported.is_empty() {
        return Err("No se pudo importar ninguna BIOS desde esa instalacion de PCSX2.".to_string());
    }
    let ini = ensure_pcsx2_portable_config()?;
    let current = read_ini_value(&ini, "Filenames", "BIOS");
    if current.as_ref().map(|name| bios_dir.join(name).exists()).unwrap_or(false) == false {
        write_ini_value(&ini, "Filenames", "BIOS", &imported[0])?;
    }
    Ok(Some(native_bios_status(normalized)))
}

#[tauri::command]
fn select_native_bios(console_id: String, file_name: String) -> Result<NativeBiosStatus, String> {
    let normalized = console_id.trim().to_lowercase();
    if normalized != "ps2" {
        return Err("La seleccion de BIOS solo esta habilitada para PS2.".to_string());
    }
    if Path::new(&file_name).file_name().and_then(|name| name.to_str()) != Some(file_name.as_str()) {
        return Err("El nombre de la BIOS no es valido.".to_string());
    }
    let bios_path = native_bios_dir("ps2").join(&file_name);
    if !is_valid_ps2_bios(&bios_path) {
        return Err("La BIOS seleccionada ya no esta disponible.".to_string());
    }
    let ini = ensure_pcsx2_portable_config()?;
    write_ini_value(&ini, "Filenames", "BIOS", &file_name)?;
    Ok(native_bios_status(normalized))
}

fn sanitize_file_name(file_name: &str) -> String {
    let cleaned: String = file_name
        .chars()
        .map(|ch| match ch {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ if ch.is_control() => '_',
            _ => ch,
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.').to_string();
    if trimmed.is_empty() {
        "game.rom".to_string()
    } else {
        trimmed
    }
}

fn native_save_kind(console_id: &str) -> &'static str {
    match console_id {
        "n64" | "ps1" | "psp" | "ps2" => "real_save",
        _ => "savestate",
    }
}

fn native_save_base_name(rom_path: &str) -> String {
    Path::new(rom_path)
        .file_stem()
        .map(|stem| sanitize_file_name(&stem.to_string_lossy()))
        .unwrap_or_else(|| "game".to_string())
}

fn native_save_dirs(console_id: &str) -> (PathBuf, PathBuf) {
    let root = local_app_data_dir().join("native-saves").join(console_id);
    (root.join("saves"), root.join("states"))
}

fn ensure_retroarch_save_config(console_id: &str) -> Result<PathBuf, String> {
    let (saves_dir, states_dir) = native_save_dirs(console_id);
    fs::create_dir_all(&saves_dir).map_err(|error| error.to_string())?;
    fs::create_dir_all(&states_dir).map_err(|error| error.to_string())?;

    let config_dir = local_app_data_dir().join("native-config");
    fs::create_dir_all(&config_dir).map_err(|error| error.to_string())?;
    let config_path = config_dir.join(format!("retroarch-{}-saves.cfg", sanitize_file_name(console_id)));
    let saves = saves_dir.to_string_lossy().replace('\\', "/");
    let states = states_dir.to_string_lossy().replace('\\', "/");
    let content = format!(
        "savefile_directory = \"{}\"\nsavestate_directory = \"{}\"\nsavestate_auto_index = \"false\"\nsavestate_slot = \"0\"\npause_nonactive = \"false\"\nnetwork_cmd_enable = \"true\"\nnetwork_cmd_port = \"55355\"\ninput_menu_toggle = \"f1\"\ninput_save_state = \"f2\"\ninput_load_state = \"f4\"\ninput_pause_toggle = \"p\"\n",
        saves, states
    );
    fs::write(&config_path, content).map_err(|error| error.to_string())?;
    Ok(config_path)
}

fn native_save_path(console_id: &str, rom_path: &str, requested_kind: Option<&str>) -> Option<(String, PathBuf)> {
    let normalized = console_id.trim().to_lowercase();
    let kind = requested_kind
        .map(|value| value.trim().to_lowercase())
        .filter(|value| value == "savestate" || value == "real_save")
        .unwrap_or_else(|| native_save_kind(&normalized).to_string());
    let (saves_dir, states_dir) = native_save_dirs(&normalized);
    let base_name = native_save_base_name(rom_path);
    let path = if kind == "real_save" {
        saves_dir.join(format!("{}.srm", base_name))
    } else {
        states_dir.join(format!("{}.state", base_name))
    };
    Some((kind, path))
}

fn native_savestate_candidates(console_id: &str, rom_path: &str) -> Vec<PathBuf> {
    let normalized = console_id.trim().to_lowercase();
    let (_, states_dir) = native_save_dirs(&normalized);
    let base_name = native_save_base_name(rom_path);
    let mut candidates = vec![
        states_dir.join(format!("{}.state", base_name)),
        states_dir.join(format!("{}.state0", base_name)),
    ];

    if let Ok(entries) = fs::read_dir(&states_dir) {
        let prefix = format!("{}.state", base_name).to_lowercase();
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }
            let matches = path
                .file_name()
                .map(|name| name.to_string_lossy().to_lowercase().starts_with(&prefix))
                .unwrap_or(false);
            if matches && !candidates.iter().any(|candidate| candidate == &path) {
                candidates.push(path);
            }
        }
    }

    candidates.sort_by(|a, b| {
        let a_time = a.metadata().and_then(|meta| meta.modified()).unwrap_or(UNIX_EPOCH);
        let b_time = b.metadata().and_then(|meta| meta.modified()).unwrap_or(UNIX_EPOCH);
        b_time.cmp(&a_time)
    });
    candidates
}

fn newest_native_savestate(console_id: &str, rom_path: &str) -> Option<PathBuf> {
    native_savestate_candidates(console_id, rom_path)
        .into_iter()
        .find(|path| path.exists() && path.is_file())
}

fn find_nested_executable_with_depth(root: &Path, executable_name: &str, max_depth: usize) -> Option<PathBuf> {
    let entries = fs::read_dir(root).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file()
            && path
                .file_name()
                .map(|name| name.to_string_lossy().eq_ignore_ascii_case(executable_name))
                .unwrap_or(false)
        {
            return Some(path);
        }
        if max_depth > 0 && path.is_dir() {
            if let Some(found) = find_nested_executable_with_depth(&path, executable_name, max_depth - 1) {
                return Some(found);
            }
        }
    }
    None
}

fn find_nested_executable(root: &Path, executable_name: &str) -> Option<PathBuf> {
    find_nested_executable_with_depth(root, executable_name, 4)
}

fn known_external_engine_candidates(console_id: &str) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    let program_files = env::var("ProgramFiles").ok().map(PathBuf::from);
    let program_files_x86 = env::var("ProgramFiles(x86)").ok().map(PathBuf::from);
    let local_app_data = env::var("LOCALAPPDATA").ok().map(PathBuf::from);

    match console_id {
        "psp" => {
            if let Some(base) = &program_files {
                candidates.push(base.join("PPSSPP").join("PPSSPPWindows64.exe"));
                candidates.push(base.join("PPSSPP").join("PPSSPPWindows.exe"));
            }
            if let Some(base) = &program_files_x86 {
                candidates.push(base.join("PPSSPP").join("PPSSPPWindows.exe"));
            }
            if let Some(base) = &local_app_data {
                candidates.push(base.join("PPSSPP").join("PPSSPPWindows64.exe"));
                candidates.push(base.join("PPSSPP").join("PPSSPPWindows.exe"));
            }
        }
        "ps2" => {
            if let Some(base) = &program_files {
                candidates.push(base.join("PCSX2").join("pcsx2-qt.exe"));
            }
        }
        "ps1" => {
            if let Some(base) = &program_files {
                candidates.push(
                    base.join("DuckStation")
                        .join("duckstation-qt-x64-ReleaseLTCG.exe"),
                );
                candidates.push(base.join("DuckStation").join("duckstation-qt.exe"));
            }
        }
        "ds" => {
            if let Some(base) = &program_files {
                candidates.push(base.join("melonDS").join("melonDS.exe"));
            }
        }
        _ => {
            if let Some(base) = &program_files {
                candidates.push(base.join("RetroArch-Win64").join("retroarch.exe"));
                candidates.push(base.join("RetroArch").join("retroarch.exe"));
            }
        }
    }

    candidates
}

fn find_native_engine(config: &NativeEngineConfig) -> Option<PathBuf> {
    let root = engine_install_dir(config);
    let direct = root.join(config.executable_rel);
    if direct.exists() {
        return Some(direct);
    }

    if let Some(executable_name) = Path::new(config.executable_rel).file_name() {
        if let Some(found) = find_nested_executable(&root, &executable_name.to_string_lossy()) {
            return Some(found);
        }
    }

    known_external_engine_candidates(config.console_id)
        .into_iter()
        .find(|path| path.exists())
}

fn retroarch_core_file_name(console_id: &str) -> Option<&'static str> {
    match console_id {
        "nes" => Some("fceumm_libretro.dll"),
        "snes" => Some("snes9x_libretro.dll"),
        "gba" => Some("mgba_libretro.dll"),
        "gbc" => Some("gambatte_libretro.dll"),
        "sega" => Some("genesis_plus_gx_libretro.dll"),
        "n64" => Some("mupen64plus_next_libretro.dll"),
        "arcade" => Some("fbneo_libretro.dll"),
        _ => None,
    }
}

fn retroarch_core_download_url(console_id: &str) -> Option<String> {
    let core_name = retroarch_core_file_name(console_id)?;
    Some(format!(
        "https://buildbot.libretro.com/nightly/windows/x86_64/latest/{}.zip",
        core_name
    ))
}

fn find_retroarch_core(engine_path: &Path, console_id: &str) -> Option<PathBuf> {
    let core_name = retroarch_core_file_name(console_id)?;
    let retroarch_dir = engine_path.parent()?;
    let direct = retroarch_dir.join("cores").join(core_name);
    if direct.exists() {
        return Some(direct);
    }

    retroarch_dir
        .ancestors()
        .take(3)
        .map(|base| base.join("cores").join(core_name))
        .find(|path| path.exists())
        .or_else(|| find_nested_executable(retroarch_dir, core_name))
}

fn ensure_retroarch_core(engine_path: &Path, console_id: &str) -> Result<(), String> {
    let Some(core_name) = retroarch_core_file_name(console_id) else {
        return Ok(());
    };
    if find_retroarch_core(engine_path, console_id).is_some() {
        return Ok(());
    }

    let Some(retroarch_dir) = engine_path.parent() else {
        return Err("No se pudo ubicar la carpeta de RetroArch.".to_string());
    };
    let cores_dir = retroarch_dir.join("cores");
    fs::create_dir_all(&cores_dir).map_err(|error| {
        format!(
            "No se pudo crear la carpeta de cores de RetroArch: {}",
            error
        )
    })?;

    let Some(core_url) = retroarch_core_download_url(console_id) else {
        return Ok(());
    };
    let core_archive = cores_dir.join(format!("{}.zip", core_name));
    download_file(&core_url, &core_archive).map_err(|error| {
        format!(
            "No se pudo descargar el core {} desde Libretro: {}",
            core_name, error
        )
    })?;
    extract_archive(&core_archive, &cores_dir).map_err(|error| {
        format!(
            "No se pudo extraer el core {} de RetroArch: {}",
            core_name, error
        )
    })?;
    let _ = fs::remove_file(&core_archive);

    if find_retroarch_core(engine_path, console_id).is_some() {
        Ok(())
    } else {
        Err(format!(
            "Se descargo el core {}, pero no se encontro el DLL extraido.",
            core_name
        ))
    }
}

fn native_engine_ready(config: &NativeEngineConfig, engine_path: &Path) -> bool {
    retroarch_core_file_name(config.console_id)
        .map(|_| find_retroarch_core(engine_path, config.console_id).is_some())
        .unwrap_or(true)
}

fn run_hidden(mut command: Command) -> Result<(), String> {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let output = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|error| error.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let details = if !stderr.is_empty() {
            stderr
        } else if !stdout.is_empty() {
            stdout
        } else {
            format!("El proceso termino con codigo {}.", output.status)
        };
        Err(details)
    }
}

fn download_file(url: &str, destination: &Path) -> Result<(), String> {
    let mut command = Command::new("curl.exe");
    command.args([
        "-L",
        "--fail",
        "--silent",
        "--show-error",
        "--output",
        &destination.to_string_lossy(),
        url,
    ]);
    run_hidden(command)
}

fn native_download_job_id(prefix: &str, game_id: &str) -> String {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    format!("{}-{}-{}", prefix, sanitize_file_name(game_id), millis)
}

fn emit_native_download_progress(
    app: &AppHandle,
    job: &NativeDownloadJob,
    status: &str,
    progress: f64,
    downloaded: u64,
    total: u64,
    error: Option<String>,
) {
    let _ = app.emit(
        "forbiddens-native-download-progress",
        NativeDownloadProgressEvent {
            job_id: job.job_id.clone(),
            console_id: job.console_id.clone(),
            game_id: job.game_id.clone(),
            file_name: job.file_name.clone(),
            rom_path: job.rom_path.clone(),
            status: status.to_string(),
            progress,
            downloaded,
            total,
            error,
        },
    );
}

fn download_url_with_progress(
    app: AppHandle,
    job: NativeDownloadJob,
    url: String,
    auth_header: Option<String>,
    temp_target: PathBuf,
    target: PathBuf,
) {
    thread::spawn(move || {
        emit_native_download_progress(&app, &job, "downloading", 0.0, 0, 0, None);

        let Some(parent) = temp_target.parent() else {
            emit_native_download_progress(&app, &job, "error", 0.0, 0, 0, Some("No se pudo preparar la carpeta de descarga.".to_string()));
            return;
        };
        if let Err(error) = fs::create_dir_all(parent) {
            emit_native_download_progress(&app, &job, "error", 0.0, 0, 0, Some(error.to_string()));
            return;
        }
        let _ = fs::remove_file(&temp_target);

        let script = "$ErrorActionPreference='Stop'; \
          $ProgressPreference='SilentlyContinue'; \
          $uri = [Environment]::GetEnvironmentVariable('FORBIDDENS_DOWNLOAD_URL'); \
          $tmp = [Environment]::GetEnvironmentVariable('FORBIDDENS_DOWNLOAD_TEMP'); \
          $auth = [Environment]::GetEnvironmentVariable('FORBIDDENS_DOWNLOAD_AUTH'); \
          $request = [System.Net.HttpWebRequest]::Create($uri); \
          $request.AllowAutoRedirect = $true; \
          if ($auth) { $request.Headers.Add('Authorization', $auth) } \
          $response = $request.GetResponse(); \
          $total = [int64]$response.ContentLength; \
          $input = $response.GetResponseStream(); \
          $output = [System.IO.File]::Open($tmp, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None); \
          $buffer = New-Object byte[] 262144; \
          $readTotal = [int64]0; \
          try { \
            while (($read = $input.Read($buffer, 0, $buffer.Length)) -gt 0) { \
              $output.Write($buffer, 0, $read); \
              $readTotal += $read; \
              $percent = 0; \
              if ($total -gt 0) { $percent = [math]::Min(99, [math]::Floor(($readTotal * 100) / $total)) } \
              Write-Output \"PROGRESS:$($percent):$($readTotal):$($total)\"; \
            } \
          } finally { \
            $output.Close(); \
            if ($input) { $input.Close() } \
            if ($response) { $response.Close() } \
          } \
          if (-not (Test-Path -LiteralPath $tmp -PathType Leaf)) { throw 'No se pudo crear el archivo temporal.' } \
          if ((Get-Item -LiteralPath $tmp).Length -le 0) { throw 'La descarga quedo vacia.' } \
          Write-Output \"PROGRESS:100:$($readTotal):$($total)\"";

        let mut command = powershell_command(script);
        command.env("FORBIDDENS_DOWNLOAD_URL", url);
        command.env("FORBIDDENS_DOWNLOAD_TEMP", temp_target.to_string_lossy().to_string());
        command.env("FORBIDDENS_DOWNLOAD_AUTH", auth_header.unwrap_or_default());
        command.stdout(Stdio::piped());
        command.stderr(Stdio::piped());

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = match command.spawn() {
            Ok(child) => child,
            Err(error) => {
                emit_native_download_progress(&app, &job, "error", 0.0, 0, 0, Some(error.to_string()));
                return;
            }
        };

        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            for line in reader.lines().flatten() {
                if let Some(rest) = line.strip_prefix("PROGRESS:") {
                    let parts: Vec<&str> = rest.split(':').collect();
                    if parts.len() >= 3 {
                        let progress = parts[0].parse::<f64>().unwrap_or(0.0);
                        let downloaded = parts[1].parse::<u64>().unwrap_or(0);
                        let total = parts[2].parse::<u64>().unwrap_or(0);
                        emit_native_download_progress(&app, &job, "downloading", progress, downloaded, total, None);
                    }
                }
            }
        }

        let output = match child.wait_with_output() {
            Ok(output) => output,
            Err(error) => {
                emit_native_download_progress(&app, &job, "error", 0.0, 0, 0, Some(error.to_string()));
                return;
            }
        };

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            let detail = if stderr.is_empty() {
                "No se pudo completar la descarga.".to_string()
            } else {
                stderr
            };
            let _ = fs::remove_file(&temp_target);
            emit_native_download_progress(&app, &job, "error", 0.0, 0, 0, Some(detail));
            return;
        }

        if !temp_target.exists() || temp_target.metadata().map(|meta| meta.len()).unwrap_or(0) == 0 {
            let _ = fs::remove_file(&temp_target);
            emit_native_download_progress(&app, &job, "error", 0.0, 0, 0, Some("No se pudo guardar la ROM descargada.".to_string()));
            return;
        }
        if target.exists() {
            let _ = fs::remove_file(&target);
        }
        if let Err(error) = fs::rename(&temp_target, &target) {
            let _ = fs::remove_file(&temp_target);
            emit_native_download_progress(&app, &job, "error", 0.0, 0, 0, Some(error.to_string()));
            return;
        }

        let size = target.metadata().map(|meta| meta.len()).unwrap_or(0);
        emit_native_download_progress(&app, &job, "completed", 100.0, size, size, None);
    });
}

fn powershell_single_quoted(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

fn verify_file_sha256(path: &Path, expected_sha256: &str) -> Result<(), String> {
    let expected = expected_sha256.trim().to_ascii_lowercase();
    if expected.is_empty() {
        return Ok(());
    }

    let script = format!(
        "$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath {}).Hash.ToLowerInvariant(); if ($hash -ne {}) {{ throw \"SHA256 invalido. Esperado {}, recibido $hash\" }}",
        powershell_single_quoted(&path.to_string_lossy()),
        powershell_single_quoted(&expected),
        expected,
    );
    run_hidden(powershell_command(&script))
}

fn powershell_command(script: &str) -> Command {
    let mut command = Command::new("powershell.exe");
    command.args([
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        script,
    ]);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    command
}

#[cfg(windows)]
fn windows_work_area_for_point(x: i32, y: i32) -> Option<(i32, i32, u32, u32)> {
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$point = New-Object System.Drawing.Point([int]$env:FORBIDDENS_MONITOR_X, [int]$env:FORBIDDENS_MONITOR_Y)
$area = [System.Windows.Forms.Screen]::FromPoint($point).WorkingArea
Write-Output "$($area.X),$($area.Y),$($area.Width),$($area.Height)"
"#;
    let mut command = powershell_command(script);
    command.env("FORBIDDENS_MONITOR_X", x.to_string());
    command.env("FORBIDDENS_MONITOR_Y", y.to_string());
    let output = command.output().ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parts: Vec<&str> = stdout.trim().split(',').collect();
    if parts.len() != 4 {
        return None;
    }
    let area_x = parts[0].trim().parse::<i32>().ok()?;
    let area_y = parts[1].trim().parse::<i32>().ok()?;
    let width = parts[2].trim().parse::<u32>().ok()?;
    let height = parts[3].trim().parse::<u32>().ok()?;
    if width == 0 || height == 0 {
        return None;
    }
    Some((area_x, area_y, width, height))
}

#[cfg(not(windows))]
fn windows_work_area_for_point(_x: i32, _y: i32) -> Option<(i32, i32, u32, u32)> {
    None
}

fn screen_layout(app: &AppHandle) -> Option<(i32, i32, u32, u32, u32, u32)> {
    let window = app.get_webview_window("main")?;
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten())?;
    let size = monitor.size();
    let position = monitor.position();
    let monitor_center_x = position.x + (size.width / 2) as i32;
    let monitor_center_y = position.y + (size.height / 2) as i32;
    let (x, y, width, height) = windows_work_area_for_point(monitor_center_x, monitor_center_y)
        .unwrap_or((position.x, position.y, size.width, size.height));
    let minimum_companion_width = 340.min(width);
    let companion_width = (width / 5).max(minimum_companion_width);
    let emulator_width = width.saturating_sub(companion_width);
    Some((
        x,
        y,
        width,
        height,
        emulator_width,
        companion_width,
    ))
}

fn enter_native_companion_layout(app: &AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    let Some((x, y, _screen_width, screen_height, emulator_width, companion_width)) =
        screen_layout(app)
    else {
        return Ok(());
    };

    window
        .set_min_size(Some(PhysicalSize::new(320, 420)))
        .map_err(|error| error.to_string())?;
    window
        .set_position(PhysicalPosition::new(x + emulator_width as i32, y))
        .map_err(|error| error.to_string())?;
    window
        .set_size(PhysicalSize::new(companion_width, screen_height))
        .map_err(|error| error.to_string())?;
    let _ = window.unminimize();
    let _ = window.set_focus();
    Ok(())
}

fn restore_launcher_layout(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let _ = window.set_min_size(Some(PhysicalSize::new(1024, 650)));
    let _ = window.unminimize();
    let _ = window.maximize();
    let _ = window.set_focus();
}

#[cfg(windows)]
struct WindowSearch {
    process_ids: Vec<u32>,
    hwnd: isize,
}

#[cfg(windows)]
#[repr(C)]
struct ProcessEntry32W {
    dw_size: u32,
    cnt_usage: u32,
    th32_process_id: u32,
    th32_default_heap_id: usize,
    th32_module_id: u32,
    cnt_threads: u32,
    th32_parent_process_id: u32,
    pc_pri_class_base: i32,
    dw_flags: u32,
    sz_exe_file: [u16; 260],
}

#[cfg(windows)]
#[link(name = "user32")]
extern "system" {
    fn EnumWindows(
        lp_enum_func: Option<unsafe extern "system" fn(isize, isize) -> i32>,
        l_param: isize,
    ) -> i32;
    fn GetWindowThreadProcessId(hwnd: isize, lpdw_process_id: *mut u32) -> u32;
    fn IsIconic(hwnd: isize) -> i32;
    fn IsWindowVisible(hwnd: isize) -> i32;
    fn keybd_event(b_vk: u8, b_scan: u8, dw_flags: u32, dw_extra_info: usize);
    fn SetForegroundWindow(hwnd: isize) -> i32;
    fn ShowWindowAsync(hwnd: isize, cmd_show: i32) -> i32;
}

#[cfg(windows)]
#[link(name = "kernel32")]
extern "system" {
    fn CloseHandle(h_object: isize) -> i32;
    fn CreateToolhelp32Snapshot(dw_flags: u32, th32_process_id: u32) -> isize;
    fn Process32FirstW(h_snapshot: isize, lppe: *mut ProcessEntry32W) -> i32;
    fn Process32NextW(h_snapshot: isize, lppe: *mut ProcessEntry32W) -> i32;
}

#[cfg(windows)]
unsafe extern "system" fn enum_windows_for_process(hwnd: isize, l_param: isize) -> i32 {
    if IsWindowVisible(hwnd) == 0 {
        return 1;
    }

    let search = &mut *(l_param as *mut WindowSearch);
    let mut window_process_id = 0u32;
    GetWindowThreadProcessId(hwnd, &mut window_process_id as *mut u32);
    if search.process_ids.contains(&window_process_id) {
        search.hwnd = hwnd;
        return 0;
    }
    1
}

#[cfg(windows)]
fn native_process_tree(process_id: u32) -> Vec<u32> {
    const TH32CS_SNAPPROCESS: u32 = 0x00000002;
    const INVALID_HANDLE_VALUE: isize = -1isize;

    let mut processes = vec![process_id];
    let mut entries: Vec<(u32, u32)> = Vec::new();
    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot == INVALID_HANDLE_VALUE {
            return processes;
        }

        let mut entry = ProcessEntry32W {
            dw_size: std::mem::size_of::<ProcessEntry32W>() as u32,
            cnt_usage: 0,
            th32_process_id: 0,
            th32_default_heap_id: 0,
            th32_module_id: 0,
            cnt_threads: 0,
            th32_parent_process_id: 0,
            pc_pri_class_base: 0,
            dw_flags: 0,
            sz_exe_file: [0; 260],
        };

        if Process32FirstW(snapshot, &mut entry as *mut ProcessEntry32W) != 0 {
            loop {
                entries.push((entry.th32_process_id, entry.th32_parent_process_id));
                if Process32NextW(snapshot, &mut entry as *mut ProcessEntry32W) == 0 {
                    break;
                }
            }
        }
        CloseHandle(snapshot);
    }

    let mut index = 0;
    while index < processes.len() {
        let parent = processes[index];
        for (pid, ppid) in &entries {
            if *ppid == parent && !processes.contains(pid) {
                processes.push(*pid);
            }
        }
        index += 1;
    }
    processes
}

#[cfg(windows)]
fn native_process_window_minimized(process_id: u32) -> Option<bool> {
    let hwnd = native_process_window_handle(process_id)?;
    unsafe { Some(IsIconic(hwnd) != 0) }
}

#[cfg(windows)]
fn native_process_window_handle(process_id: u32) -> Option<isize> {
    let mut search = WindowSearch {
        process_ids: native_process_tree(process_id),
        hwnd: 0,
    };
    unsafe {
        EnumWindows(
            Some(enum_windows_for_process),
            &mut search as *mut WindowSearch as isize,
        );
        (search.hwnd != 0).then_some(search.hwnd)
    }
}

#[cfg(not(windows))]
fn native_process_window_minimized(_process_id: u32) -> Option<bool> {
    None
}

#[cfg(not(windows))]
fn native_process_window_handle(_process_id: u32) -> Option<isize> {
    None
}

fn emit_native_window_state(
    app: &AppHandle,
    console_id: &str,
    rom_path: &Option<String>,
    process_id: u32,
    state: &str,
) {
    let payload = NativeEmulatorWindowStateEvent {
        console_id: console_id.to_string(),
        rom_path: rom_path.clone(),
        process_id,
        state: state.to_string(),
    };
    let _ = app.emit("forbiddens-native-emulator-window-state", payload);
}

fn monitor_native_emulator_window(
    app: AppHandle,
    console_id: String,
    rom_path: Option<String>,
    process_id: u32,
) {
    thread::spawn(move || {
        let mut last_minimized: Option<bool> = None;
        let mut missing_window_checks = 0;

        loop {
            thread::sleep(Duration::from_millis(700));
            match native_process_window_minimized(process_id) {
                Some(is_minimized) => {
                    missing_window_checks = 0;
                    if last_minimized == Some(is_minimized) {
                        continue;
                    }
                    last_minimized = Some(is_minimized);

                    if is_minimized {
                        emit_native_window_state(
                            &app,
                            &console_id,
                            &rom_path,
                            process_id,
                            "minimized",
                        );
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.minimize();
                        }
                    } else {
                        let _ = enter_native_companion_layout(&app);
                        arrange_emulator_window(app.clone(), process_id);
                        emit_native_window_state(
                            &app,
                            &console_id,
                            &rom_path,
                            process_id,
                            "restored",
                        );
                    }
                }
                None => {
                    missing_window_checks += 1;
                    if missing_window_checks > 12 {
                        break;
                    }
                }
            }
        }
    });
}

fn arrange_emulator_window(app: AppHandle, process_id: u32) {
    let Some((x, y, _screen_width, screen_height, emulator_width, _companion_width)) =
        screen_layout(&app)
    else {
        return;
    };

    thread::spawn(move || {
        let script = r#"
$ErrorActionPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Globalization;
using System.Runtime.InteropServices;
public class ForbiddensWinApi {
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}
"@
$processId = [int]$env:FORBIDDENS_EMU_PID
$p = Get-Process -Id $processId -ErrorAction SilentlyContinue
for ($i = 0; $i -lt 60; $i++) {
  if (-not $p) { Start-Sleep -Milliseconds 150; $p = Get-Process -Id $processId -ErrorAction SilentlyContinue; continue }
  $p.Refresh()
  if ($p.MainWindowHandle -ne 0) { break }
  Start-Sleep -Milliseconds 150
}
if ($p -and $p.MainWindowHandle -ne 0) {
  [ForbiddensWinApi]::ShowWindowAsync($p.MainWindowHandle, 9) | Out-Null
  [ForbiddensWinApi]::MoveWindow($p.MainWindowHandle, [int]$env:FORBIDDENS_EMU_X, [int]$env:FORBIDDENS_EMU_Y, [int]$env:FORBIDDENS_EMU_W, [int]$env:FORBIDDENS_EMU_H, $true) | Out-Null
}
"#;
        let mut command = powershell_command(script);
        command.env("FORBIDDENS_EMU_PID", process_id.to_string());
        command.env("FORBIDDENS_EMU_X", x.to_string());
        command.env("FORBIDDENS_EMU_Y", y.to_string());
        command.env("FORBIDDENS_EMU_W", emulator_width.to_string());
        command.env("FORBIDDENS_EMU_H", screen_height.to_string());
        let _ = run_hidden(command);
    });
}

fn extract_archive(archive: &Path, destination: &Path) -> Result<(), String> {
    let mut command = Command::new("tar.exe");
    command.args([
        "-xf",
        &archive.to_string_lossy(),
        "-C",
        &destination.to_string_lossy(),
    ]);
    command
        .env("FORBIDDENS_ENGINE_ROOT", &destination)
        .env("FORBIDDENS_ENGINE_ARCHIVE", &archive)
        .env("FORBIDDENS_ENGINE_EXTRACTOR", "tar");
    run_hidden(command)
}

fn join_package_parts(parts: &[PathBuf], destination: &Path) -> Result<(), String> {
    let mut output = fs::File::create(destination).map_err(|error| error.to_string())?;
    for part in parts {
        let mut input = fs::File::open(part).map_err(|error| error.to_string())?;
        io::copy(&mut input, &mut output).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn native_engine_status(console_id: String) -> NativeEngineStatus {
    let normalized = console_id.trim().to_lowercase();
    let Some(config) = get_engine_config(&normalized) else {
        return NativeEngineStatus {
            console_id: normalized,
            engine_name: "No disponible".to_string(),
            native_supported: false,
            install_supported: false,
            installed: false,
            executable_path: None,
            install_dir: local_app_data_dir()
                .join("engines")
                .to_string_lossy()
                .to_string(),
            package_url: String::new(),
            download_page: String::new(),
        };
    };

    let executable_path = find_native_engine(&config);
    let installed = executable_path
        .as_ref()
        .map(|path| native_engine_ready(&config, path))
        .unwrap_or(false);
    NativeEngineStatus {
        console_id: config.console_id.to_string(),
        engine_name: config.engine_name.to_string(),
        native_supported: true,
        install_supported: !config.package_urls.is_empty(),
        installed,
        executable_path: executable_path.map(|path| path.to_string_lossy().to_string()),
        install_dir: engine_install_dir(&config).to_string_lossy().to_string(),
        package_url: config
            .package_urls
            .first()
            .copied()
            .unwrap_or_default()
            .to_string(),
        download_page: config.download_page.to_string(),
    }
}

#[tauri::command]
fn install_native_engine(console_id: String) -> Result<NativeEngineStatus, String> {
    let normalized = console_id.trim().to_lowercase();
    let Some(config) = get_engine_config(&normalized) else {
        return Err("Esta consola aun no tiene motor nativo configurado.".to_string());
    };

    if let Some(engine_path) = find_native_engine(&config) {
        if native_engine_ready(&config, &engine_path) {
            return Ok(native_engine_status(normalized));
        }
        if ensure_retroarch_core(&engine_path, &normalized).is_ok() {
            return Ok(native_engine_status(normalized));
        }

    }

    let root = engine_install_dir(&config);
    if root.exists() {
        fs::remove_dir_all(&root).map_err(|error| {
            format!(
                "No se pudo limpiar una instalacion incompleta de {}: {}",
                config.engine_name, error
            )
        })?;
    }
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    let archive = root.join(config.package_file_name);
    let mut downloaded_parts = Vec::new();

    if config.package_urls.len() == 1 {
        download_file(config.package_urls[0], &archive)?;
    } else {
        for (index, url) in config.package_urls.iter().enumerate() {
            let part_path = root.join(format!("{}.part{:03}", config.package_file_name, index + 1));
            download_file(url, &part_path)?;
            downloaded_parts.push(part_path);
        }
        join_package_parts(&downloaded_parts, &archive)?;
    }

    verify_file_sha256(&archive, config.package_sha256)?;
    extract_archive(&archive, &root)?;

    let _ = fs::remove_file(&archive);
    for part in downloaded_parts {
        let _ = fs::remove_file(part);
    }

    if let Some(engine_path) = find_native_engine(&config) {
        ensure_retroarch_core(&engine_path, &normalized)?;
    }

    let status = native_engine_status(normalized);
    if status.installed {
        Ok(status)
    } else {
        Err("Se descargo el paquete, pero no encontre el ejecutable esperado.".to_string())
    }
}

#[tauri::command]
fn reinstall_native_engine(console_id: String) -> Result<NativeEngineStatus, String> {
    let normalized = console_id.trim().to_lowercase();
    let Some(config) = get_engine_config(&normalized) else {
        return Err("Esta consola aun no tiene motor nativo configurado.".to_string());
    };

    let root = engine_install_dir(&config);
    if root.exists() {
        fs::remove_dir_all(&root).map_err(|error| {
            format!(
                "No se pudo eliminar la instalacion anterior de {}: {}",
                config.engine_name, error
            )
        })?;
    }

    install_native_engine(normalized)
}

#[tauri::command]
fn pick_native_rom(app: AppHandle, console_id: String) -> Result<Option<String>, String> {
    let normalized = console_id.trim().to_lowercase();
    if get_engine_config(&normalized).is_none() {
        return Err("Esta consola aun no tiene motor nativo configurado.".to_string());
    }

    let picked = app
        .dialog()
        .file()
        .add_filter("ROM", console_extensions(&normalized))
        .blocking_pick_file();

    Ok(picked
        .and_then(|file_path| file_path.into_path().ok())
        .map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
fn open_native_emulator(
    app: AppHandle,
    console_id: String,
    rom_path: Option<String>,
) -> Result<NativeEmulatorLaunchResult, String> {
    let normalized = console_id.trim().to_lowercase();
    let Some(config) = get_engine_config(&normalized) else {
        return Err("Esta consola aun no tiene motor nativo configurado.".to_string());
    };

    let Some(engine_path) = find_native_engine(&config) else {
        return Err(format!("{} no esta instalado.", config.engine_name));
    };

    if normalized == "ps2" && !native_bios_status(normalized.clone()).configured {
        return Err("PCSX2 necesita una BIOS. Importala desde la pagina de Emuladores antes de cargar la ROM.".to_string());
    }

    let mut command = Command::new(&engine_path);
    if normalized == "ps2" {
        command.arg("-portable");
    }
    if let Some(core_name) = retroarch_core_file_name(&normalized) {
        if find_retroarch_core(&engine_path, &normalized).is_none() {
            ensure_retroarch_core(&engine_path, &normalized)?;
        }
        let Some(core_path) = find_retroarch_core(&engine_path, &normalized) else {
            return Err(format!(
                "RetroArch esta instalado, pero falta el core {}. Reinstala el emulador desde FORBIDDENS Launcher.",
                core_name
            ));
        };
        command.arg("-L").arg(core_path);
        if rom_path
            .as_deref()
            .map(str::trim)
            .filter(|path| !path.is_empty())
            .is_some()
        {
            let save_config = ensure_retroarch_save_config(&normalized)?;
            command.arg(format!("--appendconfig={}", save_config.to_string_lossy()));
        }
    }
    if let Some(path) = rom_path
        .as_deref()
        .map(str::trim)
        .filter(|path| !path.is_empty())
    {
        command.arg(path);
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = command.spawn().map_err(|error| error.to_string())?;
    let process_id = child.id();
    ACTIVE_NATIVE_PROCESS_ID.store(process_id, Ordering::SeqCst);
    let rom_path_for_event = rom_path
        .as_deref()
        .map(str::trim)
        .filter(|path| !path.is_empty())
        .map(|path| path.to_string());
    let engine_path_string = engine_path.to_string_lossy().to_string();

    let _ = enter_native_companion_layout(&app);
    arrange_emulator_window(app.clone(), process_id);
    monitor_native_emulator_window(
        app.clone(),
        normalized.clone(),
        rom_path_for_event.clone(),
        process_id,
    );

    let event_app = app.clone();
    let restore_app = app.clone();
    let event_payload = NativeEmulatorExitEvent {
        console_id: normalized.clone(),
        rom_path: rom_path_for_event.clone(),
        engine_path: engine_path_string.clone(),
        process_id,
        success: true,
    };

    thread::spawn(move || {
        let success = child.wait().map(|status| status.success()).unwrap_or(false);
        ACTIVE_NATIVE_PROCESS_ID.compare_exchange(
            process_id,
            0,
            Ordering::SeqCst,
            Ordering::SeqCst,
        ).ok();
        let mut payload = event_payload.clone();
        payload.success = success;
        let _ = event_app.emit("forbiddens-native-emulator-exit", payload);
        restore_launcher_layout(&restore_app);
    });

    Ok(NativeEmulatorLaunchResult {
        console_id: normalized,
        rom_path: rom_path_for_event,
        engine_path: engine_path_string,
        process_id,
    })
}

#[tauri::command]
fn close_native_emulator(process_id: u32) -> Result<(), String> {
    let script = "$ErrorActionPreference='SilentlyContinue'; \
      $processId = [int]$env:FORBIDDENS_EMU_PID; \
      $ids = New-Object System.Collections.Generic.List[int]; \
      $ids.Add($processId); \
      function Add-Children([int]$parentId) { \
        $children = Get-CimInstance Win32_Process -Filter \"ParentProcessId=$parentId\" -ErrorAction SilentlyContinue; \
        foreach ($child in $children) { if ($child.ProcessId) { $ids.Add([int]$child.ProcessId); Add-Children ([int]$child.ProcessId) } } \
      }; \
      Add-Children $processId; \
      foreach ($id in ($ids | Select-Object -Unique | Sort-Object -Descending)) { \
        $p = Get-Process -Id $id -ErrorAction SilentlyContinue; \
        if ($p -and $p.MainWindowHandle -ne 0) { $null = $p.CloseMainWindow() } \
      }; \
      Start-Sleep -Milliseconds 900; \
      foreach ($id in ($ids | Select-Object -Unique | Sort-Object -Descending)) { \
        $p = Get-Process -Id $id -ErrorAction SilentlyContinue; \
        if ($p -and -not $p.HasExited) { Stop-Process -Id $id -Force } \
      }";
    let mut command = powershell_command(script);
    command.env("FORBIDDENS_EMU_PID", process_id.to_string());
    let result = run_hidden(command);
    ACTIVE_NATIVE_PROCESS_ID.compare_exchange(
        process_id,
        0,
        Ordering::SeqCst,
        Ordering::SeqCst,
    ).ok();
    result
}

#[tauri::command]
fn set_native_emulator_state(process_id: u32, action: String) -> Result<(), String> {
    let normalized = action.trim().to_lowercase();
    let show_command = match normalized.as_str() {
        "minimize" => 6,
        "restore" | "show" | "maximize" => 9,
        _ => return Err("Accion de ventana no soportada.".to_string()),
    };

    #[cfg(windows)]
    {
        if let Some(hwnd) = native_process_window_handle(process_id) {
            unsafe {
                ShowWindowAsync(hwnd, show_command);
                if show_command != 6 {
                    SetForegroundWindow(hwnd);
                }
            }
        }
        return Ok(());
    }

    #[cfg(not(windows))]
    Ok(())
}

#[tauri::command]
fn sync_native_companion_layout(app: AppHandle, process_id: u32) -> Result<(), String> {
    enter_native_companion_layout(&app)?;
    arrange_emulator_window(app, process_id);
    Ok(())
}

#[cfg(windows)]
fn send_native_key(process_id: u32, virtual_key: u8) -> Result<(), String> {
    let Some(hwnd) = native_process_window_handle(process_id) else {
        return Err("No se encontro la ventana del emulador.".to_string());
    };
    unsafe {
        ShowWindowAsync(hwnd, 9);
        SetForegroundWindow(hwnd);
    }
    thread::sleep(Duration::from_millis(120));
    unsafe {
        keybd_event(virtual_key, 0, 0, 0);
    }
    thread::sleep(Duration::from_millis(45));
    unsafe {
        keybd_event(virtual_key, 0, 0x0002, 0);
    }
    Ok(())
}

fn send_retroarch_network_command(command: &str) -> bool {
    let Ok(socket) = UdpSocket::bind("127.0.0.1:0") else {
        return false;
    };
    socket
        .send_to(command.as_bytes(), "127.0.0.1:55355")
        .is_ok()
}

#[tauri::command]
fn native_emulator_action(process_id: u32, action: String) -> Result<(), String> {
    let normalized = action.trim().to_lowercase();
    let (retroarch_command, virtual_key): (&str, u8) = match normalized.as_str() {
        "menu" | "settings" | "config" => ("MENU_TOGGLE", 0x70),
        "save_state" | "savestate" => ("SAVE_STATE", 0x71),
        "load_state" => ("LOAD_STATE", 0x73),
        "pause" | "pause_toggle" | "play_pause" => ("PAUSE_TOGGLE", 0x50),
        _ => return Err("Accion del emulador no soportada.".to_string()),
    };

    let sent_retroarch_command = send_retroarch_network_command(retroarch_command);
    if sent_retroarch_command && matches!(normalized.as_str(), "menu" | "settings" | "config" | "pause" | "pause_toggle" | "play_pause") {
        return Ok(());
    }

    #[cfg(windows)]
    {
        return send_native_key(process_id, virtual_key);
    }

    #[cfg(not(windows))]
    Ok(())
}

#[tauri::command]
fn set_native_emulator_volume(process_id: u32, volume: u8) -> Result<(), String> {
    let clamped = volume.min(100);
    let script = r#"
$ErrorActionPreference = 'Stop'
$source = @"
using System;
using System.Runtime.InteropServices;

public enum EDataFlow { eRender, eCapture, eAll }
public enum ERole { eConsole, eMultimedia, eCommunications }

[ComImport]
[Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumerator {}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
  int NotImpl1();
  int GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice ppDevice);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
  int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, out IAudioSessionManager2 ppInterface);
}

[Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionManager2 {
  int NotImpl1();
  int NotImpl2();
  int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
}

[Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionEnumerator {
  int GetCount(out int SessionCount);
  int GetSession(int SessionCount, out IAudioSessionControl Session);
}

[Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionControl {
  int NotImpl1();
}

[Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioSessionControl2 {
  int GetState(out int pRetVal);
  int GetDisplayName(out IntPtr retVal);
  int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
  int GetIconPath(out IntPtr retVal);
  int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
  int GetGroupingParam(out Guid retVal);
  int SetGroupingParam(ref Guid Override, ref Guid EventContext);
  int RegisterAudioSessionNotification(IntPtr NewNotifications);
  int UnregisterAudioSessionNotification(IntPtr NewNotifications);
  int GetSessionIdentifier(out IntPtr retVal);
  int GetSessionInstanceIdentifier(out IntPtr retVal);
  int GetProcessId(out uint retVal);
  int IsSystemSoundsSession();
  int SetDuckingPreference(bool optOut);
}

[Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8")]
[InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface ISimpleAudioVolume {
  int SetMasterVolume(float fLevel, ref Guid EventContext);
  int GetMasterVolume(out float pfLevel);
  int SetMute(bool bMute, ref Guid EventContext);
  int GetMute(out bool pbMute);
}

public static class ForbiddensProcessVolume {
  public static bool Set(uint processId, float volume) {
    IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
    IMMDevice device;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out device));
    Guid iid = typeof(IAudioSessionManager2).GUID;
    IAudioSessionManager2 manager;
    Marshal.ThrowExceptionForHR(device.Activate(ref iid, 23, IntPtr.Zero, out manager));
    IAudioSessionEnumerator sessions;
    Marshal.ThrowExceptionForHR(manager.GetSessionEnumerator(out sessions));
    int count;
    Marshal.ThrowExceptionForHR(sessions.GetCount(out count));
    Guid context = Guid.Empty;
    bool changed = false;
    for (int i = 0; i < count; i++) {
      IAudioSessionControl control;
      Marshal.ThrowExceptionForHR(sessions.GetSession(i, out control));
      IAudioSessionControl2 control2;
      try {
        control2 = (IAudioSessionControl2)control;
      } catch {
        continue;
      }
      uint sessionPid;
      Marshal.ThrowExceptionForHR(control2.GetProcessId(out sessionPid));
      if (sessionPid != processId) continue;
      ISimpleAudioVolume simple;
      try {
        simple = (ISimpleAudioVolume)control;
      } catch {
        continue;
      }
      Marshal.ThrowExceptionForHR(simple.SetMasterVolume(volume, ref context));
      Marshal.ThrowExceptionForHR(simple.SetMute(volume <= 0.001f, ref context));
      changed = true;
    }
    return changed;
  }
}
"@
if (-not ('ForbiddensProcessVolume' -as [type])) {
  Add-Type -TypeDefinition $source
}
$culture = [System.Globalization.CultureInfo]::InvariantCulture
$volumePercent = [single]::Parse($env:FORBIDDENS_EMU_VOLUME, $culture)
$volumeValue = [Math]::Max(0, [Math]::Min(1, ($volumePercent / 100.0)))
$rootPid = [uint32]$env:FORBIDDENS_EMU_PID
$processIds = @($rootPid)
function Add-ChildProcessIds([uint32]$parentPid) {
  try {
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId=$parentPid" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
      if ($child.ProcessId) {
        $childPid = [uint32]$child.ProcessId
        $script:processIds += $childPid
        Add-ChildProcessIds $childPid
      }
    }
  } catch {
  }
}
Add-ChildProcessIds $rootPid
$changed = $false
foreach ($pidValue in ($processIds | Select-Object -Unique)) {
  if ([ForbiddensProcessVolume]::Set($pidValue, $volumeValue)) { $changed = $true }
}
if (-not $changed) {
  Start-Sleep -Milliseconds 250
  foreach ($pidValue in ($processIds | Select-Object -Unique)) {
    if ([ForbiddensProcessVolume]::Set($pidValue, $volumeValue)) { $changed = $true }
  }
}
if (-not $changed) { throw 'No se encontro una sesion de audio activa para el emulador.' }
"#;
    let mut command = powershell_command(script);
    command.env("FORBIDDENS_EMU_PID", process_id.to_string());
    command.env("FORBIDDENS_EMU_VOLUME", clamped.to_string());
    run_hidden(command)
}

#[tauri::command]
fn read_native_save_file(
    console_id: String,
    rom_path: String,
    kind: Option<String>,
) -> Result<Option<NativeSaveFilePayload>, String> {
    let normalized = console_id.trim().to_lowercase();
    if normalized == "ps2" {
        let path = pcsx2_primary_memory_card_for_export()?;
        let bytes = fs::read(&path).map_err(|error| error.to_string())?;
        if bytes.is_empty() {
            return Ok(None);
        }
        return Ok(Some(NativeSaveFilePayload {
            console_id: normalized,
            kind: "real_save".to_string(),
            path: path.to_string_lossy().to_string(),
            data: general_purpose::STANDARD.encode(&bytes),
            size: bytes.len() as u64,
        }));
    }
    if normalized == "ps1" {
        let path = duckstation_primary_memory_card_for_export()?;
        let bytes = fs::read(&path).map_err(|error| error.to_string())?;
        if bytes.is_empty() {
            return Ok(None);
        }
        return Ok(Some(NativeSaveFilePayload {
            console_id: normalized,
            kind: "real_save".to_string(),
            path: path.to_string_lossy().to_string(),
            data: general_purpose::STANDARD.encode(&bytes),
            size: bytes.len() as u64,
        }));
    }
    if normalized == "psp" {
        let source = ppsspp_savedata_dir_for_export()?;
        let temp = local_app_data_dir().join("tmp").join(format!(
            "ppsspp-cloud-save-{}.zip",
            SystemTime::now().duration_since(UNIX_EPOCH).map(|value| value.as_millis()).unwrap_or(0)
        ));
        if let Some(parent) = temp.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        compress_dir_to_zip(&source, &temp)?;
        let bytes = fs::read(&temp).map_err(|error| error.to_string())?;
        let _ = fs::remove_file(&temp);
        if bytes.is_empty() {
            return Ok(None);
        }
        return Ok(Some(NativeSaveFilePayload {
            console_id: normalized,
            kind: "real_save".to_string(),
            path: source.to_string_lossy().to_string(),
            data: general_purpose::STANDARD.encode(&bytes),
            size: bytes.len() as u64,
        }));
    }
    if retroarch_core_file_name(&normalized).is_none() {
        return Ok(None);
    };
    let Some((save_kind, default_path)) = native_save_path(&normalized, &rom_path, kind.as_deref()) else {
        return Ok(None);
    };
    let path = if save_kind == "savestate" {
        newest_native_savestate(&normalized, &rom_path).unwrap_or(default_path)
    } else {
        default_path
    };
    if !path.exists() || !path.is_file() {
        return Ok(None);
    }
    let bytes = fs::read(&path).map_err(|error| error.to_string())?;
    if bytes.is_empty() {
        return Ok(None);
    }
    Ok(Some(NativeSaveFilePayload {
        console_id: normalized,
        kind: save_kind,
        path: path.to_string_lossy().to_string(),
        data: general_purpose::STANDARD.encode(&bytes),
        size: bytes.len() as u64,
    }))
}

#[tauri::command]
fn write_native_save_file(
    console_id: String,
    rom_path: String,
    kind: Option<String>,
    data: String,
) -> Result<Option<String>, String> {
    let normalized = console_id.trim().to_lowercase();
    let bytes = general_purpose::STANDARD
        .decode(data.trim())
        .map_err(|error| format!("Save invalido: {}", error))?;
    if normalized == "ps2" {
        let path = pcsx2_primary_memory_card_for_import()?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(&path, bytes).map_err(|error| error.to_string())?;
        return Ok(Some(path.to_string_lossy().to_string()));
    }
    if normalized == "ps1" {
        let path = duckstation_primary_memory_card_for_import()?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(&path, bytes).map_err(|error| error.to_string())?;
        return Ok(Some(path.to_string_lossy().to_string()));
    }
    if normalized == "psp" {
        let temp = local_app_data_dir().join("tmp").join(format!(
            "ppsspp-cloud-restore-{}.zip",
            SystemTime::now().duration_since(UNIX_EPOCH).map(|value| value.as_millis()).unwrap_or(0)
        ));
        if let Some(parent) = temp.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::write(&temp, bytes).map_err(|error| error.to_string())?;
        let target = ppsspp_savedata_dir_for_import()?;
        let result = expand_zip_to_dir(&temp, &target);
        let _ = fs::remove_file(&temp);
        result?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }
    if retroarch_core_file_name(&normalized).is_none() {
        return Ok(None);
    }
    let Some((_, path)) = native_save_path(&normalized, &rom_path, kind.as_deref()) else {
        return Ok(None);
    };
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&path, bytes).map_err(|error| error.to_string())?;
    Ok(Some(path.to_string_lossy().to_string()))
}

fn compress_dir_to_zip(source: &Path, target: &Path) -> Result<(), String> {
    let script = "$ErrorActionPreference='Stop'; \
      $src = $env:FORBIDDENS_SAVE_SRC; \
      $dst = $env:FORBIDDENS_SAVE_DST; \
      if (Test-Path -LiteralPath $dst) { Remove-Item -LiteralPath $dst -Force } \
      Compress-Archive -LiteralPath (Join-Path $src '*') -DestinationPath $dst -Force";
    let mut command = powershell_command(script);
    command.env("FORBIDDENS_SAVE_SRC", source.to_string_lossy().to_string());
    command.env("FORBIDDENS_SAVE_DST", target.to_string_lossy().to_string());
    run_hidden(command)
}

fn expand_zip_to_dir(source: &Path, target: &Path) -> Result<(), String> {
    let script = "$ErrorActionPreference='Stop'; \
      $src = $env:FORBIDDENS_SAVE_SRC; \
      $dst = $env:FORBIDDENS_SAVE_DST; \
      if (Test-Path -LiteralPath $dst) { Remove-Item -LiteralPath $dst -Recurse -Force } \
      New-Item -ItemType Directory -Force -LiteralPath $dst | Out-Null; \
      Expand-Archive -LiteralPath $src -DestinationPath $dst -Force";
    let mut command = powershell_command(script);
    command.env("FORBIDDENS_SAVE_SRC", source.to_string_lossy().to_string());
    command.env("FORBIDDENS_SAVE_DST", target.to_string_lossy().to_string());
    run_hidden(command)
}

fn ppsspp_savedata_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(config) = get_engine_config("psp") {
        if let Some(engine_path) = find_native_engine(&config) {
            if let Some(root) = engine_path.parent() {
                candidates.push(root.join("memstick").join("PSP").join("SAVEDATA"));
            }
        }
    }
    if let Ok(user_profile) = env::var("USERPROFILE") {
        candidates.push(PathBuf::from(&user_profile).join("Documents").join("PPSSPP").join("PSP").join("SAVEDATA"));
    }
    if let Ok(app_data) = env::var("APPDATA") {
        candidates.push(PathBuf::from(&app_data).join("PPSSPP").join("PSP").join("SAVEDATA"));
    }
    if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
        candidates.push(PathBuf::from(&local_app_data).join("PPSSPP").join("PSP").join("SAVEDATA"));
    }
    candidates
}

fn path_has_entries(path: &Path) -> bool {
    fs::read_dir(path)
        .map(|mut entries| entries.any(|entry| entry.is_ok()))
        .unwrap_or(false)
}

fn ppsspp_savedata_dir_for_export() -> Result<PathBuf, String> {
    ppsspp_savedata_candidates()
        .into_iter()
        .find(|path| path.is_dir() && path_has_entries(path))
        .ok_or_else(|| "No se encontraron saves de PPSSPP para exportar.".to_string())
}

fn ppsspp_savedata_dir_for_import() -> Result<PathBuf, String> {
    if let Some(existing) = ppsspp_savedata_candidates().into_iter().find(|path| path.is_dir()) {
        return Ok(existing);
    }
    let Some(config) = get_engine_config("psp") else {
        return Err("PSP no tiene motor nativo configurado.".to_string());
    };
    let Some(engine_path) = find_native_engine(&config) else {
        return Err("Instala PPSSPP antes de cargar saves.".to_string());
    };
    let Some(root) = engine_path.parent() else {
        return Err("No se encontro la carpeta de PPSSPP.".to_string());
    };
    let dir = root.join("memstick").join("PSP").join("SAVEDATA");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}

fn pcsx2_memcards_dir() -> Result<PathBuf, String> {
    let root = pcsx2_root().ok_or_else(|| "Instala PCSX2 antes de usar saves locales.".to_string())?;
    let memcards = root.join("memcards");
    fs::create_dir_all(&memcards).map_err(|error| error.to_string())?;
    Ok(memcards)
}

fn pcsx2_primary_memory_card_for_export() -> Result<PathBuf, String> {
    let memcards = pcsx2_memcards_dir()?;
    let preferred = memcards.join("Mcd001.ps2");
    if preferred.exists() && preferred.is_file() {
        return Ok(preferred);
    }
    fs::read_dir(&memcards)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .find(|path| {
            path.is_file()
                && path
                    .extension()
                    .map(|ext| ext.to_string_lossy().eq_ignore_ascii_case("ps2"))
                    .unwrap_or(false)
        })
        .ok_or_else(|| "No se encontro una memory card de PCSX2 para exportar.".to_string())
}

fn pcsx2_primary_memory_card_for_import() -> Result<PathBuf, String> {
    Ok(pcsx2_memcards_dir()?.join("Mcd001.ps2"))
}

fn duckstation_memcard_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(config) = get_engine_config("ps1") {
        if let Some(engine_path) = find_native_engine(&config) {
            if let Some(root) = engine_path.parent() {
                candidates.push(root.join("memcards"));
                candidates.push(root.join("MemoryCards"));
                candidates.push(root.join("user").join("memcards"));
            }
        }
    }
    if let Ok(user_profile) = env::var("USERPROFILE") {
        candidates.push(PathBuf::from(&user_profile).join("Documents").join("DuckStation").join("memcards"));
        candidates.push(PathBuf::from(&user_profile).join("Documents").join("DuckStation").join("MemoryCards"));
    }
    if let Ok(app_data) = env::var("APPDATA") {
        candidates.push(PathBuf::from(&app_data).join("DuckStation").join("memcards"));
        candidates.push(PathBuf::from(&app_data).join("DuckStation").join("MemoryCards"));
    }
    if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
        candidates.push(PathBuf::from(&local_app_data).join("DuckStation").join("memcards"));
        candidates.push(PathBuf::from(&local_app_data).join("DuckStation").join("MemoryCards"));
    }
    candidates
}

fn is_duckstation_memcard(path: &Path) -> bool {
    path.is_file()
        && path
            .extension()
            .map(|ext| {
                let ext = ext.to_string_lossy().to_ascii_lowercase();
                ext == "mcd" || ext == "mcr" || ext == "mc"
            })
            .unwrap_or(false)
}

fn duckstation_primary_memory_card_for_export() -> Result<PathBuf, String> {
    for dir in duckstation_memcard_candidates() {
        let preferred = dir.join("MemoryCard1.mcd");
        if preferred.exists() && preferred.is_file() {
            return Ok(preferred);
        }
        if let Ok(entries) = fs::read_dir(&dir) {
            if let Some(path) = entries
                .filter_map(Result::ok)
                .map(|entry| entry.path())
                .find(|path| is_duckstation_memcard(path))
            {
                return Ok(path);
            }
        }
    }
    Err("No se encontro una memory card de DuckStation para exportar.".to_string())
}

fn duckstation_primary_memory_card_for_import() -> Result<PathBuf, String> {
    if let Some(existing) = duckstation_memcard_candidates().into_iter().find(|path| path.is_dir()) {
        return Ok(existing.join("MemoryCard1.mcd"));
    }
    let Some(config) = get_engine_config("ps1") else {
        return Err("PS1 no tiene motor nativo configurado.".to_string());
    };
    let Some(engine_path) = find_native_engine(&config) else {
        return Err("Instala DuckStation antes de cargar saves.".to_string());
    };
    let Some(root) = engine_path.parent() else {
        return Err("No se encontro la carpeta de DuckStation.".to_string());
    };
    let dir = root.join("memcards");
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join("MemoryCard1.mcd"))
}

fn local_save_file_name(game_name: &str, console_id: &str, extension: &str) -> String {
    let game = sanitize_file_name(game_name).trim_end_matches(".rom").to_string();
    format!("{}_{}_save.{}", game, sanitize_file_name(console_id), extension)
}

#[tauri::command]
fn export_native_local_save(
    app: AppHandle,
    console_id: String,
    game_name: String,
    rom_path: Option<String>,
) -> Result<Option<String>, String> {
    let normalized = console_id.trim().to_lowercase();

    if normalized == "ps2" {
        let source = pcsx2_primary_memory_card_for_export()?;
        let target = app.dialog().file()
            .add_filter("Memory Card PS2", &["ps2"])
            .set_file_name(&local_save_file_name(&game_name, "ps2", "ps2"))
            .blocking_save_file();
        let Some(target) = target.and_then(|file| file.into_path().ok()) else {
            return Ok(None);
        };
        fs::copy(&source, &target).map_err(|error| error.to_string())?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }

    if normalized == "ps1" {
        let source = duckstation_primary_memory_card_for_export()?;
        let target = app.dialog().file()
            .add_filter("Memory Card PS1", &["mcd", "mcr", "mc"])
            .set_file_name(&local_save_file_name(&game_name, "ps1", "mcd"))
            .blocking_save_file();
        let Some(target) = target.and_then(|file| file.into_path().ok()) else {
            return Ok(None);
        };
        fs::copy(&source, &target).map_err(|error| error.to_string())?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }

    if normalized == "psp" {
        let source = ppsspp_savedata_dir_for_export()?;
        let target = app.dialog().file()
            .add_filter("Save PSP comprimido", &["zip"])
            .set_file_name(&local_save_file_name(&game_name, "psp", "zip"))
            .blocking_save_file();
        let Some(target) = target.and_then(|file| file.into_path().ok()) else {
            return Ok(None);
        };
        compress_dir_to_zip(&source, &target)?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }

    if retroarch_core_file_name(&normalized).is_some() {
        let rom_path = rom_path
            .as_deref()
            .map(str::trim)
            .filter(|path| !path.is_empty())
            .ok_or_else(|| "No se encontro la ruta de la ROM para guardar el savestate local.".to_string())?;
        let Some(source) = newest_native_savestate(&normalized, rom_path) else {
            return Err("Aun no existe un savestate local para este juego.".to_string());
        };
        let target = app.dialog().file()
            .add_filter("Savestate RetroArch", &["state"])
            .set_file_name(&local_save_file_name(&game_name, &normalized, "state"))
            .blocking_save_file();
        let Some(target) = target.and_then(|file| file.into_path().ok()) else {
            return Ok(None);
        };
        fs::copy(&source, &target).map_err(|error| error.to_string())?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }

    Err("Esta consola no soporta saves locales manuales todavia.".to_string())
}

#[tauri::command]
fn import_native_local_save(app: AppHandle, console_id: String, rom_path: Option<String>) -> Result<Option<String>, String> {
    let normalized = console_id.trim().to_lowercase();

    if normalized == "ps2" {
        let picked = app
            .dialog()
            .file()
            .add_filter("Memory Card PS2", &["ps2"])
            .blocking_pick_file();
        let Some(source) = picked.and_then(|file| file.into_path().ok()) else {
            return Ok(None);
        };
        let target = pcsx2_primary_memory_card_for_import()?;
        fs::copy(&source, &target).map_err(|error| error.to_string())?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }

    if normalized == "ps1" {
        let picked = app
            .dialog()
            .file()
            .add_filter("Memory Card PS1", &["mcd", "mcr", "mc"])
            .blocking_pick_file();
        let Some(source) = picked.and_then(|file| file.into_path().ok()) else {
            return Ok(None);
        };
        let target = duckstation_primary_memory_card_for_import()?;
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::copy(&source, &target).map_err(|error| error.to_string())?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }

    if normalized == "psp" {
        let picked = app
            .dialog()
            .file()
            .add_filter("Save PSP comprimido", &["zip"])
            .blocking_pick_file();
        let Some(source) = picked.and_then(|file| file.into_path().ok()) else {
            return Ok(None);
        };
        let target = ppsspp_savedata_dir_for_import()?;
        fs::create_dir_all(&target).map_err(|error| error.to_string())?;
        expand_zip_to_dir(&source, &target)?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }

    if retroarch_core_file_name(&normalized).is_some() {
        let rom_path = rom_path
            .as_deref()
            .map(str::trim)
            .filter(|path| !path.is_empty())
            .ok_or_else(|| "No se encontro la ruta de la ROM para cargar el savestate local.".to_string())?;
        let picked = app
            .dialog()
            .file()
            .add_filter("Savestate RetroArch", &["state"])
            .blocking_pick_file();
        let Some(source) = picked.and_then(|file| file.into_path().ok()) else {
            return Ok(None);
        };
        let Some((_, target)) = native_save_path(&normalized, rom_path, Some("savestate")) else {
            return Ok(None);
        };
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        fs::copy(&source, &target).map_err(|error| error.to_string())?;
        return Ok(Some(target.to_string_lossy().to_string()));
    }

    Err("Esta consola no soporta saves locales manuales todavia.".to_string())
}

#[tauri::command]
fn download_drive_rom_for_native(
    console_id: String,
    file_id: String,
    file_name: String,
    access_token: String,
) -> Result<String, String> {
    let normalized = console_id.trim().to_lowercase();
    if get_engine_config(&normalized).is_none() {
        return Err("Esta consola aun no tiene motor nativo configurado.".to_string());
    }

    let safe_name = sanitize_file_name(&file_name);
    let cache_dir = local_app_data_dir().join("roms").join(&normalized);
    fs::create_dir_all(&cache_dir).map_err(|error| error.to_string())?;
    let target = cache_dir.join(format!("{}_{}", sanitize_file_name(&file_id), safe_name));
    let temp_target = cache_dir.join(format!(
        "{}.download",
        sanitize_file_name(&file_id)
    ));

    if target.is_dir() {
        fs::remove_dir_all(&target).map_err(|error| error.to_string())?;
    }

    if target.exists() && target.metadata().map(|meta| meta.len()).unwrap_or(0) > 0 {
        return Ok(target.to_string_lossy().to_string());
    }
    if target.exists() {
        fs::remove_file(&target).map_err(|error| error.to_string())?;
    }
    if temp_target.exists() {
        if temp_target.is_dir() {
            fs::remove_dir_all(&temp_target).map_err(|error| error.to_string())?;
        } else {
            fs::remove_file(&temp_target).map_err(|error| error.to_string())?;
        }
    }

    let script = "$ErrorActionPreference='Stop'; \
      $ProgressPreference='SilentlyContinue'; \
      $dir = [Environment]::GetEnvironmentVariable('FORBIDDENS_ROM_DIR'); \
      $out = [Environment]::GetEnvironmentVariable('FORBIDDENS_ROM_PATH'); \
      $tmp = [Environment]::GetEnvironmentVariable('FORBIDDENS_ROM_TEMP_PATH'); \
      [System.IO.Directory]::CreateDirectory($dir) | Out-Null; \
      if (Test-Path -LiteralPath $tmp) { Remove-Item -LiteralPath $tmp -Force -Recurse } \
      $uri = \"https://www.googleapis.com/drive/v3/files/$($env:FORBIDDENS_DRIVE_FILE_ID)?alt=media\"; \
      try { \
        $client = New-Object System.Net.WebClient; \
        $client.Headers.Add('Authorization', \"Bearer $($env:FORBIDDENS_DRIVE_TOKEN)\"); \
        $client.DownloadFile($uri, $tmp); \
        if (-not (Test-Path -LiteralPath $tmp -PathType Leaf)) { throw 'No se pudo crear el archivo temporal de la ROM.' } \
        if ((Get-Item -LiteralPath $tmp).Length -le 0) { throw 'Google Drive entrego una descarga vacia.' } \
        Move-Item -LiteralPath $tmp -Destination $out -Force \
      } catch { \
        $status = 0; \
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { $status = [int]$_.Exception.Response.StatusCode } \
        if ($status -eq 404) { throw 'Google Drive no encontro esta ROM. Vuelve a sincronizar Drive con la misma cuenta donde esta RetroRoms y selecciona la ROM nuevamente.' } \
        if ($status -eq 401 -or $status -eq 403) { throw 'Google Drive rechazo el permiso de descarga. Autoriza Drive otra vez con la cuenta correcta.' } \
        throw \
      }";

    let mut command = powershell_command(script);
    command.env("FORBIDDENS_ROM_DIR", &cache_dir);
    command.env("FORBIDDENS_ROM_PATH", &target);
    command.env("FORBIDDENS_ROM_TEMP_PATH", &temp_target);
    command.env("FORBIDDENS_DRIVE_FILE_ID", file_id.trim());
    command.env("FORBIDDENS_DRIVE_TOKEN", access_token.trim());
    run_hidden(command)?;

    if target.exists() {
        Ok(target.to_string_lossy().to_string())
    } else {
        Err("No se pudo guardar la ROM en cache local.".to_string())
    }
}

#[tauri::command]
fn start_drive_rom_download_for_native(
    app: AppHandle,
    console_id: String,
    file_id: String,
    file_name: String,
    access_token: String,
) -> Result<NativeDownloadJob, String> {
    let normalized = console_id.trim().to_lowercase();
    if get_engine_config(&normalized).is_none() {
        return Err("Esta consola aun no tiene motor nativo configurado.".to_string());
    }

    let safe_name = sanitize_file_name(&file_name);
    let safe_id = sanitize_file_name(&file_id);
    let cache_dir = local_app_data_dir().join("roms").join(&normalized);
    fs::create_dir_all(&cache_dir).map_err(|error| error.to_string())?;
    let target = cache_dir.join(format!("{}_{}", safe_id, safe_name));
    let temp_target = cache_dir.join(format!("{}.download", safe_id));
    let cached = target.exists() && target.metadata().map(|meta| meta.len()).unwrap_or(0) > 0;
    let job = NativeDownloadJob {
        job_id: native_download_job_id("drive", &file_id),
        console_id: normalized.clone(),
        game_id: file_id.trim().to_string(),
        file_name: safe_name,
        rom_path: target.to_string_lossy().to_string(),
        cached,
    };
    if cached {
        return Ok(job);
    }

    let url = format!(
        "https://www.googleapis.com/drive/v3/files/{}?alt=media",
        file_id.trim()
    );
    let auth_header = format!("Bearer {}", access_token.trim());
    download_url_with_progress(app, job.clone(), url, Some(auth_header), temp_target, target);
    Ok(job)
}

#[tauri::command]
fn download_remote_rom_for_native(
    console_id: String,
    game_id: String,
    file_name: String,
    rom_url: String,
) -> Result<String, String> {
    let normalized = console_id.trim().to_lowercase();
    if get_engine_config(&normalized).is_none() {
        return Err("Esta consola aun no tiene motor nativo configurado.".to_string());
    }

    let trimmed_url = rom_url.trim();
    if !(trimmed_url.starts_with("https://") || trimmed_url.starts_with("http://")) {
        return Err("La ROM publica no tiene una URL valida.".to_string());
    }

    let safe_name = sanitize_file_name(&file_name);
    let safe_id = sanitize_file_name(&game_id);
    let cache_dir = local_app_data_dir().join("roms").join("public").join(&normalized);
    fs::create_dir_all(&cache_dir).map_err(|error| error.to_string())?;
    let target = cache_dir.join(format!("{}_{}", safe_id, safe_name));
    let temp_target = cache_dir.join(format!("{}.download", safe_id));

    if target.is_dir() {
        fs::remove_dir_all(&target).map_err(|error| error.to_string())?;
    }
    if target.exists() && target.metadata().map(|meta| meta.len()).unwrap_or(0) > 0 {
        return Ok(target.to_string_lossy().to_string());
    }
    if target.exists() {
        fs::remove_file(&target).map_err(|error| error.to_string())?;
    }
    if temp_target.exists() {
        if temp_target.is_dir() {
            fs::remove_dir_all(&temp_target).map_err(|error| error.to_string())?;
        } else {
            fs::remove_file(&temp_target).map_err(|error| error.to_string())?;
        }
    }

    download_file(trimmed_url, &temp_target)?;
    if !temp_target.exists() || temp_target.metadata().map(|meta| meta.len()).unwrap_or(0) == 0 {
        let _ = fs::remove_file(&temp_target);
        return Err("No se pudo descargar la ROM publica.".to_string());
    }
    fs::rename(&temp_target, &target).map_err(|error| error.to_string())?;

    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
fn start_remote_rom_download_for_native(
    app: AppHandle,
    console_id: String,
    game_id: String,
    file_name: String,
    rom_url: String,
) -> Result<NativeDownloadJob, String> {
    let normalized = console_id.trim().to_lowercase();
    if get_engine_config(&normalized).is_none() {
        return Err("Esta consola aun no tiene motor nativo configurado.".to_string());
    }

    let trimmed_url = rom_url.trim();
    if !(trimmed_url.starts_with("https://") || trimmed_url.starts_with("http://")) {
        return Err("La ROM publica no tiene una URL valida.".to_string());
    }

    let safe_name = sanitize_file_name(&file_name);
    let safe_id = sanitize_file_name(&game_id);
    let cache_dir = local_app_data_dir().join("roms").join("public").join(&normalized);
    fs::create_dir_all(&cache_dir).map_err(|error| error.to_string())?;
    let target = cache_dir.join(format!("{}_{}", safe_id, safe_name));
    let temp_target = cache_dir.join(format!("{}.download", safe_id));
    let cached = target.exists() && target.metadata().map(|meta| meta.len()).unwrap_or(0) > 0;
    let job = NativeDownloadJob {
        job_id: native_download_job_id("remote", &game_id),
        console_id: normalized,
        game_id: game_id.trim().to_string(),
        file_name: safe_name,
        rom_path: target.to_string_lossy().to_string(),
        cached,
    };
    if cached {
        return Ok(job);
    }

    download_url_with_progress(app, job.clone(), trimmed_url.to_string(), None, temp_target, target);
    Ok(job)
}

#[tauri::command]
fn open_drive_rom_native(
    app: AppHandle,
    console_id: String,
    file_id: String,
    file_name: String,
    access_token: String,
) -> Result<NativeEmulatorLaunchResult, String> {
    let path = download_drive_rom_for_native(console_id.clone(), file_id, file_name, access_token)?;
    open_native_emulator(app, console_id, Some(path))
}

#[tauri::command]
fn open_remote_rom_native(
    app: AppHandle,
    console_id: String,
    game_id: String,
    file_name: String,
    rom_url: String,
) -> Result<NativeEmulatorLaunchResult, String> {
    let path = download_remote_rom_for_native(console_id.clone(), game_id, file_name, rom_url)?;
    open_native_emulator(app, console_id, Some(path))
}

fn ppsspp_candidates() -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    if let Ok(program_files) = env::var("ProgramFiles") {
        let base = PathBuf::from(program_files).join("PPSSPP");
        candidates.push(base.join("PPSSPPWindows64.exe"));
        candidates.push(base.join("PPSSPPWindows.exe"));
    }

    if let Ok(program_files_x86) = env::var("ProgramFiles(x86)") {
        candidates.push(
            PathBuf::from(program_files_x86)
                .join("PPSSPP")
                .join("PPSSPPWindows.exe"),
        );
    }

    if let Ok(local_app_data) = env::var("LOCALAPPDATA") {
        let base = PathBuf::from(local_app_data).join("PPSSPP");
        candidates.push(base.join("PPSSPPWindows64.exe"));
        candidates.push(base.join("PPSSPPWindows.exe"));
    }

    candidates
}

fn find_ppsspp() -> Option<PathBuf> {
    ppsspp_candidates().into_iter().find(|path| path.exists())
}

#[tauri::command]
fn detect_ppsspp_native() -> Option<String> {
    get_engine_config("psp")
        .and_then(|config| find_native_engine(&config))
        .or_else(find_ppsspp)
        .map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
fn open_ppsspp_native(
    app: AppHandle,
    rom_path: Option<String>,
) -> Result<NativeEmulatorLaunchResult, String> {
    open_native_emulator(app, "psp".to_string(), rom_path)
}

pub fn run() {
    tauri::Builder::default()
        .append_invoke_initialization_script(LAUNCHER_BRIDGE_SCRIPT)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            launcher_info,
            open_external_url,
            check_launcher_update,
            restart_launcher,
            start_launcher_drag,
            launcher_window_action,
            native_engine_status,
            install_native_engine,
            reinstall_native_engine,
            native_bios_status,
            import_native_bios,
            import_native_bios_folder,
            select_native_bios,
            pick_native_rom,
            open_native_emulator,
            close_native_emulator,
            set_native_emulator_state,
            sync_native_companion_layout,
            native_emulator_action,
            set_native_emulator_volume,
            read_native_save_file,
            write_native_save_file,
            export_native_local_save,
            import_native_local_save,
            start_drive_rom_download_for_native,
            start_remote_rom_download_for_native,
            download_drive_rom_for_native,
            open_drive_rom_native,
            download_remote_rom_for_native,
            open_remote_rom_native,
            detect_ppsspp_native,
            open_ppsspp_native
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("FORBIDDENS");
            }
            monitor_launcher_window_state(app.handle().clone());
            check_update_on_start(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running FORBIDDENS launcher");
}
