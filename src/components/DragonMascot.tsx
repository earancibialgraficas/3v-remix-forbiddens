import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DragonMascotEventType, pickDragonLine } from "@/mascot/dragonMascotConfig";
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
const MODEL_URL = "/mascot/dragon/dragon_black_model.glb";
const BODY_TEXTURE_URL = "/mascot/dragon/textures/Dragon_Bump_Col2.jpg";
const NORMAL_TEXTURE_URL = "/mascot/dragon/textures/Dragon_Nor_mirror2.jpg";
const MASCOT_WIDTH = 420;
const MASCOT_HEIGHT = 300;
const FALLBACK_CANVAS_WIDTH = 620;
const FALLBACK_CANVAS_HEIGHT = 450;
const WORLD_UNITS_PER_PIXEL = 5.52 / 760;
const GROUND_GAP = 0;

const DRAGON_CLIPS = {
  fly: "Armature|Armature|Fly_New",
  idle: "Armature|Armature|Idel_New",
  run: "Armature|Armature|Run_New",
  walk: "Armature|Armature|Walk_New",
} as const;

const clipByEvent: Record<DragonMascotEventType, string> = {
  greeting: DRAGON_CLIPS.fly,
  play: DRAGON_CLIPS.run,
  pause: DRAGON_CLIPS.idle,
  save: DRAGON_CLIPS.fly,
  load: DRAGON_CLIPS.walk,
  settings: DRAGON_CLIPS.idle,
  reset: DRAGON_CLIPS.fly,
  mute: DRAGON_CLIPS.idle,
  unmute: DRAGON_CLIPS.fly,
  music: DRAGON_CLIPS.fly,
  music_prev: DRAGON_CLIPS.walk,
  music_play_pause: DRAGON_CLIPS.fly,
  music_next: DRAGON_CLIPS.run,
  music_volume_up: DRAGON_CLIPS.fly,
  music_volume_down: DRAGON_CLIPS.idle,
  music_mute: DRAGON_CLIPS.idle,
  music_playlist: DRAGON_CLIPS.fly,
  error: DRAGON_CLIPS.run,
  idle: DRAGON_CLIPS.idle,
  click: DRAGON_CLIPS.fly,
};

const isDragonEventType = (value: unknown): value is DragonMascotEventType =>
  typeof value === "string" && value in clipByEvent;

