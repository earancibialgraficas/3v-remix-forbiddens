import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Gamepad2,
  GripVertical,
  Maximize2,
  Minimize2,
  Minus,
  Move,
  RefreshCw,
  Settings,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MultiplayerSharedMusicPlayer from "@/components/MultiplayerSharedMusicPlayer";
import WatchTogetherPlayer from "@/components/WatchTogetherPlayer";
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
const SESSION_LEAVE_GRACE_MS = 45000;
const SESSION_VISITED_MS = 120000;
const MASSIVE_DECKS = [
  { code: "M08NN", name: "mala leche con semola" },
  { code: "EZ3OO", name: "Forbiddens" },
];
const getMassiveDeckConfigUrl = (code: string) => `https://decks.rereadgames.com/decks/${code}`;
const makeAgarRoomCode = (index: number) => `AGAR-${index}`;
const normalizeAgarRoomCode = (code: string) => (code.startsWith("AGAR-") ? code : makeAgarRoomCode(1));
const hashRoomPassword = (password: string) => {
  let hash = 5381;
  for (let i = 0; i < password.length; i += 1) {
    hash = ((hash << 5) + hash) ^ password.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
};

interface AgarRoom {
  code: string;
  count: number;
}

interface MultiplayerLobbyRoom {
  code: string;
  count: number;
  hostName: string;
  updatedAt: number;
  passwordProtected?: boolean;
  passwordHash?: string;
}

interface SessionPlayer {
  userId: string;
  playerId: string;
  name: string;
  avatarUrl: string;
  timePoints: number;
  totalPoints: number;
  elapsedSeconds: number;
  joinedAt: number;
  updatedAt: number;
  status?: "online" | "visited";
  leftAt?: number;
}

interface SavePendingResult {
  saved: number;
  attempted: number;
  reason?: string;
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
  const sessionPlayersRef = useRef<SessionPlayer[]>([]);
  const disconnectToastSeenRef = useRef<Record<string, number>>({});
  const connectedToastSeenRef = useRef<Record<string, number>>({});
  const disconnectGraceTimersRef = useRef<Record<string, number>>({});
  const lobbyPlayerIdRef = useRef(`agar_${Math.random().toString(36).slice(2, 10)}`);
  const lobbyJoinedAtRef = useRef(Date.now());
  const lobbyTrackedRoomRef = useRef("");
  const sessionStartedAtRef = useRef(Date.now());
  const sessionElapsedRef = useRef(0);
  const sessionTimePointsRef = useRef(0);
  const sessionTotalPointsRef = useRef(0);
  const pendingGamePointsRef = useRef(0);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 860, h: 620 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [roomCode, setRoomCode] = useState(makeRoomCode);
  const [agarRooms, setAgarRooms] = useState<AgarRoom[]>([]);
  const [sessionPlayers, setSessionPlayers] = useState<SessionPlayer[]>([]);
  const [sessionPointPreview, setSessionPointPreview] = useState(0);
  const [sessionElapsedPreview, setSessionElapsedPreview] = useState(0);
  const [lobbyRooms, setLobbyRooms] = useState<MultiplayerLobbyRoom[]>([]);
  const [roomPrivate, setRoomPrivate] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const [pendingPrivateRoom, setPendingPrivateRoom] = useState<MultiplayerLobbyRoom | null>(null);
  const [gameLaunched, setGameLaunched] = useState(false);
  const [launchedAsHost, setLaunchedAsHost] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [expandedInfoOpen, setExpandedInfoOpen] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const roomCodeRef = useRef(roomCode);
  const isAgar = game?.id === "agar";
  const isMassiveDecks = game?.id === "massive-decks";
  const isWatchTogether = game?.id === "watch-together";
  const activeGameId = game?.id || "";
  const activeSessionRoomCode = isAgar ? normalizeAgarRoomCode(roomCode) : roomCode;
  const localDisplayName = profile?.display_name || user?.user_metadata?.username || "Jugador";
  const localAvatarUrl = profile?.avatar_url || "";
  const localSessionUserId = user?.id || lobbyPlayerIdRef.current;
  const compactGameFrame = !fullscreen && size.w < 720;
  const mobileGameFrame = !fullscreen && size.w < 460;
  const headerButtonClass = cn("h-8 w-8 shrink-0", mobileGameFrame && "h-7 w-7");

  const notifyPlayerConnected = useCallback((player?: Partial<SessionPlayer>) => {
    const userId = String(player?.userId || player?.playerId || "");
    if (!userId || userId === localSessionUserId) return;
    const now = Date.now();
    if (now - Number(connectedToastSeenRef.current[userId] || 0) < 3000) return;
    connectedToastSeenRef.current[userId] = now;
    toast({
      title: "Jugador conectado",
      description: `${player?.name || "Un jugador"} se unio a la partida.`,
    });
  }, [localSessionUserId, toast]);

  const upsertSessionPlayer = useCallback((player: SessionPlayer) => {
    setSessionPlayers((current) => {
      const players = new Map<string, SessionPlayer>();
      const aliases = new Map<string, string>();
      current.forEach((item) => {
        players.set(item.userId, item);
        aliases.set(item.userId, item.userId);
        if (item.playerId) aliases.set(item.playerId, item.userId);
      });
      const existingKey = aliases.get(player.userId) || aliases.get(player.playerId) || player.userId;
      const existing = players.get(existingKey);
      if (disconnectGraceTimersRef.current[player.userId]) {
        window.clearTimeout(disconnectGraceTimersRef.current[player.userId]);
        delete disconnectGraceTimersRef.current[player.userId];
      }
      if ((!existing || existing.status === "visited") && player.userId !== localSessionUserId) notifyPlayerConnected(player);
      players.delete(existingKey);
      players.set(player.userId, {
        ...(existing || {}),
        ...player,
        status: "online",
        leftAt: undefined,
        timePoints: Math.max(Number(existing?.timePoints || 0), Number(player.timePoints || 0)),
        totalPoints: Math.max(Number(existing?.totalPoints || 0), Number(player.totalPoints || 0)),
        elapsedSeconds: Math.max(Number(existing?.elapsedSeconds || 0), Number(player.elapsedSeconds || 0)),
        updatedAt: Math.max(Number(existing?.updatedAt || 0), Number(player.updatedAt || 0)),
      });
      const nextPlayers = Array.from(players.values()).sort((a, b) => {
        if ((a.status || "online") !== (b.status || "online")) return (a.status || "online") === "online" ? -1 : 1;
        return a.joinedAt - b.joinedAt;
      });
      sessionPlayersRef.current = nextPlayers;
      return nextPlayers;
    });
  }, [localSessionUserId, notifyPlayerConnected]);

  const notifyPlayerDisconnected = useCallback((player?: Partial<SessionPlayer>) => {
    const userId = String(player?.userId || player?.playerId || "");
    if (!userId || userId === localSessionUserId) return;
    const now = Date.now();
    if (now - Number(disconnectToastSeenRef.current[userId] || 0) < 3000) return;
    disconnectToastSeenRef.current[userId] = now;
    toast({
      title: "Jugador desconectado",
      description: `${player?.name || "Un jugador"} salio de la partida.`,
    });
  }, [localSessionUserId, toast]);

  const markSessionPlayerVisited = useCallback((player?: Partial<SessionPlayer>, notify = false) => {
    const userId = String(player?.userId || "");
    const playerId = String(player?.playerId || "");
    if (!userId && !playerId) return;
    if (notify) notifyPlayerDisconnected(player);
    setSessionPlayers((current) => {
      const now = Date.now();
      let matched = false;
      const nextPlayers = current.map((item) => {
        if (item.userId !== userId && item.playerId !== playerId) return item;
        matched = true;
        return {
          ...item,
          status: "visited" as const,
          leftAt: item.leftAt || now,
          updatedAt: now,
        };
      });
      if (!matched && (userId || playerId)) {
        nextPlayers.push({
          userId: userId || playerId,
          playerId: playerId || userId,
          name: String(player?.name || "Jugador"),
          avatarUrl: String(player?.avatarUrl || ""),
          timePoints: 0,
          totalPoints: 0,
          elapsedSeconds: 0,
          joinedAt: Number(player?.joinedAt || now),
          updatedAt: now,
          status: "visited",
          leftAt: now,
        });
      }
      const visiblePlayers = nextPlayers
        .filter((item) => !item.leftAt || now - item.leftAt < SESSION_VISITED_MS)
        .sort((a, b) => {
          if ((a.status || "online") !== (b.status || "online")) return (a.status || "online") === "online" ? -1 : 1;
          return a.joinedAt - b.joinedAt;
        });
      sessionPlayersRef.current = visiblePlayers;
      return visiblePlayers;
    });
  }, [notifyPlayerDisconnected]);

  const pruneStaleSessionPlayers = useCallback(() => {
    const now = Date.now();
    const staleAfterMs = SESSION_LEAVE_GRACE_MS;
    setSessionPlayers((current) => {
      const nextPlayers = current.map((player) => {
        const isLocal = player.userId === localSessionUserId || player.playerId === lobbyPlayerIdRef.current;
        if (isLocal || player.status === "visited") return player;
        const isFresh = now - Number(player.updatedAt || 0) < staleAfterMs;
        return isFresh ? player : { ...player, status: "visited" as const, leftAt: now, updatedAt: now };
      }).filter((player) => !player.leftAt || now - player.leftAt < SESSION_VISITED_MS);
      sessionPlayersRef.current = nextPlayers;
      return nextPlayers;
    });
  }, [localSessionUserId]);

  const applySessionPresenceState = useCallback((channel: any) => {
    if (!channel) return;
    const now = Date.now();
    const existingById = new Map<string, SessionPlayer>();
    sessionPlayersRef.current.forEach((player) => {
      existingById.set(player.userId, player);
      if (player.playerId) existingById.set(player.playerId, player);
    });

    const latest = new Map<string, SessionPlayer>();
    Object.values(channel.presenceState())
      .flat()
      .forEach((presence: any) => {
        const userId = String(presence?.userId || presence?.playerId || "");
        if (!userId) return;
        const current = latest.get(userId);
        const existing = existingById.get(userId) || existingById.get(String(presence?.playerId || ""));
        const next: SessionPlayer = {
          userId,
          playerId: String(presence?.playerId || userId),
          name: String(presence?.name || presence?.displayName || "Jugador"),
          avatarUrl: String(presence?.avatarUrl || ""),
          timePoints: 0,
          totalPoints: 0,
          elapsedSeconds: 0,
          joinedAt: Number(presence?.joinedAt || existing?.joinedAt || 0),
          updatedAt: Math.max(Number(existing?.updatedAt || 0), Number(presence?.updatedAt || 0)),
          status: "online",
        };
        if ((!existing || existing.status === "visited") && userId !== localSessionUserId) notifyPlayerConnected(next);
        if (disconnectGraceTimersRef.current[userId]) {
          window.clearTimeout(disconnectGraceTimersRef.current[userId]);
          delete disconnectGraceTimersRef.current[userId];
        }
        if (!current || next.updatedAt >= current.updatedAt) latest.set(userId, next);
      });

    const merged = new Map<string, SessionPlayer>();
    sessionPlayersRef.current.forEach((player) => {
      const isLocal = player.userId === localSessionUserId || player.playerId === lobbyPlayerIdRef.current;
      const isOnline = latest.has(player.userId) || latest.has(player.playerId);
      const isRecentlySeen = now - Number(player.updatedAt || 0) < SESSION_LEAVE_GRACE_MS;
      const visitedAt = player.leftAt || now;
      if (isLocal || isOnline || isRecentlySeen) {
        merged.set(player.userId, player);
        return;
      }
      if (now - visitedAt < SESSION_VISITED_MS) {
        merged.set(player.userId, {
          ...player,
          status: "visited",
          leftAt: visitedAt,
          updatedAt: Math.max(Number(player.updatedAt || 0), visitedAt),
        });
      }
    });
    latest.forEach((player, userId) => merged.set(userId, player));
    const nextPlayers = Array.from(merged.values()).sort((a, b) => {
      if ((a.status || "online") !== (b.status || "online")) return (a.status || "online") === "online" ? -1 : 1;
      return a.joinedAt - b.joinedAt;
    });
    sessionPlayersRef.current = nextPlayers;
    setSessionPlayers(nextPlayers);
  }, [localSessionUserId, notifyPlayerConnected]);

  const buildLocalSessionPlayer = useCallback((): SessionPlayer => ({
    userId: localSessionUserId,
    playerId: lobbyPlayerIdRef.current,
    name: localDisplayName,
    avatarUrl: localAvatarUrl,
    timePoints: sessionTimePointsRef.current,
    totalPoints: sessionTotalPointsRef.current + pendingGamePointsRef.current,
    elapsedSeconds: sessionElapsedRef.current,
    joinedAt: sessionStartedAtRef.current,
    updatedAt: Date.now(),
    status: "online",
  }), [localAvatarUrl, localDisplayName, localSessionUserId]);

  const syncLocalSessionPlayer = useCallback(() => {
    if (!activeGameId) return;
    const next = buildLocalSessionPlayer();

    setSessionPointPreview(next.totalPoints);
    setSessionElapsedPreview(sessionElapsedRef.current);

    upsertSessionPlayer(next);

    if (sessionChannelRef.current) {
      void sessionChannelRef.current.track({
        game: activeGameId,
        room: activeSessionRoomCode,
        ...next,
      });
      void sessionChannelRef.current.send({
        type: "broadcast",
        event: "session",
        payload: {
          type: "presence",
          sender: localSessionUserId,
          player: next,
        },
      });
    }
  }, [activeGameId, activeSessionRoomCode, buildLocalSessionPlayer, localSessionUserId, upsertSessionPlayer]);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    if (!activeGameId) return;
    const availableWidth = Math.max(280, window.innerWidth - 32);
    const availableHeight = Math.max(260, window.innerHeight - 32);
    setMinimized(false);
    setPosition({ x: 0, y: 0 });
    setSize(
      activeGameId === "watch-together"
        ? { w: availableWidth, h: availableHeight }
        : { w: Math.min(900, availableWidth), h: Math.min(640, availableHeight) },
    );
    setFullscreen(false);
    lobbyJoinedAtRef.current = Date.now();
    lobbyTrackedRoomRef.current = "";
    setRoomCode(activeGameId === "agar" ? makeAgarRoomCode(1) : makeRoomCode());
    setAgarRooms([]);
    setReloadKey((key) => key + 1);
    setSessionPlayers([]);
    sessionPlayersRef.current = [];
    connectedToastSeenRef.current = {};
    disconnectToastSeenRef.current = {};
    Object.values(disconnectGraceTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    disconnectGraceTimersRef.current = {};
    setLobbyRooms([]);
    setRoomPrivate(false);
    setRoomPassword("");
    setPendingPrivateRoom(null);
    setGameLaunched(activeGameId === "massive-decks");
    setLaunchedAsHost(true);
    setExpandedInfoOpen(false);
    sessionStartedAtRef.current = Date.now();
    sessionElapsedRef.current = 0;
    sessionTimePointsRef.current = 0;
    sessionTotalPointsRef.current = 0;
    pendingGamePointsRef.current = 0;
    setSessionPointPreview(0);
    setSessionElapsedPreview(0);
  }, [activeGameId]);

  useEffect(() => {
    if (!fullscreen) setExpandedInfoOpen(false);
  }, [fullscreen]);

  useEffect(() => {
    if (!activeGameId) return;
    setSessionPlayers([]);
    sessionPlayersRef.current = [];
    connectedToastSeenRef.current = {};
    disconnectToastSeenRef.current = {};
    Object.values(disconnectGraceTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    disconnectGraceTimersRef.current = {};
    sessionStartedAtRef.current = Date.now();
    sessionElapsedRef.current = 0;
    sessionTimePointsRef.current = 0;
    sessionTotalPointsRef.current = 0;
    pendingGamePointsRef.current = 0;
    setSessionPointPreview(0);
    setSessionElapsedPreview(0);
  }, [activeGameId, activeSessionRoomCode]);

  useEffect(() => {
    if (!activeGameId || isMassiveDecks) {
      setLobbyRooms([]);
      return;
    }

    const channel = supabase.channel(`forbiddens:multiplayer-lobby:${activeGameId}`, {
      config: { presence: { key: lobbyPlayerIdRef.current } },
    });

    const readLobbyRooms = () => {
      const rooms = new Map<string, MultiplayerLobbyRoom>();
      Object.values(channel.presenceState())
        .flat()
        .forEach((presence: any) => {
          const code = String(presence?.room || "").trim().toUpperCase();
          if (!code) return;
          const current = rooms.get(code);
          rooms.set(code, {
            code,
            count: (current?.count || 0) + 1,
            hostName: current?.hostName || String(presence?.hostName || presence?.name || "Jugador"),
            updatedAt: Math.max(Number(current?.updatedAt || 0), Number(presence?.updatedAt || 0)),
            passwordProtected: Boolean(current?.passwordProtected || presence?.passwordProtected),
            passwordHash: current?.passwordHash || String(presence?.passwordHash || ""),
          });
        });
      setLobbyRooms(Array.from(rooms.values()).sort((a, b) => b.updatedAt - a.updatedAt || a.code.localeCompare(b.code)));
    };

    channel.on("presence", { event: "sync" }, readLobbyRooms);
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        if (gameLaunched) {
          await channel.track({
            game: activeGameId,
            room: activeSessionRoomCode,
            playerId: lobbyPlayerIdRef.current,
            userId: localSessionUserId,
            name: localDisplayName,
            hostName: launchedAsHost ? localDisplayName : undefined,
            passwordProtected: isWatchTogether && roomPrivate,
            passwordHash: isWatchTogether && roomPrivate ? hashRoomPassword(roomPassword.trim()) : "",
            joinedAt: sessionStartedAtRef.current,
            updatedAt: Date.now(),
          });
        }
        readLobbyRooms();
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeGameId, activeSessionRoomCode, gameLaunched, isMassiveDecks, isWatchTogether, launchedAsHost, localDisplayName, localSessionUserId, roomPassword, roomPrivate]);

  // 📡 Escuchar actualizaciones del Leaderboard desde el juego (iframe)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "game:sessionScore") {
        const delta = Math.max(0, Number(event.data.pointsDelta || 0));
        const total = Math.max(0, Number(event.data.sessionPoints ?? event.data.points ?? 0));
        pendingGamePointsRef.current = delta > 0
          ? pendingGamePointsRef.current + delta
          : Math.max(pendingGamePointsRef.current, total);
        syncLocalSessionPlayer();
      }
      if (event.data?.type === "game:pointsAwarded" && event.data.awarded > 0) {
        sessionTotalPointsRef.current += Number(event.data.awarded || 0);
        syncLocalSessionPlayer();
        toast({
          title: `+${event.data.awarded} puntos`,
          description: event.data.total ? `Total en este juego: ${event.data.total}` : "Puntaje multiplayer guardado",
        });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [syncLocalSessionPlayer, toast]);

  useEffect(() => {
    if (!isAgar || !gameLaunched) {
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
  }, [gameLaunched, isAgar, profile?.avatar_url, profile?.display_name, user?.id, user?.user_metadata?.username]);

  useEffect(() => {
    if (!isAgar || !gameLaunched || !lobbyChannelRef.current) return;
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
  }, [gameLaunched, isAgar, profile?.avatar_url, profile?.display_name, roomCode, user?.id, user?.user_metadata?.username]);

  useEffect(() => {
    if (!activeGameId || (!gameLaunched && !isMassiveDecks)) {
      setSessionPlayers([]);
      sessionPlayersRef.current = [];
      return;
    }

    const channel = supabase.channel(`forbiddens:session-points:${activeGameId}:${activeSessionRoomCode}`, {
      config: { presence: { key: lobbyPlayerIdRef.current } },
    });
    sessionChannelRef.current = channel;

    const readPlayers = () => applySessionPresenceState(channel);

    const trackLocal = async () => {
      const player = buildLocalSessionPlayer();
      await channel.track({
        game: activeGameId,
        room: activeSessionRoomCode,
        ...player,
      });
    };

    channel.on("broadcast", { event: "session" }, ({ payload }: any) => {
      if (payload?.sender === localSessionUserId) return;
      if (payload?.type === "presence" && payload.player) {
        const player = payload.player as SessionPlayer;
        if (player.userId && player.userId !== localSessionUserId) upsertSessionPlayer(player);
      }
      if (payload?.type === "presence_request") {
        syncLocalSessionPlayer();
      }
      if (payload?.type === "disconnect" && payload.player) {
        markSessionPlayerVisited(payload.player, true);
      }
    });
    channel.on("presence", { event: "sync" }, readPlayers);
    channel.on("presence", { event: "leave" }, ({ leftPresences }: any) => {
      (leftPresences || []).forEach((presence: any) => {
        const userId = String(presence?.userId || presence?.playerId || "");
        const playerId = String(presence?.playerId || userId);
        if (!userId || userId === localSessionUserId || disconnectGraceTimersRef.current[userId]) return;
        const leaveStartedAt = Date.now();
        disconnectGraceTimersRef.current[userId] = window.setTimeout(() => {
          delete disconnectGraceTimersRef.current[userId];
          const stillPresent = Object.values(channel.presenceState())
            .flat()
            .some((item: any) => String(item?.userId || item?.playerId || "") === userId || String(item?.playerId || "") === playerId);
          if (stillPresent) return;
          const existing = sessionPlayersRef.current.find((item) => item.userId === userId || item.playerId === playerId);
          if (existing?.status === "online" && Date.now() - Number(existing.updatedAt || leaveStartedAt) < SESSION_LEAVE_GRACE_MS) return;
          const leavingPlayer = existing || {
            userId,
            playerId,
            name: String(presence?.name || presence?.displayName || "Jugador"),
            avatarUrl: String(presence?.avatarUrl || ""),
            timePoints: 0,
            totalPoints: 0,
            elapsedSeconds: 0,
            joinedAt: Number(presence?.joinedAt || 0),
            updatedAt: Number(presence?.updatedAt || Date.now()),
          };
          markSessionPlayerVisited(leavingPlayer, false);
        }, SESSION_LEAVE_GRACE_MS);
      });
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await trackLocal();
        readPlayers();
        syncLocalSessionPlayer();
      }
    });

    const heartbeat = window.setInterval(() => {
      syncLocalSessionPlayer();
      pruneStaleSessionPlayers();
    }, TIME_REWARD_SECONDS * 1000);

    return () => {
      window.clearInterval(heartbeat);
      Object.values(disconnectGraceTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      disconnectGraceTimersRef.current = {};
      if (sessionChannelRef.current === channel) sessionChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [activeGameId, activeSessionRoomCode, applySessionPresenceState, buildLocalSessionPlayer, gameLaunched, isMassiveDecks, localSessionUserId, markSessionPlayerVisited, pruneStaleSessionPlayers, syncLocalSessionPlayer, upsertSessionPlayer]);

  useEffect(() => {
    if (!activeGameId || minimized || (!gameLaunched && !isMassiveDecks)) return;

    const awardTimePoints = async () => {
      sessionElapsedRef.current += TIME_REWARD_SECONDS;
      sessionTimePointsRef.current += TIME_REWARD_POINTS;
      pendingGamePointsRef.current += TIME_REWARD_POINTS;
      syncLocalSessionPlayer();
    };

    const timer = window.setInterval(() => {
      void awardTimePoints();
    }, TIME_REWARD_SECONDS * 1000);

    return () => window.clearInterval(timer);
  }, [activeGameId, gameLaunched, isMassiveDecks, minimized, syncLocalSessionPlayer, user?.id]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        setPosition({
          x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
          y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
        });
      }
      if (resizing) {
        window.getSelection()?.removeAllRanges();
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
    const previousHtmlUserSelect = document.documentElement.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.documentElement.style.userSelect = "none";
    document.body.style.setProperty("-webkit-user-select", "none");
    document.documentElement.style.setProperty("-webkit-user-select", "none");
    document.body.style.cursor = resizing ? "nwse-resize" : "move";
    window.getSelection()?.removeAllRanges();
    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.documentElement.style.userSelect = previousHtmlUserSelect;
      document.body.style.removeProperty("-webkit-user-select");
      document.documentElement.style.removeProperty("-webkit-user-select");
      document.body.style.cursor = previousCursor;
      window.getSelection()?.removeAllRanges();
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

  const savePendingGamePoints = useCallback(async (updatePreview = true): Promise<SavePendingResult> => {
    const pendingPoints = Math.floor(pendingGamePointsRef.current);
    if (pendingPoints <= 0) return { saved: 0, attempted: 0, reason: "no_points" };
    if (!user?.id) return { saved: 0, attempted: pendingPoints, reason: "not_authenticated_in_client" };
    if (!activeGameId) return { saved: 0, attempted: pendingPoints, reason: "missing_game" };

    try {
      const { data, error } = await (supabase as any).rpc("award_multiplayer_win", {
        p_game_slug: activeGameId,
        p_room_code: activeSessionRoomCode,
        p_points: pendingPoints,
      });
      if (error) {
        console.warn("No se pudo guardar puntaje multiplayer", error);
        return { saved: 0, attempted: pendingPoints, reason: error.message || "rpc_error" };
      }
      const saved = Number((data as any)?.awarded || 0);
      const reasonParts = [
        (data as any)?.reason,
        (data as any)?.step ? `paso: ${(data as any).step}` : "",
        (data as any)?.message,
      ].filter(Boolean);
      if (saved > 0) {
        pendingGamePointsRef.current = Math.max(0, pendingGamePointsRef.current - saved);
        sessionTotalPointsRef.current += saved;
        if (updatePreview) {
          setSessionPointPreview(sessionTotalPointsRef.current + pendingGamePointsRef.current);
          setSessionElapsedPreview(sessionElapsedRef.current);
        }
      }
      return { saved, attempted: pendingPoints, reason: reasonParts.length ? reasonParts.join(" - ") : "ok" };
    } catch {
      return { saved: 0, attempted: pendingPoints, reason: "unexpected_error" };
    }
  }, [activeGameId, activeSessionRoomCode, user?.id]);

  const broadcastLocalDisconnect = useCallback(async () => {
    const channel = sessionChannelRef.current;
    const leavingPlayer = sessionPlayersRef.current.find((player) => player.userId === localSessionUserId) || buildLocalSessionPlayer();
    if (!channel) return;
    await channel.send({
      type: "broadcast",
      event: "session",
      payload: {
        type: "disconnect",
        player: leavingPlayer,
      },
    });
    await channel.untrack?.();
  }, [buildLocalSessionPlayer, localSessionUserId]);

  const closeBubble = useCallback(() => {
    const visiblePointsAtClose = sessionTotalPointsRef.current + pendingGamePointsRef.current;
    const gameLabel = game?.label || "Juego";
    exitOwnFullscreen();
    void broadcastLocalDisconnect();
    onClose();
    void savePendingGamePoints(false).then((result) => {
      toast({
        title: result.saved > 0 || result.attempted === 0 ? "Sesion finalizada" : "No se pudo guardar el puntaje",
        description: result.saved > 0
          ? `${gameLabel}: +${visiblePointsAtClose} puntos (${result.saved} guardados al cerrar).`
          : result.attempted > 0
            ? `${gameLabel}: ${result.attempted} puntos pendientes. Motivo: ${result.reason || "desconocido"}.`
            : `${gameLabel}: sin puntos pendientes.`,
        variant: result.saved > 0 || result.attempted === 0 ? "default" : "destructive",
      });
    });
  }, [broadcastLocalDisconnect, exitOwnFullscreen, game?.label, onClose, savePendingGamePoints, toast]);

  const copyRoom = async () => {
    const codeToCopy = isAgar ? normalizeAgarRoomCode(roomCode) : roomCode;
    try {
      await navigator.clipboard.writeText(codeToCopy);
      toast({ title: "Codigo copiado", description: `Sala ${codeToCopy}` });
    } catch {
      toast({ title: "Sala", description: codeToCopy });
    }
  };

  const copyMassiveDeckCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "Codigo copiado", description: `Mazo ${code}` });
    } catch {
      toast({ title: "Mazo", description: code });
    }
  };

  const refreshSessionPresence = useCallback(async () => {
    if (!sessionChannelRef.current) {
      toast({ title: "Sala", description: "Todavia no hay una sala activa para actualizar." });
      return;
    }
    const player = buildLocalSessionPlayer();
    await sessionChannelRef.current.track({
      game: activeGameId,
      room: activeSessionRoomCode,
      ...player,
    });
    await sessionChannelRef.current.send({
      type: "broadcast",
      event: "session",
      payload: {
        type: "presence_request",
        sender: localSessionUserId,
        room: activeSessionRoomCode,
      },
    });
    applySessionPresenceState(sessionChannelRef.current);
    toast({ title: "Sala actualizada", description: "Se actualizo la lista de personas conectadas." });
  }, [activeGameId, activeSessionRoomCode, applySessionPresenceState, buildLocalSessionPlayer, localSessionUserId, toast]);

  const refreshHeaderAction = useCallback(() => {
    if (isWatchTogether) {
      void refreshSessionPresence();
      return;
    }
    setReloadKey((key) => key + 1);
  }, [isWatchTogether, refreshSessionPresence]);

  const syncWatchTogetherPresencePlayers = useCallback((players: Array<{ userId: string; playerId: string; name: string; avatarUrl: string; joinedAt: number; updatedAt: number }>) => {
    if (!isWatchTogether) return;
    players.forEach((player) => {
      upsertSessionPlayer({
        userId: player.userId,
        playerId: player.playerId,
        name: player.name,
        avatarUrl: player.avatarUrl,
        timePoints: 0,
        totalPoints: 0,
        elapsedSeconds: 0,
        joinedAt: player.joinedAt || Date.now(),
        updatedAt: player.updatedAt || Date.now(),
        status: "online",
      });
    });
  }, [isWatchTogether, upsertSessionPlayer]);

  const launchRoom = (code: string, asHost: boolean) => {
    const nextCode = (code || makeRoomCode()).trim().toUpperCase();
    setRoomCode(isAgar ? normalizeAgarRoomCode(nextCode) : nextCode);
    setLaunchedAsHost(asHost);
    setGameLaunched(true);
    setSessionPlayers([]);
    sessionPlayersRef.current = [];
    sessionStartedAtRef.current = Date.now();
    sessionElapsedRef.current = 0;
    sessionTimePointsRef.current = 0;
    sessionTotalPointsRef.current = 0;
    pendingGamePointsRef.current = 0;
    setSessionPointPreview(0);
    setSessionElapsedPreview(0);
    setReloadKey((key) => key + 1);
  };

  const createLobbyRoom = () => {
    if (isWatchTogether && roomPrivate && !roomPassword.trim()) {
      toast({ title: "Contrasena requerida", description: "Escribe una contrasena o marca la sala como publica.", variant: "destructive" });
      return;
    }
    launchRoom(roomCode, true);
  };
  const finishPrivateJoin = () => {
    if (!pendingPrivateRoom) return;
    if (hashRoomPassword(roomPassword.trim()) !== pendingPrivateRoom.passwordHash) {
      toast({ title: "Contrasena incorrecta", description: "Esta sala de Watch Together es privada.", variant: "destructive" });
      return;
    }
    const code = pendingPrivateRoom.code;
    setRoomPrivate(true);
    setPendingPrivateRoom(null);
    launchRoom(code, false);
  };
  const joinLobbyRoom = (code = roomCode) => {
    const nextCode = code.trim().toUpperCase();
    if (!nextCode) {
      toast({ title: "Codigo requerido", description: "Escribe o elige una sala para unirte.", variant: "destructive" });
      return;
    }
    if (isWatchTogether) {
      const targetRoom = lobbyRooms.find((room) => room.code === nextCode);
      if (targetRoom?.passwordProtected) {
        setPendingPrivateRoom(targetRoom);
        setRoomPassword("");
        return;
      }
      setRoomPrivate(Boolean(targetRoom?.passwordProtected));
    }
    launchRoom(nextCode, false);
  };

  if (!game) return null;

  const activeRoomCode = isAgar ? normalizeAgarRoomCode(roomCode) : roomCode;
  const watchControlsTargetId = `watch-together-controls-${activeRoomCode}`;
  const srcParams = new URLSearchParams({
    room: activeRoomCode,
    host: launchedAsHost ? "1" : "0",
    embed: "1",
    v: String(reloadKey),
    sbUrl: import.meta.env.VITE_SUPABASE_URL,
    sbKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    playerId: lobbyPlayerIdRef.current,
    userId: user?.id || lobbyPlayerIdRef.current,
    displayName: profile?.display_name || user?.user_metadata?.username || "Jugador",
    avatarUrl: profile?.avatar_url || "",
    maxPlayers: String(game.maxPlayers || 10),
  });
  const src = `/games/${game.id}/index.html?${srcParams.toString()}`;
  const infoPanelWidthClass = "w-64";
  const presenceRows = sessionPlayers
    .filter((player) => {
      if (!player.leftAt) return true;
      return Date.now() - player.leftAt < SESSION_VISITED_MS;
    })
    .sort((a, b) => {
      if ((a.status || "online") !== (b.status || "online")) return (a.status || "online") === "online" ? -1 : 1;
      return Number(a.joinedAt || 0) - Number(b.joinedAt || 0);
    });

  const lobbyPanel = (
    <div className="flex h-full w-full flex-col overflow-hidden bg-black/80">
      <div className="border-b border-white/10 p-4">
        <p className="font-pixel text-[11px] uppercase tracking-widest text-neon-magenta">{game.label}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">Crea una sala, comparte el codigo o entra a una partida disponible.</p>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,320px)_1fr]">
        <div className="space-y-3">
          <div className="rounded border border-neon-cyan/25 bg-white/[0.03] p-3">
            <label className="font-pixel text-[8px] uppercase text-neon-cyan">Codigo de sala</label>
            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.trim().toUpperCase())}
              maxLength={12}
              className="mt-2 h-9 w-full rounded border border-white/10 bg-black/60 px-2 font-pixel text-[10px] text-white outline-none focus:border-neon-cyan"
              placeholder="CODIGO"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" onClick={createLobbyRoom} className="h-8 text-[10px]">
                Crear
              </Button>
              <Button size="sm" variant="secondary" onClick={() => joinLobbyRoom()} className="h-8 text-[10px]">
                Unirse
              </Button>
            </div>
            {isWatchTogether && (
              <div className="mt-3 space-y-2 rounded border border-white/10 bg-black/30 p-2">
                <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={roomPrivate}
                    onChange={(event) => setRoomPrivate(event.target.checked)}
                    className="h-3 w-3"
                  />
                  Sala privada
                </label>
                {roomPrivate && (
                  <Input
                    value={roomPassword}
                    onChange={(event) => setRoomPassword(event.target.value)}
                    placeholder="Contrasena"
                    className="h-8 border-white/10 bg-black/60 text-[10px]"
                  />
                )}
              </div>
            )}
          </div>
          <div className="rounded border border-white/10 bg-white/[0.03] p-3">
            <p className="font-pixel text-[8px] uppercase text-neon-green">Como funciona</p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              El creador entra como jugador principal. Quien se une con el codigo entra como rival. Esto evita que ambos clientes tomen el mismo lado de la partida.
            </p>
          </div>
        </div>

        <div className="min-h-0 rounded border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <p className="font-pixel text-[9px] uppercase text-neon-magenta">Salas disponibles</p>
            <span className="font-pixel text-[8px] text-neon-cyan">{lobbyRooms.length}</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {lobbyRooms.length > 0 ? lobbyRooms.map((room) => {
              const isFull = room.count >= (game.maxPlayers || 10);
              return (
              <button
                key={room.code}
                type="button"
                disabled={isFull}
                onClick={() => joinLobbyRoom(room.code)}
                className={cn(
                  "mb-2 flex w-full items-center gap-3 rounded border border-white/10 bg-black/45 px-3 py-2 text-left transition-colors hover:border-neon-cyan/50 hover:bg-neon-cyan/10",
                  isFull && "cursor-not-allowed opacity-45 hover:border-white/10 hover:bg-black/45",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-pixel text-[9px] text-white">{room.code}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    Host: {room.hostName}{room.passwordProtected ? " - privada" : " - publica"}
                  </p>
                </div>
                <span className="rounded border border-neon-green/30 px-2 py-1 font-pixel text-[8px] text-neon-green">
                  {room.count}/{game.maxPlayers || 10}
                </span>
              </button>
            )}) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-center opacity-60">
                <Users className="h-6 w-6 text-white" />
                <p className="font-pixel text-[8px] uppercase text-muted-foreground">No hay salas activas</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const leaderboardPanel = (
    <div className={cn(
      "border-border bg-black/60 flex flex-col shrink-0 overflow-hidden transition-transform duration-300",
      fullscreen
        ? cn(
            "absolute right-0 top-0 bottom-0 z-[60] border-l bg-black/85 pt-14",
            infoPanelWidthClass,
            expandedInfoOpen ? "translate-x-0" : "translate-x-full pointer-events-none",
          )
        : compactGameFrame ? "h-44 w-full border-t" : cn(infoPanelWidthClass, "border-l"),
    )}>
      <div className="border-b border-white/5 bg-white/5 p-2">
        {isMassiveDecks ? (
          <div className="space-y-1.5">
            <div className="space-y-1">
              {MASSIVE_DECKS.map((deck) => (
                <div key={deck.code} className="flex items-center justify-between gap-1 rounded border border-white/10 bg-black/25 px-1.5 py-1">
                  <div className="min-w-0">
                    <p className="font-pixel text-[7px] uppercase tracking-widest text-neon-magenta">Mazo {deck.code}</p>
                    <p className="truncate text-[9px] text-neon-cyan" title={deck.name}>{deck.name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copyMassiveDeckCode(deck.code)} title={`Copiar mazo ${deck.code}`} aria-label={`Copiar mazo ${deck.code}`}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => window.open(getMassiveDeckConfigUrl(deck.code), "_blank", "noopener,noreferrer")} title={`Configuracion del mazo ${deck.code}`} aria-label={`Configuracion del mazo ${deck.code}`}>
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <Users className="w-2.5 h-2.5 text-neon-magenta" />
            <div className="min-w-0 text-center">
              <p className="font-pixel text-[7px] text-neon-magenta uppercase tracking-widest">Marcador</p>
            </div>
          </div>
        )}
      </div>
      {!isWatchTogether && (
      <div className="border-b border-white/5">
        <MultiplayerSharedMusicPlayer
          gameId={activeGameId}
          roomCode={activeSessionRoomCode}
          userName={localDisplayName}
          showListeners={isMassiveDecks}
        />
      </div>
      )}
      {isWatchTogether && (
        <div id={watchControlsTargetId} className="border-b border-white/5" />
      )}
      <div className="flex-1 overflow-y-auto retro-scrollbar p-1.5 space-y-3">
        {presenceRows.length > 0 ? presenceRows.map((p, i) => {
          const playerName = p.name || "Jugador";
          const isOnline = (p.status || "online") === "online";
          return (
            <div
              key={p.userId || i}
              className={cn(
                "flex items-center gap-2 rounded border border-white/10 bg-white/[0.03] p-1.5 animate-fade-in transition-opacity",
                !isOnline && "opacity-45",
              )}
            >
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
                  <span className={cn("font-pixel text-[7px] leading-none", isOnline ? "text-neon-green" : "text-muted-foreground")}>
                    {isOnline ? "online" : "estuvo aqui"}
                  </span>
                  {!isOnline && p.leftAt ? (
                    <span className="font-pixel text-[5px] text-muted-foreground leading-none">visible 2 min</span>
                  ) : (
                    <span className="font-pixel text-[5px] text-muted-foreground leading-none">en la sala</span>
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
  );

  return createPortal(
    <>
      {!minimized && (
        <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md animate-fade-in" onClick={minimizeBubble} />
      )}

      {pendingPrivateRoom && (
        <div className="fixed inset-0 z-[420] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-lg border border-neon-cyan/40 bg-card p-4 shadow-2xl">
            <p className="font-pixel text-[10px] uppercase text-neon-cyan">Sala privada</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Ingresa la contrasena para unirte a {pendingPrivateRoom.code}.</p>
            <Input
              value={roomPassword}
              onChange={(event) => setRoomPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") finishPrivateJoin();
              }}
              placeholder="Contrasena"
              className="mt-3 h-9 border-white/10 bg-black/60 text-[11px]"
              autoFocus
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => setPendingPrivateRoom(null)}>
                Cancelar
              </Button>
              <Button size="sm" className="h-8 text-[10px]" onClick={finishPrivateJoin}>
                Unirse
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={popupRef}
        className={cn(
          "fixed z-[320] overflow-hidden border border-neon-magenta/40 bg-card shadow-2xl shadow-black/60",
          minimized ? "bottom-4 right-4 h-24 w-44 rounded-xl cursor-pointer" : fullscreen ? "inset-0 rounded-none" : "left-1/2 top-1/2 rounded-xl",
          (dragging || resizing) && "select-none",
        )}
        style={
          minimized
            ? undefined
            : fullscreen
              ? { width: "100vw", height: "100dvh", transform: "none" }
            : {
                width: `${size.w}px`,
                height: `${size.h}px`,
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
              }
        }
        onClick={() => minimized && setMinimized(false)}
      >
        <div
          className={cn(
            "flex h-11 items-center gap-2 border-b border-border bg-muted/30 px-3 transition-transform duration-300",
            mobileGameFrame && "gap-1 px-2",
            fullscreen && cn(
              "absolute left-0 top-0 z-[61] h-12 bg-black/85 border-white/10",
              expandedInfoOpen ? cn("w-auto", "right-64") : "right-0 w-full",
              expandedInfoOpen ? "translate-y-0" : "-translate-y-full pointer-events-none",
            ),
          )}
          onMouseDown={fullscreen ? undefined : onDragDown}
        >
          <Move className={cn("h-3.5 w-3.5 text-muted-foreground", mobileGameFrame && "hidden")} />
          <Gamepad2 className={cn("h-4 w-4 text-neon-green", mobileGameFrame && "hidden")} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-body font-medium text-foreground">{game.label}</p>
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-body">
              <span className="font-pixel text-neon-cyan">MULTI</span>
              <span className="flex items-center gap-0.5">
                <Trophy className="w-2.5 h-2.5" /> +{sessionPointPreview}
              </span>
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> {formatSessionTime(sessionElapsedPreview)}
              </span>
            </div>
          </div>
          {!minimized && (
            <>
              <Button size="icon" variant="ghost" className={headerButtonClass} onMouseDown={stopHeaderDrag} onClick={copyRoom} title="Copiar codigo de sala" aria-label="Copiar codigo de sala">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={headerButtonClass}
                onMouseDown={stopHeaderDrag}
                onClick={refreshHeaderAction}
                title={isWatchTogether ? "Actualizar personas de la sala" : "Reiniciar juego"}
                aria-label={isWatchTogether ? "Actualizar personas de la sala" : "Reiniciar juego"}
              >
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
              void closeBubble();
            }}
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {resizing && (
          <div className="absolute inset-0 z-[95] cursor-nwse-resize select-none bg-transparent" />
        )}

        {fullscreen && !minimized && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedInfoOpen((value) => !value);
            }}
            aria-label={expandedInfoOpen ? "Ocultar informacion" : "Mostrar informacion"}
            title={expandedInfoOpen ? "Ocultar informacion" : "Mostrar informacion"}
            className={cn(
              "absolute top-0 right-0 z-[100] h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg backdrop-blur-sm border",
              expandedInfoOpen
                ? cn("-translate-x-[264px]", "translate-y-[58px] bg-neon-cyan/90 border-neon-cyan text-black hover:bg-neon-cyan")
                : "-translate-x-2 translate-y-2 bg-neon-magenta/90 border-neon-magenta text-black hover:bg-neon-magenta",
            )}
          >
            {expandedInfoOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}

        {!minimized && (
          <div className={cn("flex w-full relative", fullscreen ? "h-full" : "h-[calc(100%-44px)]", compactGameFrame && !fullscreen && "flex-col")}>
            {/* Área del Juego */}
            {!gameLaunched && !isMassiveDecks ? (
              <div className="min-h-0 min-w-0 flex-1">
                {lobbyPanel}
              </div>
            ) : isWatchTogether ? (
            <div className="min-h-0 min-w-0 flex-1">
              <WatchTogetherPlayer
                roomCode={activeSessionRoomCode}
                userName={localDisplayName}
                userId={localSessionUserId}
                playerId={lobbyPlayerIdRef.current}
                avatarUrl={localAvatarUrl}
                controlsTargetId={watchControlsTargetId}
                fullscreen={fullscreen}
                onPresencePlayers={syncWatchTogetherPresencePlayers}
              />
            </div>
            ) : (
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
            )}

            {!fullscreen && (
              <div
                onMouseDown={onResizeDown}
                className="absolute bottom-0 right-0 z-10 flex h-6 w-6 cursor-nwse-resize select-none items-end justify-end p-1 text-muted-foreground hover:text-foreground"
              >
                <GripVertical className="h-3.5 w-3.5 rotate-[-45deg]" />
              </div>
            )}
            
            {/* 🏆 Panel de Jugadores (Leaderboard) en el Marco */}
            {(gameLaunched || isMassiveDecks) && leaderboardPanel}
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
