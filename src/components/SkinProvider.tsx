import { useEffect } from 'react';
import { useUserActiveSkin } from '@/hooks/useUserActiveSkin';
import { generateThemeCSS } from '@/lib/skinThemes';

interface SkinProviderProps {
  userId?: string;
  skinType?: 'launcher' | 'agario' | 'game';
}

const DEMONIACO_PRELOAD_ASSETS = [
  '/skins/demoniaco/backgrounds/solid/window-rock.png',
  '/skins/demoniaco/backgrounds/solid/profile-banner.png',
  '/skins/demoniaco/frames/avatar-ring-trim.png',
  '/skins/demoniaco/frames/frame-edge-v2-trim.png',
  '/skins/demoniaco/equipment/equipment-star.png',
  '/skins/demoniaco/slots/slot-hover.png',
];

const preloadSkinAssets = (slug?: string) => {
  if (typeof window === 'undefined' || slug !== 'demoniaco') return;
  DEMONIACO_PRELOAD_ASSETS.forEach((src) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  });
};

/**
 * Componente que aplica dinámicamente una skin a través de CSS variables
 * Envuelve el contenido que quieras que tenga la skin activa
 */
export function SkinProvider({ userId, skinType = 'launcher' }: SkinProviderProps) {
  const { activeSkin, loading } = useUserActiveSkin(userId, skinType);

  useEffect(() => {
    const root = document.documentElement;

    if (loading) return;

    if (!activeSkin) {
      return;
    }

    const previousStyle = root.getAttribute('style') || '';
    // Generar CSS variables solo cuando hay skin activa
    const cssVariables = generateThemeCSS(activeSkin);
    preloadSkinAssets(activeSkin.slug);
    const cleanedStyle = previousStyle.replace(/--skin-[^:]+:[^;]+;?/g, '').trim();
    const newStyle = `${cssVariables}${cleanedStyle ? ' ' + cleanedStyle : ''}`;
    root.setAttribute('style', newStyle);

    return () => {
      if (previousStyle) {
        root.setAttribute('style', previousStyle);
      } else {
        root.removeAttribute('style');
      }
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
