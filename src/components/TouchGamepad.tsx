import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 🎮 Controles táctiles overlay para Nostalgist (NES/SNES/GBA/MD/N64/PS1/Arcade).
 * Despacha eventos KeyboardEvent sobre el canvas activo del emulador, usando los
 * key bindings por defecto de RetroArch RetroPad para JS:
 *   - D-pad: ArrowUp/Down/Left/Right
 *   - A = X, B = Z, X = S, Y = A
 *   - L = Q, R = W
 *   - Start = Enter, Select = ShiftRight
 *
 * Diseño: D-pad inferior izquierda + cluster de acción inferior derecha + Start/Select centro.
 * Se auto-acomoda en horizontal y vertical, no bloquea las esquinas (donde está la "barra L").
 */

type ConsoleName =
  | "nes" | "snes" | "gba" | "gb" | "gbc" | "megadrive" | "n64" | "ps1" | "arcade";

interface TouchGamepadProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  consoleName: string;
  visible: boolean;
}

interface KeyMap {
  code: string;
  key: string;
  keyCode: number;
}

const K = {
  ArrowUp:    { code: "ArrowUp",    key: "ArrowUp",    keyCode: 38 },
  ArrowDown:  { code: "ArrowDown",  key: "ArrowDown",  keyCode: 40 },
  ArrowLeft:  { code: "ArrowLeft",  key: "ArrowLeft",  keyCode: 37 },
  ArrowRight: { code: "ArrowRight", key: "ArrowRight", keyCode: 39 },
  X:          { code: "KeyX",       key: "x",          keyCode: 88 }, // A
  Z:          { code: "KeyZ",       key: "z",          keyCode: 90 }, // B
  S:          { code: "KeyS",       key: "s",          keyCode: 83 }, // X
  A:          { code: "KeyA",       key: "a",          keyCode: 65 }, // Y
  Q:          { code: "KeyQ",       key: "q",          keyCode: 81 }, // L
  W:          { code: "KeyW",       key: "w",          keyCode: 87 }, // R
  Enter:      { code: "Enter",      key: "Enter",      keyCode: 13 }, // Start
  ShiftRight: { code: "ShiftRight", key: "Shift",      keyCode: 16 }, // Select
} satisfies Record<string, KeyMap>;

function dispatchKey(canvas: HTMLCanvasElement | null, type: "keydown" | "keyup", k: KeyMap) {
  if (!canvas) return;
  const ev = new KeyboardEvent(type, {
    code: k.code,
    key: k.key,
    keyCode: k.keyCode,
    which: k.keyCode,
    bubbles: true,
    cancelable: true,
  });
  // Algunos cores escuchan en window/document, otros en el canvas
  canvas.dispatchEvent(ev);
  window.dispatchEvent(ev);
  document.dispatchEvent(ev);
}

interface BtnProps {
  label: string;
  onPress: () => void;
  onRelease: () => void;
  className?: string;
  small?: boolean;
}

function Btn({ label, onPress, onRelease, className, small }: BtnProps) {
  const [pressed, setPressed] = useState(false);
  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setPressed(true);
    onPress();
  };
  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setPressed(false);
    onRelease();
  };
  return (
    <button
      type="button"
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={pressed ? handleEnd : undefined}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "select-none touch-none flex items-center justify-center font-pixel text-white",
        "rounded-full border border-white/30 backdrop-blur-md transition-all",
        "active:scale-90",
        small ? "text-[9px]" : "text-xs",
        pressed ? "bg-neon-magenta/70 border-neon-magenta shadow-[0_0_12px_hsl(var(--neon-magenta))]"
                : "bg-black/40 hover:bg-black/55",
        className
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {label}
    </button>
  );
}

