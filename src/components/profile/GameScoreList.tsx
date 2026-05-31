import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Gamepad2, Gem, Search, Trophy, X } from "lucide-react";
import { cn } from "@/lib/utils";

type GameScore = {
  game_name: string;
  console_type: string;
  score: number;
};

const safeStr = (val: unknown) => (val ? String(val) : "");
const categoryOrder = ["NES", "SNES", "N64", "GBA", "GBC", "PS1", "PS2", "PSP", "DS", "SEGA", "ARCADE", "MULTI", "BET"];
const isMultiCategory = (category: string) => category === "MULTI" || category === "MULTIPLAYER" || category.startsWith("MULTI");
const isBetCategory = (category: string) => category === "BET" || category.startsWith("BET");
const getCategoryLabel = (category: string) => {
  if (isMultiCategory(category)) return "MULTI";
  if (isBetCategory(category)) return "BET";
  return category;
};
const getScoreReward = (category: string) => {
  if (isBetCategory(category)) {
    return {
      label: "F-coins",
      className: "border-[#f7d28b]/35 bg-[#f7d28b]/10 text-[#f7d28b]",
      Icon: Gem,
    };
  }
  return {
    label: "Stats",
    className: "border-neon-green/30 bg-neon-green/10 text-neon-green",
    Icon: Trophy,
  };
};

const getCategoryTone = (category: string) => {
  if (isBetCategory(category)) return "border-neon-yellow/30 bg-neon-yellow/10 text-neon-yellow";
  if (isMultiCategory(category)) return "border-neon-orange/30 bg-neon-orange/10 text-neon-orange";
  const normalized = category.toLowerCase();
  if (normalized === "nes") return "border-neon-green/30 bg-neon-green/10 text-neon-green";
  if (normalized === "snes") return "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan";
  return "border-neon-magenta/30 bg-neon-magenta/10 text-neon-magenta";
};

