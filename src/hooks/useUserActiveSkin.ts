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
  const [activeSkin, setActiveSkin] = useState<SkinTheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setActiveSkin(null);
      setLoading(false);
      return;
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
          console.error('❌ Error fetching skin:', error);
          setActiveSkin(null);
          setLoading(false);
          return;
        }

        if (!data) {
          setActiveSkin(null);
        } else {
          setActiveSkin(getSkinTheme(data.skin_slug as SkinSlug));
        }
      } catch (err) {
        console.error('❌ Exception in fetchActiveSkin:', err);
        setActiveSkin(null);
      } finally {
        setLoading(false);
      }
    };


    fetchActiveSkin();

    const handleActiveSkinUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string; skinType?: string }>).detail;
      if (!detail || (detail.userId === userId && detail.skinType === skinType)) {
        void fetchActiveSkin();
      }
    };

    window.addEventListener('forbiddens:active-skin-updated', handleActiveSkinUpdated);

    // Suscribirse a cambios en tiempo real con topic único para evitar reutilizar
    // un canal ya suscrito cuando hay varios providers montados en /perfil.
    const channelTopic = `user-skins:${userId}:${skinType}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelTopic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_active_skins',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔄 Real-time skin update:', payload);
          fetchActiveSkin();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('forbiddens:active-skin-updated', handleActiveSkinUpdated);
      supabase.removeChannel(channel);
    };
  }, [userId, skinType]);

  return { activeSkin, loading };
}
