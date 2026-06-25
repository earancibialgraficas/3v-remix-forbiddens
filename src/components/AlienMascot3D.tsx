import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { DragonMascotEventType } from "@/mascot/dragonMascotConfig";
import { cn } from "@/lib/utils";

type AlienMascot3DProps = {
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

const MASCOT_EVENT = "forbiddens:dragon-mascot";
const MODEL_URL = "/mascot/alien/alien_animal.glb";
const MASCOT_WIDTH = 244;
const MASCOT_HEIGHT = 286;
const GROUND_GAP = 0;

const animationByEvent: Record<DragonMascotEventType, string> = {
  greeting: "Idel_Normal",
  play: "Run-Cycle",
  pause: "Idel_Normal",
  save: "Action_Rolls",
  load: "Walk-Cycle",
  settings: "Idle_Aggressive",
  reset: "Action_Rolls",
  mute: "Idel_Normal",
  unmute: "Idle_Aggressive",
  music: "Walk-Cycle",
  error: "Attack_Hit",
  idle: "Idel_Normal",
  click: "Attack_Bite",
};

const alienDialogues: Record<DragonMascotEventType, string[]> = {
  greeting: ["Unidad alienigena lista.", "Te acompano desde la orbita."],
  play: ["Movimiento detectado.", "Vamos a cazar pixeles."],
  pause: ["Pausa tactica.", "Me quedo vigilando."],
  save: ["Datos preservados.", "Progreso guardado en la nave."],
  load: ["Restaurando coordenadas.", "Volvemos al punto marcado."],
  settings: ["Escaneando opciones.", "Configuracion abierta."],
  reset: ["Reinicio orbital.", "Otra simulacion."],
  mute: ["Silencio interestelar.", "Audio oculto."],
  unmute: ["Senal recuperada.", "Volvio el sonido."],
  music: ["Frecuencia musical detectada.", "Buen ritmo para una invasion."],
  error: ["Anomalia detectada.", "Eso no salio segun el plan."],
  idle: ["Sigo observando.", "La nave esta en espera."],
  click: ["Contacto recibido.", "Hey, cuidado con las antenas."],
};

const pickLine = (type: DragonMascotEventType) => {
  const lines = alienDialogues[type] || alienDialogues.idle;
  return lines[Math.floor(Math.random() * lines.length)] || "";
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export default function AlienMascot3D({ gameName, className }: AlienMascot3DProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const hideBubbleTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dragRef = useRef({ pointerId: -1, offsetX: 0, offsetY: 0 });
  const motionRef = useRef("Idel_Normal");

  const [position, setPosition] = useState<MascotPosition>({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [motion, setMotion] = useState("Idel_Normal");

  useEffect(() => {
    motionRef.current = motion;
  }, [motion]);

  const title = useMemo(() => {
    const trimmed = String(gameName || "").trim();
    return trimmed ? `Alien acompana ${trimmed}` : "Mascota Alien";
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
      const pitch = 430 + ((index * 71) % 280);
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(pitch, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(210, pitch * 0.68), context.currentTime + 0.055);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.038, context.currentTime + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.064);
    } catch {
      // Audio can be blocked until the user interacts with the page.
    }
  }, []);

  const playAnimation = useCallback((name: string, fade = 0.18) => {
    const actions = actionsRef.current;
    const next = actions.get(name) || actions.get("Idel_Normal") || actions.values().next().value;
    if (!next) return;
    const previous = activeActionRef.current;
    next.enabled = true;
    next.reset();
    next.setEffectiveTimeScale(name.includes("Run") ? 0.72 : 0.9);
    next.setEffectiveWeight(1);
    if (previous && previous !== next) {
      previous.fadeOut(fade);
      next.fadeIn(fade);
    }
    next.play();
    activeActionRef.current = next;
  }, []);

  const speak = useCallback((text: string, clip = "Idel_Normal") => {
    if (!text) return;
    if (hideBubbleTimerRef.current) window.clearTimeout(hideBubbleTimerRef.current);
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    setMotion(clip);
    playAnimation(clip);
    setMessage(text);
    setTypedMessage("");
    setBubbleVisible(true);
  }, [playAnimation]);

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
    const camera = new THREE.OrthographicCamera(-1.55, 1.55, 1.85, -1.85, 0.1, 100);
    camera.position.set(0, 0.18, 5.4);
    camera.lookAt(0, -0.15, 0);

    scene.add(new THREE.HemisphereLight(0xdffff6, 0x1b1940, 1.8));
    const keyLight = new THREE.DirectionalLight(0xe5fff8, 2.3);
    keyLight.position.set(2.4, 3.6, 4.2);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x91ffdd, 1.15);
    rimLight.position.set(-2.8, 1.6, 2.6);
    scene.add(rimLight);

    let modelRoot: THREE.Group | null = null;
    let disposed = false;
    const clock = new THREE.Clock();
    const loader = new GLTFLoader();

    const installModel = (gltf: GLTF) => {
      if (disposed) return;
      modelRoot = new THREE.Group();
      const model = gltf.scene;
      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.frustumCulled = false;
          mesh.castShadow = true;
          mesh.receiveShadow = false;
        }
      });
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      model.position.sub(center);
      const scale = 2.55 / Math.max(size.x, size.y, size.z, 1);
      model.scale.setScalar(scale);
      model.rotation.set(0, Math.PI, 0);
      modelRoot.position.set(0, -0.18, 0);
      modelRoot.add(model);
      scene.add(modelRoot);

      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.loop = THREE.LoopRepeat;
        actionsRef.current.set(clip.name, action);
      });
      playAnimation("Idel_Normal", 0);
    };

    loader.load(MODEL_URL, installModel);

    const render = () => {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      mixerRef.current?.update(delta);
      if (modelRoot) {
        const currentMotion = motionRef.current;
        const isWalk = currentMotion.includes("Walk") || currentMotion.includes("Run");
        const isHit = currentMotion.includes("Attack") || currentMotion.includes("Action");
        const bob = Math.sin(elapsed * (isWalk ? 7.5 : isHit ? 8.5 : 2.1));
        modelRoot.position.y = -0.18 + (isWalk ? Math.abs(bob) * 0.045 : bob * 0.018);
        modelRoot.rotation.z = Math.sin(elapsed * (isWalk ? 5.5 : 1.4)) * (isWalk ? 0.045 : 0.018);
      }
      renderer.render(scene, camera);
      animationFrameRef.current = window.requestAnimationFrame(render);
    };

    render();
    return () => {
      disposed = true;
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
      actionsRef.current.forEach((action) => action.stop());
      actionsRef.current.clear();
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [playAnimation]);

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
          setMotion("Idel_Normal");
          playAnimation("Idel_Normal");
        }, Math.min(5000, Math.max(2100, message.length * 78)));
      }
    }, 38);
    return () => {
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    };
  }, [message, playAnimation, playBlip]);

  useEffect(() => {
    const onMascotEvent = (event: Event) => {
      const detail = (event as CustomEvent<MascotEventDetail>).detail || {};
      const type = detail.type || "idle";
      const clip = animationByEvent[type] || "Idel_Normal";
      speak(detail.message || pickLine(type), clip);
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
        const stage = stageRef.current;
        const roll = Math.random();
        if (roll < 0.4 && stage) {
          const maxX = Math.max(4, stage.clientWidth - MASCOT_WIDTH - 4);
          const nextX = clamp(position.x + (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 120), 4, maxX);
          setMotion("Walk-Cycle");
          playAnimation("Walk-Cycle");
          setPosition((current) => clampPosition(nextX, current.y));
          window.setTimeout(() => {
            setMotion("Idel_Normal");
            playAnimation("Idel_Normal");
          }, 2400);
        } else if (roll < 0.62) {
          setMotion("Idle_Aggressive");
          playAnimation("Idle_Aggressive");
          window.setTimeout(() => {
            setMotion("Idel_Normal");
            playAnimation("Idel_Normal");
          }, 2200);
        } else if (roll < 0.76) {
          setMotion("Action_Rolls");
          playAnimation("Action_Rolls");
          window.setTimeout(() => {
            setMotion("Idel_Normal");
            playAnimation("Idel_Normal");
          }, 1800);
        } else {
          setMotion("Idel_Normal");
          playAnimation("Idel_Normal");
        }
        schedule();
      }, 5_500 + Math.random() * 8_000);
    };
    schedule();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [bubbleVisible, clampPosition, dragging, playAnimation, position.x]);

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
    setMotion("Idel_Normal");
    playAnimation("Idel_Normal");
    window.setTimeout(() => setSettling(false), 520);
  }, [clampPosition, dragging, groundY, playAnimation]);

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
    setMotion("Run-Cycle");
    playAnimation("Run-Cycle");
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
    speak(pickLine("click"), "Attack_Bite");
  };

  const mascotStyle = {
    left: position.x,
    top: position.y,
    width: MASCOT_WIDTH,
    height: MASCOT_HEIGHT,
    transition: settling
      ? "top 520ms cubic-bezier(.18,.86,.22,1.08), left 260ms ease-out"
      : motion === "Walk-Cycle"
        ? "left 2400ms linear"
        : "none",
    opacity: ready ? 1 : 0,
  } as const;

  return (
    <div ref={stageRef} className={cn("notranslate pointer-events-none absolute inset-0 overflow-hidden", className)} data-native-action translate="no">
      {bubbleVisible && (
        <div
          className="pointer-events-none absolute z-[110] max-w-[min(300px,78vw)] rounded-[18px] border-2 border-[#17383a] bg-[#d9fff3] px-3.5 py-2.5 shadow-[5px_6px_0_rgba(23,56,58,0.55)]"
          translate="no"
          style={{
            left: clamp(position.x - 76, 10, Math.max(10, (stageRef.current?.clientWidth || 360) - 308)),
            top: Math.max(8, position.y - 74),
          }}
        >
          <div className="absolute -bottom-[11px] left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#17383a] bg-[#d9fff3]" />
          <p className="notranslate relative z-10 min-h-[2rem] text-[11px] font-black leading-snug text-[#17383a]" translate="no">
            {typedMessage}
            <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-[#17383a] align-[-2px]" />
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
          "pointer-events-auto absolute z-[105] flex items-end justify-center bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70",
          dragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={mascotStyle}
        title={title}
        aria-label={title}
      >
        <canvas
          ref={canvasRef}
          width={MASCOT_WIDTH}
          height={MASCOT_HEIGHT}
          draggable={false}
          className="pointer-events-none relative z-10 h-full w-full drop-shadow-[0_12px_18px_rgba(0,0,0,0.5)]"
        />
      </button>
    </div>
  );
}
