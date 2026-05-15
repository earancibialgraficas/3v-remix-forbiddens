-- Tracking de sesiones de la Bóveda (triple puntos x 1h/día por juego)
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

CREATE TRIGGER vault_play_sessions_updated_at
  BEFORE UPDATE ON public.vault_play_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();