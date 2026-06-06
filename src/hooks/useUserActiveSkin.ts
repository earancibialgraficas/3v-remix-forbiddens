import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSkinTheme, SkinTheme, SkinSlug } from '@/lib/skinThemes';

const SKIN_CACHE_PREFIX = 'forbiddens:active-skin';

const getSkinCacheKey = (userId: string, skinType: string) => `${SKIN_CACHE_PREFIX}:${userId}:${skinType}`;

const readCachedSkinSlug = (userId: string, skinType: string): SkinSlug | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getSkinCacheKey(userId, skinType));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { skinSlug?: string };
    if (!parsed.skinSlug || parsed.skinSlug === 'default') return null;
    return parsed.skinSlug as SkinSlug;
  } catch {
    return null;
  }
};

const writeCachedSkinSlug = (userId: string, skinType: string, skinSlug?: string | null) => {
  if (typeof window === 'undefined') return;
  const key = getSkinCacheKey(userId, skinType);
  try {
    if (!skinSlug || skinSlug === 'default') {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify({ skinSlug, updatedAt: Date.now() }));
  } catch {}
};

export function useUserActiveSkin(userId?: string, skinType: 'launcher' | 'agario' | 'game' = 'launcher') {
  const [activeSkin, setActiveSkin] = useState<SkinTheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setActiveSkin(null);
      setLoading(false);
      return;
    }

    const cachedSkinSlug = readCachedSkinSlug(userId, skinType);
    if (cachedSkinSlug) {
      setActiveSkin(getSkinTheme(cachedSkinSlug));
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchActiveSkin = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('user_active_skins')
          .select('skin_slug')
          .eq('user_id', userId)
          .eq('skin_type', skinType)
          .maybeSingle();

        if (error) {
          console.error('Error fetching skin:', error);
          const fallbackSkinSlug = readCachedSkinSlug(userId, skinType);
          setActiveSkin(fallbackSkinSlug ? getSkinTheme(fallbackSkinSlug) : null);
          setLoading(false);
          return;
        }

        if (!data) {
          setActiveSkin(null);
          writeCachedSkinSlug(userId, skinType, null);
        } else {
          const nextSkinSlug = data.skin_slug as SkinSlug;
          setActiveSkin(nextSkinSlug === 'default' ? null : getSkinTheme(nextSkinSlug));
          writeCachedSkinSlug(userId, skinType, nextSkinSlug);
        }
      } catch (err) {
        console.error('Exception in fetchActiveSkin:', err);
        const fallbackSkinSlug = readCachedSkinSlug(userId, skinType);
        setActiveSkin(fallbackSkinSlug ? getSkinTheme(fallbackSkinSlug) : null);
      } finally {
        setLoading(false);
      }
    };

    void fetchActiveSkin();

    const handleActiveSkinUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; skinType?: string; skinSlug?: string }>).detail;
      if (!detail || (detail.userId === userId && detail.skinType === skinType)) {
        if (detail?.skinSlug) {
          writeCachedSkinSlug(userId, skinType, detail.skinSlug);
          setActiveSkin(detail.skinSlug === 'default' ? null : getSkinTheme(detail.skinSlug as SkinSlug));
        }
        void fetchActiveSkin();
      }
    };

    window.addEventListener('forbiddens:active-skin-updated', handleActiveSkinUpdated);

    return () => {
      window.removeEventListener('forbiddens:active-skin-updated', handleActiveSkinUpdated);
    };
  }, [userId, skinType]);

  return { activeSkin, loading };
}
