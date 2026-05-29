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
    const root = document.documentElement;

    if (!activeSkin) {
      // Sin skin activa: limpiar cualquier variable de skin previa y mantener el tema por defecto del sitio
      const currentStyle = root.getAttribute('style') || '';
      const cleaned = currentStyle.replace(/--skin-[^:]+:[^;]+;?/g, '').trim();
      if (cleaned) {
        root.setAttribute('style', cleaned);
      } else {
        root.removeAttribute('style');
      }
      return;
    }

    // Generar CSS variables solo cuando hay skin activa
    const cssVariables = generateThemeCSS(activeSkin);
    const currentStyle = root.getAttribute('style') || '';
    const cleanedStyle = currentStyle.replace(/--skin-[^:]+:[^;]+;?/g, '').trim();
    const newStyle = `${cssVariables}${cleanedStyle ? ' ' + cleanedStyle : ''}`;
    root.setAttribute('style', newStyle);

    return () => {
      const finalStyle = (root.getAttribute('style') || '').replace(/--skin-[^:]+:[^;]+;?/g, '').trim();
      if (finalStyle) {
        root.setAttribute('style', finalStyle);
      } else {
        root.removeAttribute('style');
      }
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
