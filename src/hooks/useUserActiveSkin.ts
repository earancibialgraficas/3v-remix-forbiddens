import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSkinTheme, SkinTheme, SkinSlug } from '@/lib/skinThemes';

/**
 * Hook para obtener la skin activa de un usuario
 * @param userId - ID del usuario
 * @param skinType - Tipo de skin ('launcher', 'agario', 'game')
 * @returns El tema/skin activo del usuario
 */
export function useUserActiveSkin(userId?: string, skinType: 'launcher' | 'agario' | 'game' = 'launcher') {
  const [activeSkin, setActiveSkin] = useState<SkinTheme>(getSkinTheme('default'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchActiveSkin = async () => {
      try {
        const { data, error } = await supabase
          .from('user_active_skins')
          .select('skin_slug')
          .eq('user_id', userId)
          .eq('skin_type', skinType)
          .single();

        if (error || !data) {
          setActiveSkin(getSkinTheme('default'));
          return;
        }

        setActiveSkin(getSkinTheme(data.skin_slug as SkinSlug));
      } catch (err) {
        console.error('Error fetching active skin:', err);
        setActiveSkin(getSkinTheme('default'));
      } finally {
        setLoading(false);
      }
    };

    fetchActiveSkin();

    // Suscribirse a cambios en tiempo real
    const channel = supabase
      .channel(`user-skins:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_active_skins',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchActiveSkin()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, skinType]);

  return { activeSkin, loading };
}
