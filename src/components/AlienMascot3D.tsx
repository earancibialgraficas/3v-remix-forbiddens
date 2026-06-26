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
const MODEL_URL = "/mascot/alien/alien_animal_model.glb";
const ANIMATIONS_URL = "/mascot/alien/alien_animal_animations.glb";
const BODY_TEXTURE_URL = "/mascot/alien/textures/Alien-Animal-Base-Diffuse.jpg";
const BODY_NORMAL_URL = "/mascot/alien/textures/Alien-Animal-Base-Nor.jpg";
const BODY_METALLIC_URL = "/mascot/alien/textures/Alien-Animal-Base-Metallic.jpg";
const BODY_GLOSS_URL = "/mascot/alien/textures/Alien-Animal-Base-Gloss.jpg";
const EYE_TEXTURE_URL = "/mascot/alien/textures/Alien-Animal_eye.jpg";
const MASCOT_WIDTH = 292;
const MASCOT_HEIGHT = 260;
const GROUND_GAP = 0;

const ALIEN_ANIMATION_DURATIONS: Record<string, number> = {
  "0": 700,
  Action_Rolls: 900,
  Attack_Bite: 1800,
  "Attack_Bite.002": 1800,
  Attack_Hit: 1250,
  Bake_Pose: 700,
  Default: 900,
  Die_1: 2400,
  Die_2: 2400,
  Idel_Normal: 2200,
  Idle_Aggressive: 2400,
  "Run-Cycle": 1600,
  "Walk-Cycle": 2400,
};

const ALIEN_IDLE_ROTATION = [
  "Idel_Normal",
  "Idle_Aggressive",
  "Action_Rolls",
  "Attack_Bite.002",
  "Default",
  "Bake_Pose",
  "0",
  "Die_1",
  "Die_2",
];

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
  music: "Attack_Bite.002",
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

