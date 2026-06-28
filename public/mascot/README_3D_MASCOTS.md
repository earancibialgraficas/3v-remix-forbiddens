# Guia para implementar mascotas 3D en el launcher

Esta guia documenta el flujo que estamos usando para mascotas 3D del companion nativo, como el dragon, la palta y el alien. La idea es que cualquier mascota futura se implemente con la misma arquitectura: modelo 3D real, animaciones GLB o animacion procedural 3D, textura PBR cuando exista, burbuja de texto, voz tipo Animal Crossing, eventos por boton, canvas transparente del tamano completo del companion y una hitbox invisible separada que no se vea como un cuadrado.

## Objetivo

Una mascota 3D del launcher debe sentirse como un personaje vivo sobre el companion:

- Se renderiza con Three.js sobre fondo transparente.
- No aparece dentro de un cuadro visual.
- Puede caminar, reaccionar, dormir, hablar y responder a botones del companion.
- Usa sus texturas reales, no colores planos de emergencia.
- Tiene frases propias segun el evento.
- Tiene una hitbox invisible con forma aproximada al personaje, no un rectangulo completo.
- El area visible puede ocupar todo el companion para evitar recortes, pero la zona interactiva sigue siendo solo la mascota.
- Al hacer drag and drop, cae en slow motion hasta el suelo invisible y mantiene la animacion de agarre hasta tocarlo.
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

## Canvas full companion e hitbox separada

No uses el mismo rectangulo del canvas como hitbox visible/interactiva. Eso causa dos problemas:

- Hover cuadrado.
- Animaciones recortadas cuando el modelo corre, gira o salta.

Patron actual obligatorio:

```ts
const MASCOT_WIDTH = 340; // zona logica/hitbox de la mascota
const MASCOT_HEIGHT = 292;
const FALLBACK_CANVAS_WIDTH = 620;
const FALLBACK_CANVAS_HEIGHT = 450;
const WORLD_UNITS_PER_PIXEL = 6 / 460;
```

- `MASCOT_WIDTH/HEIGHT`: area logica donde vive la mascota y donde se ubica la hitbox.
- `stageSize`: tamano real del companion medido con `ResizeObserver`.
- El canvas debe ocupar todo el companion, no solo la caja de la mascota.
- El modelo 3D se posiciona dentro del canvas usando `positionRef` y `stageSizeRef`.
- La hitbox es otro elemento invisible encima, en la caja logica de la mascota.
- La hitbox usa `clip-path` y/o calculo por elipse/poligono para aproximarse a la silueta.

Ejemplo:

```tsx
<div ref={stageRef} className="pointer-events-none absolute inset-0 overflow-visible">
  <div className="pointer-events-none absolute z-[105]" style={mascotStyle}>
    <div
      role="button"
      tabIndex={0}
      className="pointer-events-auto absolute inset-0 bg-transparent"
      style={{ clipPath: "polygon(...)" }}
    />
  </div>
  <canvas
    ref={canvasRef}
    width={stageSize.width}
    height={stageSize.height}
    draggable={false}
    className="pointer-events-none absolute inset-0 z-[104] h-full w-full"
    style={{
      width: stageSize.width,
      height: stageSize.height,
    }}
  />
</div>
```

Reglas:

- El canvas no recibe eventos: `pointer-events-none`.
- La hitbox invisible recibe click/drag: `pointer-events-auto`.
- El canvas va como hermano de la caja de hitbox, no dentro de ella.
- El canvas usa `width={stageSize.width}` y `height={stageSize.height}`.
- La caja de hitbox usa `left/top/width/height` con `MASCOT_WIDTH/HEIGHT`.
- No uses offsets negativos de canvas como solucion principal; eso se quedo corto cuando las animaciones vuelan, corren o abren alas.
- No uses `title`, porque el tooltip nativo se siente como hover rectangular.
- No uses `button` si el navegador o estilos globales le meten hover/focus.
- Usa `div role="button"` con `tabIndex={0}` si necesitas accesibilidad basica.

## Posicion 3D dentro del canvas full

