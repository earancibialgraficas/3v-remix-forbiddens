import { useEffect, useRef } from "react";

/**
 * Aplica scroll automático y borde neón animado tipo arcade
 * al elemento con id `${prefix}${id}` cuando aparece en el DOM.
 *
 * - Reintenta con requestAnimationFrame mientras el elemento no existe.
 * - Limpia el query param de la URL una vez que se ejecutó.
 * - Mantiene el highlight ~3.5s.
 */
export function useScrollHighlight(
  targetId: string | null | undefined,
  prefix: string,
  options?: {
    queryParam?: string; // param a limpiar de la URL
    scrollContainer?: HTMLElement | null;
    onFound?: (el: HTMLElement) => void;
    enabled?: boolean;
    deps?: any[];
  }
) {
  const didRunRef = useRef<string | null>(null);
  const enabled = options?.enabled !== false;
  const deps = options?.deps || [];

  useEffect(() => {
    if (!enabled || !targetId) return;
    if (didRunRef.current === targetId) return;

    let attempts = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      attempts++;
      const el = document.getElementById(`${prefix}${targetId}`);
      if (el) {
        didRunRef.current = targetId;

        // Scroll
        if (options?.scrollContainer) {
          options.scrollContainer.scrollTo({ top: el.offsetTop - 40, behavior: "smooth" });
        } else {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Highlight arcade neón
        el.classList.add("arcade-report-highlight");
        setTimeout(() => el.classList.remove("arcade-report-highlight"), 3500);

        options?.onFound?.(el);

        // Limpiar query param
        if (options?.queryParam && typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete(options.queryParam);
          window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
        }
      } else if (attempts < 80) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, enabled, ...deps]);
}
