import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmulatorShellTheme, getEmulatorShell } from '@/lib/emulatorShells';

const CACHE_PREFIX = 'forbiddens:active-emulator-shell';

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
  const [emulatorShell, setEmulatorShell] = useState<EmulatorShellTheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !normalizedConsole) {
      setEmulatorShell(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchShell = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('user_active_emulator_shells')
          .select('shell_slug')
          .eq('user_id', userId)
          .eq('console_id', normalizedConsole)
          .maybeSingle();

        if (error || !data?.shell_slug) {
          writeCachedShellSlug(userId, normalizedConsole, null);
          setEmulatorShell(null);
          return;
        }

        const activeShell = getEmulatorShell(data.shell_slug);
        if (activeShell?.compatibleConsoles.includes(normalizedConsole)) {
          writeCachedShellSlug(userId, normalizedConsole, activeShell.slug);
          setEmulatorShell(activeShell);
          return;
        }

        writeCachedShellSlug(userId, normalizedConsole, null);
        setEmulatorShell(null);
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
      const updatedShell = getEmulatorShell(detail?.shellSlug);
      setEmulatorShell(updatedShell?.compatibleConsoles.includes(normalizedConsole) ? updatedShell : null);
      void fetchShell();
    };

    window.addEventListener('forbiddens:active-emulator-shell-updated', handleUpdate);
    return () => window.removeEventListener('forbiddens:active-emulator-shell-updated', handleUpdate);
  }, [normalizedConsole, userId]);

  return { emulatorShell, loading };
}
