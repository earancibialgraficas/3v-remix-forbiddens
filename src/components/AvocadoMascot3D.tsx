import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragonMascotEventType } from "@/mascot/dragonMascotConfig";
import { cn } from "@/lib/utils";

type AvocadoMascot3DProps = {
  gameName?: string;
  className?: string;
};

type MascotEventDetail = {
  type?: DragonMascotEventType;
  message?: string;
};

type MascotPosition = {
  x: number;
  y: number;
};

type AvocadoAnimation = "idle" | "walk" | "talk" | "happy" | "sad" | "sleep" | "drag";

const MASCOT_EVENT = "forbiddens:dragon-mascot";
const AVOCADO_IMAGE_URL = "/mascot/avocado/base.png?v=20260625-4";
const MASCOT_WIDTH = 210;
const MASCOT_HEIGHT = 210;
const GROUND_GAP = 2;

const eventAnimation: Record<DragonMascotEventType, AvocadoAnimation> = {
  greeting: "happy",
  play: "happy",
  pause: "sleep",
  save: "happy",
  load: "talk",
  settings: "talk",
  reset: "happy",
  mute: "talk",
  unmute: "happy",
  music: "talk",
  error: "sad",
  idle: "idle",
  click: "happy",
};

const avocadoDialogues: Record<DragonMascotEventType, string[]> = {
  greeting: ["Estoy lista, cremosita y peligrosa.", "Palta en posicion. Ahora juega bonito."],
  play: ["Vamos con todo.", "Aplasta botones, no esperanzas."],
  pause: ["Pausa aceptada. Respira.", "Me quedo quietita... por ahora."],
  save: ["Guardado rico.", "Ese progreso quedo fresquito."],
  load: ["Volvemos a ese momento.", "Cargando tu segunda oportunidad."],
  settings: ["Ajustemos la receta.", "Menu abierto. Que nada explote."],
  reset: ["Reinicio servido.", "Otra vuelta, sin dramas."],
  mute: ["Modo silencioso.", "Shhh, palta zen."],
  unmute: ["Sonido de vuelta.", "Ya escucho la aventura."],
  music: ["Esa playlist combina.", "Musiquita lista."],
  error: ["Eso salio medio machacado.", "Uy, eso no estaba maduro."],
  idle: ["Sigo aqui abajo.", "Estoy mirando el juego."],
  click: ["Suave, soy premium.", "Hey, cuidado con la palta."],
};

