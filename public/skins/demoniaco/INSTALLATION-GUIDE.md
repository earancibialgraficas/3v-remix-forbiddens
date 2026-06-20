# Guia de instalacion basada en Demoniaco

Esta carpeta es el paquete canonico de la skin terminada. No se deben cambiar sus nombres ni rutas para crear otra skin: copia la carpeta completa y cambia solamente el slug de la copia.

## Aislamiento obligatorio

Cada skin nueva debe tener un archivo propio en `src/styles/skins/{slug}.css` y todos sus selectores deben comenzar por:

```css
html[data-skin-slug="{slug}"]
```

No agregues reglas visuales nuevas de otra skin a `skin-styles.css`. Ese archivo contiene la implementacion historica de Demoniaco y se conserva para no alterar su resultado actual.

## Superficies y assets

| Zona | Asset | Ajuste recomendado |
| --- | --- | --- |
| Fondo del sitio | `backgrounds/solid/hellscape-castle.png` | `cover`, centrado arriba, fijo |
| Banner home | `home/banner-hero.png` | `cover`, fade lateral corto y fuerte |
| Banner perfil | `backgrounds/solid/profile-banner.png` | `cover`, contenido por encima |
| Sidebar/rightbar | `backgrounds/solid/window-rock.png` | `cover`, sin capa blanca |
| Paneles | `backgrounds/solid/basalt-wide.png` | `cover` |
| Slots | `slots/slot-frame.png` | `100% 100%`, sin borde solido |
| Hover slot | `slots/slot-hover.png` | `100% 100%`, overlay absoluto |
| Equipamiento | `equipment/equipment-star.png` | `contain`, nunca recortar con clip-path |
| Tabs | `tabs/tab-bar.png` | lineas superior/inferior |
| Tab activo | `tabs/dragon-head.png` | marcador absoluto que sigue el tab |
| Avatar | `frames/avatar-ring-trim.png` | absoluto sobre la foto, sin overflow hidden |
| Launcher | `frames/barra-launcher.svg` | `cover`, preservar proporcion |

## Marco inventario + equipamiento

- El contenedor es `.demoniaco-inventory-equipment-shell`.
- Esquinas y uniones son decoracion absoluta y nunca modifican el grid.
- Las uniones lineales deben entrar debajo de las esquinas para que no aparezcan cortes.
- Los separadores T se colocan sobre la division central.
- En una columna movil se ocultan los separadores T.

## Tipografia

- Titulos principales pixel: `10px` a `12px`.
- Titulos compactos de panel: `8px` a `10px`.
- Texto normal: `11px` a `14px`.
- Metadata: `8px` a `10px`.
- No usar sombras blancas ni letter-spacing negativo.

## Colores

- Titulos: `primary`.
- Texto principal: `text`.
- Metadata: `textMuted`.
- Seleccionados: fondo oscuro basado en `primary`, texto claro.
- Hover: `primary` con alpha moderado; nunca un color heredado de otra skin.
- La X de equipamiento usa `--skin-primary` y `--skin-accent`.

## Comprobacion

Revisar home, perfil, perfil publico, inventario, equipamiento, trueque, forum sidebar, rightbar, tienda, eventos, Social Hub, popups, dropdowns y movil. Ejecutar `npm.cmd run build` al finalizar.

## Popups y portales

- Los desplegables que deban salir de un panel deben renderizarse con `createPortal(..., document.body)`.
- El boton `.public-profile-playlist-toggle` debe conservar `pointer-events: auto` y un `z-index` superior al video y al contenido del reproductor.
- El popover `.public-profile-playlist-popover` vive en `document.body`; no debe seleccionarse como hijo directo del reproductor.
- Las capas decorativas, mascaras y pseudo-elementos siempre usan `pointer-events: none`.

Los codigos editables de la paleta estan en `COLORS.txt`.

## Pagina de emuladores

- El glow de `.emulator-console-carousel-item` debe usar `primary` con alpha aproximado de `0.60`; nunca blanco.
- El titulo `.emulator-console-title` usa `text` y un glow basado en `primary`/`glowNormal`.
- Mantener `overflow: visible` en los elementos del carrusel para que el glow no quede recortado en un cuadrado.
- La comprobacion de motores nativos se almacena en caché y no debe repetirse al volver a la pagina mientras siga vigente.
