import { useMemo, useState } from "react";
import { Gamepad2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type GameScore = {
  game_name: string;
  console_type: string;
  score: number;
};

const safeStr = (val: unknown) => (val ? String(val) : "");
const categoryOrder = ["NES", "SNES", "N64", "GBA", "GBC", "PS1", "PS2", "PSP", "DS", "SEGA", "ARCADE", "MULTI", "BET"];

const getCategoryTone = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized === "nes") return "border-neon-green/30 bg-neon-green/10 text-neon-green";
  if (normalized === "snes") return "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan";
  if (normalized === "bet") return "border-neon-yellow/30 bg-neon-yellow/10 text-neon-yellow";
  if (normalized === "multi") return "border-neon-orange/30 bg-neon-orange/10 text-neon-orange";
  return "border-neon-magenta/30 bg-neon-magenta/10 text-neon-magenta";
};

export default function GameScoreList({
  scores,
  title = "Puntajes por Juego",
  emptyText = "No tiene records registrados",
  className,
  maxHeightClass = "max-h-[250px] xl:max-h-[450px]",
}: {
  scores: GameScore[];
  title?: string;
  emptyText?: string;
  className?: string;
  maxHeightClass?: string;
}) {
  const [activeFilter, setActiveFilter] = useState<{ group: "all" | "console" | "multi" | "bet"; value: string }>({ group: "all", value: "TODOS" });
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    const unique = Array.from(new Set(scores.map((score) => safeStr(score.console_type).toUpperCase()).filter(Boolean)));
    return unique.sort((a, b) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [scores]);

  const consoleCategories = useMemo(
    () => categories.filter((item) => item !== "MULTI" && item !== "BET"),
    [categories],
  );
  const multiCategories = useMemo(
    () => categories.filter((item) => item === "MULTI" || item.startsWith("MULTI")),
    [categories],
  );
  const betCategories = useMemo(
    () => categories.filter((item) => item === "BET" || item.startsWith("BET")),
    [categories],
  );

  const setDropdownFilter = (group: "console" | "multi" | "bet", value: string) => {
    setActiveFilter(value ? { group, value } : { group: "all", value: "TODOS" });
  };

  const filteredScores = useMemo(() => {
    const cleanedQuery = query.trim().toLowerCase();
    return scores.filter((score) => {
      const scoreCategory = safeStr(score.console_type).toUpperCase();
      const matchesCategory = activeFilter.group === "all" || scoreCategory === activeFilter.value;
      const matchesQuery = !cleanedQuery || safeStr(score.game_name).toLowerCase().includes(cleanedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeFilter, query, scores]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-pixel text-[10px] text-neon-green flex items-center gap-2 uppercase">
            <Gamepad2 className="w-4 h-4" /> {title}
          </h3>
          <span className="font-pixel text-[8px] text-muted-foreground">{filteredScores.length}/{scores.length}</span>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1 lg:min-w-[180px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neon-cyan/75" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar juego..."
              className="h-8 w-full rounded border border-neon-cyan/20 bg-black/30 pl-7 pr-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-neon-cyan/55"
            />
          </label>
          <div className="grid min-w-0 grid-cols-3 gap-1 sm:flex sm:shrink-0">
            <select
              value={activeFilter.group === "console" ? activeFilter.value : ""}
              onChange={(event) => setDropdownFilter("console", event.target.value)}
              className="h-8 min-w-0 rounded border border-neon-cyan/20 bg-black/30 px-2 font-pixel text-[7px] uppercase tracking-wider text-neon-cyan outline-none transition-colors focus:border-neon-cyan/60"
              aria-label="Filtrar por consola"
            >
              <option value="">Consolas</option>
              {consoleCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select
              value={activeFilter.group === "multi" ? activeFilter.value : ""}
              onChange={(event) => setDropdownFilter("multi", event.target.value)}
              className="h-8 min-w-0 rounded border border-neon-orange/20 bg-black/30 px-2 font-pixel text-[7px] uppercase tracking-wider text-neon-orange outline-none transition-colors focus:border-neon-orange/60"
              aria-label="Filtrar por multi"
            >
              <option value="">Multi</option>
              {(multiCategories.length ? multiCategories : ["MULTI"]).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select
              value={activeFilter.group === "bet" ? activeFilter.value : ""}
              onChange={(event) => setDropdownFilter("bet", event.target.value)}
              className="h-8 min-w-0 rounded border border-neon-yellow/20 bg-black/30 px-2 font-pixel text-[7px] uppercase tracking-wider text-neon-yellow outline-none transition-colors focus:border-neon-yellow/60"
              aria-label="Filtrar por bet"
            >
              <option value="">Bet</option>
              {(betCategories.length ? betCategories : ["BET"]).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className={cn("space-y-1 overflow-y-auto pr-1 custom-scrollbar", maxHeightClass)}>
        {filteredScores.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4 italic font-body">{emptyText}</p>
        ) : (
          filteredScores.map((score, index) => {
            const scoreCategory = safeStr(score.console_type).toUpperCase() || "GAME";
            return (
              <div key={`${score.game_name}-${score.console_type}-${index}`} className="flex items-center gap-2 bg-muted/20 border border-white/5 rounded px-3 py-2 text-xs font-body hover:bg-muted/40 transition-colors">
                <span className={cn("font-pixel text-[8px] px-1.5 py-0.5 rounded shrink-0 border", getCategoryTone(scoreCategory))}>{scoreCategory}</span>
                <span className="flex-1 text-foreground truncate font-medium">{score.game_name}</span>
                <span className="text-neon-green font-bold drop-shadow-sm shrink-0">{Number(score.score || 0).toLocaleString()}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
