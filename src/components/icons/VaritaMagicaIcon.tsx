import { WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function VaritaMagicaIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-sm border border-pink-300/80 bg-pink-100 text-pink-700 shadow-[inset_1px_1px_0_rgba(255,255,255,0.75),inset_-1px_-1px_0_rgba(190,24,93,0.18),0_0_12px_rgba(244,114,182,0.26)]",
        className,
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_35%_22%,rgba(255,255,255,0.9),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.36),transparent_52%)]" />
      <WandSparkles className="relative h-[58%] w-[58%] text-pink-700 drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]" strokeWidth={2.6} />
    </span>
  );
}
