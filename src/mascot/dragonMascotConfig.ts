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
  | "music_prev"
  | "music_play_pause"
  | "music_next"
  | "music_volume_up"
  | "music_volume_down"
  | "music_mute"
  | "music_playlist"
  | "error"
  | "idle"
  | "click";

export const dragonMascotDialogues: Record<DragonMascotEventType, string[]> = {
  greeting: [
    "Estoy aqui. No prometo portarme bien.",
    "Te estaba esperando... creo.",
    "Vamos a jugar.",
    "Me gusta este lugar.",
  ],
  play: [
    "Vamos, campeon.",
    "Ya, intenta no arruinarlo.",
    "Hazlo de nuevo, pero esta vez bien.",
    "Parece que juegas con los codos.",
  ],
  pause: [
    "Otra pausa... que sorpresa.",
    "Me dormire esperando.",
    "Pausa aceptada. Tu talento tambien.",
    "No me ignores tanto.",
  ],
  save: [
    "Milagro: una buena decision.",
    "Tu progreso salvo. Tu dignidad no.",
    "Bueno... esa si te salio.",
    "No estuvo horrible.",
  ],
  load: [
    "Volvamos a tu desastre anterior.",
    "Otra oportunidad para fallar.",
    "La proxima... supongo.",
    "Maravilloso desastre.",
  ],
  settings: [
    "Tocando cosas que no entiendes.",
    "Claro, echale la culpa a la configuracion.",
    "Mucho menu, poco talento.",
    "Eso no va a mejorar tu habilidad.",
  ],
  reset: [
    "Borramos la escena del crimen.",
    "Hazlo de nuevo, pero esta vez bien.",
    "Otra oportunidad para fallar.",
    "Que paquete.",
  ],
  mute: [
    "Mucho mejor. Casi civilizado.",
    "Mis oidos draconicos, animal.",
    "Silencio draconico activado.",
  ],
  unmute: [
    "Mis oidos draconicos, animal.",
    "Volvio el ruido. Que valiente.",
    "Eso no va a mejorar tu habilidad.",
  ],
  music: [
    "Menu abierto. Decide antes de que envejezca.",
    "No me ignores tanto.",
    "Tocando cosas que no entiendes.",
  ],
  music_prev: [
    "Volviendo una pista. Nostalgia sospechosa.",
    "Hazlo de nuevo, pero esta vez bien.",
    "La proxima... supongo.",
  ],
  music_play_pause: [
    "Vamos a jugar.",
    "Ya, intenta no arruinarlo.",
    "No me ignores tanto.",
  ],
  music_next: [
    "No estuvo horrible.",
    "Aceptable.",
    "Casi pareces bueno.",
  ],
  music_volume_up: [
    "Mis oidos draconicos, animal.",
    "Eso estuvo triste.",
    "Manquito.",
  ],
  music_volume_down: [
    "Mucho mejor. Casi civilizado.",
    "Aceptable.",
    "No estuvo horrible.",
  ],
  music_mute: [
    "Silencio draconico activado.",
    "Mucho mejor. Casi civilizado.",
    "Mi obra.",
  ],
  music_playlist: [
    "Menu abierto. Decide antes de que envejezca.",
    "Tocando cosas que no entiendes.",
    "Mucho menu, poco talento.",
  ],
  error: [
    "JAJAJA.",
    "No puede ser.",
    "Casi me das pena.",
    "Maravilloso desastre.",
    "Manquito.",
    "Que paquete.",
  ],
  idle: [
    "Estoy aqui.",
    "No me ignores tanto.",
    "Me gusta este lugar.",
    "Ups.",
    "Ese fui yo.",
  ],
  click: [
    "Tocame otra vez y te muerdo.",
    "Manquito.",
    "Que paquete.",
    "Ataque biologico.",
    "Te lo merecias.",
  ],
};

export const pickDragonLine = (eventType: DragonMascotEventType) => {
  const lines = dragonMascotDialogues[eventType] || dragonMascotDialogues.idle;
  return lines[Math.floor(Math.random() * lines.length)] || "";
};