const isInsideAlienHitArea = (event: React.PointerEvent<HTMLButtonElement>) => {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const body = ((x - 0.5) / 0.48) ** 2 + ((y - 0.56) / 0.34) ** 2 <= 1;
  const head = ((x - 0.26) / 0.25) ** 2 + ((y - 0.43) / 0.26) ** 2 <= 1;
  const tail = x > 0.67 && x < 0.98 && y > 0.44 && y < 0.75;
  const feet = y > 0.68 && y < 0.93 && x > 0.12 && x < 0.82;
  return body || head || tail || feet;
};

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
      gain.gain.exponentialRampToValueAtTime(0.228, context.currentTime + 0.006);
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

  const playTemporaryAnimation = useCallback((clip: string, duration?: number) => {
    setMotion(clip);
    playAnimation(clip);
    window.setTimeout(() => {
      setMotion("Idel_Normal");
      playAnimation("Idel_Normal");
    }, duration ?? ALIEN_ANIMATION_DURATIONS[clip] ?? 1800);
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
    const camera = new THREE.OrthographicCamera(-2.22, 2.22, 1.72, -1.5, 0.1, 100);
    camera.position.set(0, 0.08, 5.4);
    camera.lookAt(0, -0.15, 0);

    scene.add(new THREE.HemisphereLight(0xf5f7ff, 0x160708, 1.2));
    const keyLight = new THREE.DirectionalLight(0xfff1e8, 1.65);
    keyLight.position.set(2.4, 3.6, 4.2);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xff3636, 0.72);
    rimLight.position.set(-2.8, 1.6, 2.6);
    scene.add(rimLight);

    let modelRoot: THREE.Group | null = null;
    let disposed = false;
    const clock = new THREE.Clock();
    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    const bodyTexture = textureLoader.load(BODY_TEXTURE_URL);
    const bodyNormal = textureLoader.load(BODY_NORMAL_URL);
    const bodyMetallic = textureLoader.load(BODY_METALLIC_URL);
    const bodyGloss = textureLoader.load(BODY_GLOSS_URL);
    const eyeTexture = textureLoader.load(EYE_TEXTURE_URL);
    bodyTexture.colorSpace = THREE.SRGBColorSpace;
    eyeTexture.colorSpace = THREE.SRGBColorSpace;
    bodyTexture.flipY = false;
    bodyNormal.flipY = false;
    bodyMetallic.flipY = false;
    bodyGloss.flipY = false;
    eyeTexture.flipY = false;

    const installAnimations = (gltf: GLTF, mixer: THREE.AnimationMixer) => {
      if (disposed) return;
      actionsRef.current.forEach((action) => action.stop());
      actionsRef.current.clear();
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.loop = THREE.LoopRepeat;
        actionsRef.current.set(clip.name, action);
      });
      playAnimation("Idel_Normal", 0);
    };

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
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const nextMaterials = materials.map((material) => {
            const name = material?.name || "";
            if (/body/i.test(name) || /postprocessing/i.test(mesh.name)) {
              const bodyMaterial = material instanceof THREE.MeshStandardMaterial
                ? material.clone()
                : new THREE.MeshStandardMaterial({ name: name || "Alien textured body" });
              bodyMaterial.name = name || "Alien textured body";
              bodyMaterial.map = bodyTexture;
              bodyMaterial.normalMap = bodyNormal;
              bodyMaterial.metalnessMap = bodyMetallic;
              bodyMaterial.roughnessMap = bodyGloss;
              bodyMaterial.color = new THREE.Color(0xffffff);
              bodyMaterial.emissive = new THREE.Color(0x080000);
              bodyMaterial.emissiveMap = null;
              bodyMaterial.emissiveIntensity = 0.035;
              bodyMaterial.roughness = 0.34;
              bodyMaterial.metalness = 0.42;
              bodyMaterial.normalScale = new THREE.Vector2(1.85, 1.85);
              bodyMaterial.transparent = false;
              bodyMaterial.opacity = 1;
              bodyMaterial.depthWrite = true;
              bodyMaterial.side = THREE.DoubleSide;
              bodyMaterial.needsUpdate = true;
              return bodyMaterial;
            }
            if (/eye/i.test(name) || /eye/i.test(mesh.name)) {
              const eyeMaterial = material instanceof THREE.MeshStandardMaterial
                ? material.clone()
                : new THREE.MeshStandardMaterial({ name: name || "Alien eye" });
              eyeMaterial.name = name || "Alien eye";
              eyeMaterial.map = eyeMaterial.map || eyeTexture;
              eyeMaterial.color = new THREE.Color(0xffffff);
              eyeMaterial.emissive = new THREE.Color(0xff7a22);
              eyeMaterial.emissiveMap = eyeMaterial.emissiveMap || eyeTexture;
              eyeMaterial.emissiveIntensity = 0.38;
              eyeMaterial.roughness = 0.35;
              eyeMaterial.metalness = 0.12;
              eyeMaterial.transparent = false;
              eyeMaterial.opacity = 1;
              eyeMaterial.depthWrite = true;
              eyeMaterial.side = THREE.DoubleSide;
              eyeMaterial.needsUpdate = true;
              return eyeMaterial;
            }
            if (!material) return material;
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = true;
            material.side = THREE.DoubleSide;
            material.needsUpdate = true;
            return material;
          });
          mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
        }
      });
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const scale = 2.72 / Math.max(size.y, 1);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale - 1.46, -center.z * scale);
      model.rotation.set(0, 0, 0);
      modelRoot.position.set(0, 0, 0);
      modelRoot.add(model);
      scene.add(modelRoot);

      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;
      loader.load(ANIMATIONS_URL, (animationGltf) => installAnimations(animationGltf, mixer));
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
        const isIdleAggressive = currentMotion.includes("Aggressive");
        const bob = Math.sin(elapsed * (isWalk ? 8.5 : isHit ? 10 : isIdleAggressive ? 5.5 : 2.4));
        modelRoot.position.y = -0.18 + (isWalk ? Math.abs(bob) * 0.035 : isHit ? Math.abs(bob) * 0.025 : bob * 0.01);
        modelRoot.rotation.z = Math.sin(elapsed * (isWalk ? 7 : isHit ? 9 : 1.8)) * (isWalk ? 0.025 : isHit ? 0.04 : 0.012);
        modelRoot.rotation.y = Math.sin(elapsed * (isHit ? 8 : isIdleAggressive ? 3.8 : 1.2)) * (isHit ? 0.04 : isIdleAggressive ? 0.025 : 0.012);
        modelRoot.scale.set(
          1 + Math.abs(bob) * (isHit ? 0.012 : isWalk ? 0.008 : 0.004),
          1 - Math.abs(bob) * (isHit ? 0.01 : isWalk ? 0.006 : 0.003),
          1,
        );
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
      bodyTexture.dispose();
      bodyNormal.dispose();
      bodyMetallic.dispose();
      bodyGloss.dispose();
      eyeTexture.dispose();
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
        if (roll < 0.28 && stage) {
          const maxX = Math.max(4, stage.clientWidth - MASCOT_WIDTH - 4);
          const nextX = clamp(position.x + (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 120), 4, maxX);
          setMotion("Walk-Cycle");
          playAnimation("Walk-Cycle");
          setPosition((current) => clampPosition(nextX, current.y));
          window.setTimeout(() => {
            setMotion("Idel_Normal");
            playAnimation("Idel_Normal");
          }, 2400);
        } else if (roll < 0.36 && stage) {
          const maxX = Math.max(4, stage.clientWidth - MASCOT_WIDTH - 4);
          const nextX = clamp(position.x + (Math.random() < 0.5 ? -1 : 1) * (110 + Math.random() * 150), 4, maxX);
          setMotion("Run-Cycle");
          playAnimation("Run-Cycle");
          setPosition((current) => clampPosition(nextX, current.y));
          window.setTimeout(() => {
            setMotion("Idel_Normal");
            playAnimation("Idel_Normal");
          }, 1600);
        } else if (roll < 0.9) {
          const clip = ALIEN_IDLE_ROTATION[Math.floor(Math.random() * ALIEN_IDLE_ROTATION.length)] || "Idel_Normal";
          playTemporaryAnimation(clip);
        } else {
          playTemporaryAnimation(Math.random() < 0.5 ? "Attack_Hit" : "Attack_Bite");
        }
        schedule();
      }, 5_500 + Math.random() * 8_000);
    };
    schedule();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [bubbleVisible, clampPosition, dragging, playAnimation, playTemporaryAnimation, position.x]);

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
    if (!isInsideAlienHitArea(event)) return;
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
    setMotion("Bake_Pose");
    playAnimation("Bake_Pose");
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
    speak(pickLine("click"), Math.random() < 0.5 ? "Attack_Bite" : "Attack_Bite.002");
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
        style={{
          ...mascotStyle,
          clipPath: "polygon(5% 34%, 25% 13%, 61% 12%, 98% 37%, 96% 77%, 77% 93%, 18% 94%, 0 71%)",
        }}
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
