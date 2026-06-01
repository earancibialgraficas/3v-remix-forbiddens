import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getProfileTransition, ProfileTransitionTheme } from '@/lib/profileTransitions';

const CACHE_PREFIX = 'forbiddens:active-profile-transition';

const readCachedTransitionSlug = (userId?: string) => {
  if (!userId || typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(`${CACHE_PREFIX}:${userId}`);
  } catch {
    return null;
  }
};

const writeCachedTransitionSlug = (userId: string, transitionSlug?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    const key = `${CACHE_PREFIX}:${userId}`;
    if (!transitionSlug) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, transitionSlug);
  } catch {}
};

export function useUserProfileTransition(userId?: string) {
  const [profileTransition, setProfileTransition] = useState<ProfileTransitionTheme | null>(() => getProfileTransition(readCachedTransitionSlug(userId)));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfileTransition(null);
      setLoading(false);
      return;
    }

    const cached = readCachedTransitionSlug(userId);
    if (cached) {
      setProfileTransition(getProfileTransition(cached));
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchTransition = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('user_active_skins')
          .select('skin_slug')
          .eq('user_id', userId)
          .eq('skin_type', 'profile_transition')
          .maybeSingle();

        if (error || !data?.skin_slug) {
          writeCachedTransitionSlug(userId, null);
          setProfileTransition(null);
          return;
        }

        writeCachedTransitionSlug(userId, data.skin_slug);
        setProfileTransition(getProfileTransition(data.skin_slug));
      } finally {
        setLoading(false);
      }
    };

    void fetchTransition();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; transitionSlug?: string | null }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      writeCachedTransitionSlug(userId, detail?.transitionSlug || null);
      setProfileTransition(getProfileTransition(detail?.transitionSlug));
      void fetchTransition();
    };

    window.addEventListener('forbiddens:active-profile-transition-updated', handleUpdate);
    return () => window.removeEventListener('forbiddens:active-profile-transition-updated', handleUpdate);
  }, [userId]);

  return { profileTransition, loading };
}
