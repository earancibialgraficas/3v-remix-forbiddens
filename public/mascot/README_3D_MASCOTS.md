# Guia para implementar mascotas 3D en el launcher

Esta guia documenta el flujo que estamos usando para mascotas 3D del companion nativo, como la palta y el alien. La idea es que cualquier mascota futura se implemente con la misma arquitectura: modelo 3D real, animaciones GLB, textura PBR, burbuja de texto, voz tipo Animal Crossing, eventos por boton y una hitbox invisible que no se vea como un cuadrado.

## Objetivo

Una mascota 3D del launcher debe sentirse como un personaje vivo sobre el companion:

- Se renderiza con Three.js sobre fondo transparente.
- No aparece dentro de un cuadro visual.
- Puede caminar, reaccionar, dormir, hablar y responder a botones del companion.
- Usa sus texturas reales, no colores planos de emergencia.
- Tiene frases propias segun el evento.
- Tiene una hitbox invisible con forma aproximada al personaje, no un rectangulo completo.
- Se compra/equipa como item de tienda y aparece solo cuando esta equipada.

## Estructura de archivos

Cada mascota 3D debe tener su carpeta dentro de:

```txt
public/mascot/<slug>/
```

Estructura recomendada:

```txt
public/mascot/<slug>/
  <slug>_model.glb
  <slug>_animations.glb
  preview.png
  textures/
    <nombre>-Base-Color.jpg
    <nombre>-Normal.jpg
    <nombre>-Metallic.jpg
    <nombre>-Gloss.jpg
    <nombre>-Eye.jpg
```

Reglas:

- Usa nombres ASCII, sin espacios raros ni acentos.
- El `preview.png` es para tienda/inventario.
- El modelo visible y las animaciones pueden ir en GLBs separados.
- Las texturas deben quedar en `public` para cargarse con rutas `/mascot/<slug>/...`.
- No dependas de rutas locales como `C:\Users\...` dentro del codigo.

## Preparacion en Blender

Antes de exportar:

1. Abre el archivo fuente en Blender.
2. Revisa que el personaje mire hacia la camara/frente esperado.
3. Revisa que tenga esqueleto si quieres animaciones reales.
4. Revisa que las meshes tengan UVs.
5. Revisa que las texturas esten conectadas o disponibles en una carpeta `textures`.
6. Borra luces, camaras o objetos innecesarios si no forman parte del personaje.
7. Aplica transformaciones cuando corresponda: escala, rotacion y posicion.
8. Comprueba que las animaciones existan en el archivo o en los FBX/GLB asociados.

Lo mas importante: el GLB final debe conservar `TEXCOORD_0`. Sin UVs, Three.js no puede mostrar la textura correctamente aunque el archivo de textura exista.

## Exportacion GLB

Exporta en formato GLB binario. Para modelos riggeados:

- Activa mesh.
- Activa armature/skeleton.
- Activa skinning.
- Activa animaciones si el archivo las contiene.
- Mantiene UVs.
- Mantiene vertex groups / weights.
- Evita exportar objetos ocultos o basura de escena.

En el alien usamos scripts de apoyo en `scripts/`, especialmente para limpiar escena y conservar UVs/pesos. Si una mascota compleja falla al verse texturizada, inspecciona primero:

```txt
scripts/export-alien-clean-skinned-static-test.py
scripts/export-alien-clean-skinned.py
scripts/inspect-alien-mesh-data.py
```

No copies esos scripts a ciegas para otra mascota; usalos como referencia y adapta nombres de objetos/materiales.

## Verificacion tecnica del GLB

Antes de conectarlo en React, verifica:

- El GLB tiene meshes visibles.
- El GLB tiene `TEXCOORD_0`.
- El GLB tiene `JOINTS_0` y `WEIGHTS_0` si usa rig.
- El GLB de animaciones trae clips con nombres claros.
- Las texturas existen en `public/mascot/<slug>/textures`.
- El modelo no esta de espaldas.
- El modelo no queda partido, enterrado o fuera de camara.

Si se ve como plastilina, casi siempre es uno de estos problemas:

- No tiene UVs exportadas.
- Se esta usando un color base en vez del mapa real.
- `flipY` de la textura esta mal.
- El material del GLB no coincide con el nombre que busca el codigo.
- El mapa gloss se esta usando como roughness sin invertir.

