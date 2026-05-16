// Pista discreta para la Bóveda Secreta. Reemplaza una letra real de una
// palabra existente: hereda tamaño y peso del texto que la contiene, solo
// cambia el color y añade un pequeño número de orden en superíndice.
interface Props {
  letter: string;
  position: number; // 1..10
  color?: string;   // tailwind text color class
}

export default function VaultHint({ letter, position, color = "text-neon-magenta" }: Props) {
  return (
    <span
      title={`Pista N°${position} de la Bóveda`}
      className={`relative inline ${color} select-none`}
    >
      {letter}
      <sup className="text-[0.5em] opacity-70 ml-[1px] font-normal align-super">{position}</sup>
    </span>
  );
}