function FilterDropdown({
  tone,
  label,
  activeLabel,
  options,
  value,
  onChange,
}: {
  tone: "cyan" | "orange" | "yellow";
  label: string;
  activeLabel?: string;
  options: { value: string; label: string; meta?: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const toneClasses = {
    cyan: {
      button: "border-neon-cyan/25 text-neon-cyan hover:border-neon-cyan/60 hover:bg-neon-cyan/10",
      menu: "border-neon-cyan/35 shadow-[0_18px_42px_rgba(34,211,238,0.16)]",
      active: "bg-neon-cyan/15 text-neon-cyan",
      hover: "hover:bg-neon-cyan/10 hover:text-neon-cyan",
    },
    orange: {
      button: "border-neon-orange/25 text-neon-orange hover:border-neon-orange/60 hover:bg-neon-orange/10",
      menu: "border-neon-orange/35 shadow-[0_18px_42px_rgba(251,146,60,0.16)]",
      active: "bg-neon-orange/15 text-neon-orange",
      hover: "hover:bg-neon-orange/10 hover:text-neon-orange",
    },
    yellow: {
      button: "border-neon-yellow/25 text-neon-yellow hover:border-neon-yellow/60 hover:bg-neon-yellow/10",
      menu: "border-neon-yellow/35 shadow-[0_18px_42px_rgba(250,204,21,0.16)]",
      active: "bg-neon-yellow/15 text-neon-yellow",
      hover: "hover:bg-neon-yellow/10 hover:text-neon-yellow",
    },
  }[tone];

  const selectedText = activeLabel || label;

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => window.setTimeout(() => setOpen(false), 130)}
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between gap-1 rounded border bg-black/35 px-2 font-pixel text-[7px] uppercase tracking-wider outline-none transition-all focus-visible:ring-1 sm:w-[106px]",
          toneClasses.button,
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedText}</span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            "absolute left-0 top-[calc(100%+6px)] z-[10000] max-h-56 w-[min(240px,80vw)] overflow-y-auto rounded border bg-[#05070d]/95 p-1 backdrop-blur-xl custom-scrollbar",
            toneClasses.menu,
          )}
        >
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center justify-between rounded px-2 py-2 text-left text-[10px] transition-colors",
              !value ? toneClasses.active : `text-muted-foreground ${toneClasses.hover}`,
            )}
          >
            <span className="font-pixel text-[8px] uppercase">{label}</span>
            <span className="text-[9px] opacity-70">Todos</span>
          </button>
          {options.length === 0 ? (
            <div className="px-2 py-2 text-[10px] text-muted-foreground">Sin registros</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-[10px] transition-colors",
                  value === option.value ? toneClasses.active : `text-foreground/85 ${toneClasses.hover}`,
                )}
              >
                <span className="min-w-0 truncate font-medium">{option.label}</span>
                {option.meta && <span className="shrink-0 text-[8px] text-muted-foreground">{option.meta}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

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
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

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
    () => categories.filter((item) => !isMultiCategory(item) && !isBetCategory(item)),
    [categories],
  );
  const multiGames = useMemo(
    () => Array.from(new Set(scores
      .filter((score) => isMultiCategory(safeStr(score.console_type).toUpperCase()))
      .map((score) => safeStr(score.game_name))
      .filter(Boolean)))
      .sort((a, b) => a.localeCompare(b)),
    [scores],
  );
  const betGames = useMemo(
    () => Array.from(new Set(scores
      .filter((score) => isBetCategory(safeStr(score.console_type).toUpperCase()))
      .map((score) => safeStr(score.game_name))
      .filter(Boolean)))
      .sort((a, b) => a.localeCompare(b)),
    [scores],
  );

  const setDropdownFilter = (group: "console" | "multi" | "bet", value: string) => {
    setActiveFilter(value ? { group, value } : { group: "all", value: "TODOS" });
  };

  const filteredScores = useMemo(() => {
    const cleanedQuery = query.trim().toLowerCase();
    return scores.filter((score) => {
      const scoreCategory = safeStr(score.console_type).toUpperCase();
      const gameName = safeStr(score.game_name);
      const matchesCategory =
        activeFilter.group === "all" ||
        (activeFilter.group === "console" && scoreCategory === activeFilter.value) ||
        (activeFilter.group === "multi" && isMultiCategory(scoreCategory) && gameName === activeFilter.value) ||
        (activeFilter.group === "bet" && isBetCategory(scoreCategory) && gameName === activeFilter.value);
      const matchesQuery = !cleanedQuery || safeStr(score.game_name).toLowerCase().includes(cleanedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeFilter, query, scores]);

  const activeDropdownLabel = (group: "console" | "multi" | "bet") => (
    activeFilter.group === group ? activeFilter.value : undefined
  );

  useEffect(() => {
    if (!searchOpen) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    const closeOnScroll = () => setSearchOpen(false);
    document.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [searchOpen]);

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-pixel text-[10px] text-neon-green flex items-center gap-2 uppercase">
            <Gamepad2 className="w-4 h-4" /> {title}
          </h3>
          <span className="font-pixel text-[8px] text-muted-foreground">{filteredScores.length}/{scores.length}</span>
        </div>

        <div className="score-filter-bar flex items-center gap-1.5">
          <div
            className="score-filter-search relative shrink-0"
            ref={searchRef}
          >
            <button
              type="button"
              onClick={() => setSearchOpen((value) => !value)}
              className={cn(
                "grid h-8 w-8 place-items-center rounded border border-neon-cyan/25 bg-black/35 text-neon-cyan transition-all hover:border-neon-cyan/60 hover:bg-neon-cyan/10",
                query && "border-neon-green/55 text-neon-green",
              )}
              aria-label="Buscar juego"
              aria-expanded={searchOpen}
              title={query ? `Busqueda: ${query}` : "Buscar juego"}
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            {searchOpen && (
              <div className="score-search-bubble absolute left-0 top-[calc(100%+6px)] z-50 w-[min(270px,78vw)] rounded border border-neon-cyan/35 bg-[#05070d]/95 p-2 shadow-[0_18px_42px_rgba(34,211,238,0.16)] backdrop-blur-xl">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neon-cyan/75" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") setSearchOpen(false);
                      if (event.key === "Escape") setSearchOpen(false);
                    }}
                    placeholder="Buscar juego..."
                    className="h-8 w-full rounded border border-neon-cyan/20 bg-black/45 pl-7 pr-8 text-[11px] text-foreground outline-none placeholder:text-muted-foreground transition-colors focus:border-neon-cyan/55"
                  />
                  {query && (
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setQuery("")}
                      className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                      aria-label="Limpiar busqueda"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </label>
              </div>
            )}
          </div>
          <div className="score-filter-actions flex min-w-0 flex-1 flex-wrap justify-start gap-1 overflow-visible">
            <FilterDropdown
              tone="cyan"
              label="Consolas"
              activeLabel={activeDropdownLabel("console")}
              value={activeFilter.group === "console" ? activeFilter.value : ""}
              options={consoleCategories.map((item) => ({ value: item, label: item }))}
              onChange={(value) => setDropdownFilter("console", value)}
            />
            <FilterDropdown
              tone="orange"
              label="Multi"
              activeLabel={activeDropdownLabel("multi")}
              value={activeFilter.group === "multi" ? activeFilter.value : ""}
              options={multiGames.map((item) => ({ value: item, label: item }))}
              onChange={(value) => setDropdownFilter("multi", value)}
            />
            <FilterDropdown
              tone="yellow"
              label="Bet"
              activeLabel={activeDropdownLabel("bet")}
              value={activeFilter.group === "bet" ? activeFilter.value : ""}
              options={betGames.map((item) => ({ value: item, label: item }))}
              onChange={(value) => setDropdownFilter("bet", value)}
            />
          </div>
        </div>
      </div>

      <div className={cn("space-y-1 overflow-y-auto pr-1 custom-scrollbar", maxHeightClass)}>
        {filteredScores.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4 italic font-body">{emptyText}</p>
        ) : (
          filteredScores.map((score, index) => {
            const scoreCategory = safeStr(score.console_type).toUpperCase() || "GAME";
            const reward = getScoreReward(scoreCategory);
            return (
              <div key={`${score.game_name}-${score.console_type}-${index}`} className="flex items-center gap-2 bg-muted/20 border border-white/5 rounded px-3 py-2 text-xs font-body hover:bg-muted/40 transition-colors">
                <span className={cn("font-pixel text-[8px] px-1.5 py-0.5 rounded shrink-0 border", getCategoryTone(scoreCategory))}>{getCategoryLabel(scoreCategory)}</span>
                <span className="flex-1 text-foreground truncate font-medium">{score.game_name}</span>
                <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px]", reward.className)}>
                  <reward.Icon className="h-3 w-3" />
                  {reward.label}
                </span>
                <span className={cn("font-bold drop-shadow-sm shrink-0", isBetCategory(scoreCategory) ? "text-[#f7d28b]" : "text-neon-green")}>{Number(score.score || 0).toLocaleString()}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