const pickLine = (type: DragonMascotEventType) => {
  const lines = avocadoDialogues[type] || avocadoDialogues.idle;
  return lines[Math.floor(Math.random() * lines.length)] || "";
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function AvocadoMascot3D({ gameName, className }: AvocadoMascot3DProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLButtonElement>(null);
  const motionRef = useRef<HTMLSpanElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const hideBubbleTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const dragRef = useRef({ pointerId: -1, offsetX: 0, offsetY: 0 });
  const animationNameRef = useRef<AvocadoAnimation>("idle");

  const [position, setPosition] = useState<MascotPosition>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [animationName, setAnimationName] = useState<AvocadoAnimation>("idle");

  useEffect(() => {
    animationNameRef.current = animationName;
  }, [animationName]);

  const title = useMemo(() => {
    const trimmed = String(gameName || "").trim();
    return trimmed ? `Palta acompana ${trimmed}` : "Mascota Palta";
  }, [gameName]);

  const groundY = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return 0;
    return Math.max(GROUND_GAP, stage.clientHeight - MASCOT_HEIGHT - GROUND_GAP);
  }, []);

  const clampPosition = useCallback((x: number, y: number) => {
    const stage = stageRef.current;
    if (!stage) return { x, y };
    return {
      x: clamp(x, 4, Math.max(4, stage.clientWidth - MASCOT_WIDTH - 4)),
      y: clamp(y, 4, Math.max(4, stage.clientHeight - MASCOT_HEIGHT - GROUND_GAP)),
    };
  }, []);

  const playBlip = useCallback((index: number) => {
    if (typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    try {
      const context = audioContextRef.current || new AudioContextCtor();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const pitch = 610 + ((index * 53) % 220);
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(pitch, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(260, pitch * 0.76), context.currentTime + 0.052);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.044, context.currentTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.058);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.062);
    } catch {
      // Audio can be blocked until the user interacts with the page.
    }
  }, []);

  const speak = useCallback((text: string, nextAnimation: AvocadoAnimation = "talk") => {
    if (!text) return;
    if (hideBubbleTimerRef.current) window.clearTimeout(hideBubbleTimerRef.current);
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    setAnimationName(nextAnimation === "sleep" ? "talk" : nextAnimation);
    setMessage(text);
    setTypedMessage("");
    setBubbleVisible(true);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const sync = () => {
      setPosition((current) => {
        const initialX = current.x || Math.max(4, stage.clientWidth - MASCOT_WIDTH - 12);
        return clampPosition(initialX, groundY());
      });
      setReady(true);
    };

    sync();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    observer?.observe(stage);
    window.addEventListener("resize", sync);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [clampPosition, groundY]);

  useEffect(() => {
    let startedAt = performance.now();
    const render = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const motion = motionRef.current;
      if (motion) {
        const state = animationNameRef.current;
        const isDrag = state === "drag";
        const isHappy = state === "happy";
        const isTalk = state === "talk";
        const isSleep = state === "sleep";
        const isWalk = state === "walk";
        const y = isSleep
          ? 12 + Math.sin(elapsed * 1.8) * 2
          : Math.sin(elapsed * (isTalk ? 9.5 : isWalk ? 10.5 : 2.4)) * (isTalk ? 13 : isWalk ? 15 : 9) + (isDrag ? 14 : 0);
        const rotation = isSleep
          ? -13 + Math.sin(elapsed * 1.4) * 1.4
          : Math.sin(elapsed * (isTalk ? 8.5 : isHappy ? 7.8 : isWalk ? 9 : 1.9)) * (isTalk ? 5 : isHappy ? 9 : isWalk ? 7 : 2.8);
        const scaleX = isTalk ? 1 + Math.sin(elapsed * 14) * 0.035 : isHappy ? 1.04 : 1;
        const scaleY = isTalk ? 1 - Math.sin(elapsed * 14) * 0.03 : isHappy ? 0.98 : 1;
        motion.style.transform = `translateY(${y}px) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
      }
      animationFrameRef.current = window.requestAnimationFrame(render);
    };

    animationFrameRef.current = window.requestAnimationFrame(render);
    return () => {
      startedAt = 0;
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    let index = 0;
    typingTimerRef.current = window.setInterval(() => {
      index += 1;
      setTypedMessage(message.slice(0, index));
      const char = message[index - 1];
      if (char && /[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/.test(char)) playBlip(index);
      if (index >= message.length) {
        if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
        hideBubbleTimerRef.current = window.setTimeout(() => {
          setBubbleVisible(false);
          setAnimationName("idle");
        }, Math.min(5000, Math.max(2100, message.length * 78)));
      }
    }, 38);
    return () => {
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    };
  }, [message, playBlip]);

  useEffect(() => {
    const onMascotEvent = (event: Event) => {
      const detail = (event as CustomEvent<MascotEventDetail>).detail || {};
      const type = detail.type || "idle";
      const nextAnimation = eventAnimation[type] || "talk";
      speak(detail.message || pickLine(type), nextAnimation);
    };
    window.addEventListener(MASCOT_EVENT, onMascotEvent);
    return () => window.removeEventListener(MASCOT_EVENT, onMascotEvent);
  }, [speak]);

  useEffect(() => {
    const schedule = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        if (dragging || bubbleVisible) {
          schedule();
          return;
        }
        const roll = Math.random();
        if (roll < 0.3) {
          const stage = stageRef.current;
          if (stage) {
            const maxX = Math.max(4, stage.clientWidth - MASCOT_WIDTH - 4);
            const nextX = clamp(position.x + (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 88), 4, maxX);
            setAnimationName("walk");
            setPosition((current) => clampPosition(nextX, current.y));
            window.setTimeout(() => setAnimationName("idle"), 1500);
          }
        } else if (roll < 0.42) {
          setAnimationName("sleep");
        } else if (roll < 0.58) {
          setAnimationName("happy");
          window.setTimeout(() => setAnimationName("idle"), 900);
        } else {
          setAnimationName("idle");
        }
        schedule();
      }, 7_000 + Math.random() * 9_000);
    };
    schedule();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [bubbleVisible, clampPosition, dragging, position.x]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      if (hideBubbleTimerRef.current) window.clearTimeout(hideBubbleTimerRef.current);
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    };
  }, []);

  const finishDrag = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    setSettling(true);
    setPosition((current) => clampPosition(current.x, groundY()));
    window.setTimeout(() => {
      setSettling(false);
      setAnimationName("idle");
    }, 520);
  }, [clampPosition, dragging, groundY]);

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - stageRect.left - position.x,
      offsetY: event.clientY - stageRect.top - position.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setBubbleVisible(false);
    setDragging(true);
    setSettling(false);
    setAnimationName("drag");
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging || event.pointerId !== dragRef.current.pointerId) return;
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    const x = event.clientX - stageRect.left - dragRef.current.offsetX;
    const y = event.clientY - stageRect.top - dragRef.current.offsetY;
    setPosition(clampPosition(x, y));
  };

  const handleClick = () => {
    if (dragging || settling) return;
    speak(pickLine("click"), "happy");
  };

  const mascotStyle = {
    left: position.x,
    top: position.y,
    width: MASCOT_WIDTH,
    height: MASCOT_HEIGHT,
    transition: settling
      ? "top 520ms cubic-bezier(.18,.86,.22,1.08), left 260ms ease-out"
      : animationName === "walk"
        ? "left 1500ms linear"
        : "none",
    opacity: ready ? 1 : 0,
  } as const;

  return (
    <div ref={stageRef} className={cn("notranslate pointer-events-none absolute inset-0 overflow-hidden", className)} data-native-action translate="no">
      {bubbleVisible && (
        <div
          className="pointer-events-none absolute z-[110] max-w-[min(300px,78vw)] rounded-[18px] border-2 border-[#22380d] bg-[#f7ffd8] px-3.5 py-2.5 shadow-[5px_6px_0_rgba(34,56,13,0.55)]"
          translate="no"
          style={{
            left: clamp(position.x - 76, 10, Math.max(10, (stageRef.current?.clientWidth || 360) - 308)),
            top: Math.max(8, position.y - 74),
          }}
        >
          <div className="absolute -bottom-[11px] left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#22380d] bg-[#f7ffd8]" />
          <p className="notranslate relative z-10 min-h-[2rem] text-[11px] font-black leading-snug text-[#22380d]" translate="no">
            {typedMessage}
            <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-[#22380d] align-[-2px]" />
          </p>
        </div>
      )}

      <button
        ref={mascotRef}
        type="button"
        onClick={handleClick}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        className={cn(
          "pointer-events-auto absolute z-[105] flex items-end justify-center bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-lime-200/70",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={mascotStyle}
        title={title}
        aria-label={title}
      >
        <span className="pointer-events-none absolute bottom-3 left-1/2 h-5 w-[58%] -translate-x-1/2 rounded-full bg-black/30 blur-md" />
        <span
          ref={motionRef}
          className="pointer-events-none relative z-10 block h-full w-full will-change-transform"
          style={{ transformOrigin: "50% 82%", transform: "translateY(0) rotate(0deg) scale(1)" }}
        >
          <img
            src={AVOCADO_IMAGE_URL}
            alt=""
            draggable={false}
            className="h-full w-full object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.52)]"
          />
        </span>
      </button>
    </div>
  );
}
