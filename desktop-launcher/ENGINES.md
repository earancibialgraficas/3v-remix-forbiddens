# FORBIDDENS native engines

El launcher puede usar emuladores nativos cuando el usuario abre el website desde el `.exe`.
En navegador normal el website sigue usando los emuladores web.

## Paquetes esperados

Sube los paquetes portables al bucket publico:

```text
https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/
```

Nombres que espera el launcher:

```text
ppsspp_win.zip
pcsx2-v2.6.3-windows-x64-Qt.zip.part001.zip
pcsx2-v2.6.3-windows-x64-Qt.zip.part002.zip
duckstation-windows-x64-release.zip.part001.zip
duckstation-windows-x64-release.zip.part002.zip
melonDS_0.9.5_win_x64.zip
RetroArch.zip.part001.zip
RetroArch.zip.part002.zip
RetroArch.zip.part003.zip
RetroArch.zip.part004.zip
RetroArch.zip.part005.zip
RetroArch.zip.part006.zip
RetroArch.zip.part007.zip
```

Supabase Free no permite archivos de mas de 50 MB por subida. Para paquetes grandes, divide el archivo en partes de 45 MB y sube todas las partes al bucket con esos nombres exactos. Todos los archivos que se suben terminan en `.zip`, incluso cuando son partes de un zip grande.

Ejemplo PowerShell para dividir un archivo:

```powershell
$source = "C:\Users\Orphen\Desktop\foro\juegos\emuladores\RetroArch.zip"
$chunkSize = 45MB
$buffer = New-Object byte[] $chunkSize
$stream = [System.IO.File]::OpenRead($source)
$index = 1
try {
  while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
    $part = "{0}.part{1:D3}.zip" -f $source, $index
    $out = [System.IO.File]::Open($part, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    try { $out.Write($buffer, 0, $read) } finally { $out.Close() }
    $index++
  }
} finally {
  $stream.Close()
}
```

Ejecuta el mismo comando cambiando `$source` a `duckstation-windows-x64-release.zip` o `pcsx2-v2.6.3-windows-x64-Qt.zip`. Si tu split genera mas o menos partes que las configuradas arriba, actualiza `desktop-launcher/src-tauri/src/lib.rs` antes de compilar el launcher.

Cada paquete debe contener el ejecutable del emulador. El launcher busca el ejecutable en cualquier subcarpeta si no queda justo en la raiz esperada.

## Donde se instalan

```text
%LOCALAPPDATA%\FORBIDDENS\engines\
```

Las ROMs de Drive se cachean en:

```text
%LOCALAPPDATA%\FORBIDDENS\roms\
```

## Flujo

1. El usuario entra desde FORBIDDENS Launcher.
2. El website detecta `window.forbiddensLauncher`.
3. El boton nativo aparece solo en el launcher.
4. Si el motor no esta instalado, el launcher descarga y descomprime el zip.
5. Si el juego viene de Drive, primero se descarga a cache local.
6. El launcher abre el emulador nativo con la ruta local.
