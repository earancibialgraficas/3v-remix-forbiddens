# Plan de implementación

## 🔐 Contraseña de la Bóveda
**Generada aleatoria:** `pKb8vkn2an` (10 caracteres, alfanuméricos)

Guárdala en lugar seguro. La hashearé con SHA-256 y solo guardo el hash en código (no la contraseña en claro), así nadie puede leerla en el bundle.

## 1. Bóveda Secreta
- **Botón oculto en Biblioteca**: un pequeño cuadrado de 8x8px casi invisible en una esquina (ej. junto al título). Al hacer click → modal de contraseña.
- **Ruta protegida**: `/vault` con guard que verifica un flag en `sessionStorage` puesto por el modal. Sin flag → redirect a Home.
- **3 juegos arcade**: Bomberman, Pacman, Galaga (NES roms). Se lanzan con `GameBubble` con un flag `vaultMode: true`.
- **Triple puntos x 1h/día por juego**: tabla `vault_play_sessions` (user_id, game_name, date, seconds_played). El multiplicador x3 se aplica solo si `seconds_played < 3600` ese día y `vaultMode === true`. Fuera de la bóveda los mismos juegos dan puntos normales.
- **Pistas**: añadiré 10 letras destacadas con color neon distinto en títulos a lo largo del sitio (Home, Biblioteca, Foro, Perfil, Eventos, Ayuda, Membresías, Leaderboard, PhotoWall, Consejos). El usuario debe juntarlas en orden.

## 2. Emulador DS (y 3DS aclaración)
- **DS**: Integraré EmulatorJS con core `desmume2015`. Funciona en navegador, soporta saves/states, leaderboard.
- **3DS**: **No existe emulador 3DS web funcional**. Opciones:
  - (a) Mostrar una tarjeta "experimental" como PS2, redirigiendo a un emulador externo (ej. `https://citra-emu.org` ya cerrado, o `https://azahar-emu.org`).
  - (b) Quitar 3DS y dejar solo DS.
  - **Pregunta abierta**: ¿qué prefieres? Si no respondes, hago opción (a) con modal informativo igual que PS2.
- Añadir consolas al carrusel de `EmulatorPage.tsx` con su imagen, year, glow, core.
- Sin restricción de membresía (jugable por todos).
- Sistema de puntos/saves igual que GBA (Nostalgist) o N64 (EmulatorJS) según core.

## 3. Sugerencia de juegos (Biblioteca)
- Cambiar `send_system_staff_message` a una nueva variante que solo notifica a **master_web + admin** (no moderadores). Ya existe lógica diferenciada por `message_type`. Crearé tipo `'admin_only'` o usaré `send_system_admin_message` (ya existe).
- Quitar el `[LINK:/biblioteca]Ir a Biblioteca[/LINK]` del contenido del mensaje (causa el 404 / botón innecesario).

## 4. Configuraciones Nostalgist en español
- Inyectar traducciones al menú interno de RetroArch via overrides en el `retroarch.cfg` que ya persistimos. No es trivial: RetroArch usa archivos `.po` compilados. Solución pragmática: setear `user_language = 7` (Spanish) en el cfg al iniciar y pre-popular el menú con strings ES via Module hooks. Si no es viable técnicamente, lo informo y dejo el toggle de idioma documentado en Ayuda.

## 5. Ads se vuelven a mostrar con membresía
- Bug: el script de Adsterra ya inyectado no se quita al cargar el perfil tarde. Solución: en `GlobalAds.tsx` añadir cleanup que **remueva** el script `#adsterra-global-script` y limpie iframes/elementos inyectados cuando se detecta usuario premium tras carga inicial.
- Además: forzar `key` re-render del componente cuando cambia `profile.membership_tier`.

## 6. Página de Ayuda - ROMs
- Nueva sección desplegable "DESCARGAR ROMS" con lista de sitios verificados por consola (NES, SNES, GBA, GBC, N64, PS1, Sega, Arcade, DS).

## 🗄️ SQL para tu Supabase externo

```sql
-- 1. Tabla para tracking de la bóveda (triple puntos)
CREATE TABLE IF NOT EXISTS public.vault_play_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  game_name text NOT NULL,
  play_date date NOT NULL DEFAULT CURRENT_DATE,
  seconds_played integer NOT NULL DEFAULT 0,
  bonus_points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_name, play_date)
);

ALTER TABLE public.vault_play_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own vault sessions" ON public.vault_play_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own vault sessions" ON public.vault_play_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vault sessions" ON public.vault_play_sessions
  FOR UPDATE USING (auth.uid() = user_id);
```

## Orden de implementación
1. Fix ads (rápido, urgente)
2. Fix sugerencia (link 404 + solo admin)
3. Sección ROMs en Ayuda
4. Bóveda completa + ruta protegida + pistas
5. Emulador DS (+ 3DS si decides cómo)
6. Traducción Nostalgist (intentar, sin garantía 100%)

## ❓ Antes de codear necesito 1 confirmación
**3DS**: ¿opción (a) modal informativo tipo PS2, o (b) quitarlo? (Por defecto haré (a).)
