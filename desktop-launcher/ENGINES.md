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

## BIOS de PlayStation 2

PCSX2 necesita una BIOS extraida legalmente de una consola del propio usuario. FORBIDDENS no la descarga ni la distribuye desde un CDN.

Cuando PCSX2 ya esta instalado, la pagina de emuladores muestra un gestor local. El launcher:

1. Permite elegir un archivo `.bin` o `.rom` local.
2. Comprueba que su tamano sea razonable antes de copiarlo.
3. Lo guarda en la carpeta `bios` de la instalacion portable de PCSX2.
4. Detecta una region estimada por el nombre del archivo y permite elegir la BIOS activa.
5. Escribe la seleccion en `[Filenames] BIOS` dentro del `PCSX2.ini` portable.

Tambien se puede elegir una carpeta existente de PCSX2. El launcher busca archivos validos dentro de esa carpeta y sus subcarpetas, los copia a la biblioteca portable de FORBIDDENS y conserva los originales intactos. Si la instalacion administrada por FORBIDDENS ya contiene BIOS, se detectan automaticamente y la primera se activa cuando todavia no existe una seleccion.
4. Crea el marcador `portable.ini` para mantener configuracion y BIOS dentro del motor instalado.
5. Impide abrir un juego de PS2 y muestra una explicacion si todavia no hay una BIOS importada.

No se debe incluir una BIOS en GitHub Releases, R2, el instalador ni el repositorio.
