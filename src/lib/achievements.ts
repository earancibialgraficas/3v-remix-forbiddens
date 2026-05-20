export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  kind: "score" | "secret";
  threshold?: number;
  secretHint?: string;
}

export const scoreAchievements: AchievementDefinition[] = [
  { id: "score_15k", name: "Primer Tesoro", description: "Alcanza 15.000 puntos.", kind: "score", threshold: 15000 },
  { id: "score_25k", name: "Ficha de Bronce", description: "Alcanza 25.000 puntos.", kind: "score", threshold: 25000 },
  { id: "score_50k", name: "Racha Arcade", description: "Alcanza 50.000 puntos.", kind: "score", threshold: 50000 },
  { id: "score_75k", name: "Control Caliente", description: "Alcanza 75.000 puntos.", kind: "score", threshold: 75000 },
  { id: "score_100k", name: "Club 100K", description: "Alcanza 100.000 puntos.", kind: "score", threshold: 100000 },
  { id: "score_150k", name: "Moneda Dorada", description: "Alcanza 150.000 puntos.", kind: "score", threshold: 150000 },
  { id: "score_250k", name: "Campeon de Sala", description: "Alcanza 250.000 puntos.", kind: "score", threshold: 250000 },
  { id: "score_500k", name: "Leyenda de Neon", description: "Alcanza 500.000 puntos.", kind: "score", threshold: 500000 },
  { id: "score_750k", name: "Rey del Marcador", description: "Alcanza 750.000 puntos.", kind: "score", threshold: 750000 },
  { id: "score_1kk", name: "1KK Prohibido", description: "Alcanza 1.000.000 de puntos.", kind: "score", threshold: 1000000 },
];

export const secretAchievements: AchievementDefinition[] = [
  { id: "secret_midnight", name: "Turno Fantasma", description: "Juega una sala entre medianoche y las 03:00.", kind: "secret", secretHint: "La noche abre puertas." },
  { id: "secret_first_trade", name: "Primer Trueque", description: "Completa tu primer intercambio de inventario.", kind: "secret", secretHint: "No todo se gana jugando." },
  { id: "secret_blackjack_21", name: "Veintiuno Exacto", description: "Gana una mesa de Blackjack con 21.", kind: "secret", secretHint: "La mano perfecta existe." },
  { id: "secret_roulette_zero", name: "El Cero Te Mira", description: "Acierta el cero en la ruleta.", kind: "secret", secretHint: "Apuesta donde nadie quiere mirar." },
  { id: "secret_bingo_line", name: "Linea Relampago", description: "Canta una linea de Bingo antes del quinto turno.", kind: "secret", secretHint: "Rapido, preciso, ruidoso." },
  { id: "secret_horse_longshot", name: "Caballo Imposible", description: "Gana una carrera con el caballo menos elegido.", kind: "secret", secretHint: "A veces conviene confiar en el raro." },
  { id: "secret_chess_sacrifice", name: "Sacrificio Real", description: "Gana una partida de Ajedrez despues de perder la dama.", kind: "secret", secretHint: "Perder una pieza no es perder la partida." },
  { id: "secret_inventory_stack", name: "Stack Completo", description: "Junta 10 potenciadores en el inventario.", kind: "secret", secretHint: "Una pila bonita siempre tienta." },
];

export const achievementDefinitions = [...scoreAchievements, ...secretAchievements];

export function getUnlockedScoreAchievements(totalScore: number) {
  return scoreAchievements.filter((achievement) => totalScore >= Number(achievement.threshold || 0));
}
