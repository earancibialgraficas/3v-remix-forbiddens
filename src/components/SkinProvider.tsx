import { useEffect } from 'react';
import { useUserActiveSkin } from '@/hooks/useUserActiveSkin';
import { generateThemeCSS } from '@/lib/skinThemes';

interface SkinProviderProps {
  userId?: string;
  skinType?: 'launcher' | 'agario' | 'game';
}

/**
 * Componente que aplica dinámicamente una skin a través de CSS variables
 * Envuelve el contenido que quieras que tenga la skin activa
 */
export function SkinProvider({ userId, skinType = 'launcher' }: SkinProviderProps) {
  const { activeSkin } = useUserActiveSkin(userId, skinType);

  useEffect(() => {
    // Inyectar CSS variables en el root
    const cssVariables = generateThemeCSS(activeSkin);
    const style = document.documentElement.getAttribute('style') || '';
    
    // Si ya tiene style, actualizar las variables
    document.documentElement.setAttribute('style', cssVariables);
    
    // También inyectar en un elemento específico si existe
    const skinElement = document.getElementById('theme-provider');
    if (skinElement) {
      skinElement.setAttribute('style', cssVariables);
    }

    return () => {
      // Limpiar si es necesario
      document.documentElement.removeAttribute('style');
    };
  }, [activeSkin]);

  return null;
}

/**
 * Hook para usar la skin en componentes
 */
export function useSkin(userId?: string, skinType: 'launcher' | 'agario' | 'game' = 'launcher') {
  const { activeSkin, loading } = useUserActiveSkin(userId, skinType);
  return { activeSkin, loading };
}
