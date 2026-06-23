import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import {
  Gamepad2,
  X,
  Minimize2,
  Maximize2,
  Trophy,
  Clock,
  Save,
  Move,
  GripVertical,
  Download,
  Upload,
  Pause,
  Play,
  Settings,
  Volume2,
  Volume1,
  VolumeX,
  Minus,
  Copy,
  ChevronLeft,
  ChevronRight,
  Monitor,
  RotateCcw,
  Link2,
  Share2,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import TouchGamepad from "@/components/TouchGamepad";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserActiveEmulatorShell } from "@/hooks/useUserActiveEmulatorShell";
import { isEmulatorShellCompatible } from "@/lib/emulatorShells";

// 🔥 HACK MAESTRO DE AUDIO: Intercepta la Web Audio API globalmente 🔥
if (typeof window !== "undefined" && !(window as any).__audioDestPatched) {
  (window as any).__audioDestPatched = true;
  (window as any).__masterVolume = 1.0;
  (window as any).__masterGains = new Set();

  const OrigConnect = AudioNode.prototype.connect;

  AudioNode.prototype.connect = function (...args: any[]) {
    const destination = args[0];

    if (destination === this.context.destination) {
      const ctx = this.context as any;
      if (!ctx.__masterGain) {
        const gain = ctx.createGain();
        gain.gain.value = (window as any).__masterVolume;
        (window as any).__masterGains.add(gain);
        ctx.__masterGain = gain;
        OrigConnect.call(gain, destination);
      }
      return OrigConnect.call(this, ctx.__masterGain);
    }

    return OrigConnect.call(this, ...args);
  };
}

const consoleIcons: Record<string, string> = {
  nes: "🎮",
  snes: "🕹️",
  gba: "📱",
  n64: "👾",
  gbc: "📟",
  sega: "🦔",
  ps1: "💿",
  arcade: "🕹️",
};

const emulatorJsConsoles = new Set(["n64", "ps1", "arcade", "ds", "psp"]);
const realCloudSaveConsoles = new Set(["n64", "ps1"]);

const getEmulatorJsCore = (consoleName: string) => {
  if (consoleName === "n64") return "n64";
  if (consoleName === "ps1") return "psx";
  if (consoleName === "arcade") return "arcade";
  if (consoleName === "ds") return "nds";
  if (consoleName === "psp") return "psp";
  return consoleName;
};

interface SaveSlot {
  name: string;
  data: any;
  timestamp: number;
}

const SAVE_DATA_GZIP_PREFIX = "gzip:";

const AFK_TIMEOUT_MS = 30 * 1000;
const ROSITA_PC_ASPECT_RATIO = 1929 / 1079;
const SNES_RETRO_PORTRAIT_ASPECT_RATIO = 690.75 / 1200;
const SNES_RETRO_LANDSCAPE_ASPECT_RATIO = 2034 / 915;
const SNES_RETRO_DESKTOP_ASPECT_RATIO = 1440 / 810;

const getSnesRetroPortraitWindowSize = () => {
  if (typeof window === "undefined") return { w: 390, h: 678 };
  const maxW = Math.max(320, window.innerWidth - 8);
  const maxH = Math.max(520, window.innerHeight - 8);
  let h = maxH;
  let w = h * SNES_RETRO_PORTRAIT_ASPECT_RATIO;
  if (w > maxW) {
    w = maxW;
    h = w / SNES_RETRO_PORTRAIT_ASPECT_RATIO;
  }
  return { w, h };
};

const getSnesRetroLandscapeWindowSize = () => {
  if (typeof window === "undefined") return { w: 960, h: 432 };
  const maxW = Math.max(560, window.innerWidth - 8);
  const maxH = Math.max(300, window.innerHeight - 8);
  let w = maxW;
  let h = w / SNES_RETRO_LANDSCAPE_ASPECT_RATIO;
  if (h > maxH) {
    h = maxH;
    w = h * SNES_RETRO_LANDSCAPE_ASPECT_RATIO;
  }
  return { w, h };
};

const getSnesRetroDesktopWindowSize = () => {
  if (typeof window === "undefined") return { w: 1180, h: 664 };
  const maxW = Math.max(720, window.innerWidth - 16);
  const maxH = Math.max(420, window.innerHeight - 16);
  let w = maxW;
  let h = w / SNES_RETRO_DESKTOP_ASPECT_RATIO;
  if (h > maxH) {
    h = maxH;
    w = h * SNES_RETRO_DESKTOP_ASPECT_RATIO;
  }
  return { w, h };
};

const getLargeGameWindowSize = () => {
  if (typeof window === "undefined") return { w: 1180, h: 760 };
  return {
    w: Math.max(360, window.innerWidth - 24),
    h: Math.max(420, window.innerHeight - 24),
  };
};

const getRositaDesktopWindowSize = () => {
  if (typeof window === "undefined") return { w: 1180, h: 660 };
  const maxW = Math.max(360, window.innerWidth - 16);
  const maxH = Math.max(420, window.innerHeight - 16);
  let w = maxW;
  let h = w / ROSITA_PC_ASPECT_RATIO;
  if (h > maxH) {
    h = maxH;
    w = h * ROSITA_PC_ASPECT_RATIO;
  }
  return { w, h };
};

type RositaLayoutBox = { x: number; y: number; w: number; h: number };
type SnesRetroButtonKey =
  | "up"
  | "down"
  | "left"
  | "right"
  | "a"
  | "b"
  | "x"
  | "y"
  | "l"
  | "r"
  | "select"
  | "start";

const SNES_RETRO_KEY_MAP: Record<SnesRetroButtonKey, { key: string; code: string; keyCode: number }> = {
  up: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
  down: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
  left: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  right: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  a: { key: "x", code: "KeyX", keyCode: 88 },
  b: { key: "z", code: "KeyZ", keyCode: 90 },
  x: { key: "s", code: "KeyS", keyCode: 83 },
  y: { key: "a", code: "KeyA", keyCode: 65 },
  l: { key: "q", code: "KeyQ", keyCode: 81 },
  r: { key: "w", code: "KeyW", keyCode: 87 },
  select: { key: "Shift", code: "ShiftRight", keyCode: 16 },
  start: { key: "Enter", code: "Enter", keyCode: 13 },
};

type RositaLayout = {
  screen: RositaLayoutBox;
  topbar: RositaLayoutBox;
  info: RositaLayoutBox;
  actions: RositaLayoutBox;
  side: RositaLayoutBox;
  minButton: RositaLayoutBox;
  fullButton: RositaLayoutBox;
  closeButton: RositaLayoutBox;
  saveButton: RositaLayoutBox;
  loadButton: RositaLayoutBox;
  volumeButton: RositaLayoutBox;
  volumeSlider: RositaLayoutBox;
  configButton: RositaLayoutBox;
  pauseButton: RositaLayoutBox;
  songToast: RositaLayoutBox;
  touchFrame: RositaLayoutBox;
  touchDpad: RositaLayoutBox;
  touchActions: RositaLayoutBox;
  touchMenu: RositaLayoutBox;
};

type RositaLayoutVariant = "pc" | "mobilePortrait" | "mobileLandscape";

const ROSITA_MOBILE_PORTRAIT_ZOOM_X = 1.21;
const ROSITA_MOBILE_PORTRAIT_ZOOM_Y = 1.12;
const ROSITA_LEGACY_LAYOUT_STORAGE_KEY = "forbiddens:rosita-nes-layout-v1";
const ROSITA_PC_LAYOUT_STORAGE_KEY = "forbiddens:rosita-nes-layout-pc-v3";
const ROSITA_MOBILE_PORTRAIT_LAYOUT_STORAGE_KEY = "forbiddens:rosita-nes-layout-mobile-portrait-v5";
const ROSITA_MOBILE_LANDSCAPE_LAYOUT_STORAGE_KEY = "forbiddens:rosita-nes-layout-mobile-landscape-v3";

const DEFAULT_ROSITA_LAYOUT: RositaLayout = {
  screen: { x: 7.169112660956539, y: 15.491231964483907, w: 78.07539653270914, h: 68.44284128745838 },
  topbar: { x: 6.172577837231989, y: 3.7195836534904245, w: 89.03598293520402, h: 9.964316877806162 },
  info: { x: -0.7563479200432199, y: 0.9988901220865706, w: 18.4430037817396, h: 101.44284128745838 },
  actions: { x: 68.44809966512221, y: -3.384492794549996, w: 17.2, h: 100 },
  side: { x: 88.79652710595522, y: 71.49146379105399, w: 6.1235829920421825, h: 22.778069512945283 },
  minButton: { x: 80.38452188006484, y: 6.037902330743618, w: 2.1, h: 4.25 },
  fullButton: { x: 83.13253461905803, y: 6.037902330743617, w: 2.1, h: 4.25 },
  closeButton: { x: 85.55000000000001, y: 5.2141846556642095, w: 3.0603727714748787, h: 5.670865704772476 },
  saveButton: { x: 89.00366274829345, y: 16.214719892646126, w: 5.361665672475887, h: 8.535625001368194 },
  loadButton: { x: 89.06704148480662, y: 27.007158712541617, w: 5.011708032553514, h: 9.411487236403994 },
  volumeButton: { x: 89.36133802292879, y: 37.34601637015195, w: 4.44728723727305, h: 10.410377358490564 },
  volumeSlider: { x: 87.14813662685728, y: 33.82641509433962, w: 1, h: 17.5 },
  configButton: { x: 88.2420049823041, y: 48.88629300776916, w: 6.051392817834406, h: 8.792363624025027 },
  pauseButton: { x: 89.0750989117946, y: 57.25826859045506, w: 5.0855213335386935, h: 14.914073667872865 },
  songToast: { x: 35.25058204887335, y: 5.7758046614872365, w: 30, h: 5.6 },
  touchFrame: { x: 3, y: 66, w: 94, h: 29 },
  touchDpad: { x: 7, y: 71, w: 20, h: 18 },
  touchActions: { x: 72, y: 72, w: 21, h: 16 },
  touchMenu: { x: 38, y: 88, w: 24, h: 6 },
};

const DEFAULT_ROSITA_MOBILE_PORTRAIT_LAYOUT: RositaLayout = {
  ...DEFAULT_ROSITA_LAYOUT,
  screen: { x: 25.36911266095654, y: 10.467867478502598, w: 49.87539653270913, h: 56.99424315661726 },
  topbar: { x: 14.702067598954272, y: -0.04043280105506142, w: 67.4444525547285, h: 17.164620989454473 },
  info: { x: 13.01301524691032, y: 0, w: 56.65298657003565, h: 13.465313197570739 },
  actions: { x: 40.77471475451041, y: 66.16576195047611, w: 17.676492435909047, h: 6.351202352199941 },
  side: { x: 76.21637651607894, y: 49.66825593700088, w: 10.815053279894336, h: 19.021136495431264 },
  minButton: { x: 74.94743518742966, y: 5.839632068680437, w: 3.1327022375215146, h: 5.485955056179776 },
  fullButton: { x: 78.89715859085919, y: 6.284935828590932, w: 3.1327022375215146, h: 4.699438202247191 },
  closeButton: { x: 82.54248120300753, y: 5.394289979409628, w: 4.265192048583313, h: 6.345023008143263 },
  saveButton: { x: 77.89233781167898, y: 12.239974642850186, w: 8.45915349287867, h: 7.948287503716398 },
  loadButton: { x: 77.9555096431543, y: 18.930857454207384, w: 8.183825072140433, h: 9.294664806497453 },
  volumeButton: { x: 78.20849809177561, y: 27.60430471788367, w: 7.483776049665479, h: 6.346794453943678 },
  volumeSlider: { x: 72.51818826196916, y: 22.478100487598052, w: 2.2048192771084336, h: 13.455056179775282 },
  configButton: { x: 77.39863148832819, y: 33.02292416687223, w: 8.116797292877436, h: 9.308730000374117 },
  pauseButton: { x: 77.543257259471, y: 38.24883233382778, w: 8.444006338999953, h: 15.296583696018157 },
  songToast: { x: 34.11674746240718, y: 11.383281297001254, w: 31.81654135338346, h: 2.4457943925233643 },
  touchFrame: { x: 10.884681583476763, y: 68.89887640449439, w: 63.77280550774526, h: 18.34831460674157 },
  touchDpad: { x: 13.478232752532975, y: 72.48087736495094, w: 25.812897661887575, h: 13.698323233467068 },
  touchActions: { x: 60.39554601254031, y: 72.81735492971447, w: 26.796778104057676, h: 11.820209705371788 },
  touchMenu: { x: 42.28404444962371, y: 71.17816791602624, w: 15.304647160068846, h: 6.561797752808988 },
};

const DEFAULT_ROSITA_MOBILE_LANDSCAPE_LAYOUT: RositaLayout = {
  ...DEFAULT_ROSITA_LAYOUT,
  screen: { x: 14.55030578532459, y: 7.915474388726333, w: 71.09865234666262, h: 61.408209252826346 },
  topbar: { x: 13.452748987851084, y: 1.1690602597372426, w: 72.80747320091203, h: 7.807679819789318 },
  info: { x: 20.67944581099824, y: 8.557158712541622, w: 18.4430037817396, h: 101.44284128745838 },
  actions: { x: 64.02780832266765, y: 14.742966790399471, w: 17.604448938321536, h: 51.993620414673046 },
  side: { x: 3.696882917499166, y: 19.673594032061178, w: 8.36189205785361, h: 22.53965955855614 },
  minButton: { x: 87.23123332239855, y: 3.5303282305202073, w: 2.1, h: 4.25 },
  fullButton: { x: 90.73603332114054, y: 3.350671236161834, w: 2.1, h: 4.25 },
  closeButton: { x: 93.74009100101114, y: 2.6663478770582003, w: 3.0603727714748787, h: 5.670865704772476 },
  saveButton: { x: 89.65243310160773, y: 9.891770174731132, w: 7.621846844454562, h: 11.095166964103429 },
  loadButton: { x: 90.32698604334941, y: 23.345401190378617, w: 5.899089630847437, h: 11.07924123343876 },
  volumeButton: { x: 89.85026963984825, y: 37.85753009850967, w: 6.474539574416189, h: 10.860608956709125 },
  volumeSlider: { x: 87.21801161725716, y: 32.15895633032837, w: 1, h: 17.5 },
  configButton: { x: 27.327453693739066, y: 74.86691138258789, w: 9.374755644018508, h: 14.162101809952665 },
  pauseButton: { x: 89.87243570536342, y: 53.15613128443378, w: 6.259220426226479, h: 11.249350775954206 },
  songToast: { x: 39.80063260499063, y: 8.806107691790265, w: 33.74115267947422, h: 3.5266347687400317 },
  touchFrame: { x: 4, y: 66, w: 92, h: 30 },
  touchDpad: { x: 2.0465767391452996, y: 68.80438382129296, w: 12.67761654869853, h: 26.109589058565398 },
  touchActions: { x: 71.37486457204767, y: 73.68453292496172, w: 20, h: 18 },
  touchMenu: { x: 42.32536557636522, y: 74.25319197758643, w: 15.00761985273797, h: 18.41398357928351 },
};

const clampPercent = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const scaleRositaBox = (box: RositaLayoutBox, scaleX: number, scaleY = scaleX): RositaLayoutBox => ({
  x: 50 + (box.x - 50) * scaleX,
  y: 50 + (box.y - 50) * scaleY,
  w: box.w * scaleX,
  h: box.h * scaleY,
});

const scaleRositaLayout = (layout: RositaLayout, scaleX: number, scaleY = scaleX): RositaLayout => ({
  screen: scaleRositaBox(layout.screen, scaleX, scaleY),
  topbar: scaleRositaBox(layout.topbar, scaleX, scaleY),
  info: scaleRositaBox(layout.info, scaleX, scaleY),
  actions: scaleRositaBox(layout.actions, scaleX, scaleY),
  side: scaleRositaBox(layout.side, scaleX, scaleY),
  minButton: scaleRositaBox(layout.minButton, scaleX, scaleY),
  fullButton: scaleRositaBox(layout.fullButton, scaleX, scaleY),
  closeButton: scaleRositaBox(layout.closeButton, scaleX, scaleY),
  saveButton: scaleRositaBox(layout.saveButton, scaleX, scaleY),
  loadButton: scaleRositaBox(layout.loadButton, scaleX, scaleY),
  volumeButton: scaleRositaBox(layout.volumeButton, scaleX, scaleY),
  volumeSlider: scaleRositaBox(layout.volumeSlider, scaleX, scaleY),
  configButton: scaleRositaBox(layout.configButton, scaleX, scaleY),
  pauseButton: scaleRositaBox(layout.pauseButton, scaleX, scaleY),
  songToast: scaleRositaBox(layout.songToast, scaleX, scaleY),
  touchFrame: scaleRositaBox(layout.touchFrame, scaleX, scaleY),
  touchDpad: scaleRositaBox(layout.touchDpad, scaleX, scaleY),
  touchActions: scaleRositaBox(layout.touchActions, scaleX, scaleY),
  touchMenu: scaleRositaBox(layout.touchMenu, scaleX, scaleY),
});

const getRositaLayoutStorageKey = (variant: RositaLayoutVariant) => (
  variant === "mobilePortrait"
    ? ROSITA_MOBILE_PORTRAIT_LAYOUT_STORAGE_KEY
    : variant === "mobileLandscape"
    ? ROSITA_MOBILE_LANDSCAPE_LAYOUT_STORAGE_KEY
    : ROSITA_PC_LAYOUT_STORAGE_KEY
);

const getDefaultRositaLayout = (variant: RositaLayoutVariant) => (
  variant === "mobilePortrait"
    ? scaleRositaLayout(DEFAULT_ROSITA_MOBILE_PORTRAIT_LAYOUT, ROSITA_MOBILE_PORTRAIT_ZOOM_X, ROSITA_MOBILE_PORTRAIT_ZOOM_Y)
    : variant === "mobileLandscape"
    ? DEFAULT_ROSITA_MOBILE_LANDSCAPE_LAYOUT
    : DEFAULT_ROSITA_LAYOUT
);

const readRositaLayout = (variant: RositaLayoutVariant = "pc"): RositaLayout => {
  const defaults = getDefaultRositaLayout(variant);
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(getRositaLayoutStorageKey(variant)) || "";
    const stored = JSON.parse(raw);
    return {
      screen: { ...defaults.screen, ...(stored?.screen || {}) },
      topbar: { ...defaults.topbar, ...(stored?.topbar || {}) },
      info: { ...defaults.info, ...(stored?.info || {}) },
      actions: { ...defaults.actions, ...(stored?.actions || {}) },
      side: { ...defaults.side, ...(stored?.side || {}) },
      minButton: { ...defaults.minButton, ...(stored?.minButton || {}) },
      fullButton: { ...defaults.fullButton, ...(stored?.fullButton || {}) },
      closeButton: { ...defaults.closeButton, ...(stored?.closeButton || {}) },
      saveButton: { ...defaults.saveButton, ...(stored?.saveButton || {}) },
      loadButton: { ...defaults.loadButton, ...(stored?.loadButton || {}) },
      volumeButton: { ...defaults.volumeButton, ...(stored?.volumeButton || {}) },
      volumeSlider: { ...defaults.volumeSlider, ...(stored?.volumeSlider || {}) },
      configButton: { ...defaults.configButton, ...(stored?.configButton || {}) },
      pauseButton: { ...defaults.pauseButton, ...(stored?.pauseButton || {}) },
      songToast: { ...defaults.songToast, ...(stored?.songToast || {}) },
      touchFrame: { ...defaults.touchFrame, ...(stored?.touchFrame || {}) },
      touchDpad: { ...defaults.touchDpad, ...(stored?.touchDpad || {}) },
      touchActions: { ...defaults.touchActions, ...(stored?.touchActions || {}) },
      touchMenu: { ...defaults.touchMenu, ...(stored?.touchMenu || {}) },
    };
  } catch {
    return defaults;
  }
};