## Texturas PBR

Para el alien, el flujo correcto es:

- `Base-Color`: textura principal visible del cuerpo.
- `Normal` / `Nor`: relieve fino de la piel.
- `Metallic`: zonas metalicas o reflectantes.
- `Gloss`: brillo. En Three.js debe tratarse como roughness invertido.
- `Eye`: textura/emision para ojos si existe.

Ejemplo conceptual:

```ts
bodyMaterial.map = bodyTexture;
bodyMaterial.normalMap = bodyNormal;
bodyMaterial.metalnessMap = bodyMetallic;
bodyMaterial.roughnessMap = bodyGloss;
```

Si usas gloss:

- No lo trates como roughness directo.
- Invierte su valor en shader o genera una textura roughness invertida.
- Si no haces esto, el personaje puede verse como plastico plano o demasiado mojado.

Config comun:

```ts
texture.colorSpace = THREE.SRGBColorSpace; // solo base color / eye color
texture.flipY = false; // normalmente necesario con GLB
material.color = new THREE.Color(0xffffff);
material.transparent = false;
material.depthWrite = true;
```

## Componente React

Cada mascota 3D debe tener su componente en:

```txt
src/components/<MascotName>3D.tsx
```

El patron base:

- Cargar modelo con `GLTFLoader`.
- Cargar animaciones con otro `GLTFLoader` si van separadas.
- Crear `THREE.AnimationMixer`.
- Mapear clips por nombre.
- Renderizar en un canvas transparente.
- Usar `requestAnimationFrame`.
- Limpiar renderer, texturas, materiales y acciones al desmontar.

Puntos obligatorios:

- `new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })`
- `renderer.setClearColor(0x000000, 0)`
- Fondo siempre transparente.
- No poner el canvas dentro de una card.
- No usar PNG fallback flotante si el objetivo es mascota 3D.

## Canvas grande e hitbox separada

No uses el mismo rectangulo del canvas como hitbox visible/interactiva. Eso causa dos problemas:

- Hover cuadrado.
- Animaciones recortadas cuando el modelo corre, gira o salta.

Patron recomendado:

```tsx
const MASCOT_WIDTH = 340;
const MASCOT_HEIGHT = 292;
const CANVAS_WIDTH = 460;
const CANVAS_HEIGHT = 390;
```

- `MASCOT_WIDTH/HEIGHT`: area logica donde vive la mascota.
- `CANVAS_WIDTH/HEIGHT`: canvas mas grande, con margen transparente.
- El canvas se posiciona absoluto con offset negativo.
- La hitbox es otro elemento invisible encima.
- La hitbox usa `clip-path` para aproximarse a la silueta.

Ejemplo:

```tsx
<div className="pointer-events-none absolute" style={mascotStyle}>
  <canvas className="pointer-events-none absolute" />
  <div
    role="button"
    className="pointer-events-auto absolute inset-0 bg-transparent"
    style={{ clipPath: "polygon(...)" }}
  />
</div>
```

Reglas:

- El canvas no recibe eventos.
- La hitbox invisible recibe click/drag.
- No uses `title`, porque el tooltip nativo se siente como hover rectangular.
- No uses `button` si el navegador o estilos globales le meten hover/focus.
- Usa `div role="button"` con `tabIndex={0}` si necesitas accesibilidad basica.

## Posicion y gravedad

La mascota debe estar dentro del companion y adaptarse al espacio disponible.

Usa:

- `ResizeObserver` para recalcular posicion.
- `groundY()` para pegarla al piso invisible.
- `clampPosition()` para que no salga del area.
- Transicion suave al soltar drag.

No dibujes un suelo visible. El piso es logico: los pies reaccionan como si existiera, pero el fondo sigue transparente.

## Drag and drop

Al agarrar la mascota:

- Cancela burbuja activa.
- Cambia a una pose de agarre o pose suspendida.
- Bloquea idle temporalmente.
- Sigue el mouse con offset.
- Al soltar, vuelve a `groundY()` con transicion.

Si el rig lo permite, crea una animacion dedicada para ser levantada. Si no, usa el clip mas cercano, pero evita que corra mientras esta siendo arrastrada.

## Animaciones

Mapea eventos a clips reales:

