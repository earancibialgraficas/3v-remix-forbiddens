import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Upload, Settings, Battery, Clock, Monitor, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { allGames } from "@/lib/gameLibrary";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  }
];

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

export default function EmulatorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { launchGame, activeGames } = useGameBubble();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Lógica de carga automática si vienes desde la página de Biblioteca
  useEffect(() => {
    const gameId = searchParams.get("game");
    if (gameId && user) {
      const game = allGames.find((g) => g.id === gameId);
      if (game) {
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

  // Bloquear navegación del teclado (Enter/Flechas) si hay un juego activo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasActiveGame) return;
      if (e.key === "ArrowRight") setCurrentIndex((prev) => (prev + 1) % systems.length);
      else if (e.key === "ArrowLeft") setCurrentIndex((prev) => (prev - 1 + systems.length) % systems.length);
      else if (e.key === "Enter") fileInputRef.current?.click();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasActiveGame]);

  const currentSystem = systems[currentIndex];

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz);
    localStorage.setItem("emulator_timezone", tz);
    const label = TIMEZONES.find(t => t.value === tz)?.label || tz;
    toast({ title: "Zona horaria actualizada", description: label });
  };

  const handleRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ title: "Acceso denegado", description: "Debes iniciar sesión para emular tus juegos.", variant: "destructive" });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

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
  const SLOT_DISTANCE = 260; // debe coincidir con el render
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
                  <DropdownMenuSeparator className="bg-white/10" />
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
            <div className="mb-4 sm:mb-8 md:mb-12 text-center transition-all duration-500 px-3 sm:px-4 max-w-full">
              <h2 className="font-pixel text-[clamp(0.85rem,4.2vw,3rem)] leading-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-tight uppercase break-words">
                {currentSystem.name}
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 mt-3 sm:mt-4 text-muted-foreground font-pixel text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-widest">
                 <span className="bg-white/10 px-2 sm:px-3 py-1 rounded backdrop-blur-md border border-white/10">AÑO {currentSystem.year}</span>
                 <span className="bg-white/10 px-2 sm:px-3 py-1 rounded backdrop-blur-md border border-white/10 max-w-[80vw] truncate">CORE: {currentSystem.core}</span>
              </div>
            </div>

            {/* CARRUSEL — drag/swipe enabled */}
            <div
              ref={carouselRef}
              className={cn(
                "relative w-full h-44 sm:h-48 md:h-64 flex items-center justify-center overflow-visible touch-pan-y select-none",
                isDragging ? "cursor-grabbing" : "cursor-grab"
              )}
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
                const SLOT_DISTANCE_PX = 260; // px entre slots (coincide con SLOT_DISTANCE arriba)
                const ACTIVE_SCALE = 1.1;
                const SIDE_SCALE = 0.65;
                const ACTIVE_OPACITY = 1;
                const SIDE_OPACITY = 0.5;

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
                  const absSlot = Math.abs(effectiveSlot);

                  if (absSlot > 1.6) return null;

                  // Interpolación suave entre activo y lateral
                  const t = Math.min(1, absSlot);
                  const ease = t * t * (3 - 2 * t); // smoothstep
                  const scale = ACTIVE_SCALE + (SIDE_SCALE - ACTIVE_SCALE) * ease;
                  const opacity = ACTIVE_OPACITY + (SIDE_OPACITY - ACTIVE_OPACITY) * ease;
                  const translatePx = effectiveSlot * SLOT_DISTANCE_PX;
                  const zIndex = Math.round(30 - absSlot * 10);

                  const glowAlpha = 1 - ease;
                  const filter = glowAlpha > 0.05
                    ? `drop-shadow(0 0 ${35 * glowAlpha}px ${sys.glow})`
                    : "grayscale(60%) brightness(0.75)";

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
                        transform: `translate3d(${translatePx}px, 0, 0) scale(${scale})`,
                        opacity,
                        zIndex,
                        filter,
                      }}
                      onClick={() => { if (Math.abs(dragDelta.current) < 5) setCurrentIndex(index); }}
                    >
                      <div className="w-36 h-36 sm:w-40 sm:h-40 md:w-64 md:h-64 flex items-center justify-center pointer-events-none">
                         <img src={sys.consoleImg} alt={sys.name} className="w-full h-full object-contain" draggable={false} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="mt-6 sm:mt-12 md:mt-16 px-3 w-full max-w-md flex flex-col items-center">
               <input type="file" ref={fileInputRef} accept={currentSystem.extensions} onChange={handleRomUpload} className="hidden" />
               <button
                 onClick={() => fileInputRef.current?.click()}
                 className="group relative w-full sm:w-auto px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full backdrop-blur-md transition-all flex items-center justify-center gap-2 sm:gap-3 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
               >
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                 <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white flex-shrink-0" />
                 <span className="font-pixel text-[clamp(0.5rem,1.8vw,0.7rem)] text-white uppercase tracking-widest whitespace-nowrap">Cargar ROM Local</span>
               </button>
               <p className="text-center text-[clamp(0.5rem,1.4vw,0.6rem)] font-body text-white/50 mt-2 sm:mt-3 break-all px-2">
                 Formatos: {currentSystem.extensions}
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
               <button onClick={() => fileInputRef.current?.click()} className="flex-1 px-3 sm:px-5 py-2.5 sm:py-3 bg-white/20 rounded-full border border-white/20 font-pixel text-[clamp(0.5rem,1.8vw,0.65rem)] uppercase text-white active:bg-white/40 transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                 SUBIR JUEGO
               </button>
               <button onClick={() => setCurrentIndex((prev) => (prev + 1) % systems.length)} className="p-2 sm:p-3 bg-white/10 rounded-full border border-white/10 active:bg-white/30 transition-colors flex-shrink-0">
                 <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
               </button>
            </div>
            <div className="hidden md:flex font-pixel text-[8px] text-white/30 uppercase tracking-widest">Emuladores locales · Nostalgist</div>
          </div>
        </>
      )}
    </div>
  );
}
