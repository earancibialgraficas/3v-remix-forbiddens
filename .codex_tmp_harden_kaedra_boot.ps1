$ErrorActionPreference = 'Stop'

$project = 'C:\Users\Orphen\Desktop\widgets\proyectos\kaedra-player'
$appJs = Join-Path $project 'ui\app.js'
$packageJson = Join-Path $project 'package.json'
$tauriConf = Join-Path $project 'src-tauri\tauri.conf.json'
$cargoToml = Join-Path $project 'src-tauri\Cargo.toml'

$js = [System.IO.File]::ReadAllText($appJs)
$old = @'
function init() {
  normalizeState();
  if (isPanelWindow) {
    document.body.classList.add("panel-window-body");
    app.classList.add("panel-window-mode", "panel-side-reset");
  } else {
    app.classList.add("main-window-mode", "portal-compact");
  }
  applyWidgetSize(false);
  app.dataset.activePanel = activePanel;
  populateTextSizeOptions();
  renderSkinOptions();
  render();
  bindEvents();
  try {
    ensureFloatingPlaylistPicker();
  } catch (error) {
    console.warn("Playlist picker enhancement failed", error);
  }
  try {
    enhancePanelSelects();
  } catch (error) {
    console.warn("Panel select enhancement failed", error);
  }
  hydrateStartupSetting();
  if (!isPanelWindow) {
    setupMediaSession();
    setupNativeMediaKeys();
    setupNativeAudioVisualizer();
  }
  buildEqualizer();
  updatePanelSide();
  setupPanelChannel();
  if (isPanelWindow) {
    app.dataset.panelSide = new URLSearchParams(window.location.search).get("side") || "right";
    setPanelUi(new URLSearchParams(window.location.search).get("tab") || "playlist");
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        app.classList.remove("panel-side-reset");
        slidePanel.classList.add("open");
      });
    });
  } else {
    syncCompactBounds().then(() => syncHitRegion(false)).catch(() => {});
    window.addEventListener("resize", updatePanelSide);
  }
  window.setTimeout(() => {
    prepareTutorialStorageKey().finally(maybeStartTutorial);
  }, isPanelWindow ? 240 : 760);
}
'@

$new = @'
function init() {
  try {
    normalizeState();
    if (isPanelWindow) {
      document.body.classList.add("panel-window-body");
      app.classList.add("panel-window-mode", "panel-side-reset");
    } else {
      app.classList.add("main-window-mode", "portal-compact");
    }
    applyWidgetSize(false);
    app.dataset.activePanel = activePanel;
  } catch (error) {
    console.error("Critical boot setup failed", error);
  }

  try {
    bindEvents();
  } catch (error) {
    console.error("Critical event binding failed", error);
  }

  try {
    populateTextSizeOptions();
    renderSkinOptions();
    render();
  } catch (error) {
    console.error("Initial render failed", error);
  }

  try {
    ensureFloatingPlaylistPicker();
  } catch (error) {
    console.warn("Playlist picker enhancement failed", error);
  }
  try {
    enhancePanelSelects();
  } catch (error) {
    console.warn("Panel select enhancement failed", error);
  }
  try {
    hydrateStartupSetting();
  } catch (error) {
    console.warn("Startup setting hydration failed", error);
  }
  try {
    if (!isPanelWindow) {
      setupMediaSession();
      setupNativeMediaKeys();
      setupNativeAudioVisualizer();
    }
  } catch (error) {
    console.warn("Native integration setup failed", error);
  }
  try {
    buildEqualizer();
  } catch (error) {
    console.warn("Equalizer setup failed", error);
  }
  try {
    updatePanelSide();
    setupPanelChannel();
  } catch (error) {
    console.warn("Panel channel setup failed", error);
  }
  if (isPanelWindow) {
    try {
      app.dataset.panelSide = new URLSearchParams(window.location.search).get("side") || "right";
      setPanelUi(new URLSearchParams(window.location.search).get("tab") || "playlist");
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          app.classList.remove("panel-side-reset");
          slidePanel.classList.add("open");
        });
      });
    } catch (error) {
      console.warn("Panel window activation failed", error);
    }
  } else {
    syncCompactBounds().then(() => syncHitRegion(false)).catch(() => {});
    window.addEventListener("resize", updatePanelSide);
  }
  window.setTimeout(() => {
    prepareTutorialStorageKey().finally(maybeStartTutorial);
  }, isPanelWindow ? 240 : 760);
}
'@

if (-not $js.Contains($old)) {
  throw 'No se encontro init() esperado para blindar arranque'
}
$js = $js.Replace($old, $new)
$js = $js.Replace('const appVersion = "0.1.124";', 'const appVersion = "0.1.125";')
[System.IO.File]::WriteAllText($appJs, $js, [System.Text.UTF8Encoding]::new($false))

foreach ($file in @($packageJson, $tauriConf, $cargoToml)) {
  $text = [System.IO.File]::ReadAllText($file)
  $text = $text.Replace('0.1.124', '0.1.125').Replace('0.1.123', '0.1.125')
  [System.IO.File]::WriteAllText($file, $text, [System.Text.UTF8Encoding]::new($false))
}

Write-Host 'KAEDRA PLAYER boot hardening applied for 0.1.125'
