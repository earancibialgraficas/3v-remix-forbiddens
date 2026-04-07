
-- Tip suggestions for Consejos Gaming
CREATE TABLE public.tip_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.tip_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create tip suggestions" ON public.tip_suggestions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own suggestions" ON public.tip_suggestions FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'master_web'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins can update suggestions" ON public.tip_suggestions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'master_web'::app_role));
CREATE POLICY "Admins can delete suggestions" ON public.tip_suggestions FOR DELETE USING (has_role(auth.uid(), 'master_web'::app_role));

-- Follows system
CREATE TABLE public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows viewable by everyone" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Private messages
CREATE TABLE public.private_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own messages" ON public.private_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.private_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can mark as read" ON public.private_messages FOR UPDATE USING (auth.uid() = receiver_id);
CREATE POLICY "Users can delete own messages" ON public.private_messages FOR DELETE USING (auth.uid() = sender_id);

-- Banned users
CREATE TABLE public.banned_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  ban_type TEXT NOT NULL DEFAULT 'ban',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bans" ON public.banned_users FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'master_web'::app_role) OR has_role(auth.uid(), 'moderator'::app_role) OR auth.uid() = user_id);
CREATE POLICY "Admins and mods can ban" ON public.banned_users FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'master_web'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
CREATE POLICY "Admins can update bans" ON public.banned_users FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'master_web'::app_role));
CREATE POLICY "Master web can delete bans" ON public.banned_users FOR DELETE USING (has_role(auth.uid(), 'master_web'::app_role));

-- Add role icon columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_icon TEXT DEFAULT '⭐';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_role_icon BOOLEAN DEFAULT true;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;

-- Storage bucket for custom profile images (staff only)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
