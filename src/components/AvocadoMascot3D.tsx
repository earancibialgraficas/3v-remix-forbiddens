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

type AvocadoAnimation =
  | "idle"
  | "walk"
  | "talk"
  | "happy"
  | "sad"
  | "sleep"
  | "drag"
  | "wave"
  | "jump"
  | "dance"
  | "look"
  | "stretch"
  | "surprised";

const MASCOT_EVENT = "forbiddens:dragon-mascot";
const MASCOT_WIDTH = 236;
const MASCOT_HEIGHT = 268;
const GROUND_GAP = 2;

const eventAnimation: Record<DragonMascotEventType, AvocadoAnimation> = {
  greeting: "happy",
  play: "jump",
  pause: "sleep",
  save: "wave",
  load: "talk",
  settings: "look",
  reset: "jump",
  mute: "talk",
  unmute: "happy",
  music: "dance",
  music_prev: "look",
  music_play_pause: "dance",
  music_next: "jump",
  music_volume_up: "happy",
  music_volume_down: "idle",
  music_mute: "talk",
  music_playlist: "wave",
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
  music_prev: ["Volvemos una cancion.", "Retrocediendo la playlist."],
  music_play_pause: ["Controlando la musica.", "Ritmo pausado o servido."],
  music_next: ["Siguiente temita.", "Cambiando de sabor musical."],
  music_volume_up: ["Mas volumen.", "Subiendo el juguito sonoro."],
  music_volume_down: ["Bajando volumen.", "Musica mas suave."],
  music_mute: ["Musica en silencio.", "Mute musical aplicado."],
  music_playlist: ["Lista cambiada.", "Nueva receta musical."],
  error: ["Eso salio medio machacado.", "Uy, eso no estaba maduro."],
  idle: ["Sigo aqui abajo.", "Estoy mirando el juego."],
  click: ["Suave, soy premium.", "Hey, cuidado con la palta."],
};

const pickLine = (type: DragonMascotEventType) => {
  const lines = avocadoDialogues[type] || avocadoDialogues.idle;
  return lines[Math.floor(Math.random() * lines.length)] || "";
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const makeAvocadoGeometry = (scale = 1) => {
  const points = [
    [0.0, -1.26],
    [0.36, -1.23],
    [0.68, -0.96],
    [0.84, -0.48],
    [0.8, -0.02],
    [0.66, 0.42],
    [0.43, 0.82],
    [0.2, 1.13],
    [0.0, 1.24],
  ].map(([radius, y]) => new THREE.Vector2(radius * scale, y * scale));
  const geometry = new THREE.LatheGeometry(points, 64);
  geometry.computeVertexNormals();
  return geometry;
};

const makeCylinderPart = (height: number, radius: number, color: number, forceFront = false) => {
  const geometry = new THREE.CylinderGeometry(radius, radius * 0.9, height, 18);
  geometry.translate(0, -height / 2, 0);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.05,
    depthTest: !forceFront,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  if (forceFront) mesh.renderOrder = 30;
  return mesh;
};

const makeJointedLimb = (upperLength: number, lowerLength: number, radius: number, color: number, forceFront = false) => {
  const pivot = new THREE.Group();
  const upper = makeCylinderPart(upperLength, radius, color, forceFront);
  const joint = new THREE.Group();
  const jointBall = makeRoundedPart(radius * 1.36, color, forceFront);
  const lower = makeCylinderPart(lowerLength, radius * 0.92, color, forceFront);
  const end = new THREE.Group();

  joint.position.set(0, -upperLength, 0);
  joint.add(jointBall, lower);
  end.position.set(0, -lowerLength, 0);
  joint.add(end);
  pivot.add(upper, joint);

  return { pivot, joint, end, jointBall };
};

const makeRoundedPart = (radius: number, color: number, forceFront = false) => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 22, 18),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.54,
      metalness: 0.05,
      depthTest: !forceFront,
    }),
  );
  mesh.castShadow = true;
  if (forceFront) mesh.renderOrder = 30;
  return mesh;
};

