# FORBIDDENS Desktop Launcher

Este launcher es una app instalable para PC que carga el website online sin tocar el codigo del sitio.

En modo desarrollo y en el `.exe` publicado carga `https://forbiddens.net/`.

## Que actualiza automaticamente

- Cambios del website: si la app carga `https://forbiddens.net/`, los usuarios ven los cambios apenas abras o recargues la app.
- Cambios del launcher: usan el updater de Tauri contra el bucket publico `launcher-downloads` de Supabase.

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

El build normal deja el empaquetado de instalador desactivado para pruebas rapidas.
El ejecutable portable queda en:

```text
desktop-launcher/src-tauri/target/release/forbiddens_desktop_launcher.exe
```

Para generar instalador usa el script dedicado, que activa NSIS via `src-tauri/tauri.installer.conf.json`.

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
4. Verifica que `plugins.updater.active` siga en `true`.
5. Publica `desktop-launcher/latest.json` en el bucket publico:

```text
https://sbnwrrrachptwfrgjylv.supabase.co/storage/v1/object/public/launcher-downloads/latest.json
```

6. Cuando publiques una version nueva, sube el instalador y actualiza ese JSON.

## Siguiente paso

Para abrir PPSSPP nativo desde la app, el website puede detectar que esta dentro de Tauri y llamar un comando nativo. Eso se puede agregar despues sin afectar a quienes entran por navegador normal.
