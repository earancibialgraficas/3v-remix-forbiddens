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

const MASCOT_EVENT = "forbiddens:dragon-mascot";

const isDragonEventType = (value: unknown): value is DragonMascotEventType =>
  typeof value === "string" && value in dragonMascotEventAnimation;

export const emitDragonMascotEvent = (type: DragonMascotEventType, message?: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DragonMascotEventDetail>(MASCOT_EVENT, { detail: { type, message } }));
};

export default function DragonMascot({ gameName, className }: DragonMascotProps) {
  const [animationId, setAnimationId] = useState<DragonMascotAnimationId>("idle");
  const [frameIndex, setFrameIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastBlipAtRef = useRef(0);
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<number | null>(null);
  const hideBubbleTimerRef = useRef<number | null>(null);

  const animation = dragonMascotAnimations[animationId] || dragonMascotAnimations.idle;
  const currentFrame = animation.frames[Math.min(frameIndex, animation.frames.length - 1)] || animation.frames[0];

  const title = useMemo(() => {
    const trimmed = String(gameName || "").trim();
    return trimmed ? `Dragon companion de ${trimmed}` : "Dragon companion";
  }, [gameName]);

  const playBlip = useCallback((index: number) => {
    if (typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const nowMs = performance.now();
    if (nowMs - lastBlipAtRef.current < 32) return;
    lastBlipAtRef.current = nowMs;

    try {
      const context = audioContextRef.current || new AudioContextCtor();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const pitch = 720 + ((index * 83) % 220);
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(pitch, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(280, pitch * 0.68), context.currentTime + 0.055);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.058);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.065);
    } catch {
      // Audio can be blocked before a user gesture; the text bubble still works.
    }
  }, []);

  const speak = useCallback((text: string, nextAnimation: DragonMascotAnimationId = "talk") => {
    if (!text) return;
    if (hideBubbleTimerRef.current) window.clearTimeout(hideBubbleTimerRef.current);
    setMessage(text);
    setTypedMessage("");
    setBubbleVisible(true);
    setAnimationId(nextAnimation);
    setFrameIndex(0);
  }, []);

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
          setAnimationId("idle");
          setFrameIndex(0);
        }, Math.min(5200, Math.max(2200, message.length * 90)));
      }
    }, 38);
    return () => window.clearInterval(timer);
  }, [message, playBlip]);

  useEffect(() => {
    const ms = Math.max(70, Math.round(1000 / animation.fps));
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
    const timer = window.setInterval(() => {
      if (bubbleVisible) return;
      if (Math.random() < 0.42) {
        setAnimationId("blink");
        setFrameIndex(0);
      }
    }, 6500);
    return () => window.clearInterval(timer);
  }, [bubbleVisible]);

  const handleMascotClick = () => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      const clicks = clickCountRef.current;
      clickCountRef.current = 0;
      speak(clicks >= 3 ? "Ey. Patitas quietas." : pickDragonLine("click"), clicks >= 3 ? "laugh" : "tongue");
    }, 260);
  };

  return (
    <div className={cn("relative overflow-visible", className)} data-native-action>
      {bubbleVisible && (
        <div className="absolute left-2 right-2 top-1 z-20 rounded-lg border border-red-400/55 bg-[#13080b]/95 px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.38)]">
          <div className="absolute -bottom-2 left-12 h-4 w-4 rotate-45 border-b border-r border-red-400/55 bg-[#13080b]" />
          <p className="relative z-10 min-h-[2.2rem] text-[11px] font-semibold leading-snug text-red-50">
            {typedMessage}
            <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-red-200 align-[-2px]" />
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={handleMascotClick}
        className="relative mx-auto mt-8 flex h-[118px] w-full items-end justify-center overflow-visible rounded-lg border border-red-400/25 bg-gradient-to-b from-red-950/30 via-black/15 to-black/45 transition hover:border-red-300/45 hover:brightness-110"
        title={title}
        aria-label={title}
      >
        <span className="pointer-events-none absolute inset-x-8 bottom-2 h-5 rounded-full bg-black/35 blur-md" />
        <img
          src={currentFrame}
          alt=""
          draggable={false}
          className="pointer-events-none relative z-10 max-h-[132px] max-w-[94%] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.55)]"
          style={{ imageRendering: "pixelated" }}
        />
      </button>
    </div>
  );
}
