# FORBIDDENS Launcher updates

El launcher ya tiene el puente de updater instalado.

- Al abrir la app, busca actualizaciones automaticamente y reinicia si instala una.
- Dentro del website, cuando se abre desde el `.exe`, aparece un boton pequeno en la esquina para buscar updates manualmente.
- El updater ya esta activo y apunta al release publico de GitHub `forbiddensASSETS`.

## Primera vez / rotacion de llaves

1. Genera la llave:

```powershell
npm.cmd run desktop:updater:keygen
```

2. Guarda la clave privada en un lugar seguro. No se sube al website ni a Git.
3. Copia la clave publica en `src-tauri/tauri.conf.json`, dentro de `plugins.updater.pubkey`.
4. Verifica que `plugins.updater.active` siga en `true`.

## Publicar una version nueva

1. Sube la version de `desktop-launcher/src-tauri/tauri.conf.json`.
2. Compila el instalador:

```powershell
npm.cmd run desktop:build:installer
```

3. Firma el instalador generado con la clave privada que corresponde a la `pubkey` ya compilada en `src-tauri/tauri.conf.json`. No generes ni uses otra key para una version normal, porque los launchers ya instalados rechazaran el update como "no firmado". Para la clave actual sin contrasena, pasa `--password=` explicitamente al comando `tauri signer sign`; una variable de entorno vacia puede hacer que el CLI espere entrada interactiva.
   - Comprobacion rapida: las firmas compatibles historicas empiezan, al decodificarlas, con la familia `RUQEvPAu...`; si aparece otra familia, la version fue firmada con una key equivocada.
4. Sube el instalador como asset del release de GitHub.
5. Publica `desktop-launcher/latest.json` en:

```text
https://github.com/earancibialgraficas/forbiddensASSETS/releases/download/emulators-v1/latest.json
```

Puedes usar `updater.latest.example.json` como base.
