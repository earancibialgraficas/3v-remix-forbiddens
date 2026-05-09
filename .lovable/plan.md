# Plan de cambios

Cada punto incluye **SQL** (que tú ejecutarás en tu Supabase externa) y/o cambios de código en el front.

---

## 1. Social Hub: comentarios con fecha/hora, reporte y botón de moderación

- `social_comments` ya tiene `created_at`. Solo falta exponerlo en la UI.
- Mostrar fecha/hora en cada comentario (formato relativo "hace 2h").
- Añadir botón de **reportar** (abre `ReportModal` apuntando al autor).
- Añadir botón de **moderación** (`CommentModMenu` con `table="social_comments"`) visible para staff — ya existe el componente, solo falta integrarlo donde se pintan los comentarios del social hub.

**SQL:** ninguno (la tabla ya tiene lo necesario).

---

## 2. Saves de partidas se mezclan entre cuentas en el mismo navegador

- Hoy se guardan en localStorage **sin namespacing por user_id**, por eso al cambiar de cuenta aparecen los del anterior.
- Cambios:
  - Limpiar saves locales (`nostalgist:*`, `emulator-save-*`, etc.) en `signOut` y al detectar cambio de `user.id`.
  - Prefijo `userId` en las claves de localStorage al guardar/cargar.
  - Al iniciar el emulador, leer **siempre** desde DB primero y refrescar localStorage.

**SQL:** ninguno.

---

## 3. NES/SNES/GBA se reinician solos

- Investigar `EmulatorPage`: probablemente un `useEffect` con dependencias inestables que re-monta el `<Nostalgist>`.
- Fix: estabilizar deps (memoizar `core`, `rom`, `state`) y evitar re-render del wrapper cuando solo cambian props de UI (volumen, fullscreen).

**SQL:** ninguno.

---

## 4. Usuarios nuevos aparecen como "Top 1" en el panel derecho

- Ranking actual ordena por `total_score DESC` sin filtrar ceros → el primero que entre con 0 puntos queda arriba.
- Fix en query del `RightPanel`: `WHERE total_score > 0 ORDER BY total_score DESC`.

**SQL:** ninguno.

---

## 5. Sistema de puntos por actividad

Reglas:

| Acción                              | Puntos |
|-------------------------------------|--------|
| Crear post                          | +100   |
| Subir imagen/video/reel             | +15    |
| Crear comentario                    | +5     |
| Ver reel/video ≥30s en social hub   | +2     |
| Ver imagen en feed                  | +1     |
| Expandir imagen en muro             | +1     |
| Staff elimina contenido reportado   | resta los puntos correspondientes |

**SQL (BLOQUE 7):**

