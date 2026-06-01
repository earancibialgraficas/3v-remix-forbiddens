# Skin package: demoniaco

Esta carpeta es el paquete visual de la skin `demoniaco`.

Ruta:

```txt
public/skins/demoniaco
```

La idea de este paquete es que una skin futura pueda copiar esta estructura, cambiar texturas/imagenes manteniendo nombres equivalentes, y luego ajustar los colores en `src/lib/skinThemes.ts` y los overrides especificos en `src/styles/skin-styles.css`.

## Estructura

```txt
backgrounds/
  solid/
    hellscape-castle.png
    hellscape-dragon-wide.png
    profile-banner.png
    basalt-wide.png
    basalt-tall.png
    window-rock.png

decorations/
  demon-emblem.png

equipment/
  equipment-star.png

forum-sidebar/
  toggle-normal.png
  toggle-hover.png
  toggle-selected.png

frames/
  avatar-ring-trim.png
  avatar-square-frame.png
  corner-*-trim.png
  frame-edge-v1-trim.png
  frame-edge-v1-trim-vertical.png
  frame-edge-v2-trim.png
  frame-edge-v2-trim-vertical.png
  frame-edge-v3-trim.png
  frame-edge-v3-trim-vertical.png
  marco-arriba-izquierda.png
  marco-arriba-derecha.png
  marco-abajo-derecha.png
  marco-abajo-izquierda.png
  marco-arriba-izquierda.svg
  marco-arriba-derecha.svg
  marco-abajo-derecha.svg
  marco-abajo-izquierda.svg
  separator-t.png
  separator-t-inverted.png
  separador-en-forma-de-T.svg
  separador-en-forma-de-T-invertido.svg
  barra-launcher.svg

home/
  banner-hero.png

panels/
  panel-frame.png

slots/
  slot-frame.png
  slot-hover.png

store/
  thumbnail.png

tabs/
  tab-bar.png
  dragon-head.png

textures/
  lava-overlay.jpg
```

## Contrato de nombres

Para crear otra skin con menos trabajo, conserva estos nombres y cambia solo la carpeta base:

```txt
public/skins/{slug}/...
```

Ejemplo: si se crea una skin `angel_oscuro`, los assets deberian quedar como:

```txt
public/skins/angel_oscuro/frames/avatar-ring-trim.png
public/skins/angel_oscuro/home/banner-hero.png
public/skins/angel_oscuro/slots/slot-hover.png
```

Despues se reemplazan las rutas `/skins/demoniaco/...` por `/skins/angel_oscuro/...` en el tema nuevo.

## Tokens de color

Los colores principales viven en:

```txt
src/lib/skinThemes.ts
```

Busca `DEMONIACO_SKIN`. Para una nueva skin crea un objeto equivalente y registra el slug en `ALL_SKINS`.

Tokens importantes:

```ts
colors: {
  primary:    "#d94a38", // titulos, iconos activos, textos pixel importantes
  secondary:  "#b65a4b", // texto secundario destacado
  accent:     "#e09a75", // contraste suave, labels y detalles
  background: "#0a0a0a", // fondo general
  card:       "#1a1a1a", // fallback de paneles
  text:       "#f0c1aa", // texto principal sobre textura oscura
  textMuted:  "#b98778", // texto apagado
  border:     "#6b3333", // bordes cuando no hay textura de marco
}
```

## Como elegir colores desde imagenes

Cuando armes una skin nueva, mira las texturas e imagenes y extrae estos valores:

1. `primary`: el color luminoso mas reconocible de la skin. Debe funcionar en titulos, iconos y botones activos.
2. `secondary`: una version menos intensa del color principal para texto secundario.
3. `accent`: color claro pero no blanco. Sirve para contraste pequeno y detalles.
4. `background`: el tono mas oscuro de la textura base.
5. `card`: un tono oscuro apenas mas claro que el fondo.
6. `text`: color legible sobre `background` y `card`.
7. `textMuted`: color legible pero discreto para metadata.
8. `border`: color oscuro del borde cuando no se use marco texturizado.
9. `glow`: sombra con alpha bajo del `primary`, nunca demasiado chillona.

Regla practica:

```txt
imagen brillante -> primary/accent
grieta o luz secundaria -> secondary/glow
roca/sombra principal -> background/card
borde oscuro de ornamento -> border
```

Evita blanco puro en skins oscuras. Usa colores calidos claros o frios claros segun la paleta.

## Patrones y texturas

En `src/lib/skinThemes.ts`, `patterns` define las superficies globales:

