import React, { createContext, useContext, useEffect } from 'react';
import { useUserActiveSkin } from '@/hooks/useUserActiveSkin';
import { clearSkinThemeSource, setSkinThemeSource } from '@/lib/skinDom';

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
    const sourceId = `global:${skinType}`;
    if (loading) return;

    return () => {
      clearSkinThemeSource(sourceId);
    };
  }, [loading, skinType]);

  useEffect(() => {
    if (loading) return;
    setSkinThemeSource(`global:${skinType}`, activeSkin, 0);
  }, [activeSkin, loading, skinType]);


  return (
    <SkinContext.Provider value={{ isLoading: loading }}>
      {children}
    </SkinContext.Provider>
  );
}

export function useSkinContext() {
  return useContext(SkinContext);
}
