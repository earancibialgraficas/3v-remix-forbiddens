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
  music_prev: [
    "Volviendo una pista. Nostalgia sospechosa.",
    "Retrocediendo la senal.",
  ],
  music_play_pause: [
    "Control musical recibido.",
    "La nave ajusta el ritmo.",
  ],
  music_next: [
    "Siguiente frecuencia.",
    "Saltando a otra pista.",
  ],
  music_volume_up: [
    "Subiendo volumen. Con moderacion, idealmente.",
    "Mas potencia en los parlantes.",
  ],
  music_volume_down: [
    "Bajando volumen. Mis oidos sobreviven.",
    "Senal musical reducida.",
  ],
  music_mute: [
    "Silencio musical aplicado.",
    "Mute activado para la musica.",
  ],
  music_playlist: [
    "Nueva lista seleccionada.",
    "Cambiando la ruta musical.",
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
