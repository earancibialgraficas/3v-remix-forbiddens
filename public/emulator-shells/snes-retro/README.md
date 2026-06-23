# Consola Retro SNES

Paquete autocontenido de la shell `snes_retro`, exclusiva para SNES en celular,
tablet y PC. Este documento tambien sirve como guia de implementacion para
futuras skins SVG de emuladores.

La regla mas importante es esta: el arte de la skin, la pantalla del juego y las
hitboxes deben compartir el mismo sistema visual. No se deben medir botones a
partir de screenshots, PNGs exportados o pixeles del navegador si el asset base
es un SVG. El SVG ya contiene las posiciones reales.

## Archivos

- `vertical-celular.svg`: carcasa normal.
- `vertical-celular-expanded.svg`: carcasa con el control de restaurar visible.
- `horizontal-mobile.svg`: carcasa para celular/tablet en horizontal.
- `shell-manifest.json`: contrato de layout, botones y compatibilidad.
- `shell-template.css`: CSS aislado de referencia para futuras shells.
- `COLORS.txt`: mapa editable de colores para controles HTML y estados.

La variante vertical usa `viewBox="0 0 914.88 2033.999918"` y la horizontal `viewBox="0 0 2034 915"`. Cada grupo de hitboxes usa el sistema de coordenadas de su SVG y escala junto con el arte. No deben convertirse a posiciones en pixeles de pantalla.

La variante desktop usa `viewBox="0 0 1440 809.999993"` y se implementa con SVG
inline dentro del DOM, no con `<object>`.

## Principio de capas

Todas las skins deben montarse con este orden visual:

1. `.snes-retro-shell-viewport`: contenedor con la misma relacion de aspecto que el SVG.
2. `.snes-retro-game-screen`: pantalla del juego, posicionada en porcentajes dentro del viewport.
3. `.snes-retro-shell-hardware`: arte de la consola/SVG, encima de la pantalla.
4. `.snes-retro-info`: texto de barra superior si la skin lo necesita.
5. `.snes-retro-controls-layer`: hitboxes HTML/SVG, sliders, mini reproductor y popovers.

Para que las transparencias funcionen, la pantalla del juego debe quedar detras
del SVG y el SVG debe tener alpha real en el hueco de la pantalla. No se debe
poner la pantalla por encima del arte para "recortar" el centro: eso oculta los
bordes transparentes, rompe la profundidad del asset y hace que zonas que
deberian mostrar el juego se vean mal.

CSS base esperado:

```css
.gamebubble-shell-snes-retro .snes-retro-game-screen {
  position: absolute;
  overflow: hidden;
  z-index: 5;
  background: #000;
}

.snes-retro-shell-hardware {
  position: absolute;
  inset: 0;
  z-index: 25;
  pointer-events: none;
}

.snes-retro-controls-layer {
  position: absolute;
  inset: 0;
  z-index: 60;
  pointer-events: none;
}
```

## Regla critica para SVG desktop

En PC, si se necesitan hitboxes con la forma exacta de los botones dibujados en
el SVG, NO usar `<object>` para mostrar el SVG.

Motivo: `<object data="skin.svg">` crea un documento aislado dentro del
navegador/WebView. Aunque el archivo SVG tenga transparencias reales, ese
documento interno puede pintar su canvas en blanco. El resultado visual es que
las zonas transparentes se ven como relleno solido blanco. Ademas, manipular
capas internas requiere entrar al `contentDocument`, lo que es mas fragil.

La implementacion correcta para desktop es:

1. Cargar el texto del SVG con `fetch`.
2. Inyectarlo inline en un contenedor con `dangerouslySetInnerHTML`.
3. Usar un `ref` al contenedor, no al documento del SVG.
4. Buscar las capas reales con `root.getElementsByTagName("image")`.
5. Conectar eventos directamente a esas capas.
6. Dejar `pointer-events: visiblePainted` en las capas interactivas.

Ejemplo de estado y carga:

