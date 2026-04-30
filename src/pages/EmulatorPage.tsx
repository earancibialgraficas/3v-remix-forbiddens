import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Gamepad2, Upload, Settings, Battery, Clock, Monitor } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { cn } from "@/lib/utils";

// 🔥 SISTEMAS SOPORTADOS POR NOSTALGIST.JS 🔥
const systems = [
  {
    id: "nes",
    name: "Nintendo Entertainment System",
    short: "NES",
    core: "fceumm",
    extensions: ".nes,.zip",
    bg: "https://image.pollinations.ai/prompt/nes%20console%20retro%208bit%20pixel%20art%20dark%20background?width=1280&height=720&nologo=true",
    color: "text-red-500",
    year: "1985"
  },
  {
    id: "snes",
    name: "Super Nintendo",
    short: "SNES",
    core: "snes9x",
    extensions: ".smc,.sfc,.zip",
    bg: "https://image.pollinations.ai/prompt/super%20nintendo%20console%20retro%2016bit%20synthwave?width=1280&height=720&nologo=true",
    color: "text-purple-500",
    year: "1990"
  },
  {
    id: "n64",
    name: "Nintendo 64",
    short: "N64",
    core: "mupen64plus_next",
    extensions: ".n64,.z64,.v64,.zip",
    bg: "https://image.pollinations.ai/prompt/nintendo%2064%20console%20retro%20gaming%20dark%20neon?width=1280&height=720&nologo=true",
    color: "text-yellow-400",
    year: "1996"
  },
  {
    id: "gba",
    name: "Game Boy Advance",
    short: "GBA",
    core: "mgba",
    extensions: ".gba,.zip",
    bg: "https://image.pollinations.ai/prompt/gameboy%20advance%20console%20synthwave%20retro?width=1280&height=720&nologo=true",
    color: "text-fuchsia-500",
    year: "2001"
  },
  {
    id: "gbc",
    name: "Game Boy Color",
    short: "GBC",
    core: "gambatte",
    extensions: ".gbc,.gb,.zip",
    bg: "https://image.pollinations.ai/prompt/gameboy%20color%20console%20neon%20dark%20aesthetic?width=1280&height=720&nologo=true",
    color: "text-yellow-300",
    year: "1998"
  },
  {
    id: "sega",
    name: "Sega Genesis / Mega Drive",
    short: "MEGA DRIVE",
    core: "genesis_plus_gx",
    extensions: ".md,.smd,.gen,.bin,.zip",
    bg: "https://image.pollinations.ai/prompt/sega%20genesis%20console%20retro%2016bit%20dark%20blue?width=1280&height=720&nologo=true",
    color: "text-blue-500",
    year: "1988"
  },
  {
    id: "ps1",
    name: "PlayStation 1",
    short: "PSX",
    core: "pcsx_rearmed",
    extensions: ".iso,.bin,.cue,.chd,.zip",
    bg: "https://image.pollinations.ai/prompt/playstation%201%20classic%20console%20grey%20neon%20blue?width=1280&height=720&nologo=true",
    color: "text-blue-300",
    year: "1994"
  },
  {
    id: "arcade",
    name: "Arcade (FBNeo)",
    short: "ARCADE",
    core: "fbneo",
    extensions: ".zip",
    bg: "https://image.pollinations.ai/prompt/arcade%20cabinet%20machine%20neon%20cyberpunk%20dark%20room?width=1280&height=720&nologo=true",
    color: "text-orange-500",
    year: "1970"
  }
];

