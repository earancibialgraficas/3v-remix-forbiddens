import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAvatarFrame, AvatarFrameTheme } from '@/lib/avatarFrames';

const CACHE_PREFIX = 'forbiddens:active-avatar-frame';

const readCachedFrameSlug = (userId?: string) => {
  if (!userId || typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(`${CACHE_PREFIX}:${userId}`);
  } catch {
    return null;
  }
};

const writeCachedFrameSlug = (userId: string, frameSlug?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    const key = `${CACHE_PREFIX}:${userId}`;
    if (!frameSlug) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, frameSlug);
  } catch {}
};

export function useUserAvatarFrame(userId?: string) {
  const [avatarFrame, setAvatarFrame] = useState<AvatarFrameTheme | null>(() => getAvatarFrame(readCachedFrameSlug(userId)));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setAvatarFrame(null);
      setLoading(false);
      return;
    }

    const cached = readCachedFrameSlug(userId);
    if (cached) {
      setAvatarFrame(getAvatarFrame(cached));
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchFrame = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('user_active_skins')
          .select('skin_slug')
          .eq('user_id', userId)
          .eq('skin_type', 'avatar_frame')
          .maybeSingle();

        if (error || !data?.skin_slug) {
          writeCachedFrameSlug(userId, null);
          setAvatarFrame(null);
          return;
        }

        writeCachedFrameSlug(userId, data.skin_slug);
        setAvatarFrame(getAvatarFrame(data.skin_slug));
      } finally {
        setLoading(false);
      }
    };

    void fetchFrame();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; frameSlug?: string | null }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      writeCachedFrameSlug(userId, detail?.frameSlug || null);
      setAvatarFrame(getAvatarFrame(detail?.frameSlug));
      void fetchFrame();
    };

    window.addEventListener('forbiddens:active-avatar-frame-updated', handleUpdate);
    return () => window.removeEventListener('forbiddens:active-avatar-frame-updated', handleUpdate);
  }, [userId]);

  return { avatarFrame, loading };
}