```tsx
const desktopArtRef = useRef<HTMLDivElement>(null);
const [desktopSvg, setDesktopSvg] = useState("");

useEffect(() => {
  if (!usesDesktopShell || desktopSvg) return;

  let cancelled = false;
  void fetch("/emulator-shells/my-shell/pc.svg")
    .then((response) => response.text())
    .then((svgText) => {
      if (!cancelled) setDesktopSvg(svgText);
    })
    .catch(() => {
      if (!cancelled) setDesktopSvg("");
    });

  return () => {
    cancelled = true;
  };
}, [desktopSvg, usesDesktopShell]);
```

Ejemplo de render:

```tsx
{usesDesktopShell ? (
  desktopSvg ? (
    <div
      ref={desktopArtRef}
      className="my-shell-desktop-art"
      dangerouslySetInnerHTML={{ __html: desktopSvg }}
    />
  ) : (
    <div ref={desktopArtRef} className="my-shell-desktop-art">
      <img src="/emulator-shells/my-shell/pc.svg" alt="" draggable={false} />
    </div>
  )
) : (
  <img src="/emulator-shells/my-shell/mobile.svg" alt="" draggable={false} />
)}
```

CSS obligatorio para el SVG inline:

```css
.my-shell-hardware img,
.my-shell-hardware .my-shell-desktop-art,
.my-shell-hardware .my-shell-desktop-art > svg {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  user-select: none;
  pointer-events: none;
}

.my-shell-desktop .my-shell-hardware .my-shell-desktop-art {
  pointer-events: auto;
  background: transparent !important;
}

.my-shell-desktop .my-shell-hardware .my-shell-desktop-art > svg {
  background: transparent !important;
  pointer-events: auto;
}
```

## Como cablear botones desde capas reales del SVG

Cuando el SVG fue exportado con botones como capas `<image>`, se pueden usar
esas capas como hitboxes reales. Esto evita dibujar circulos, rectangulos o
paths aproximados encima. La hitbox queda exactamente donde hay pixeles pintados
del boton.

Patron:

```tsx
const syncDesktopArt = useCallback(() => {
  const root = desktopArtRef.current;
  if (!root) return;

  const svg = root.querySelector("svg");
  if (svg) {
    svg.style.setProperty("background", "transparent", "important");
    svg.style.setProperty("background-color", "transparent", "important");
  }

  const images = Array.from(root.getElementsByTagName("image")) as SVGImageElement[];
  const getLayer = (oneBasedIndex: number) => images[oneBasedIndex - 1];

  const setLayerVisible = (oneBasedIndex: number, visible: boolean) => {
    const image = getLayer(oneBasedIndex);
    if (!image) return;
    image.style.display = visible ? "" : "none";
    if (!visible) image.style.filter = "";
  };

  const wireLayer = (oneBasedIndex: number, action: () => void) => {
    const image = getLayer(oneBasedIndex);
    if (!image) return;

    image.setAttribute("pointer-events", "visiblePainted");
    image.style.pointerEvents = "visiblePainted";
    image.style.cursor = "pointer";
    image.onpointerenter = () => setLayerHover(oneBasedIndex, true);
    image.onpointerleave = () => setLayerHover(oneBasedIndex, false);
    image.onpointerup = (event) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    };
    image.oncontextmenu = (event) => event.preventDefault();
  };

  setLayerVisible(13, paused);
  setLayerVisible(14, !paused);
  setLayerVisible(20, isExpanded);
  setLayerVisible(21, !isExpanded);

  wireLayer(13, togglePause);
  wireLayer(14, togglePause);
  wireLayer(15, toggleEmulatorMenu);
  wireLayer(19, minimizeGame);
  wireLayer(20, toggleFullscreen);
  wireLayer(21, toggleFullscreen);
  wireLayer(22, closeGame);
}, [paused, isExpanded, togglePause, toggleEmulatorMenu, minimizeGame, toggleFullscreen, closeGame]);
```

Sincronizar despues de inyectar el SVG:

```tsx
useEffect(() => {
  if (!usesDesktopShell) return;
  syncDesktopArt();
}, [desktopSvg, syncDesktopArt, usesDesktopShell]);
```

Hover recomendado:

