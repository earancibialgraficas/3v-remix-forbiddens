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
  activeGame: GameSession | null;
  minimized: boolean;
  launchGame: (session: GameSession) => void;
  minimizeGame: () => void;
  maximizeGame: () => void;
  closeGame: () => void;
  updateScore: (score: number, playTime: number) => void;
}

const GameBubbleContext = createContext<GameBubbleContextType>({
  activeGame: null,
  minimized: false,
  launchGame: () => {},
  minimizeGame: () => {},
  maximizeGame: () => {},
  closeGame: () => {},
  updateScore: () => {},
});

export function GameBubbleProvider({ children }: { children: React.ReactNode }) {
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  const [minimized, setMinimized] = useState(false);

  const launchGame = useCallback((session: GameSession) => {
    setActiveGame(session);
    setMinimized(false);
  }, []);

  const minimizeGame = useCallback(() => setMinimized(true), []);
  const maximizeGame = useCallback(() => setMinimized(false), []);
  const closeGame = useCallback(() => {
    setActiveGame(null);
    setMinimized(false);
  }, []);
  const updateScore = useCallback((score: number, playTime: number) => {
    setActiveGame(prev => prev ? { ...prev, score, playTime } : null);
  }, []);

  return (
    <GameBubbleContext.Provider value={{ activeGame, minimized, launchGame, minimizeGame, maximizeGame, closeGame, updateScore }}>
      {children}
    </GameBubbleContext.Provider>
  );
}

export const useGameBubble = () => useContext(GameBubbleContext);
