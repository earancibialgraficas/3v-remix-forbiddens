import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Upload, Settings, Battery, Clock, Monitor, Check, ListChecks, Cpu, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { allGames } from "@/lib/gameLibrary";
import { canPlayExtraConsole, EXTRA_CONSOLES } from "@/lib/membershipLimits";
import { cn } from "@/lib/utils";
import { formatLauncherBridgeError, getLauncherBridge, launcherSupportsNative, type NativeEngineStatus } from "@/lib/launcherBridge";
import { useNativeSession } from "@/contexts/NativeSessionContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// 🎮 PS2 (Play!.js) — juegos con buena compatibilidad reportada en el tracker oficial
// Fuente: https://github.com/jpd002/Play-Compatibility/issues
type CompatStatus = "Recommended" | "Playable" | "In-Game" | "Menus" | "Heavy" | "Avoid";
type CompatGame = { name: string; status: CompatStatus; note?: string };

const PS2_COMPATIBLE_GAMES: CompatGame[] = [
  { name: "Ape Escape 2", status: "Playable" },
  { name: "Ape Escape 3", status: "Playable" },
  { name: "ATV Offroad Fury", status: "Playable" },
  { name: "Beyond Good & Evil", status: "Playable" },
  { name: "Burnout", status: "Playable" },
  { name: "Burnout 2: Point of Impact", status: "Playable" },
  { name: "Crash Bandicoot: The Wrath of Cortex", status: "Playable" },
  { name: "Crash Nitro Kart", status: "Playable" },
  { name: "Crash Twinsanity", status: "In-Game" },
  { name: "Dragon Ball Z: Budokai", status: "Playable" },
  { name: "Dragon Ball Z: Budokai 2", status: "Playable" },
  { name: "Dragon Ball Z: Budokai 3", status: "In-Game" },
  { name: "Final Fantasy X", status: "In-Game" },
  { name: "Final Fantasy XII", status: "In-Game" },
  { name: "God of War", status: "In-Game" },
  { name: "Grand Theft Auto III", status: "Playable" },
  { name: "Grand Theft Auto: Vice City", status: "Playable" },
  { name: "Grand Theft Auto: San Andreas", status: "In-Game" },
  { name: "Gran Turismo 3: A-Spec", status: "In-Game" },
  { name: "Gran Turismo 4", status: "In-Game" },
  { name: "ICO", status: "Playable" },
  { name: "Jak and Daxter: The Precursor Legacy", status: "In-Game" },
  { name: "Kingdom Hearts", status: "In-Game" },
  { name: "Kingdom Hearts II", status: "In-Game" },
  { name: "Metal Gear Solid 2: Sons of Liberty", status: "In-Game" },
  { name: "Metal Gear Solid 3: Snake Eater", status: "Menus" },
  { name: "Need for Speed: Underground", status: "Playable" },
  { name: "Need for Speed: Underground 2", status: "Playable" },
  { name: "Need for Speed: Most Wanted", status: "In-Game" },
  { name: "Prince of Persia: The Sands of Time", status: "Playable" },
  { name: "Ratchet & Clank", status: "In-Game" },
  { name: "Resident Evil 4", status: "In-Game" },
  { name: "Shadow of the Colossus", status: "In-Game" },
  { name: "Silent Hill 2", status: "In-Game" },
  { name: "SpongeBob SquarePants: Battle for Bikini Bottom", status: "Playable" },
  { name: "Sly Cooper and the Thievius Raccoonus", status: "Playable" },
  { name: "Sonic Heroes", status: "Playable" },
  { name: "Sonic Mega Collection Plus", status: "Playable" },
  { name: "SSX Tricky", status: "Playable" },
  { name: "Tekken 4", status: "In-Game" },
  { name: "Tekken 5", status: "In-Game" },
  { name: "The Simpsons: Hit & Run", status: "Playable" },
  { name: "Tony Hawk's Pro Skater 3", status: "Playable" },
  { name: "Tony Hawk's Pro Skater 4", status: "Playable" },
  { name: "Tony Hawk's Underground", status: "Playable" },
  { name: "Viewtiful Joe", status: "Playable" },
  { name: "Wallace & Gromit: Project Zoo", status: "Playable" },
  { name: "WWE SmackDown! Here Comes the Pain", status: "Playable" },
];

const PSP_WEB_COMPATIBILITY: CompatGame[] = [
  { name: "Lumines", status: "Recommended", note: "Puzzle ligero, buena primera prueba." },
  { name: "LocoRoco", status: "Recommended", note: "2D ligero, suele ser mas amable con web." },
  { name: "Patapon", status: "Recommended", note: "Ritmo/2D, carga grafica baja." },
  { name: "echochrome", status: "Recommended", note: "Minimalista, ideal para validar rendimiento." },
  { name: "EXIT", status: "Recommended", note: "2D con exigencia moderada." },
  { name: "Everyday Shooter", status: "Recommended", note: "Arcade simple." },
  { name: "Capcom Classics Collection Remixed", status: "Playable", note: "Puede variar por juego incluido." },
  { name: "Final Fantasy Tactics: The War of the Lions", status: "Playable", note: "RPG tactico, menos exigente que accion 3D." },
  { name: "Persona 3 Portable", status: "Playable", note: "RPG/visual novel, probar con frameskip." },
  { name: "Disgaea: Afternoon of Darkness", status: "Playable", note: "Tactico 2D/3D liviano." },
  { name: "Tactics Ogre: Let Us Cling Together", status: "Playable", note: "Tactico, puede tener bajones." },
  { name: "Castlevania: The Dracula X Chronicles", status: "Heavy", note: "Puede ir bien solo en PCs/navegadores fuertes." },
  { name: "Crisis Core: Final Fantasy VII", status: "Heavy", note: "3D exigente, no recomendado para equipos justos." },
  { name: "Tekken 6", status: "Heavy", note: "Pelea 3D pesada para PPSSPP web." },
  { name: "Gran Turismo", status: "Heavy", note: "Carreras 3D, suele exigir demasiado." },
  { name: "Monster Hunter Freedom Unite", status: "Avoid", note: "Muy pesado para navegador." },
  { name: "Grand Theft Auto: Liberty City Stories", status: "Avoid", note: "Mundo abierto, rendimiento malo esperado." },
  { name: "Grand Theft Auto: Vice City Stories", status: "Avoid", note: "Mundo abierto, rendimiento malo esperado." },
  { name: "God of War: Chains of Olympus", status: "Avoid", note: "Uno de los PSP mas pesados." },
  { name: "God of War: Ghost of Sparta", status: "Avoid", note: "Probado con FPS muy bajos en este setup." },
  { name: "Dragon Ball Z: Tenkaichi Tag Team", status: "Avoid", note: "Probado: textos rotos, lag e injugable." },
];

