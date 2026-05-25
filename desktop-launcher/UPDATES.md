# FORBIDDENS Launcher updates

El launcher ya tiene el puente de updater instalado.

- Al abrir la app, busca actualizaciones automaticamente y reinicia si instala una.
- Dentro del website, cuando se abre desde el `.exe`, aparece un boton pequeno en la esquina para buscar updates manualmente.
- Todo queda apagado hasta que generes una llave real y actives el updater.

## Primera vez

1. Genera la llave:

```powershell
npm.cmd run desktop:updater:keygen
```

2. Guarda la clave privada en un lugar seguro. No se sube al website ni a Git.
3. Copia la clave publica en `src-tauri/tauri.conf.json`, dentro de `plugins.updater.pubkey`.
4. Cambia `plugins.updater.active` a `true`.

## Publicar una version nueva

1. Sube la version de `desktop-launcher/src-tauri/tauri.conf.json`.
2. Compila el instalador:

```powershell
npm.cmd run desktop:build:installer
```

3. Firma el instalador generado con la clave privada del updater.
4. Sube el instalador firmado al website.
5. Publica `latest.json` en `https://forbiddens.net/desktop/latest.json`.

Puedes usar `updater.latest.example.json` como base.
