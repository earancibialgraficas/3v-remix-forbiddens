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

    console.log('🎨 Skin aplicada globalmente:', activeSkin.name);

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

  return (
    <SkinContext.Provider value={{ isLoading: loading }}>
      {children}
    </SkinContext.Provider>
  );
}

export function useSkinContext() {
  return useContext(SkinContext);
}
