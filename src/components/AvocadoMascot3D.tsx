import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
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
const MASCOT_WIDTH = 236;
const MASCOT_HEIGHT = 268;
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

const makeLimb = (height: number, radius: number, color: number) => {
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.92, height, 18);
  geometry.translate(0, -height / 2, 0);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.05,
  });
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
};

const makeAvocadoModel = () => {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const outer = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 48),
    new THREE.MeshStandardMaterial({
      color: 0x2f7d3a,
      roughness: 0.72,
      metalness: 0.03,
    }),
  );
  outer.scale.set(0.92, 1.28, 0.22);
  outer.castShadow = true;
  body.add(outer);

  const flesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 48),
    new THREE.MeshStandardMaterial({
      color: 0xd8e88e,
      roughness: 0.82,
      metalness: 0.02,
    }),
  );
  flesh.position.set(0, -0.02, 0.075);
  flesh.scale.set(0.78, 1.08, 0.16);
  flesh.castShadow = true;
  body.add(flesh);

  const seed = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x7a5a35,
      roughness: 0.5,
      metalness: 0.08,
    }),
  );
  seed.position.set(0, -0.12, 0.26);
  seed.scale.set(1.0, 1.08, 0.72);
  seed.castShadow = true;
  body.add(seed);

  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x050506,
    roughness: 0.25,
    metalness: 0.08,
  });
  const eyeHighlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 18, 18), eyeMaterial);
  const rightEye = leftEye.clone();
  leftEye.position.set(-0.27, -0.31, 0.265);
  rightEye.position.set(0.27, -0.31, 0.265);
  leftEye.scale.set(1, 1, 0.55);
  rightEye.scale.set(1, 1, 0.55);
  body.add(leftEye, rightEye);

  const leftSpark = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 10), eyeHighlightMaterial);
  const rightSpark = leftSpark.clone();
  leftSpark.position.set(-0.287, -0.292, 0.302);
  rightSpark.position.set(0.253, -0.292, 0.302);
  body.add(leftSpark, rightSpark);

  const smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.13, -0.48, 0.285),
    new THREE.Vector3(0, -0.59, 0.32),
    new THREE.Vector3(0.13, -0.48, 0.285),
  );
  const smile = new THREE.Mesh(
    new THREE.TubeGeometry(smileCurve, 24, 0.012, 8, false),
    new THREE.MeshStandardMaterial({ color: 0x151009, roughness: 0.5 }),
  );
  body.add(smile);

  const leftArm = makeLimb(0.82, 0.038, 0x8a6b30);
  const rightArm = makeLimb(0.82, 0.038, 0x8a6b30);
  leftArm.position.set(-0.58, -0.42, 0.01);
  rightArm.position.set(0.58, -0.42, 0.01);
  leftArm.rotation.z = 0.48;
  rightArm.rotation.z = -0.48;
  body.add(leftArm, rightArm);

  const leftLeg = makeLimb(0.64, 0.045, 0x7f622d);
  const rightLeg = makeLimb(0.64, 0.045, 0x7f622d);
  leftLeg.position.set(-0.26, -1.13, -0.01);
  rightLeg.position.set(0.26, -1.13, -0.01);
  body.add(leftLeg, rightLeg);

  const parts = {
    root,
    body,
    seed,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    leftEye,
    rightEye,
    smile,
  };
  return parts;
};

export default function AvocadoMascot3D({ gameName, className }: AvocadoMascot3DProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<ReturnType<typeof makeAvocadoModel> | null>(null);
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
    const camera = new THREE.OrthographicCamera(-1.75, 1.75, 1.95, -1.95, 0.1, 100);
    camera.position.set(0, 0.1, 5.2);
    camera.lookAt(0, -0.25, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x42321d, 1.65));
    const keyLight = new THREE.DirectionalLight(0xfff1cc, 2.4);
    keyLight.position.set(2.4, 3.8, 4.2);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xb8ff8a, 0.8);
    rimLight.position.set(-2.6, 1.6, 2.4);
    scene.add(rimLight);

    const model = makeAvocadoModel();
    model.root.scale.setScalar(1.05);
    scene.add(model.root);
    modelRef.current = model;

    const clock = new THREE.Clock();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      const state = animationNameRef.current;
      const avocado = modelRef.current;
      if (avocado) {
        const isDrag = state === "drag";
        const isHappy = state === "happy";
        const isTalk = state === "talk";
        const isSleep = state === "sleep";
        const isWalk = state === "walk";
        const bounce = Math.sin(elapsed * (isTalk ? 9.5 : isWalk ? 10.5 : 2.4));
        const sway = Math.sin(elapsed * (isTalk ? 8.5 : isHappy ? 7.8 : isWalk ? 9 : 1.9));

        avocado.root.position.y = isSleep ? -0.2 + Math.sin(elapsed * 1.7) * 0.025 : bounce * (isTalk ? 0.12 : isWalk ? 0.13 : 0.075) + (isDrag ? 0.16 : 0);
        avocado.root.rotation.z = isSleep ? -0.24 + Math.sin(elapsed * 1.4) * 0.02 : sway * (isTalk ? 0.075 : isHappy ? 0.14 : isWalk ? 0.11 : 0.045);
        avocado.root.rotation.y = -0.08 + Math.sin(elapsed * 1.15) * 0.1;
        avocado.body.scale.set(
          isTalk ? 1 + Math.sin(elapsed * 13) * 0.035 : isHappy ? 1.04 : 1,
          isTalk ? 1 - Math.sin(elapsed * 13) * 0.03 : isHappy ? 0.98 : 1,
          1,
        );

        avocado.seed.position.y = -0.12 + (isTalk ? Math.sin(elapsed * 12) * 0.018 : 0);
        avocado.leftArm.rotation.z = 0.48 + (isTalk ? Math.sin(elapsed * 11) * 0.32 : isHappy ? -0.46 + Math.sin(elapsed * 9) * 0.18 : isWalk ? Math.sin(elapsed * 10.5) * 0.42 : Math.sin(elapsed * 2.1) * 0.08);
        avocado.rightArm.rotation.z = -0.48 + (isTalk ? -Math.sin(elapsed * 11) * 0.32 : isHappy ? 0.46 - Math.sin(elapsed * 9) * 0.18 : isWalk ? -Math.sin(elapsed * 10.5) * 0.42 : -Math.sin(elapsed * 2.1) * 0.08);
        avocado.leftLeg.rotation.z = isSleep ? 0.12 : isWalk ? Math.sin(elapsed * 10.5) * 0.26 : Math.sin(elapsed * 2.1) * 0.035;
        avocado.rightLeg.rotation.z = isSleep ? -0.12 : isWalk ? -Math.sin(elapsed * 10.5) * 0.26 : -Math.sin(elapsed * 2.1) * 0.035;
        avocado.leftEye.scale.y = isSleep ? 0.18 : 1;
        avocado.rightEye.scale.y = isSleep ? 0.18 : 1;
      }
      renderer.render(scene, camera);
      animationFrameRef.current = window.requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
      rendererRef.current = null;
      modelRef.current = null;
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
        />
      </button>
    </div>
  );
}
