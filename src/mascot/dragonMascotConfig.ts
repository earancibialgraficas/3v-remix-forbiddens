export type DragonMascotAnimationId =
  | "idle"
  | "blink"
  | "walk"
  | "talk"
  | "happy"
  | "sad"
  | "judge"
  | "laugh"
  | "tongue"
  | "fart"
  | "sleep"
  | "drag";

export type DragonMascotEventType =
  | "greeting"
  | "play"
  | "pause"
  | "save"
  | "load"
  | "settings"
  | "reset"
  | "mute"
  | "unmute"
  | "music"
  | "error"
  | "idle"
  | "click";

export type DragonMascotAnimation = {
  id: DragonMascotAnimationId;
  frames: string[];
  fps: number;
  loop: boolean;
  fallback?: DragonMascotAnimationId;
};

const base = "/mascot/dragon";

const frames = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${base}/${prefix}_${String(index + 1).padStart(2, "0")}.png`);

export const dragonMascotAnimations: Record<DragonMascotAnimationId, DragonMascotAnimation> = {
  idle: { id: "idle", frames: [`${base}/idle_01.png`], fps: 1, loop: true },
  blink: { id: "blink", frames: frames("blink", 4), fps: 8, loop: false, fallback: "idle" },
  walk: { id: "walk", frames: frames("walk_right", 5), fps: 8, loop: false, fallback: "idle" },
  talk: { id: "talk", frames: frames("talk", 5), fps: 10, loop: true },
  happy: { id: "happy", frames: frames("happy", 4), fps: 9, loop: false, fallback: "idle" },
  sad: { id: "sad", frames: frames("sad", 2), fps: 4, loop: false, fallback: "idle" },
  judge: { id: "judge", frames: frames("judge", 1), fps: 1, loop: false, fallback: "idle" },
  laugh: { id: "laugh", frames: frames("laugh", 3), fps: 7, loop: false, fallback: "idle" },
  tongue: { id: "tongue", frames: frames("tongue", 3), fps: 7, loop: false, fallback: "idle" },
  fart: { id: "fart", frames: frames("fart", 5), fps: 8, loop: false, fallback: "idle" },
  sleep: { id: "sleep", frames: frames("sleep", 2), fps: 2, loop: true },
  drag: { id: "drag", frames: [`${base}/drag_held_01.png`], fps: 1, loop: true },
};

export const dragonMascotEventAnimation: Record<DragonMascotEventType, DragonMascotAnimationId> = {
  greeting: "happy",
  play: "happy",
  pause: "sad",
  save: "happy",
  load: "judge",
  settings: "judge",
  reset: "happy",
  mute: "tongue",
  unmute: "happy",
  music: "talk",
  error: "sad",
  idle: "blink",
  click: "laugh",
};

export const dragonMascotDialogues: Record<DragonMascotEventType, string[]> = {
  greeting: [
    "Estoy aqui. No prometo portarme bien.",
    "Ya llegue. Intenta jugar decente.",
    "Te estaba esperando... creo.",
  ],
  play: [
    "Vamos, campeon. Sorprendeme.",
    "Ya, intenta no arruinarlo.",
    "Despierto y listo para juzgar.",
  ],
  pause: [
    "Otra pausa... que sorpresa.",
    "Me dormire esperando.",
    "Pausa aceptada. Tu talento tambien.",
  ],
  save: [
    "Milagro: una buena decision.",
    "Progreso guardado. Dignidad pendiente.",
    "Eso estuvo casi responsable.",
  ],
  load: [
    "Volvamos a tu desastre anterior.",
    "Otra oportunidad para fallar bonito.",
    "Cargando recuerdos traumaticos.",
  ],
  settings: [
    "Claro, echale la culpa a la configuracion.",
    "Mucho menu, poco talento.",
    "Tocando cosas peligrosas, veo.",
  ],
  reset: [
    "Borramos la escena del crimen.",
    "Reiniciado. Esta vez con menos caos.",
    "Nuevo intento, misma sospecha.",
  ],
  mute: [
    "Silencio draconico activado.",
    "Mis oidos te agradecen.",
    "Mucho mejor. Casi civilizado.",
  ],
  unmute: [
    "Volvio el ruido. Que valiente.",
    "Audio restaurado. Responsabilidad no incluida.",
    "Ahora si puedo escuchar tus errores.",
  ],
  music: [
    "Buena playlist. No lo arruines.",
    "Eso suena sospechosamente bien.",
    "Musica lista. Drama tambien.",
  ],
  error: [
    "Eso no salio bien.",
    "Maravilloso desastre.",
    "Casi me das pena. Casi.",
  ],
  idle: [
    "No me ignores tanto.",
    "Estoy mirando.",
    "Si te duermes, yo tambien.",
  ],
  click: [
    "Tocame otra vez y te muerdo.",
    "Ey. Patitas quietas.",
    "Soy adorable, no boton.",
  ],
};

export const pickDragonLine = (eventType: DragonMascotEventType) => {
  const lines = dragonMascotDialogues[eventType] || dragonMascotDialogues.idle;
  return lines[Math.floor(Math.random() * lines.length)] || "";
};