const makeAvocadoModel = () => {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const outer = new THREE.Mesh(
    makeAvocadoGeometry(1),
    new THREE.MeshStandardMaterial({
      color: 0x2f7d3a,
      roughness: 0.72,
      metalness: 0.03,
    }),
  );
  outer.scale.set(0.95, 1.05, 0.24);
  outer.castShadow = true;
  body.add(outer);

  const flesh = new THREE.Mesh(
    makeAvocadoGeometry(0.82),
    new THREE.MeshStandardMaterial({
      color: 0xd8e88e,
      roughness: 0.82,
      metalness: 0.02,
    }),
  );
  flesh.position.set(0.01, -0.06, 0.11);
  flesh.scale.set(0.93, 0.93, 0.14);
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

  const mouthGroup = new THREE.Group();
  const openMouth = new THREE.Mesh(
    new THREE.SphereGeometry(0.095, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0x130d08, roughness: 0.42 }),
  );
  openMouth.position.set(0, -0.52, 0.298);
  openMouth.scale.set(1.08, 0.18, 0.38);
  openMouth.visible = false;
  mouthGroup.add(openMouth);

  const smileCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-0.13, -0.48, 0.285),
    new THREE.Vector3(0, -0.59, 0.32),
    new THREE.Vector3(0.13, -0.48, 0.285),
  );
  const smile = new THREE.Mesh(
    new THREE.TubeGeometry(smileCurve, 24, 0.012, 8, false),
    new THREE.MeshStandardMaterial({ color: 0x151009, roughness: 0.5 }),
  );
  mouthGroup.add(smile);
  body.add(mouthGroup);

  const leftArmRig = makeJointedLimb(0.38, 0.44, 0.038, 0x8a6b30, true);
  const rightArmRig = makeJointedLimb(0.38, 0.44, 0.038, 0x8a6b30, true);
  const leftArm = leftArmRig.pivot;
  const rightArm = rightArmRig.pivot;
  const leftHand = makeRoundedPart(0.07, 0x9d7c39, true);
  const rightHand = makeRoundedPart(0.07, 0x9d7c39, true);
  leftHand.position.set(0, -0.02, 0.035);
  rightHand.position.set(0, -0.02, 0.035);
  leftHand.scale.set(1.05, 0.86, 0.82);
  rightHand.scale.set(1.05, 0.86, 0.82);
  leftArmRig.end.add(leftHand);
  rightArmRig.end.add(rightHand);
  leftArm.position.set(-0.58, -0.38, 0.33);
  rightArm.position.set(0.58, -0.38, 0.33);
  leftArm.rotation.z = 0.55;
  rightArm.rotation.z = -0.55;
  body.add(leftArm, rightArm);

  const leftLegRig = makeJointedLimb(0.29, 0.31, 0.045, 0x7f622d);
  const rightLegRig = makeJointedLimb(0.29, 0.31, 0.045, 0x7f622d);
  const leftLeg = leftLegRig.pivot;
  const rightLeg = rightLegRig.pivot;
  const leftFoot = makeRoundedPart(0.085, 0x8d7135);
  const rightFoot = makeRoundedPart(0.085, 0x8d7135);
  leftFoot.position.set(0.055, -0.02, 0.045);
  rightFoot.position.set(-0.055, -0.02, 0.045);
  leftFoot.scale.set(1.35, 0.58, 0.84);
  rightFoot.scale.set(1.35, 0.58, 0.84);
  leftLegRig.end.add(leftFoot);
  rightLegRig.end.add(rightFoot);
  leftLeg.position.set(-0.27, -1.08, 0.14);
  rightLeg.position.set(0.27, -1.08, 0.14);
  body.add(leftLeg, rightLeg);

  const parts = {
    root,
    body,
    seed,
    leftArm,
    rightArm,
    leftElbow: leftArmRig.joint,
    rightElbow: rightArmRig.joint,
    leftLeg,
    rightLeg,
    leftKnee: leftLegRig.joint,
    rightKnee: rightLegRig.joint,
    leftEye,
    rightEye,
    leftSpark,
    rightSpark,
    mouthGroup,
    smile,
    openMouth,
    leftHand,
    rightHand,
    leftFoot,
    rightFoot,
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
  const dragTargetRef = useRef({ x: 0, y: 1.05 });
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
      gain.gain.exponentialRampToValueAtTime(0.264, context.currentTime + 0.006);
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
    const nextText = text.trim();
    if (!nextText) return;
    if (hideBubbleTimerRef.current) window.clearTimeout(hideBubbleTimerRef.current);
    if (typingTimerRef.current) window.clearInterval(typingTimerRef.current);
    setAnimationName(nextAnimation === "sleep" ? "talk" : nextAnimation);
    setMessage(nextText);
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

    const aimArmAt = (
      arm: THREE.Group,
      elbow: THREE.Group,
      shoulder: THREE.Vector3,
      target: THREE.Vector2,
      side: -1 | 1,
    ) => {
      const upperLength = 0.38;
      const lowerLength = 0.44;
      const dx = target.x - shoulder.x;
      const dy = target.y - shoulder.y;
      const distance = clamp(Math.hypot(dx, dy), 0.2, upperLength + lowerLength - 0.02);
      const baseAngle = Math.atan2(dy, dx) - Math.PI / 2;
      const shoulderBend = Math.acos(clamp((upperLength * upperLength + distance * distance - lowerLength * lowerLength) / (2 * upperLength * distance), -1, 1));
      const elbowBend = Math.PI - Math.acos(clamp((upperLength * upperLength + lowerLength * lowerLength - distance * distance) / (2 * upperLength * lowerLength), -1, 1));
      arm.rotation.set(0, 0, baseAngle + shoulderBend * side);
      elbow.rotation.set(0, 0, -elbowBend * side);
      arm.position.z = 0.48;
    };

    const clock = new THREE.Clock();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      const state = animationNameRef.current;
      const avocado = modelRef.current;
      if (avocado) {
        const mode = state;
        const walkCycle = Math.sin(elapsed * 11);
        const fastCycle = Math.sin(elapsed * 12.5);
        const breathe = Math.sin(elapsed * 2.1);
        const blink = mode === "sleep" ? 0.16 : Math.sin(elapsed * 3.7) > 0.965 ? 0.18 : 1;
        const mouthPulse = Math.abs(Math.sin(elapsed * 14));

        avocado.openMouth.visible = mode === "talk" || mode === "surprised";
        avocado.smile.visible = !avocado.openMouth.visible;
        avocado.openMouth.scale.set(1.08, mode === "surprised" ? 0.72 : 0.22 + mouthPulse * 0.5, 0.38);
        avocado.leftEye.scale.y = mode === "surprised" ? 1.28 : blink;
        avocado.rightEye.scale.y = mode === "surprised" ? 1.28 : blink;
        avocado.leftSpark.visible = mode !== "sleep";
        avocado.rightSpark.visible = mode !== "sleep";

        avocado.root.position.set(0, 0, 0);
        avocado.root.rotation.set(0, -0.08 + Math.sin(elapsed * 1.2) * 0.08, breathe * 0.04);
        avocado.body.scale.set(1 + breathe * 0.012, 1 - breathe * 0.014, 1);
        avocado.seed.position.set(0, -0.12 + breathe * 0.012, 0.26);
        avocado.leftArm.position.z = 0.33;
        avocado.rightArm.position.z = 0.33;
        avocado.leftArm.rotation.set(0, 0, 0.55 + breathe * 0.07);
        avocado.rightArm.rotation.set(0, 0, -0.55 - breathe * 0.07);
        avocado.leftElbow.rotation.set(0, 0, -0.28 + breathe * 0.035);
        avocado.rightElbow.rotation.set(0, 0, 0.28 - breathe * 0.035);
        avocado.leftLeg.rotation.set(0, 0, breathe * 0.035);
        avocado.rightLeg.rotation.set(0, 0, -breathe * 0.035);
        avocado.leftKnee.rotation.set(0, 0, 0.18);
        avocado.rightKnee.rotation.set(0, 0, -0.18);
        avocado.leftHand.scale.set(1.05, 0.86, 0.82);
        avocado.rightHand.scale.set(1.05, 0.86, 0.82);
        avocado.leftFoot.scale.set(1.35, 0.58, 0.84);
        avocado.rightFoot.scale.set(1.35, 0.58, 0.84);

        if (mode === "talk") {
          avocado.root.position.y = fastCycle * 0.045;
          avocado.root.rotation.z = Math.sin(elapsed * 7.5) * 0.065;
          avocado.body.scale.set(1 + fastCycle * 0.025, 1 - fastCycle * 0.025, 1);
          avocado.seed.position.y = -0.12 + fastCycle * 0.02;
          avocado.leftArm.rotation.z = 0.42 + Math.sin(elapsed * 10.5) * 0.28;
          avocado.rightArm.rotation.z = -0.42 - Math.sin(elapsed * 9.7) * 0.28;
          avocado.leftElbow.rotation.z = -0.42 + Math.sin(elapsed * 13) * 0.22;
          avocado.rightElbow.rotation.z = 0.42 - Math.sin(elapsed * 12.5) * 0.22;
        } else if (mode === "walk") {
          avocado.root.position.y = Math.abs(walkCycle) * 0.055;
          avocado.root.rotation.z = Math.sin(elapsed * 7) * 0.095;
          avocado.leftArm.rotation.z = 0.58 + walkCycle * 0.48;
          avocado.rightArm.rotation.z = -0.58 - walkCycle * 0.48;
          avocado.leftElbow.rotation.z = -0.3 - walkCycle * 0.16;
          avocado.rightElbow.rotation.z = 0.3 + walkCycle * 0.16;
          avocado.leftLeg.rotation.z = walkCycle * 0.24;
          avocado.rightLeg.rotation.z = -walkCycle * 0.24;
          avocado.leftKnee.rotation.z = 0.18 + Math.max(0, -walkCycle) * 0.34;
          avocado.rightKnee.rotation.z = -0.18 - Math.max(0, walkCycle) * 0.34;
          avocado.leftFoot.scale.y = 0.5 + Math.max(0, walkCycle) * 0.08;
          avocado.rightFoot.scale.y = 0.5 + Math.max(0, -walkCycle) * 0.08;
        } else if (mode === "happy") {
          avocado.root.position.y = Math.abs(Math.sin(elapsed * 8.5)) * 0.16;
          avocado.root.rotation.z = Math.sin(elapsed * 8.5) * 0.16;
          avocado.body.scale.set(1.05 + fastCycle * 0.02, 0.96 - fastCycle * 0.012, 1);
          avocado.leftArm.rotation.z = 0.1 + Math.sin(elapsed * 11) * 0.2;
          avocado.rightArm.rotation.z = -0.1 - Math.sin(elapsed * 11) * 0.2;
          avocado.leftElbow.rotation.z = -0.58 + Math.sin(elapsed * 11) * 0.18;
          avocado.rightElbow.rotation.z = 0.58 - Math.sin(elapsed * 11) * 0.18;
          avocado.leftKnee.rotation.z = 0.34;
          avocado.rightKnee.rotation.z = -0.34;
        } else if (mode === "wave") {
          avocado.root.rotation.z = Math.sin(elapsed * 4.8) * 0.055;
          avocado.leftArm.rotation.z = 0.48 + breathe * 0.05;
          avocado.rightArm.rotation.z = -1.95 + Math.sin(elapsed * 12.5) * 0.38;
          avocado.rightArm.rotation.y = -0.38;
          avocado.rightElbow.rotation.z = 0.86 + Math.sin(elapsed * 12.5) * 0.22;
          avocado.rightHand.scale.set(1.15, 0.92 + Math.abs(fastCycle) * 0.14, 0.86);
        } else if (mode === "jump") {
          const hop = Math.abs(Math.sin(elapsed * 7.2));
          avocado.root.position.y = hop * 0.32;
          avocado.root.rotation.z = Math.sin(elapsed * 7.2) * 0.11;
          avocado.body.scale.set(1.04 - hop * 0.045, 0.95 + hop * 0.08, 1);
          avocado.leftArm.rotation.z = -0.1 + Math.sin(elapsed * 10) * 0.12;
          avocado.rightArm.rotation.z = 0.1 - Math.sin(elapsed * 10) * 0.12;
          avocado.leftElbow.rotation.z = -0.74;
          avocado.rightElbow.rotation.z = 0.74;
          avocado.leftLeg.rotation.z = -0.22 - hop * 0.28;
          avocado.rightLeg.rotation.z = 0.22 + hop * 0.28;
          avocado.leftKnee.rotation.z = 0.44 + hop * 0.22;
          avocado.rightKnee.rotation.z = -0.44 - hop * 0.22;
        } else if (mode === "dance") {
          avocado.root.position.y = Math.abs(Math.sin(elapsed * 6.5)) * 0.13;
          avocado.root.rotation.z = Math.sin(elapsed * 6.5) * 0.22;
          avocado.root.rotation.y = Math.sin(elapsed * 3.8) * 0.26;
          avocado.leftArm.rotation.z = 0.24 + Math.sin(elapsed * 9.5) * 0.55;
          avocado.rightArm.rotation.z = -0.24 + Math.sin(elapsed * 9.5 + Math.PI) * 0.55;
          avocado.leftElbow.rotation.z = -0.4 + Math.sin(elapsed * 8.5) * 0.3;
          avocado.rightElbow.rotation.z = 0.4 + Math.sin(elapsed * 8.5 + Math.PI) * 0.3;
          avocado.leftLeg.rotation.z = Math.sin(elapsed * 9.5 + Math.PI) * 0.24;
          avocado.rightLeg.rotation.z = Math.sin(elapsed * 9.5) * 0.24;
          avocado.leftKnee.rotation.z = 0.2 + Math.abs(Math.sin(elapsed * 9.5)) * 0.24;
          avocado.rightKnee.rotation.z = -0.2 - Math.abs(Math.sin(elapsed * 9.5 + Math.PI)) * 0.24;
        } else if (mode === "look") {
          avocado.root.rotation.y = Math.sin(elapsed * 2.6) * 0.32;
          avocado.root.rotation.z = Math.sin(elapsed * 1.7) * 0.035;
          avocado.leftArm.rotation.z = 0.35 + Math.sin(elapsed * 2.4) * 0.08;
          avocado.rightArm.rotation.z = -1.18 + Math.sin(elapsed * 4) * 0.12;
          avocado.rightElbow.rotation.z = 0.74;
        } else if (mode === "stretch") {
          avocado.root.position.y = 0.08 + Math.sin(elapsed * 2.4) * 0.04;
          avocado.body.scale.set(0.95, 1.08 + Math.sin(elapsed * 2.4) * 0.025, 1);
          avocado.leftArm.rotation.z = 1.96 + Math.sin(elapsed * 2.4) * 0.08;
          avocado.rightArm.rotation.z = -1.96 - Math.sin(elapsed * 2.4) * 0.08;
          avocado.leftElbow.rotation.z = -0.12;
          avocado.rightElbow.rotation.z = 0.12;
          avocado.leftLeg.rotation.z = -0.12;
          avocado.rightLeg.rotation.z = 0.12;
        } else if (mode === "surprised") {
          avocado.root.position.y = 0.1 + Math.abs(fastCycle) * 0.05;
          avocado.root.rotation.z = Math.sin(elapsed * 14) * 0.025;
          avocado.leftArm.rotation.z = 1.65 + Math.sin(elapsed * 14) * 0.12;
          avocado.rightArm.rotation.z = -1.65 - Math.sin(elapsed * 14) * 0.12;
          avocado.leftElbow.rotation.z = -0.35;
          avocado.rightElbow.rotation.z = 0.35;
        } else if (mode === "sad") {
          avocado.root.position.y = -0.1 + Math.sin(elapsed * 1.8) * 0.025;
          avocado.root.rotation.z = -0.16 + Math.sin(elapsed * 1.6) * 0.025;
          avocado.body.scale.set(0.97, 0.98, 1);
          avocado.leftArm.rotation.z = 0.82;
          avocado.rightArm.rotation.z = -0.82;
          avocado.leftElbow.rotation.z = -0.12;
          avocado.rightElbow.rotation.z = 0.12;
          avocado.leftEye.scale.y = 0.62;
          avocado.rightEye.scale.y = 0.62;
        } else if (mode === "sleep") {
          avocado.root.position.y = -0.18 + Math.sin(elapsed * 1.5) * 0.025;
          avocado.root.rotation.z = -0.34 + Math.sin(elapsed * 1.3) * 0.018;
          avocado.body.scale.set(1.04, 0.92, 1);
          avocado.leftArm.rotation.z = 0.9 + Math.sin(elapsed * 1.4) * 0.035;
          avocado.rightArm.rotation.z = -0.9 - Math.sin(elapsed * 1.4) * 0.035;
          avocado.leftElbow.rotation.z = -0.54;
          avocado.rightElbow.rotation.z = 0.54;
          avocado.leftLeg.rotation.z = 0.16;
          avocado.rightLeg.rotation.z = -0.16;
          avocado.leftKnee.rotation.z = 0.34;
          avocado.rightKnee.rotation.z = -0.34;
        } else if (mode === "drag") {
          const dragTarget = dragTargetRef.current;
          const target = new THREE.Vector2(clamp(dragTarget.x, -1.15, 1.15), clamp(dragTarget.y, -1.0, 1.28));
          const leftShoulder = new THREE.Vector3(avocado.leftArm.position.x, avocado.leftArm.position.y, avocado.leftArm.position.z);
          const rightShoulder = new THREE.Vector3(avocado.rightArm.position.x, avocado.rightArm.position.y, avocado.rightArm.position.z);
          avocado.root.position.y = 0.18 + Math.sin(elapsed * 8) * 0.035;
          avocado.root.rotation.z = Math.sin(elapsed * 7) * 0.13;
          avocado.body.scale.set(0.96, 1.05, 1);
          aimArmAt(avocado.leftArm, avocado.leftElbow, leftShoulder, target, -1);
          aimArmAt(avocado.rightArm, avocado.rightElbow, rightShoulder, target, 1);
          avocado.leftHand.scale.set(1.22, 1.0, 0.9);
          avocado.rightHand.scale.set(1.22, 1.0, 0.9);
          avocado.leftLeg.rotation.z = 0.3 + Math.sin(elapsed * 10) * 0.18;
          avocado.rightLeg.rotation.z = -0.3 - Math.sin(elapsed * 10) * 0.18;
          avocado.leftKnee.rotation.z = 0.55;
          avocado.rightKnee.rotation.z = -0.55;
        }
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
        if (roll < 0.28) {
          const stage = stageRef.current;
          if (stage) {
            const maxX = Math.max(4, stage.clientWidth - MASCOT_WIDTH - 4);
            const nextX = clamp(position.x + (Math.random() < 0.5 ? -1 : 1) * (80 + Math.random() * 118), 4, maxX);
            setAnimationName("walk");
            setPosition((current) => clampPosition(nextX, current.y));
            window.setTimeout(() => setAnimationName("idle"), 2400);
          }
        } else if (roll < 0.4) {
          setAnimationName("sleep");
        } else if (roll < 0.52) {
          setAnimationName("stretch");
          window.setTimeout(() => setAnimationName("idle"), 1800);
        } else if (roll < 0.66) {
          setAnimationName("wave");
          window.setTimeout(() => setAnimationName("idle"), 1600);
        } else if (roll < 0.8) {
          setAnimationName("dance");
          window.setTimeout(() => setAnimationName("idle"), 1900);
        } else if (roll < 0.92) {
          setAnimationName("happy");
          window.setTimeout(() => setAnimationName("idle"), 1200);
        } else {
          setAnimationName("look");
          window.setTimeout(() => setAnimationName("idle"), 1800);
        }
        schedule();
      }, 4_800 + Math.random() * 7_400);
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

  const updateDragTarget = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = clamp(event.clientX - rect.left, 0, rect.width);
    const localY = clamp(event.clientY - rect.top, 0, rect.height);
    dragTargetRef.current = {
      x: (localX / rect.width - 0.5) * 3.5,
      y: (0.5 - localY / rect.height) * 3.9,
    };
  };

  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const stageRect = stageRef.current?.getBoundingClientRect();
    if (!stageRect) return;
    updateDragTarget(event);
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
    updateDragTarget(event);
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
        ? "left 2400ms linear"
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
