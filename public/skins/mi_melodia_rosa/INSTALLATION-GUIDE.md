# Guia de instalacion basada en Mi Melodia Rosa

Esta carpeta es la referencia canonica para skins claras, pastel y texturizadas. Su arquitectura visual es independiente de Demoniaco aunque comparte el contrato de nombres de assets.

## Aislamiento obligatorio

Cada skin nueva debe tener un CSS propio, importado despues de los estilos globales. Todos sus selectores deben empezar por:

```css
html[data-skin-slug="{slug}"]
```

No reutilices selectores de otra skin ni agregues reglas sin prefijo. Usa atributos `data-*` cuando una superficie necesite una excepcion estable.

## Superficies principales

| Zona | Asset | Ajuste |
| --- | --- | --- |
| Fondo global | `backgrounds/solid/hellscape-castle.png` | `cover`, fijo |
| Hero home | `home/banner-hero.png` | `cover`, fade lateral corto y fuerte |
| Perfil | `backgrounds/solid/profile-banner.png` | contenido por encima |
| Sidebar/rightbar | `backgrounds/solid/window-rock.png` | textura visible, overlay pastel ligero |
| Paneles | `backgrounds/solid/basalt-wide.png` | `cover` |
| Slots | `slots/slot-frame.png` | `100% 100%` |
| Hover slots | `slots/slot-hover.png` | overlay absoluto, sin relleno morado adicional |
| Equipamiento | `equipment/equipment-star.png` | `contain`, sin mascara ni `clip-path` |
| Tabs | `tabs/tab-bar.png` | lineas del contenedor |
| Tab activo | `tabs/dragon-head.png` | marcador absoluto movil |
| Avatar | `frames/avatar-ring-trim.png` | absoluto sobre la fotografia |
| Launcher | `frames/barra-launcher.svg` | `cover` |

## Boton del ForumSidebar

Los tres estados usan assets independientes y solo ocultan el icono generico cuando esta skin esta activa:

- Normal: `forum-sidebar/toggle-normal.png`.
- Hover: `forum-sidebar/toggle-hover.png`.
- Activo/sidebar colapsado: `forum-sidebar/toggle-selected.png`.

Los PNG tienen margen transparente, por lo que el CSS usa un `background-size` mayor que `contain` para encuadrar el arte sin deformarlo.

## Colores y texto

La paleta completa editable esta en `COLORS.txt`. Los tokens base viven en `src/lib/skinThemes.ts` y las excepciones finales en `src/styles/skin-mi-melodia-final.css`.

- Titulos importantes: morado/rosa oscuro, sin sombra blanca.
- Texto principal: morado oscuro legible.
- Metadata: rosa desaturado oscuro.
- Botones activos: rosa fuerte o morado, texto claro.
- Nunca colocar texto rosa claro sobre una textura clara sin superficie de contraste.

## Marco inventario + equipamiento

- Ornamentos, esquinas, uniones y separadores son capas absolutas con `pointer-events: none`.
- El grid conserva su arquitectura; las texturas no deben alterar dimensiones.
- La estrella usa toda el area disponible con `background-size: contain`.
- En movil, ocultar las T cuando inventario y equipamiento pasan a una columna.

## Popups

- Dropdowns y playlists que puedan recortarse se renderizan en `document.body` mediante portal.
- Capas decorativas: `pointer-events: none`.
- Botones interactivos: `pointer-events: auto` y un `z-index` mayor que videos/texturas.

## Checklist

Revisar home, perfil, perfil publico, inventario, equipamiento, trueque, tienda, forum sidebar, rightbar, eventos, Social Hub, launcher, popups y movil. Finalmente ejecutar `npm.cmd run build`.