```ts
const animationByEvent = {
  greeting: "Idel_Normal",
  play: "Run-Cycle",
  pause: "Idel_Normal",
  save: "Action_Rolls",
  load: "Walk-Cycle",
  settings: "Idle_Aggressive",
  reset: "Action_Rolls",
  music_next: "Run-Cycle",
  error: "Attack_Hit",
  click: "Attack_Bite",
};
```

Reglas:

- El idle no debe ser un solo frame.
- El personaje no debe moverse sin parar como si estuviera poseido.
- Alterna idle calmado, mirada lateral, caminata corta, reaccion, siesta.
- No uses animaciones de muerte como idle normal.
- Si una animacion de muerte se ve bonita, reinterpretala como dormir.

Para dormir:

- Reproduce el clip una vez.
- Usa `LoopOnce`.
- Activa `clampWhenFinished`.
- Muestra burbuja `Zzzz...`.
- Mantiene la pose final 10 a 15 segundos.
- Luego vuelve a idle.

## Orientacion 3D

Evita que mire siempre hacia adelante.

Usa yaw objetivo:

```ts
const targetYawRef = useRef(-0.18);
const currentYawRef = useRef(-0.18);
```

En render:

```ts
currentYawRef.current += (targetYawRef.current - currentYawRef.current) * Math.min(1, delta * 4.2);
modelRoot.rotation.y = currentYawRef.current + expressiveYaw;
```

Reglas:

- Cuando habla, `targetYawRef.current = 0`.
- Cuando camina a la izquierda, gira un poco a la izquierda.
- Cuando camina a la derecha, gira un poco a la derecha.
- En idle puede mirar hacia lados distintos.
- No exageres el yaw si la textura se deforma o las patas atraviesan el cuerpo.

## Burbuja de texto

La burbuja debe:

- Estar cerca de la mascota.
- Tener fondo solido.
- Parecer comic.
- No aparecer vacia.
- Usar `notranslate` para que traductores automaticos no rompan el DOM.

Reglas contra texto en blanco:

```ts
const nextText = text.trim();
if (!nextText) return;
setTypedMessage(nextText.slice(0, 1));
```

El evento puede venir sin `message`. En ese caso la mascota debe escoger una frase propia con `pickLine(type)`.

## Voz tipo Animal Crossing

La voz actual se hace con Web Audio API, no con archivos de audio.

Patron:

- Crear `AudioContext`.
- Crear oscilador principal.
- Crear suboscilador si quieres voz mas grave.
- Pasar por filtro.
- Usar envelopes muy cortos por caracter.
- No reproducir sonido por espacios o signos innecesarios.

Para voces graves tipo alien:

- Frecuencia base baja.
- `sawtooth` + sub `square`.
- Filtro lowpass.
- Duracion corta.
- Ganancia moderada.

No copies voces de personajes con copyright. Inspirate en la sensacion, pero manten una voz propia.

## Dialogos por evento

Las frases viven dentro de cada mascota. No fuerces textos genericos desde el companion si quieres personalidad distinta por mascota.

Correcto:

```ts
emitDragonMascotEvent("music_next");
```

Evitar:

```ts
emitDragonMascotEvent("music_next", "Saltando a la siguiente pista.");
```

Cada mascota debe tener sus propias frases:

```ts
const alienDialogues = {
  music_next: [
    "Siguiente tema. Este planeta necesita mejor soundtrack.",
    "Saltando pista. La anterior fue enviada al espacio profundo.",
  ],
};
```

Eventos principales:

- `greeting`
- `play`
- `pause`
- `save`
- `load`
- `settings`
- `reset`
- `mute`
- `unmute`
- `music`
- `music_prev`
- `music_play_pause`
- `music_next`
- `music_volume_up`
- `music_volume_down`
- `music_mute`
- `music_playlist`
- `error`
- `idle`
- `click`

## Integracion en el companion

El companion esta en:

```txt
src/components/NativeGameBubble.tsx
```

Para agregar una mascota:

1. Crear componente `NewMascot3D.tsx`.
2. Importarlo en `NativeGameBubble.tsx`.
3. Renderizarlo segun `activeMascot.slug`.
4. Mantener los eventos usando `emitDragonMascotEvent`.
5. No crear logica especial por mascota dentro del companion salvo que sea inevitable.

El companion debe emitir eventos, no controlar la personalidad completa.

## Tienda e inventario

Cada mascota comprable debe tener migracion SQL en:

