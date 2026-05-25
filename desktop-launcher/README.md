# FORBIDDENS Desktop Launcher

Este launcher es una app instalable para PC que carga el website online sin tocar el codigo del sitio.

En modo desarrollo y en el `.exe` publicado carga `https://forbiddens.net/`.

## Que actualiza automaticamente

- Cambios del website: si la app carga `https://forbiddens.net/`, los usuarios ven los cambios apenas abras o recargues la app.
- Cambios del launcher: necesitan el updater de Tauri. Este MVP deja el esqueleto preparado, pero debes configurar firma y endpoint antes de publicar builds reales.

## Requisitos para compilar

- Node.js
- Rust
- WebView2 Runtime en Windows
- Dependencias de Tauri: https://tauri.app/start/prerequisites/

## Primer uso

```powershell
npm --prefix desktop-launcher install
npm run desktop:dev
```

## Crear el .exe

```powershell
npm run desktop:build
```

Este MVP deja el empaquetado de instalador desactivado para evitar errores de NSIS durante las primeras pruebas.
El ejecutable portable queda en:

```text
desktop-launcher/src-tauri/target/release/forbiddens_desktop_launcher.exe
```

Cuando quieras generar instalador, cambia `bundle.active` a `true` en `src-tauri/tauri.conf.json`.

## Crear instalador normal

```powershell
npm.cmd run desktop:build:installer
```

Si termina bien, el instalador queda en:

```text
desktop-launcher/src-tauri/target/release/bundle/nsis/
```

## Configurar actualizaciones del launcher

1. Genera claves de firma de Tauri:

```powershell
npm --prefix desktop-launcher exec tauri signer generate
```

2. Guarda la clave privada solo en CI/secretos.
3. Pega la clave publica en `src-tauri/tauri.conf.json`, dentro de `plugins.updater.pubkey`.
4. Cambia `plugins.updater.active` a `true`.
5. Publica un `latest.json` en tu servidor, por ejemplo:

```text
https://forbiddens.net/desktop/latest.json
```

6. Cuando publiques una version nueva, sube el instalador y actualiza ese JSON.

## Siguiente paso

Para abrir PPSSPP nativo desde la app, el website puede detectar que esta dentro de Tauri y llamar un comando nativo. Eso se puede agregar despues sin afectar a quienes entran por navegador normal.
