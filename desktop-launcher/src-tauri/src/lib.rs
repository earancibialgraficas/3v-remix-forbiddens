use std::{
    env, fs, io,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    thread,
    time::Duration,
};

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

const WEBSITE_URL: &str = "https://forbiddens.net/?launcher_version=0.1.23";
const LAUNCHER_DOWNLOAD_URL: &str = "https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/FORBIDDENS_0.1.23_x64-setup.exe";
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
    downloadDriveRomForNative: function (args) { return invoke("download_drive_rom_for_native", args || {}); },
    openDriveRomNative: function (args) { return invoke("open_drive_rom_native", args || {}); },
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
    command
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
    let minimum_companion_width = 340.min(size.width);
    let companion_width = (size.width / 5).max(minimum_companion_width);
    let emulator_width = size.width.saturating_sub(companion_width);
    Some((
        position.x,
        position.y,
        size.width,
        size.height,
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
    let Some((x, y, screen_width, screen_height, _emulator_width, _companion_width)) =
        screen_layout(app)
    else {
        return;
    };

    let width = screen_width.min(1280).max(1024);
    let height = screen_height.min(820).max(650);
    let target_x = x + ((screen_width.saturating_sub(width)) / 2) as i32;
    let target_y = y + ((screen_height.saturating_sub(height)) / 2) as i32;

    let _ = window.set_min_size(Some(PhysicalSize::new(1024, 650)));
    let _ = window.set_position(PhysicalPosition::new(target_x, target_y));
    let _ = window.set_size(PhysicalSize::new(width, height));
}

#[cfg(windows)]
struct WindowSearch {
    process_id: u32,
    hwnd: isize,
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
}

#[cfg(windows)]
unsafe extern "system" fn enum_windows_for_process(hwnd: isize, l_param: isize) -> i32 {
    if IsWindowVisible(hwnd) == 0 {
        return 1;
    }

    let search = &mut *(l_param as *mut WindowSearch);
    let mut window_process_id = 0u32;
    GetWindowThreadProcessId(hwnd, &mut window_process_id as *mut u32);
    if window_process_id == search.process_id {
        search.hwnd = hwnd;
        return 0;
    }
    1
}

#[cfg(windows)]
fn native_process_window_minimized(process_id: u32) -> Option<bool> {
    let mut search = WindowSearch {
        process_id,
        hwnd: 0,
    };
    unsafe {
        EnumWindows(
            Some(enum_windows_for_process),
            &mut search as *mut WindowSearch as isize,
        );
        if search.hwnd == 0 {
            None
        } else {
            Some(IsIconic(search.hwnd) != 0)
        }
    }
}

#[cfg(not(windows))]
fn native_process_window_minimized(_process_id: u32) -> Option<bool> {
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
    NativeEngineStatus {
        console_id: config.console_id.to_string(),
        engine_name: config.engine_name.to_string(),
        native_supported: true,
        install_supported: !config.package_urls.is_empty(),
        installed: executable_path.is_some(),
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

    if find_native_engine(&config).is_some() {
        return Ok(native_engine_status(normalized));
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
        let Some(core_path) = find_retroarch_core(&engine_path, &normalized) else {
            return Err(format!(
                "RetroArch esta instalado, pero falta el core {}. Reinstala el emulador desde FORBIDDENS Launcher.",
                core_name
            ));
        };
        command.arg("-L").arg(core_path);
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
      $p = Get-Process -Id $processId -ErrorAction SilentlyContinue; \
      if ($p) { \
        if ($p.MainWindowHandle -ne 0) { $null = $p.CloseMainWindow(); Start-Sleep -Milliseconds 900; $p.Refresh() } \
        if (-not $p.HasExited) { Stop-Process -Id $processId -Force } \
      }";
    let mut command = powershell_command(script);
    command.env("FORBIDDENS_EMU_PID", process_id.to_string());
    run_hidden(command)
}

#[tauri::command]
fn set_native_emulator_state(process_id: u32, action: String) -> Result<(), String> {
    let normalized = action.trim().to_lowercase();
    let show_command = match normalized.as_str() {
        "minimize" => "6",
        "restore" | "show" | "maximize" => "9",
        _ => return Err("Accion de ventana no soportada.".to_string()),
    };

    let script = "$ErrorActionPreference='SilentlyContinue'; \
      Add-Type 'using System; using System.Runtime.InteropServices; public class ForbiddensWinState { [DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow); }'; \
      $processId = [int]$env:FORBIDDENS_EMU_PID; \
      $p = Get-Process -Id $processId -ErrorAction SilentlyContinue; \
      if ($p -and $p.MainWindowHandle -ne 0) { [ForbiddensWinState]::ShowWindowAsync($p.MainWindowHandle, [int]$env:FORBIDDENS_SHOW_CMD) | Out-Null }";
    let mut command = powershell_command(script);
    command.env("FORBIDDENS_EMU_PID", process_id.to_string());
    command.env("FORBIDDENS_SHOW_CMD", show_command);
    run_hidden(command)
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
            download_drive_rom_for_native,
            open_drive_rom_native,
            detect_ppsspp_native,
            open_ppsspp_native
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("FORBIDDENS");
            }
            check_update_on_start(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running FORBIDDENS launcher");
}
