# Consola Retro SNES

Paquete autocontenido de la shell `snes_retro`, exclusiva para SNES en celular/tablet vertical.

## Archivos

- `vertical-celular.svg`: carcasa normal.
- `vertical-celular-expanded.svg`: carcasa con el control de restaurar visible.
- `shell-manifest.json`: contrato de layout, botones y compatibilidad.
- `shell-template.css`: CSS aislado de referencia para futuras shells.
- `COLORS.txt`: mapa editable de colores para controles HTML y estados.

El SVG usa `viewBox="0 0 914.88 2033.999918"`. Todas las hitboxes se calculan en ese mismo sistema de coordenadas y escalan junto con el SVG. No deben convertirse a posiciones en pixeles de pantalla.

## Reglas

1. Una shell declara sus consolas en `compatibleConsoles` dentro de `src/lib/emulatorShells.ts`.
2. Cada consola se equipa de forma independiente en `user_active_emulator_shells`.
3. El CSS debe estar prefijado por `.gamebubble-shell-{slug}`.
4. La pantalla usa `object-fit: contain`; nunca debe recortar el juego.
5. Las hitboxes son transparentes, conservan la forma del asset y viven en un SVG superpuesto.
6. Los controles no incluidos se abren desde el corazon mediante un bubble portal/controlado.
7. Probar la shell en varias relaciones de aspecto antes de publicarla.
