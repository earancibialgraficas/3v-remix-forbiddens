import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Upload, Settings, Battery, Clock, Monitor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { allGames } from "@/lib/gameLibrary";
import { cn } from "@/lib/utils";

// 🔥 NOMBRES EXACTOS PARA TU CARPETA /consolasimg/ 🔥
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
    id: "n64", name: "Nintendo 64", short: "N64", core: "mupen64plus_next", extensions: ".n64,.z64,.v64,.zip",
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
    id: "ps1", name: "PlayStation 1", short: "PSX", core: "pcsx_rearmed", extensions: ".iso,.bin,.cue,.chd,.zip",
    bg: "https://image.pollinations.ai/prompt/playstation%201%20classic%20console%20grey%20neon%20blue?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/PlayStation 1.png",
    glow: "rgba(147,197,253,0.7)", year: "1994"
  },
  {
    id: "arcade", name: "Arcade (FBNeo)", short: "ARCADE", core: "fbneo", extensions: ".zip",
    bg: "https://image.pollinations.ai/prompt/arcade%20cabinet%20machine%20neon%20cyberpunk%20dark%20room?width=1280&height=720&nologo=true",
    consoleImg: "/consolasimg/Arcade.png",
    glow: "rgba(249,115,22,0.7)", year: "1990"
  }
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

  const hasActiveGame = activeGames.length > 0;

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
        
        // Limpiamos los parámetros de la URL para que no vuelva a cargar al refrescar
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.delete('game');
        navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
      }
    }
  }, [searchParams, user, location.pathname, navigate, launchGame]);

  // Reloj de Batocera
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })), 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ title: "Acceso denegado", description: "Debes iniciar sesión para emular tus juegos.", variant: "destructive" });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    // 🔥 HACK VITAL: Guardamos el File nativo real en memoria globalmente.
    // GameBubble leerá esto directamente para no perder su propiedad .name y extensión (.zip, .n64)
    if (!(window as any).__localRoms) {
      (window as any).__localRoms = {};
    }
    const fileId = file.name;
    (window as any).__localRoms[fileId] = file;

    // Le pasamos el prefijo 'local:' a la burbuja para que sepa dónde buscar en memoria
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

  return (
    <div id="batocera-screen" className="relative w-full h-[calc(100vh-5.5rem)] min-h-[600px] flex-1 bg-black rounded-xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fade-in group selection:bg-transparent">
      
      {/* 🔥 EL RECIPIENTE MÁGICO: Aquí se inyectará GameBubble de manera visual si hay un juego activo 🔥 */}
      <div id="batocera-target" className={cn("absolute inset-0 z-50 pointer-events-auto", hasActiveGame ? "block" : "hidden")}></div>

      {/* Solo mostramos la interfaz de Batocera si NO hay un juego activo en pantalla */}
      {!hasActiveGame && (
        <>
          <div className="absolute inset-0 transition-opacity duration-1000">
            <img src={currentSystem.bg} alt={currentSystem.name} className="w-full h-full object-cover opacity-40 blur-[3px] scale-105" />
            <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/black-linen-2.png')] opacity-30 pointer-events-none mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none"></div>
          </div>

          <div className="absolute top-0 w-full p-5 md:p-6 flex justify-between items-center z-20 pointer-events-none">
            <div className="flex items-center gap-3 text-white/80">
              <Monitor className="w-5 h-5" />
              <span className="font-pixel text-[10px] tracking-widest uppercase hidden sm:inline-block">Batocera.linux / Web Edition</span>
            </div>
            <div className="flex items-center gap-4 md:gap-5 text-white/80">
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
                <span className="font-pixel text-[10px]">100%</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-pixel text-[10px]">{time}</span>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <div className="mb-8 md:mb-12 text-center h-24 transition-all duration-500">
              <h2 className="font-pixel text-3xl md:text-5xl text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-tight uppercase px-4">{currentSystem.name}</h2>
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mt-4 text-muted-foreground font-pixel text-[9px] md:text-[10px] uppercase tracking-widest">
                 <span className="bg-white/10 px-3 py-1 rounded backdrop-blur-md border border-white/10">AÑO {currentSystem.year}</span>
                 <span className="bg-white/10 px-3 py-1 rounded backdrop-blur-md border border-white/10">CORE: {currentSystem.core}</span>
              </div>
            </div>

            <div className="relative w-full h-48 md:h-64 flex items-center justify-center overflow-visible">
              {systems.map((sys, index) => {
                const offset = index - currentIndex;
                const isActive = offset === 0;
                const isPrev = offset === -1 || (currentIndex === 0 && index === systems.length - 1);
                const isNext = offset === 1 || (currentIndex === systems.length - 1 && index === 0);
                let transform = "translateX(1000px) scale(0)"; let opacity = 0; let zIndex = 0; let filter = "grayscale(100%) brightness(0.5)";
                if (isActive) { transform = "translateX(0) scale(1.1)"; opacity = 1; zIndex = 30; filter = `drop-shadow(0 0 35px ${sys.glow})`; }
                else if (isPrev) { transform = "translateX(-160%) scale(0.65)"; opacity = 0.5; zIndex = 20; }
                else if (isNext) { transform = "translateX(160%) scale(0.65)"; opacity = 0.5; zIndex = 20; }
                return (
                  <div key={sys.id} className="absolute transition-all duration-700 ease-out flex flex-col items-center cursor-pointer" style={{ transform, opacity, zIndex, filter }} onClick={() => setCurrentIndex(index)}>
                    <div className="w-40 h-40 md:w-64 md:h-64 flex items-center justify-center pointer-events-none">
                       <img src={sys.consoleImg} alt={sys.name} className="w-full h-full object-contain" />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 md:mt-16 h-16">
               <input type="file" ref={fileInputRef} accept={currentSystem.extensions} onChange={handleRomUpload} className="hidden" />
               <button onClick={() => fileInputRef.current?.click()} className="group relative px-6 md:px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full backdrop-blur-md transition-all flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95">
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
                 <Upload className="w-4 h-4 md:w-5 md:h-5 text-white" />
                 <span className="font-pixel text-[9px] md:text-[11px] text-white uppercase tracking-widest">Cargar ROM Local</span>
               </button>
               <p className="text-center text-[8px] md:text-[9px] font-body text-white/50 mt-3">Formatos: {currentSystem.extensions}</p>
            </div>
          </div>

          <div className="absolute bottom-0 w-full p-4 bg-black/60 backdrop-blur-xl border-t border-white/10 flex justify-center md:justify-between items-center z-20">
            <div className="hidden md:flex items-center gap-6">
               <div className="flex items-center gap-2">
                 <span className="bg-white/20 px-2 py-0.5 rounded text-white font-bold text-[10px] font-body shadow-sm">⬅ / ➡</span>
                 <span className="font-pixel text-[9px] text-white/70 uppercase tracking-widest">Navegar</span>
               </div>
               <div className="flex items-center gap-2">
                 <span className="bg-white/20 px-2 py-0.5 rounded text-white font-bold text-[10px] font-body shadow-sm">ENTER</span>
                 <span className="font-pixel text-[9px] text-white/70 uppercase tracking-widest">Seleccionar ROM</span>
               </div>
            </div>
            <div className="flex md:hidden items-center gap-4">
               <button onClick={() => setCurrentIndex((prev) => (prev - 1 + systems.length) % systems.length)} className="p-3 bg-white/10 rounded-full border border-white/10 active:bg-white/30 transition-colors"><ChevronLeft className="w-6 h-6 text-white" /></button>
               <button onClick={() => fileInputRef.current?.click()} className="px-5 py-3 bg-white/20 rounded-full border border-white/20 font-pixel text-[9px] uppercase text-white active:bg-white/40 transition-colors">SUBIR JUEGO</button>
               <button onClick={() => setCurrentIndex((prev) => (prev + 1) % systems.length)} className="p-3 bg-white/10 rounded-full border border-white/10 active:bg-white/30 transition-colors"><ChevronRight className="w-6 h-6 text-white" /></button>
            </div>
            <div className="hidden md:flex font-pixel text-[8px] text-white/30 uppercase tracking-widest">Emuladores locales · Nostalgist</div>
          </div>
        </>
      )}
    </div>
  );
}