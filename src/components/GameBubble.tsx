import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Gamepad2, X, Minimize2, Maximize2, Trophy, Clock, Save, Move, GripVertical, Download, Upload, Pause, Play, Settings, Volume2, Volume1, VolumeX, Minus, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import TouchGamepad from "@/components/TouchGamepad";
import { useIsMobile } from "@/hooks/use-mobile";

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
  arcade: "🕹️"
};

const emulatorJsConsoles = new Set(["n64", "ps1", "arcade"]);

const getEmulatorJsCore = (consoleName: string) => {
  if (consoleName === "n64") return "n64";
  if (consoleName === "ps1") return "psx";
  if (consoleName === "arcade") return "arcade";
  return consoleName;
};

interface SaveSlot {
  name: string;
  data: any;
  timestamp: number;
}

const AFK_TIMEOUT_MS = 30 * 1000;

export default function GameBubble() {
  const location = useLocation();
  const { activeGames, currentGameIndex, minimized, maximizeGame, minimizeGame, closeGame, updateScore } = useGameBubble();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
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
  const [popupSize, setPopupSize] = useState({ w: 700, h: 520 });
  const [resizing, setResizing] = useState(false);
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const nostalgistRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const emulatorFrameRef = useRef<HTMLIFrameElement>(null);
  const emulatorObjectUrlsRef = useRef<string[]>([]);
  const canvasViewportRef = useRef<HTMLDivElement>(null);

  const [paused, setPaused] = useState(false);

  const [volume, setVolume] = useState(1); 
  const volumeRef = useRef(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [slotName, setSlotName] = useState("");

  const activeGame = activeGames[currentGameIndex] || null;
  const usesEmulatorJs = !!activeGame && emulatorJsConsoles.has(activeGame.consoleName);
  const isN64 = !!activeGame && ["n64", "ps1", "arcade"].includes(activeGame.consoleName);

  const revokeEmulatorObjectUrls = useCallback(() => {
    emulatorObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    emulatorObjectUrlsRef.current = [];
  }, []);

  // 🔥 DETECCIÓN INFALIBLE DE PANTALLA COMPLETA Y MODO TEATRO 🔥
  const [theaterRect, setTheaterRect] = useState<DOMRect | null>(null);
  const [forceFloating, setForceFloating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

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

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const checkBatoceraContainer = () => {
      const el = document.getElementById("batocera-target");
      if (el) {
        const rect = el.getBoundingClientRect();
        setTheaterRect(prev => {
          if (!prev || prev.top !== rect.top || prev.left !== rect.left || prev.width !== rect.width || prev.height !== rect.height) {
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
    window.addEventListener('resize', checkBatoceraContainer);
    window.addEventListener('scroll', checkBatoceraContainer, true);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkBatoceraContainer);
      window.removeEventListener('scroll', checkBatoceraContainer, true);
    };
  }, [activeGame, minimized, location.pathname]);

  useEffect(() => {
    setForceFloating(false);
  }, [activeGame?.romUrl]);

  const isTheaterActive = theaterRect && !minimized && !forceFloating;
  const isExpanded = isTheaterActive || isFullscreen;

  const syncCanvasSurface = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    // 🔥 FIX BLACK SCREEN: muchos cores libretro usan Module.setCanvasSize() o
    // escuchan el evento "resize". Si el canvas tiene tamaño 0 al rotar,
    // el GL viewport queda inválido. Forzamos reflow leyendo offsetHeight.
    void canvas.offsetHeight;
  }, []);

  const scheduleCanvasSurfaceSync = useCallback(() => {
    requestAnimationFrame(() => {
      syncCanvasSurface();
      requestAnimationFrame(() => syncCanvasSurface());
    });
  }, [syncCanvasSurface]);

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    (window as any).__masterVolume = newVol;
    (emulatorFrameRef.current?.contentWindow as any)?.EJS_emulator?.setVolume?.(newVol);
    (window as any).__masterGains.forEach((gainNode: any) => {
      if (gainNode && gainNode.gain) {
        gainNode.gain.value = newVol;
      }
    });
  };

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
            if (gp && gp.buttons.some(b => b.pressed)) { onInput(); break; }
          }
        }
      }, 500);
    }
    return () => {
      window.removeEventListener("keydown", onInput);
      window.removeEventListener("mousedown", onInput);
      window.removeEventListener("gamepadconnected", onInput);
      if (gpInterval) clearInterval(gpInterval);
    };
  }, [activeGame, romLoaded]);

  const syncCloudSaves = async (slotsToSync: SaveSlot[]) => {
    if (!user || !activeGame) return;
    // 🚫 N64/PS1/Arcade: NO subir estados a la nube. Se guardan solo localmente.
    if (activeGame && ["n64", "ps1", "arcade"].includes(activeGame.consoleName)) return;
    try {
      const safeSlots = slotsToSync.slice(0, 5);
      const slotsJson = JSON.stringify(safeSlots);

      const { data: existing } = await supabase.from("leaderboard_scores")
        .select("id").eq("user_id", user.id).eq("game_name", activeGame.gameName)
        .eq("console_type", activeGame.consoleName).limit(1).maybeSingle();

      if (existing) {
        await supabase.from("leaderboard_scores").update({ game_state: slotsJson } as any).eq("id", existing.id);
      } else {
        await supabase.from("leaderboard_scores").insert({
          user_id: user.id, display_name: profile?.display_name || "Anónimo",
          game_name: activeGame.gameName, console_type: activeGame.consoleName,
          score: 0, play_time_seconds: 0,
          game_state: slotsJson
        } as any);
      }
    } catch (e) {
      console.error("Cloud sync error:", e);
    }
  };

  useEffect(() => {
    if (activeGame) {
      const key = `save_slots_${activeGame.gameName}`;
      
      const syncAndLoadSaves = async () => {
        let localSlots: SaveSlot[] = [];
        const stored = localStorage.getItem(key);
        if (stored) {
          try { localSlots = JSON.parse(stored); } catch { localSlots = []; }
        }
        
        if (user) {
          try {
            const { data } = await supabase.from("leaderboard_scores")
              .select("game_state")
              .eq("user_id", user.id)
              .eq("game_name", activeGame.gameName)
              .eq("console_type", activeGame.consoleName)
              .limit(1).maybeSingle();

            if (data && data.game_state) {
              let cloudSlots: SaveSlot[] = typeof data.game_state === 'string' ? JSON.parse(data.game_state) : data.game_state;
              const mergedMap = new Map();
              localSlots.forEach(s => mergedMap.set(s.timestamp, s));
              (cloudSlots || []).forEach((s: any) => mergedMap.set(s.timestamp, s));
              
              let finalSlots = Array.from(mergedMap.values());
              finalSlots.sort((a, b) => b.timestamp - a.timestamp);
              finalSlots = finalSlots.slice(0, 5);

              setSaveSlots(finalSlots);
              localStorage.setItem(key, JSON.stringify(finalSlots));
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

  useEffect(() => {
    if (activeGame && !minimized && romLoaded && !paused) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        if (now - lastInputRef.current > AFK_TIMEOUT_MS) {
          if (!afkRef.current) {
            afkRef.current = true;
            if (nostalgistRef.current) {
              try { nostalgistRef.current.pause(); } catch {}
              setPaused(true);
            }
          }
          return;
        }
        timeRef.current += 10;
        scoreRef.current += 10;
        updateScore(scoreRef.current, timeRef.current);
      }, 10000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeGame, minimized, romLoaded, paused, updateScore]);

  useEffect(() => {
    if (!activeGame) {
      setRomLoaded(false);
      setNostalgistInstance(null);
      scoreRef.current = 0;
      timeRef.current = 0;
      return;
    }
    scoreRef.current = activeGame.score || 0;
    timeRef.current = activeGame.playTime || 0;

    const loadEmu = async () => {
      setRomLoaded(false);
      setPaused(false);
      await new Promise(r => setTimeout(r, 200));
      const el = canvasRef.current;
      const frame = emulatorFrameRef.current;
      if (!el && !frame) return;
      
      try {
        if (usesEmulatorJs && activeGame.consoleName === "n64" && !window.WebGLRenderingContext) {
            toast({ title: "Error Fatal", description: "Tu navegador no soporta WebGL, necesario para Nintendo 64.", variant: "destructive" });
            return;
        }
        
        let romSrc: any = activeGame.romUrl;
        let romFileName = activeGame.gameName;
        
        // 🔥 CONVERSIÓN DE FILE LOCAL A UINT8ARRAY (Evita desincronización de Blob) 🔥
        if (typeof romSrc === 'string' && romSrc.startsWith("local:")) {
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
                      fileContent: new Uint8Array(buffer)
                  };
                }
            }
        } else if (typeof romSrc === 'string' && romSrc.startsWith("blob:")) {
            const localMap = (window as any).__uploadedFiles;
            if (localMap && localMap[activeGame.gameName]) {
                const f = localMap[activeGame.gameName];
                if (f instanceof File) {
                    console.log("🎮 CARGANDO ROM BLOB:", f.name, "TAMAÑO:", f.size);
                    romFileName = f.name;
                    if (!usesEmulatorJs) {
                      romSrc = { 
                          fileName: f.name, 
                          fileContent: new Uint8Array(await f.arrayBuffer()) 
                      };
                    }
                }
            }
        } else if (typeof romSrc === 'string' && romSrc.startsWith("/")) {
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
          // 🔥 CSS para anclar la barra de menú nativa de EmulatorJS abajo del juego
          // 🚫 Oculta el botón "Context Menu" del menú nativo
          // 📱 Ajusta los controles táctiles para no quedar tapados por la barra en L
          const ejsCss = `
html,body,#game{margin:0;width:100%;height:100%;background:#000;overflow:hidden;touch-action:none}
#game{position:relative!important;display:flex!important;align-items:center!important;justify-content:center!important}
#game canvas,.ejs_canvas_parent,div[class*="canvas_parent"]{max-width:100%!important;max-height:calc(100% - 40px)!important;width:100%!important;height:calc(100% - 40px)!important;object-fit:contain!important;display:block!important;background:#000!important}
.ejs_drop_zone,.ejs_dropzone,.ejs_status,.ejs_message,.ejs_notification,
div[class*="drop"],div[class*="Drop"],div[class*="drag"],div[class*="Drag"]{
  display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;
}
/* Barra de controles nativa SIEMPRE abajo (cubre múltiples versiones de EJS) */
.ejs_menu_bar,
div[class*="menu_bar"],
.ejs_canvas_parent ~ div:last-child {
  position:absolute!important;
  left:0!important;
  right:0!important;
  bottom:0!important;
  top:auto!important;
  width:100%!important;
  background:rgba(0,0,0,0.9)!important;
  z-index:9999!important;
  display:flex!important;
  flex-direction:row!important;
  flex-wrap:nowrap!important;
  align-items:center!important;
  justify-content:flex-start!important;
  gap:4px!important;
  padding:4px 6px!important;
  overflow-x:auto!important;
}
/* Que start/rápido/lento queden en línea con los demás (sin saltar de fila) */
.ejs_menu_bar > *,
div[class*="menu_bar"] > *{
  flex:0 0 auto!important;
  margin:0!important;
}
.ejs_menu_bar_hidden{transform:translateY(100%)!important}
/* Ocultar botón Context Menu (varias variantes según versión EJS) */
.ejs_menu_button[title="Context Menu" i],
.ejs_menu_button[aria-label="Context Menu" i],
button[title="Context Menu" i],
button[aria-label="Context Menu" i],
.ejs_context_menu_button,
.ejs_contextmenu_button{display:none!important;visibility:hidden!important;width:0!important;}

/* 📱 Controles táctiles (virtual gamepad) — desplazar hacia adentro para
   no chocar con la barra en L del sitio (top, bottom, left, right) */
.ejs_virtualGamepad,
div[class*="virtualGamepad"],
div[class*="virtual_gamepad"]{
  --ejs-inset: 56px;
}
.ejs_virtualGamepad > *,
div[class*="virtualGamepad"] > *,
div[class*="virtual_gamepad"] > *{
  /* Empuja todos los botones flotantes para que vivan dentro de un margen seguro */
  margin: var(--ejs-inset) !important;
}
@media (orientation: landscape) and (max-height: 500px){
  #game canvas,.ejs_canvas_parent,div[class*="canvas_parent"]{height:100%!important;max-height:100%!important;width:100%!important;max-width:100%!important;object-fit:contain!important}
  .ejs_virtualGamepad,
  div[class*="virtualGamepad"],
  div[class*="virtual_gamepad"]{
    --ejs-inset: 64px;
  }
}
`;
          const html = `<!doctype html><html><head><meta charset="utf-8" /><style>${ejsCss}</style></head><body><div id="game"></div><script>window.EJS_player="#game";window.EJS_core=${JSON.stringify(emuCore)};window.EJS_gameUrl=${JSON.stringify(romForFrame)};window.EJS_gameName=${JSON.stringify(romFileName)};window.EJS_biosUrl=${JSON.stringify(biosUrl)};window.EJS_pathtodata="https://cdn.emulatorjs.org/stable/data/";window.EJS_startOnLoaded=true;window.EJS_threads=false;window.EJS_language="es-ES";window.EJS_volume=${JSON.stringify(volumeRef.current)};window.EJS_onGameStart=function(){parent.postMessage({type:"forbiddens-emulator-started"},"*")};</script><script src="https://cdn.emulatorjs.org/stable/data/loader.js"></script></body></html>`;

          const onMessage = (event: MessageEvent) => {
            if (event.data?.type !== "forbiddens-emulator-started") return;
            setRomLoaded(true);
            lastInputRef.current = Date.now();
            window.removeEventListener("message", onMessage);
          };
          window.addEventListener("message", onMessage);
          frame.srcdoc = html;

          const emulatorJsInstance = {
            pause: () => (frame.contentWindow as any)?.EJS_emulator?.pause?.(),
            resume: () => (frame.contentWindow as any)?.EJS_emulator?.play?.(),
            exit: () => {
              frame.srcdoc = "";
              revokeEmulatorObjectUrls();
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
                try { gm.quickSave("/save.state"); } catch {}
                await new Promise(r => setTimeout(r, 300));
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

              // 1) API directa
              if (typeof ejs.loadState === "function") {
                try { await ejs.loadState(bytes); return; } catch {}
              }
              if (gm && typeof gm.loadState === "function") {
                try { gm.loadState(bytes); return; } catch {}
                try { gm.loadState("/save.state", bytes); return; } catch {}
              }
              // Fallback: escribir al FS y quickLoad
              if (gm && typeof gm.quickLoad === "function") {
                try {
                  const FS = gm.FS || (frame.contentWindow as any).FS;
                  if (FS) FS.writeFile("/save.state", bytes);
                  gm.quickLoad("/save.state");
                  return;
                } catch {}
              }
              throw new Error("Carga no disponible");
            },
            openMenu: () => (frame.contentWindow as any)?.EJS_emulator?.menu?.open?.(),
          };

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
        
        nostalgistRef.current = instance;
        setNostalgistInstance(instance);
        setRomLoaded(true);
        lastInputRef.current = Date.now();
        scheduleCanvasSurfaceSync();

        setTimeout(() => {
          if (canvasRef.current) canvasRef.current.focus();
        }, 500);

      } catch (err: any) {
        console.error("Emulator error:", err);
        toast({ title: "Error al cargar", description: "Revisa la consola. Si es N64, puede ser incompatibilidad web.", variant: "destructive" });
      }
    };
    loadEmu();

    return () => {
      if (nostalgistRef.current) {
        try { nostalgistRef.current.exit(); } catch {}
        nostalgistRef.current = null;
      }
    };
    }, [activeGame?.romUrl, activeGame?.consoleName, activeGame?.gameName, scheduleCanvasSurfaceSync, toast, usesEmulatorJs, revokeEmulatorObjectUrls]);

  useEffect(() => {
    if (!romLoaded || !nostalgistRef.current) return;
    scheduleCanvasSurfaceSync();
    if (!minimized && !paused) {
      try { nostalgistRef.current.resume(); } catch {}
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
        const rect = viewport.getBoundingClientRect();
        // 📱 En móvil NO tocamos el backbuffer de RetroArch/Nostalgist al rotar:
        // varios cores se van a negro si se cambia canvas.width/height en caliente.
        // Imitamos el proyecto estable: CSS 100% + object-fit contain + resize/focus.
        if (isMobile) {
          canvas.style.width = "100%";
          canvas.style.height = "100%";
          canvas.style.objectFit = "contain";
          canvas.focus({ preventScroll: true });
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
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
      } catch {}

      try { window.dispatchEvent(new Event("resize")); } catch {}

      if (!minimized && nostalgistRef.current && !paused) {
        try { nostalgistRef.current.resume(); } catch {}
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
    const observer = typeof ResizeObserver !== "undefined" && canvasViewportRef.current
      ? new ResizeObserver(() => refreshViewport()) : null;
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
  }, [minimized, paused, romLoaded, scheduleCanvasSurfaceSync, isMobile]);

  const togglePause = useCallback(() => {
    if (!nostalgistRef.current || !romLoaded) return;
    try {
      if (paused) nostalgistRef.current.resume();
      else nostalgistRef.current.pause();
      setPaused(!paused);
    } catch {}
  }, [paused, romLoaded]);

  const toggleEmulatorMenu = useCallback(() => {
    // 🎮 EmulatorJS (N64/PS1/Arcade): abrir directamente el panel de Ajustes de Control
    if (usesEmulatorJs) {
      const win = emulatorFrameRef.current?.contentWindow as any;
      const ejs = win?.EJS_emulator;
      try {
        // 1) Vía API directa si existe
        if (ejs?.controlMenu?.style) {
          ejs.controlMenu.style.display = "flex";
          return;
        }
        if (typeof ejs?.openControls === "function") { ejs.openControls(); return; }
        if (typeof ejs?.controls?.open === "function") { ejs.controls.open(); return; }

        // 2) Fallback: simular click en el botón "Control Settings" del menú nativo
        const doc = win?.document;
        if (doc) {
          const selectors = [
            '.ejs_menu_button[title="Control Settings" i]',
            '.ejs_menu_button[aria-label="Control Settings" i]',
            'button[title="Control Settings" i]',
            'button[aria-label="Control Settings" i]',
          ];
          for (const sel of selectors) {
            const btn = doc.querySelector(sel) as HTMLElement | null;
            if (btn) { btn.click(); return; }
          }
        }
        toast({ title: "Ajustes de control no disponibles", variant: "destructive" });
      } catch {
        toast({ title: "No se pudo abrir los ajustes de control", variant: "destructive" });
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
  }, [romLoaded, usesEmulatorJs, toast]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (popupRef.current) popupRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
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
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const base64ToBlob = (b64: string): Blob => {
    try {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes]);
    } catch {
      return new Blob([b64]);
    }
  };

  const handleSaveScore = async (silent = false) => {
    if (!user || !activeGame || scoreRef.current <= 0) return;
    const currentScore = scoreRef.current;
    const currentTime = timeRef.current;
    
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("leaderboard_scores").select("id, score")
        .eq("user_id", user.id).eq("game_name", activeGame.gameName).eq("console_type", activeGame.consoleName)
        .order("score", { ascending: false }).limit(1).maybeSingle();

      if (fetchError) throw fetchError;

      if (existing && (existing as any).score >= currentScore) {
        if (!silent) toast({ title: "Puntaje no superado", description: `Tu récord actual es ${(existing as any).score}. ¡Sigue jugando!` });
        return;
      }
      
      if (existing) {
        await supabase.from("leaderboard_scores").update({
          score: currentScore, play_time_seconds: currentTime, display_name: profile?.display_name || "Anónimo",
        } as any).eq("id", (existing as any).id);
        if (!silent) toast({ title: "¡Nuevo récord!", description: `${currentScore} puntos en ${activeGame.gameName}` });
      } else {
        await supabase.from("leaderboard_scores").insert({
          user_id: user.id, display_name: profile?.display_name || "Anónimo",
          game_name: activeGame.gameName, console_type: activeGame.consoleName,
          score: currentScore, play_time_seconds: currentTime,
        } as any);
        if (!silent) toast({ title: "¡Puntaje guardado!", description: `${currentScore} puntos en ${activeGame.gameName}` });
      }
    } catch (error: any) {
      if (!silent) toast({ title: "Error al guardar puntaje", description: error.message, variant: "destructive" });
    }
  };

  const autoSaveOnClose = async () => {
    if (!nostalgistRef.current || !activeGame) return;
    // 🚫 N64/PS1/Arcade: NO autoguardar estado al cerrar (el usuario lo gestiona localmente con .state).
    if (["n64", "ps1", "arcade"].includes(activeGame.consoleName)) return;
    try {
      const result = await nostalgistRef.current.saveState();
      const stateBlob: Blob = result.state;
      const b64 = await stateToBase64(stateBlob);
      const name = `Auto-save ${new Date().toLocaleString()}`;
      const newSlot: SaveSlot = { name, data: b64, timestamp: Date.now() };
      
      const key = `save_slots_${activeGame.gameName}`;
      const stored = localStorage.getItem(key);
      let slots: SaveSlot[] = [];
      try { slots = stored ? JSON.parse(stored) : []; } catch {}
      
      const updated = [newSlot, ...slots].slice(0, 5);
      localStorage.setItem(key, JSON.stringify(updated));
      await syncCloudSaves(updated); 
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
      localStorage.setItem(`save_slots_${activeGame.gameName}`, JSON.stringify(updated));
      await syncCloudSaves(updated); 
      
      toast({ title: "Partida guardada y subida a la nube", description: `"${name}"` });
      setSlotName("");
      setShowSaveDialog(false);

      if (user && scoreRef.current > 0) {
        await handleSaveScore(false);
      }
    } catch (err) {
      toast({ title: "Guardado no compatible", description: "Este emulador no soporta guardado de estado rápido.", variant: "destructive" });
    }
  };

  const handleLoadState = async (slot: SaveSlot) => {
    if (!nostalgistRef.current) return;
    try {
      const blob = base64ToBlob(slot.data);
      await nostalgistRef.current.loadState(blob);
      toast({ title: "Partida cargada", description: `"${slot.name}"` });
      setShowLoadDialog(false);
    } catch (err) {
      toast({ title: "Error al cargar la partida", description: "No se pudo restaurar el estado", variant: "destructive" });
    }
  };

  const handleDeleteSlot = async (index: number) => {
    if (!activeGame) return;
    const updated = saveSlots.filter((_, i) => i !== index);
    setSaveSlots(updated);
    localStorage.setItem(`save_slots_${activeGame.gameName}`, JSON.stringify(updated));
    await syncCloudSaves(updated); 
    toast({ title: "Slot eliminado de tu PC y de la Nube" });
  };

  const handleClose = async (idx?: number) => {
    await autoSaveOnClose();
    if (activeGame && scoreRef.current > 0 && user) await handleSaveScore(false); 
    if (nostalgistRef.current && (idx === undefined || idx === currentGameIndex)) {
      try { nostalgistRef.current.exit(); } catch {}
      nostalgistRef.current = null;
      setNostalgistInstance(null);
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    closeGame(idx);
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
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
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
        const newW = Math.max(400, resizeRef.current.startW + (e.clientX - resizeRef.current.startX));
        const newH = Math.max(320, resizeRef.current.startH + (e.clientY - resizeRef.current.startY));
        setPopupSize({ w: newW, h: newH });
      });
    };
    const onUp = () => { cancelAnimationFrame(rafId); setResizing(false); scheduleCanvasSurfaceSync(); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { cancelAnimationFrame(rafId); window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [resizing, scheduleCanvasSurfaceSync, isExpanded]);

  if (activeGames.length === 0 || !activeGame) return null;

  const inactiveGames = activeGames
    .map((game, idx) => ({ game, idx }))
    .filter(({ idx }) => idx !== currentGameIndex);

  // 🔥 CSS DOCKING INTELIGENTE PARA MODO TEATRO O FLOTANTE 🔥
  let popupStyle: React.CSSProperties = {};
  if (!minimized) {
    if (isFullscreen) {
      popupStyle = { width: '100vw', height: '100vh', borderRadius: 0 };
    } else if (isTheaterActive && theaterRect) {
      // 📱 EN MÓVIL/TABLET: el contenedor batocera-target puede quedar fuera de
      // la pantalla por scroll o rotación → forzamos viewport completo para
      // que el juego SIEMPRE se vea, tanto en vertical como horizontal.
        if (isMobile) {
        popupStyle = {
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          zIndex: 50,
          borderRadius: 0,
        };
      } else {
        popupStyle = {
          position: 'fixed',
          top: theaterRect.top,
          left: theaterRect.left,
          width: theaterRect.width,
          height: theaterRect.height,
          zIndex: 40,
          borderRadius: '0.75rem',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        };
      }
    } else {
      popupStyle = {
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: `${popupSize.w}px`,
        height: `${popupSize.h}px`,
        maxWidth: "95vw",
        maxHeight: "90vh",
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
        minimized ? "bg-card h-[132px] w-44 rounded-xl shadow-2xl cursor-pointer border border-border" :
        isTheaterActive || isFullscreen ? "flex flex-col bg-black shadow-2xl" :
        "flex bg-card rounded-xl shadow-2xl shadow-black/50 border border-border animate-scale-in"
      )}
      style={popupStyle}
    >
      <div className={cn("relative flex-1 min-w-0 bg-black", minimized ? "h-full w-full" : "flex flex-col")}> 
        {!minimized && (
          // 🔥 BARRA SUPERIOR CON "group-hover:opacity-100" Y z-[61] PARA EVITAR SOLAPAMIENTOS 🔥
          <div
            className={cn(
              "flex items-center justify-between px-3 py-2 select-none transition-opacity",
              isExpanded 
                ? "absolute top-0 left-0 w-full z-[61] bg-black/80 border-b border-white/10 opacity-0 group-hover:opacity-100 h-12" 
                : "bg-muted/50 border-b border-border cursor-move"
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
                  <span className="flex items-center gap-0.5"><Trophy className="w-2.5 h-2.5" /> {activeGame.score || 0}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {Math.floor((activeGame.playTime || 0) / 60)}:{((activeGame.playTime || 0) % 60).toString().padStart(2, "0")}</span>
                  {afkRef.current && <span className="text-neon-yellow font-pixel animate-pulse">AFK</span>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={minimizeGame} className="h-7 w-7 text-neon-cyan hover:bg-neon-cyan/10" title="Minimizar (Enviar a esquina)">
                <Minus className="w-3.5 h-3.5" />
              </Button>
              
              {/* 🔥 BOTÓN DE RESTAURAR OCULTO SI ESTÁS EN MODO TEATRO 🔥 */}
              {isExpanded && !isTheaterActive && (
                 <Button 
                   size="icon" 
                   variant="ghost" 
                   onClick={() => {
                     if (isFullscreen) document.exitFullscreen();
                     else setForceFloating(true);
                   }} 
                   className="h-7 w-7 text-white hover:bg-white/20" 
                   title="Restaurar a Ventana Flotante"
                 >
                   <Copy className="w-3.5 h-3.5" />
                 </Button>
              )}

              {!isFullscreen && (
                <Button size="icon" variant="ghost" onClick={toggleFullscreen} className="h-7 w-7 text-neon-yellow hover:bg-neon-yellow/10" title="Pantalla Completa Nativa">
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              )}

              <Button size="icon" variant="ghost" onClick={() => handleClose()} className="h-7 w-7 text-destructive hover:bg-destructive/10" title="Cerrar Juego">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        <div
          ref={canvasViewportRef}
          className={cn(
            "relative bg-black overflow-hidden",
            minimized ? "h-full w-full" : "flex-1",
            isExpanded && isMobile && "flex items-center justify-center",
            isExpanded && isMobile && isLandscape && !usesEmulatorJs && "px-28"
          )}
        >
          {!romLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground font-body">Cargando emulador...</p>
            </div>
          )}

          <canvas 
            ref={canvasRef} 
            id="game-bubble-canvas" 
            tabIndex={0} 
            onClick={(e) => e.currentTarget.focus()}
            style={{ width: "100%", height: "100%", display: usesEmulatorJs ? "none" : "block", outline: "none", objectFit: "contain", background: "black" }} 
          />

          {usesEmulatorJs && (
            <iframe
              ref={emulatorFrameRef}
              title="EmulatorJS"
              className="absolute inset-0 h-full w-full border-0 bg-black"
              allow="autoplay; gamepad; fullscreen"
            />
          )}

          {/* 🎮 Controles táctiles para Nostalgist (NES/SNES/GBA/MD/etc) en móvil/tablet.
              EmulatorJS (N64/PS1/Arcade) ya trae sus propios virtualGamepad nativos. */}
          {!usesEmulatorJs && !minimized && isMobile && romLoaded && (
            <TouchGamepad
              canvasRef={canvasRef}
              consoleName={activeGame.consoleName}
              visible={true}
              landscape={isLandscape}
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
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); togglePause(); }}
                      className={cn("h-7 w-7 rounded-full border border-border/70 bg-background/80 backdrop-blur-sm",
                        paused ? "text-neon-yellow hover:bg-neon-yellow/10" : "text-foreground hover:bg-background")} title="Pausar">
                      {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    </Button>
                  )}
                </div>
              </div>
              <span className={cn("absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full", paused ? "bg-neon-yellow" : "bg-neon-green animate-pulse")} />
              <button onClick={(e) => { e.stopPropagation(); handleClose(currentGameIndex); }}
                className="absolute top-1 left-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3 text-destructive-foreground" />
              </button>
            </>
          )}
        </div>

        {!minimized && !isExpanded && (
          <div className="px-3 py-1 bg-muted/30 border-t border-border">
            <p className="text-[8px] text-muted-foreground font-body text-center">
              Flechas + Z/X/A/S · Gamepad compatible (Haz click en el juego para activar) · F1 para menú nativo
            </p>
          </div>
        )}
      </div>

      {!minimized && (
        <>
          {/* 🔥 BARRA LATERAL CON DISEÑO EN "L" (Comienza desde top-12 para no tapar la barra superior) 🔥 */}
          <div className={cn(
            "bg-muted/30 border-l border-border flex flex-col items-center py-3 gap-2 shrink-0 transition-opacity",
            isExpanded ? "absolute right-0 top-12 bottom-0 w-14 bg-black/80 border-l border-white/10 z-[60] opacity-0 group-hover:opacity-100" : "w-14"
          )}>
            {romLoaded && !isN64 && (
              <Button size="icon" variant="ghost" onClick={() => setShowSaveDialog(true)} className="h-10 w-10 text-neon-green hover:bg-neon-green/10 rounded-lg" title="Guardar partida">
                <Save className="w-4 h-4" />
              </Button>
            )}
            {romLoaded && !isN64 && saveSlots.length > 0 && (
              <Button size="icon" variant="ghost" onClick={() => setShowLoadDialog(true)} className="h-10 w-10 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg" title="Cargar partida">
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
              <Button size="icon" variant="ghost" onClick={() => handleSaveScore(false)} className="h-10 w-10 text-neon-yellow hover:bg-neon-yellow/10 rounded-lg" title="Guardar puntaje">
                <Upload className="w-4 h-4" />
              </Button>
            )}
            
            {romLoaded && !isN64 && (
              <div className="flex flex-col items-center w-full my-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setShowVolumeSlider(!showVolumeSlider)} 
                  className={cn("h-10 w-10 rounded-lg transition-colors", showVolumeSlider ? "bg-neon-magenta/20 text-neon-magenta" : "text-muted-foreground hover:bg-neon-magenta/10 hover:text-neon-magenta")}
                  title="Ajustar Volumen"
                >
                  {volume === 0 ? <VolumeX className="w-4 h-4" /> : volume > 0.5 ? <Volume2 className="w-4 h-4" /> : <Volume1 className="w-4 h-4" />}
                </Button>
                
                {showVolumeSlider && (
                  <div className="flex flex-col items-center bg-black/40 border border-neon-magenta/30 rounded-full py-3 my-2 w-8 shadow-inner animate-fade-in">
                    <span className="text-[8px] font-pixel text-neon-magenta mb-2">{Math.round(volume * 100)}</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="h-20 appearance-none bg-muted/50 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-neon-magenta [&::-webkit-slider-thumb]:rounded-full cursor-pointer hover:[&::-webkit-slider-thumb]:bg-white transition-all"
                      style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    />
                  </div>
                )}
              </div>
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
              <Button size="icon" variant="ghost" onClick={togglePause}
                className={cn("h-10 w-10 rounded-lg", paused ? "text-neon-yellow hover:bg-neon-yellow/10" : "text-muted-foreground hover:bg-muted/50")} title="Pausar (ESC)">
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
            )}

            <div className="flex-1" />

            {activeGames.length > 1 && activeGames.map((g, idx) => (
              <button key={g.romUrl} onClick={() => maximizeGame(idx)}
                className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all",
                  idx === currentGameIndex ? "bg-neon-green/20 border border-neon-green/40" : "hover:bg-muted/50")} title={g.gameName}>
                {consoleIcons[g.consoleName] || "🎮"}
              </button>
            ))}

            <div className="flex-1" />
          </div>

          {!isExpanded && (
            <div onMouseDown={onResizeDown}
              className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-0.5 text-muted-foreground hover:text-foreground z-10">
              <GripVertical className="w-3 h-3 rotate-[-45deg]" />
            </div>
          )}
        </>
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
      <div className={cn("fixed z-[300]", minimized ? "bottom-4 right-4 flex flex-col items-end gap-2" : "inset-0 pointer-events-none")}>
        {!minimized ? (
           <div className="pointer-events-auto w-full h-full flex justify-center items-center">
             {bubbleContent}
           </div>
        ) : (
           <div className="pointer-events-auto">
             {bubbleContent}
           </div>
        )}

        {/* Burbujas Inactivas Minimizadas */}
        {minimized && inactiveGames.length > 0 && (
          <div className="flex flex-col items-end gap-2 pointer-events-auto">
            {inactiveGames.map(({ game, idx }) => (
              <button key={game.romUrl} onClick={() => maximizeGame(idx)}
                className="relative h-[72px] w-32 overflow-hidden rounded-xl border border-border bg-card/95 p-2 text-left shadow-xl transition-transform hover:scale-[1.02]">
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

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={() => setShowSaveDialog(false)}>
          <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
          <div className="relative bg-card border border-neon-green/30 rounded-lg p-5 w-80 animate-scale-in pointer-events-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-pixel text-[10px] text-neon-green mb-3">GUARDAR PARTIDA</h3>
            <Input value={slotName} onChange={e => setSlotName(e.target.value)} placeholder={`Slot ${saveSlots.length + 1}`} className="h-8 bg-muted text-xs font-body mb-3" />
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

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={() => setShowLoadDialog(false)}>
          <div className="absolute inset-0 bg-black/60 pointer-events-auto" />
          <div className="relative bg-card border border-neon-cyan/30 rounded-lg p-5 w-80 max-h-[60vh] flex flex-col animate-scale-in pointer-events-auto" onClick={e => e.stopPropagation()}>
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
    </>
  );
}