```txt
supabase/migrations/
```

Ejemplo:

```sql
INSERT INTO public.shop_items (
  slug,
  name,
  description,
  price,
  price_type,
  image_url,
  category,
  tier_requirement,
  is_active,
  tradeable
)
VALUES (
  'alien_animal',
  'Mascota Alien 3D',
  'Mascota 3D para el launcher nativo con animaciones, voz y reacciones.',
  12000,
  'fcoins',
  '/mascot/alien/preview.png',
  'launcher_mascot',
  'lite',
  true,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_type = EXCLUDED.price_type,
  image_url = EXCLUDED.image_url,
  category = EXCLUDED.category,
  tier_requirement = EXCLUDED.tier_requirement,
  is_active = EXCLUDED.is_active,
  tradeable = EXCLUDED.tradeable,
  updated_at = now();
```

Regla de inventario:

- Si esta equipada, debe verse en equipamiento.
- Si esta equipada, no debe duplicarse como item disponible en inventario.
- Al desequipar, vuelve a inventario.

## Checklist visual

Antes de darla por lista:

- La mascota se ve 3D, no como PNG flotante.
- Las texturas reales se ven.
- No hay cuadrado de hover.
- No hay recorte rectangular al correr/girar.
- No hay fondo solido.
- La burbuja esta cerca del personaje.
- No aparecen burbujas vacias.
- La voz no suena demasiado baja.
- Al hablar mira al usuario.
- En idle tambien mira a los lados.
- Puede caminar sin salir del companion.
- Puede dormir si el plan de la mascota lo permite.
- Drag and drop no rompe posicion ni animacion.
- En pantallas pequenas no queda detras del juego.

## Checklist tecnico

Ejecutar siempre:

```powershell
npm.cmd run build
```

Revisar:

- No hay errores TypeScript.
- No hay imports sin usar.
- No hay rutas locales en codigo.
- No hay assets faltantes en `public`.
- El GLB carga desde la ruta publica.
- El companion no se congela.
- La mascota se desmonta limpiamente.

Warnings de bundle o Tailwind pueden existir en el proyecto, pero no deben venir de errores nuevos de la mascota.

## Cuando hace falta nuevo launcher

Si solo cambias React/web y el launcher carga el sitio remoto, no necesitas nuevo launcher: basta deploy web.

Si cambias Tauri, Rust, comandos nativos, permisos, updater o empaquetas `dist` dentro del exe, si necesitas generar un launcher nuevo.

Si tienes dudas, regla simple:

- Cambio en `src/components/...`: normalmente web/deploy.
- Cambio en `desktop-launcher/src-tauri/...`: nuevo launcher.
- Cambio en assets publicos usados por web remota: deploy web.
- Cambio en assets empacados dentro del exe: nuevo launcher.

## Problemas comunes

### Se ve sin textura

Revisa UVs y `TEXCOORD_0`. Si no existen, el problema esta en exportacion, no en React.

### Se ve de espaldas

Corrige rotacion en Blender o ajusta `model.rotation` al instalar modelo.

### Se ve partido o cortado

Revisa:

- Caja del canvas.
- Frustum de camara.
- Escala del modelo.
- Offset de `model.position`.
- `overflow`.

### Hover cuadrado

No uses el canvas como hitbox. Usa overlay invisible con `clip-path`.

### Burbuja vacia

Haz `trim()` del texto y no muestres la burbuja si queda vacio.

### El personaje corre mientras lo arrastro

Bloquea idle mientras `dragging === true` y reproduce una animacion de agarre.

### El gloss se ve raro

El gloss no es roughness. Inviertelo o genera roughness real.

## Archivos de referencia actuales

Mascotas:

```txt
src/components/AlienMascot3D.tsx
src/components/AvocadoMascot3D.tsx
src/components/DragonMascot.tsx
src/mascot/dragonMascotConfig.ts
```

Companion:

```txt
src/components/NativeGameBubble.tsx
```

Assets:

```txt
public/mascot/alien/
public/mascot/avocado/
public/mascot/dragon/
```

Migraciones:

```txt
supabase/migrations/*_add_*_launcher_mascot.sql
```

Scripts de referencia:

```txt
scripts/export-alien-clean-skinned.py
scripts/export-alien-clean-skinned-static-test.py
scripts/inspect-alien-mesh-data.py
```