const compatStatusLabel: Record<CompatStatus, string> = {
  Recommended: "Recomendado",
  Playable: "Jugable",
  "In-Game": "In-Game",
  Menus: "Menus",
  Heavy: "Pesado",
  Avoid: "Evitar",
};

const compatStatusClass = (status: CompatStatus) => cn(
  "font-pixel text-[8px] uppercase px-1.5 py-0.5 rounded border flex-shrink-0",
  (status === "Recommended" || status === "Playable") && "bg-neon-green/15 text-neon-green border-neon-green/40",
  status === "In-Game" && "bg-neon-yellow/15 text-neon-yellow border-neon-yellow/40",
  status === "Heavy" && "bg-orange-400/15 text-orange-300 border-orange-400/40",
  status === "Avoid" && "bg-red-500/15 text-red-400 border-red-500/45",
  status === "Menus" && "bg-white/10 text-white/60 border-white/20",
);

// 🔥 NOMBRES EXACTOS PARA TU CARPETA /consolasimg/ 🔥
// Cores REALES de Libretro usados por Nostalgist.js
const systems = [
  {
    id: "nes", name: "Nintendo Entertainment System", short: "NES", core: "fceumm", extensions: ".nes,.zip",
    bg: "https://image.pollinations.ai/prompt/nes%20console%20retro%208bit%20pixel%20art%20dark%20background?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/Nintendo Entertainment System.png",
    glow: "rgba(239,68,68,0.7)", year: "1985"
  },
  {
    id: "snes", name: "Super Nintendo", short: "SNES", core: "snes9x", extensions: ".smc,.sfc,.zip",
    bg: "https://image.pollinations.ai/prompt/super%20nintendo%20console%20retro%2016bit%20synthwave?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/Super Nintendo.png",
    glow: "rgba(168,85,247,0.7)", year: "1990"
  },
  {
    // 🔥 N64: SIN .zip 🔥
    id: "n64", name: "Nintendo 64", short: "N64", core: "mupen64plus_next", extensions: ".n64,.z64,.v64",
    bg: "https://image.pollinations.ai/prompt/nintendo%2064%20console%20retro%20gaming%20dark%20neon?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/Nintendo 64.png",
    glow: "rgba(250,204,21,0.7)", year: "1996"
  },
  {
    id: "gba", name: "Game Boy Advance", short: "GBA", core: "mgba", extensions: ".gba,.zip",
    bg: "https://image.pollinations.ai/prompt/gameboy%20advance%20console%20synthwave%20retro?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/Game Boy Advance.png",
    glow: "rgba(217,70,239,0.7)", year: "2001"
  },
  {
    id: "gbc", name: "Game Boy Color", short: "GBC", core: "gambatte", extensions: ".gbc,.gb,.zip",
    bg: "https://image.pollinations.ai/prompt/gameboy%20color%20console%20neon%20dark%20aesthetic?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/Game Boy Color.png",
    glow: "rgba(253,224,71,0.7)", year: "1998"
  },
  {
    id: "sega", name: "Sega Genesis / Mega Drive", short: "MEGA DRIVE", core: "genesis_plus_gx", extensions: ".md,.smd,.gen,.bin,.zip",
    bg: "https://image.pollinations.ai/prompt/sega%20genesis%20console%20retro%2016bit%20dark%20blue?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/Sega Genesis.png",
    glow: "rgba(59,130,246,0.7)", year: "1988"
  },
  {
    // 🔥 PS1: SIN .zip 🔥
    id: "ps1", name: "PlayStation 1", short: "PSX", core: "pcsx_rearmed", extensions: ".iso,.bin,.cue,.chd",
    bg: "https://image.pollinations.ai/prompt/playstation%201%20classic%20console%20grey%20neon%20blue?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/PlayStation 1.png",
    glow: "rgba(147,197,253,0.7)", year: "1994"
  },
  {
    // 🔥 ARCADE: SIN .zip (solo formato directo de FBNeo) 🔥
    id: "arcade", name: "Arcade (FBNeo)", short: "ARCADE", core: "fbneo", extensions: ".7z",
    bg: "https://image.pollinations.ai/prompt/arcade%20cabinet%20machine%20neon%20cyberpunk%20dark%20room?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/Arcade.png",
    glow: "rgba(249,115,22,0.7)", year: "1990"
  },
  {
    // 🆕 DS — EmulatorJS desmume2015 (jugable por todos)
    id: "ds", name: "Nintendo DS", short: "DS", core: "desmume2015", extensions: ".nds,.zip",
    bg: "https://image.pollinations.ai/prompt/nintendo%20ds%20console%20dual%20screen%20neon%20cyan?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/Nintendo DS.png",
    glow: "rgba(34,211,238,0.7)", year: "2004"
  },
  {
    // PSP queda reservado para el launcher nativo.
    id: "psp", name: "PlayStation Portable", short: "PSP", core: "ppsspp", extensions: ".iso,.cso,.pbp,.chd",
    bg: "https://image.pollinations.ai/prompt/psp%20playstation%20portable%20handheld%20console%20neon%20cyberpunk?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/PSP.png",
    glow: "rgba(96,165,250,0.7)", year: "2004",
    nativeOnly: true,
    nativeOnlyDescription: "Disponible solo en FORBIDDENS Launcher con PPSSPP nativo.",
  },
  {
    // PS2 queda reservado para el launcher nativo.
    id: "ps2", name: "PlayStation 2", short: "PS2", core: "PCSX2 nativo", extensions: ".iso,.cso,.chd,.isz,.bin,.elf",
    bg: "https://image.pollinations.ai/prompt/playstation%202%20console%20black%20neon%20blue%20cyberpunk?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/PlayStation 2.png",
    glow: "rgba(96,165,250,0.7)", year: "2000",
    nativeOnly: true,
    nativeOnlyDescription: "Disponible solo en FORBIDDENS Launcher con PCSX2 nativo.",
  }
] as Array<{
  id: string; name: string; short: string; core: string; extensions: string;
  bg: string; consoleImg: string; glow: string; year: string;
  experimental?: boolean;
  nativeOnly?: boolean;
  nativeOnlyDescription?: string;
  compatGames?: CompatGame[];
  compatSource?: string;
  compatDescription?: string;
}>;

