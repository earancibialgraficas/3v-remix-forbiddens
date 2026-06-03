import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmulatorShellTheme, getEmulatorShell } from '@/lib/emulatorShells';

const CACHE_PREFIX = 'forbiddens:active-emulator-shell';

const readCachedShellSlug = (userId?: string) => {
  if (!userId || typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(`${CACHE_PREFIX}:${userId}`);
  } catch {
    return null;
  }
};

const writeCachedShellSlug = (userId: string, shellSlug?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    const key = `${CACHE_PREFIX}:${userId}`;
    if (!shellSlug) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, shellSlug);
  } catch {}
};

export function useUserActiveEmulatorShell(userId?: string) {
  const [emulatorShell, setEmulatorShell] = useState<EmulatorShellTheme | null>(() => getEmulatorShell(readCachedShellSlug(userId)));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setEmulatorShell(null);
      setLoading(false);
      return;
    }

    const cached = readCachedShellSlug(userId);
    if (cached) {
      setEmulatorShell(getEmulatorShell(cached));
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchShell = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('user_active_skins')
          .select('skin_slug')
          .eq('user_id', userId)
          .eq('skin_type', 'emulator_shell')
          .maybeSingle();

        if (error || !data?.skin_slug) {
          const fallbackCached = readCachedShellSlug(userId);
          const fallbackShell = getEmulatorShell(fallbackCached);
          if (fallbackShell) {
            setEmulatorShell(fallbackShell);
            return;
          }
          writeCachedShellSlug(userId, null);
          setEmulatorShell(null);
          return;
        }

        writeCachedShellSlug(userId, data.skin_slug);
        setEmulatorShell(getEmulatorShell(data.skin_slug));
      } finally {
        setLoading(false);
      }
    };

    void fetchShell();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; shellSlug?: string | null }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      writeCachedShellSlug(userId, detail?.shellSlug || null);
      setEmulatorShell(getEmulatorShell(detail?.shellSlug));
      void fetchShell();
    };

    window.addEventListener('forbiddens:active-emulator-shell-updated', handleUpdate);
    return () => window.removeEventListener('forbiddens:active-emulator-shell-updated', handleUpdate);
  }, [userId]);

  return { emulatorShell, loading };
}
