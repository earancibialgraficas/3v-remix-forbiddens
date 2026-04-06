
-- Create leaderboard_scores table
CREATE TABLE public.leaderboard_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Anónimo',
  game_name TEXT NOT NULL,
  console_type TEXT NOT NULL CHECK (console_type IN ('nes', 'snes', 'gba')),
  score INTEGER NOT NULL DEFAULT 0,
  play_time_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can view scores
CREATE POLICY "Scores are viewable by everyone"
ON public.leaderboard_scores
FOR SELECT
USING (true);

-- Authenticated users can insert their own scores
CREATE POLICY "Users can insert their own scores"
ON public.leaderboard_scores
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scores
CREATE POLICY "Users can update their own scores"
ON public.leaderboard_scores
FOR UPDATE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_leaderboard_game ON public.leaderboard_scores (game_name, score DESC);
CREATE INDEX idx_leaderboard_user ON public.leaderboard_scores (user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard_scores;

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leaderboard_updated_at
BEFORE UPDATE ON public.leaderboard_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
