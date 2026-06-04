# FORBIDDENS native engines

El launcher puede usar emuladores nativos cuando el usuario abre el website desde el `.exe`.
En navegador normal el website sigue usando los emuladores web.

## Paquetes esperados

Los paquetes portables ahora se descargan desde GitHub Releases:

```text
https://github.com/earancibialgraficas/forbiddensASSETS/releases/tag/emulators-v1
```

Nombres que espera el launcher:

```text
ppsspp_win.zip
pcsx2-v2.6.3-windows-x64-Qt.zip
duckstation-windows-x64-release.zip
melonDS_0.9.5_win_x64.zip
RetroArch-Win64.zip
```

El launcher verifica el SHA256 del archivo descargado antes de extraerlo:

```text
duckstation: a8a61c8f9c783ea5737a297f2a3d1470ca3597a6ddcb67b0d7410306c1d9e59e
melonDS:     289b1644004d8762987dc1daf3a61eedfafb0a5f442801bfb9d2a18299fd39a9
pcsx2:       6d666a18011878faf422934a1e0d7307110f7e57a3d4e4dbfe5a6127cce7514d
ppsspp:      a60f04ebdb0b5f1655422bd7f88349a46999b17ad5115d6ddb290c3934bd5163
retroarch:   45341b02820cb7df45ddc48a7f325b9dea6bf3f30d10f88f805e34810eb49f6a
```

Si cambias o reemplazas un ZIP en el release, actualiza tambien el hash correspondiente en `desktop-launcher/src-tauri/src/lib.rs` antes de compilar un nuevo launcher.

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
4. Si el motor no esta instalado, el launcher descarga el ZIP desde GitHub Releases.
5. El launcher valida el SHA256 y descomprime el ZIP.
6. Si el juego viene de Drive, primero se descarga a cache local.
7. El launcher abre el emulador nativo con la ruta local.
