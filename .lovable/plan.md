## 1. Saves de N64/PS1/Arcade en Google Drive

**Problema actual:** los `save states` se guardan en `localStorage` + columna `game_state` de `leaderboard_scores`. La integración con Drive solo lee ROMs (scope `drive.readonly`).

**Cambios:**
- Reconectar Google Drive con scope `drive.file` (lectura + escritura limitada a archivos creados por la app — no expone todo el Drive).
- Nueva tabla `user_drive_saves` (registro/índice, NO contenido):
  - `user_id`, `game_name`, `console_type`, `drive_file_id`, `file_name`, `size_bytes`, `created_at`, `updated_at`
  - RLS: solo el dueño puede ver/insertar/actualizar/borrar.
- En `GameBubble.tsx` (cores EmulatorJS — N64/PS1/Arcade):
  - **Al guardar (Save State):** subir el blob a una carpeta `RetroSaves` en Drive del usuario (crearla si no existe), upsert en `user_drive_saves`. Ya NO escribir en `leaderboard_scores.game_state`.
  - **Al cargar (Load State):** buscar `drive_file_id` en `user_drive_saves` por `user_id + game + console`, descargar bytes desde Drive, aplicar al emulador.
  - Si Drive no está vinculado → toast "Vincula Drive para guardar partidas".
- En `AlmacenamientoTab.tsx`: nueva sección **"Partidas en Drive"** listando `user_drive_saves` con icono ☁️ especial (color cyan), nombre del juego, consola, fecha, botón eliminar.
- Nostalgist (NES/SNES/GBA) **no cambia** — sigue con cache + DB como te gusta.

## 2. Editor rich-text estilo Word (TipTap)

**Alcance:** solo en el formulario "Nuevo Post" y "Editar Post" del foro (ForumPage). Comentarios y otros formularios no se tocan en esta tanda.

**Librería:** `@tiptap/react` + extensiones (StarterKit, Underline, TextAlign, TextStyle, Color, FontFamily, FontSize, Link).

**Componente nuevo:** `src/components/RichTextEditor.tsx`
- Editor con **BubbleMenu flotante** que aparece al seleccionar texto (estilo Word/Notion).
- Botones del bubble menu (todos funcionales, sin decorativos):
  - Negrita, Cursiva, Subrayado, Tachado
  - Color de texto: paleta neon del sitio (verde, cyan, magenta, amarillo, naranja, blanco) + reset
  - Tamaño: pequeño / normal / grande / extra-grande
  - Tipografía: 10 fuentes Google (Montserrat, Inter, Roboto, Poppins, Bebas Neue, Press Start 2P, Orbitron, Rajdhani, Space Mono, JetBrains Mono)
  - Alineación: izq / centro / der
  - Encabezado: H2 / H3 / párrafo
  - Lista (•), Cita (▎), Link (URL prompt)
- Toolbar fija arriba con: insertar imagen por URL (modal pide URL — NO subida local), insertar video por URL.
- **Sin** botón de subir foto local.

**Almacenamiento:**
- `posts.title` y `posts.content` pasan a guardar **HTML** generado por TipTap (no BBCode).
- Posts antiguos (BBCode/markdown) siguen mostrándose con el renderer existente. Detección: si empieza con `<` → render HTML sanitizado; si no → render legacy.
- Sanitización HTML con `dompurify` (lista blanca de tags y atributos).

**Visualización del título:**
- **Vista detalle de post:** renderiza HTML del título con todos los formatos.
- **Listado de posts (cards) y carruseles/trending/perfil:** función `stripHtmlToText(title)` → solo texto plano, fuente Montserrat, alineado a la izquierda. Coherencia visual asegurada.
- La columna `title_align` ya no se usa para nuevos posts (la alineación va dentro del HTML); se mantiene por compatibilidad con posts antiguos.

## 3. Detalles técnicos

- Migration SQL: crea `user_drive_saves` + RLS.
- `DriveSyncButton.tsx`: actualizar scope a `drive.file` (mantiene `drive.readonly` para ROMs).
- Helper `src/lib/driveSaves.ts`: `uploadSaveToDrive`, `downloadSaveFromDrive`, `ensureRetroSavesFolder`.
- Helper `src/lib/htmlContent.ts`: `isHtml`, `stripHtmlToText`, `sanitizeHtml`.
- Instalar: `@tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-text-style @tiptap/extension-color @tiptap/extension-font-family @tiptap/extension-link dompurify`.

## Fuera de alcance (siguiente tanda si quieres)
- Migrar comentarios al editor TipTap.
- Migrar editor de social_content (FeedPage, PhotoWallPage).
- Migrar saves antiguos de DB → Drive automáticamente.