La mascota debe estar dentro del companion y adaptarse al espacio disponible. Como el canvas ocupa todo el companion, no basta con mover el elemento HTML: el modelo 3D tambien debe leer la posicion logica de la mascota cada frame.

Usa:

- `ResizeObserver` para recalcular posicion.
- `stageSizeRef` para saber el tamano actual del companion.
- `positionRef` para que el render loop lea la posicion actual sin depender de renders de React.
- `groundY()` para pegarla al piso invisible.
- `clampPosition()` para que no salga del area.
- `WORLD_UNITS_PER_PIXEL` para convertir pixeles del companion a unidades del mundo 3D.

No dibujes un suelo visible. El piso es logico: los pies reaccionan como si existiera, pero el fondo sigue transparente.

Patron de posicion:

```ts
const currentPosition = positionRef.current;
const currentStage = stageSizeRef.current;
const rootX = (currentPosition.x + MASCOT_WIDTH / 2 - currentStage.width / 2) * WORLD_UNITS_PER_PIXEL;
const rootY = -(currentPosition.y + MASCOT_HEIGHT / 2 - currentStage.height / 2) * WORLD_UNITS_PER_PIXEL;

modelRoot.position.x = rootX;
modelRoot.position.y = rootY + localAnimationOffset;
```

Reglas:

- El modelo 3D no debe quedarse en el centro del canvas.
- No uses una camara fija chica con canvas full sin reposicionar el modelo.
- No muevas solo la hitbox si el canvas esta full: eso crea desincronizacion visual.
- Si el personaje se ve cortado, revisa primero canvas full, camara ortografica y escala del modelo.
- Si el personaje se ve como si flotara sin suelo, elimina bob vertical exagerado en `walk/run`.

## Movimiento horizontal real

Cuando la mascota camina o corre, no uses una transicion CSS en `left`. Con canvas full, eso puede mover la hitbox pero dejar el modelo leyendo una posicion final o desincronizada.

Usa movimiento frame por frame:

```ts
const startGroundMove = (targetX: number, duration: number) => {
  const start = clampPosition(positionRef.current.x, groundY());
  const target = clampPosition(targetX, groundY());
  const startedAt = performance.now();

  const step = (now: number) => {
    const progress = clamp((now - startedAt) / duration, 0, 1);
    setPosition({
      x: start.x + (target.x - start.x) * progress,
      y: target.y,
    });
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};
```

Reglas:

- La hitbox y el modelo deben compartir la misma `position`.
- Caminar/correr debe avanzar fisicamente, no reproducir el clip parado.
- Durante `walk/run`, evita subir y bajar todo el root si eso hace que los pies parezcan flotar.
- Usa yaw para mirar hacia la direccion de movimiento.

## Drag and drop y caida slow motion

Al agarrar la mascota:

- Cancela burbuja activa.
- Cambia a una pose de agarre o pose suspendida.
- Bloquea idle temporalmente.
- Sigue el mouse con offset.
- Al soltar, vuelve a `groundY()` con una caida frame por frame, no con CSS.
- Mantiene la animacion/postura de agarre hasta tocar el suelo invisible.
- Recien al terminar la caida vuelve a idle.

Si el rig lo permite, crea una animacion dedicada para ser levantada. Si no, usa el clip mas cercano, pero evita que corra mientras esta siendo arrastrada.

Patron de caida actual:

```ts
const SETTLING_MS = 3200;

const startDropToGround = (onComplete: () => void) => {
  const start = positionRef.current;
  const target = clampPosition(start.x, groundY());
  const startedAt = performance.now();

  const step = (now: number) => {
    const progress = clamp((now - startedAt) / SETTLING_MS, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    setPosition({
      x: start.x + (target.x - start.x) * eased,
      y: start.y + (target.y - start.y) * eased,
    });

    if (progress < 1) requestAnimationFrame(step);
    else onComplete();
  };

  requestAnimationFrame(step);
};
```

Reglas importantes:

