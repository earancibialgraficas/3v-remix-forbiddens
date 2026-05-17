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
  }, [game?.id]);

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

            {/* 👤 Perfil del Jugador en el Marco (Para no estorbar el juego) */}
            <div className="w-14 border-l border-border bg-black/40 flex flex-col items-center py-4 gap-3 shrink-0">
              <div className="relative group/avatar">
                <img 
                  src={profile?.avatar_url || "/placeholder.svg"} 
                  alt="User" 
                  className="w-8 h-8 rounded-full border-2 border-neon-magenta shadow-[0_0_8px_rgba(255,0,255,0.3)] object-cover"
                />
                <div className="absolute -bottom-1 -right-1 bg-neon-green w-2.5 h-2.5 rounded-full border-2 border-black" title="En línea" />
              </div>
              <span className="font-pixel text-[8px] text-neon-green text-center animate-pulse">{profile?.total_score || 0}</span>
            </div>

            <div
              onMouseDown={onResizeDown}
              className="absolute bottom-0 right-0 z-10 flex h-6 w-6 cursor-nwse-resize items-end justify-end p-1 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-3.5 w-3.5 rotate-[-45deg]" />
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
