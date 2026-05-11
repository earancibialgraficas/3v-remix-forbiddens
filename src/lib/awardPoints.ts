import { supabase } from "@/integrations/supabase/client";

/**
 * Otorga puntos bonus llamando a la función RPC del backend.
 * El backend valida: dedupe, anti-self, tope diario 2000 pts.
 *
 * @param recipient user_id que RECIBE los puntos (autor del contenido)
 * @param actor     user_id que dispara el evento (viewer); null para subidas propias
 * @param sourceType 'video_upload' | 'video_watch_30s' | 'photo_view'
 * @param sourceId  id del video/foto
 * @param points    puntos a otorgar (10 watch, 20 upload, 2 photo view)
 */
export async function awardBonusPoints(
  recipient: string,
  actor: string | null,
  sourceType: "video_upload" | "video_watch_30s" | "photo_view" | "photo_view_actor" | "like_received",
  sourceId: string,
  points: number,
): Promise<{ awarded: number; reason: string } | null> {
  if (!recipient || !sourceId) return null;
  try {
    const { data, error } = await supabase.rpc("award_bonus_points", {
      p_recipient: recipient,
      p_actor: actor,
      p_source_type: sourceType,
      p_source_id: sourceId,
      p_points: points,
    });
    if (error) {
      console.warn("[awardBonusPoints] error:", error.message);
      return null;
    }
    return data as { awarded: number; reason: string };
  } catch (e) {
    console.warn("[awardBonusPoints] exception:", e);
    return null;
  }
}
