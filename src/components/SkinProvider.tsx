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
    if (!activeSkin) return;

    // Generar CSS variables
    const cssVariables = generateThemeCSS(activeSkin);
    
    // Inyectar como atributo style en el root
    const root = document.documentElement;
    const currentStyle = root.getAttribute('style') || '';
    
    // Remover estilos de skin anteriores y agregar los nuevos
    const cleanedStyle = currentStyle.replace(/--skin-[^:]+:[^;]+;/g, '').trim();
    const newStyle = `${cssVariables}${cleanedStyle ? '; ' + cleanedStyle : ''}`;
    
    root.setAttribute('style', newStyle);

    console.log('🎨 Skin aplicada:', activeSkin.name, activeSkin.colors);

    return () => {
      // Limpiar solo las variables de skin
      const finalStyle = (root.getAttribute('style') || '').replace(/--skin-[^:]+:[^;]+;/g, '').trim();
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