export const emitDragonMascotEvent = (type: DragonMascotEventType, message?: string) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DragonMascotEventDetail>(MASCOT_EVENT, { detail: { type, message } }));
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const isInsideDragonHitArea = (event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => {
  const rect = event.currentTarget.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  const body = ((x - 0.49) / 0.46) ** 2 + ((y - 0.54) / 0.29) ** 2 <= 1;
  const head = ((x - 0.18) / 0.22) ** 2 + ((y - 0.47) / 0.22) ** 2 <= 1;
  const wingLeft = x > 0.16 && x < 0.54 && y > 0.12 && y < 0.58;
  const wingRight = x > 0.43 && x < 0.9 && y > 0.14 && y < 0.62;
  const tail = x > 0.7 && y > 0.48 && y < 0.78;
  const legs = y > 0.58 && y < 0.94 && x > 0.18 && x < 0.74;
  return body || head || wingLeft || wingRight || tail || legs;
};

export default function DragonMascot({ gameName, className }: DragonMascotProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const hideBubbleTimerRef = useRef<number | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const moveFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastBlipAtRef = useRef(0);
  const dragRef = useRef({ pointerId: -1, offsetX: 0, offsetY: 0 });
  const dragFlyDirectionRef = useRef(1);
  const dragFlyTimeRef = useRef(0.04);
  const targetYawRef = useRef(-0.2);
  const currentYawRef = useRef(-0.2);
  const motionRef = useRef(DRAGON_CLIPS.idle);
  const positionRef = useRef<MascotPosition>({ x: 0, y: 0 });
  const stageSizeRef = useRef({ width: FALLBACK_CANVAS_WIDTH, height: FALLBACK_CANVAS_HEIGHT });
  const draggingRef = useRef(false);
  const landingUntilRef = useRef(0);

  const [message, setMessage] = useState("");
  const [typedMessage, setTypedMessage] = useState("");
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [position, setPosition] = useState<MascotPosition>({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: FALLBACK_CANVAS_WIDTH, height: FALLBACK_CANVAS_HEIGHT });
  const [ready, setReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const [motion, setMotion] = useState(DRAGON_CLIPS.idle);

  useEffect(() => {
    motionRef.current = motion;
  }, [motion]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    stageSizeRef.current = stageSize;
  }, [stageSize]);

  useEffect(() => {
    draggingRef.current = dragging;
  }, [dragging]);

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

  const cancelGroundMove = useCallback(() => {
    if (moveFrameRef.current) {
      window.cancelAnimationFrame(moveFrameRef.current);
      moveFrameRef.current = null;
    }
  }, []);

  const playBlip = useCallback((index: number) => {
    if (typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const nowMs = performance.now();
    if (nowMs - lastBlipAtRef.current < 46) return;
    lastBlipAtRef.current = nowMs;

    try {
      const context = audioContextRef.current || new AudioContextCtor();
      audioContextRef.current = context;
      if (context.state === "suspended") void context.resume();

      const oscillator = context.createOscillator();
      const growl = context.createOscillator();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      const pitch = 260 + ((index * 57) % 150);
      oscillator.type = "sawtooth";
      growl.type = "square";
      oscillator.frequency.setValueAtTime(pitch, context.currentTime);
      growl.frequency.setValueAtTime(Math.max(96, pitch * 0.46), context.currentTime);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(980, context.currentTime);
      filter.Q.setValueAtTime(5.8, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.34, context.currentTime + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.074);
      oscillator.connect(filter);
      growl.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      growl.start();
      oscillator.stop(context.currentTime + 0.08);
      growl.stop(context.currentTime + 0.08);
    } catch {
      // Audio can be blocked until the user interacts with the page.
    }
  }, []);

  const playAnimation = useCallback((name: string, fade = 0.18) => {
    const actions = actionsRef.current;
    const next = actions.get(name) || actions.get(DRAGON_CLIPS.idle) || actions.values().next().value;
    if (!next) return;
    const previous = activeActionRef.current;
    next.loop = THREE.LoopRepeat;
    next.clampWhenFinished = false;
    next.enabled = true;
    next.reset();
    next.setEffectiveTimeScale(name === DRAGON_CLIPS.idle ? 0.72 : name === DRAGON_CLIPS.run ? 0.82 : 0.78);
    next.setEffectiveWeight(1);
    if (previous && previous !== next) {
      previous.fadeOut(fade);
      next.fadeIn(fade);
    }
    next.play();
    activeActionRef.current = next;
  }, []);

  const speak = useCallback((text: string, clip = DRAGON_CLIPS.fly) => {
    const nextText = text.trim();
    if (!nextText) return;
    cancelGroundMove();
    if (hideBubbleTimerRef.current) window.clearTimeout(hideBubbleTimerRef.current);
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    targetYawRef.current = 0;
    setMotion(clip);
    playAnimation(clip);
    setMessage(nextText);
    setTypedMessage(nextText.slice(0, 1));
    setBubbleVisible(true);
  }, [cancelGroundMove, playAnimation]);

  const setIdle = useCallback(() => {
    targetYawRef.current = (Math.random() < 0.5 ? -1 : 1) * (0.12 + Math.random() * 0.22);
    setMotion(DRAGON_CLIPS.idle);
    playAnimation(DRAGON_CLIPS.idle);
  }, [playAnimation]);

  const playTemporaryAnimation = useCallback((clip: string, duration = 1800) => {
    cancelGroundMove();
    setMotion(clip);
    playAnimation(clip);
    window.setTimeout(() => {
      if (draggingRef.current) return;
      if (clip === DRAGON_CLIPS.fly) landingUntilRef.current = performance.now() + 950;
      setIdle();
    }, duration);
  }, [cancelGroundMove, playAnimation, setIdle]);

  const startGroundMove = useCallback((targetX: number, clip: string, duration: number) => {
    cancelGroundMove();
    const start = clampPosition(positionRef.current.x, groundY());
    const target = clampPosition(targetX, groundY());
    const startedAt = performance.now();
    const distance = target.x - start.x;
    if (Math.abs(distance) < 4) {
      setIdle();
      return;
    }

    setPosition(start);
    setMotion(clip);
    playAnimation(clip);

    const step = (now: number) => {
      if (draggingRef.current) {
        moveFrameRef.current = null;
        return;
      }
      const progress = clamp((now - startedAt) / duration, 0, 1);
      setPosition({ x: start.x + distance * progress, y: target.y });
      if (progress < 1) {
        moveFrameRef.current = window.requestAnimationFrame(step);
      } else {
        moveFrameRef.current = null;
        setIdle();
      }
    };

    moveFrameRef.current = window.requestAnimationFrame(step);
  }, [cancelGroundMove, clampPosition, groundY, playAnimation, setIdle]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const sync = () => {
      const width = Math.max(1, stage.clientWidth || FALLBACK_CANVAS_WIDTH);
      const height = Math.max(1, stage.clientHeight || FALLBACK_CANVAS_HEIGHT);
      setStageSize({ width, height });
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
    renderer.setSize(stageSizeRef.current.width, stageSizeRef.current.height, false);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const initialWorldWidth = stageSizeRef.current.width * WORLD_UNITS_PER_PIXEL;
    const initialWorldHeight = stageSizeRef.current.height * WORLD_UNITS_PER_PIXEL;
    const camera = new THREE.OrthographicCamera(
      -initialWorldWidth / 2,
      initialWorldWidth / 2,
      initialWorldHeight / 2,
      -initialWorldHeight / 2,
      0.1,
      100,
    );
    cameraRef.current = camera;
    camera.position.set(0, 0.14, 6.4);
    camera.lookAt(0, -0.08, 0);

    scene.add(new THREE.HemisphereLight(0xfaf7ee, 0x120606, 1.25));
    const keyLight = new THREE.DirectionalLight(0xffe4c8, 1.65);
    keyLight.position.set(2.8, 4.2, 5.0);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xff2a1c, 0.9);
    rimLight.position.set(-3.4, 1.6, 3.5);
    scene.add(rimLight);

    let modelRoot: THREE.Group | null = null;
    let disposed = false;
    const clock = new THREE.Clock();
    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    const bodyTexture = textureLoader.load(BODY_TEXTURE_URL);
    const normalTexture = textureLoader.load(NORMAL_TEXTURE_URL);
    bodyTexture.colorSpace = THREE.SRGBColorSpace;
    bodyTexture.flipY = false;
    normalTexture.flipY = false;

    loader.load(MODEL_URL, (gltf: GLTF) => {
      if (disposed) return;
      modelRoot = new THREE.Group();
      const model = gltf.scene;
      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.geometry.computeVertexNormals();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const nextMaterials = materials.map((material) => {
          if (!material) return new THREE.MeshStandardMaterial({ name: "Black dragon material", map: bodyTexture, normalMap: normalTexture });
          const name = material.name || "";
          const nextMaterial = material instanceof THREE.MeshStandardMaterial
            ? material.clone()
            : new THREE.MeshStandardMaterial({ name: name || "Black dragon material" });
          nextMaterial.name = name || "Black dragon material";
          if (/eye/i.test(name)) {
            nextMaterial.color = new THREE.Color(0xff3a1d);
            nextMaterial.emissive = new THREE.Color(0xff1f0f);
            nextMaterial.emissiveIntensity = 0.55;
            nextMaterial.roughness = 0.38;
            nextMaterial.metalness = 0.08;
          } else {
            nextMaterial.map = bodyTexture;
            nextMaterial.normalMap = normalTexture;
            nextMaterial.color = new THREE.Color(0xffffff);
            nextMaterial.emissive = new THREE.Color(0x120202);
            nextMaterial.emissiveIntensity = 0.05;
            nextMaterial.roughness = 0.58;
            nextMaterial.metalness = 0.04;
            nextMaterial.normalScale = new THREE.Vector2(1.35, 1.35);
          }
          nextMaterial.flatShading = false;
          nextMaterial.transparent = false;
          nextMaterial.opacity = 1;
          nextMaterial.depthWrite = true;
          nextMaterial.side = THREE.DoubleSide;
          nextMaterial.needsUpdate = true;
          return nextMaterial;
        });
        mesh.material = Array.isArray(mesh.material) ? nextMaterials : nextMaterials[0];
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const scale = 6.15 / Math.max(size.x, size.y * 1.34, size.z, 1);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale - 0.88, -center.z * scale);
      model.rotation.set(0, 0, 0);
      modelRoot.add(model);
      scene.add(modelRoot);

      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;
      actionsRef.current.clear();
      gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        action.loop = THREE.LoopRepeat;
        actionsRef.current.set(clip.name, action);
      });
      playAnimation(DRAGON_CLIPS.idle, 0);
    });

    const render = () => {
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      const mixer = mixerRef.current;
      const dragFlyAction = activeActionRef.current;
      const shouldPingPongDragFly = draggingRef.current
        && motionRef.current === DRAGON_CLIPS.fly
        && dragFlyAction?.getClip().name === DRAGON_CLIPS.fly;
      if (mixer && shouldPingPongDragFly && dragFlyAction) {
        const clipDuration = dragFlyAction.getClip().duration;
        const minTime = Math.max(0.03, clipDuration * 0.08);
        const maxTime = Math.max(minTime + 0.12, clipDuration * 0.42);
        if (dragFlyAction.time >= maxTime) {
          dragFlyDirectionRef.current = -1;
          dragFlyAction.time = maxTime;
        } else if (dragFlyAction.time <= minTime) {
          dragFlyDirectionRef.current = 1;
          dragFlyAction.time = minTime;
        }
        dragFlyAction.enabled = true;
        dragFlyAction.paused = false;
        dragFlyAction.setEffectiveTimeScale(0.78 * dragFlyDirectionRef.current);
        mixer.update(delta);
        if (dragFlyAction.time >= maxTime) {
          dragFlyDirectionRef.current = -1;
          dragFlyAction.time = maxTime;
          dragFlyAction.setEffectiveTimeScale(-0.78);
          mixer.update(0.00001);
        } else if (dragFlyAction.time <= minTime) {
          dragFlyDirectionRef.current = 1;
          dragFlyAction.time = minTime;
          dragFlyAction.setEffectiveTimeScale(0.78);
          mixer.update(0.00001);
        }
        dragFlyTimeRef.current = dragFlyAction.time;
      } else {
        mixer?.update(delta);
      }
      if (modelRoot) {
        const currentMotion = motionRef.current;
        const isMoving = currentMotion === DRAGON_CLIPS.walk || currentMotion === DRAGON_CLIPS.run;
        const isFlying = currentMotion === DRAGON_CLIPS.fly;
        const bob = Math.sin(elapsed * (isMoving ? 7.8 : isFlying ? 5.4 : 2.1));
        const landingLift = Math.max(0, landingUntilRef.current - performance.now()) / 950;
        const currentPosition = positionRef.current;
        const currentStage = stageSizeRef.current;
        const rootX = (currentPosition.x + MASCOT_WIDTH / 2 - currentStage.width / 2) * WORLD_UNITS_PER_PIXEL;
        const rootY = -(currentPosition.y + MASCOT_HEIGHT / 2 - currentStage.height / 2) * WORLD_UNITS_PER_PIXEL;
        currentYawRef.current += (targetYawRef.current - currentYawRef.current) * Math.min(1, delta * 4.0);
        modelRoot.position.x = rootX;
        modelRoot.position.y = rootY - 0.03
          + (isMoving ? 0 : isFlying ? Math.sin(elapsed * 4.2) * 0.05 : bob * 0.008)
          + landingLift * 0.12;
        modelRoot.rotation.y = currentYawRef.current + Math.sin(elapsed * (isFlying ? 3.2 : 1.4)) * (isFlying ? 0.035 : 0.012);
        modelRoot.rotation.z = Math.sin(elapsed * (isMoving ? 6.5 : isFlying ? 4.5 : 1.6)) * (isMoving ? 0.022 : isFlying ? 0.035 : 0.01);
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
      bodyTexture.dispose();
      normalTexture.dispose();
      rendererRef.current = null;
      cameraRef.current = null;
    };
  }, [playAnimation]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    if (!renderer || !camera) return;
    renderer.setSize(stageSize.width, stageSize.height, false);
    const worldWidth = stageSize.width * WORLD_UNITS_PER_PIXEL;
    const worldHeight = stageSize.height * WORLD_UNITS_PER_PIXEL;
    camera.left = -worldWidth / 2;
    camera.right = worldWidth / 2;
    camera.top = worldHeight / 2;
    camera.bottom = -worldHeight / 2;
    camera.updateProjectionMatrix();
  }, [stageSize]);

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
          setIdle();
        }, Math.min(5200, Math.max(2200, message.length * 82)));
      }
    }, 38);
    return () => {
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    };
  }, [message, playBlip, setIdle]);

  useEffect(() => {
    const onMascotEvent = (event: Event) => {
      const detail = (event as CustomEvent<DragonMascotEventDetail>).detail || {};
      const eventType = isDragonEventType(detail.type) ? detail.type : "idle";
      speak(detail.message || pickDragonLine(eventType), clipByEvent[eventType] || DRAGON_CLIPS.fly);
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
        if (stage && roll < 0.32) {
          const maxX = Math.max(4, stage.clientWidth - MASCOT_WIDTH - 4);
          const direction = Math.random() < 0.5 ? -1 : 1;
          const nextX = clamp(positionRef.current.x + direction * (70 + Math.random() * 120), 4, maxX);
          targetYawRef.current = direction < 0 ? -0.42 : 0.42;
          const clip = roll < 0.18 ? DRAGON_CLIPS.walk : DRAGON_CLIPS.run;
          startGroundMove(nextX, clip, roll < 0.18 ? 2600 : 1650);
        } else if (roll < 0.56) {
          targetYawRef.current = (Math.random() < 0.5 ? -1 : 1) * (0.16 + Math.random() * 0.26);
          playTemporaryAnimation(DRAGON_CLIPS.fly, 9800);
        } else if (roll < 0.78) {
          speak(pickDragonLine("idle"), DRAGON_CLIPS.idle);
        } else {
          setIdle();
        }
        schedule();
      }, 7_000 + Math.random() * 10_000);
    };
    schedule();
    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [bubbleVisible, dragging, playTemporaryAnimation, setIdle, speak, startGroundMove]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      if (hideBubbleTimerRef.current) window.clearTimeout(hideBubbleTimerRef.current);
      if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
      if (moveFrameRef.current) window.cancelAnimationFrame(moveFrameRef.current);
    };
  }, []);

  const finishDrag = useCallback(() => {
    if (!dragging) return;
    cancelGroundMove();
    draggingRef.current = false;
    dragFlyDirectionRef.current = 1;
    dragFlyTimeRef.current = 0.04;
    setDragging(false);
    setSettling(true);
    setPosition((current) => clampPosition(current.x, groundY()));
    landingUntilRef.current = performance.now() + 950;
    setIdle();
    window.setTimeout(() => setSettling(false), 520);
  }, [cancelGroundMove, clampPosition, dragging, groundY, setIdle]);

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isInsideDragonHitArea(event)) return;
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - stageRect.left - position.x,
      offsetY: event.clientY - stageRect.top - position.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    cancelGroundMove();
    setBubbleVisible(false);
    targetYawRef.current = 0;
    draggingRef.current = true;
    dragFlyDirectionRef.current = 1;
    dragFlyTimeRef.current = 0.04;
    landingUntilRef.current = 0;
    setDragging(true);
    setSettling(false);
    setMotion(DRAGON_CLIPS.fly);
    playAnimation(DRAGON_CLIPS.fly);
  };

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || event.pointerId !== dragRef.current.pointerId) return;
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    const x = event.clientX - stageRect.left - dragRef.current.offsetX;
    const y = event.clientY - stageRect.top - dragRef.current.offsetY;
    setPosition(clampPosition(x, y));
  };

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragging || settling) return;
    if (!isInsideDragonHitArea(event)) return;
    speak(pickDragonLine("click"), DRAGON_CLIPS.fly);
  };

  const mascotStyle = {
    left: position.x,
    top: position.y,
    width: MASCOT_WIDTH,
    height: MASCOT_HEIGHT,
    transition: settling
      ? "top 520ms cubic-bezier(.18,.86,.22,1.08), left 260ms ease-out"
      : "none",
    opacity: ready ? 1 : 0,
    appearance: "none",
    background: "transparent",
    border: 0,
    outline: "none",
    overflow: "visible",
    padding: 0,
    WebkitTapHighlightColor: "transparent",
  } as const;

  const hitAreaStyle = {
    clipPath: "polygon(3% 45%, 14% 22%, 34% 7%, 58% 10%, 91% 25%, 98% 55%, 82% 79%, 52% 95%, 20% 88%, 4% 66%)",
    WebkitClipPath: "polygon(3% 45%, 14% 22%, 34% 7%, 58% 10%, 91% 25%, 98% 55%, 82% 79%, 52% 95%, 20% 88%, 4% 66%)",
    WebkitTapHighlightColor: "transparent",
  } as const;

  return (
    <div ref={stageRef} className={cn("notranslate pointer-events-none absolute inset-0 overflow-visible", className)} data-native-action translate="no">
      {bubbleVisible && (
        <div
          className="pointer-events-none absolute z-[110] max-w-[min(300px,78vw)] rounded-[18px] border-2 border-[#2a1212] bg-[#ffe2d6] px-3.5 py-2.5 shadow-[5px_6px_0_rgba(42,18,18,0.55)]"
          translate="no"
          style={{
            left: clamp(position.x - 42, 10, Math.max(10, (stageRef.current?.clientWidth || 360) - 308)),
            top: Math.max(8, position.y - 48),
          }}
        >
          <div className="absolute -bottom-[11px] left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#2a1212] bg-[#ffe2d6]" />
          <p className="notranslate relative z-10 min-h-[2rem] text-[11px] font-black leading-snug text-[#2a1212]" translate="no">
            {typedMessage}
            <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-[#2a1212] align-[-2px]" />
          </p>
        </div>
      )}

      <div
        className="pointer-events-none absolute z-[105] flex items-end justify-center border-0 bg-transparent p-0 outline-none"
        style={mascotStyle}
        aria-label={title}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          className={cn(
            "pointer-events-auto absolute inset-0 z-20 border-0 bg-transparent p-0 outline-none hover:bg-transparent active:bg-transparent focus:bg-transparent focus:outline-none focus-visible:bg-transparent focus-visible:outline-none focus-visible:ring-0",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
          style={hitAreaStyle}
          aria-label={title}
        />
      </div>
      <canvas
        ref={canvasRef}
        width={stageSize.width}
        height={stageSize.height}
        draggable={false}
        className="pointer-events-none absolute inset-0 z-[104] h-full w-full drop-shadow-[0_14px_20px_rgba(0,0,0,0.55)]"
        style={{
          width: stageSize.width,
          height: stageSize.height,
        }}
      />
    </div>
  );
}
