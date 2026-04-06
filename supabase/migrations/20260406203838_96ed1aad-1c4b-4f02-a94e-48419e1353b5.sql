
-- Fix: require either authenticated user or valid email
DROP POLICY "Anyone can send a message" ON public.contact_messages;
CREATE POLICY "Authenticated users can send messages" ON public.contact_messages 
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
