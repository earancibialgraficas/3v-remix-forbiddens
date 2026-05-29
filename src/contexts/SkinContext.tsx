import React, { createContext, useContext, useEffect } from 'react';
import { useUserActiveSkin } from '@/hooks/useUserActiveSkin';
import { generateThemeCSS } from '@/lib/skinThemes';

interface SkinContextType {
  isLoading: boolean;
}

const SkinContext = createContext<SkinContextType>({ isLoading: true });

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
