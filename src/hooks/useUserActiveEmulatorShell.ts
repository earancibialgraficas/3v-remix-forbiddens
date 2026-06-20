import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmulatorShellTheme, getEmulatorShell } from '@/lib/emulatorShells';

const CACHE_PREFIX = 'forbiddens:active-emulator-shell';

const readCachedShellSlug = (userId?: string, consoleId?: string) => {
  if (!userId || !consoleId || typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(`${CACHE_PREFIX}:${userId}:${consoleId}`)
      || window.localStorage.getItem(`${CACHE_PREFIX}:${userId}`);
  } catch {
    return null;
  }
};

const writeCachedShellSlug = (userId: string, consoleId: string, shellSlug?: string | null) => {
  if (typeof window === 'undefined') return;
  try {
    const key = `${CACHE_PREFIX}:${userId}:${consoleId}`;
    if (!shellSlug) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, shellSlug);
  } catch {}
};

export function useUserActiveEmulatorShell(userId?: string, consoleId?: string | null) {
  const normalizedConsole = String(consoleId || '').toLowerCase();
  const [emulatorShell, setEmulatorShell] = useState<EmulatorShellTheme | null>(() => getEmulatorShell(readCachedShellSlug(userId, normalizedConsole)));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !normalizedConsole) {
      setEmulatorShell(null);
      setLoading(false);
      return;
    }

    const cached = readCachedShellSlug(userId, normalizedConsole);
    if (cached) {
      setEmulatorShell(getEmulatorShell(cached));
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchShell = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('user_active_emulator_shells')
          .select('shell_slug')
          .eq('user_id', userId)
          .eq('console_id', normalizedConsole)
          .maybeSingle();

        if (error || !data?.shell_slug) {
          const { data: legacy } = await (supabase as any)
            .from('user_active_skins')
            .select('skin_slug')
            .eq('user_id', userId)
            .eq('skin_type', 'emulator_shell')
            .maybeSingle();
          const legacyShell = getEmulatorShell(legacy?.skin_slug);
          if (legacyShell?.compatibleConsoles.includes(normalizedConsole)) {
            writeCachedShellSlug(userId, normalizedConsole, legacyShell.slug);
            setEmulatorShell(legacyShell);
            return;
          }
          const fallbackCached = readCachedShellSlug(userId, normalizedConsole);
          const fallbackShell = getEmulatorShell(fallbackCached);
          if (fallbackShell?.compatibleConsoles.includes(normalizedConsole)) {
            setEmulatorShell(fallbackShell);
            return;
          }
          writeCachedShellSlug(userId, normalizedConsole, null);
          setEmulatorShell(null);
          return;
        }

        writeCachedShellSlug(userId, normalizedConsole, data.shell_slug);
        setEmulatorShell(getEmulatorShell(data.shell_slug));
      } finally {
        setLoading(false);
      }
    };

    void fetchShell();

    const handleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; consoleId?: string; shellSlug?: string | null }>).detail;
      if (detail?.userId && detail.userId !== userId) return;
      if (detail?.consoleId && detail.consoleId !== normalizedConsole) return;
      writeCachedShellSlug(userId, normalizedConsole, detail?.shellSlug || null);
      setEmulatorShell(getEmulatorShell(detail?.shellSlug));
      void fetchShell();
    };

    window.addEventListener('forbiddens:active-emulator-shell-updated', handleUpdate);
    return () => window.removeEventListener('forbiddens:active-emulator-shell-updated', handleUpdate);
  }, [normalizedConsole, userId]);

  return { emulatorShell, loading };
}