```sql
-- Tabla de log para auditoría y para no duplicar puntos por la misma vista
CREATE TABLE IF NOT EXISTS public.user_points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,        -- post_create, photo_create, social_create, comment_create,
                                    -- video_view, image_feed_view, image_wall_view,
                                    -- post_delete, photo_delete, social_delete, comment_delete
  points_change integer NOT NULL,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, action_type, related_id)  -- evita duplicar vistas
);

ALTER TABLE public.user_points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own points log"
  ON public.user_points_log FOR SELECT
  USING (auth.uid() = user_id OR is_staff(auth.uid()));

CREATE POLICY "Authenticated can insert points log"
  ON public.user_points_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Función central
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id uuid, p_action text, p_points int, p_related uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_points_log (user_id, action_type, points_change, related_id)
  VALUES (p_user_id, p_action, p_points, p_related)
  ON CONFLICT (user_id, action_type, related_id) DO NOTHING;

  IF FOUND THEN
    UPDATE public.profiles
       SET total_score = GREATEST(0, COALESCE(total_score,0) + p_points)
     WHERE user_id = p_user_id;
  END IF;
END;$$;

-- Triggers de creación
CREATE OR REPLACE FUNCTION public.points_on_post_create() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_points(NEW.user_id,'post_create',100,NEW.id); RETURN NEW; END;$$;

CREATE OR REPLACE FUNCTION public.points_on_photo_create() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_points(NEW.user_id,'photo_create',15,NEW.id); RETURN NEW; END;$$;

CREATE OR REPLACE FUNCTION public.points_on_social_create() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_points(NEW.user_id,'social_create',15,NEW.id); RETURN NEW; END;$$;

CREATE OR REPLACE FUNCTION public.points_on_comment_create() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_points(NEW.user_id,'comment_create',5,NEW.id); RETURN NEW; END;$$;

-- Triggers de eliminación (restan)
CREATE OR REPLACE FUNCTION public.points_on_post_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_points(OLD.user_id,'post_delete',-100,OLD.id); RETURN OLD; END;$$;

CREATE OR REPLACE FUNCTION public.points_on_photo_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_points(OLD.user_id,'photo_delete',-15,OLD.id); RETURN OLD; END;$$;

CREATE OR REPLACE FUNCTION public.points_on_social_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_points(OLD.user_id,'social_delete',-15,OLD.id); RETURN OLD; END;$$;

CREATE OR REPLACE FUNCTION public.points_on_comment_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_points(OLD.user_id,'comment_delete',-5,OLD.id); RETURN OLD; END;$$;

DROP TRIGGER IF EXISTS trg_points_post_ins ON public.posts;
CREATE TRIGGER trg_points_post_ins AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.points_on_post_create();
DROP TRIGGER IF EXISTS trg_points_post_del ON public.posts;
CREATE TRIGGER trg_points_post_del AFTER DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.points_on_post_delete();

DROP TRIGGER IF EXISTS trg_points_photo_ins ON public.photos;
CREATE TRIGGER trg_points_photo_ins AFTER INSERT ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.points_on_photo_create();
DROP TRIGGER IF EXISTS trg_points_photo_del ON public.photos;
CREATE TRIGGER trg_points_photo_del AFTER DELETE ON public.photos
  FOR EACH ROW EXECUTE FUNCTION public.points_on_photo_delete();

DROP TRIGGER IF EXISTS trg_points_social_ins ON public.social_content;
CREATE TRIGGER trg_points_social_ins AFTER INSERT ON public.social_content
  FOR EACH ROW EXECUTE FUNCTION public.points_on_social_create();
DROP TRIGGER IF EXISTS trg_points_social_del ON public.social_content;
CREATE TRIGGER trg_points_social_del AFTER DELETE ON public.social_content
  FOR EACH ROW EXECUTE FUNCTION public.points_on_social_delete();

DROP TRIGGER IF EXISTS trg_points_comment_ins ON public.comments;
CREATE TRIGGER trg_points_comment_ins AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.points_on_comment_create();
DROP TRIGGER IF EXISTS trg_points_comment_del ON public.comments;
CREATE TRIGGER trg_points_comment_del AFTER DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.points_on_comment_delete();
```

**Front:** llamar `supabase.rpc('award_points', {...})` desde:
- `SocialReelsPage` cuando un video reproducido acumule ≥30s (`video_view`, +2).
- `FeedPage` al detectar imagen visible en viewport (`image_feed_view`, +1, una vez por imagen).
- `PhotoWallPage` al expandir foto (`image_wall_view`, +1).

---

## 6. Alineación de texto en títulos de posts

- Permitir `text-align` en el editor (al crear/editar) → guardar la alineación en el campo `title` ya no sirve (es plain text). Mejor guardar la alineación en una columna nueva o **derivarla solo en el editor** y forzar `text-align: left` en el listado.
- Solución mínima: en el listado pintar `<h2 className="text-left">{title}</h2>` ignorando cualquier estilo inline. En el editor, permitir alineación visual local (no persistida).

Si quieres que la alineación se persista, dime y agrego columna `title_align`.

**SQL:** ninguno (a menos que persistamos alineación).

---

## 7. CDN miniaturas + botón "Actualizar" biblioteca Drive

- Revisar `BibliotecaPage` y `DriveSyncButton`:
  - Verificar URL de la CDN, headers CORS, fallback a IA.
  - Verificar que el botón "Actualizar" llame a la edge function correcta y maneje errores visibles en toast.

**SQL:** ninguno.

---

## Orden de ejecución sugerido

1. Punto 4 (top usuarios) — fix rápido de query.
2. Punto 1 (social hub comments UI).
3. Punto 6 (text-align títulos).
4. Punto 2 (saves por usuario).
5. Punto 3 (reset emuladores).
6. Punto 7 (CDN + sync Drive).
7. Punto 5 (sistema de puntos — SQL BLOQUE 7 + integración front).

¿Apruebas el plan? Si quieres ajustar alguna regla de puntos, persistir la alineación del título, o cambiar el orden, dímelo antes de empezar.
