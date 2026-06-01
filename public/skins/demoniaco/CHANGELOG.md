# Demoniaco skin changelog

## 2026-06-01

- Reemplazada la textura de la barra superior del launcher en `frames/barra-launcher.svg`.
- La barra se consume en `src/styles/skin-styles.css` con `.desktop-launcher-titlebar`.
- El contrato de assets mantiene el nombre `frames/barra-launcher.svg` para que futuras skins puedan cambiar solo la imagen.
- El SVG de la barra debe tener el `viewBox` recortado a la franja visible para evitar espacio transparente.
- El CSS usa `background-size: cover` y cache-busting `?v=20260601c` para llenar la barra sin deformarla y forzar recarga en el WebView.
- Verificado con `npm.cmd run build`.
