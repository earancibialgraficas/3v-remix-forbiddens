$ErrorActionPreference = "Stop"
$project = "C:\Users\Orphen\Desktop\widgets\proyectos\kaedra-player"
$cssPath = Join-Path $project "ui\styles.css"
$rustPath = Join-Path $project "src-tauri\src\lib.rs"
$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

$css = [System.IO.File]::ReadAllText($cssPath)
$recoveryCss = @'

/* KAEDRA recovery 0.1.123: the main widget window must be a normal clickable body.
   The side panel lives in its own native window, so the old portal offset cannot
   move or block the main player anymore. */
.widget.main-window-mode,
.widget.main-window-mode.portal-compact {
  width: var(--widget-w) !important;
  height: var(--widget-h) !important;
  pointer-events: auto !important;
  overflow: visible !important;
}

.widget.main-window-mode .main-shell,
.widget.main-window-mode.portal-compact .main-shell,
.widget.main-window-mode.panel-open .main-shell,
.widget.main-window-mode.panel-native-left[data-panel-side="left"] .main-shell {
  left: 0 !important;
  transform: none !important;
  opacity: 1 !important;
  visibility: visible !important;
  pointer-events: auto !important;
}

.widget.main-window-mode > .slide-panel {
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
}

.widget.main-window-mode .hitbox,
.widget.main-window-mode button,
.widget.main-window-mode .screen-frame,
.widget.main-window-mode .progress-track,
.widget.main-window-mode .volume-slider {
  pointer-events: auto !important;
}
'@
if ($css -notlike "*KAEDRA recovery 0.1.123*") {
  $css += $recoveryCss
}
[System.IO.File]::WriteAllText($cssPath, $css, $utf8NoBom)

$rust = [System.IO.File]::ReadAllText($rustPath)
$rust = $rust.Replace('let body_left = if state.open && state.side == "left" { panel_offset } else { 0 };', 'let body_left = 0;')
$rust = $rust.Replace('let body_right = body_left + width;', 'let body_right = width;')
[System.IO.File]::WriteAllText($rustPath, $rust, $utf8NoBom)

foreach ($file in @(
  (Join-Path $project "package.json"),
  (Join-Path $project "src-tauri\tauri.conf.json"),
  (Join-Path $project "src-tauri\Cargo.toml"),
  (Join-Path $project "ui\app.js")
)) {
  $text = [System.IO.File]::ReadAllText($file)
  $text = $text.Replace("0.1.122", "0.1.123").Replace("0.1.121", "0.1.123")
  [System.IO.File]::WriteAllText($file, $text, $utf8NoBom)
}

Write-Host "Restored main widget interaction CSS and bumped to 0.1.123"
