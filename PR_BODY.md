Resumen

Al cambiar la sala de música, el componente borraba la playlist y el índice actual, lo que hacía perder la canción en reproducción. Este PR evita limpiar la playlist al cambiar de sala y solo reinicia el estado transitorio de reproducción (pausa/tiempo/duración/oyentes).

Qué cambia

- [src/components/MultiplayerSharedMusicPlayer.tsx](src/components/MultiplayerSharedMusicPlayer.tsx): No limpiar `playlist` ni `currentIndex` al cambiar `activeRoomId`.
- [test/MultiplayerSharedMusicPlayer.spec.tsx](test/MultiplayerSharedMusicPlayer.spec.tsx): Añadida prueba que verifica que la canción se conserva al cambiar de sala.
- [scripts/create_pr.ps1](scripts/create_pr.ps1): Script PowerShell para automatizar instalación, checks, commit, push y creación de PR.

Cómo probar localmente

1. `npm install`
2. `npx tsc --noEmit`
3. `npm test`
4. `npm run dev` y en la app: añadir una canción compartida, cambiar de sala y comprobar que la canción sigue presente.

Notas

- Este entorno no puede ejecutar git/npm/gh por razones de permisos, por eso incluyo `scripts/create_pr.ps1` para que lo ejecutes localmente y genere el PR automáticamente.
- Si quieres que cree el PR por ti, necesitaría acceso remoto con credenciales o que ejecutes el script en tu máquina.