```ts
patterns: {
  background: "...",
  card: "...",
  topbar: "...",
  sidebar: "...",
  panel: "...",
  profileHeader: "...",
  profileSurface: "...",
  slot: "...",
  button: "...",
  trim: "...",
  emblem: "...",
  lava: "...",
}
```

Guia:

- `background`: fondo general del sitio.
- `card`: paneles simples y cards.
- `topbar`: barra superior.
- `sidebar`: barra lateral izquierda.
- `panel`: paneles grandes.
- `profileHeader`: banner del perfil.
- `profileSurface`: paneles internos del perfil.
- `slot`: inventario, trueque y espacios pequenos.
- `button`: botones principales.
- `trim`: textura lineal o borde pequeno.
- `emblem`: icono decorativo.
- `lava`: overlay opcional para efectos.

## CSS especifico de skin

Los detalles finos viven en:

```txt
src/styles/skin-styles.css
```

Busca:

```css
html[style*="--skin-slug: demoniaco"]
```

Para una skin nueva, duplica solo las reglas necesarias y cambia el slug:

```css
html[style*="--skin-slug: angel_oscuro"] ...
```

No conviene duplicar todo si la skin no necesita todos los efectos. Empieza por tokens globales y luego agrega overrides para las partes especiales.

## Componentes que usa esta skin

Partes importantes que tienen tratamiento especial:

- Perfil y perfil publico: `demoniaco-profile-hero`, `demoniaco-profile-panel`, avatar con `avatar-frame-demoniaco`.
- Tabs del perfil: `demoniaco-profile-tabs`, `tab-bar.png`, `dragon-head.png`.
- Inventario + equipamiento: `demoniaco-inventory-equipment-shell`, `demoniaco-shell-ornaments`, separadores T y esquinas SVG.
- Slots: `demoniaco-item-frame`, `slot-frame.png`, `slot-hover.png`.
- Trueque y ofertas recientes: `demoniaco-trade-panel`, `demoniaco-offers-panel`.
- Rightbar: `right-panel-card`, `right-panel-footer-section`, `right-panel-discord-button`.
- Public profile player: `public-profile-music-player`, `public-profile-video-layer`, `public-profile-playlist-popover`.
- Launcher titlebar: `desktop-launcher-titlebar`, `barra-launcher.svg`.
- Forum sidebar: `forum-sidebar/toggle-*.png`.
- Store e inventario: `store/thumbnail.png`.

## Reglas visuales de esta skin

- El rojo no debe ser naranja puro ni neon excesivo.
- Los bordes solidos deben evitarse en paneles importantes; usa marcos/texturas.
- Los textos pixel importantes usan `primary`.
- El texto comun usa `text`.
- Metadata y labels secundarios usan `textMuted`.
- Botones activos usan rojo oscuro con glow sutil.
- Paneles derechos y footers usan textura `window-rock`/`basalt` sin borde rojo visible.
- En videos del public profile, los bordes se funden con el fondo usando mascara y veladura lateral.
- Los popups/desplegables importantes deben poder salir del contenedor; si se recortan, usar portal al `document.body`.

## Checklist para crear otra skin

1. Copiar esta carpeta:

```txt
public/skins/demoniaco -> public/skins/{nuevo_slug}
```

2. Reemplazar imagenes manteniendo nombres y proporciones parecidas.
3. Crear el tema en `src/lib/skinThemes.ts`.
4. Registrar el tema en `ALL_SKINS` y `SKIN_SLUGS`.
5. Cambiar rutas `/skins/demoniaco/...` por `/skins/{nuevo_slug}/...`.
6. Agregar preload de assets importantes en `src/contexts/SkinContext.tsx` si la skin tiene muchas texturas.
7. Duplicar overrides especificos en `src/styles/skin-styles.css` solo cuando haga falta.
8. Revisar: perfil, perfil publico, inventario, trueque, tienda, forum page, user popup, photowall, mobile.
9. Ejecutar:

```txt
npm.cmd run build
```

10. Probar en localhost y verificar popups/dropdowns, z-index, overflow y carga de texturas.

## Notas de rendimiento

- Usa PNG para texturas bitmap y SVG para ornamentos grandes cuando sea posible.
- Evita imagenes gigantes si solo se ven pequenas.
- Los marcos SVG deben venir sin borde blanco desde el asset.
- Si una textura tarda, agregala a preload en `SkinContext.tsx`.
- Las imagenes repetidas deben vivir en `public/skins/{slug}` y no cargarse desde rutas externas.
