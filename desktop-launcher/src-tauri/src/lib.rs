use std::{
    env, fs,
    path::{Path, PathBuf},
    process::Command,
};

use serde::Serialize;
use tauri::{AppHandle, Manager};
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

  var openExternal = function (url) {
    var href = toAbsoluteUrl(url);
    if (!href) return Promise.resolve(false);
    return invoke("open_external_url", { url: href }).then(function () {
      return true;
    }).catch(function (error) {
      console.warn("[FORBIDDENS Launcher] No se pudo abrir fuera del launcher", error);
      return false;
    });
  };

  window.forbiddensLauncher = Object.assign({}, window.forbiddensLauncher || {}, {
    openExternal: openExternal,
    launcherInfo: function () { return invoke("launcher_info"); },
    checkUpdate: function () { return invoke("check_launcher_update"); },
    restartLauncher: function () { return invoke("restart_launcher"); },
    nativeEngineStatus: function (consoleId) { return invoke("native_engine_status", { consoleId: consoleId }); },
    installNativeEngine: function (consoleId) { return invoke("install_native_engine", { consoleId: consoleId }); },
    pickNativeRom: function (consoleId) { return invoke("pick_native_rom", { consoleId: consoleId }); },
    openNativeEmulator: function (consoleId, romPath) { return invoke("open_native_emulator", { consoleId: consoleId, romPath: romPath || null }); },
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

    let status = command.status().map_err(|error| error.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("El proceso termino con codigo {status}."))
    }
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

    let script = "$ErrorActionPreference='Stop'; \
      $ProgressPreference='SilentlyContinue'; \
      New-Item -ItemType Directory -Force -Path $env:FORBIDDENS_ENGINE_ROOT | Out-Null; \
      $urls = $env:FORBIDDENS_ENGINE_URLS -split \"`n\" | Where-Object { $_.Trim().Length -gt 0 }; \
      $archive = Join-Path $env:FORBIDDENS_ENGINE_ROOT $env:FORBIDDENS_ENGINE_ARCHIVE; \
      if ($urls.Count -eq 1) { \
        Invoke-WebRequest -Uri $urls[0] -OutFile $archive -UseBasicParsing; \
      } else { \
        $output = [System.IO.File]::Open($archive, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write); \
        try { \
          for ($i = 0; $i -lt $urls.Count; $i++) { \
            $part = Join-Path $env:FORBIDDENS_ENGINE_ROOT ('part_' + $i.ToString('000')); \
            Invoke-WebRequest -Uri $urls[$i] -OutFile $part -UseBasicParsing; \
            $input = [System.IO.File]::OpenRead($part); \
            try { $input.CopyTo($output) } finally { $input.Close() }; \
            Remove-Item -LiteralPath $part -Force; \
          } \
        } finally { $output.Close() } \
      }; \
      $ext = [System.IO.Path]::GetExtension($archive); \
      if ($ext.ToLowerInvariant() -eq '.zip') { \
        Expand-Archive -LiteralPath $archive -DestinationPath $env:FORBIDDENS_ENGINE_ROOT -Force; \
      } else { \
        tar -xf $archive -C $env:FORBIDDENS_ENGINE_ROOT; \
      }; \
      Remove-Item -LiteralPath $archive -Force";

    let mut command = powershell_command(script);
    command.env("FORBIDDENS_ENGINE_ROOT", &root);
    command.env("FORBIDDENS_ENGINE_URLS", config.package_urls.join("\n"));
    command.env("FORBIDDENS_ENGINE_ARCHIVE", config.package_file_name);
    run_hidden(command)?;

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
fn open_native_emulator(console_id: String, rom_path: Option<String>) -> Result<String, String> {
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

    command.spawn().map_err(|error| error.to_string())?;
    Ok(engine_path.to_string_lossy().to_string())
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
    console_id: String,
    file_id: String,
    file_name: String,
    access_token: String,
) -> Result<String, String> {
    let path = download_drive_rom_for_native(console_id.clone(), file_id, file_name, access_token)?;
    open_native_emulator(console_id, Some(path.clone()))?;
    Ok(path)
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
fn open_ppsspp_native(rom_path: Option<String>) -> Result<String, String> {
    open_native_emulator("psp".to_string(), rom_path)
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
            native_engine_status,
            install_native_engine,
            pick_native_rom,
            open_native_emulator,
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
