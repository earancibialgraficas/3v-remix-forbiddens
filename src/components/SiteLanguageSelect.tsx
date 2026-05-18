import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

type SiteLanguage = "es" | "en" | "fr" | "de" | "pt" | "it" | "ja" | "ko" | "zh-CN";

const siteLanguages: Array<{ value: SiteLanguage; label: string }> = [
  { value: "es", label: "ES" },
  { value: "en", label: "EN" },
  { value: "fr", label: "FR" },
  { value: "de", label: "DE" },
  { value: "pt", label: "PT" },
  { value: "it", label: "IT" },
  { value: "ja", label: "JA" },
  { value: "ko", label: "KO" },
  { value: "zh-CN", label: "ZH" },
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

interface SiteLanguageSelectProps {
  compact?: boolean;
  className?: string;
}

export default function SiteLanguageSelect({ compact = false, className }: SiteLanguageSelectProps) {
  const [siteLanguage, setSiteLanguage] = useState<SiteLanguage>(() => (localStorage.getItem("forbiddens_site_language") as SiteLanguage) || "es");

  const changeSiteLanguage = (language: SiteLanguage) => {
    setSiteLanguage(language);
    localStorage.setItem("forbiddens_site_language", language);
    if (language === "es") {
      clearGoogleTranslateCookie();
      window.location.reload();
      return;
    }
    applyGoogleTranslateLanguage(language);
  };

  useEffect(() => {
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
  }, [siteLanguage]);

  return (
    <label
      className={cn(
        "flex items-center gap-1 rounded border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground",
        compact ? "h-8 px-1.5" : "h-8 px-1.5",
        className,
      )}
      title="Traducir sitio"
    >
      <Languages className={cn("shrink-0", compact ? "h-3.5 w-3.5" : "h-3.5 w-3.5")} />
      <select
        value={siteLanguage}
        onChange={(event) => changeSiteLanguage(event.target.value as SiteLanguage)}
        className={cn("bg-transparent font-pixel uppercase text-current outline-none", compact ? "h-6 w-[46px] text-[8px]" : "h-6 w-[48px] text-[8px]")}
        aria-label="Traducir sitio"
      >
        {siteLanguages.map((language) => (
          <option key={language.value} value={language.value}>{language.label}</option>
        ))}
      </select>
    </label>
  );
}
