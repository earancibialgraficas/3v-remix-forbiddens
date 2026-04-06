## Plan de implementación

### 1. Navbar siempre visible estilo Reddit
- Quitar la lógica de mostrar/ocultar navbar basada en scroll
- Hacer el TopNavbar siempre visible y sticky con el diseño de la imagen (similar a Reddit)
- Sidebar izquierda siempre disponible como overlay/drawer (como Reddit)

### 2. Transiciones suaves
- Agregar `transition-all duration-300` globalmente
- Usar framer-motion para animaciones de entrada en páginas y componentes

### 3. Panel derecho: Carrusel de noticias
- Reemplazar la sección de membresías del RightPanel por un carrusel automático de noticias destacadas
- Mantener stats de comunidad y top usuarios

### 4. Todas las páginas funcionales (evitar 404)
Crear páginas placeholder para todas las rutas de la sidebar:
- `/arcade`, `/arcade/salas`, `/arcade/biblioteca`, `/arcade/leaderboards`
- `/gaming-anime`, `/gaming-anime/foro`, `/gaming-anime/anime`, `/gaming-anime/creador`
- `/motociclismo`, `/motociclismo/riders`, `/motociclismo/taller`, `/motociclismo/rutas`
- `/mercado`, `/mercado/gaming`, `/mercado/motor`
- `/social`, `/social/feed`, `/social/reels`, `/social/fotos`
- `/trending`, `/eventos`, `/membresias`, `/ayuda`
- `/registro`, `/login`, `/perfil`, `/configuracion`, `/mensajes`
- `/reglas`, `/contacto`, `/privacidad`, `/faq`

### 5. Autenticación (Lovable Cloud)
- Habilitar Lovable Cloud para backend
- Crear páginas de Login y Registro funcionales
- Integrar con el navbar (mostrar usuario logueado o botón de entrar)

### 6. Responsive móvil
- Sidebar como drawer en móvil
- Ocultar RightPanel en pantallas pequeñas
- Ajustar grid de categorías a 1 columna
- Menú hamburguesa en navbar

### 7. Emulador retro (NES/SNES/GBA)
- Integrar EmulatorJS (biblioteca open source de emulación web)
- Crear página `/arcade/salas` con selector de consola
- Los usuarios podrán cargar sus propias ROMs desde su dispositivo
- Pantalla de juego con controles on-screen para móvil

### Notas técnicas
- Se usará framer-motion para animaciones
- EmulatorJS se cargará via CDN para evitar bundle pesado
- La estructura de layout cambiará: navbar + sidebar siempre visibles, hero solo en home