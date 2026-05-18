import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

type SiteLanguage = "es" | "en" | "fr" | "de" | "pt" | "it" | "ja" | "ko" | "zh-CN";

const siteLanguages: Array<{ value: SiteLanguage; label: string; name: string }> = [
  { value: "es", label: "ES", name: "Espanol" },
  { value: "en", label: "EN", name: "English" },
  { value: "fr", label: "FR", name: "Francais" },
  { value: "de", label: "DE", name: "Deutsch" },
  { value: "pt", label: "PT", name: "Portugues" },
  { value: "it", label: "IT", name: "Italiano" },
  { value: "ja", label: "JA", name: "Japones" },
  { value: "ko", label: "KO", name: "Coreano" },
  { value: "zh-CN", label: "ZH", name: "Chino" },
];

const GOOGLE_TRANSLATE_ELEMENT_ID = "google_translate_element_global";

const clearGoogleTranslateCookie = () => {
  const expires = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `googtrans=; ${expires}; path=/`;
  document.cookie = `googtrans=; ${expires}; path=/; domain=${window.location.hostname}`;
  const parts = window.location.hostname.split(".");
  if (parts.length > 1) {
    document.cookie = `googtrans=; ${expires}; path=/; domain=.${parts.slice(-2).join(".")}`;
  }
};

const ensureTranslateContainer = () => {
  let element = document.getElementById(GOOGLE_TRANSLATE_ELEMENT_ID);
  if (element) return element;
  element = document.createElement("div");
  element.id = GOOGLE_TRANSLATE_ELEMENT_ID;
  element.style.display = "none";
  document.body.appendChild(element);
  return element;
};

const applyGoogleTranslateLanguage = (language: SiteLanguage) => {
  if (language === "es") {
    clearGoogleTranslateCookie();
    return;
  }

  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!combo) return;
  combo.value = language;
  combo.dispatchEvent(new Event("change", { bubbles: true }));
};

const hideGoogleTranslateChrome = () => {
  document.body.style.top = "0px";
  document.documentElement.style.top = "0px";
  document.querySelectorAll<HTMLElement>(
    ".goog-te-banner-frame, .goog-te-balloon-frame, .goog-te-gadget, .VIpgJd-ZVi9od-ORHb-OEVmcd, .VIpgJd-ZVi9od-l4eHX-hSRGPd, iframe.skiptranslate",
  ).forEach((element) => {
    element.style.display = "none";
    element.style.visibility = "hidden";
    element.style.pointerEvents = "none";
  });
};

interface SiteLanguageSelectProps {
  compact?: boolean;
  className?: string;
}

export default function SiteLanguageSelect({ compact = false, className }: SiteLanguageSelectProps) {
  const [siteLanguage, setSiteLanguage] = useState<SiteLanguage>(() => (localStorage.getItem("forbiddens_site_language") as SiteLanguage) || "es");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeLanguage = siteLanguages.find((language) => language.value === siteLanguage) || siteLanguages[0];

  const changeSiteLanguage = (language: SiteLanguage) => {
    setSiteLanguage(language);
    setOpen(false);
    localStorage.setItem("forbiddens_site_language", language);
    if (language === "es") {
      clearGoogleTranslateCookie();
      window.location.reload();
      return;
    }
    applyGoogleTranslateLanguage(language);
    window.setTimeout(hideGoogleTranslateChrome, 200);
    window.setTimeout(hideGoogleTranslateChrome, 900);
  };

  useEffect(() => {
    hideGoogleTranslateChrome();
    ensureTranslateContainer();
    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: "es",
          includedLanguages: siteLanguages.filter((language) => language.value !== "es").map((language) => language.value).join(","),
          autoDisplay: false,
        },
        GOOGLE_TRANSLATE_ELEMENT_ID,
      );
      window.setTimeout(() => applyGoogleTranslateLanguage(siteLanguage), 500);
      window.setTimeout(hideGoogleTranslateChrome, 700);
    };

    if (!(window as any).google?.translate?.TranslateElement && !document.querySelector("script[data-google-translate='true']")) {
      const script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.dataset.googleTranslate = "true";
      document.body.appendChild(script);
      return;
    }

    window.setTimeout(() => applyGoogleTranslateLanguage(siteLanguage), 300);
    window.setTimeout(hideGoogleTranslateChrome, 500);
  }, [siteLanguage]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(hideGoogleTranslateChrome);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    const timer = window.setInterval(hideGoogleTranslateChrome, 1000);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "group flex items-center gap-1 rounded border border-neon-cyan/25 bg-black/55 text-neon-cyan shadow-[0_0_12px_rgba(34,211,238,0.12)] transition-all hover:border-neon-cyan/60 hover:bg-neon-cyan/10 hover:text-white",
          compact ? "h-8 px-2" : "h-8 px-2.5",
        )}
        aria-label="Traducir sitio"
        aria-expanded={open}
        title="Traducir sitio"
      >
        <Languages className="h-3.5 w-3.5 shrink-0 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
        <span className={cn("font-pixel leading-none", compact ? "text-[8px]" : "text-[8px]")}>{activeLanguage.label}</span>
        <ChevronDown className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[9999] mt-1 w-40 overflow-hidden rounded border border-neon-cyan/35 bg-black/95 p-1 shadow-2xl shadow-neon-cyan/10 backdrop-blur-md animate-fade-in">
          <div className="px-2 py-1.5 font-pixel text-[7px] uppercase tracking-widest text-neon-cyan/80">
            Idioma
          </div>
          {siteLanguages.map((language) => {
            const selected = language.value === siteLanguage;
            return (
              <button
                key={language.value}
                type="button"
                onClick={() => changeSiteLanguage(language.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors",
                  selected ? "bg-neon-cyan/15 text-neon-cyan" : "text-muted-foreground hover:bg-white/10 hover:text-white",
                )}
              >
                <span className="w-7 shrink-0 font-pixel text-[8px]">{language.label}</span>
                <span className="min-w-0 flex-1 truncate text-[10px]">{language.name}</span>
                {selected && <Check className="h-3 w-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
