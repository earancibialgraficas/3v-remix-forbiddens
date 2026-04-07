import { createContext, useContext, useState, useCallback } from "react";

interface GameSession {
  romUrl: string;
  consoleName: string;
  gameName: string;
  consoleCore: string;
  score: number;
  playTime: number;
}

interface GameBubbleContextType {
  activeGames: GameSession[];
  currentGameIndex: number;
  minimized: boolean;
  launchGame: (session: GameSession) => void;
  minimizeGame: () => void;
  maximizeGame: (index?: number) => void;
  closeGame: (index?: number) => void;
  updateScore: (score: number, playTime: number) => void;
  maxGames: number;
  setMaxGames: (n: number) => void;
}

const GameBubbleContext = createContext<GameBubbleContextType>({
  activeGames: [],
  currentGameIndex: 0,
  minimized: false,
  launchGame: () => {},
  minimizeGame: () => {},
  maximizeGame: () => {},
  closeGame: () => {},
  updateScore: () => {},
  maxGames: 3,
  setMaxGames: () => {},
});

// Membership tier to max games mapping
const tierMaxGames: Record<string, number> = {
  novato: 3,
  entusiasta: 4,
  coleccionista: 5,
  "leyenda arcade": 6,
  "creador verificado": 6,
};

export function GameBubbleProvider({ children }: { children: React.ReactNode }) {
  const [activeGames, setActiveGames] = useState<GameSession[]>([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [minimized, setMinimized] = useState(false);
  const [maxGames, setMaxGames] = useState(3);

  const launchGame = useCallback((session: GameSession) => {
    setActiveGames(prev => {
      const existing = prev.findIndex(g => g.romUrl === session.romUrl);
      if (existing >= 0) {
        setCurrentGameIndex(existing);
        return prev;
      }
      if (prev.length >= maxGames) {
        // Replace oldest
        const newGames = [...prev.slice(1), session];
        setCurrentGameIndex(newGames.length - 1);
        return newGames;
      }
      const newGames = [...prev, session];
      setCurrentGameIndex(newGames.length - 1);
      return newGames;
    });
    setMinimized(false);
  }, [maxGames]);

  const minimizeGame = useCallback(() => setMinimized(true), []);
  const maximizeGame = useCallback((index?: number) => {
    if (index !== undefined) setCurrentGameIndex(index);
    setMinimized(false);
  }, []);
  const closeGame = useCallback((index?: number) => {
    const idx = index ?? currentGameIndex;
    setActiveGames(prev => {
      const newGames = prev.filter((_, i) => i !== idx);
      if (newGames.length === 0) setMinimized(false);
      return newGames;
    });
    setCurrentGameIndex(prev => Math.max(0, prev - 1));
  }, [currentGameIndex]);
  const updateScore = useCallback((score: number, playTime: number) => {
    setActiveGames(prev => prev.map((g, i) => i === currentGameIndex ? { ...g, score, playTime } : g));
  }, [currentGameIndex]);

  return (
    <GameBubbleContext.Provider value={{
      activeGames,
      currentGameIndex,
      minimized,
      launchGame,
      minimizeGame,
      maximizeGame,
      closeGame,
      updateScore,
      maxGames,
      setMaxGames,
    }}>
      {children}
    </GameBubbleContext.Provider>
  );
}

export const useGameBubble = () => useContext(GameBubbleContext);
export { tierMaxGames };
