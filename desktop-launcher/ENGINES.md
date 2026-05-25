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
pcsx2-v2.6.3-windows-x64-Qt.7z
duckstation-windows-x64-release.zip.001
duckstation-windows-x64-release.zip.002
melonDS_0.9.5_win_x64.zip
RetroArch.7z.001
RetroArch.7z.002
RetroArch.7z.003
RetroArch.7z.004
RetroArch.7z.005
```

Supabase Free no permite archivos de mas de 50 MB por subida. Para paquetes grandes, divide el archivo en partes de 45 MB y sube todas las partes al bucket con esos nombres exactos.

Ejemplo PowerShell para dividir un archivo:

```powershell
$source = "C:\Users\Orphen\Desktop\foro\juegos\emuladores\RetroArch.7z"
$chunkSize = 45MB
$buffer = New-Object byte[] $chunkSize
$stream = [System.IO.File]::OpenRead($source)
$index = 1
try {
  while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
    $part = "{0}.{1:D3}" -f $source, $index
    $out = [System.IO.File]::Open($part, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write)
    try { $out.Write($buffer, 0, $read) } finally { $out.Close() }
    $index++
  }
} finally {
  $stream.Close()
}
```

Ejecuta el mismo comando cambiando `$source` a `duckstation-windows-x64-release.zip`. Si tu split genera mas o menos partes que las configuradas arriba, actualiza `desktop-launcher/src-tauri/src/lib.rs` antes de compilar el launcher.

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
