# Consola Retro SNES

Paquete autocontenido de la shell `snes_retro`, exclusiva para SNES en celular y tablet.

## Archivos

- `vertical-celular.svg`: carcasa normal.
- `vertical-celular-expanded.svg`: carcasa con el control de restaurar visible.
- `horizontal-mobile.svg`: carcasa para celular/tablet en horizontal.
- `shell-manifest.json`: contrato de layout, botones y compatibilidad.
- `shell-template.css`: CSS aislado de referencia para futuras shells.
- `COLORS.txt`: mapa editable de colores para controles HTML y estados.

La variante vertical usa `viewBox="0 0 914.88 2033.999918"` y la horizontal `viewBox="0 0 2034 915"`. Cada grupo de hitboxes usa el sistema de coordenadas de su SVG y escala junto con el arte. No deben convertirse a posiciones en pixeles de pantalla.

## Variante horizontal movil

- La carcasa completa conserva la relacion `2034 / 915` y se centra dentro del viewport.
- El espacio sobrante fuera de la carcasa siempre es transparente.
- Se deja un margen exterior de `4px` para evitar recortar el borde superior o inferior.
- Pantalla: `left 26.85%`, `top 5.45%`, `width 46.65%`, `height 87.3%`.
- Barra informativa: `left 28.6%`, `top calc(5.45% + 10px)`, `width 43.1%`.
- La barra no dibuja otro panel: usa el recuadro incluido en `horizontal-mobile.svg`.
- Titulo: `5px-8px`; metadatos: `4px-7px`, con el nombre dorado y datos secundarios morados/rosados.
- La imagen, pantalla y SVG de hitboxes viven dentro de `.snes-retro-shell-viewport`; los tres deben usar exactamente el mismo tamano.
- Las hitboxes horizontales se expresan exclusivamente en coordenadas del `viewBox 2034 915` con `preserveAspectRatio="none"`.
- Nunca fijar las hitboxes en pixeles CSS ni dimensionarlas contra `window`: eso las despega de los botones al cambiar de pantalla.

## Reglas

1. Una shell declara sus consolas en `compatibleConsoles` dentro de `src/lib/emulatorShells.ts`.
2. Cada consola se equipa de forma independiente en `user_active_emulator_shells`.
3. El CSS debe estar prefijado por `.gamebubble-shell-{slug}`.
4. La pantalla usa `object-fit: contain`; nunca debe recortar el juego.
5. Las hitboxes son transparentes, conservan la forma del asset y viven en un SVG superpuesto.
6. Los controles no incluidos se abren desde el corazon mediante un bubble portal/controlado.
7. Probar la shell en varias relaciones de aspecto antes de publicarla.
8. En horizontal, limitar el viewport por ancho y alto manteniendo `2034:915`; no estirar el SVG para llenar pantallas mas altas.