// 🌎 Lista corta de zonas horarias comunes (con Chile primero)
const TIMEZONES = [
  { value: "auto", label: "Automático (Sistema)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Mexico_City", label: "México (CDMX)" },
  { value: "America/Caracas", label: "Venezuela (Caracas)" },
  { value: "America/Sao_Paulo", label: "Brasil (São Paulo)" },
  { value: "America/New_York", label: "EE.UU. (New York)" },
  { value: "America/Los_Angeles", label: "EE.UU. (Los Angeles)" },
  { value: "Europe/Madrid", label: "España (Madrid)" },
  { value: "Europe/London", label: "Reino Unido (Londres)" },
  { value: "UTC", label: "UTC" },
];

const getCarouselScale = (width: number) => Math.max(0.52, Math.min(1, width / 1180));
const getSlotDistance = (width: number) => Math.max(150, 260 * getCarouselScale(width));
const getConsoleBoxSize = (width: number) => Math.round(Math.max(112, Math.min(288, width * 0.22)));
const NATIVE_STATUS_CACHE_PREFIX = "forbiddens_native_status:";
const NATIVE_STATUS_CACHE_TTL = 12 * 60 * 60 * 1000;

const getNativeStatusCacheKey = (consoleId: string) => `${NATIVE_STATUS_CACHE_PREFIX}${consoleId}`;

const readCachedNativeStatus = (consoleId: string): NativeEngineStatus | null => {
  if (typeof window === "undefined") return null;
  try {
    const cached = JSON.parse(localStorage.getItem(getNativeStatusCacheKey(consoleId)) || "null");
    if (!cached?.status || Date.now() - Number(cached.cachedAt || 0) > NATIVE_STATUS_CACHE_TTL) return null;
    return cached.status as NativeEngineStatus;
  } catch {
    return null;
  }
};

const writeCachedNativeStatus = (consoleId: string, status: NativeEngineStatus) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(getNativeStatusCacheKey(consoleId), JSON.stringify({ cachedAt: Date.now(), status }));
};

const clearCachedNativeStatus = (consoleId: string) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getNativeStatusCacheKey(consoleId));
};

