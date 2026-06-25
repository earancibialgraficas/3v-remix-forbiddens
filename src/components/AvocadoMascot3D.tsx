import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
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
const MODEL_URL = "/mascot/avocado/avocado_mascot.glb?v=20260625-2";
const MASCOT_WIDTH = 226;
const MASCOT_HEIGHT = 236;
const GROUND_GAP = 0;

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const modelRootRef = useRef<THREE.Group | null>(null);
  const modelBaseScaleRef = useRef(1);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const hideBubbleTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
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
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(MASCOT_WIDTH, MASCOT_HEIGHT, false);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-2.05, 2.05, 2.2, -2.2, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);
    camera.lookAt(0, 0.05, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x604040, 1.95));
    const keyLight = new THREE.DirectionalLight(0xfff4dc, 2.35);
    keyLight.position.set(2.4, 4.2, 4.6);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xff9fbc, 1.1);
    rimLight.position.set(-3, 2, 2);
    scene.add(rimLight);

    const loader = new GLTFLoader();
    let disposed = false;
    loader.load(MODEL_URL, (gltf) => {
      if (disposed) return;
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      model.position.set(-center.x, -center.y, -center.z);
      const baseScale = 2.28 / maxAxis;
      const root = new THREE.Group();
      root.scale.setScalar(baseScale);
      root.add(model);
      modelBaseScaleRef.current = baseScale;
      root.rotation.y = -0.05;
      scene.add(root);
      modelRootRef.current = root;

      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;
      const actions: Record<string, THREE.AnimationAction> = {};
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.clampWhenFinished = false;
        actions[clip.name] = action;
      });
      actionsRef.current = actions;
      const first = actions.idle || Object.values(actions)[0];
      if (first) {
        first.reset().fadeIn(0.12).play();
        activeActionRef.current = first;
      }
    });

    const clock = new THREE.Clock();
    const render = () => {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      mixerRef.current?.update(delta);
      const modelRoot = modelRootRef.current;
      if (modelRoot) {
        const baseScale = modelBaseScaleRef.current || 1;
        const state = animationNameRef.current;
        const isDrag = state === "drag";
        const isHappy = state === "happy";
        const isTalk = state === "talk";
        const isSleep = state === "sleep";
        const isWalk = state === "walk";
        modelRoot.position.y = isSleep
          ? -0.2 + Math.sin(elapsed * 1.8) * 0.018
          : Math.sin(elapsed * (isTalk ? 8.5 : isWalk ? 9.2 : 2.2)) * (isTalk ? 0.08 : isWalk ? 0.1 : 0.045) + (isDrag ? 0.16 : 0);
        modelRoot.rotation.z = isSleep
          ? -0.42
          : Math.sin(elapsed * (isTalk ? 7.5 : isHappy ? 6.8 : isWalk ? 8 : 1.8)) * (isTalk ? 0.08 : isHappy ? 0.12 : isWalk ? 0.1 : 0.035);
        modelRoot.rotation.y = -0.05 + Math.sin(elapsed * 1.3) * 0.045;
        const squash = isTalk ? Math.sin(elapsed * 13) * 0.035 : isHappy ? Math.sin(elapsed * 9) * 0.045 : 0;
        modelRoot.scale.set(
          baseScale * (1 - squash * 0.45),
          baseScale * (1 + squash),
          baseScale,
        );
      }
      renderer.render(scene, camera);
      animationFrameRef.current = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
      mixerRef.current?.stopAllAction();
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
      rendererRef.current = null;
      mixerRef.current = null;
      modelRootRef.current = null;
      actionsRef.current = {};
      activeActionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const action = actionsRef.current[animationName] || actionsRef.current.idle;
    if (!action || activeActionRef.current === action) return;
    const previous = activeActionRef.current;
    action.reset().fadeIn(0.14).play();
    previous?.fadeOut(0.14);
    activeActionRef.current = action;
  }, [animationName]);

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
        if (roll < 0.28) {
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
        } else {
          setAnimationName("idle");
        }
        schedule();
      }, 12_000 + Math.random() * 18_000);
    };
    schedule();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [bubbleVisible, clampPosition, dragging, position.x]);

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
        <span className="pointer-events-none absolute bottom-2 left-1/2 h-5 w-[58%] -translate-x-1/2 rounded-full bg-black/30 blur-md" />
        <canvas
          ref={canvasRef}
          width={MASCOT_WIDTH}
          height={MASCOT_HEIGHT}
          draggable={false}
          className="pointer-events-none relative z-10 h-full w-full drop-shadow-[0_12px_18px_rgba(0,0,0,0.52)]"
          style={{
            transformOrigin: "50% 12%",
            transform: dragging ? "translateY(8px) rotate(-4deg) scaleY(0.97)" : undefined,
          }}
        />
      </button>
    </div>
  );
}
