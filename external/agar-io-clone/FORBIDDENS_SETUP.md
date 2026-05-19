# Agar.io Server para Forbiddens

Este servidor es el clon `owenashurst/agar.io-clone` preparado para abrirse dentro de la ventana multijugador de Forbiddens.

## Que ya esta hecho

- La biblioteca de Forbiddens ya tiene el nuevo juego `Agar.io Server`.
- El juego usa la variable `VITE_AGAR_SERVER_URL`.
- El cliente de este Agar entra automaticamente cuando se abre dentro del iframe.
- El nombre del jugador se toma desde Forbiddens y se limpia para que sea compatible con el clon.
- Los puntos de sesion se guardan en Forbiddens como `agar`, para no necesitar SQL nuevo.

## Probar localmente

Abre una terminal en esta carpeta:

```powershell
cd external\agar-io-clone
npm.cmd install
npm.cmd run build:app
npm.cmd run start:prod
```

El servidor deberia quedar en:

```txt
http://localhost:3000
```

Luego vuelve al proyecto principal, edita `.env` y coloca:

```env
VITE_AGAR_SERVER_URL="http://localhost:3000"
```

Despues reinicia el servidor de desarrollo de Forbiddens para que Vite lea la variable nueva.

## Desplegarlo

Puedes desplegar esta carpeta en Render, Railway, Fly.io o un VPS. Lo importante es que el hosting soporte WebSockets.

Comandos recomendados para Render/Railway:

```txt
Build command: npm install && npm run build:app
Start command: npm run start:prod
```

Cuando tengas la URL publica HTTPS, por ejemplo:

```txt
https://forbiddens-agario.onrender.com
```

ponla en el `.env` del sitio principal:

```env
VITE_AGAR_SERVER_URL="https://forbiddens-agario.onrender.com"
```

## Nota sobre salas

Este repo trae un mundo global por servidor. Eso significa que el multijugador funciona de verdad, pero todos los jugadores conectados al mismo servidor entran al mismo mapa. La sala de Forbiddens sirve para agrupar a tus amigos antes de entrar.

Si despues quieres mundos separados por codigo de sala, hay que refactorizar el servidor para crear un estado de mapa por sala.