const writeRositaLayout = (layout: RositaLayout, variant: RositaLayoutVariant = "pc") => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getRositaLayoutStorageKey(variant), JSON.stringify(layout));
};

export default function GameBubble() {
  const location = useLocation();
  const { activeGames, currentGameIndex, minimized, maximizeGame, minimizeGame, closeGame, updateScore } =
    useGameBubble();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const activeGame = activeGames[currentGameIndex] || null;
  const { emulatorShell } = useUserActiveEmulatorShell(user?.id, activeGame?.consoleName);

  const [nostalgistInstance, setNostalgistInstance] = useState<any>(null);
  const [romLoaded, setRomLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const scoreRef = useRef(0);
  const timeRef = useRef(0);

  const lastInputRef = useRef(Date.now());
  const afkRef = useRef(false);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupSize, setPopupSize] = useState(() => getLargeGameWindowSize());
  const [resizing, setResizing] = useState(false);
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const nostalgistRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emulatorFrameRef = useRef<HTMLIFrameElement>(null);
  const emulatorObjectUrlsRef = useRef<string[]>([]);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const realSaveUploadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRealSaveHashRef = useRef<string | null>(null);

  const [paused, setPaused] = useState(false);

  const [volume, setVolume] = useState(() => {
    if (typeof window === "undefined") return 1;
    const stored = Number(window.localStorage.getItem("forbiddens:emulator-volume"));
    return Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : 1;
  });
  const volumeRef = useRef(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const volumeControlRef = useRef<HTMLDivElement>(null);
  const volumeSliderRef = useRef<HTMLDivElement>(null);
  const volumeSliderHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [snesToolsOpen, setSnesToolsOpen] = useState(false);
  const snesToolsBubbleRef = useRef<HTMLDivElement | null>(null);
  const snesToolsWasOpenRef = useRef(false);
  const snesToolsPausedGameRef = useRef(false);
  const [slotName, setSlotName] = useState("");

  const isPs2 = !!activeGame && activeGame.consoleName === "ps2";
  const usesEmulatorJs = !!activeGame && emulatorJsConsoles.has(activeGame.consoleName);
  const usesRealCloudSaves = !!activeGame && usesEmulatorJs && realCloudSaveConsoles.has(activeGame.consoleName);
  const isN64 = !!activeGame && ["n64", "ps1", "arcade", "ps2", "psp"].includes(activeGame.consoleName);
  const usesRositaNesShell = !minimized && emulatorShell?.slug === "rosita_nes" && isEmulatorShellCompatible(emulatorShell.slug, activeGame?.consoleName);

  useEffect(() => {
    if (!activeGame || minimized) return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const shouldHideThemeScrollbars = usesRositaNesShell && isMobile;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    if (shouldHideThemeScrollbars) {
      document.documentElement.classList.add("rosita-mobile-overlay-active");
      document.body.classList.add("rosita-mobile-overlay-active");
    }
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      if (shouldHideThemeScrollbars) {
        document.documentElement.classList.remove("rosita-mobile-overlay-active");
        document.body.classList.remove("rosita-mobile-overlay-active");
      }
    };
  }, [activeGame, minimized, usesRositaNesShell, isMobile]);
  const [rositaEditorEnabled, setRositaEditorEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("rositaEditor") === "1"
      || window.localStorage.getItem("forbiddens:rosita-editor-enabled") === "1";
  });
  const [rositaLayout, setRositaLayout] = useState<RositaLayout>(() => readRositaLayout());

  // 🔐 Namespace por usuario para que las partidas no se filtren entre cuentas en el mismo navegador
  const getSaveKey = useCallback((gameName: string) => {
    const uid = user?.id || "anon";
    return `save_slots_${uid}_${gameName}`;
  }, [user?.id]);

  const revokeEmulatorObjectUrls = useCallback(() => {
    emulatorObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    emulatorObjectUrlsRef.current = [];
  }, []);

  // 🔥 DETECCIÓN INFALIBLE DE PANTALLA COMPLETA Y MODO TEATRO 🔥
  const [theaterRect, setTheaterRect] = useState<DOMRect | null>(null);
  const [forceFloating, setForceFloating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [expandedControlsOpen, setExpandedControlsOpen] = useState(false);
  const isMobileOrTablet =
    isMobile ||
    (typeof window !== "undefined" &&
      window.innerWidth <= 1180);
  const usesSnesRetroPortraitShell =
    !minimized &&
    emulatorShell?.slug === "snes_retro" &&
    isEmulatorShellCompatible(emulatorShell.slug, activeGame?.consoleName) &&
    isMobileOrTablet &&
    !isLandscape;
  const usesSnesRetroLandscapeShell =
    !minimized &&
    emulatorShell?.slug === "snes_retro" &&
    isEmulatorShellCompatible(emulatorShell.slug, activeGame?.consoleName) &&
    isMobileOrTablet &&
    isLandscape;
  const usesSnesRetroDesktopShell =
    !minimized &&
    emulatorShell?.slug === "snes_retro" &&
    isEmulatorShellCompatible(emulatorShell.slug, activeGame?.consoleName) &&
    !isMobileOrTablet;
  const usesSnesRetroShell = usesSnesRetroPortraitShell || usesSnesRetroLandscapeShell || usesSnesRetroDesktopShell;
  const usesCustomEmulatorShell = usesRositaNesShell || usesSnesRetroShell;
  const rositaLayoutVariant: RositaLayoutVariant = isMobile
    ? isLandscape
      ? "mobileLandscape"
      : "mobilePortrait"
    : "pc";

  // --- Lógica de Inactividad para el botón en Fullscreen/Teatro ---
  const [isIdle, setIsIdle] = useState(false);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    idleTimeoutRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 3000); // 3 segundos sin interactuar para volverse traslúcido
  }, []);

  useEffect(() => {
    if (isFullscreen || (theaterRect && !minimized && !forceFloating && !isPs2)) {
      resetIdleTimer();
      window.addEventListener('mousemove', resetIdleTimer);
      window.addEventListener('mousedown', resetIdleTimer);
      window.addEventListener('touchstart', resetIdleTimer);
      window.addEventListener('keydown', resetIdleTimer);

      return () => {
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        window.removeEventListener('mousemove', resetIdleTimer);
        window.removeEventListener('mousedown', resetIdleTimer);
        window.removeEventListener('touchstart', resetIdleTimer);
        window.removeEventListener('keydown', resetIdleTimer);
      };
    } else {
      setIsIdle(false);
    }
  }, [isFullscreen, theaterRect, minimized, forceFloating, isPs2, resetIdleTimer]);
  // ---------------------------------------------------------------


  useEffect(() => {
    const updateOrientation = () => setIsLandscape(window.innerWidth > window.innerHeight);
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    const mql = window.matchMedia("(orientation: landscape)");
    mql.addEventListener("change", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      mql.removeEventListener("change", updateOrientation);
    };
  }, []);

  const getPreferredWindowSize = useCallback(() => {
    if (usesSnesRetroPortraitShell) return getSnesRetroPortraitWindowSize();
    if (usesSnesRetroLandscapeShell) return getSnesRetroLandscapeWindowSize();
    if (usesSnesRetroDesktopShell) return getSnesRetroDesktopWindowSize();
    if (usesRositaNesShell && !isMobile) return getRositaDesktopWindowSize();
    return getLargeGameWindowSize();
  }, [isMobile, usesRositaNesShell, usesSnesRetroDesktopShell, usesSnesRetroLandscapeShell, usesSnesRetroPortraitShell]);
  const preferredWindowSizeRef = useRef(getPreferredWindowSize);

  useEffect(() => {
    preferredWindowSizeRef.current = getPreferredWindowSize;
  }, [getPreferredWindowSize]);

  useEffect(() => {
    if (!usesSnesRetroShell) setSnesToolsOpen(false);
  }, [usesSnesRetroShell]);

  useEffect(() => {
    if (!usesRositaNesShell) return;
    setRositaLayout(readRositaLayout(rositaLayoutVariant));
  }, [rositaLayoutVariant, usesRositaNesShell]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const nextFullscreen = document.fullscreenElement === popupRef.current;
      setIsFullscreen(nextFullscreen);
      if (!nextFullscreen && popupRef.current) {
        setPosition({ x: 0, y: 0 });
        setPopupSize(getLargeGameWindowSize());
        requestAnimationFrame(() => {
          if (canvasRef.current) {
            canvasRef.current.style.width = "100%";
            canvasRef.current.style.height = "100%";
          }
        });
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const checkBatoceraContainer = () => {
      const el = document.getElementById("batocera-target");
      if (el) {
        const rect = el.getBoundingClientRect();
        setTheaterRect((prev) => {
          if (
            !prev ||
            prev.top !== rect.top ||
            prev.left !== rect.left ||
            prev.width !== rect.width ||
            prev.height !== rect.height
          ) {
            return rect;
          }
          return prev;
        });
      } else {
        setTheaterRect(null);
      }
    };

    checkBatoceraContainer();
    const interval = setInterval(checkBatoceraContainer, 200);
    window.addEventListener("resize", checkBatoceraContainer);
    window.addEventListener("scroll", checkBatoceraContainer, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", checkBatoceraContainer);
      window.removeEventListener("scroll", checkBatoceraContainer, true);
    };
  }, [activeGame, minimized, location.pathname]);

  useEffect(() => {
    setForceFloating(false);
    setExpandedControlsOpen(false);
    setIsFullscreen(false);
    setPosition({ x: 0, y: 0 });
    setPopupSize(preferredWindowSizeRef.current());
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, [activeGame?.romUrl]);

  // 🎮 PS2: ventana emergente flotante (NO modo teatro maximizado)
  const isTheaterActive = theaterRect && !minimized && !forceFloating && !isPs2 && !usesCustomEmulatorShell;
  const isExpanded = isTheaterActive || isFullscreen;

  useEffect(() => {
    const allowLandscape = Boolean(activeGame && !minimized && isExpanded);
    document.documentElement.classList.toggle("forbiddens-game-expanded", allowLandscape);
    document.body.classList.toggle("forbiddens-game-expanded", allowLandscape);
    window.dispatchEvent(new CustomEvent("forbiddens:game-expanded-change", { detail: { expanded: allowLandscape } }));

    return () => {
      document.documentElement.classList.remove("forbiddens-game-expanded");
      document.body.classList.remove("forbiddens-game-expanded");
      window.dispatchEvent(new CustomEvent("forbiddens:game-expanded-change", { detail: { expanded: false } }));
    };
  }, [activeGame?.romUrl, isExpanded, minimized]);

  useEffect(() => {
    if (!activeGame || minimized) return;
    const resizeToLargeWindow = () => {
      if (!document.fullscreenElement && !isTheaterActive) {
        setPosition({ x: 0, y: 0 });
        setPopupSize(getPreferredWindowSize());
      }
    };
    window.addEventListener("resize", resizeToLargeWindow);
    window.addEventListener("orientationchange", resizeToLargeWindow);
    return () => {
      window.removeEventListener("resize", resizeToLargeWindow);
      window.removeEventListener("orientationchange", resizeToLargeWindow);
    };
  }, [activeGame, getPreferredWindowSize, isTheaterActive, minimized]);

  useEffect(() => {
    if (!isExpanded) setExpandedControlsOpen(false);
  }, [isExpanded]);

  const syncCanvasSurface = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (usesCustomEmulatorShell) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.maxWidth = "100%";
      canvas.style.maxHeight = "100%";
      canvas.style.objectFit = "contain";
    } else {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    }
    canvas.style.display = "block";
    // 🔥 FIX BLACK SCREEN: muchos cores libretro usan Module.setCanvasSize() o
    // escuchan el evento "resize". Si el canvas tiene tamaño 0 al rotar,
    // el GL viewport queda inválido. Forzamos reflow leyendo offsetHeight.
    void canvas.offsetHeight;
  }, [usesCustomEmulatorShell]);

  const scheduleCanvasSurfaceSync = useCallback(() => {
    requestAnimationFrame(() => {
      syncCanvasSurface();
      requestAnimationFrame(() => syncCanvasSurface());
    });
  }, [syncCanvasSurface]);

  const scheduleVolumeSliderHide = useCallback((delay = 2000) => {
    if (volumeSliderHideTimerRef.current) {
      clearTimeout(volumeSliderHideTimerRef.current);
    }
    volumeSliderHideTimerRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
      volumeSliderHideTimerRef.current = null;
    }, delay);
  }, []);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("forbiddens:emulator-volume", String(newVol));
    }
    (window as any).__masterVolume = newVol;
    (emulatorFrameRef.current?.contentWindow as any)?.EJS_emulator?.setVolume?.(newVol);
    (window as any).__masterGains.forEach((gainNode: any) => {
      if (gainNode && gainNode.gain) {
        gainNode.gain.value = newVol;
      }
    });
    scheduleVolumeSliderHide();
  };

  useEffect(() => {
    return () => {
      if (volumeSliderHideTimerRef.current) {
        clearTimeout(volumeSliderHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!showVolumeSlider) return;
    const scheduleIfOutside = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && volumeControlRef.current?.contains(target)) return;
      if (target && volumeSliderRef.current?.contains(target)) return;
      if (volumeSliderHideTimerRef.current) {
        clearTimeout(volumeSliderHideTimerRef.current);
        volumeSliderHideTimerRef.current = null;
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem("forbiddens:emulator-volume", String(volumeRef.current));
      }
      setShowVolumeSlider(false);
    };
    const scheduleFromPageAction = () => scheduleVolumeSliderHide();
    window.addEventListener("pointerdown", scheduleIfOutside, true);
    window.addEventListener("scroll", scheduleFromPageAction, true);
    window.addEventListener("keydown", scheduleFromPageAction, true);
    return () => {
      window.removeEventListener("pointerdown", scheduleIfOutside, true);
      window.removeEventListener("scroll", scheduleFromPageAction, true);
      window.removeEventListener("keydown", scheduleFromPageAction, true);
    };
  }, [scheduleVolumeSliderHide, showVolumeSlider]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const onInput = () => {
      lastInputRef.current = Date.now();
      if (afkRef.current) afkRef.current = false;
    };
    window.addEventListener("keydown", onInput);
    window.addEventListener("mousedown", onInput);
    window.addEventListener("gamepadconnected", onInput);
    let gpInterval: ReturnType<typeof setInterval> | null = null;
    if (activeGame && romLoaded) {
      gpInterval = setInterval(() => {
        const gamepads = navigator.getGamepads?.();
        if (gamepads) {
          for (const gp of gamepads) {
            if (gp && gp.buttons.some((b) => b.pressed)) {
              onInput();
              break;
            }
          }
        }
      }, 500);
    }
    // Para EmulatorJS (N64, PS1, arcade), resetear AFK cada 10s para evitar pausa falsa
    let emulatorAfkInterval: ReturnType<typeof setInterval> | null = null;
    if (activeGame && romLoaded && usesEmulatorJs) {
      emulatorAfkInterval = setInterval(() => {
        lastInputRef.current = Date.now();
      }, 10000);
    }
    return () => {
      window.removeEventListener("keydown", onInput);
      window.removeEventListener("mousedown", onInput);
      window.removeEventListener("gamepadconnected", onInput);
      if (gpInterval) clearInterval(gpInterval);
      if (emulatorAfkInterval) clearInterval(emulatorAfkInterval);
    };
  }, [activeGame, romLoaded, usesEmulatorJs]);

  // 🎮 PUENTE GAMEPAD → EmulatorJS (iframe).
  // En móviles con mando Bluetooth, el iframe srcdoc no recibe Gamepad API.
  // Sondeamos desde el padre y reenviamos el estado al iframe vía postMessage.
  useEffect(() => {
    if (!usesEmulatorJs || !romLoaded || isPs2) return;
    const frame = emulatorFrameRef.current;
    if (!frame) return;
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      try {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        let gp: Gamepad | null = null;
        for (let i = 0; i < (pads?.length || 0); i++) {
          if (pads![i]) { gp = pads![i]!; break; }
        }
        if (gp && frame.contentWindow) {
          const state = {
            buttons: gp.buttons.map((b) => !!b.pressed),
            axes: Array.from(gp.axes),
          };
          frame.contentWindow.postMessage({ type: "forbiddens-gamepad", state }, "*");
        }
      } catch {}
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [usesEmulatorJs, romLoaded, isPs2, currentGameIndex]);


  const syncCloudSaves = async (slotsToSync: SaveSlot[]) => {
    if (!user || !activeGame) return;
    const safeSlots = slotsToSync.slice(0, 5);
    const slotsJson = JSON.stringify(safeSlots);

    try {
      const { uploadSaveSlotsToCloudflare } = await import("@/lib/cloudSaveSync");
      await uploadSaveSlotsToCloudflare({
        gameName: activeGame.gameName,
        consoleType: activeGame.consoleName,
        slotsJson,
      });
      return;
    } catch (e) {
      console.error("Cloudflare save error, falling back:", e);
    }

    // ☁️ Para EmulatorJS cores (N64/PS1/Arcade): subir a Google Drive en lugar de DB.
    const useDrive = ["n64", "ps1", "arcade", "psp"].includes(activeGame.consoleName);
    if (useDrive) {
      try {
        const { isDriveLinked, uploadSaveSlotsToDrive } = await import("@/lib/driveSaves");
        if (!isDriveLinked()) {
          toast({
            title: "Vincula Google Drive",
            description: "Para guardar partidas de N64/PS1/Arcade vincula tu Drive desde Perfil → Almacenamiento.",
            variant: "destructive",
          });
          return;
        }
        await uploadSaveSlotsToDrive({
          userId: user.id,
          gameName: activeGame.gameName,
          consoleType: activeGame.consoleName,
          slotsJson,
        });
      } catch (e: any) {
        console.error("Drive save error:", e);
        toast({ title: "Error subiendo a Drive", description: e?.message || "Reintenta", variant: "destructive" });
      }
      return;
    }

    // 🟦 Cores Nostalgist (NES/SNES/GBA): cache + DB como hasta ahora.
    try {
      const { data: existing } = await supabase
        .from("leaderboard_scores")
        .select("id")
        .eq("user_id", user.id)
        .eq("game_name", activeGame.gameName)
        .eq("console_type", activeGame.consoleName)
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("leaderboard_scores")
          .update({ game_state: slotsJson } as any)
          .eq("id", existing.id);
      } else {
        await supabase.from("leaderboard_scores").insert({
          user_id: user.id,
          display_name: profile?.display_name || "Anónimo",
          game_name: activeGame.gameName,
          console_type: activeGame.consoleName,
          score: 0,
          play_time_seconds: 0,
          game_state: slotsJson,
        } as any);
      }
    } catch (e) {
      console.error("Cloud sync error:", e);
    }
  };

  const persistSaveSlotsLocally = (key: string, slots: SaveSlot[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(slots));
    } catch (error) {
      console.warn("Local save cache skipped; cloud sync will continue.", error);
    }
  };

  const normalizeRealSaveBytes = (value: any): Uint8Array | null => {
    if (!value) return null;
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    if (Array.isArray(value)) return new Uint8Array(value);
    if (value?.data) return normalizeRealSaveBytes(value.data);
    return null;
  };

  const scheduleRealSaveUpload = (bytes: Uint8Array, hash?: string | null) => {
    if (!user || !activeGame || !usesRealCloudSaves || !bytes.byteLength) return;
    if (hash && hash === lastRealSaveHashRef.current) return;
    if (hash) lastRealSaveHashRef.current = hash;

    if (realSaveUploadTimerRef.current) {
      clearTimeout(realSaveUploadTimerRef.current);
    }

    const snapshot = new Uint8Array(bytes);
    realSaveUploadTimerRef.current = setTimeout(async () => {
      try {
        const { uploadGameRealSaveToCloudflare } = await import("@/lib/cloudSaveSync");
        await uploadGameRealSaveToCloudflare({
          gameName: activeGame.gameName,
          consoleType: activeGame.consoleName,
          data: bytesToBase64(snapshot),
          size: snapshot.byteLength,
          hash: hash || null,
        });
      } catch (error) {
        console.error("Real save cloud sync error:", error);
      }
    }, 1200);
  };

  useEffect(() => {
    if (activeGame) {
      const key = getSaveKey(activeGame.gameName);

      const syncAndLoadSaves = async () => {
        let localSlots: SaveSlot[] = [];
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            localSlots = JSON.parse(stored);
          } catch {
            localSlots = [];
          }
        }

        if (user) {
          const useDrive = ["n64", "ps1", "arcade", "psp"].includes(activeGame.consoleName);
          try {
            let cloudJson: string | null = null;
            try {
              const { downloadSaveSlotsFromCloudflare } = await import("@/lib/cloudSaveSync");
              cloudJson = await downloadSaveSlotsFromCloudflare({
                gameName: activeGame.gameName,
                consoleType: activeGame.consoleName,
              });
            } catch (e) {
              console.error("Cloudflare load error, falling back:", e);
            }

            if (!cloudJson && useDrive) {
              const { downloadSaveSlotsFromDrive } = await import("@/lib/driveSaves");
              cloudJson = await downloadSaveSlotsFromDrive({
                userId: user.id,
                gameName: activeGame.gameName,
                consoleType: activeGame.consoleName,
              });
            } else if (!cloudJson) {
              const { data } = await supabase
                .from("leaderboard_scores")
                .select("game_state")
                .eq("user_id", user.id)
                .eq("game_name", activeGame.gameName)
                .eq("console_type", activeGame.consoleName)
                .limit(1)
                .maybeSingle();
              if (data && data.game_state) cloudJson = typeof data.game_state === "string" ? data.game_state : JSON.stringify(data.game_state);
            }

            if (cloudJson) {
              let cloudSlots: SaveSlot[] = JSON.parse(cloudJson);
              const mergedMap = new Map();
              localSlots.forEach((s) => mergedMap.set(s.timestamp, s));
              (cloudSlots || []).forEach((s: any) => mergedMap.set(s.timestamp, s));

              let finalSlots = Array.from(mergedMap.values());
              finalSlots.sort((a, b) => b.timestamp - a.timestamp);
              finalSlots = finalSlots.slice(0, 5);

              setSaveSlots(finalSlots);
              persistSaveSlotsLocally(key, finalSlots);
              return;
            }
          } catch (e) {
            console.error("Error sincronizando nube:", e);
          }
        }
        setSaveSlots(localSlots);
      };

      syncAndLoadSaves();
    } else {
      setSaveSlots([]);
    }
  }, [activeGame?.gameName, activeGame?.consoleName, user]);

  // 🔐 Cache local de segundos jugados hoy en la bóveda (por juego)
  const vaultSecondsRef = useRef<number>(0);
  const vaultLastSyncRef = useRef<number>(0);

  useEffect(() => {
    // Resetea el cache al cambiar de juego y precarga si entramos en modo bóveda
    vaultSecondsRef.current = 0;
    vaultLastSyncRef.current = 0;
    const vaultMode = !!(activeGame as any)?.vaultMode;
    if (vaultMode && user && activeGame) {
      import("@/lib/vaultTracking").then(({ getTodaySeconds }) =>
        getTodaySeconds(user.id, activeGame.gameName).then((s) => { vaultSecondsRef.current = s; })
      );
    }
  }, [activeGame?.gameName, user]);

  useEffect(() => {
    // 🚫 PS2 no acumula puntaje (es solo informativo, no se juega aquí dentro)
    if (activeGame && !minimized && romLoaded && !paused && !isPs2) {
      const vaultMode = !!(activeGame as any).vaultMode;
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        if (now - lastInputRef.current > AFK_TIMEOUT_MS) {
          if (!afkRef.current) {
            afkRef.current = true;
            if (nostalgistRef.current) {
              try {
                nostalgistRef.current.pause();
              } catch {}
              setPaused(true);
            }
          }
          return;
        }
        timeRef.current += 10;

        // 🔐 Triple puntos si está en bóveda y aún no llegó al cap diario (1h)
        const VAULT_CAP = 3600;
        const bonusActive = vaultMode && vaultSecondsRef.current < VAULT_CAP;
        scoreRef.current += bonusActive ? 30 : 10;
        updateScore(scoreRef.current, timeRef.current);

        if (vaultMode && user && activeGame) {
          vaultSecondsRef.current = Math.min(VAULT_CAP, vaultSecondsRef.current + 10);
          // Sincroniza a DB cada 30s para no saturar
          if (now - vaultLastSyncRef.current > 30000) {
            vaultLastSyncRef.current = now;
            import("@/lib/vaultTracking").then(({ bumpVaultSeconds }) =>
              bumpVaultSeconds(user.id, activeGame.gameName, 30).catch(() => {})
            );
          }
        }
      }, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeGame, minimized, romLoaded, paused, updateScore, isPs2, user]);

  useEffect(() => {
    if (!activeGame) {
      setRomLoaded(false);
      setNostalgistInstance(null);
      scoreRef.current = 0;
      timeRef.current = 0;
      return;
    }
    let disposed = false;
    scoreRef.current = activeGame.score || 0;
    timeRef.current = activeGame.playTime || 0;

    const loadEmu = async () => {
      setRomLoaded(false);
      setPaused(false);

      // 🎮 PS2 (Play!.js): se carga dentro de su propio iframe, no necesitamos hacer nada aquí.
      // Marcamos romLoaded=true para que la UI esconda el spinner y muestre el iframe.
      if (isPs2) {
        setRomLoaded(true);
        return;
      }

      await new Promise((r) => setTimeout(r, 200));
      if (disposed) return;
      const el = canvasRef.current;
      const frame = emulatorFrameRef.current;
      if (!el && !frame) return;

      try {
        if (usesEmulatorJs && activeGame.consoleName === "n64" && !window.WebGLRenderingContext) {
          toast({
            title: "Error Fatal",
            description: "Tu navegador no soporta WebGL, necesario para Nintendo 64.",
            variant: "destructive",
          });
          return;
        }

        let romSrc: any = activeGame.romUrl;
        let romFileName = activeGame.gameName;

        // 🔥 CONVERSIÓN DE FILE LOCAL A UINT8ARRAY (Evita desincronización de Blob) 🔥
        if (typeof romSrc === "string" && romSrc.startsWith("local:")) {
          const fileId = romSrc.replace("local:", "");
          const localFile = (window as any).__localRoms?.[fileId];

          if (localFile instanceof File) {
            console.log("🎮 CARGANDO ROM LOCAL:", localFile.name, "TAMAÑO:", localFile.size);
            romFileName = localFile.name;
            if (usesEmulatorJs) {
              romSrc = URL.createObjectURL(localFile);
              emulatorObjectUrlsRef.current.push(romSrc);
            } else {
              const buffer = await localFile.arrayBuffer();
              romSrc = {
                fileName: localFile.name,
                fileContent: new Uint8Array(buffer),
              };
            }
          }
        } else if (typeof romSrc === "string" && romSrc.startsWith("blob:")) {
          const localMap = (window as any).__uploadedFiles;
          if (localMap && localMap[activeGame.gameName]) {
            const f = localMap[activeGame.gameName];
            if (f instanceof File) {
              console.log("🎮 CARGANDO ROM BLOB:", f.name, "TAMAÑO:", f.size);
              romFileName = f.name;
              if (!usesEmulatorJs) {
                romSrc = {
                  fileName: f.name,
                  fileContent: new Uint8Array(await f.arrayBuffer()),
                };
              }
            }
          }
        } else if (typeof romSrc === "string" && romSrc.startsWith("/")) {
          romSrc = window.location.origin + romSrc;
        }

        if (usesEmulatorJs) {
          if (!frame) return;
          let biosUrl = "";
          if (activeGame.consoleName === "ps1") {
            try {
              const biosCheck = await fetch("/bios/scph1001.bin", { method: "HEAD" });
              if (biosCheck.ok) biosUrl = `${window.location.origin}/bios/scph1001.bin`;
            } catch {}
          }

          const emuCore = getEmulatorJsCore(activeGame.consoleName);
          const romForFrame = String(romSrc);
          const safeRomFileName = romFileName || activeGame.gameName || "Game";
          const isPspEmulatorJs = activeGame.consoleName === "psp";
          const isN64EmulatorJs = activeGame.consoleName === "n64";
          const isUncompressedN64Rom = /\.(z64|n64|v64)(?:[?#].*)?$/i.test(romForFrame)
            || /\.(z64|n64|v64)$/i.test(safeRomFileName);
          const emulatorCacheLimit = isN64EmulatorJs ? 512 : isPspEmulatorJs ? 64 : undefined;
          const emulatorCacheConfig = isN64EmulatorJs
            ? { enabled: true, maxSizeMB: 512, maxAgeMins: 43200 }
            : isPspEmulatorJs
              ? { enabled: false }
              : undefined;
          const emulatorDefaultOptions = isPspEmulatorJs
            ? {
                "save-state-location": "download",
                "save-save-interval": "0",
                rewindEnabled: "disabled",
                fps: "hide",
                vsync: "disabled",
                webgl2Enabled: "enabled",
                ppsspp_cpu_core: "IR JIT",
                ppsspp_fast_memory: "enabled",
                ppsspp_ignore_bad_memory_access: "enabled",
                ppsspp_io_timing_method: "Fast",
                ppsspp_auto_frameskip: "enabled",
                ppsspp_frameskip: "4",
                ppsspp_frameskiptype: "Number of frames",
                ppsspp_frame_duplication: "enabled",
                ppsspp_inflight_frames: "Up to 2",
                ppsspp_internal_resolution: "480x272",
                ppsspp_mulitsample_level: "Disabled",
                ppsspp_texture_scaling_level: "disabled",
                ppsspp_texture_anisotropic_filtering: "disabled",
                ppsspp_texture_filtering: "Auto",
                ppsspp_gpu_hardware_transform: "enabled",
                ppsspp_vertex_cache: "enabled",
                ppsspp_lazy_texture_caching: "enabled",
                ppsspp_software_skinning: "enabled",
                ppsspp_skip_buffer_effects: "enabled",
                ppsspp_skip_gpu_readbacks: "enabled",
                ppsspp_lower_resolution_for_effects: "Aggressive",
                ppsspp_spline_quality: "Low",
                ppsspp_sound_speedhack: "enabled",
              }
            : usesRealCloudSaves
              ? {
                  "save-state-location": "browser",
                  "save-save-interval": "30",
                  rewindEnabled: "disabled",
                  fps: "hide",
                  vsync: "enabled",
                  webgl2Enabled: "enabled",
                }
              : undefined;
          const dontExtractRom = isPspEmulatorJs || (isN64EmulatorJs && isUncompressedN64Rom);
          const disableDatabases = !(isPspEmulatorJs || isN64EmulatorJs);
          const emulatorDataPath =
            activeGame.consoleName === "psp"
              ? `${window.location.origin}/emulatorjs-data/`
              : "https://cdn.emulatorjs.org/stable/data/";
          const emulatorLoaderSrc = `${emulatorDataPath}loader.js`;
          let initialRealSaveBase64 = "";
          if (usesRealCloudSaves && user) {
            try {
              const { downloadGameRealSaveFromCloudflare } = await import("@/lib/cloudSaveSync");
              const cloudRealSave = await downloadGameRealSaveFromCloudflare({
                gameName: activeGame.gameName,
                consoleType: activeGame.consoleName,
              });
              if (cloudRealSave?.data) {
                initialRealSaveBase64 = cloudRealSave.data;
                lastRealSaveHashRef.current = cloudRealSave.hash || null;
              }
            } catch (error) {
              console.error("Real save cloud load error:", error);
            }
          }
          // Mantiene los controles nativos de EmulatorJS en su posición original.
          // Solo limpiamos overlays basura y hacemos que el canvas quepa en pantalla.
          const ejsCss = `
html,body,#game{margin:0;width:100%;height:100%;background:#000;overflow:hidden;touch-action:none}
#game{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important}
#game canvas,.ejs_canvas_parent,div[class*="canvas_parent"]{max-width:100%!important;max-height:100%!important;width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;background:#000!important}
.ejs_drop_zone,.ejs_dropzone,.ejs_status,.ejs_message,.ejs_notification,
.ejs_loading_text,.ejs_cheat_menu,.ejs_popup_box,
div[class*="drop"],div[class*="Drop"],div[class*="drag"],div[class*="Drag"]{
  display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;
}
/* Ocultar SIEMPRE botones peligrosos del menú nativo (varias variantes EJS).
   Incluye: Context Menu, Save State, Load State, Quick Save/Load, Screenshot a disco. */
.ejs_menu_button[title*="Context" i],
.ejs_menu_button[aria-label*="Context" i],
button[title*="Context" i],
button[aria-label*="Context" i],
.ejs_menu_button[title*="Save State" i],
.ejs_menu_button[aria-label*="Save State" i],
.ejs_menu_button[title*="Load State" i],
.ejs_menu_button[aria-label*="Load State" i],
.ejs_menu_button[title*="Quick Save" i],
.ejs_menu_button[title*="Quick Load" i],
.ejs_menu_button[title*="Guardar" i],
.ejs_menu_button[title*="Cargar estado" i],
.ejs_menu_button[aria-label*="Guardar" i],
.ejs_menu_button[aria-label*="Cargar estado" i],
button[title*="Save State" i],
button[title*="Load State" i],
button[aria-label*="Save State" i],
button[aria-label*="Load State" i],
.ejs_context_menu_button,
.ejs_contextmenu_button,
.ejs_save_state_button,
.ejs_load_state_button,
.ejs_quick_save_button,
.ejs_quick_load_button{display:none!important;visibility:hidden!important;width:0!important;pointer-events:none!important;}
/* Ocultar la barra de menú inferior nativa por defecto.
   Se vuelve visible añadiendo la clase .forbiddens-show-menu en <html>.
   Forzamos visibilidad con máxima prioridad para anular el auto-hide
   por inactividad de EmulatorJS (que aplica style="display:none" inline). */
.ejs_menu_bar,div[class*="menu_bar" i]{display:none!important;}
html.forbiddens-show-menu .ejs_menu_bar,
html.forbiddens-show-menu div[class*="menu_bar" i]{
  display:flex!important;
  visibility:visible!important;
  opacity:1!important;
  pointer-events:auto!important;
  transform:none!important;
  bottom:0!important;
}
/* Reforzar: botones peligrosos siguen ocultos incluso cuando la barra está visible */
html.forbiddens-show-menu .ejs_menu_button[title*="Context" i],
html.forbiddens-show-menu .ejs_menu_button[aria-label*="Context" i],
html.forbiddens-show-menu button[title*="Context" i],
html.forbiddens-show-menu button[aria-label*="Context" i],
html.forbiddens-show-menu .ejs_menu_button[title*="Save State" i],
html.forbiddens-show-menu .ejs_menu_button[title*="Load State" i],
html.forbiddens-show-menu .ejs_menu_button[title*="Quick" i],
html.forbiddens-show-menu .ejs_menu_button[title*="Guardar" i],
html.forbiddens-show-menu .ejs_menu_button[title*="Cargar estado" i]{display:none!important;}
@media (orientation: landscape) and (max-height: 500px){
  #game canvas,.ejs_canvas_parent,div[class*="canvas_parent"]{height:100%!important;max-height:100%!important;width:100%!important;max-width:100%!important;object-fit:contain!important}
}
body.nds #game{padding:6px 0 12px!important}
body.nds #game canvas,
body.nds .ejs_canvas_parent,
body.nds div[class*="canvas_parent"]{
  height:calc(100% - 18px)!important;
  max-height:calc(100% - 18px)!important;
  width:100%!important;
  max-width:100%!important;
  object-fit:contain!important;
  object-position:center center!important;
}
`;
          const html = `<!doctype html><html><head><meta charset="utf-8" /><style>${ejsCss}</style></head><body class="${activeGame.consoleName === "ds" ? "nds" : ""}"><div id="game"></div><script>
(function(){
  // Bloquea drag&drop nativo (evita el overlay "Suelta el estado guardado aquí")
  ['dragenter','dragover','dragleave','drop'].forEach(function(ev){
    window.addEventListener(ev, function(e){ e.preventDefault(); e.stopPropagation(); }, true);
    document.addEventListener(ev, function(e){ e.preventDefault(); e.stopPropagation(); }, true);
  });
  // Elimina SOLO nodos basura por texto ("undefined", "Suelta el estado guardado aquí")
  // SEGURO: nunca remueve elementos que contengan canvas/iframe (no rompe el render del juego)
  function nuke(){
    try{
      // 1) Drop zones por clase (seguro)
      var zones = document.querySelectorAll('.ejs_drop_zone,.ejs_dropzone,div[class*="dropzone" i]');
      for (var z=0; z<zones.length; z++){
        var zn = zones[z];
        if (zn.querySelector && zn.querySelector('canvas,iframe')) continue;
        if (zn.parentNode) zn.parentNode.removeChild(zn);
      }
      // 2) SOLO nodos hoja con texto EXACTAMENTE "undefined" o que empiecen con "suelta"
      var leaves = document.body.querySelectorAll('span,p,h1,h2,h3,h4,h5,h6,label');
      for (var i=0;i<leaves.length;i++){
        var el = leaves[i];
        if (el.children && el.children.length > 0) continue; // solo hojas
        var t = (el.textContent||'').trim().toLowerCase();
        if (!t) continue;
        if (t === 'undefined' || t.indexOf('suelta')===0 || (t.indexOf('drop')!==-1 && t.indexOf('save')!==-1)){
          if (el.parentNode) el.parentNode.removeChild(el);
        }
      }
    }catch(_){}
  }
  var style = document.createElement('style');
  style.textContent = '[data-forbiddens-removed],.forbiddens-removed{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}';
  document.head.appendChild(style);
  setInterval(nuke, 800);
  new MutationObserver(nuke).observe(document.documentElement, {childList:true, subtree:true});

  // Mantener la barra de menú nativa visible cuando el usuario la activó.
  // EmulatorJS la auto-oculta tras inactividad con style.display='none' inline.
  function keepMenuVisible(){
    try{
      if (!document.documentElement.classList.contains('forbiddens-show-menu')) return;
      var bars = document.querySelectorAll('.ejs_menu_bar,div[class*="menu_bar" i]');
      for (var i=0;i<bars.length;i++){
        var b = bars[i];
        if (b.style){
          if (b.style.display === 'none') b.style.display = '';
          b.style.opacity=''; b.style.visibility=''; b.style.pointerEvents='';
        }
        b.removeAttribute && b.removeAttribute('hidden');
      }
    }catch(_){}
  }
  setInterval(keepMenuVisible, 250);
  new MutationObserver(keepMenuVisible).observe(document.documentElement,{attributes:true,childList:true,subtree:true,attributeFilter:['style','class','hidden']});

  // 🛡️ Bloquear menú contextual del navegador (click derecho / long-press)
  // dentro del iframe del emulador para evitar acceso a "Save State to disk".
  window.addEventListener('contextmenu', function(e){ e.preventDefault(); e.stopPropagation(); }, true);
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); e.stopPropagation(); }, true);

  // 🛡️ Eliminar del DOM cualquier botón peligroso del menú nativo que se cuele.
  // (Doble red: además del CSS, los quitamos por completo del árbol.)
  function purgeDangerousButtons(){
    try{
      var sel = [
        '[title*="Context" i]','[aria-label*="Context" i]',
        '[title*="Save State" i]','[aria-label*="Save State" i]',
        '[title*="Load State" i]','[aria-label*="Load State" i]',
        '[title*="Quick Save" i]','[title*="Quick Load" i]',
        '[title*="Guardar estado" i]','[title*="Cargar estado" i]',
        '.ejs_save_state_button','.ejs_load_state_button',
        '.ejs_quick_save_button','.ejs_quick_load_button',
        '.ejs_context_menu_button','.ejs_contextmenu_button'
      ].join(',');
      var nodes = document.querySelectorAll(sel);
      for (var i=0; i<nodes.length; i++){
        var n = nodes[i];
        // Sólo dentro de la barra de menú nativa
        if (n.closest && n.closest('.ejs_menu_bar,div[class*="menu_bar" i]')){
          n.style.display = 'none';
          n.style.pointerEvents = 'none';
          n.setAttribute('aria-hidden','true');
          n.tabIndex = -1;
        }
      }
    }catch(_){}
  }
  setInterval(purgeDangerousButtons, 500);
  new MutationObserver(purgeDangerousButtons).observe(document.documentElement,{childList:true,subtree:true});


  // 🎮 PUENTE DE GAMEPAD PADRE → IFRAME
  // Los iframes con srcdoc (origin "null") no reciben Gamepad API en muchos navegadores
  // (sobre todo móvil/Bluetooth). El padre nos manda el estado por postMessage y aquí
  // lo inyectamos directo al core de EmulatorJS con simulateInput().
  // Mapeo Standard Gamepad → RetroPad (orden de EJS_emulator.gameManager):
  // 0:B  1:Y  2:Select 3:Start 4:Up 5:Down 6:Left 7:Right
  // 8:A  9:X  10:L  11:R  12:L2 13:R2 14:L3 15:R3
  var BTN_MAP = {
    0: 8,   // A (cross)        → RetroPad A
    1: 0,   // B (circle)       → RetroPad B
    2: 1,   // X (square)       → RetroPad Y
    3: 9,   // Y (triangle)     → RetroPad X
    4: 10,  // L1               → L
    5: 11,  // R1               → R
    6: 12,  // L2               → L2
    7: 13,  // R2               → R2
    8: 2,   // Select/Back      → Select
    9: 3,   // Start            → Start
    10: 14, // L3
    11: 15, // R3
    12: 4,  // D-Up             → Up
    13: 5,  // D-Down           → Down
    14: 6,  // D-Left           → Left
    15: 7   // D-Right          → Right
  };
  var lastBtns = {};
  var lastDpadFromAxis = {up:false,down:false,left:false,right:false};
  function applyState(state){
    try{
      var gm = window.EJS_emulator && window.EJS_emulator.gameManager;
      if (!gm || typeof gm.simulateInput !== 'function') return;
      var player = 0;
      // Botones
      var btns = state.buttons || [];
      for (var i=0; i<btns.length; i++){
        var pressed = !!btns[i];
        if (lastBtns[i] === pressed) continue;
        lastBtns[i] = pressed;
        var retro = BTN_MAP[i];
        if (retro === undefined) continue;
        try { gm.simulateInput(player, retro, pressed ? 1 : 0); } catch(_){}
      }
      // Stick izquierdo → D-Pad si pasa el umbral (ayuda en mandos sin D-Pad real)
      var ax = state.axes || [];
      var x = ax[0]||0, y = ax[1]||0;
      var TH = 0.5;
      var nowDpad = {
        left:  x < -TH,
        right: x >  TH,
        up:    y < -TH,
        down:  y >  TH
      };
      var dirs = ['up','down','left','right'];
      var dirRetro = {up:4,down:5,left:6,right:7};
      for (var d=0; d<dirs.length; d++){
        var k = dirs[d];
        if (nowDpad[k] !== lastDpadFromAxis[k]){
          try { gm.simulateInput(player, dirRetro[k], nowDpad[k] ? 1 : 0); } catch(_){}
          lastDpadFromAxis[k] = nowDpad[k];
        }
      }
    }catch(_){}
  }
  window.addEventListener('message', function(ev){
    var d = ev.data;
    if (!d || d.type !== 'forbiddens-gamepad') return;
    applyState(d.state || {});
  });
  // Avisar al padre que el bridge está listo
  parent.postMessage({type:'forbiddens-gamepad-ready'}, '*');
})();
window.EJS_player="#game";
window.EJS_core=${JSON.stringify(emuCore)};
window.EJS_gameUrl=${JSON.stringify(romForFrame)};
window.EJS_gameName=${JSON.stringify(safeRomFileName)};
window.EJS_biosUrl=${JSON.stringify(biosUrl)};
window.EJS_pathtodata=${JSON.stringify(emulatorDataPath)};
window.EJS_startOnLoaded=true;
window.EJS_threads=${typeof window!=="undefined" && (window as any).crossOriginIsolated && isPspEmulatorJs ? "true" : "false"};
window.EJS_language="es-ES";
window.EJS_volume=${JSON.stringify(volumeRef.current)};
window.EJS_CacheLimit=${JSON.stringify(emulatorCacheLimit)};
window.EJS_cacheConfig=${JSON.stringify(emulatorCacheConfig)};
window.EJS_disableLocalStorage=${isPspEmulatorJs ? "true" : "false"};
window.EJS_fixedSaveInterval=${isPspEmulatorJs ? "0" : "undefined"};
window.EJS_defaultOptions=${JSON.stringify(emulatorDefaultOptions)};
window.EJS_dontExtractRom=${dontExtractRom ? "true" : "false"};
window.EJS_disableDatabases=${disableDatabases ? "true" : "false"};
window.__FORBIDDENS_INITIAL_REAL_SAVE=${JSON.stringify(initialRealSaveBase64)};
function __forbiddensBytesFromBase64(value){
  var binary = atob(value || "");
  var bytes = new Uint8Array(binary.length);
  for (var i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
function __forbiddensCloneBytes(value){
  if (!value) return null;
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  if (Array.isArray(value)) return new Uint8Array(value);
  return null;
}
function __forbiddensGetSavePath(gm){
  try { if (gm && typeof gm.getSaveFilePath === "function") return gm.getSaveFilePath(); } catch(_){}
  try { if (gm && gm.functions && typeof gm.functions.getSaveFilePath === "function") return gm.functions.getSaveFilePath(); } catch(_){}
  return "";
}
function __forbiddensApplyInitialRealSave(){
  try{
    var encoded = window.__FORBIDDENS_INITIAL_REAL_SAVE;
    if (!encoded) return;
    var ejs = window.EJS_emulator;
    var gm = ejs && ejs.gameManager;
    if (!gm) return setTimeout(__forbiddensApplyInitialRealSave, 300);
    var bytes = __forbiddensBytesFromBase64(encoded);
    if (!bytes || !bytes.length) return;
    var fs = gm.FS || window.FS;
    var savePath = __forbiddensGetSavePath(gm);
    var wrote = false;
    var paths = [];
    if (savePath) paths.push(savePath);
    paths.push("/data/saves/" + (window.EJS_gameName || "game") + ".srm");
    paths.push("/data/saves/" + (window.EJS_gameName || "game") + ".sav");
    paths.push("/home/web_user/retroarch/userdata/saves/" + (window.EJS_gameName || "game") + ".srm");
    for (var p=0; p<paths.length && !wrote; p++){
      try {
        if (fs && typeof fs.writeFile === "function") {
          fs.writeFile(paths[p], bytes);
          wrote = true;
        } else if (gm && typeof gm.writeFile === "function") {
          gm.writeFile(paths[p], bytes);
          wrote = true;
        }
      } catch(_){}
    }
    if (wrote) {
      try { if (typeof gm.loadSaveFiles === "function") gm.loadSaveFiles(); } catch(_){}
      try { if (gm.functions && typeof gm.functions.loadSaveFiles === "function") gm.functions.loadSaveFiles(); } catch(_){}
      try { ejs.play && ejs.play(); } catch(_){}
    }
  }catch(err){
    console.warn("FORBIDDENS real save restore failed", err);
  }
}
window.EJS_onSaveUpdate=${usesRealCloudSaves ? `function(payload){
  try{
    var save = payload && payload.save;
    var bytes = __forbiddensCloneBytes(save);
    if (!bytes || !bytes.length) return;
    parent.postMessage({
      type:"forbiddens-real-save-update",
      gameName:${JSON.stringify(activeGame.gameName)},
      consoleType:${JSON.stringify(activeGame.consoleName)},
      hash:(payload && payload.hash) || null,
      save:bytes
    },"*",[bytes.buffer]);
  }catch(err){ console.warn("FORBIDDENS real save post failed", err); }
}` : "undefined"};
window.EJS_onGameStart=function(){
  setTimeout(__forbiddensApplyInitialRealSave, 500);
  parent.postMessage({type:"forbiddens-emulator-started"},"*");
};
</script><script src=${JSON.stringify(emulatorLoaderSrc)}></script></body></html>`;

          const onMessage = (event: MessageEvent) => {
            if (disposed) return;
            if (event.data?.type !== "forbiddens-emulator-started") return;
            setRomLoaded(true);
            lastInputRef.current = Date.now();
            window.removeEventListener("message", onMessage);
          };
          const onRealSaveMessage = (event: MessageEvent) => {
            if (disposed) return;
            const data = event.data;
            if (!data || data.type !== "forbiddens-real-save-update") return;
            if (data.gameName !== activeGame.gameName || data.consoleType !== activeGame.consoleName) return;
            const bytes = normalizeRealSaveBytes(data.save);
            if (!bytes || !bytes.byteLength) return;
            scheduleRealSaveUpload(bytes, data.hash || null);
          };
          window.addEventListener("message", onMessage);
          if (usesRealCloudSaves) {
            window.addEventListener("message", onRealSaveMessage);
          }
          // `srcdoc` puede quedar inestable en algunos móviles/tablets con
          // Gamepad + blobs. Escribimos sobre about:blank para heredar origen
          // del padre y permitir que EmulatorJS cargue ROMs/CDN de forma normal.
          frame.srcdoc = "";
          frame.src = "about:blank";
          try {
            const doc = frame.contentDocument;
            if (!doc) throw new Error("Iframe document no disponible");
            doc.open();
            doc.write(html);
            doc.close();
          } catch {
            frame.srcdoc = html;
          }

          const emulatorJsInstance = {
            pause: () => (frame.contentWindow as any)?.EJS_emulator?.pause?.(),
            resume: () => (frame.contentWindow as any)?.EJS_emulator?.play?.(),
            exit: () => {
              window.removeEventListener("message", onMessage);
              window.removeEventListener("message", onRealSaveMessage);
              frame.srcdoc = "";
              frame.src = "about:blank";
              revokeEmulatorObjectUrls();
            },
            flushRealSave: async () => {
              const ejs = (frame.contentWindow as any)?.EJS_emulator;
              const gm = ejs?.gameManager;
              if (!gm) return;
              try { if (typeof gm.saveSaveFiles === "function") gm.saveSaveFiles(); } catch {}
              try { if (gm.functions && typeof gm.functions.saveSaveFiles === "function") gm.functions.saveSaveFiles(); } catch {}
              await new Promise((r) => setTimeout(r, 250));
            },
            saveState: async () => {
              const ejs = (frame.contentWindow as any)?.EJS_emulator;
              if (!ejs) throw new Error("Emulador no listo");
              const gm = ejs.gameManager;

              // 1) API directa de EJS_emulator (versiones recientes)
              if (typeof ejs.getState === "function") {
                let st: any = ejs.getState();
                if (st && typeof st.then === "function") st = await st;
                if (st && (st.byteLength > 0 || st.size > 0 || st.length > 0)) {
                  return { state: st instanceof Blob ? st : new Blob([st]) };
                }
              }

              // 2) gameManager.getState() — puede ser sync o async
              if (gm && typeof gm.getState === "function") {
                let state: any = gm.getState();
                if (state && typeof state.then === "function") state = await state;
                if (state && (state.byteLength > 0 || state.length > 0 || state.size > 0)) {
                  return { state: state instanceof Blob ? state : new Blob([state]) };
                }
              }

              // 3) Fallback: quickSave + leer del FS virtual
              if (gm && typeof gm.quickSave === "function") {
                try {
                  gm.quickSave("/save.state");
                } catch {}
                await new Promise((r) => setTimeout(r, 300));
                try {
                  const FS = gm.FS || (frame.contentWindow as any).FS;
                  if (FS) {
                    const data = FS.readFile("/save.state");
                    if (data && data.length > 0) return { state: new Blob([data]) };
                  }
                } catch {}
              }

              throw new Error("Guardado no disponible para este core");
            },
            loadState: async (blob: Blob) => {
              const ejs = (frame.contentWindow as any)?.EJS_emulator;
              if (!ejs) throw new Error("Emulador no listo");
              const gm = ejs.gameManager;
              const bytes = new Uint8Array(await blob.arrayBuffer());

              let loaded = false;

              // 1) PREFERIDO: gameManager.loadState(uint8array) — síncrono y fiable
              if (gm && typeof gm.loadState === "function") {
                try { gm.loadState(bytes); loaded = true; } catch {}
                if (!loaded) {
                  try { gm.loadState("/save.state", bytes); loaded = true; } catch {}
                }
              }

              // 2) Fallback: escribir al FS y quickLoad
              if (!loaded && gm && typeof gm.quickLoad === "function") {
                try {
                  const FS = gm.FS || (frame.contentWindow as any).FS;
                  if (FS) FS.writeFile("/save.state", bytes);
                  gm.quickLoad("/save.state");
                  loaded = true;
                } catch {}
              }

              // 3) Último recurso: API directa (puede abrir un picker en algunas versiones)
              if (!loaded && typeof ejs.loadState === "function") {
                try {
                  const r = ejs.loadState(bytes);
                  if (r && typeof r.then === "function") {
                    await Promise.race([r, new Promise((res) => setTimeout(res, 1500))]);
                  }
                  loaded = true;
                } catch {}
              }

              if (!loaded) throw new Error("Carga no disponible");

              // 🔥 Forzar reanudar tras cargar (algunos cores quedan pausados)
              try { ejs.play?.(); } catch {}
              try { ejs.elements?.menu?.classList?.add("hidden"); } catch {}
              try {
                const cv = frame.contentDocument?.querySelector("canvas") as HTMLCanvasElement | null;
                cv?.focus();
              } catch {}
            },
            openMenu: () => (frame.contentWindow as any)?.EJS_emulator?.menu?.open?.(),
          };

          if (disposed) {
            emulatorJsInstance.exit();
            return;
          }
          nostalgistRef.current = emulatorJsInstance;
          setNostalgistInstance(emulatorJsInstance);
          setTimeout(() => {
            if (!romLoaded && (frame.contentWindow as any)?.EJS_emulator) setRomLoaded(true);
            window.removeEventListener("message", onMessage);
          }, 5000);
          return;
        }

        if (!el) return;

        const { Nostalgist } = await import("nostalgist");

        // 🛠️ SELECCIÓN DEL CORE POR CONSOLA
        // Mapeo a cores libretro que SÍ están publicados en el CDN actual de Nostalgist
        let coreToUse = activeGame.consoleCore;
        const coreFallbacks: string[] = [];

        if (activeGame.consoleName === "n64") {
          coreToUse = "mupen64plus_next";
          coreFallbacks.push("parallel_n64");
        } else if (activeGame.consoleName === "ps1") {
          coreToUse = "pcsx_rearmed";
          coreFallbacks.push("mednafen_psx_hw");
        } else if (activeGame.consoleName === "arcade") {
          coreToUse = "fbneo";
          coreFallbacks.push("mame2003_plus");
        }

        // 🔥 IMPORTANTE: NO sobrescribir resolveCoreJs/resolveCoreWasm.
        // Nostalgist v0.21+ ya apunta al CDN correcto por defecto (jsdelivr/@retroarch-cores).
        // Forzar URLs viejas causaba 404 en TODOS los cores.
        const launchOptions: any = {
          core: coreToUse,
          rom: romSrc,
          element: el as HTMLCanvasElement,
          style: { width: "100%", height: "100%", backgroundColor: "black" },
        };

        // 💾 BIOS DE PS1 (opcional: solo si el archivo existe en /public/bios/)
        if (activeGame.consoleName === "ps1") {
          try {
            const biosCheck = await fetch("/bios/scph1001.bin", { method: "HEAD" });
            if (biosCheck.ok) {
              launchOptions.bios = ["/bios/scph1001.bin"];
            } else {
              console.warn("⚠️ BIOS de PS1 no encontrado en /bios/scph1001.bin. Algunos juegos pueden no arrancar.");
            }
          } catch {
            console.warn("⚠️ No se pudo verificar el BIOS de PS1.");
          }
        } else if (activeGame.consoleName === "n64") {
          launchOptions.resolution = { width: 640, height: 480 };
        }

        console.log("🚀 LANZANDO NOSTALGIST CON LAS SIGUIENTES OPCIONES:", launchOptions);

        let instance;
        let lastErr: any = null;
        const coresToTry = [coreToUse, ...coreFallbacks];

        for (const candidateCore of coresToTry) {
          try {
            launchOptions.core = candidateCore;
            console.log(`🎯 Intentando core: ${candidateCore}`);
            instance = await Nostalgist.launch(launchOptions);
            lastErr = null;
            break;
          } catch (err) {
            console.warn(`⚠️ Core ${candidateCore} falló:`, err);
            lastErr = err;
          }
        }

        if (!instance) throw lastErr || new Error("No se pudo cargar ningún core compatible");

        if (disposed) {
          try { instance.exit(); } catch {}
          return;
        }
        nostalgistRef.current = instance;
        setNostalgistInstance(instance);
        // 🛠️ Restaurar configuración interna del emulador (controles, etc.)
        try {
          const { restoreEmulatorConfig, ensureSpanishLanguage } = await import("@/lib/nostalgistPersist");
          restoreEmulatorConfig(instance, activeGame.consoleName);
          ensureSpanishLanguage(instance);
        } catch {}
        setRomLoaded(true);
        lastInputRef.current = Date.now();
        scheduleCanvasSurfaceSync();

        setTimeout(() => {
          if (canvasRef.current) canvasRef.current.focus();
        }, 500);
      } catch (err: any) {
        console.error("Emulator error:", err);
        toast({
          title: "Error al cargar",
          description: "Revisa la consola. Si es N64, puede ser incompatibilidad web.",
          variant: "destructive",
        });
      }
    };
    loadEmu();

    return () => {
      disposed = true;
      if (nostalgistRef.current) {
        try {
          import("@/lib/nostalgistPersist").then(m => m.saveEmulatorConfig(nostalgistRef.current, activeGame?.consoleName || "")).catch(() => {});
        } catch {}
        try {
          nostalgistRef.current.exit();
        } catch {}
        nostalgistRef.current = null;
      }
      if (emulatorFrameRef.current) {
        emulatorFrameRef.current.srcdoc = "";
        emulatorFrameRef.current.src = "about:blank";
      }
    };
  }, [
    activeGame?.romUrl,
    activeGame?.consoleName,
    activeGame?.gameName,
    scheduleCanvasSurfaceSync,
    toast,
    usesEmulatorJs,
    usesRealCloudSaves,
    user?.id,
    revokeEmulatorObjectUrls,
  ]);

  useEffect(() => {
    if (!romLoaded || !nostalgistRef.current) return;
    scheduleCanvasSurfaceSync();
    if (!minimized && !paused) {
      try {
        nostalgistRef.current.resume();
      } catch {}
    }
  }, [minimized, paused, romLoaded, scheduleCanvasSurfaceSync, isExpanded]);

  useEffect(() => {
    if (!romLoaded) return;
    const refreshViewport = () => {
      scheduleCanvasSurfaceSync();
      const canvas = canvasRef.current;
      const viewport = canvasViewportRef.current;
      if (!canvas || !viewport) return;

      // 🔥 FIX BLACK SCREEN AL ROTAR: el WebGL backbuffer queda con dimensiones
      // viejas tras una rotación. Solución: pedirle al Module de Emscripten
      // (RetroArch) que reajuste el tamaño del canvas a las nuevas medidas
      // CSS, y disparar un evento "resize" para que el core actualice GL.
      try {
        const rect = usesCustomEmulatorShell
          ? canvas.getBoundingClientRect()
          : viewport.getBoundingClientRect();
        // 📱 En móvil NO tocamos el backbuffer de RetroArch/Nostalgist al rotar:
        // varios cores se van a negro si se cambia canvas.width/height en caliente.
        // Imitamos el proyecto estable: CSS 100% + object-fit contain + resize/focus.
        if (isMobile || usesCustomEmulatorShell) {
          if (usesCustomEmulatorShell) {
            canvas.style.width = "100%";
            canvas.style.height = "100%";
            canvas.style.maxWidth = "100%";
            canvas.style.maxHeight = "100%";
          } else {
            canvas.style.width = "100%";
            canvas.style.height = "100%";
          }
          canvas.style.objectFit = "contain";
          canvas.focus({ preventScroll: true });
          try {
            window.dispatchEvent(new Event("resize"));
          } catch {}
          try {
            emulatorFrameRef.current?.contentWindow?.dispatchEvent(new Event("resize"));
          } catch {}
          if (!minimized && nostalgistRef.current && !paused) {
            try {
              nostalgistRef.current.resume();
            } catch {}
          }
          return;
        }
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.floor(rect.width * dpr));
        const h = Math.max(1, Math.floor(rect.height * dpr));
        const mod: any = nostalgistRef.current?.getEmscriptenModule?.();
        if (mod && typeof mod.setCanvasSize === "function") {
          mod.setCanvasSize(w, h);
        }
        // Siempre forzamos el backbuffer del canvas también (algunos cores
        // no implementan setCanvasSize y solo leen canvas.width/height).
      } catch {}

      try {
        window.dispatchEvent(new Event("resize"));
      } catch {}

      try {
        emulatorFrameRef.current?.contentWindow?.dispatchEvent(new Event("resize"));
      } catch {}

      if (!minimized && nostalgistRef.current && !paused) {
        try {
          nostalgistRef.current.resume();
        } catch {}
      }
    };
    const handleOrientation = () => {
      // Espera a que el navegador termine la rotación (las medidas no son
      // confiables hasta varios frames después).
      setTimeout(refreshViewport, 50);
      setTimeout(refreshViewport, 250);
      setTimeout(refreshViewport, 600);
      setTimeout(refreshViewport, 1000);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshViewport();
    };
    const observer =
      typeof ResizeObserver !== "undefined" && canvasViewportRef.current
        ? new ResizeObserver(() => refreshViewport())
        : null;
    if (observer && canvasViewportRef.current) observer.observe(canvasViewportRef.current);
    window.addEventListener("resize", refreshViewport);
    window.addEventListener("focus", refreshViewport);
    window.addEventListener("orientationchange", handleOrientation);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", refreshViewport);
      window.removeEventListener("focus", refreshViewport);
      window.removeEventListener("orientationchange", handleOrientation);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [minimized, paused, romLoaded, scheduleCanvasSurfaceSync, isMobile, usesCustomEmulatorShell]);

  const togglePause = useCallback(() => {
    if (!nostalgistRef.current || !romLoaded) return;
    try {
      if (paused) nostalgistRef.current.resume();
      else nostalgistRef.current.pause();
      setPaused(!paused);
    } catch {}
  }, [paused, romLoaded]);

  useEffect(() => {
    const wasOpen = snesToolsWasOpenRef.current;

    if (snesToolsOpen && !wasOpen) {
      snesToolsPausedGameRef.current = false;
      if (nostalgistRef.current && romLoaded && !paused) {
        try {
          nostalgistRef.current.pause();
          setPaused(true);
          snesToolsPausedGameRef.current = true;
        } catch {}
      }
    }

    if (!snesToolsOpen && wasOpen) {
      if (snesToolsPausedGameRef.current && nostalgistRef.current && romLoaded) {
        try {
          nostalgistRef.current.resume();
          setPaused(false);
        } catch {}
      }
      snesToolsPausedGameRef.current = false;
    }

    snesToolsWasOpenRef.current = snesToolsOpen;
  }, [paused, romLoaded, snesToolsOpen]);

  useEffect(() => {
    if (!snesToolsOpen) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && snesToolsBubbleRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest(".snes-retro-hit-shape-heart")) return;
      setSnesToolsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSnesToolsOpen(false);
    };

    document.addEventListener("pointerdown", handleOutsidePointerDown, true);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown, true);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [snesToolsOpen]);

  const toggleEmulatorMenu = useCallback(() => {
    // 🎮 EmulatorJS (N64/PS1/Arcade): mostrar/ocultar la barra inferior NATIVA del emulador
    // (la que tiene Save/Load/Cheats/Controls/etc.). NO abrimos directamente Control Settings.
    if (usesEmulatorJs) {
      const win = emulatorFrameRef.current?.contentWindow as any;
      const doc = win?.document;
      if (doc) {
        try {
          doc.documentElement.classList.toggle("forbiddens-show-menu");
        } catch {}
      }
      return;
    }
    // 🕹️ Nostalgist (NES/SNES/GBA/etc): F1 menú nativo
    const canvas = canvasRef.current;
    if (canvas && romLoaded) {
      canvas.dispatchEvent(new KeyboardEvent("keydown", { key: "F1", code: "F1", keyCode: 112, bubbles: true }));
      setTimeout(() => {
        canvas.dispatchEvent(new KeyboardEvent("keyup", { key: "F1", code: "F1", keyCode: 112, bubbles: true }));
      }, 100);
      canvas.focus();
    }
  }, [romLoaded, usesEmulatorJs]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (popupRef.current) {
        try {
          await popupRef.current.requestFullscreen();
          setIsFullscreen(true);
          setExpandedControlsOpen(false);
        } catch (err) {
          console.error("Error attempting to enable fullscreen:", err);
        }
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
        setExpandedControlsOpen(false);
        setForceFloating(true);
        setPosition({ x: 0, y: 0 });
        setPopupSize(getLargeGameWindowSize());
        scheduleCanvasSurfaceSync();

        // 🔥 MAGIA: Liberar la rotación al salir de pantalla completa
        if (screen.orientation && screen.orientation.unlock) {
          try {
            screen.orientation.unlock();
          } catch (err) {}
        }
      }
    }
  };

  const toggleGameOrientation = async () => {
    if (!popupRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await popupRef.current.requestFullscreen();
        setIsFullscreen(true);
      }

      const orientation = (screen as any).orientation;
      const nextOrientation = isLandscape ? "portrait" : "landscape";
      if (orientation?.lock) {
        await orientation.lock(nextOrientation);
      }
    } catch (err) {
      console.warn("No se pudo cambiar la orientacion del juego:", err);
      toast({
        title: "Rotacion no disponible",
        description: "Tu navegador no permitio forzar la orientacion. Gira el dispositivo manualmente dentro del juego.",
      });
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeGame && romLoaded && !minimized && !isFullscreen) {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeGame, romLoaded, minimized, togglePause, isFullscreen]);

  const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  const base64ToBytes = (b64: string): Uint8Array => {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const compressSaveBytes = async (bytes: Uint8Array): Promise<Uint8Array | null> => {
    const Compression = (globalThis as any).CompressionStream;
    if (!Compression) return null;
    const source = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const stream = new Blob([source]).stream().pipeThrough(new Compression("gzip"));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  };

  const decompressSaveBytes = async (bytes: Uint8Array): Promise<Uint8Array | null> => {
    const Decompression = (globalThis as any).DecompressionStream;
    if (!Decompression) return null;
    const source = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const stream = new Blob([source]).stream().pipeThrough(new Decompression("gzip"));
    const buffer = await new Response(stream).arrayBuffer();
    return new Uint8Array(buffer);
  };

  const stateToBase64 = async (state: any): Promise<string> => {
    let bytes: Uint8Array;
    if (state instanceof Blob) {
      bytes = new Uint8Array(await state.arrayBuffer());
    } else if (state instanceof ArrayBuffer) {
      bytes = new Uint8Array(state);
    } else if (ArrayBuffer.isView(state)) {
      bytes = new Uint8Array(state.buffer, state.byteOffset, state.byteLength);
    } else {
      return JSON.stringify(state);
    }

    try {
      const compressed = await compressSaveBytes(bytes);
      if (compressed && compressed.length + SAVE_DATA_GZIP_PREFIX.length < bytes.length * 0.98) {
        return SAVE_DATA_GZIP_PREFIX + bytesToBase64(compressed);
      }
    } catch (error) {
      console.warn("Save compression failed; storing raw state.", error);
    }

    return bytesToBase64(bytes);
  };

  const base64ToBlob = async (value: string): Promise<Blob> => {
    const data = String(value ?? "");
    const compressed = data.startsWith(SAVE_DATA_GZIP_PREFIX);
    const encoded = compressed ? data.slice(SAVE_DATA_GZIP_PREFIX.length) : data;

    try {
      const bytes = base64ToBytes(encoded);
      if (!compressed) {
        const source = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        return new Blob([source]);
      }

      const decompressed = await decompressSaveBytes(bytes);
      if (!decompressed) {
        throw new Error("Este navegador no puede descomprimir saves gzip.");
      }
      const source = decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength);
      return new Blob([source]);
    } catch (error) {
      if (compressed) throw error;
      return new Blob([data]);
    }
  };

  const handleSaveScore = async (silent = false) => {
    if (!user || !activeGame || scoreRef.current <= 0) return;
    const currentScore = scoreRef.current;
    const currentTime = timeRef.current;

    try {
      const { data: existing, error: fetchError } = await supabase
        .from("leaderboard_scores")
        .select("id, score")
        .eq("user_id", user.id)
        .eq("game_name", activeGame.gameName)
        .eq("console_type", activeGame.consoleName)
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing && (existing as any).score >= currentScore) {
        if (!silent)
          toast({
            title: "Puntaje no superado",
            description: `Tu récord actual es ${(existing as any).score}. ¡Sigue jugando!`,
          });
        return;
      }

      if (existing) {
        await supabase
          .from("leaderboard_scores")
          .update({
            score: currentScore,
            play_time_seconds: currentTime,
            display_name: profile?.display_name || "Anónimo",
          } as any)
          .eq("id", (existing as any).id);
        if (!silent)
          toast({ title: "¡Nuevo récord!", description: `${currentScore} puntos en ${activeGame.gameName}` });
      } else {
        await supabase.from("leaderboard_scores").insert({
          user_id: user.id,
          display_name: profile?.display_name || "Anónimo",
          game_name: activeGame.gameName,
          console_type: activeGame.consoleName,
          score: currentScore,
          play_time_seconds: currentTime,
        } as any);
        if (!silent)
          toast({ title: "¡Puntaje guardado!", description: `${currentScore} puntos en ${activeGame.gameName}` });
      }
    } catch (error: any) {
      if (!silent) toast({ title: "Error al guardar puntaje", description: error.message, variant: "destructive" });
    }
  };

  const autoSaveOnClose = async () => {
    if (!nostalgistRef.current || !activeGame) return;
    if (realCloudSaveConsoles.has(activeGame.consoleName)) {
      try {
        await nostalgistRef.current.flushRealSave?.();
      } catch {}
      return;
    }
    // 🚫 N64/PS1/Arcade: NO autoguardar estado al cerrar (el usuario lo gestiona localmente con .state).
    if (["n64", "ps1", "arcade", "psp"].includes(activeGame.consoleName)) return;
    try {
      const result = await nostalgistRef.current.saveState();
      const stateBlob: Blob = result.state;
      const b64 = await stateToBase64(stateBlob);
      const name = `Auto-save ${new Date().toLocaleString()}`;
      const newSlot: SaveSlot = { name, data: b64, timestamp: Date.now() };

      const key = getSaveKey(activeGame.gameName);
      const stored = localStorage.getItem(key);
      let slots: SaveSlot[] = [];
      try {
        slots = stored ? JSON.parse(stored) : [];
      } catch {}

      const updated = [newSlot, ...slots].slice(0, 5);
      persistSaveSlotsLocally(key, updated);
      void syncCloudSaves(updated);
    } catch (e) {
      // 🔥 SILENCIOSO: Arcade y algunos cores no soportan AutoSave. Ignoramos este error para que cierre limpio. 🔥
    }
  };

  const handleSaveState = async () => {
    if (!nostalgistRef.current || !activeGame) return;
    try {
      const result = await nostalgistRef.current.saveState();
      const stateBlob: Blob = result.state;
      const b64 = await stateToBase64(stateBlob);
      const name = slotName.trim() || `Slot ${saveSlots.length + 1}`;
      const newSlot: SaveSlot = { name, data: b64, timestamp: Date.now() };

      const updated = [newSlot, ...saveSlots].slice(0, 5);
      setSaveSlots(updated);
      persistSaveSlotsLocally(getSaveKey(activeGame.gameName), updated);
      await syncCloudSaves(updated);

      toast({ title: "Partida guardada y subida a la nube", description: `"${name}"` });
      setSlotName("");
      setShowSaveDialog(false);

      if (user && scoreRef.current > 0) {
        await handleSaveScore(false);
      }
    } catch (err) {
      toast({
        title: "Guardado no compatible",
        description: "Este emulador no soporta guardado de estado rápido.",
        variant: "destructive",
      });
    }
  };

  const handleLoadState = async (slot: SaveSlot) => {
    if (!nostalgistRef.current) return;
    try {
      const blob = await base64ToBlob(slot.data);
      await nostalgistRef.current.loadState(blob);
      toast({ title: "Partida cargada", description: `"${slot.name}"` });
      setShowLoadDialog(false);
    } catch (err) {
      toast({
        title: "Error al cargar la partida",
        description: "No se pudo restaurar el estado",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSlot = async (index: number) => {
    if (!activeGame) return;
    const updated = saveSlots.filter((_, i) => i !== index);
    setSaveSlots(updated);
    persistSaveSlotsLocally(getSaveKey(activeGame.gameName), updated);
    await syncCloudSaves(updated);
    toast({ title: "Slot eliminado de tu PC y de la Nube" });
  };

  const handleClose = async (idx?: number) => {
    if (nostalgistRef.current && (idx === undefined || idx === currentGameIndex)) {
      try { nostalgistRef.current.pause?.(); } catch {}
    }
    await autoSaveOnClose();
    if (activeGame && scoreRef.current > 0 && user) void handleSaveScore(true);
    if (nostalgistRef.current && (idx === undefined || idx === currentGameIndex)) {
      try {
        const { saveEmulatorConfig } = await import("@/lib/nostalgistPersist");
        saveEmulatorConfig(nostalgistRef.current, activeGame?.consoleName || "");
      } catch {}
      try {
        nostalgistRef.current.exit();
      } catch {}
      nostalgistRef.current = null;
      setNostalgistInstance(null);
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    closeGame(idx);
  };

  const dispatchSnesRetroKey = useCallback((type: "keydown" | "keyup", keyName: SnesRetroButtonKey) => {
    const keyMap = SNES_RETRO_KEY_MAP[keyName];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const event = new KeyboardEvent(type, {
      key: keyMap.key,
      code: keyMap.code,
      keyCode: keyMap.keyCode,
      which: keyMap.keyCode,
      bubbles: true,
      cancelable: true,
    });
    canvas.dispatchEvent(event);
    window.dispatchEvent(event);
    document.dispatchEvent(event);
    canvas.focus({ preventScroll: true });
  }, []);

  const pressSnesRetroKey = useCallback((event: React.PointerEvent<SVGElement>, keyName: SnesRetroButtonKey) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dispatchSnesRetroKey("keydown", keyName);
  }, [dispatchSnesRetroKey]);

  const releaseSnesRetroKey = useCallback((event: React.PointerEvent<SVGElement>, keyName: SnesRetroButtonKey) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dispatchSnesRetroKey("keyup", keyName);
  }, [dispatchSnesRetroKey]);

  const renderSnesRetroKeyRect = (
    label: string,
    keyName: SnesRetroButtonKey,
    x: number,
    y: number,
    width: number,
    height: number,
    rx: number,
    className?: string,
  ) => (
    <rect
      key={keyName}
      role="button"
      tabIndex={0}
      aria-label={label}
      className={cn("snes-retro-hit-shape", className)}
      x={x}
      y={y}
      width={width}
      height={height}
      rx={rx}
      onPointerDown={(event) => pressSnesRetroKey(event, keyName)}
      onPointerUp={(event) => releaseSnesRetroKey(event, keyName)}
      onPointerCancel={(event) => releaseSnesRetroKey(event, keyName)}
      onContextMenu={(event) => event.preventDefault()}
    />
  );

  const renderSnesRetroKeyCircle = (
    label: string,
    keyName: SnesRetroButtonKey,
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    className?: string,
  ) => (
    <ellipse
      key={keyName}
      role="button"
      tabIndex={0}
      aria-label={label}
      className={cn("snes-retro-hit-shape", className)}
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      onPointerDown={(event) => pressSnesRetroKey(event, keyName)}
      onPointerUp={(event) => releaseSnesRetroKey(event, keyName)}
      onPointerCancel={(event) => releaseSnesRetroKey(event, keyName)}
      onContextMenu={(event) => event.preventDefault()}
    />
  );

  const handleSnesRetroActionShape = (
    event: React.PointerEvent<SVGElement>,
    action: () => void,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (isExpanded) return;
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: position.x, startPosY: position.y };
  };

  useEffect(() => {
    if (!dragging || isExpanded) return;
    const onMove = (e: MouseEvent) => {
      setPosition({
        x: dragRef.current.startPosX + (e.clientX - dragRef.current.startX),
        y: dragRef.current.startPosY + (e.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, isExpanded]);

  const onResizeDown = (e: React.MouseEvent) => {
    if (isExpanded) return;
    e.stopPropagation();
    setResizing(true);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: popupSize.w, startH: popupSize.h };
  };

  useEffect(() => {
    if (!resizing || isExpanded) return;
    let rafId: number;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const newW = Math.min(window.innerWidth - 16, Math.max(400, resizeRef.current.startW + (e.clientX - resizeRef.current.startX)));
        const newH = Math.min(window.innerHeight - 16, Math.max(320, resizeRef.current.startH + (e.clientY - resizeRef.current.startY)));
        setPopupSize({ w: newW, h: newH });
      });
    };
    const onUp = () => {
      cancelAnimationFrame(rafId);
      setResizing(false);
      scheduleCanvasSurfaceSync();
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, scheduleCanvasSurfaceSync, isExpanded]);

  const updateRositaLayout = useCallback((updater: (layout: RositaLayout) => RositaLayout) => {
    setRositaLayout((current) => {
      const next = updater(current);
      writeRositaLayout(next, rositaLayoutVariant);
      requestAnimationFrame(() => scheduleCanvasSurfaceSync());
      return next;
    });
  }, [rositaLayoutVariant, scheduleCanvasSurfaceSync]);

  const resetRositaLayout = useCallback(() => {
    const defaults = getDefaultRositaLayout(rositaLayoutVariant);
    setRositaLayout(defaults);
    writeRositaLayout(defaults, rositaLayoutVariant);
    requestAnimationFrame(() => scheduleCanvasSurfaceSync());
  }, [rositaLayoutVariant, scheduleCanvasSurfaceSync]);

  const toggleRositaEditor = useCallback(() => {
    setRositaEditorEnabled((enabled) => {
      const next = !enabled;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("forbiddens:rosita-editor-enabled", next ? "1" : "0");
        window.dispatchEvent(new CustomEvent("forbiddens:rosita-editor-toggle", { detail: next }));
      }
      return next;
    });
  }, []);

  const copyRositaLayout = useCallback(async () => {
    if (typeof window === "undefined") return;
    const layoutText = window.localStorage.getItem(getRositaLayoutStorageKey(rositaLayoutVariant)) || JSON.stringify(rositaLayout);
    try {
      await navigator.clipboard.writeText(layoutText);
      toast({ title: "Layout copiado", description: "Pegamelo y lo dejo fijo para este modo." });
    } catch {
      toast({ title: "No se pudo copiar", description: `Usa localStorage.getItem("${getRositaLayoutStorageKey(rositaLayoutVariant)}") en consola.` });
    }
  }, [rositaLayout, rositaLayoutVariant, toast]);

  const rositaRelativeBox = (box: RositaLayoutBox, parent: RositaLayoutBox) => ({
    x: parent.w ? ((box.x - parent.x) / parent.w) * 100 : 0,
    y: parent.h ? ((box.y - parent.y) / parent.h) * 100 : 0,
    w: parent.w ? (box.w / parent.w) * 100 : 0,
    h: parent.h ? (box.h / parent.h) * 100 : 0,
  });

  const canEditRositaLayout = false;
  const effectiveRositaLayout = rositaLayout;
  const rositaTopbarMin = rositaRelativeBox(effectiveRositaLayout.minButton, effectiveRositaLayout.topbar);
  const rositaTopbarFull = rositaRelativeBox(effectiveRositaLayout.fullButton, effectiveRositaLayout.topbar);
  const rositaTopbarClose = rositaRelativeBox(effectiveRositaLayout.closeButton, effectiveRositaLayout.topbar);
  const rositaSideSave = rositaRelativeBox(effectiveRositaLayout.saveButton, effectiveRositaLayout.side);
  const rositaSideLoad = rositaRelativeBox(effectiveRositaLayout.loadButton, effectiveRositaLayout.side);
  const rositaSideVolume = rositaRelativeBox(effectiveRositaLayout.volumeButton, effectiveRositaLayout.side);
  const rositaSideVolumeSlider = rositaRelativeBox(effectiveRositaLayout.volumeSlider, effectiveRositaLayout.side);
  const rositaSideConfig = rositaRelativeBox(effectiveRositaLayout.configButton, effectiveRositaLayout.side);
  const rositaSidePause = rositaRelativeBox(effectiveRositaLayout.pauseButton, effectiveRositaLayout.side);

  const rositaCssVars = usesRositaNesShell ? ({
    "--rosita-screen-left": `${effectiveRositaLayout.screen.x}%`,
    "--rosita-screen-top": `${effectiveRositaLayout.screen.y}%`,
    "--rosita-screen-right": `${100 - effectiveRositaLayout.screen.x - effectiveRositaLayout.screen.w}%`,
    "--rosita-screen-bottom": `${100 - effectiveRositaLayout.screen.y - effectiveRositaLayout.screen.h}%`,
    "--rosita-topbar-left": `${effectiveRositaLayout.topbar.x}%`,
    "--rosita-topbar-top": `${effectiveRositaLayout.topbar.y}%`,
    "--rosita-topbar-right": `${100 - effectiveRositaLayout.topbar.x - effectiveRositaLayout.topbar.w}%`,
    "--rosita-topbar-height": `${effectiveRositaLayout.topbar.h}%`,
    "--rosita-info-left": isMobile ? "0%" : `${effectiveRositaLayout.info.x}%`,
    "--rosita-info-top": isMobile ? "0%" : `${effectiveRositaLayout.info.y}%`,
    "--rosita-info-width": isMobile ? "100%" : `${effectiveRositaLayout.info.w}%`,
    "--rosita-info-height": isMobile ? "100%" : `${effectiveRositaLayout.info.h}%`,
    "--rosita-actions-right": `${100 - effectiveRositaLayout.actions.x - effectiveRositaLayout.actions.w}%`,
    "--rosita-actions-top": `${effectiveRositaLayout.actions.y}%`,
    "--rosita-actions-width": `${effectiveRositaLayout.actions.w}%`,
    "--rosita-actions-height": `${effectiveRositaLayout.actions.h}%`,
    "--rosita-side-right": `${100 - effectiveRositaLayout.side.x - effectiveRositaLayout.side.w}%`,
    "--rosita-side-top": `${effectiveRositaLayout.side.y}%`,
    "--rosita-side-width": `${effectiveRositaLayout.side.w}%`,
    "--rosita-side-height": `${effectiveRositaLayout.side.h}%`,
    "--rosita-min-x": `${rositaTopbarMin.x}%`,
    "--rosita-min-y": `${rositaTopbarMin.y}%`,
    "--rosita-min-w": `${rositaTopbarMin.w}%`,
    "--rosita-min-h": `${rositaTopbarMin.h}%`,
    "--rosita-full-x": `${rositaTopbarFull.x}%`,
    "--rosita-full-y": `${rositaTopbarFull.y}%`,
    "--rosita-full-w": `${rositaTopbarFull.w}%`,
    "--rosita-full-h": `${rositaTopbarFull.h}%`,
    "--rosita-close-x": `${rositaTopbarClose.x}%`,
    "--rosita-close-y": `${rositaTopbarClose.y}%`,
    "--rosita-close-w": `${rositaTopbarClose.w}%`,
    "--rosita-close-h": `${rositaTopbarClose.h}%`,
    "--rosita-save-x": `${rositaSideSave.x}%`,
    "--rosita-save-y": `${rositaSideSave.y}%`,
    "--rosita-save-w": `${rositaSideSave.w}%`,
    "--rosita-save-h": `${rositaSideSave.h}%`,
    "--rosita-load-x": `${rositaSideLoad.x}%`,
    "--rosita-load-y": `${rositaSideLoad.y}%`,
    "--rosita-load-w": `${rositaSideLoad.w}%`,
    "--rosita-load-h": `${rositaSideLoad.h}%`,
    "--rosita-volume-x": `${rositaSideVolume.x}%`,
    "--rosita-volume-y": `${rositaSideVolume.y}%`,
    "--rosita-volume-w": `${rositaSideVolume.w}%`,
    "--rosita-volume-h": `${rositaSideVolume.h}%`,
    "--rosita-volume-slider-x": `${rositaSideVolumeSlider.x}%`,
    "--rosita-volume-slider-y": `${rositaSideVolumeSlider.y}%`,
    "--rosita-volume-slider-w": `${rositaSideVolumeSlider.w}%`,
    "--rosita-volume-slider-h": `${rositaSideVolumeSlider.h}%`,
    "--rosita-config-x": `${rositaSideConfig.x}%`,
    "--rosita-config-y": `${rositaSideConfig.y}%`,
    "--rosita-config-w": `${rositaSideConfig.w}%`,
    "--rosita-config-h": `${rositaSideConfig.h}%`,
    "--rosita-pause-x": `${rositaSidePause.x}%`,
    "--rosita-pause-y": `${rositaSidePause.y}%`,
    "--rosita-pause-w": `${rositaSidePause.w}%`,
    "--rosita-pause-h": `${rositaSidePause.h}%`,
    "--rosita-song-x": `${effectiveRositaLayout.songToast.x}%`,
    "--rosita-song-y": `${effectiveRositaLayout.songToast.y}%`,
    "--rosita-song-w": `${effectiveRositaLayout.songToast.w}%`,
    "--rosita-song-h": `${effectiveRositaLayout.songToast.h}%`,
    "--rosita-touch-frame-left": `${effectiveRositaLayout.touchFrame.x}%`,
    "--rosita-touch-frame-top": `${effectiveRositaLayout.touchFrame.y}%`,
    "--rosita-touch-frame-width": `${effectiveRositaLayout.touchFrame.w}%`,
    "--rosita-touch-frame-height": `${effectiveRositaLayout.touchFrame.h}%`,
    "--rosita-touch-dpad-left": `${effectiveRositaLayout.touchDpad.x}%`,
    "--rosita-touch-dpad-top": `${effectiveRositaLayout.touchDpad.y}%`,
    "--rosita-touch-dpad-width": `${effectiveRositaLayout.touchDpad.w}%`,
    "--rosita-touch-dpad-height": `${effectiveRositaLayout.touchDpad.h}%`,
    "--rosita-touch-actions-left": `${effectiveRositaLayout.touchActions.x}%`,
    "--rosita-touch-actions-top": `${effectiveRositaLayout.touchActions.y}%`,
    "--rosita-touch-actions-width": `${effectiveRositaLayout.touchActions.w}%`,
    "--rosita-touch-actions-height": `${effectiveRositaLayout.touchActions.h}%`,
    "--rosita-touch-menu-left": `${effectiveRositaLayout.touchMenu.x}%`,
    "--rosita-touch-menu-top": `${effectiveRositaLayout.touchMenu.y}%`,
    "--rosita-touch-menu-width": `${effectiveRositaLayout.touchMenu.w}%`,
    "--rosita-touch-menu-height": `${effectiveRositaLayout.touchMenu.h}%`,
  } as React.CSSProperties) : undefined;

  const startRositaBoxEdit = useCallback((
    key: keyof RositaLayout,
    mode: "move" | "resize",
    event: React.PointerEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const isViewportBox =
      key === "screen" ||
      key === "songToast" ||
      key === "touchFrame" ||
      key === "touchDpad" ||
      key === "touchActions" ||
      key === "touchMenu";
    const rootRect = (isViewportBox ? canvasViewportRef.current : popupRef.current)?.getBoundingClientRect();
    if (!rootRect) return;
    const start = rositaLayout[key];
    const startX = event.clientX;
    const startY = event.clientY;
    const onMove = (moveEvent: PointerEvent) => {
      const dx = ((moveEvent.clientX - startX) / rootRect.width) * 100;
      const dy = ((moveEvent.clientY - startY) / rootRect.height) * 100;
      updateRositaLayout((layout) => {
        const nextBox = mode === "move"
          ? {
              ...start,
              x: clampPercent(start.x + dx, -10, 110 - start.w),
              y: clampPercent(start.y + dy, -10, 110 - start.h),
            }
          : {
              ...start,
              w: clampPercent(start.w + dx, 1, 110 - start.x),
              h: clampPercent(start.h + dy, 1, 110 - start.y),
            };
        return { ...layout, [key]: nextBox };
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      scheduleCanvasSurfaceSync();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [rositaLayout, scheduleCanvasSurfaceSync, updateRositaLayout]);

  const renderRositaEditorBox = (key: keyof RositaLayout, label: string, box: RositaLayoutBox) => (
    <div
      key={key}
      className="absolute z-[120] cursor-move rounded border border-pink-300/90 bg-pink-500/10 text-[9px] font-pixel text-white shadow-[0_0_10px_rgba(236,72,153,0.45)]"
      style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%`, touchAction: "none" }}
      onPointerDown={(event) => startRositaBoxEdit(key, "move", event)}
    >
      <div className="pointer-events-none absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[8px] text-pink-100">
        {label}
      </div>
      <div
        className="absolute bottom-0 right-0 h-3 w-3 cursor-nwse-resize rounded-tl border-l border-t border-pink-200 bg-pink-400"
        style={{ touchAction: "none" }}
        onPointerDown={(event) => startRositaBoxEdit(key, "resize", event)}
      />
    </div>
  );

  if (activeGames.length === 0 || !activeGame) return null;

  const inactiveGames = activeGames.map((game, idx) => ({ game, idx })).filter(({ idx }) => idx !== currentGameIndex);
  const expandedControlsVisible = usesRositaNesShell || expandedControlsOpen;

  // 🔥 CSS DOCKING INTELIGENTE PARA MODO TEATRO O FLOTANTE 🔥
  let popupStyle: React.CSSProperties = {};
  if (!minimized) {
    if (isFullscreen) {
      popupStyle = { width: "100vw", height: "100vh", borderRadius: 0 };
    } else if (usesSnesRetroShell && !usesSnesRetroDesktopShell) {
      popupStyle = {
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 50,
        borderRadius: 0,
      };
    } else if (usesRositaNesShell && isMobile) {
      popupStyle = {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 50,
        borderRadius: 0,
      };
    } else if (isTheaterActive && theaterRect) {
      // 📱 EN MÓVIL/TABLET: el contenedor batocera-target puede quedar fuera de
      // la pantalla por scroll o rotación → forzamos viewport completo para
      // que el juego SIEMPRE se vea, tanto en vertical como horizontal.
      if (isMobile) {
        popupStyle = {
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100dvh",
          zIndex: 50,
          borderRadius: 0,
        };
      } else {
        popupStyle = {
          position: "fixed",
          top: theaterRect.top,
          left: theaterRect.left,
          width: theaterRect.width,
          height: theaterRect.height,
          zIndex: 40,
          borderRadius: "0.75rem",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        };
      }
    } else {
      const shellDesktopSize = usesSnesRetroDesktopShell
        ? getSnesRetroDesktopWindowSize()
        : usesRositaNesShell && !isMobile
          ? getRositaDesktopWindowSize()
          : null;
      popupStyle = {
        transform: shellDesktopSize ? "none" : `translate(${position.x}px, ${position.y}px)`,
        width: `${shellDesktopSize?.w ?? popupSize.w}px`,
        height: `${shellDesktopSize?.h ?? popupSize.h}px`,
        maxWidth: "calc(100vw - 16px)",
        maxHeight: "calc(100dvh - 16px)",
        willChange: dragging || resizing ? "transform, width, height" : "auto",
      };
    }
  }

  const bubbleContent = (
    // 🔥 CLASS "group" AÑADIDO PARA QUE LAS DOS BARRAS APAREZCAN AL MISMO TIEMPO 🔥
    <div
      ref={popupRef}
      onClick={minimized ? () => maximizeGame(currentGameIndex) : undefined}
      className={cn(
        "relative overflow-hidden select-none group",
        usesRositaNesShell && "gamebubble-shell-rosita-nes",
        usesRositaNesShell && (isMobile ? "rosita-shell-mobile" : "rosita-shell-desktop"),
        usesSnesRetroShell && "gamebubble-shell-snes-retro",
        usesSnesRetroPortraitShell && "snes-retro-shell-portrait",
        usesSnesRetroLandscapeShell && "snes-retro-shell-landscape",
        usesSnesRetroDesktopShell && "snes-retro-shell-desktop",
        minimized
          ? "bg-card h-[132px] w-44 rounded-xl shadow-2xl cursor-pointer border border-border"
          : isTheaterActive || isFullscreen
            ? "flex flex-col bg-black shadow-2xl"
            : "flex bg-card rounded-xl shadow-2xl shadow-black/50 border border-border animate-scale-in",
      )}
      style={usesRositaNesShell ? { ...popupStyle, ...rositaCssVars } : popupStyle}
    >
      {canEditRositaLayout && (
        <div className="absolute left-2 bottom-2 z-[130] flex items-center gap-1 rounded-md border border-pink-300/50 bg-black/70 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              toggleRositaEditor();
            }}
            className={cn(
              "rounded px-2 py-1 font-pixel text-[8px] uppercase tracking-wider",
              rositaEditorEnabled
                ? "bg-pink-500/35 text-pink-100"
                : "bg-white/10 text-pink-200 hover:bg-pink-500/25",
            )}
          >
            Editar skin
          </button>
          {rositaEditorEnabled && (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  copyRositaLayout();
                }}
                className="rounded bg-pink-200/20 px-2 py-1 font-pixel text-[8px] uppercase tracking-wider text-pink-100 hover:bg-pink-200/30"
              >
                Copiar layout
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  resetRositaLayout();
                }}
                className="rounded bg-white/10 px-2 py-1 font-pixel text-[8px] uppercase tracking-wider text-white hover:bg-white/20"
              >
                Reset
              </button>
            </>
          )}
        </div>
      )}
      {canEditRositaLayout && rositaEditorEnabled && (
        <div className="pointer-events-none absolute inset-0 z-[119] rosita-editor-grid">
          <div className="pointer-events-auto">
            {renderRositaEditorBox("topbar", "Barra superior", rositaLayout.topbar)}
            {renderRositaEditorBox("actions", "Acciones sup.", rositaLayout.actions)}
            {renderRositaEditorBox("side", "Botones der.", rositaLayout.side)}
            {renderRositaEditorBox("minButton", "Min", rositaLayout.minButton)}
            {renderRositaEditorBox("fullButton", "Full", rositaLayout.fullButton)}
            {renderRositaEditorBox("closeButton", "X", rositaLayout.closeButton)}
            {renderRositaEditorBox("saveButton", "Save", rositaLayout.saveButton)}
            {renderRositaEditorBox("loadButton", "Load", rositaLayout.loadButton)}
            {renderRositaEditorBox("volumeButton", "Vol", rositaLayout.volumeButton)}
            {renderRositaEditorBox("volumeSlider", "Vol barra", rositaLayout.volumeSlider)}
            {renderRositaEditorBox("configButton", "Config", rositaLayout.configButton)}
            {renderRositaEditorBox("pauseButton", "Pause", rositaLayout.pauseButton)}
          </div>
        </div>
      )}
      {isMobile && isExpanded && !minimized && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void toggleGameOrientation();
          }}
          className="game-orientation-toggle absolute left-3 top-3 z-[145] flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white shadow-[0_0_18px_rgba(0,0,0,0.55)] backdrop-blur-md transition-transform active:scale-95"
          aria-label="Voltear juego"
          title="Voltear juego"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      )}
      <div className={cn("relative flex-1 min-w-0 bg-black", minimized ? "h-full w-full" : "flex flex-col")}>
        {!minimized && !usesSnesRetroShell && (
          // 🔥 BARRA SUPERIOR CON "group-hover:opacity-100" Y z-[61] PARA EVITAR SOLAPAMIENTOS 🔥
          <div
            className={cn(
              "flex items-center justify-between px-3 py-2 select-none transition-transform duration-300",
              isExpanded
                ? cn(
                    "absolute top-0 left-0 w-full z-[61] bg-black/85 border-b border-white/10 h-12",
                    usesRositaNesShell && "rosita-window-topbar",
                    expandedControlsVisible ? "translate-y-0" : "-translate-y-full pointer-events-none",
                  )
                : cn("bg-muted/50 border-b border-border cursor-move", usesRositaNesShell && "rosita-window-topbar"),
            )}
            onMouseDown={!isExpanded ? onMouseDown : undefined}
          >
            <div className="flex items-center gap-2">
              {!isExpanded && <Move className="w-3 h-3 text-muted-foreground" />}
              <Gamepad2 className="w-4 h-4 text-neon-green" />
              <div>
                <p className="text-xs font-body font-medium text-foreground">{activeGame.gameName}</p>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-body">
                  <span className="font-pixel text-neon-cyan">{activeGame.consoleName.toUpperCase()}</span>
                  <span className="flex items-center gap-0.5">
                    <Trophy className="w-2.5 h-2.5" /> {activeGame.score || 0}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />{" "}
                    {(() => {
                      const t = activeGame.playTime || 0;
                      const h = Math.floor(t / 3600);
                      const m = Math.floor((t % 3600) / 60);
                      const s = t % 60;
                      const mm = m.toString().padStart(2, "0");
                      const ss = s.toString().padStart(2, "0");
                      return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
                    })()}
                  </span>
                  {afkRef.current && <span className="text-neon-yellow font-pixel animate-pulse">AFK</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!isExpanded && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={minimizeGame}
                  className="h-7 w-7 text-neon-cyan hover:bg-neon-cyan/10"
                  title="Minimizar (Enviar a esquina)"
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>
              )}

              {/* 🔥 BOTÓN DE RESTAURAR OCULTO SI ESTÁS EN MODO TEATRO 🔥 */}
              {isExpanded && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (isFullscreen) document.exitFullscreen().catch(() => {});
                    setForceFloating(true);
                    setPosition({ x: 0, y: 0 });
                    setPopupSize(getLargeGameWindowSize());
                    scheduleCanvasSurfaceSync();
                  }}
                  className="h-7 w-7 text-white hover:bg-white/20"
                  title="Restaurar a Ventana Flotante"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              )}

              {!isFullscreen && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleFullscreen}
                  className="h-7 w-7 text-neon-yellow hover:bg-neon-yellow/10"
                  title="Pantalla Completa Nativa"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              )}

              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleClose()}
                className={cn("h-7 w-7 text-destructive hover:bg-destructive/10", usesRositaNesShell && "rosita-close-button")}
                title="Cerrar Juego"
              >
                {usesRositaNesShell ? (
                  <img
                    src="/emulator-shells/rosita-nes/buttons/cerrar.svg"
                    alt=""
                    className="rosita-close-texture"
                    draggable={false}
                  />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          </div>
        )}

        <div
          ref={canvasViewportRef}
          id="game-bubble-viewport"
          className={cn(
            "relative bg-black overflow-hidden",
            usesRositaNesShell && "gamebubble-shell-viewport",
            usesSnesRetroShell && "snes-retro-shell-viewport",
            minimized ? "h-full w-full" : "flex-1",
            isExpanded &&
              isMobile &&
              "flex items-center justify-center w-full h-full min-h-0 max-w-[100vw] max-h-[100dvh]",
          )}
          style={usesRositaNesShell ? rositaCssVars : undefined}
        >
          {usesRositaNesShell && (
            <div className="rosita-shell-hardware" aria-hidden="true">
              <div className="rosita-shell-title">
                <span>NES EMULATOR</span>
              </div>
              <div className="rosita-shell-speaker rosita-shell-speaker-left" />
              <div className="rosita-shell-speaker rosita-shell-speaker-right" />
              <span className="rosita-shell-bow rosita-shell-bow-top">bow</span>
              <span className="rosita-shell-bow rosita-shell-bow-bottom">bow</span>
              <img className="rosita-shell-deco rosita-shell-deco-left-top" src="/emulator-shells/rosita-nes/decorations/decoracion1.png" alt="" />
              <img className="rosita-shell-deco rosita-shell-deco-left-bottom" src="/emulator-shells/rosita-nes/decorations/decoracion2.png" alt="" />
              <img className="rosita-shell-deco rosita-shell-deco-right-top" src="/emulator-shells/rosita-nes/decorations/decoracion3.png" alt="" />
              <img className="rosita-shell-deco rosita-shell-deco-right-bottom" src="/emulator-shells/rosita-nes/decorations/decoracion4.png" alt="" />
              <img className="rosita-shell-dpad" src="/emulator-shells/rosita-nes/buttons/dpad.svg" alt="" />
              <div className="rosita-shell-action-buttons">
                <img className="rosita-shell-button rosita-shell-button-b" src="/emulator-shells/rosita-nes/buttons/b.svg" alt="" />
                <img className="rosita-shell-button rosita-shell-button-a" src="/emulator-shells/rosita-nes/buttons/a.svg" alt="" />
              </div>
              <div className="rosita-shell-menu-buttons">
                <span>
                  <img src="/emulator-shells/rosita-nes/buttons/select.svg" alt="" />
                  SELECT
                </span>
                <span>
                  <img src="/emulator-shells/rosita-nes/buttons/start.svg" alt="" />
                  START
                </span>
              </div>
            </div>
          )}
          {usesSnesRetroShell && (
            <>
              <div className="snes-retro-shell-hardware" aria-hidden="true">
                <img
                  src={usesSnesRetroLandscapeShell
                    ? "/emulator-shells/snes-retro/horizontal-mobile.svg"
                    : usesSnesRetroDesktopShell
                      ? "/emulator-shells/snes-retro/pc.svg"
                    : isExpanded
                      ? "/emulator-shells/snes-retro/vertical-celular-expanded.svg"
                      : "/emulator-shells/snes-retro/vertical-celular.svg"}
                  alt=""
                  draggable={false}
                />
              </div>
              <div className={cn("snes-retro-info", usesSnesRetroLandscapeShell && "snes-retro-info-landscape")}>
                <span className="snes-retro-title">{activeGame.gameName}</span>
                <span className="snes-retro-meta snes-retro-time">
                  {(() => {
                    const t = activeGame.playTime || 0;
                    const m = Math.floor((t % 3600) / 60);
                    const s = t % 60;
                    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
                  })()}
                </span>
                <span className="snes-retro-meta snes-retro-score">{activeGame.score || 0} pts</span>
                <span className="snes-retro-meta snes-retro-system">SNES</span>
              </div>
            </>
          )}
          {canEditRositaLayout && rositaEditorEnabled && (
            <div className="pointer-events-auto absolute inset-0 z-[119]">
              {renderRositaEditorBox("screen", "Juego", rositaLayout.screen)}
              {renderRositaEditorBox("touchDpad", "Cruceta", rositaLayout.touchDpad)}
              {renderRositaEditorBox("touchActions", "A/B", rositaLayout.touchActions)}
              {renderRositaEditorBox("touchMenu", "Start/Select", rositaLayout.touchMenu)}
              {renderRositaEditorBox("songToast", "Canción", rositaLayout.songToast)}
            </div>
          )}
          {!romLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground font-body">Cargando emulador...</p>
            </div>
          )}

          <div
            className={cn(
              "absolute inset-0 bg-black",
              usesRositaNesShell && "rosita-game-screen",
              usesSnesRetroShell && "snes-retro-game-screen",
            )}
          >
            <canvas
              ref={canvasRef}
              id="game-bubble-canvas"
              tabIndex={0}
              onClick={(e) => e.currentTarget.focus()}
              style={{
                width: "100%",
                height: "100%",
                display: usesEmulatorJs || isPs2 ? "none" : "block",
                outline: "none",
                objectFit: "contain",
                background: "black",
              }}
            />

            {usesEmulatorJs && !isPs2 && (
              <iframe
                ref={emulatorFrameRef}
                title="EmulatorJS"
                className="absolute inset-0 h-full w-full border-0 bg-black"
                allow="autoplay; gamepad; fullscreen; cross-origin-isolated"
              />
            )}
          </div>

          {/* 🎮 PS2 (Play!.js) — embebido directo desde su sitio oficial.
              El propio emulador trae su UI para subir el ISO (no requiere BIOS). */}
          {usesSnesRetroShell && (
            <div className="snes-retro-controls-layer">
              <svg
                className="snes-retro-hit-svg"
                viewBox={usesSnesRetroDesktopShell ? "0 0 1440 810" : usesSnesRetroLandscapeShell ? "0 0 2034 915" : "0 0 914.88 2034"}
                preserveAspectRatio="none"
                aria-hidden="false"
              >
                {usesSnesRetroDesktopShell ? (
                  <>
                    <rect role="button" tabIndex={0} aria-label="Minimizar" className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1263} y={24} width={34} height={34} rx={8} onPointerUp={(event) => handleSnesRetroActionShape(event, minimizeGame)} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label={isExpanded ? "Restaurar" : "Maximizar"} className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1314} y={24} width={34} height={34} rx={8} onPointerUp={(event) => handleSnesRetroActionShape(event, toggleFullscreen)} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label="Cerrar" className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1365} y={24} width={34} height={34} rx={8} onPointerUp={(event) => handleSnesRetroActionShape(event, handleClose)} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label="Opciones" className="snes-retro-hit-shape snes-retro-hit-shape-heart" x={625} y={8} width={105} height={88} rx={44} onPointerUp={(event) => handleSnesRetroActionShape(event, () => setSnesToolsOpen((value) => !value))} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label="Guardar partida" className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1268} y={86} width={70} height={63} rx={9} onPointerUp={(event) => handleSnesRetroActionShape(event, () => { if (romLoaded && !isN64) setShowSaveDialog(true); })} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label="Cargar partida" className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1268} y={160} width={71} height={63} rx={9} onPointerUp={(event) => handleSnesRetroActionShape(event, () => { if (romLoaded && !isN64 && saveSlots.length > 0) setShowLoadDialog(true); })} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label="Volumen" className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1268} y={234} width={71} height={64} rx={9} onPointerUp={(event) => handleSnesRetroActionShape(event, () => { setSnesToolsOpen(true); setShowVolumeSlider((value) => !value); })} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label="Configuracion" className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1268} y={309} width={71} height={65} rx={9} onPointerUp={(event) => handleSnesRetroActionShape(event, toggleEmulatorMenu)} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label={paused ? "Reanudar" : "Pausar"} className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1268} y={388} width={72} height={66} rx={9} onPointerUp={(event) => handleSnesRetroActionShape(event, () => { if (romLoaded) togglePause(); })} onContextMenu={(event) => event.preventDefault()} />
                  </>
                ) : usesSnesRetroLandscapeShell ? (
                  <>
                    {renderSnesRetroKeyRect("Arriba", "up", 231, 341, 128, 132, 22, "snes-retro-hit-shape-dpad")}
                    {renderSnesRetroKeyRect("Abajo", "down", 231, 588, 128, 130, 22, "snes-retro-hit-shape-dpad")}
                    {renderSnesRetroKeyRect("Izquierda", "left", 107, 464, 128, 132, 22, "snes-retro-hit-shape-dpad")}
                    {renderSnesRetroKeyRect("Derecha", "right", 353, 464, 130, 132, 22, "snes-retro-hit-shape-dpad")}
                    {renderSnesRetroKeyRect("L", "l", 226, 213, 142, 47, 24, "snes-retro-hit-shape-shoulder")}
                    {renderSnesRetroKeyRect("R", "r", 1678, 213, 143, 47, 24, "snes-retro-hit-shape-shoulder")}
                    {renderSnesRetroKeyCircle("Y", "y", 1637, 529, 61, 61, "snes-retro-hit-shape-face")}
                    {renderSnesRetroKeyCircle("X", "x", 1749, 402, 61, 61, "snes-retro-hit-shape-face")}
                    {renderSnesRetroKeyCircle("B", "b", 1749, 653, 61, 61, "snes-retro-hit-shape-face")}
                    {renderSnesRetroKeyCircle("A", "a", 1864, 529, 61, 61, "snes-retro-hit-shape-face")}
                    {renderSnesRetroKeyRect("Select", "select", 779, 861, 84, 31, 16, "snes-retro-hit-shape-pill")}
                    {renderSnesRetroKeyRect("Start", "start", 895, 861, 84, 31, 16, "snes-retro-hit-shape-pill")}
                    <rect role="button" tabIndex={0} aria-label="Config" className="snes-retro-hit-shape snes-retro-hit-shape-pill" x={1011} y={861} width={84} height={31} rx={16} onPointerUp={(event) => handleSnesRetroActionShape(event, toggleEmulatorMenu)} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label="Opciones" className="snes-retro-hit-shape snes-retro-hit-shape-heart" x={1127} y={861} width={129} height={31} rx={16} onPointerUp={(event) => handleSnesRetroActionShape(event, () => setSnesToolsOpen((value) => !value))} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label="Minimizar" className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1825} y={27} width={36} height={36} rx={9} onPointerUp={(event) => handleSnesRetroActionShape(event, minimizeGame)} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label={isExpanded ? "Restaurar" : "Maximizar"} className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1876} y={27} width={36} height={36} rx={9} onPointerUp={(event) => handleSnesRetroActionShape(event, toggleFullscreen)} onContextMenu={(event) => event.preventDefault()} />
                    <rect role="button" tabIndex={0} aria-label="Cerrar" className="snes-retro-hit-shape snes-retro-hit-shape-window" x={1927} y={27} width={36} height={36} rx={9} onPointerUp={(event) => handleSnesRetroActionShape(event, handleClose)} onContextMenu={(event) => event.preventDefault()} />
                  </>
                ) : (
                  <>
                {renderSnesRetroKeyRect("Arriba", "up", 158.980469, 1264.386719, 115.488281, 117.734375, 22, "snes-retro-hit-shape-dpad")}
                {renderSnesRetroKeyRect("Abajo", "down", 158.839844, 1468.980469, 115.484375, 119.234375, 22, "snes-retro-hit-shape-dpad")}
                {renderSnesRetroKeyRect("Izquierda", "left", 58.453125, 1367.863281, 114.734375, 117.734375, 22, "snes-retro-hit-shape-dpad")}
                {renderSnesRetroKeyRect("Derecha", "right", 261.136719, 1367.9375, 115.484375, 116.988281, 22, "snes-retro-hit-shape-dpad")}
                {renderSnesRetroKeyRect("L", "l", 125.128906, 1152.503906, 185.976563, 67.488282, 32, "snes-retro-hit-shape-shoulder")}
                {renderSnesRetroKeyRect("R", "r", 623.128906, 1152.503906, 188.226563, 67.488282, 32, "snes-retro-hit-shape-shoulder")}
                {renderSnesRetroKeyCircle("Y", "y", 624.488281, 1421.857422, 54.742188, 53.994141, "snes-retro-hit-shape-face")}
                {renderSnesRetroKeyCircle("X", "x", 717.320313, 1313.726563, 55.117188, 53.992188, "snes-retro-hit-shape-face")}
                {renderSnesRetroKeyCircle("B", "b", 717.320313, 1532.464844, 55.117188, 56.242188, "snes-retro-hit-shape-face")}
                {renderSnesRetroKeyCircle("A", "a", 810.75, 1421.855469, 54.742188, 53.994141, "snes-retro-hit-shape-face")}
                {renderSnesRetroKeyRect("Select", "select", 418.753906, 1255.933594, 109.484375, 40.492187, 20, "snes-retro-hit-shape-pill")}
                {renderSnesRetroKeyRect("Start", "start", 418.753906, 1329.339844, 109.484375, 41.992187, 20, "snes-retro-hit-shape-pill")}
                <rect
                  role="button"
                  tabIndex={0}
                  aria-label="Minimizar"
                  className="snes-retro-hit-shape snes-retro-hit-shape-window"
                  x={633.640625}
                  y={51.929688}
                  width={40.496094}
                  height={41.992187}
                  rx={10}
                  onPointerUp={(event) => handleSnesRetroActionShape(event, minimizeGame)}
                  onContextMenu={(event) => event.preventDefault()}
                />
                <rect
                  role="button"
                  tabIndex={0}
                  aria-label={isExpanded ? "Restaurar" : "Maximizar"}
                  className="snes-retro-hit-shape snes-retro-hit-shape-window"
                  x={696.898438}
                  y={52.894531}
                  width={40.496093}
                  height={39.746094}
                  rx={10}
                  onPointerUp={(event) => handleSnesRetroActionShape(event, toggleFullscreen)}
                  onContextMenu={(event) => event.preventDefault()}
                />
                <rect
                  role="button"
                  tabIndex={0}
                  aria-label="Cerrar"
                  className="snes-retro-hit-shape snes-retro-hit-shape-window"
                  x={760.140625}
                  y={52.578125}
                  width={40.496094}
                  height={40.496094}
                  rx={10}
                  onPointerUp={(event) => handleSnesRetroActionShape(event, handleClose)}
                  onContextMenu={(event) => event.preventDefault()}
                />
                <rect
                  role="button"
                  tabIndex={0}
                  aria-label="Config"
                  className="snes-retro-hit-shape snes-retro-hit-shape-pill"
                  x={418.84375}
                  y={1404.019531}
                  width={108.734375}
                  height={35.996094}
                  rx={18}
                  onPointerUp={(event) => handleSnesRetroActionShape(event, toggleEmulatorMenu)}
                  onContextMenu={(event) => event.preventDefault()}
                />
                <path
                  role="button"
                  tabIndex={0}
                  aria-label="Opciones"
                  className="snes-retro-hit-shape snes-retro-hit-shape-heart"
                  d="M 457.5 990 L 430 962 C 394 930 382 895 401 865 C 419 838 449 835 457.5 864 C 466 835 496 838 514 865 C 533 895 521 930 485 962 Z"
                  onPointerUp={(event) => handleSnesRetroActionShape(event, () => setSnesToolsOpen((value) => !value))}
                  onContextMenu={(event) => event.preventDefault()}
                />
                  </>
                )}
              </svg>
              {usesSnesRetroDesktopShell && (
                <div
                  id="music-slot-emulator"
                  className="snes-retro-desktop-music-slot"
                  aria-label="Mini reproductor de musica"
                />
              )}
              {snesToolsOpen && (
                <div
                  ref={snesToolsBubbleRef}
                  className="snes-retro-tools-bubble"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="snes-retro-tools-grid">
                    {romLoaded && !isN64 && (
                      <button type="button" onClick={() => setShowSaveDialog(true)}>
                        <Save className="h-4 w-4" />
                        Guardar
                      </button>
                    )}
                    {romLoaded && !isN64 && saveSlots.length > 0 && (
                      <button type="button" onClick={() => setShowLoadDialog(true)}>
                        <Download className="h-4 w-4" />
                        Cargar
                      </button>
                    )}
                    {user && activeGame.score > 0 && (
                      <button type="button" onClick={() => handleSaveScore(false)}>
                        <Upload className="h-4 w-4" />
                        Puntaje
                      </button>
                    )}
                    {romLoaded && (
                      <button type="button" onClick={togglePause}>
                        {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                        {paused ? "Seguir" : "Pausa"}
                      </button>
                    )}
                    {romLoaded && (
                      <button
                        type="button"
                        onClick={() => {
                          if (volumeSliderHideTimerRef.current) {
                            clearTimeout(volumeSliderHideTimerRef.current);
                            volumeSliderHideTimerRef.current = null;
                          }
                          setShowVolumeSlider((value) => !value);
                        }}
                      >
                        {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        Volumen
                      </button>
                    )}
                  </div>
                  {showVolumeSlider && (
                    <div ref={volumeSliderRef} className="snes-retro-volume-popover">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={(event) => handleVolumeChange(parseFloat(event.target.value))}
                      />
                      <span>{Math.round(volume * 100)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {isPs2 && (
            <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-950/40 to-black overflow-auto flex items-center justify-center p-4 sm:p-6">
              <div className="max-w-2xl w-full bg-black/70 backdrop-blur-xl border-2 border-neon-magenta/50 rounded-2xl p-5 sm:p-8 shadow-[0_0_50px_rgba(217,70,239,0.4)]">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-pixel text-[10px] sm:text-xs px-2 py-1 rounded border border-red-500/60 bg-red-600/20 text-red-400 animate-pulse tracking-widest uppercase">
                    Experimental
                  </span>
                  <span className="font-pixel text-[9px] sm:text-[10px] text-white/50 tracking-widest uppercase">
                    PlayStation 2 · Solo PC
                  </span>
                </div>

                <h3 className="font-pixel text-base sm:text-xl md:text-2xl text-neon-cyan mb-3 leading-tight tracking-wide">
                  Play!.js no se puede embeber aquí
                </h3>

                <p className="font-body text-xs sm:text-sm text-white/80 leading-relaxed mb-4">
                  El emulador oficial requiere headers de seguridad especiales (
                  <code className="text-neon-yellow text-[10px] sm:text-xs">SharedArrayBuffer</code> / COOP+COEP) que{" "}
                  <strong>solo funcionan abriéndolo directo en el navegador</strong>, no embebido en otra página. El
                  sitio bloquea la conexión con{" "}
                  <code className="text-red-400 text-[10px] sm:text-xs">ERR_BLOCKED_BY_RESPONSE</code>.
                </p>

                <div className="bg-black/60 border border-neon-cyan/30 rounded-lg p-3 sm:p-4 mb-4">
                  <p className="font-pixel text-[9px] sm:text-[10px] text-neon-cyan uppercase tracking-widest mb-2">
                    Cómo jugar PS2:
                  </p>
                  <ol className="font-body text-xs sm:text-sm text-white/85 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>Abre una pestaña nueva en tu navegador (escritorio).</li>
                    <li>Copia y pega esta URL en la barra de direcciones:</li>
                  </ol>
                  <div className="mt-3 flex items-center gap-2 bg-black/80 border border-neon-cyan/40 rounded px-3 py-2">
                    <code className="flex-1 font-mono text-xs sm:text-sm text-neon-yellow break-all select-all">
                      playjs.purei.org
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText("https://playjs.purei.org/");
                      }}
                      className="font-pixel text-[8px] sm:text-[9px] px-2 sm:px-3 py-1.5 rounded bg-neon-cyan/20 hover:bg-neon-cyan/40 border border-neon-cyan/50 text-neon-cyan uppercase tracking-widest transition-colors active:scale-95"
                    >
                      Copiar
                    </button>
                  </div>
                  <ol
                    start={3}
                    className="font-body text-xs sm:text-sm text-white/85 space-y-1.5 list-decimal list-inside leading-relaxed mt-2"
                  >
                    <li>
                      Dentro del emulador, presiona <strong className="text-neon-yellow">"Boot DiskImage"</strong> y
                      selecciona tu archivo <code className="text-[10px] sm:text-xs text-neon-yellow">.iso</code> /{" "}
                      <code className="text-[10px] sm:text-xs text-neon-yellow">.cso</code>.
                    </li>
                  </ol>
                </div>

                <p className="font-body text-[10px] sm:text-xs text-white/50 italic leading-snug">
                  💡 No requiere BIOS · Compatibilidad limitada · Mejor en Chrome de escritorio con buen hardware.
                </p>
              </div>
            </div>
          )}

          {/* 🎮 Controles táctiles para Nostalgist (NES/SNES/GBA/MD/etc) en móvil/tablet.
              EmulatorJS (N64/PS1/Arcade) ya trae sus propios virtualGamepad nativos.
              PS2 no soporta móvil. */}
          {!usesEmulatorJs && !isPs2 && !minimized && isMobile && romLoaded && !usesSnesRetroShell && (
            <TouchGamepad
              canvasRef={canvasRef}
              consoleName={activeGame.consoleName}
              visible={true}
              landscape={isLandscape}
              className={usesRositaNesShell ? "rosita-touch-controller" : undefined}
            />
          )}

          {minimized && (
            <>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-1.5">
                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[8px] font-body text-foreground truncate font-medium">{activeGame.gameName}</p>
                    <div className="flex items-center gap-1 text-[7px] text-muted-foreground font-body">
                      <span className="font-pixel text-neon-cyan">{activeGame.consoleName.toUpperCase()}</span>
                      <span>⚡ {activeGame.score || 0}</span>
                      {paused && <span className="text-neon-yellow font-pixel">PAUSA</span>}
                    </div>
                  </div>
                  {romLoaded && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePause();
                      }}
                      className={cn(
                        "h-7 w-7 rounded-full border border-border/70 bg-background/80 backdrop-blur-sm",
                        paused ? "text-neon-yellow hover:bg-neon-yellow/10" : "text-foreground hover:bg-background",
                      )}
                      title="Pausar"
                    >
                      {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </Button>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  "absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full",
                  paused ? "bg-neon-yellow" : "bg-neon-green animate-pulse",
                )}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose(currentGameIndex);
                }}
                className="absolute top-1 left-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-destructive-foreground" />
              </button>
            </>
          )}
        </div>

        {!minimized && !isExpanded && !usesSnesRetroShell && (
          <div className="px-3 py-1 bg-muted/30 border-t border-border">
            <p className="text-[8px] text-muted-foreground font-body text-center">
              Flechas + Z/X/A/S · Gamepad compatible (Haz click en el juego para activar) · F1 para menú nativo
            </p>
          </div>
        )}
      </div>

      {!minimized && !usesSnesRetroShell && (
        <>
          {/* 🔺 Botón para abrir/cerrar el menú L cuando el juego está maximizado.
              Se oculta/hace traslúcido si isIdle es true */}
          {isExpanded && !usesRositaNesShell && (
            <button
              type="button"
              onMouseEnter={resetIdleTimer} // Despierta el botón al pasar el ratón
              onClick={(e) => {
                e.stopPropagation();
                setExpandedControlsOpen((v) => !v);
              }}
              aria-label={expandedControlsOpen ? "Ocultar menú" : "Mostrar menú"}
              title={expandedControlsOpen ? "Ocultar menú" : "Mostrar menú"}
              className={cn(
                "absolute top-0 right-0 z-[100] h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg backdrop-blur-sm border",
                // Animación diagonal: se cambia tanto en X como en Y drásticamente
                expandedControlsOpen
                  ? "-translate-x-[72px] translate-y-[72px] bg-neon-cyan/90 border-neon-cyan text-black hover:bg-neon-cyan"
                  : "-translate-x-2 translate-y-2 bg-neon-magenta/90 border-neon-magenta text-black hover:bg-neon-magenta",
                isIdle && !expandedControlsOpen ? "opacity-30 hover:opacity-100" : "opacity-100"
              )}
            >
              {expandedControlsOpen ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          )}

          {/* 🔥 BARRA LATERAL CON DISEÑO EN "L" - desplegable cuando hay juego maximizado 🔥 */}
          <div
            className={cn(
              "bg-muted/30 border-l border-border flex flex-col items-center py-3 gap-2 shrink-0 transition-transform duration-300",
              usesRositaNesShell && "rosita-window-side-controls",
              isExpanded
                ? cn(
                    "absolute right-0 top-0 bottom-0 w-14 bg-black/85 border-l border-white/10 z-[60] pt-14",
                    expandedControlsVisible ? "translate-x-0" : "translate-x-full pointer-events-none",
                  )
                : "w-14",
            )}
          >
            {romLoaded && !isN64 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSaveDialog(true)}
                className="h-10 w-10 text-neon-green hover:bg-neon-green/10 rounded-lg"
                title="Guardar partida"
              >
                <Save className="w-4 h-4" />
              </Button>
            )}
            {romLoaded && !isN64 && saveSlots.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowLoadDialog(true)}
                className="h-10 w-10 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg"
                title="Cargar partida"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            {romLoaded && isN64 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={async () => {
                  const win = emulatorFrameRef.current?.contentWindow as any;
                  const ejs = win?.EJS_emulator;
                  try {
                    // Genera el estado y lo descarga como archivo .state
                    const state = ejs?.gameManager?.getState?.();
                    if (!state) throw new Error("no-state");
                    const blob = new Blob([state], { type: "application/octet-stream" });
                    const url = URL.createObjectURL(blob);
                    const a = win.document.createElement("a");
                    a.href = url;
                    const safe = (activeGame?.gameName || "game").replace(/[^a-z0-9]+/gi, "_");
                    a.download = `${safe}.state`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                    toast({ title: "Estado descargado ✔️" });
                    // 💾 También guardamos el puntaje en la base de datos (igual que los otros emuladores)
                    if (user && scoreRef.current > 0) {
                      await handleSaveScore(true);
                    }
                  } catch {
                    toast({ title: "No se pudo guardar el estado", variant: "destructive" });
                  }
                }}
                className="h-10 w-10 text-neon-green hover:bg-neon-green/10 rounded-lg"
                title="Descargar archivo de estado"
              >
                <Save className="w-4 h-4" />
              </Button>
            )}
            {romLoaded && isN64 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  const win = emulatorFrameRef.current?.contentWindow as any;
                  const ejs = win?.EJS_emulator;
                  try {
                    const input = win.document.createElement("input");
                    input.type = "file";
                    input.accept = ".state,application/octet-stream";
                    input.onchange = async (e: any) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const buf = new Uint8Array(await file.arrayBuffer());
                      ejs?.gameManager?.loadState?.(buf);
                      toast({ title: "Estado cargado ✔️" });
                    };
                    input.click();
                  } catch {
                    toast({ title: "No se pudo cargar el estado", variant: "destructive" });
                  }
                }}
                className="h-10 w-10 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg"
                title="Cargar archivo de estado"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            {user && activeGame.score > 0 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleSaveScore(false)}
                className="h-10 w-10 text-neon-yellow hover:bg-neon-yellow/10 rounded-lg"
                title="Guardar puntaje"
              >
                <Upload className="w-4 h-4" />
              </Button>
            )}

            {romLoaded && !isN64 && (
              <>
                <div
                  ref={volumeControlRef}
                  data-open={showVolumeSlider ? "true" : "false"}
                  className={cn("flex flex-col items-center w-full my-1", usesRositaNesShell && "rosita-volume-control")}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (volumeSliderHideTimerRef.current) {
                        clearTimeout(volumeSliderHideTimerRef.current);
                        volumeSliderHideTimerRef.current = null;
                      }
                      setShowVolumeSlider((value) => !value);
                    }}
                    className={cn(
                      "h-10 w-10 rounded-lg transition-colors",
                      showVolumeSlider
                        ? "bg-neon-magenta/20 text-neon-magenta"
                        : "text-muted-foreground hover:bg-neon-magenta/10 hover:text-neon-magenta",
                    )}
                    title="Ajustar Volumen"
                  >
                    {volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : volume > 0.5 ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <Volume1 className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {(showVolumeSlider || (canEditRositaLayout && rositaEditorEnabled)) && (
                  <div ref={volumeSliderRef} className={cn("flex flex-col items-center bg-black/40 border border-neon-magenta/30 rounded-full py-3 my-2 w-8 shadow-inner animate-fade-in", usesRositaNesShell && "rosita-volume-slider-popover")}>
                    <span className="text-[8px] font-pixel text-neon-magenta mb-2">{Math.round(volume * 100)}</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="h-20 appearance-none bg-muted/50 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-neon-magenta [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:[&::-webkit-slider-thumb]:bg-white transition-all"
                      style={{ writingMode: "vertical-lr", direction: "rtl" }}
                    />
                  </div>
                )}
              </>
            )}

            {romLoaded && (
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleEmulatorMenu}
                className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-white/10 rounded-lg"
                title="Ajustes del Emulador (F1)"
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}

            {romLoaded && (
              <Button
                size="icon"
                variant="ghost"
                onClick={togglePause}
                data-paused={paused ? "true" : "false"}
                className={cn(
                  "h-10 w-10 rounded-lg",
                  paused ? "text-neon-yellow hover:bg-neon-yellow/10" : "text-muted-foreground hover:bg-muted/50",
                )}
                title="Pausar (ESC)"
              >
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
            )}

            <div className="flex-1" />

            {activeGames.length > 1 &&
              activeGames.map((g, idx) => (
                <button
                  key={g.romUrl}
                  onClick={() => maximizeGame(idx)}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all",
                    idx === currentGameIndex ? "bg-neon-green/20 border border-neon-green/40" : "hover:bg-muted/50",
                  )}
                  title={g.gameName}
                >
                  {consoleIcons[g.consoleName] || "🎮"}
                </button>
              ))}

            <div className="flex-1" />

            {/* 🎵 SLOT del reproductor de música — el ChillMusicPlayer se portaleará aquí */}
            <div id="music-slot-emulator" className="w-full px-1 pb-1 mt-auto" />
          </div>

          {!isExpanded && (
            <div
              onMouseDown={onResizeDown}
              className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-0.5 text-muted-foreground hover:text-foreground z-10"
            >
              <GripVertical className="w-3 h-3 rotate-[-45deg]" />
            </div>
          )}
        </>
      )}

      {/* Save / Load dialogs — DENTRO de popupRef para que se vean en pantalla completa */}
      {showSaveDialog && (
        <div
          className="absolute inset-0 z-[400] flex items-center justify-center"
          onClick={() => setShowSaveDialog(false)}
        >
          <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
          <div
            className="relative bg-card border border-neon-green/30 rounded-lg p-5 w-80 animate-scale-in pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-pixel text-[10px] text-neon-green mb-3">GUARDAR PARTIDA</h3>
            <Input
              value={slotName}
              onChange={(e) => setSlotName(e.target.value)}
              placeholder={`Slot ${saveSlots.length + 1}`}
              className="h-8 bg-muted text-xs font-body mb-3"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveState} className="text-xs flex-1">Guardar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowSaveDialog(false)} className="text-xs">Cancelar</Button>
            </div>
            {saveSlots.length > 0 && (
              <div className="mt-3 border-t border-border pt-2">
                <p className="text-[9px] text-muted-foreground font-body mb-1">Slots guardados ({saveSlots.length}):</p>
                {saveSlots.map((s, i) => (
                  <div key={i} className="text-[9px] font-body text-foreground flex justify-between items-center py-0.5">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">{new Date(s.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showLoadDialog && (
        <div
          className="absolute inset-0 z-[400] flex items-center justify-center"
          onClick={() => setShowLoadDialog(false)}
        >
          <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
          <div
            className="relative bg-card border border-neon-cyan/30 rounded-lg p-5 w-80 max-h-[60vh] flex flex-col animate-scale-in pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-pixel text-[10px] text-neon-cyan mb-3">CARGAR PARTIDA</h3>
            <div className="flex-1 overflow-y-auto space-y-1">
              {saveSlots.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded hover:bg-muted/50 transition-colors">
                  <button onClick={() => handleLoadState(s)} className="flex-1 text-left">
                    <p className="text-xs font-body text-foreground">{s.name}</p>
                    <p className="text-[8px] text-muted-foreground font-body">{new Date(s.timestamp).toLocaleString()}</p>
                  </button>
                  <button onClick={() => handleDeleteSlot(i)} className="text-destructive hover:text-destructive/80 p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowLoadDialog(false)} className="text-xs mt-3">Cerrar</Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Overlay oscuro para la burbuja flotante normal */}
      {!minimized && !isExpanded && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md animate-fade-in" onClick={minimizeGame} />
      )}

      {/* Renderizado Universal con Docking Visual */}
      <div
        className={cn(
          "fixed z-[300]",
          minimized ? "bottom-4 right-4 flex flex-col items-end gap-2" : "inset-0 pointer-events-none",
        )}
      >
        {/* 🔧 Wrapper ESTABLE: NO cambiamos el árbol DOM al minimizar/maximizar
            para que el <canvas> del emulador no se desmonte y reinicie el juego. */}
        <div
          className={cn(
            "pointer-events-auto",
            !minimized && "w-full h-full flex justify-center items-center"
          )}
        >
          {bubbleContent}
        </div>

        {/* Burbujas Inactivas Minimizadas */}
        {minimized && inactiveGames.length > 0 && (
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            {inactiveGames.map(({ game, idx }) => (
              <button
                key={game.romUrl}
                onClick={() => maximizeGame(idx)}
                className="relative h-[72px] w-32 overflow-hidden rounded-xl border border-border bg-card/95 p-2 text-left shadow-xl transition-transform hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-background/90" />
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg">{consoleIcons[game.consoleName] || "🎮"}</span>
                    <span className="font-pixel text-[8px] text-neon-cyan">{game.consoleName.toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-body font-medium text-foreground truncate">{game.gameName}</p>
                    <p className="text-[8px] font-body text-muted-foreground">⚡ {game.score}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </>
  );
}