```tsx
const setLayerHover = useCallback((oneBasedIndex: number, hovered: boolean) => {
  const image = desktopArtRef.current?.getElementsByTagName("image")[oneBasedIndex - 1] as SVGImageElement | undefined;
  if (!image) return;

  image.style.transition = "filter 120ms ease, opacity 120ms ease";
  image.style.filter = hovered
    ? "hue-rotate(-10deg) saturate(1.22) brightness(1.08) drop-shadow(0 0 7px rgba(255, 132, 186, 0.62))"
    : "";
}, []);
```

## Como decidir entre `<img>`, SVG overlay e SVG inline

Usar `<img>` cuando:

- La skin solo es arte visual.
- Las hitboxes se dibujan aparte en un SVG overlay.
- No se necesita manipular capas internas.
- Es mobile/landscape y ya existe un set estable de paths para botones.

Usar un SVG overlay de hitboxes cuando:

- Los botones pueden describirse con `path`, `circle`, `rect`, `ellipse` o `polygon`.
- El viewBox es estable.
- Las hitboxes no necesitan coincidir con pixeles alpha complejos del asset.

Usar SVG inline cuando:

- Las hitboxes deben tener la forma exacta de botones dibujados.
- Los botones existen como capas o `<image>` dentro del SVG.
- Hay botones intercambiables dentro del SVG, como pausa/play o maximizar/restaurar.
- Se necesita aplicar hover/filtros a capas concretas.
- El SVG tiene transparencias importantes y `<object>` produce fondo blanco.

Evitar `<object>` para skins interactivas. Solo usarlo para visualizaciones
externas no interactivas y nunca cuando el juego debe verse por transparencias.

## Exportacion del SVG

Antes de implementar una skin nueva:

1. Confirmar que el SVG tiene `viewBox`.
2. Confirmar que el hueco de pantalla y zonas transparentes son alpha real, no relleno blanco.
3. Confirmar que no hay un `<rect>` blanco de fondo cubriendo todo el documento.
4. Confirmar que los botones que se quieren cablear existen como capas separadas o son localizables.
5. Mantener el orden de capas documentado.
6. Si hay botones alternos, dejar ambos en el SVG y controlar visibilidad desde React.

Orden de capas recomendado para botones desktop:

- Imagen base de consola.
- Botones de estado normal.
- Botones de estado alterno.
- Botones de ventana: minimizar, maximizar, restaurar, cerrar.
- No poner una placa opaca encima del area del juego.

Si el SVG contiene PNGs embebidos:

- Esta permitido.
- Deben conservar alpha.
- No se debe rasterizar todo el SVG con fondo blanco.
- No usar una exportacion que haya aplanado transparencias contra blanco.

## Posicion de pantalla

La pantalla del juego se posiciona en porcentajes respecto al viewport de la
skin, no respecto a `window`.

Ejemplo desktop actual:

```css
.gamebubble-shell-snes-retro.snes-retro-shell-desktop .snes-retro-game-screen {
  left: 8.35% !important;
  top: 13.15% !important;
  width: 73.75% !important;
  height: 69.15% !important;
  z-index: 5 !important;
  border-radius: clamp(18px, 1.75vw, 32px);
}
```

El `z-index` debe quedar debajo del hardware. En esta shell:

- Pantalla: `z-index: 5`.
- Hardware/SVG: `z-index: 25`.
- Controles: `z-index: 60`.
- Elementos flotantes especiales: `z-index` mayor que controles si corresponde.

## Mini reproductor, volumen y controles HTML encima del SVG

Los elementos que no forman parte del SVG, como mini reproductor, slider de
volumen, dialogos o burbujas de herramientas, deben vivir en
`.snes-retro-controls-layer`. Se posicionan con porcentajes contra el viewport
del SVG.

Reglas:

- Usar `position: absolute`.
- Usar `left/top/width/height` en porcentajes.
- Usar `pointer-events: auto` solo en el control.
- Mantener `pointer-events: none` en el layer padre.
- Usar `min-width: 0` y `min-height: 0` en paneles compactos.
- Evitar textos largos sin `truncate`, `overflow: hidden` o tamanos `clamp`.
- No usar `vw` para alinear con botones si el viewport de la skin no ocupa todo el ancho.

