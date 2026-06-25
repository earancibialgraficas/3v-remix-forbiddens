import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DragonMascotAnimationId,
  DragonMascotEventType,
  dragonMascotAnimations,
  dragonMascotEventAnimation,
  pickDragonLine,
} from "@/mascot/dragonMascotConfig";
import { cn } from "@/lib/utils";

type DragonMascotProps = {
  gameName?: string;
  className?: string;
};

type DragonMascotEventDetail = {
  type?: DragonMascotEventType;
  message?: string;
};

type MascotPosition = {
  x: number;
  y: number;
};

const MASCOT_EVENT = "forbiddens:dragon-mascot";
const MASCOT_WIDTH = 174;
const MASCOT_HEIGHT = 154;
const GROUND_GAP = 2;
const IDLE_SLEEP_AFTER_MS = 62_000;

const isDragonEventType = (value: unknown): value is DragonMascotEventType =>
  typeof value === "string" && value in dragonMascotEventAnimation;

export const emitDragonMascotEvent = (type: DragonMascotEventType, message?: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DragonMascotEventDetail>(MASCOT_EVENT, { detail: { type, message } }));
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function DragonMascot({ gameName, className }: DragonMascotProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLButtonElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastBlipAtRef = useRef(0);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<number | null>(null);
  const hideBubbleTimerRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const walkTimerRef = useRef<number | null>(null);
  const sleepTransitionTimerRef = useRef<number | null>(null);
  const lastInteractionRef = useRef(Date.now());
  const cooldownRef = useRef<Record<string, number>>({});
  const dragRef = useRef({ pointerId: -1, offsetX: 0, offsetY: 0 });

  const [animationId, setAnimationId] = useState<DragonMascotAnimationId>("idle");
  const [frameIndex, setFrameIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [position, setPosition] = useState<MascotPosition>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [walking, setWalking] = useState(false);
  const [walkDurationMs, setWalkDurationMs] = useState(1800);

  const animation = dragonMascotAnimations[animationId] || dragonMascotAnimations.idle;
  const currentFrame = animation.frames[Math.min(frameIndex, animation.frames.length - 1)] || animation.frames[0];
  const sleeping = animationId === "sleep" || animationId === "lie_down";

  const title = useMemo(() => {
    const trimmed = String(gameName || "").trim();
    return trimmed ? `Noxito acompana ${trimmed}` : "Noxito";
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

  const markInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    if (sleeping) {
      if (sleepTransitionTimerRef.current) window.clearTimeout(sleepTransitionTimerRef.current);
      setAnimationId("wake");
      setFrameIndex(0);
    }
  }, [sleeping]);

  const setNaturalIdle = useCallback(() => {
    setAnimationId(Math.random() < 0.24 ? "idle_sit" : "idle");
    setFrameIndex(0);
  }, []);

  const playBlip = useCallback((index: number) => {
    if (typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const nowMs = performance.now();
    if (nowMs - lastBlipAtRef.current < 42) return;
    lastBlipAtRef.current = nowMs;

    try {
      const context = audioContextRef.current || new AudioContextCtor();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const pitch = 700 + ((index * 71) % 190);
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(pitch, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(300, pitch * 0.72), context.currentTime + 0.05);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.054);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.06);
    } catch {
      // Browsers can block audio before user interaction; the bubble remains enough feedback.
    }
  }, []);

  const speak = useCallback((text: string, nextAnimation: DragonMascotAnimationId = "talk") => {
    if (!text || dragging) return;
    markInteraction();
    if (hideBubbleTimerRef.current) window.clearTimeout(hideBubbleTimerRef.current);
    setMessage(text);
    setTypedMessage("");
    setBubbleVisible(true);
    void nextAnimation;
    setAnimationId("talk");
    setFrameIndex(0);
  }, [dragging, markInteraction]);

  const canUseCooldown = useCallback((key: string, ms: number) => {
    const now = Date.now();
    if ((cooldownRef.current[key] || 0) > now) return false;
    cooldownRef.current[key] = now + ms;
    return true;
  }, []);

  useEffect(() => {
    const syncInitialPosition = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const x = Math.max(4, stage.clientWidth - MASCOT_WIDTH - 12);
      const y = Math.max(GROUND_GAP, stage.clientHeight - MASCOT_HEIGHT - GROUND_GAP);
      setPosition({ x, y });
      setReady(true);
    };

    syncInitialPosition();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
      setPosition((current) => clampPosition(current.x, groundY()));
    }) : null;
    if (observer && stageRef.current) observer.observe(stageRef.current);
    window.addEventListener("resize", syncInitialPosition);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", syncInitialPosition);
    };
  }, [clampPosition, groundY]);

  const startRandomWalk = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || dragging || bubbleVisible) return false;

    const maxX = Math.max(4, stage.clientWidth - MASCOT_WIDTH - 4);
    const currentX = position.x;
    const canGoLeft = currentX > 34;
    const canGoRight = currentX < maxX - 34;
    if (!canGoLeft && !canGoRight) return false;

    const direction = canGoLeft && canGoRight
      ? (Math.random() < 0.5 ? -1 : 1)
      : canGoLeft ? -1 : 1;
    const distance = 72 + Math.random() * 96;
    const targetX = clamp(currentX + direction * distance, 4, maxX);
    const duration = 1500 + Math.abs(targetX - currentX) * 10;

    if (walkTimerRef.current) window.clearTimeout(walkTimerRef.current);
    setWalking(true);
    setWalkDurationMs(duration);
    setAnimationId(direction < 0 ? "walk_left" : "walk_right");
    setFrameIndex(0);
    window.requestAnimationFrame(() => {
      setPosition((current) => clampPosition(targetX, groundY()));
    });
    walkTimerRef.current = window.setTimeout(() => {
      setWalking(false);
      setNaturalIdle();
    }, duration + 80);
    return true;
  }, [bubbleVisible, clampPosition, dragging, groundY, position.x, setNaturalIdle]);

  useEffect(() => {
    if (!message) return;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setTypedMessage(message.slice(0, index));
      const char = message[index - 1];
      if (char && /[a-zA-Z0-9áéíóúñÁÉÍÓÚÑ]/.test(char)) playBlip(index);
      if (index >= message.length) {
        window.clearInterval(timer);
        hideBubbleTimerRef.current = window.setTimeout(() => {
          setBubbleVisible(false);
          setNaturalIdle();
        }, Math.min(5200, Math.max(2200, message.length * 82)));
      }
    }, 38);
    return () => window.clearInterval(timer);
  }, [message, playBlip, setNaturalIdle]);

  useEffect(() => {
    const ms = Math.max(90, Math.round(1000 / animation.fps));
    const timer = window.setInterval(() => {
      setFrameIndex((current) => {
        const next = current + 1;
        if (next < animation.frames.length) return next;
        if (animation.loop) return 0;
        setAnimationId(animation.fallback || "idle");
        return 0;
      });
    }, ms);
    return () => window.clearInterval(timer);
  }, [animation.fallback, animation.fps, animation.frames.length, animation.loop]);

  useEffect(() => {
    const onMascotEvent = (event: Event) => {
      const detail = (event as CustomEvent<DragonMascotEventDetail>).detail || {};
      const eventType = isDragonEventType(detail.type) ? detail.type : "idle";
      const nextAnimation = dragonMascotEventAnimation[eventType] || "talk";
      speak(detail.message || pickDragonLine(eventType), nextAnimation);
    };
    window.addEventListener(MASCOT_EVENT, onMascotEvent);
    return () => window.removeEventListener(MASCOT_EVENT, onMascotEvent);
  }, [speak]);

  useEffect(() => {
    const scheduleIdle = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      const delay = 12_000 + Math.random() * 14_000;
      idleTimerRef.current = window.setTimeout(() => {
        if (dragging || bubbleVisible || walking) {
          scheduleIdle();
          return;
        }

        const idleFor = Date.now() - lastInteractionRef.current;
        if (idleFor > IDLE_SLEEP_AFTER_MS && canUseCooldown("sleep", 50_000)) {
          setAnimationId("lie_down");
          setFrameIndex(0);
          sleepTransitionTimerRef.current = window.setTimeout(() => {
            setAnimationId("sleep");
            setFrameIndex(0);
          }, 920);
          scheduleIdle();
          return;
        }

        const roll = Math.random();
        if (roll < 0.28 && canUseCooldown("walk", 16_000) && startRandomWalk()) {
          scheduleIdle();
          return;
        }
        if (roll < 0.56) {
          setAnimationId("blink");
        } else if (roll < 0.72) {
          setAnimationId("idle_sit");
        } else if (roll < 0.86 && canUseCooldown("attention", 28_000)) {
          setAnimationId("judge");
        } else if (roll < 0.95 && canUseCooldown("troll-soft", 42_000)) {
          setAnimationId("tongue");
        } else if (canUseCooldown("fart", 95_000)) {
          setAnimationId("fart");
        }
        setFrameIndex(0);
        scheduleIdle();
      }, delay);
    };

    scheduleIdle();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [bubbleVisible, canUseCooldown, dragging, startRandomWalk, walking]);

  useEffect(() => {
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      if (walkTimerRef.current) window.clearTimeout(walkTimerRef.current);
      if (sleepTransitionTimerRef.current) window.clearTimeout(sleepTransitionTimerRef.current);
      if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
      if (hideBubbleTimerRef.current) window.clearTimeout(hideBubbleTimerRef.current);
    };
  }, []);

  const finishDrag = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    setWalking(false);
    setSettling(true);
    setPosition((current) => clampPosition(current.x, groundY()));
    window.setTimeout(() => {
      setSettling(false);
      setNaturalIdle();
    }, 520);
  }, [clampPosition, dragging, groundY, setNaturalIdle]);

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    markInteraction();
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - stageRect.left - position.x,
      offsetY: event.clientY - stageRect.top - position.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setBubbleVisible(false);
    if (walkTimerRef.current) window.clearTimeout(walkTimerRef.current);
    setWalking(false);
    setDragging(true);
    setSettling(false);
    setAnimationId("drag");
    setFrameIndex(0);
  };

  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging || event.pointerId !== dragRef.current.pointerId) return;
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    const x = event.clientX - stageRect.left - dragRef.current.offsetX;
    const y = event.clientY - stageRect.top - dragRef.current.offsetY;
    setPosition(clampPosition(x, y));
  };

  const handleMascotClick = () => {
    if (dragging || settling) return;
    markInteraction();
    clickCountRef.current += 1;
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      const clicks = clickCountRef.current;
      clickCountRef.current = 0;
      if (clicks >= 3 && canUseCooldown("annoyed-click", 80_000)) {
        speak("Tocame otra vez y te muerdo.", "tongue");
      } else {
        speak(pickDragonLine("click"), "laugh");
      }
    }, 260);
  };

  const mascotStyle = {
    left: position.x,
    top: position.y,
    width: MASCOT_WIDTH,
    height: MASCOT_HEIGHT,
    transition: settling
      ? "top 520ms cubic-bezier(.18,.86,.22,1.08), left 260ms ease-out"
      : walking
        ? `left ${walkDurationMs}ms linear`
        : "none",
    opacity: ready ? 1 : 0,
  } as const;

  return (
    <div ref={stageRef} className={cn("notranslate pointer-events-none absolute inset-0 overflow-hidden", className)} data-native-action translate="no">
      {bubbleVisible && (
        <div
          className="pointer-events-none absolute z-[110] max-w-[min(310px,78vw)] rounded-[18px] border-2 border-[#351019] bg-[#fff3f8] px-3.5 py-2.5 shadow-[5px_6px_0_rgba(53,16,25,0.55)]"
          translate="no"
          style={{
            left: clamp(position.x - 86, 10, Math.max(10, (stageRef.current?.clientWidth || 360) - 318)),
            top: Math.max(8, position.y - 74),
          }}
        >
          <div className="absolute -bottom-[11px] left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#351019] bg-[#fff3f8]" />
          <p className="notranslate relative z-10 min-h-[2rem] text-[11px] font-black leading-snug text-[#351019]" translate="no">
            {typedMessage}
            <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-[#351019] align-[-2px]" />
          </p>
        </div>
      )}

      <button
        ref={mascotRef}
        type="button"
        onClick={handleMascotClick}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        className={cn(
          "pointer-events-auto absolute z-[105] flex items-end justify-center bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-red-300/70",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={mascotStyle}
        title={title}
        aria-label={title}
      >
        <span className="pointer-events-none absolute bottom-1 left-1/2 h-5 w-[58%] -translate-x-1/2 rounded-full bg-black/32 blur-md" />
        {dragging && (
          <span className="pointer-events-none absolute left-1/2 top-1 z-20 h-7 w-7 -translate-x-1/2 rounded-full border border-red-200/55 bg-red-100/15 shadow-[0_0_16px_rgba(255,160,180,0.25)]" />
        )}
        <img
          src={currentFrame}
          alt=""
          draggable={false}
          className={cn(
            "pointer-events-none relative z-10 max-h-[156px] max-w-[176px] object-contain drop-shadow-[0_11px_16px_rgba(0,0,0,0.58)]",
            dragging && "animate-[dragon-held-wiggle_780ms_ease-in-out_infinite]",
          )}
          style={{
            imageRendering: "pixelated",
            transformOrigin: "50% 12%",
            transform: dragging
              ? "translateY(10px) rotate(-5deg) scaleY(0.96)"
              : settling
                ? "translateY(0) scaleY(1.03)"
                : undefined,
          }}
        />
      </button>
    </div>
  );
}
