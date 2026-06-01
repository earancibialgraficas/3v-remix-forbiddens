import { useEffect, useRef } from 'react';
import { useUserActiveSkin } from '@/hooks/useUserActiveSkin';
import { clearSkinThemeSource, setSkinThemeSource } from '@/lib/skinDom';

interface SkinProviderProps {
  userId?: string;
  skinType?: 'launcher' | 'agario' | 'game';
}

/**
 * Componente que aplica dinámicamente una skin a través de CSS variables
 * Envuelve el contenido que quieras que tenga la skin activa
 */
export function SkinProvider({ userId, skinType = 'launcher' }: SkinProviderProps) {
  const { activeSkin, loading } = useUserActiveSkin(userId, skinType);
  const sourceIdRef = useRef(`page:${skinType}:${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!loading) {
      setSkinThemeSource(sourceIdRef.current, activeSkin, 1);
    }
    return () => {
      clearSkinThemeSource(sourceIdRef.current);
    };
  }, [activeSkin, loading]);


  return null;
}

/**
 * Hook para usar la skin en componentes
 */
export function useSkin(userId?: string, skinType: 'launcher' | 'agario' | 'game' = 'launcher') {
  const { activeSkin, loading } = useUserActiveSkin(userId, skinType);
  return { activeSkin, loading };
}