Ejemplo:

```css
.my-shell-desktop .my-shell-volume-slider {
  position: absolute;
  left: 90.05%;
  top: 56.55%;
  width: 6.25%;
  height: 11.1%;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
```

## Checklist de implementacion de una skin nueva

1. Crear carpeta en `public/emulator-shells/{slug}`.
2. Agregar assets SVG/PNG.
3. Crear `shell-manifest.json`.
4. Registrar la shell en `src/lib/emulatorShells.ts`.
5. Definir `compatibleConsoles`.
6. Definir el viewBox por orientacion.
7. Definir posicion porcentual de pantalla.
8. Crear clases CSS prefijadas por `.gamebubble-shell-{slug}`.
9. Montar el viewport con relacion de aspecto fija.
10. Poner la pantalla del juego debajo del hardware.
11. Para mobile/landscape, usar `<img>` si no se necesitan capas internas.
12. Para desktop interactivo, usar SVG inline.
13. Cablear capas con `pointer-events: visiblePainted`.
14. Controlar visibilidad de estados alternos desde React.
15. Probar hover en botones reales, no en cajas rectangulares.
16. Probar click en una esquina transparente del boton: no debe activar nada.
17. Probar click sobre pixel pintado del boton: debe activar la accion.
18. Probar transparencias del area de juego con una ROM o canvas visible.
19. Probar minimizado, maximizado, restaurar y cerrar.
20. Probar volumen y mini reproductor en varias resoluciones.
21. Probar build con `npm.cmd run build`.

## Errores comunes

- Usar `<object>` para SVG interactivo: puede producir fondo blanco y complica eventos.
- Poner la pantalla del juego encima del hardware: tapa el arte y falsifica transparencias.
- Dibujar hitboxes manuales sobre botones ya existentes como capas: se desalinean.
- Usar pixeles de screenshot para botones: no escala bien.
- Usar `pointer-events: bounding-box`: activa zonas transparentes del rectangulo.
- Olvidar `pointer-events: visiblePainted`: la hitbox no respeta el alpha pintado.
- Agregar fondos blancos o negros al SVG para "verlo mejor" en el editor.
- Cambiar el orden de capas del SVG sin actualizar indices en React.
- Reexportar el SVG desde una herramienta que aplane alpha contra blanco.
- Usar `vw/vh` para controles que deben seguir el viewBox de la shell.

## Debug rapido

Si las transparencias se ven blancas:

1. Revisar si se esta usando `<object>`. Si si, cambiar a SVG inline.
2. Abrir el SVG en un editor y confirmar que no hay fondo blanco.
3. Buscar `<rect>` de fondo en el SVG.
4. Confirmar que el juego esta debajo del hardware, no encima.
5. Confirmar que el contenedor tiene `background: transparent`.
6. Confirmar que el SVG inline tiene `background: transparent !important`.

Si las hitboxes se activan fuera del boton:

1. Confirmar que el evento esta en la capa real del boton.
2. Usar `pointer-events: visiblePainted`.
3. No usar el rectangulo completo del `<image>`.
4. Probar click en esquinas transparentes.

Si el hover funciona pero el click no:

1. Revisar que el SVG inline tenga `pointer-events: auto`.
2. Revisar que el layer padre permita eventos en el contenedor correcto.
3. Revisar que el control no este debajo de otro layer con `z-index` mayor.
4. Revisar `event.stopPropagation()` y `event.preventDefault()`.

Si el mini reproductor no aparece:

1. Confirmar que existe un solo `id="music-slot-emulator"` visible.
2. Confirmar que el portal vuelve a buscar el slot si cambia la shell.
3. Confirmar que el slot tiene ancho/alto reales.
4. Confirmar que no esta debajo del hardware por `z-index`.

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
9. En desktop interactivo, usar SVG inline si se necesitan capas internas o transparencia fiable.
10. No usar `<object>` para shells donde el juego debe verse por zonas transparentes del SVG.
