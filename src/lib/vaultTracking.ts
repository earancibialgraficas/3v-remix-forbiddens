// Tracking de sesiones de la Bóveda — registra segundos jugados por juego/día.
// Se usa para limitar el bono x3 a 1 hora diaria por juego.
import { supabase } from "@/integrations/supabase/client";

const DAILY_CAP_SECONDS = 3600;

export async function getTodaySeconds(userId: string, gameName: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await (supabase as any)
    .from("vault_play_sessions")
    .select("seconds_played")
    .eq("user_id", userId)
    .eq("game_name", gameName)
    .eq("play_date", today)
    .maybeSingle();
  return (data?.seconds_played as number) || 0;
}

export async function bumpVaultSeconds(userId: string, gameName: string, addSeconds: number): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const current = await getTodaySeconds(userId, gameName);
  const next = Math.min(DAILY_CAP_SECONDS, current + addSeconds);
  await (supabase as any)
    .from("vault_play_sessions")
    .upsert(
      {
        user_id: userId,
        game_name: gameName,
        play_date: today,
        seconds_played: next,
      },
      { onConflict: "user_id,game_name,play_date" }
    );
  return next;
}

export function isVaultBonusActive(secondsToday: number): boolean {
  return secondsToday < DAILY_CAP_SECONDS;
}

export const VAULT_DAILY_CAP_SECONDS = DAILY_CAP_SECONDS;