/** Botones del D-pad como un cluster con 4 áreas */
function DPad({ canvas }: { canvas: React.RefObject<HTMLCanvasElement> }) {
  const press = (k: KeyMap) => () => dispatchKey(canvas.current, "keydown", k);
  const release = (k: KeyMap) => () => dispatchKey(canvas.current, "keyup", k);
  return (
    <div className="relative w-[140px] h-[140px]">
      {/* Centro decorativo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/30 border border-white/20 pointer-events-none" />
      <Btn label="▲" onPress={press(K.ArrowUp)} onRelease={release(K.ArrowUp)}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 !rounded-lg" />
      <Btn label="▼" onPress={press(K.ArrowDown)} onRelease={release(K.ArrowDown)}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 !rounded-lg" />
      <Btn label="◀" onPress={press(K.ArrowLeft)} onRelease={release(K.ArrowLeft)}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 !rounded-lg" />
      <Btn label="▶" onPress={press(K.ArrowRight)} onRelease={release(K.ArrowRight)}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 !rounded-lg" />
    </div>
  );
}

/** Cluster de botones de acción según consola */
function ActionCluster({
  canvas,
  consoleName,
}: {
  canvas: React.RefObject<HTMLCanvasElement>;
  consoleName: string;
}) {
  const press = (k: KeyMap) => () => dispatchKey(canvas.current, "keydown", k);
  const release = (k: KeyMap) => () => dispatchKey(canvas.current, "keyup", k);

  // NES y GB: solo A y B
  if (consoleName === "nes" || consoleName === "gb") {
    return (
      <div className="flex items-center gap-3">
        <Btn label="B" onPress={press(K.Z)} onRelease={release(K.Z)}
          className="w-14 h-14" />
        <Btn label="A" onPress={press(K.X)} onRelease={release(K.X)}
          className="w-14 h-14" />
      </div>
    );
  }

  // SNES, GBA, GBC, MegaDrive, Arcade: A B X Y en diamante
  return (
    <div className="relative w-[140px] h-[140px]">
      <Btn label="X" onPress={press(K.S)} onRelease={release(K.S)}
        className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12" />
      <Btn label="B" onPress={press(K.Z)} onRelease={release(K.Z)}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12" />
      <Btn label="Y" onPress={press(K.A)} onRelease={release(K.A)}
        className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12" />
      <Btn label="A" onPress={press(K.X)} onRelease={release(K.X)}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12" />
    </div>
  );
}

export default function TouchGamepad({ canvasRef, consoleName, visible }: TouchGamepadProps) {
  const [opacity, setOpacity] = useState(1);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-fade tras 3.5s sin interacción
  useEffect(() => {
    const reset = () => {
      setOpacity(1);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setOpacity(0.35), 3500);
    };
    reset();
    window.addEventListener("touchstart", reset, { passive: true });
    return () => {
      window.removeEventListener("touchstart", reset);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  const press = (k: KeyMap) => () => dispatchKey(canvasRef.current, "keydown", k);
  const release = (k: KeyMap) => () => dispatchKey(canvasRef.current, "keyup", k);

  const showShoulders =
    consoleName === "snes" || consoleName === "gba" || consoleName === "n64" ||
    consoleName === "ps1" || consoleName === "arcade";

  return (
    <div
      className="absolute inset-0 z-[55] pointer-events-none transition-opacity duration-300"
      style={{ opacity }}
    >
      {/* L / R (shoulder buttons) - arriba a los lados */}
      {showShoulders && (
        <>
          <div className="absolute top-2 left-2 pointer-events-auto">
            <Btn label="L" onPress={press(K.Q)} onRelease={release(K.Q)}
              className="w-14 h-9 !rounded-lg" small />
          </div>
          <div className="absolute top-2 right-2 pointer-events-auto">
            <Btn label="R" onPress={press(K.W)} onRelease={release(K.W)}
              className="w-14 h-9 !rounded-lg" small />
          </div>
        </>
      )}

      {/* D-Pad - abajo izquierda */}
      <div className="absolute bottom-3 left-3 pointer-events-auto">
        <DPad canvas={canvasRef} />
      </div>

      {/* Acción - abajo derecha */}
      <div className="absolute bottom-3 right-3 pointer-events-auto">
        <ActionCluster canvas={canvasRef} consoleName={consoleName} />
      </div>

      {/* Start / Select - centro inferior */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto">
        <Btn label="SELECT" onPress={press(K.ShiftRight)} onRelease={release(K.ShiftRight)}
          className="w-16 h-7 !rounded-full" small />
        <Btn label="START" onPress={press(K.Enter)} onRelease={release(K.Enter)}
          className="w-16 h-7 !rounded-full" small />
      </div>
    </div>
  );
}
