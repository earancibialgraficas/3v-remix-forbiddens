import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LauncherMascotTheme, getLauncherMascot } from '@/lib/launcherMascots';

const CACHE_PREFIX = 'forbiddens:active-launcher-mascot';

const writeCachedMascotSlug = (userId: string, mascotSlug?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    const key = `${CACHE_PREFIX}:${userId}`;
    if (!mascotSlug) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, mascotSlug);
  } catch {}
};

export function useUserActiveMascot(userId?: string) {
  const [activeMascot, setActiveMascot] = useState<LauncherMascotTheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setActiveMascot(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchMascot = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('user_active_skins')
          .select('skin_slug')
          .eq('user_id', userId)
          .eq('skin_type', 'launcher_mascot')
          .maybeSingle();

        if (error || !data?.skin_slug) {
          writeCachedMascotSlug(userId, null);
          setActiveMascot(null);
          return;
        }

        const mascot = getLauncherMascot(data.skin_slug);
        writeCachedMascotSlug(userId, mascot?.slug || null);
        setActiveMascot(mascot);
      } finally {
        setLoading(false);
      }
    };

    void fetchMascot();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; mascotSlug?: string | null }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      writeCachedMascotSlug(userId, detail?.mascotSlug || null);
      setActiveMascot(getLauncherMascot(detail?.mascotSlug));
      void fetchMascot();
    };

    window.addEventListener('forbiddens:active-mascot-updated', handleUpdate);
    return () => window.removeEventListener('forbiddens:active-mascot-updated', handleUpdate);
  }, [userId]);

  return { activeMascot, loading };
}