- No uses `transition: top ...` para la caida principal.
- Usa `transition: "none"` en `mascotStyle` durante este sistema.
- La caida debe sentirse en slow motion, no como teletransporte.
- Si la mascota baja rapido aunque `SETTLING_MS` sea alto, probablemente el modelo esta leyendo la posicion final demasiado pronto.
- Bloquea idles aleatorios durante `dragging` y `settling`.
- Limpia `requestAnimationFrame` al desmontar para no dejar loops vivos.

### Drag especifico del dragon

El dragon usa el clip de vuelo como animacion de agarre. Para evitar que reproduzca la parte de aterrizaje mientras lo sostienes, el clip se mantiene en ping-pong dentro de un rango inicial/medio.

Reglas:

- Mientras `dragHoldRef.current === true`, el clip de vuelo no debe llegar al aterrizaje.
- Al soltar, `dragHoldRef` sigue activo durante toda la caida.
- Cuando toca el suelo invisible, se desactiva `dragHoldRef` y recien ahi vuelve a idle.
- No congeles el mixer con `setEffectiveTimeScale(0)` porque puede dejar el rig tieso.
- Invierte `timeScale` en los limites para lograr el ping-pong real.

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

## Registro de mascotas disponibles

Ademas de renderizar el componente, registra la mascota en:

```txt
src/lib/launcherMascots.ts
```

Cada entrada debe incluir:

- `slug`: debe coincidir con el item de tienda.
- `name`: nombre visible.
- `description`: descripcion corta.
- `thumbnailUrl`: imagen para tienda/inventario/equipamiento.
- `config`: identificador usado por el companion o inventario si aplica.

Slugs actuales:

```txt
dragon_noxito
avocado_palta
alien_animal
```

El companion actual renderiza por `activeMascot.slug` en `NativeGameBubble.tsx`.

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
- Al soltarla, cae en slow motion hasta el suelo invisible.
- Mantiene animacion/postura de agarre hasta tocar el suelo.
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

### La mascota se corta al correr, volar o abrir alas

Usa canvas full companion. No vuelvas al canvas local con `CANVAS_WIDTH/HEIGHT` fijo alrededor de la mascota. Si el canvas es chico, cualquier animacion amplia se vera encerrada en un cuadrado.

Revisa:

- `canvas` como hermano de la hitbox.
- `canvas` con `absolute inset-0`.
- `stageSize.width/height` como tamano real.
- Camara ortografica recalculada cuando cambia `stageSize`.
- `modelRoot.position` calculado desde `positionRef` y `stageSizeRef`.

### Camina pero no avanza

No basta con cambiar a la animacion `walk` o `run`. Debes mover `position` frame por frame con `startGroundMove`.

Si usas `transition: left ...`, el canvas full puede quedar desincronizado con la hitbox o parecer que la mascota camina en el aire.

### Los pies flotan al caminar

No apliques bob vertical global al root durante `walk/run`. Deja que el clip de animacion mueva las piernas y, si necesitas expresividad, usa rotacion leve o micro escala, no movimiento vertical fuerte del cuerpo completo.

### Cae demasiado rapido al soltarla

No uses `setPosition(clampPosition(...))` directo al soltar. Eso manda la posicion al suelo inmediatamente y el modelo lo lee de golpe.

Usa `startDropToGround` con `requestAnimationFrame`, `SETTLING_MS = 3200` y `transition: "none"`.

Tambien revisa que:

- `settling` bloquee idles aleatorios.
- La animacion de agarre se mantenga hasta `onComplete`.
- `positionRef.current` sea el punto inicial de la caida.
- `setPosition(target)` ocurra solo al final.

### Burbuja vacia

Haz `trim()` del texto y no muestres la burbuja si queda vacio.

### El personaje corre mientras lo arrastro

Bloquea idle mientras `dragging === true` y reproduce una animacion de agarre.

### Cambia a idle antes de tocar el suelo

No llames `setIdle()` o `setAnimationName("idle")` inmediatamente en `finishDrag`.

Correcto:

```ts
startDropToGround(() => {
  setSettling(false);
  setIdle();
});
```

Incorrecto:

```ts
setPosition((current) => clampPosition(current.x, groundY()));
setIdle();
```

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
