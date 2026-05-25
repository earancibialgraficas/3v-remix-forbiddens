# FORBIDDENS native engines

El launcher puede usar emuladores nativos cuando el usuario abre el website desde el `.exe`.
En navegador normal el website sigue usando los emuladores web.

## Paquetes esperados

Sube paquetes `.zip` portables a:

```text
https://forbiddens.net/desktop/engines/
```

Nombres configurados:

```text
ppsspp-windows-x64.zip
pcsx2-windows-x64.zip
duckstation-windows-x64.zip
melonds-windows-x64.zip
retroarch-windows-x64.zip
```

Cada zip debe contener el ejecutable del emulador. El launcher busca el ejecutable en cualquier subcarpeta si no queda justo en la raiz esperada.

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

