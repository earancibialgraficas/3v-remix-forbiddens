import React, { createContext, useContext, useEffect } from 'react';
import { useUserActiveSkin } from '@/hooks/useUserActiveSkin';
import { generateThemeCSS } from '@/lib/skinThemes';

interface SkinContextType {
  isLoading: boolean;
}

const SkinContext = createContext<SkinContextType>({ isLoading: true });

const DEMONIACO_PRELOAD_ASSETS = [
  '/skins/demoniaco/backgrounds/solid/hellscape-castle.png',
  '/skins/demoniaco/backgrounds/solid/window-rock.png',
  '/skins/demoniaco/backgrounds/solid/profile-banner.png',
  '/skins/demoniaco/backgrounds/solid/basalt-wide.png',
  '/skins/demoniaco/backgrounds/solid/basalt-tall.png',
  '/skins/demoniaco/frames/avatar-ring-trim.png',
  '/skins/demoniaco/frames/frame-edge-v2-trim.png',
  '/skins/demoniaco/frames/frame-edge-v2-trim-vertical.png',
  '/skins/demoniaco/equipment/equipment-star.png',
  '/skins/demoniaco/slots/slot-hover.png',
  '/skins/demoniaco/home/banner-hero.png',
];

const preloadSkinAssets = (slug?: string) => {
  if (typeof window === 'undefined' || slug !== 'demoniaco') return;
  DEMONIACO_PRELOAD_ASSETS.forEach((src) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  });
};

export function SkinContextProvider({
  children,
  userId,
  skinType = 'launcher',
}: {
  children: React.ReactNode;
  userId?: string;
  skinType?: 'launcher' | 'agario' | 'game';
}) {
  const { activeSkin, loading } = useUserActiveSkin(userId, skinType);

  useEffect(() => {
    const root = document.documentElement;

    if (!activeSkin) {
      // Sin skin activa: limpiar variables previas y usar el tema por defecto del sitio
      const currentStyle = root.getAttribute('style') || '';
      const cleaned = currentStyle.replace(/--skin-[^:]+:[^;]+;?/g, '').trim();
      if (cleaned) {
        root.setAttribute('style', cleaned);
      } else {
        root.removeAttribute('style');
      }
      return;
    }

    const cssVariables = generateThemeCSS(activeSkin);
    preloadSkinAssets(activeSkin.slug);
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


  return (
    <SkinContext.Provider value={{ isLoading: loading }}>
      {children}
    </SkinContext.Provider>
  );
}

export function useSkinContext() {
  return useContext(SkinContext);
}