export default function EmulatorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { launchGame } = useGameBubble();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentIndex, setCurrentIndex] = useState(1);
  const [time, setTime] = useState("");

  // Reloj estilo Batocera
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev + 1) % systems.length);
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev - 1 + systems.length) % systems.length);
      } else if (e.key === "Enter") {
        fileInputRef.current?.click();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentSystem = systems[currentIndex];

  const handleRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      toast({ title: "Acceso denegado", description: "Debes iniciar sesión para emular tus propios juegos.", variant: "destructive" });
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    // Lanzar Nostalgist a través de GameBubble
    launchGame({
      romUrl: URL.createObjectURL(file),
      consoleName: currentSystem.short as any,
      gameName: file.name.replace(/\.[^/.]+$/, ""), // Quitar extensión
      consoleCore: currentSystem.core,
      score: 0,
      playTime: 0,
    });
    
    // Limpiar input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] min-h-[600px] bg-black rounded-xl overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-fade-in group selection:bg-transparent">
      
      {/* 🌌 FONDO DINÁMICO 🌌 */}
      <div className="absolute inset-0 transition-opacity duration-1000">
        <img 
          src={currentSystem.bg} 
          alt={currentSystem.name} 
          className="w-full h-full object-cover opacity-40 blur-[2px] scale-105"
        />
        {/* Filtro Scanlines tipo TV de tubo */}
        <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/black-linen-2.png')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 pointer-events-none"></div>
      </div>

      {/* 🔋 HEADER BATOCERA 🔋 */}
      <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20 pointer-events-none">
        <div className="flex items-center gap-3 text-white/80">
          <Monitor className="w-5 h-5" />
          <span className="font-pixel text-[10px] tracking-widest uppercase">Batocera.linux / Web Edition</span>
        </div>
        <div className="flex items-center gap-5 text-white/80">
          <Settings className="w-5 h-5" />
          <div className="flex items-center gap-2">
            <Battery className="w-5 h-5 text-green-400" />
            <span className="font-pixel text-[10px]">100%</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="font-pixel text-[10px]">{time}</span>
          </div>
        </div>
      </div>

      {/* 🎠 CARRUSEL DE CONSOLAS 🎠 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        
        {/* Info del Sistema Arriba del Carrusel */}
        <div className="mb-12 text-center animate-in slide-in-from-bottom-4 duration-500 h-24">
          <h2 className="font-pixel text-4xl md:text-5xl text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] tracking-tight uppercase">
            {currentSystem.name}
          </h2>
          <div className="flex items-center justify-center gap-4 mt-4 text-muted-foreground font-pixel text-[10px] uppercase tracking-widest">
             <span className="bg-white/10 px-3 py-1 rounded backdrop-blur-md border border-white/10">AÑO {currentSystem.year}</span>
             <span className="bg-white/10 px-3 py-1 rounded backdrop-blur-md border border-white/10">CORE: {currentSystem.core}</span>
          </div>
        </div>

        {/* Cintas del Carrusel */}
        <div className="relative w-full h-40 flex items-center justify-center overflow-hidden">
          {systems.map((sys, index) => {
            const offset = index - currentIndex;
            const isActive = offset === 0;
            const isPrev = offset === -1 || (currentIndex === 0 && index === systems.length - 1);
            const isNext = offset === 1 || (currentIndex === systems.length - 1 && index === 0);

            let transform = "translateX(1000px) scale(0)"; // Ocultos por defecto
            let opacity = 0;
            let zIndex = 0;

            if (isActive) {
              transform = "translateX(0) scale(1)";
              opacity = 1;
              zIndex = 30;
            } else if (isPrev) {
              transform = "translateX(-180%) scale(0.6)";
              opacity = 0.4;
              zIndex = 20;
            } else if (isNext) {
              transform = "translateX(180%) scale(0.6)";
              opacity = 0.4;
              zIndex = 20;
            }

            return (
              <div 
                key={sys.id} 
                className="absolute transition-all duration-500 ease-out flex flex-col items-center cursor-pointer"
                style={{ transform, opacity, zIndex }}
                onClick={() => setCurrentIndex(index)}
              >
                <div className={cn(
                  "w-32 h-32 md:w-40 md:h-40 flex items-center justify-center rounded-2xl border-4 backdrop-blur-md shadow-2xl transition-all duration-300",
                  isActive ? `bg-black/60 border-current ${sys.color} shadow-[0_0_40px_currentColor]` : "bg-black/40 border-white/10 text-white/50"
                )}>
                   <Gamepad2 className="w-16 h-16 md:w-20 md:h-20" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Botón de Carga de ROM Central */}
        <div className="mt-16 h-16">
           <input 
             type="file" 
             ref={fileInputRef} 
             accept={currentSystem.extensions} 
             onChange={handleRomUpload} 
             className="hidden" 
           />
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="group relative px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full backdrop-blur-md transition-all flex items-center gap-3 overflow-hidden shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
           >
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]"></div>
             <Upload className="w-5 h-5 text-white" />
             <span className="font-pixel text-[11px] text-white uppercase tracking-widest">Cargar ROM Local</span>
           </button>
           <p className="text-center text-[9px] font-body text-white/50 mt-3">Formatos: {currentSystem.extensions}</p>
        </div>

      </div>

      {/* 🎮 FOOTER DE CONTROLES (ESTILO EMULATIONSTATION) 🎮 */}
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

        {/* Botones móviles para navegar si no hay teclado */}
        <div className="flex md:hidden items-center gap-4">
           <button onClick={() => setCurrentIndex((prev) => (prev - 1 + systems.length) % systems.length)} className="p-3 bg-white/10 rounded-full border border-white/10 active:bg-white/30 transition-colors">
             <ChevronLeft className="w-6 h-6 text-white" />
           </button>
           <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-white/20 rounded-full border border-white/20 font-pixel text-[10px] uppercase text-white active:bg-white/40 transition-colors">
             SUBIR JUEGO
           </button>
           <button onClick={() => setCurrentIndex((prev) => (prev + 1) % systems.length)} className="p-3 bg-white/10 rounded-full border border-white/10 active:bg-white/30 transition-colors">
             <ChevronRight className="w-6 h-6 text-white" />
           </button>
        </div>

        <div className="hidden md:flex font-pixel text-[8px] text-white/30 uppercase tracking-widest">
           Emuladores locales · Nostalgist
        </div>
      </div>

    </div>
  );
}