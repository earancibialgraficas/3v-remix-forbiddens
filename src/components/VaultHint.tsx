// Pista visible para la Bóveda Secreta. Cada pista lleva un número de orden
// y un carácter coloreado que forma parte de la contraseña (10 caracteres).
// Distribuidas a lo largo de las páginas del sitio.
interface Props {
  letter: string;
  position: number; // 1..10
  color?: string;   // tailwind text color class
}

export default function VaultHint({ letter, position, color = "text-neon-magenta" }: Props) {
  return (
    <span
      title={`Pista N°${position} de la Bóveda`}
      className={`relative inline-block font-pixel ${color} mx-0.5 select-none`}
      style={{ textShadow: "0 0 8px currentColor, 0 0 16px currentColor" }}
    >
      <sup className="absolute -top-2 -right-2 text-[7px] opacity-80 font-pixel">{position}</sup>
      {letter}
    </span>
  );
}
