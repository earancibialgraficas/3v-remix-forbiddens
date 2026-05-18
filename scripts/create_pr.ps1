Param(
  [switch]$Force
)

function Fail($msg) {
  Write-Host "ERROR: $msg" -ForegroundColor Red
  exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Fail 'git no está instalado o no está en PATH. Instala git y vuelve a ejecutar este script.'
}
if (-not (Get-Command node -ErrorAction SilentlyContinue) -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Fail 'node/npm no están instalados o no están en PATH. Instala Node.js y npm y vuelve a ejecutar este script.'
}

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$branch = "fix/preserve-playlist-$timestamp"

Write-Host "Creando branch: $branch"
git checkout -b $branch
if ($LASTEXITCODE -ne 0) { Fail 'No se pudo crear el branch con git.' }

Write-Host "Instalando dependencias..."
npm install
if ($LASTEXITCODE -ne 0) { Fail 'npm install falló.' }

Write-Host "Comprobando TypeScript..."
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Fail 'Comprobación TypeScript falló. Revisa errores antes de continuar.' }

Write-Host "Ejecutando tests..."
npm test
if ($LASTEXITCODE -ne 0) { Fail 'Algunos tests fallaron. Revisa la salida de tests.' }

Write-Host "Preparando commit..."
git add -A
git commit -m "fix: preserve playlist when switching music room; add test(MultiplayerSharedMusicPlayer)"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Nada para commitear o commit fallido. Continuando..." -ForegroundColor Yellow
}

Write-Host "Pusheando branch a origin..."
git push -u origin $branch
if ($LASTEXITCODE -ne 0) { Fail 'git push falló. Verifica permisos y conexión remota.' }

if (Get-Command gh -ErrorAction SilentlyContinue) {
  Write-Host "Creando PR con gh CLI..."
  if (Test-Path PR_BODY.md) {
    gh pr create --title "Fix: preserve playlist when switching music room" --body-file PR_BODY.md
  } else {
    gh pr create --fill
  }
  if ($LASTEXITCODE -ne 0) { Write-Host "gh pr create falló o fue cancelado." -ForegroundColor Yellow }
} else {
  $remote = git config --get remote.origin.url
  if (-not $remote) { Write-Host "Branch push hecho. No tengo URL remota para generar enlace automático."; exit 0 }
  $repo = $remote -replace '^(?:git@|https://)github.com[:/]', '' -replace '\.git$', ''
  $base = 'main'
  $url = "https://github.com/$repo/compare/$base...$branch?expand=1"
  Write-Host "Branch push hecho. Crea el PR manualmente en:"
  Write-Host $url -ForegroundColor Cyan
}

Write-Host "Hecho." -ForegroundColor Green