export default function EmulatorPage() {
  const { user, profile, isStaff } = useAuth();
  const { toast } = useToast();
  const { launchGame, activeGames } = useGameBubble();
  const { launchNativeSession } = useNativeSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔒 Bloqueo por membresía: N64/PS1/PS2 requieren mínimo LITE
  const requiresLite = (consoleId: string) => (EXTRA_CONSOLES as readonly string[]).includes(consoleId);
  const blockIfLocked = (consoleId: string): boolean => {
    if (requiresLite(consoleId) && !canPlayExtraConsole(profile?.membership_tier, isStaff)) {
      toast({
        title: "🔒 Membresía requerida",
        description: `${consoleId.toUpperCase()} está disponible desde la membresía LITE ($5 USD). Visita la página de Membresías para mejorar tu cuenta.`,
        variant: "destructive",
      });
      navigate("/membresias");
      return true;
    }
    return false;
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [currentIndex, setCurrentIndex] = useState(1);
  const [time, setTime] = useState("");

  // 🌎 Zona horaria: 'auto' detecta automáticamente la del sistema (en Chile = America/Santiago)
  const [timezone, setTimezone] = useState<string>(() => {
    return localStorage.getItem("emulator_timezone") || "auto";
  });
  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const effectiveTz = timezone === "auto" ? detectedTz : timezone;

  const hasActiveGame = activeGames.length > 0;

  // 🖱️ Drag/swipe state
  const dragStartX = useRef<number | null>(null);
  const dragDelta = useRef<number>(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const rafId = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0); // px en vivo durante el drag
  const [carouselWidth, setCarouselWidth] = useState(900);
  const [ps2DialogOpen, setPs2DialogOpen] = useState(false);
  const [ps2Copied, setPs2Copied] = useState(false);
  const [nativeStatus, setNativeStatus] = useState<NativeEngineStatus | null>(null);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [launcherDetected, setLauncherDetected] = useState(() => Boolean(getLauncherBridge()));

  // Lógica de carga automática si vienes desde la página de Biblioteca
  useEffect(() => {
    const gameId = searchParams.get("game");
    if (gameId && user) {
      const game = allGames.find((g) => g.id === gameId);
      if (game) {
        if (blockIfLocked(game.console)) {
          const np = new URLSearchParams(searchParams);
          np.delete('game');
          navigate(`${location.pathname}?${np.toString()}`, { replace: true });
          return;
        }
        const sys = systems.find(s => s.id === game.console);
        launchGame({
          romUrl: game.romUrl,
          consoleName: game.console as any,
          gameName: game.name,
          consoleCore: sys?.core || "fceumm",
          score: 0,
          playTime: 0,
        });
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('game');
        navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
      }
    }
  }, [searchParams, user, location.pathname, navigate, launchGame]);

  // Reloj con zona horaria seleccionada
  useEffect(() => {
    const update = () => {
      try {
        setTime(new Date().toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: effectiveTz,
        }));
      } catch {
        setTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [effectiveTz]);

  const currentSystem = systems[currentIndex];
  const canUseNativeCurrent = launcherDetected && launcherSupportsNative(currentSystem.id);

  useEffect(() => {
    if (launcherDetected) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (getLauncherBridge()) {
        setLauncherDetected(true);
        window.clearInterval(timer);
      } else if (attempts >= 40) {
        window.clearInterval(timer);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [launcherDetected]);

  const refreshNativeStatus = async () => {
    const bridge = getLauncherBridge();
    if (!bridge?.nativeEngineStatus || !canUseNativeCurrent) {
      setNativeStatus(null);
      return null;
    }
    const status = await bridge.nativeEngineStatus(currentSystem.id);
    setNativeStatus(status);
    writeCachedNativeStatus(currentSystem.id, status);
    return status;
  };

  useEffect(() => {
    if (!canUseNativeCurrent) {
      setNativeStatus(null);
      return;
    }
    const cached = readCachedNativeStatus(currentSystem.id);
    setNativeStatus(cached);
    if (!cached) {
      void refreshNativeStatus().catch(() => setNativeStatus(null));
    }
  }, [currentSystem.id, launcherDetected]);

  // Bloquear navegación del teclado (Enter/Flechas) si hay un juego activo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasActiveGame) return;
      if (e.key === "ArrowRight") setCurrentIndex((prev) => (prev + 1) % systems.length);
      else if (e.key === "ArrowLeft") setCurrentIndex((prev) => (prev - 1 + systems.length) % systems.length);
      else if (e.key === "Enter") openRomPicker();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasActiveGame, currentSystem.id, user, profile?.membership_tier, isStaff]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const updateWidth = () => setCarouselWidth(Math.max(320, el.clientWidth || 900));
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem("emulator_timezone", tz);
    const label = TIMEZONES.find(t => t.value === tz)?.label || tz;
    toast({ title: "Zona horaria actualizada", description: label });
  };

  // 🚀 PS2 abre un modal informativo (no usa el GameBubble) — Play!.js no se puede embeber
  const launchPs2 = () => {
    if (!user) {
      toast({ title: "Acceso denegado", description: "Debes iniciar sesión para acceder a esta sección.", variant: "destructive" });
      return;
    }
    if (blockIfLocked("ps2")) return;
    setPs2Copied(false);
    setPs2DialogOpen(true);
  };

  const installCurrentNativeEngine = async () => {
    const bridge = getLauncherBridge();
    if (!bridge?.installNativeEngine) return;
    setNativeBusy(true);
    try {
      toast({ title: "Instalando motor nativo", description: `Preparando ${currentSystem.short} dentro del launcher.` });
      const status = await bridge.installNativeEngine(currentSystem.id);
      setNativeStatus(status);
      writeCachedNativeStatus(currentSystem.id, status);
      toast({ title: "Motor nativo listo", description: `${status.engine_name} quedo instalado para ${currentSystem.short}.` });
    } catch (error: any) {
      toast({
        title: "No se pudo instalar",
        description: formatLauncherBridgeError(error, "Revisa que el paquete exista en forbiddens.net/desktop/engines."),
        variant: "destructive",
      });
    } finally {
      setNativeBusy(false);
    }
  };

  const openNativeRomPicker = async () => {
    const bridge = getLauncherBridge();
    if (!bridge?.pickNativeRom || !bridge?.openNativeEmulator) return;
    if (!user) {
      toast({ title: "Acceso denegado", description: "Debes iniciar sesión para emular tus juegos.", variant: "destructive" });
      return;
    }
    if (blockIfLocked(currentSystem.id)) return;

    setNativeBusy(true);
    try {
      let status = nativeStatus || await refreshNativeStatus();
      if (!status?.installed) {
        const wantsInstall = window.confirm(`Para usar ${currentSystem.short} nativo hay que instalar ${status?.engine_name || "el motor nativo"} en este PC. ¿Instalar ahora?`);
        if (!wantsInstall) return;
        if (!bridge.installNativeEngine) throw new Error("El launcher no tiene instalador nativo disponible.");
        status = await bridge.installNativeEngine(currentSystem.id);
        setNativeStatus(status);
        writeCachedNativeStatus(currentSystem.id, status);
      }

      const romPath = await bridge.pickNativeRom(currentSystem.id);
      if (!romPath) return;
      let launchResult: any = null;
      try {
        launchResult = await bridge.openNativeEmulator(currentSystem.id, romPath);
      } catch (error: any) {
        clearCachedNativeStatus(currentSystem.id);
        const freshStatus = await refreshNativeStatus().catch(() => null);
        if (!freshStatus?.installed) {
          setNativeStatus(freshStatus);
          toast({
            title: "Falta instalar el emulador",
            description: `${status?.engine_name || currentSystem.short} ya no se encontro en este PC. Usa el boton de instalar para repararlo.`,
            variant: "destructive",
          });
          return;
        }
        throw error;
      }
      launchNativeSession({
        consoleName: currentSystem.id,
        gameName: romPath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") || currentSystem.name,
        engineName: status?.engine_name || currentSystem.core || "Emulador nativo",
        romPath,
        processId: typeof launchResult === "object" ? Number(launchResult?.process_id || 0) || null : null,
      });
      toast({ title: "Abriendo emulador nativo", description: `${status?.engine_name || currentSystem.short} iniciando desde FORBIDDENS Launcher.` });
    } catch (error: any) {
      toast({ title: "Error nativo", description: error?.message || String(error || "No se pudo abrir el emulador nativo."), variant: "destructive" });
    } finally {
      setNativeBusy(false);
    }
  };

  const copyPs2Url = async () => {
    try {
      await navigator.clipboard.writeText("https://playjs.purei.org/");
      setPs2Copied(true);
      toast({ title: "URL copiada", description: "Pégala en una pestaña nueva de tu navegador." });
      setTimeout(() => setPs2Copied(false), 2500);
    } catch {
      toast({ title: "No se pudo copiar", description: "Copia manualmente: playjs.purei.org", variant: "destructive" });
    }
  };

  function openRomPicker() {
    if (canUseNativeCurrent) {
      void openNativeRomPicker();
      return;
    }

    if (currentSystem.nativeOnly) {
      toast({
        title: "Solo disponible en launcher",
        description: `${currentSystem.short} usa emulador nativo. Abre FORBIDDENS Launcher para instalarlo y cargar tus ROMs.`,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({ title: "Acceso denegado", description: "Debes iniciar sesiÃ³n para emular tus juegos.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (blockIfLocked(currentSystem.id)) return;

    fileInputRef.current?.click();
  }

  const openPspStandalonePicker = async () => {
    const pspUrl = "/psp-standalone.html?pick=1&speed=max";
    const bridge = getLauncherBridge();
    if (bridge?.openExternal) {
      try {
        const opened = await bridge.openExternal(pspUrl);
        if (opened) return;
      } catch (error) {
        console.warn("[PSP] No se pudo abrir desde el launcher", error);
      }
    }

    const pspWindow = window.open(pspUrl, "_blank", "popup=yes,width=1440,height=860");
    if (pspWindow && !pspWindow.closed) {
      pspWindow.focus();
    } else {
      toast({
        title: "Ventana bloqueada",
        description: "No pude abrir la ventana PSP. Revisa que el permiso sea para este dominio exacto.",
        variant: "destructive",
      });
    }
  };

  const handleRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({ title: "Acceso denegado", description: "Debes iniciar sesión para emular tus juegos.", variant: "destructive" });
      return;
    }
    if (blockIfLocked(currentSystem.id)) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (currentSystem.nativeOnly) {
      toast({
        title: "Solo disponible en launcher",
        description: `${currentSystem.short} usa emulador nativo. Abre FORBIDDENS Launcher para cargar esta ROM.`,
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (!(window as any).__localRoms) (window as any).__localRoms = {};
    const fileId = file.name;
    (window as any).__localRoms[fileId] = file;

    launchGame({
      romUrl: `local:${fileId}`,
      consoleName: currentSystem.id as any,
      gameName: file.name.replace(/\.[^/.]+$/, ""),
      consoleCore: currentSystem.core,
      score: 0,
      playTime: 0,
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 🖱️👆 Drag/Swipe handlers (mouse + touch) — fluido con rAF
  const SWIPE_THRESHOLD_RATIO = 0.18; // 18% del ancho del carrusel
  const SLOT_DISTANCE = getSlotDistance(carouselWidth); // debe coincidir con el render
  const [isSettling, setIsSettling] = useState(false);

  const onPointerDown = (clientX: number) => {
    if (isSettling) return;
    dragStartX.current = clientX;
    dragDelta.current = 0;
    setIsDragging(true);
    setDragOffset(0);
  };
  const onPointerMove = (clientX: number) => {
    if (dragStartX.current === null) return;
    const delta = clientX - dragStartX.current;
    dragDelta.current = delta;
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      setDragOffset(dragDelta.current);
    });
  };
  const onPointerUp = () => {
    if (dragStartX.current === null) return;
    const delta = dragDelta.current;
    const width = carouselRef.current?.clientWidth || 1;
    const threshold = Math.max(40, width * SWIPE_THRESHOLD_RATIO);

    dragStartX.current = null;
    dragDelta.current = 0;
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    setIsDragging(false);

    let direction: 1 | -1 | 0 = 0;
    if (delta <= -threshold) direction = 1;       // siguiente
    else if (delta >= threshold) direction = -1;  // anterior

    if (direction === 0) {
      // Vuelve al centro suavemente
      setIsSettling(true);
      setDragOffset(0);
      window.setTimeout(() => setIsSettling(false), 350);
      return;
    }

    // Anima hasta el slot vecino y luego, sin transición, fija el nuevo índice
    setIsSettling(true);
    setDragOffset(direction === 1 ? -SLOT_DISTANCE : SLOT_DISTANCE);
    window.setTimeout(() => {
      // Cambia índice y resetea offset SIN transición para evitar el salto
      setCurrentIndex((prev) => (prev + direction + systems.length) % systems.length);
      setDragOffset(0);
      // Permite que el render aplique sin transición antes de soltar el flag
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsSettling(false));
      });
    }, 350);
  };

  return (
    <div id="batocera-screen" className="relative w-full h-[calc(100vh-5.5rem)] min-h-[600px] flex-1 bg-black rounded-xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fade-in group selection:bg-transparent">

      <div id="batocera-target" className={cn("absolute inset-0 z-50 pointer-events-auto", hasActiveGame ? "block" : "hidden")}></div>

      {!hasActiveGame && (
        <>
          <div className="absolute inset-0 transition-opacity duration-1000">
            <img src={currentSystem.bg} alt={currentSystem.name} className="w-full h-full object-cover opacity-40 blur-[3px] scale-105" />
            <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/black-linen-2.png')] opacity-30 pointer-events-none mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none"></div>
          </div>

          {/* TOP BAR */}
          <div className="absolute top-0 w-full p-3 sm:p-5 md:p-6 flex justify-between items-center z-20 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 text-white/80 pointer-events-none min-w-0">
              <Monitor className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="font-pixel text-[8px] sm:text-[10px] tracking-widest uppercase truncate">
                <span className="hidden sm:inline">forbiddens.net / </span>Web Edition
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 md:gap-5 text-white/80">
              {/* ⚙️ Settings dropdown con timezone */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="hover:text-white transition-colors p-1 -m-1"
                    aria-label="Configuración de zona horaria"
                  >
                    <Settings className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto bg-black/95 border-white/10 text-white">
                  <DropdownMenuLabel className="font-pixel text-[10px] tracking-widest">
                    Zona Horaria
                  </DropdownMenuLabel>
                  <div className="px-2 pb-2 text-[10px] text-white/50 font-body">
                    Detectada: <span className="text-neon-cyan">{detectedTz}</span>
                  </div>
                  {TIMEZONES.map((tz) => (
                    <DropdownMenuItem
                      key={tz.value}
                      onClick={() => handleTimezoneChange(tz.value)}
                      className="font-body text-xs cursor-pointer focus:bg-white/10 focus:text-white flex items-center justify-between"
                    >
                      <span>{tz.label}</span>
                      {timezone === tz.value && <Check className="w-3.5 h-3.5 text-neon-green" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="hidden xs:flex items-center gap-1.5 sm:gap-2 pointer-events-none">
                <Battery className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                <span className="font-pixel text-[9px] sm:text-[10px]">100%</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-none">
                <Clock className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-pixel text-[9px] sm:text-[10px]">{time}</span>
              </div>
            </div>
          </div>

          {/* CENTER */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pt-12 pb-20 sm:pt-16 sm:pb-24">
            <div className="mb-4 sm:mb-8 md:mb-12 text-center transition-all duration-500 px-3 sm:px-4 max-w-full w-full">
              <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                <h2
                  className="font-pixel leading-none text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-tight uppercase whitespace-nowrap"
                  style={{
                    // Escala el tamaño según el largo de la abreviación para que nunca se salga del encuadre.
                    fontSize: `clamp(0.9rem, ${Math.min(5, 70 / Math.max(currentSystem.short.length, 4))}vw, 3rem)`,
                  }}
                >
                  {currentSystem.short}
                </h2>
                {currentSystem.experimental && (
                  <span
                    className="font-pixel text-[8px] sm:text-[10px] md:text-[11px] tracking-widest uppercase px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-red-500/60 bg-red-600/20 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                    title="Emulador en fase experimental — la compatibilidad y el rendimiento varían"
                  >
                    Experimental
                  </span>
                )}
                {currentSystem.nativeOnly && !launcherDetected && (
                  <span
                    className="font-pixel text-[8px] sm:text-[10px] md:text-[11px] tracking-widest uppercase px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                    title="Esta consola usa emulador nativo desde FORBIDDENS Launcher"
                  >
                    Solo launcher
                  </span>
                )}
                {requiresLite(currentSystem.id) && !canPlayExtraConsole(profile?.membership_tier, isStaff) && (
                  <span
                    className="font-pixel text-[8px] sm:text-[10px] md:text-[11px] tracking-widest uppercase px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                    title="Requiere membresía LITE o superior"
                  >
                    🔒 Requiere LITE
                  </span>
                )}
              </div>
              <p className="mt-1 sm:mt-2 font-body text-[10px] sm:text-xs md:text-sm text-white/60 italic">
                ({currentSystem.name})
                {currentSystem.nativeOnly && !launcherDetected && (
                  <span className="ml-2 not-italic font-pixel text-[7px] sm:text-[8px] md:text-[9px] tracking-widest uppercase text-neon-cyan/90">
                    · Emulador nativo
                  </span>
                )}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 mt-3 sm:mt-4 text-muted-foreground font-pixel text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-widest">
                 <span className="bg-white/10 px-2 sm:px-3 py-1 rounded backdrop-blur-md border border-white/10">AÑO {currentSystem.year}</span>
                 <span className="bg-white/10 px-2 sm:px-3 py-1 rounded backdrop-blur-md border border-white/10 max-w-[80vw] truncate">CORE: {currentSystem.core}</span>
                 {currentSystem.compatGames && currentSystem.compatGames.length > 0 && (
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                       <button
                         className="flex items-center gap-1.5 bg-neon-cyan/15 hover:bg-neon-cyan/25 active:bg-neon-cyan/30 px-2 sm:px-3 py-1 rounded backdrop-blur-md border border-neon-cyan/40 text-neon-cyan transition-colors shadow-[0_0_12px_rgba(34,211,238,0.25)] cursor-pointer"
                         title="Ver juegos compatibles"
                       >
                         <ListChecks className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>Juegos compatibles ({currentSystem.compatGames.length})</span>
                       </button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent
                       align="center"
                       sideOffset={8}
                       className="w-72 sm:w-80 max-h-80 overflow-y-auto bg-black/95 border-neon-cyan/30 text-white backdrop-blur-xl shadow-[0_0_30px_rgba(34,211,238,0.25)]"
                     >
                       <DropdownMenuLabel className="font-pixel text-[10px] tracking-widest text-neon-cyan flex items-center justify-between">
                          <span>Compatibles</span>
                          <span className="text-[8px] text-white/40 normal-case tracking-normal">Fuente: {currentSystem.compatSource || "tracker"}</span>
                       </DropdownMenuLabel>
                         <div className="px-2 pb-2 text-[10px] text-white/50 font-body normal-case tracking-normal leading-snug">
                          {currentSystem.compatDescription || "La compatibilidad puede variar segun tu hardware."}
                        </div>
                        <DropdownMenuSeparator className="bg-white/10" />
                       {currentSystem.compatGames.map((g) => (
                         <DropdownMenuItem
                           key={g.name}
                           className="font-body text-xs cursor-default focus:bg-white/10 focus:text-white flex items-center justify-between gap-2 normal-case tracking-normal"
                         >
                            <span className="min-w-0">
                              <span className="block truncate">{g.name}</span>
                              {g.note && <span className="mt-0.5 block text-[10px] leading-snug text-white/45">{g.note}</span>}
                            </span>
                            <span className={compatStatusClass(g.status)}>
                              {compatStatusLabel[g.status]}
                            </span>
                         </DropdownMenuItem>
                       ))}
                     </DropdownMenuContent>
                   </DropdownMenu>
                 )}
              </div>
            </div>

            {/* CARRUSEL — drag/swipe enabled */}
            <div
              ref={carouselRef}
              className={cn(
                "relative w-full h-60 sm:h-72 md:h-80 lg:h-96 flex items-center justify-center overflow-visible touch-pan-y select-none",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
              style={{ perspective: "1100px", transformStyle: "preserve-3d" }}
              onMouseDown={(e) => onPointerDown(e.clientX)}
              onMouseMove={(e) => isDragging && onPointerMove(e.clientX)}
              onMouseUp={onPointerUp}
              onMouseLeave={() => isDragging && onPointerUp()}
              onTouchStart={(e) => onPointerDown(e.touches[0].clientX)}
              onTouchMove={(e) => onPointerMove(e.touches[0].clientX)}
              onTouchEnd={onPointerUp}
            >
              {(() => {
                // Posiciones base por "slot" relativo al activo
                const responsiveScale = getCarouselScale(carouselWidth);
                const SLOT_DISTANCE_PX = SLOT_DISTANCE; // px entre slots (coincide con SLOT_DISTANCE arriba)
                const consoleBoxSize = getConsoleBoxSize(carouselWidth);
                const angleStep = (Math.PI * 2) / systems.length;
                const ringRadiusX = Math.min(Math.max(carouselWidth * 0.34, 130), Math.max(150, carouselWidth / 2 - consoleBoxSize * 0.32));
                const ringRadiusZ = Math.min(Math.max(carouselWidth * 0.22, 105), 420 * responsiveScale);
                const ringTiltY = Math.min(Math.max(carouselWidth * 0.045, 22), 82 * responsiveScale);

                // Offset visual unificado: durante drag o settle se aplica como desplazamiento del "tren"
                // dragOffset > 0 (drag derecha) => el tren se mueve a la derecha => prev (slot -1) viene al centro
                // dragOffset < 0 (drag izquierda) => el tren se mueve a la izquierda => next (slot +1) viene al centro
                const visualOffsetPx = (isDragging || isSettling) ? dragOffset : 0;
                const progress = Math.max(-1, Math.min(1, visualOffsetPx / SLOT_DISTANCE_PX));

                return systems.map((sys, index) => {
                  // Slot relativo (-1 prev, 0 active, 1 next), con wrap
                  let slot = index - currentIndex;
                  if (slot > systems.length / 2) slot -= systems.length;
                  if (slot < -systems.length / 2) slot += systems.length;

                  // Posición efectiva: el tren completo se desplaza con el offset visual
                  const effectiveSlot = slot + progress;
                  const angle = effectiveSlot * angleStep;
                  const sin = Math.sin(angle);
                  const cos = Math.cos(angle);
                  const frontness = Math.max(0, (cos + 1) / 2);

                  // Interpolación suave entre activo y lateral
                  const translatePx = sin * ringRadiusX;
                  const translateZ = (cos - 1) * ringRadiusZ;
                  const translateY = 24 - (1 - cos) * ringTiltY + Math.abs(sin) * 10;
                  const rotateY = -sin * 68;
                  const scale = 0.38 + frontness * 0.72;
                  const opacity = 0.2 + frontness * 0.8;
                  const zIndex = Math.round(60 + frontness * 60);

                  const glowAlpha = frontness;
                  const filter = glowAlpha > 0.05
                    ? `drop-shadow(0 0 ${35 * glowAlpha}px ${sys.glow})`
                    : `grayscale(${Math.round(70 * (1 - frontness))}%) brightness(${0.5 + frontness * 0.35})`;

                  // Sin transición durante el drag activo (sigue al dedo en vivo).
                  // Con transición durante el settle y el reposo.
                  const useTransition = !isDragging;

                  return (
                    <div
                      key={sys.id}
                      className={cn(
                        "absolute flex flex-col items-center will-change-transform",
                        useTransition ? "transition-all duration-[350ms] ease-out" : "transition-none"
                      )}
                      style={{
                        transform: `translate3d(${translatePx}px, ${translateY}px, ${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                        transformStyle: "preserve-3d",
                        opacity,
                        zIndex,
                        filter,
                      }}
                      onClick={() => { if (Math.abs(dragDelta.current) < 5) setCurrentIndex(index); }}
                    >
                      <div
                        className="flex items-center justify-center pointer-events-none"
                        style={{ width: consoleBoxSize, height: consoleBoxSize }}
                      >
                         <img src={sys.consoleImg} alt={sys.name} className="w-full h-full object-contain" draggable={false} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="mt-6 sm:mt-12 md:mt-16 px-3 w-full max-w-md flex flex-col items-center">
               <input type="file" ref={fileInputRef} accept={currentSystem.extensions} onChange={handleRomUpload} className="hidden" />
               {canUseNativeCurrent && !nativeStatus?.installed && (
                 <button
                   onClick={installCurrentNativeEngine}
                   disabled={nativeBusy}
                   className={cn(
                     "mb-2 group relative w-full sm:w-auto px-4 sm:px-6 py-2 bg-neon-cyan/15 hover:bg-neon-cyan/25 border border-neon-cyan/40 rounded-full backdrop-blur-md transition-all flex items-center justify-center gap-2 overflow-hidden shadow-[0_0_20px_rgba(34,211,238,0.15)] hover:shadow-[0_0_30px_rgba(34,211,238,0.28)] active:scale-95",
                     nativeBusy && "cursor-wait opacity-70",
                   )}
                 >
                   {nativeBusy ? <Loader2 className="h-4 w-4 animate-spin text-neon-cyan" /> : <Download className="h-4 w-4 text-neon-cyan" />}
                   <span className="font-pixel text-[clamp(0.5rem,1.7vw,0.65rem)] uppercase tracking-widest text-neon-cyan whitespace-nowrap">
                     {`Instalar ${nativeStatus?.engine_name || "emulador"}`}
                   </span>
                 </button>
               )}
               {canUseNativeCurrent && nativeStatus?.installed && (
                 <p className="mb-2 text-center font-pixel text-[8px] uppercase tracking-widest text-neon-green">
                   {nativeStatus.engine_name} instalado
                 </p>
               )}
               {(!canUseNativeCurrent || nativeStatus?.installed) && (
                 <button
                   onClick={canUseNativeCurrent ? openNativeRomPicker : openRomPicker}
                   className="group relative w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full backdrop-blur-md transition-all flex items-center justify-center gap-2 sm:gap-3 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
                 >
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                   {canUseNativeCurrent ? <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white flex-shrink-0" /> : <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white flex-shrink-0" />}
                   <span className="font-pixel text-[clamp(0.5rem,1.8vw,0.7rem)] text-white uppercase tracking-widest whitespace-nowrap">
                      Cargar ROM
                   </span>
                 </button>
               )}
               <p className="text-center text-[clamp(0.5rem,1.4vw,0.6rem)] font-body text-white/50 mt-2 sm:mt-3 break-all px-2">
                  {canUseNativeCurrent
                    ? `Formatos: ${currentSystem.extensions}`
                    : currentSystem.nativeOnly
                    ? (currentSystem.nativeOnlyDescription || "Solo disponible en FORBIDDENS Launcher")
                    : `Formatos: ${currentSystem.extensions}`}
               </p>
            </div>
          </div>

          {/* BOTTOM BAR */}
          <div className="absolute bottom-0 w-full p-2 sm:p-4 bg-black/60 backdrop-blur-xl border-t border-white/10 flex justify-center md:justify-between items-center z-20 gap-2">
            <div className="hidden md:flex items-center gap-6">
               <div className="flex items-center gap-2">
                 <span className="bg-white/20 px-2 py-0.5 rounded text-white font-bold text-[10px] font-body shadow-sm">⬅ / ➡</span>
                 <span className="font-pixel text-[9px] text-white/70 uppercase tracking-widest">Navegar</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="bg-white/20 px-2 py-0.5 rounded text-white font-bold text-[10px] font-body shadow-sm">ENTER</span>
                 <span className="font-pixel text-[9px] text-white/70 uppercase tracking-widest">Seleccionar ROM</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="bg-white/20 px-2 py-0.5 rounded text-white font-bold text-[10px] font-body shadow-sm">DRAG</span>
                 <span className="font-pixel text-[9px] text-white/70 uppercase tracking-widest">Arrastrar</span>
               </div>
            </div>
            <div className="flex md:hidden items-center gap-2 sm:gap-3 w-full justify-between max-w-md">
               <button onClick={() => setCurrentIndex((prev) => (prev - 1 + systems.length) % systems.length)} className="p-2 sm:p-3 bg-white/10 rounded-full border border-white/10 active:bg-white/30 transition-colors flex-shrink-0">
                 <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
               </button>
               <button
                 onClick={canUseNativeCurrent && !nativeStatus?.installed ? installCurrentNativeEngine : (canUseNativeCurrent ? openNativeRomPicker : openRomPicker)}
                 className="flex-1 px-3 sm:px-5 py-2.5 sm:py-3 bg-white/20 rounded-full border border-white/20 font-pixel text-[clamp(0.5rem,1.8vw,0.65rem)] uppercase text-white active:bg-white/40 transition-colors whitespace-nowrap overflow-hidden text-ellipsis"
               >
                  {canUseNativeCurrent && !nativeStatus?.installed ? "INSTALAR EMULADOR" : "CARGAR ROM"}
               </button>
               <button onClick={() => setCurrentIndex((prev) => (prev + 1) % systems.length)} className="p-2 sm:p-3 bg-white/10 rounded-full border border-white/10 active:bg-white/30 transition-colors flex-shrink-0">
                 <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
               </button>
            </div>
            
          </div>
        </>
      )}

      {/* 🎮 PS2 (Play!.js) — Modal informativo, NO se embebe el emulador */}
      <Dialog open={ps2DialogOpen} onOpenChange={setPs2DialogOpen}>
        <DialogContent className="max-w-lg bg-black/95 border-2 border-neon-magenta/50 shadow-[0_0_50px_rgba(217,70,239,0.4)] text-white">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-pixel text-[10px] px-2 py-1 rounded border border-red-500/60 bg-red-600/20 text-red-400 animate-pulse tracking-widest uppercase">
                Experimental
              </span>
              <span className="font-pixel text-[9px] text-white/50 tracking-widest uppercase">
                Solo PC
              </span>
            </div>
            <DialogTitle className="font-pixel text-base sm:text-lg text-neon-cyan tracking-wide">
              Jugar PS2 con Play!.js
            </DialogTitle>
            <DialogDescription className="font-body text-xs sm:text-sm text-white/70 leading-relaxed pt-2">
              Play!.js no se puede embeber aquí por restricciones de seguridad
              del navegador (<code className="text-neon-yellow">SharedArrayBuffer</code> / COOP+COEP).
              Tienes que abrirlo en una pestaña nueva de tu navegador.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-black/60 border border-neon-cyan/30 rounded-lg p-3 sm:p-4 mt-2">
            <p className="font-pixel text-[9px] sm:text-[10px] text-neon-cyan uppercase tracking-widest mb-3">
              Cómo jugar:
            </p>
            <ol className="font-body text-xs sm:text-sm text-white/85 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Abre una pestaña nueva en tu navegador (escritorio).</li>
              <li>Copia esta URL y pégala en la barra de direcciones:</li>
            </ol>
            <div className="mt-3 flex items-center gap-2 bg-black/80 border border-neon-cyan/40 rounded px-3 py-2">
              <code className="flex-1 font-mono text-xs sm:text-sm text-neon-yellow break-all select-all">
                https://playjs.purei.org/
              </code>
              <button
                onClick={copyPs2Url}
                className={cn(
                  "font-pixel text-[8px] sm:text-[9px] px-3 py-1.5 rounded border uppercase tracking-widest transition-colors active:scale-95 flex items-center gap-1",
                  ps2Copied
                    ? "bg-neon-green/20 border-neon-green/50 text-neon-green"
                    : "bg-neon-cyan/20 hover:bg-neon-cyan/40 border-neon-cyan/50 text-neon-cyan"
                )}
              >
                {ps2Copied ? <><Check className="w-3 h-3" /> Copiado</> : "Copiar"}
              </button>
            </div>
            <ol start={3} className="font-body text-xs sm:text-sm text-white/85 space-y-1.5 list-decimal list-inside leading-relaxed mt-3">
              <li>Dentro del emulador, presiona <strong className="text-neon-yellow">"Boot DiskImage"</strong> y selecciona tu archivo <code className="text-neon-yellow">.iso</code> / <code className="text-neon-yellow">.cso</code>.</li>
            </ol>
          </div>

          <p className="font-body text-[10px] sm:text-xs text-white/50 italic leading-snug mt-2">
            💡 No requiere BIOS · Compatibilidad limitada · No otorga puntaje en el ranking.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
