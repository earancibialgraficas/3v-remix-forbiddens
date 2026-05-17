import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Gamepad2,
  GripVertical,
  Maximize2,
  Minimize2,
  Minus,
  Move,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MultiplayerGame {
  id: string;
  label: string;
  maxPlayers?: number;
  playersLabel?: string;
}

interface MultiplayerGameBubbleProps {
  game: MultiplayerGame | null;
  onClose: () => void;
}

const makeRoomCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const AGAR_MAX_PLAYERS = 10;
const AGAR_LOBBY_CHANNEL = "forbiddens:agar:lobby";
const TIME_REWARD_SECONDS = 10;
const TIME_REWARD_POINTS = 5;
const makeAgarRoomCode = (index: number) => `AGAR-${index}`;
const normalizeAgarRoomCode = (code: string) => (code.startsWith("AGAR-") ? code : makeAgarRoomCode(1));

interface AgarRoom {
  code: string;
  count: number;
}

interface SessionPlayer {
  userId: string;
  playerId: string;
  name: string;
  avatarUrl: string;
  timePoints: number;
  elapsedSeconds: number;
  joinedAt: number;
  updatedAt: number;
}

const getAgarRoomIndex = (code: string) => {
  const match = code.match(/^AGAR-(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
};

const sortAgarRooms = (rooms: AgarRoom[]) =>
  [...rooms].sort((a, b) => getAgarRoomIndex(a.code) - getAgarRoomIndex(b.code) || a.code.localeCompare(b.code));

const getNextAgarRoomCode = (rooms: AgarRoom[]) => {
  const highestRoom = rooms.reduce((highest, room) => Math.max(highest, getAgarRoomIndex(room.code)), 0);
  return makeAgarRoomCode(Number.isFinite(highestRoom) ? highestRoom + 1 : rooms.length + 1);
};

const formatSessionTime = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
};

export default function MultiplayerGameBubble({ game, onClose }: MultiplayerGameBubbleProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const popupRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const lobbyChannelRef = useRef<any>(null);
  const sessionChannelRef = useRef<any>(null);
  const lobbyPlayerIdRef = useRef(`agar_${Math.random().toString(36).slice(2, 10)}`);
  const lobbyJoinedAtRef = useRef(Date.now());
  const lobbyTrackedRoomRef = useRef("");
  const sessionStartedAtRef = useRef(Date.now());
  const sessionElapsedRef = useRef(0);
  const sessionTimePointsRef = useRef(0);
  const sessionTotalPointsRef = useRef(0);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 860, h: 620 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [roomCode, setRoomCode] = useState(makeRoomCode);
  const [agarRooms, setAgarRooms] = useState<AgarRoom[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [sessionPlayers, setSessionPlayers] = useState<SessionPlayer[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const roomCodeRef = useRef(roomCode);
  const isAgar = game?.id === "agar";
  const activeGameId = game?.id || "";
  const activeSessionRoomCode = isAgar ? normalizeAgarRoomCode(roomCode) : roomCode;
  const localDisplayName = profile?.display_name || user?.user_metadata?.username || "Jugador";
  const localAvatarUrl = profile?.avatar_url || "";
  const localSessionUserId = user?.id || lobbyPlayerIdRef.current;
  const compactGameFrame = !fullscreen && size.w < 720;
  const mobileGameFrame = !fullscreen && size.w < 460;
  const headerButtonClass = cn("h-8 w-8 shrink-0", mobileGameFrame && "h-7 w-7");

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    if (!activeGameId) return;
    setMinimized(false);
    setPosition({ x: 0, y: 0 });
    setSize({ w: Math.min(900, Math.max(280, window.innerWidth - 32)), h: Math.min(640, Math.max(260, window.innerHeight - 32)) });
    lobbyJoinedAtRef.current = Date.now();
    lobbyTrackedRoomRef.current = "";
    setRoomCode(activeGameId === "agar" ? makeAgarRoomCode(1) : makeRoomCode());
    setAgarRooms([]);
    setReloadKey((key) => key + 1);
    setLeaderboard([]);
    setSessionPlayers([]);
    sessionStartedAtRef.current = Date.now();
    sessionElapsedRef.current = 0;
    sessionTimePointsRef.current = 0;
    sessionTotalPointsRef.current = 0;
  }, [activeGameId]);

  useEffect(() => {
    if (!activeGameId) return;
    setSessionPlayers([]);
    sessionStartedAtRef.current = Date.now();
    sessionElapsedRef.current = 0;
    sessionTimePointsRef.current = 0;
    sessionTotalPointsRef.current = 0;
  }, [activeGameId, activeSessionRoomCode]);

  // 📡 Escuchar actualizaciones del Leaderboard desde el juego (iframe)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "game:updateLeaderboard") {
        setLeaderboard(event.data.players || []);
      }
      if (event.data?.type === "game:pointsAwarded" && event.data.awarded > 0) {
        sessionTotalPointsRef.current += Number(event.data.awarded || 0);
        toast({
          title: `+${event.data.awarded} puntos`,
          description: event.data.total ? `Total en este juego: ${event.data.total}` : "Puntaje multiplayer guardado",
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [toast]);

  useEffect(() => {
    if (!isAgar) {
      setAgarRooms([]);
      return;
    }

    const channel = supabase.channel(AGAR_LOBBY_CHANNEL, {
      config: { presence: { key: lobbyPlayerIdRef.current } },
    });

    lobbyChannelRef.current = channel;

    const readRooms = () => {
      const counts = new Map<string, number>();
      const members = new Map<string, Array<{ playerId: string; joinedAt: number }>>();
      Object.values(channel.presenceState())
        .flat()
        .forEach((presence: any) => {
          const room = String(presence?.room || "").trim().toUpperCase();
          if (!room.startsWith("AGAR-")) return;
          counts.set(room, (counts.get(room) || 0) + 1);
          const roomMembers = members.get(room) || [];
          roomMembers.push({
            playerId: String(presence?.playerId || presence?.userId || ""),
            joinedAt: Number(presence?.joinedAt || 0),
          });
          members.set(room, roomMembers);
        });

      const fallbackRoom = normalizeAgarRoomCode(roomCodeRef.current);
      if (!counts.has(fallbackRoom)) {
        counts.set(fallbackRoom, 0);
      }

      const rooms = sortAgarRooms(
        Array.from(counts.entries()).map(([code, count]) => ({ code, count })),
      );
      setAgarRooms(rooms);

      const currentRoom = fallbackRoom;
      const currentMembers = members.get(currentRoom) || [];
      const oldestPlayers = [...currentMembers]
        .sort((a, b) => a.joinedAt - b.joinedAt)
        .slice(0, AGAR_MAX_PLAYERS)
        .map((member) => member.playerId);
      const localPlayerCanStay = currentMembers.length <= AGAR_MAX_PLAYERS || oldestPlayers.includes(lobbyPlayerIdRef.current);
      const availableRoom = rooms.find((room) => room.count < AGAR_MAX_PLAYERS);
      const nextRoom = localPlayerCanStay ? currentRoom : availableRoom?.code || getNextAgarRoomCode(rooms);

      if (nextRoom !== roomCodeRef.current) {
        setLeaderboard([]);
        setRoomCode(nextRoom);
      }
    };

    channel.on("presence", { event: "sync" }, readRooms);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const trackedRoom = normalizeAgarRoomCode(roomCodeRef.current);
        if (lobbyTrackedRoomRef.current !== trackedRoom) {
          lobbyTrackedRoomRef.current = trackedRoom;
          lobbyJoinedAtRef.current = Date.now();
        }
        await channel.track({
          game: "agar",
          room: trackedRoom,
          playerId: lobbyPlayerIdRef.current,
          userId: user?.id || lobbyPlayerIdRef.current,
          name: profile?.display_name || user?.user_metadata?.username || "Jugador",
          avatarUrl: profile?.avatar_url || "",
          joinedAt: lobbyJoinedAtRef.current,
        });
        readRooms();
      }
    });

    return () => {
      if (lobbyChannelRef.current === channel) lobbyChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [isAgar, profile?.avatar_url, profile?.display_name, user?.id, user?.user_metadata?.username]);

  useEffect(() => {
    if (!isAgar || !lobbyChannelRef.current) return;
    const trackedRoom = normalizeAgarRoomCode(roomCode);
    if (lobbyTrackedRoomRef.current !== trackedRoom) {
      lobbyTrackedRoomRef.current = trackedRoom;
      lobbyJoinedAtRef.current = Date.now();
    }
    void lobbyChannelRef.current.track({
      game: "agar",
      room: trackedRoom,
      playerId: lobbyPlayerIdRef.current,
      userId: user?.id || lobbyPlayerIdRef.current,
      name: profile?.display_name || user?.user_metadata?.username || "Jugador",
      avatarUrl: profile?.avatar_url || "",
      joinedAt: lobbyJoinedAtRef.current,
    });
  }, [isAgar, profile?.avatar_url, profile?.display_name, roomCode, user?.id, user?.user_metadata?.username]);

  useEffect(() => {
    if (!activeGameId) {
      setSessionPlayers([]);
      return;
    }

    const channel = supabase.channel(`forbiddens:session-points:${activeGameId}:${activeSessionRoomCode}`, {
      config: { presence: { key: lobbyPlayerIdRef.current } },
    });
    sessionChannelRef.current = channel;

    const readPlayers = () => {
      const latest = new Map<string, SessionPlayer>();
      Object.values(channel.presenceState())
        .flat()
        .forEach((presence: any) => {
          const userId = String(presence?.userId || presence?.playerId || "");
          if (!userId) return;
          const current = latest.get(userId);
          const next: SessionPlayer = {
            userId,
            playerId: String(presence?.playerId || userId),
            name: String(presence?.name || presence?.displayName || "Jugador"),
            avatarUrl: String(presence?.avatarUrl || ""),
            timePoints: Number(presence?.timePoints || 0),
            elapsedSeconds: Number(presence?.elapsedSeconds || 0),
            joinedAt: Number(presence?.joinedAt || 0),
            updatedAt: Number(presence?.updatedAt || 0),
          };
          if (!current || next.updatedAt >= current.updatedAt) latest.set(userId, next);
        });

      setSessionPlayers(
        Array.from(latest.values()).sort((a, b) => b.timePoints - a.timePoints || a.joinedAt - b.joinedAt),
      );
    };

    const trackLocal = () =>
      channel.track({
        game: activeGameId,
        room: activeSessionRoomCode,
        playerId: lobbyPlayerIdRef.current,
        userId: localSessionUserId,
        name: localDisplayName,
        avatarUrl: localAvatarUrl,
        timePoints: sessionTimePointsRef.current,
        elapsedSeconds: sessionElapsedRef.current,
        joinedAt: sessionStartedAtRef.current,
        updatedAt: Date.now(),
      });

    channel.on("presence", { event: "sync" }, readPlayers);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await trackLocal();
        readPlayers();
      }
    });

    const heartbeat = window.setInterval(() => {
      void trackLocal();
    }, 5000);

    return () => {
      window.clearInterval(heartbeat);
      if (sessionChannelRef.current === channel) sessionChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [activeGameId, activeSessionRoomCode, localAvatarUrl, localDisplayName, localSessionUserId]);

  useEffect(() => {
    if (!activeGameId || minimized) return;

    const awardTimePoints = async () => {
      sessionElapsedRef.current += TIME_REWARD_SECONDS;

      if (user?.id) {
        try {
          const { data, error } = await (supabase as any).rpc("award_multiplayer_win", {
            p_game_slug: activeGameId,
            p_room_code: activeSessionRoomCode,
            p_points: TIME_REWARD_POINTS,
          });
          if (!error && (data as any)?.awarded > 0) {
            sessionTimePointsRef.current += Number((data as any).awarded || 0);
            sessionTotalPointsRef.current += Number((data as any).awarded || 0);
          }
        } catch {
          // El panel sigue funcionando aunque el guardado de puntos falle.
        }
      }

      if (sessionChannelRef.current) {
        await sessionChannelRef.current.track({
          game: activeGameId,
          room: activeSessionRoomCode,
          playerId: lobbyPlayerIdRef.current,
          userId: localSessionUserId,
          name: localDisplayName,
          avatarUrl: localAvatarUrl,
          timePoints: sessionTimePointsRef.current,
          elapsedSeconds: sessionElapsedRef.current,
          joinedAt: sessionStartedAtRef.current,
          updatedAt: Date.now(),
        });
      }
    };

    const timer = window.setInterval(() => {
      void awardTimePoints();
    }, TIME_REWARD_SECONDS * 1000);

    return () => window.clearInterval(timer);
  }, [activeGameId, activeSessionRoomCode, localAvatarUrl, localDisplayName, localSessionUserId, minimized, user?.id]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        setPosition({
          x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
          y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
        });
      }
      if (resizing) {
        const minWidth = Math.max(240, Math.min(420, window.innerWidth - 16));
        const minHeight = Math.max(220, Math.min(320, window.innerHeight - 16));
        setSize({
          w: Math.max(minWidth, resizeRef.current.startW + (e.clientX - resizeRef.current.startX)),
          h: Math.max(minHeight, resizeRef.current.startH + (e.clientY - resizeRef.current.startY)),
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

  useEffect(() => {
    const clampToViewport = () => {
      setSize((current) => ({
        w: Math.min(current.w, Math.max(240, window.innerWidth - 16)),
        h: Math.min(current.h, Math.max(220, window.innerHeight - 16)),
      }));
      setPosition({ x: 0, y: 0 });
    };
    window.addEventListener("resize", clampToViewport);
    window.addEventListener("orientationchange", clampToViewport);
    return () => {
      window.removeEventListener("resize", clampToViewport);
      window.removeEventListener("orientationchange", clampToViewport);
    };
  }, []);

  useEffect(() => {
    if (!dragging && !resizing) return;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = resizing ? "nwse-resize" : "move";
    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [dragging, resizing]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === popupRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const onDragDown = (e: React.MouseEvent) => {
    if (minimized) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    setDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  const stopHeaderDrag = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const onResizeDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
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
        const popup = popupRef.current;
        if (popup) await popup.requestFullscreen();
      }
    } catch {
      toast({ title: "No se pudo cambiar pantalla completa", variant: "destructive" });
    }
  }, [toast]);

  const exitOwnFullscreen = useCallback(() => {
    if (document.fullscreenElement === popupRef.current) {
      void document.exitFullscreen().catch(() => undefined);
    }
  }, []);

  const minimizeBubble = useCallback(() => {
    exitOwnFullscreen();
    setMinimized(true);
  }, [exitOwnFullscreen]);

  const closeBubble = useCallback(() => {
    exitOwnFullscreen();
    toast({
      title: "Sesión finalizada",
      description: `${game?.label || "Juego"}: +${sessionTotalPointsRef.current} puntos en ${formatSessionTime(sessionElapsedRef.current)}.`,
    });
    onClose();
  }, [exitOwnFullscreen, game?.label, onClose, toast]);

  const copyRoom = async () => {
    const codeToCopy = isAgar ? normalizeAgarRoomCode(roomCode) : roomCode;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      toast({ title: "Codigo copiado", description: `Sala ${codeToCopy}` });
    } catch {
      toast({ title: "Sala", description: codeToCopy });
    }
  };

  if (!game) return null;

  const activeRoomCode = isAgar ? normalizeAgarRoomCode(roomCode) : roomCode;
  const srcParams = new URLSearchParams({
    room: activeRoomCode,
    host: "1",
    embed: "1",
    v: String(reloadKey),
    sbUrl: import.meta.env.VITE_SUPABASE_URL,
    sbKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    userId: user?.id || lobbyPlayerIdRef.current,
    displayName: profile?.display_name || user?.user_metadata?.username || "Jugador",
    avatarUrl: profile?.avatar_url || "",
    maxPlayers: String(game.maxPlayers || 10),
  });
  const src = `/games/${game.id}/index.html?${srcParams.toString()}`;
  const visibleAgarRooms = sortAgarRooms(
    agarRooms.some((room) => room.code === activeRoomCode) ? agarRooms : [...agarRooms, { code: activeRoomCode, count: 0 }],
  );
  const currentAgarRoom = visibleAgarRooms.find((room) => room.code === activeRoomCode);
  const combinedLeaderboard = (() => {
    const sessionByUser = new Map(sessionPlayers.map((player) => [player.userId, player]));
    const rows = new Map<string, any>();

    leaderboard.forEach((player, index) => {
      const key = String(player.userId || player.playerId || `player-${index}`);
      const session = sessionByUser.get(key);
      const gamePoints = Number(player.points || 0);
      const timePoints = Number(session?.timePoints || 0);
      rows.set(key, {
        ...session,
        ...player,
        userId: key,
        name: player.name || player.displayName || session?.name || "Jugador",
        avatarUrl: player.avatarUrl || session?.avatarUrl || "",
        timePoints,
        gamePoints,
        matchPoints: gamePoints + timePoints,
        elapsedSeconds: Number(session?.elapsedSeconds || 0),
      });
    });

    sessionPlayers.forEach((player) => {
      if (rows.has(player.userId)) return;
      rows.set(player.userId, {
        ...player,
        points: 0,
        wins: 0,
        score: 0,
        gamePoints: 0,
        matchPoints: player.timePoints,
      });
    });

    return Array.from(rows.values()).sort((a, b) => {
      const pointDelta = Number(b.matchPoints || 0) - Number(a.matchPoints || 0);
      if (pointDelta) return pointDelta;
      const scoreDelta = Number(b.score || 0) - Number(a.score || 0);
      if (scoreDelta) return scoreDelta;
      return Number(a.joinedAt || 0) - Number(b.joinedAt || 0);
    });
  })();

  return createPortal(
    <>
      {!minimized && (
        <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md animate-fade-in" onClick={minimizeBubble} />
      )}

      <div
        ref={popupRef}
        className={cn(
          "fixed z-[320] overflow-hidden border border-neon-magenta/40 bg-card shadow-2xl shadow-black/60",
          minimized ? "bottom-4 right-4 h-24 w-44 rounded-xl cursor-pointer" : "left-1/2 top-1/2 rounded-xl",
          (dragging || resizing) && "select-none",
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
          className={cn("flex h-11 items-center gap-2 border-b border-border bg-muted/30 px-3", mobileGameFrame && "gap-1 px-2")}
          onMouseDown={onDragDown}
        >
          <Move className={cn("h-3.5 w-3.5 text-muted-foreground", mobileGameFrame && "hidden")} />
          <Gamepad2 className={cn("h-4 w-4 text-neon-magenta", mobileGameFrame && "hidden")} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-pixel text-[10px] text-neon-magenta">{game.label}</p>
            {isAgar && visibleAgarRooms.length > 1 ? (
              <select
                value={activeRoomCode}
                onMouseDown={stopHeaderDrag}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  setLeaderboard([]);
                  setRoomCode(e.target.value);
                }}
                className="mt-0.5 h-5 max-w-full rounded border border-neon-magenta/30 bg-black/70 px-1 font-pixel text-[8px] text-neon-cyan outline-none"
                title="Cambiar sala"
                aria-label="Cambiar sala de Agar"
              >
                {visibleAgarRooms.map((room) => (
                  <option key={room.code} value={room.code} disabled={room.count >= AGAR_MAX_PLAYERS && room.code !== activeRoomCode}>
                    {room.code} ({room.count}/{AGAR_MAX_PLAYERS})
                  </option>
                ))}
              </select>
            ) : (
              <p className="truncate text-[9px] text-muted-foreground">
                Sala {activeRoomCode}
                {isAgar && currentAgarRoom ? ` - ${currentAgarRoom.count}/${AGAR_MAX_PLAYERS}` : ""}
              </p>
            )}
          </div>
          {!minimized && (
            <>
              <Button size="icon" variant="ghost" className={headerButtonClass} onMouseDown={stopHeaderDrag} onClick={copyRoom} title="Copiar codigo de sala" aria-label="Copiar codigo de sala">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className={headerButtonClass} onMouseDown={stopHeaderDrag} onClick={() => setReloadKey((key) => key + 1)} title="Reiniciar juego" aria-label="Reiniciar juego">
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className={headerButtonClass} onMouseDown={stopHeaderDrag} onClick={toggleFullscreen} title={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"} aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}>
                {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" className={headerButtonClass} onMouseDown={stopHeaderDrag} onClick={minimizeBubble} title="Minimizar" aria-label="Minimizar">
                <Minus className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {minimized ? <Maximize2 className="h-4 w-4 text-neon-cyan" /> : null}
          <Button
            size="icon"
            variant="ghost"
            className={cn(headerButtonClass, "text-destructive hover:bg-destructive/10")}
            onMouseDown={stopHeaderDrag}
            onClick={(e) => {
              e.stopPropagation();
              closeBubble();
            }}
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!minimized && (
          <div className={cn("flex h-[calc(100%-44px)] w-full relative", compactGameFrame && "flex-col")}>
            {/* Área del Juego */}
            <div className="min-h-0 min-w-0 flex-1">
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
              className="absolute bottom-0 right-0 z-10 flex h-6 w-6 cursor-nwse-resize select-none items-end justify-end p-1 text-muted-foreground hover:text-foreground"
            >
              <GripVertical className="h-3.5 w-3.5 rotate-[-45deg]" />
            </div>
            
            {/* 🏆 Panel de Jugadores (Leaderboard) en el Marco */}
            <div className={cn(
              "border-border bg-black/60 flex flex-col shrink-0 overflow-hidden",
              compactGameFrame ? "h-24 w-full border-t" : "w-36 border-l",
            )}>
              <div className="p-2 border-b border-white/5 bg-white/5 flex items-center justify-center gap-1.5">
                <Users className="w-2.5 h-2.5 text-neon-magenta" />
                <div className="min-w-0 text-center">
                  <p className="font-pixel text-[7px] text-neon-magenta uppercase tracking-widest">Marcador</p>
                  <p className="font-pixel text-[5px] text-neon-cyan">+{TIME_REWARD_POINTS} pts / {TIME_REWARD_SECONDS}s</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto retro-scrollbar p-1.5 space-y-3">
                {combinedLeaderboard.length > 0 ? combinedLeaderboard.map((p, i) => {
                  const playerName = p.name || p.displayName || "Jugador";
                  const matchPoints = Number(p.matchPoints || 0);
                  const timePoints = Number(p.timePoints || 0);
                  const gamePoints = Number(p.gamePoints || 0);
                  const elapsedSeconds = Number(p.elapsedSeconds || 0);
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
                          <span className="font-pixel text-[7px] text-neon-green leading-none">{matchPoints} pts</span>
                          {p.wins !== undefined && <span className="font-pixel text-[6px] text-neon-yellow leading-none">{p.wins || 0} victorias</span>}
                          {p.score !== undefined && Number(p.score) > 0 && <span className="font-pixel text-[6px] text-neon-cyan leading-none">score {Math.floor(Number(p.score))}</span>}
                          <span className="font-pixel text-[5px] text-muted-foreground leading-none">
                            {formatSessionTime(elapsedSeconds)} tiempo
                            {gamePoints > 0 && timePoints > 0 ? ` + ${gamePoints} juego` : ""}
                          </span>
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
            <p className="font-pixel text-[8px] text-neon-cyan">SALA {activeRoomCode}</p>
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
