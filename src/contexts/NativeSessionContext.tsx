import { createContext, useCallback, useContext, useState } from "react";

export interface NativeSession {
  id: string;
  consoleName: string;
  gameName: string;
  engineName: string;
  romPath?: string | null;
  processId?: number | null;
  score: number;
  playTime: number;
  startedAt: number;
}

interface NativeSessionContextType {
  sessions: NativeSession[];
  currentSessionIndex: number;
  minimized: boolean;
  launchNativeSession: (session: Omit<NativeSession, "id" | "score" | "playTime" | "startedAt">) => void;
  updateNativeSession: (id: string, updates: Partial<NativeSession>) => void;
  closeNativeSession: (id: string) => void;
  minimizeNativeSession: () => void;
  maximizeNativeSession: (index?: number) => void;
}

const NativeSessionContext = createContext<NativeSessionContextType>({
  sessions: [],
  currentSessionIndex: 0,
  minimized: false,
  launchNativeSession: () => {},
  updateNativeSession: () => {},
  closeNativeSession: () => {},
  minimizeNativeSession: () => {},
  maximizeNativeSession: () => {},
});

export function NativeSessionProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<NativeSession[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);

  const launchNativeSession = useCallback((session: Omit<NativeSession, "id" | "score" | "playTime" | "startedAt">) => {
    setSessions((prev) => {
      const existingIndex = prev.findIndex((item) => item.romPath && item.romPath === session.romPath);
      if (existingIndex >= 0) {
        setCurrentSessionIndex(existingIndex);
        return prev;
      }
      const next = [
        ...prev,
        {
          ...session,
          id: crypto.randomUUID(),
          score: 0,
          playTime: 0,
          startedAt: Date.now(),
        },
      ];
      setCurrentSessionIndex(next.length - 1);
      return next;
    });
    setMinimized(false);
  }, []);

  const updateNativeSession = useCallback((id: string, updates: Partial<NativeSession>) => {
    setSessions((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  }, []);

  const closeNativeSession = useCallback((id: string) => {
    setSessions((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      const next = prev.filter((item) => item.id !== id);
      if (!next.length) {
        setMinimized(false);
        setCurrentSessionIndex(0);
      } else {
        setCurrentSessionIndex((current) => {
          if (index < current) return current - 1;
          if (index === current) return Math.min(current, next.length - 1);
          return current;
        });
      }
      return next;
    });
  }, []);

  const minimizeNativeSession = useCallback(() => setMinimized(true), []);
  const maximizeNativeSession = useCallback((index?: number) => {
    if (index !== undefined) setCurrentSessionIndex(index);
    setMinimized(false);
  }, []);

  return (
    <NativeSessionContext.Provider
      value={{
        sessions,
        currentSessionIndex,
        minimized,
        launchNativeSession,
        updateNativeSession,
        closeNativeSession,
        minimizeNativeSession,
        maximizeNativeSession,
      }}
    >
      {children}
    </NativeSessionContext.Provider>
  );
}

export const useNativeSession = () => useContext(NativeSessionContext);
