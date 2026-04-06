import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Gamepad2, Upload, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { allGames } from "@/lib/gameLibrary";

type ConsoleType = "nes" | "snes" | "gba";

const consoles: { id: ConsoleType; label: string; core: string; color: string }[] = [
  { id: "nes", label: "NES", core: "nes", color: "text-neon-green" },
  { id: "snes", label: "SNES", core: "snes", color: "text-neon-cyan" },
  { id: "gba", label: "Game Boy Advance", core: "gba", color: "text-neon-magenta" },
];

export default function EmulatorPage() {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("game");
  const consoleParam = searchParams.get("console") as ConsoleType | null;

  const [selectedConsole, setSelectedConsole] = useState<ConsoleType>(consoleParam || "nes");
  const [romLoaded, setRomLoaded] = useState(false);
  const [romName, setRomName] = useState("");
  const emulatorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-load game from library
  useEffect(() => {
    if (gameId) {
      const game = allGames.find((g) => g.id === gameId);
      if (game) {
        setSelectedConsole(game.console);
        setRomName(game.name);
        fetch(game.romUrl)
          .then((res) => res.arrayBuffer())
          .then((data) => startEmulator(data, game.console))
          .catch((err) => console.error("Error loading ROM:", err));
      }
    }
  }, [gameId]);

  const handleRomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRomName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const data = reader.result as ArrayBuffer;
      startEmulator(data, selectedConsole);
    };
    reader.readAsArrayBuffer(file);
  };

  const startEmulator = (romData: ArrayBuffer, console_type: ConsoleType) => {
    if (!emulatorRef.current) return;

    emulatorRef.current.innerHTML = "";

    const consoleInfo = consoles.find((c) => c.id === console_type)!;

    const div = document.createElement("div");
    div.id = "game";
    div.style.width = "100%";
    div.style.height = "100%";
    emulatorRef.current.appendChild(div);

    const blob = new Blob([romData]);
    const url = URL.createObjectURL(blob);

    (window as any).EJS_player = "#game";
    (window as any).EJS_core = consoleInfo.core;
    (window as any).EJS_gameUrl = url;
    (window as any).EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";
    (window as any).EJS_color = "#22c55e";
    (window as any).EJS_startOnLoaded = true;

    const existingScript = document.querySelector('script[src*="emulatorjs"]');
    if (existingScript) existingScript.remove();

    const script = document.createElement("script");
    script.src = "https://cdn.emulatorjs.org/stable/data/loader.js";
    script.async = true;
    document.body.appendChild(script);

    setRomLoaded(true);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-green/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4" /> SALAS DE JUEGO
        </h1>
        <p className="text-xs text-muted-foreground font-body">Carga tu ROM o selecciona un juego de la biblioteca para jugar</p>
      </div>

      {/* Console selector */}
      <div className="flex gap-2 flex-wrap">
        {consoles.map((c) => (
          <Button
            key={c.id}
            variant={selectedConsole === c.id ? "default" : "outline"}
            size="sm"
            onClick={() => { setSelectedConsole(c.id); setRomLoaded(false); }}
            className={cn(
              "text-xs font-body transition-all duration-200",
              selectedConsole === c.id ? "bg-primary text-primary-foreground" : "border-border"
            )}
          >
            <Monitor className="w-3 h-3 mr-1" /> {c.label}
          </Button>
        ))}
      </div>

      {/* ROM Upload */}
      <div className="bg-card border border-border rounded p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".nes,.smc,.sfc,.gba,.zip,.7z"
          onChange={handleRomUpload}
          className="hidden"
        />
        {!romLoaded ? (
          <div className="space-y-3">
            <Gamepad2 className="w-12 h-12 mx-auto text-muted-foreground" />
            <p className="text-sm font-body text-muted-foreground">
              Selecciona una ROM de {consoles.find((c) => c.id === selectedConsole)?.label} para empezar a jugar
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary text-primary-foreground hover:bg-primary/80 font-body text-sm transition-all duration-200"
            >
              <Upload className="w-4 h-4 mr-2" /> Cargar ROM
            </Button>
            <p className="text-[10px] text-muted-foreground font-body">
              Formatos: .nes, .smc, .sfc, .gba, .zip, .7z
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-body text-neon-green">Jugando: {romName}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setRomLoaded(false); fileInputRef.current?.click(); }}
              className="text-xs font-body border-border"
            >
              Cambiar ROM
            </Button>
          </div>
        )}
      </div>

      {/* Emulator container */}
      <div
        ref={emulatorRef}
        className={cn(
          "w-full rounded overflow-hidden bg-black transition-all duration-300",
          romLoaded ? "aspect-video" : "h-0"
        )}
      />

      <div className="bg-card border border-border rounded p-3">
        <p className="text-[10px] text-muted-foreground font-body">
          ⚠️ Solo carga ROMs de las que poseas una copia física. No proporcionamos ni alojamos ningún archivo ROM.
          Los controles se configuran automáticamente (teclado o gamepad).
        </p>
      </div>
    </div>
  );
}
