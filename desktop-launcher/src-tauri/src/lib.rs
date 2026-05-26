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

const WEBSITE_URL: &str = "https://forbiddens.net/";
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
        parsed.searchParams.set("redirect_uri", "https://forbiddens.net/");
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
    launcherWindowAction: function (action) { return invoke("launcher_window_action", { action: action }); },
    nativeEngineStatus: function (consoleId) { return invoke("native_engine_status", { consoleId: consoleId }); },
    installNativeEngine: function (consoleId) { return invoke("install_native_engine", { consoleId: consoleId }); },
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
                update
                    .download_and_install(|_, _| {}, || {})
                    .await
                    .map_err(|error| error.to_string())?;
                Ok(format!("installed:{version}"))
            }
            Ok(None) => Ok("up-to-date".to_string()),
            Err(error) => Err(error.to_string()),
        },
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn restart_launcher(app: AppHandle) {
    app.restart();
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
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "pcsx2-v2.6.3-windows-x64-Qt.zip.part001.zip"
        ),
        concat!(
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "pcsx2-v2.6.3-windows-x64-Qt.zip.part002.zip"
        ),
    ];
    const DUCKSTATION_PACKAGE_URLS: &[&str] = &[
        concat!(
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "duckstation-windows-x64-release.zip.part001.zip"
        ),
        concat!(
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "duckstation-windows-x64-release.zip.part002.zip"
        ),
    ];
    const RETROARCH_PACKAGE_URLS: &[&str] = &[
        concat!(
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "RetroArch.zip.part001.zip"
        ),
        concat!(
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "RetroArch.zip.part002.zip"
        ),
        concat!(
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "RetroArch.zip.part003.zip"
        ),
        concat!(
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "RetroArch.zip.part004.zip"
        ),
        concat!(
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "RetroArch.zip.part005.zip"
        ),
        concat!(
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "RetroArch.zip.part006.zip"
        ),
        concat!(
            "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
            "RetroArch.zip.part007.zip"
        ),
    ];

    vec![
        NativeEngineConfig {
            console_id: "psp",
            engine_name: "PPSSPP",
            package_urls: &[concat!(
                "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
                "ppsspp_win.zip"
            )],
            package_file_name: "ppsspp_win.zip",
            executable_rel: "PPSSPPWindows64.exe",
            download_page: "https://www.ppsspp.org/download/",
        },
        NativeEngineConfig {
            console_id: "ps2",
            engine_name: "PCSX2",
            package_urls: PCSX2_PACKAGE_URLS,
            package_file_name: "pcsx2-v2.6.3-windows-x64-Qt.zip",
            executable_rel: "pcsx2-qt.exe",
            download_page: "https://pcsx2.net/downloads/",
        },
        NativeEngineConfig {
            console_id: "ps1",
            engine_name: "DuckStation",
            package_urls: DUCKSTATION_PACKAGE_URLS,
            package_file_name: "duckstation-windows-x64-release.zip",
            executable_rel: "duckstation-qt-x64-ReleaseLTCG.exe",
            download_page: "https://www.duckstation.org/",
        },
        NativeEngineConfig {
            console_id: "ds",
            engine_name: "melonDS",
            package_urls: &[concat!(
                "https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/",
                "melonDS_0.9.5_win_x64.zip"
            )],
            package_file_name: "melonDS_0.9.5_win_x64.zip",
            executable_rel: "melonDS.exe",
            download_page: "https://melonds.kuribo64.net/downloads.php",
        },
        NativeEngineConfig {
            console_id: "nes",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch.zip",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "snes",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch.zip",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "gba",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch.zip",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "gbc",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch.zip",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "sega",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch.zip",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "n64",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch.zip",
            executable_rel: "RetroArch/retroarch.exe",
            download_page: "https://www.retroarch.com/?page=platforms",
        },
        NativeEngineConfig {
            console_id: "arcade",
            engine_name: "RetroArch",
            package_urls: RETROARCH_PACKAGE_URLS,
            package_file_name: "RetroArch.zip",
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

fn find_nested_executable(root: &Path, executable_name: &str) -> Option<PathBuf> {
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
        if path.is_dir() {
            if let Some(found) = find_nested_executable(&path, executable_name) {
                return Some(found);
            }
        }
    }
    None
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

    let mut command = Command::new(&engine_path);
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

    if target.exists() {
        return Ok(target.to_string_lossy().to_string());
    }

    let script = "$ErrorActionPreference='Stop'; \
      $ProgressPreference='SilentlyContinue'; \
      New-Item -ItemType Directory -Force -Path $env:FORBIDDENS_ROM_DIR | Out-Null; \
      $headers = @{ Authorization = \"Bearer $env:FORBIDDENS_DRIVE_TOKEN\" }; \
      $uri = \"https://www.googleapis.com/drive/v3/files/$env:FORBIDDENS_DRIVE_FILE_ID?alt=media\"; \
      Invoke-WebRequest -Uri $uri -Headers $headers -OutFile $env:FORBIDDENS_ROM_PATH -UseBasicParsing";

    let mut command = powershell_command(script);
    command.env("FORBIDDENS_ROM_DIR", &cache_dir);
    command.env("FORBIDDENS_ROM_PATH", &target);
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
            launcher_window_action,
            native_engine_status,
            install_native_engine,
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
