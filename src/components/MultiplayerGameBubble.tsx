import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  ExternalLink,
  Gamepad2,
  GripVertical,
  Maximize2,
  Minimize2,
  Move,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface MultiplayerGame {
  id: string;
  label: string;
}

interface MultiplayerGameBubbleProps {
  game: MultiplayerGame | null;
  onClose: () => void;
}

const makeRoomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function MultiplayerGameBubble({ game, onClose }: MultiplayerGameBubbleProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const popupRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 860, h: 620 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [roomCode, setRoomCode] = useState(makeRoomCode);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });

  useEffect(() => {
    if (!game) return;
    setMinimized(false);
    setPosition({ x: 0, y: 0 });
    setSize({ w: Math.min(900, window.innerWidth - 32), h: Math.min(640, window.innerHeight - 32) });
    setRoomCode(makeRoomCode());
    setReloadKey((key) => key + 1);
    setLeaderboard([]);
  }, [game?.id]);

  // 📡 Escuchar actualizaciones del Leaderboard desde el juego (iframe)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "game:updateLeaderboard") {
        setLeaderboard(event.data.players || []);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        setPosition({
          x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
          y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
        });
      }
      if (resizing) {
        setSize({
          w: Math.max(420, resizeRef.current.startW + (e.clientX - resizeRef.current.startX)),
          h: Math.max(320, resizeRef.current.startH + (e.clientY - resizeRef.current.startY)),
        });
      }
    };
    const onUp = () => {
      setDragging(false);
      setResizing(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, resizing]);

  const onDragDown = (e: React.MouseEvent) => {
    if (minimized) return;
    setDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  const onResizeDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: size.w,
      startH: size.h,
    };
  };

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await popupRef.current?.requestFullscreen();
      }
    } catch {
      toast({ title: "No se pudo cambiar pantalla completa", variant: "destructive" });
    }
  }, [toast]);

  const copyRoom = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      toast({ title: "Codigo copiado", description: `Sala ${roomCode}` });
    } catch {
      toast({ title: "Sala", description: roomCode });
    }
  };

  if (!game) return null;

  const srcParams = new URLSearchParams({
    room: roomCode,
    host: "1",
    embed: "1",
    v: String(reloadKey),
    sbUrl: import.meta.env.VITE_SUPABASE_URL,
    sbKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    userId: user?.id || "",
    displayName: profile?.display_name || user?.user_metadata?.username || "Jugador",
    avatarUrl: profile?.avatar_url || "",
    maxPlayers: "10",
  });
  const src = `/games/${game.id}/index.html?${srcParams.toString()}`;

  return createPortal(
    <>
      {!minimized && (
        <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setMinimized(true)} />
      )}

      <div
        ref={popupRef}
        className={cn(
          "fixed z-[320] overflow-hidden border border-neon-magenta/40 bg-card shadow-2xl shadow-black/60",
          minimized ? "bottom-4 right-4 h-24 w-44 rounded-xl cursor-pointer" : "left-1/2 top-1/2 rounded-xl",
        )}
        style={
          minimized
            ? undefined
            : {
                width: `${size.w}px`,
                height: `${size.h}px`,
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              }
        }
        onClick={() => minimized && setMinimized(false)}
      >
        <div
          className="flex h-11 items-center gap-2 border-b border-border bg-muted/30 px-3"
          onMouseDown={onDragDown}
        >
          <Move className="h-3.5 w-3.5 text-muted-foreground" />
          <Gamepad2 className="h-4 w-4 text-neon-magenta" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-pixel text-[10px] text-neon-magenta">{game.label}</p>
            <p className="truncate text-[9px] text-muted-foreground">Sala {roomCode}</p>
          </div>
          {!minimized && (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyRoom} title="Copiar codigo de sala">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setReloadKey((key) => key + 1)} title="Reiniciar juego">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={toggleFullscreen} title="Pantalla completa">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setMinimized(true)} title="Minimizar">
                <Minimize2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {minimized ? <Maximize2 className="h-4 w-4 text-neon-cyan" /> : null}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!minimized && (
          <div className="flex h-[calc(100%-44px)] w-full relative">
            {/* Área del Juego */}
            <div className="flex-1 h-full">
              <iframe
                key={`${game.id}-${reloadKey}`}
                ref={frameRef}
                src={src}
                title={game.label}
                className="h-full w-full bg-black"
                allow="gamepad; fullscreen; autoplay"
              />
            </div>

            <div
              onMouseDown={onResizeDown}
              className="absolute bottom-0 right-0 z-10 flex h-6 w-6 cursor-nwse-resize items-end justify-end p-1 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-3.5 w-3.5 rotate-[-45deg]" />
            </div>
            
            {/* 🏆 Panel de Jugadores (Leaderboard) en el Marco */}
            <div className="w-36 border-l border-border bg-black/60 flex flex-col shrink-0 overflow-hidden">
              <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-center gap-1.5">
                <Users className="w-2.5 h-2.5 text-neon-magenta" />
                <p className="font-pixel text-[7px] text-neon-magenta uppercase tracking-widest">Marcador</p>
              </div>
              <div className="flex-1 overflow-y-auto retro-scrollbar p-1.5 space-y-3">
                {leaderboard.length > 0 ? leaderboard.map((p, i) => {
                  const playerName = p.name || p.displayName || "Jugador";
                  const hasMatchStats = p.wins !== undefined || p.points !== undefined;
                  return (
                    <div key={p.userId || i} className="flex items-center gap-2 rounded border border-white/10 bg-white/[0.03] p-1.5 animate-fade-in">
                      <div className="relative shrink-0">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={playerName}
                            className={cn(
                              "w-8 h-8 rounded border object-cover transition-all",
                              p.userId === user?.id ? "border-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)]" : "border-white/10"
                            )}
                            onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                          />
                        ) : (
                          <div className={cn(
                            "w-8 h-8 rounded border bg-muted/70 flex items-center justify-center font-pixel text-[10px] text-white",
                            p.userId === user?.id ? "border-neon-cyan shadow-[0_0_8px_rgba(0,255,255,0.4)]" : "border-white/10"
                          )}>
                            {playerName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute -top-1 -left-1 w-4 h-4 bg-black/90 border border-white/20 rounded flex items-center justify-center">
                          <span className="font-pixel text-[6px] text-white">{i + 1}</span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-pixel text-[6px] text-white truncate" title={playerName}>{playerName}</p>
                        <div className="mt-0.5 flex flex-col gap-0.5">
                          {hasMatchStats ? (
                            <>
                              <span className="font-pixel text-[7px] text-neon-yellow leading-none">{p.wins || 0} victorias</span>
                              <span className="font-pixel text-[6px] text-neon-green leading-none">{p.points || 0} pts</span>
                            </>
                          ) : (
                            <span className="font-pixel text-[7px] text-neon-green leading-none">En partida</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-15 gap-2 pt-10">
                    <Users className="w-5 h-5 text-white" />
                    <p className="font-pixel text-[5px] text-center uppercase">Esperando...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {minimized && (
          <div className="absolute inset-x-0 bottom-0 p-2">
            <p className="truncate text-[10px] font-medium text-foreground">{game.label}</p>
            <p className="font-pixel text-[8px] text-neon-cyan">SALA {roomCode}</p>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
