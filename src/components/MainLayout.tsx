import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ForumSidebar from "@/components/ForumSidebar";
import RightPanel from "@/components/RightPanel";
import GameBubble from "@/components/GameBubble";
import NavigationButtons from "@/components/NavigationButtons";
import FloatingChat from "@/components/FloatingChat";
import ChillMusicPlayer from "@/components/ChillMusicPlayer";
import SiteLanguageSelect from "@/components/SiteLanguageSelect";
import { Menu, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  // 🔥 Auto-hide de la "barra en L" (hamburguesa + footer info) tras 3.5s sin interacción.
  // SOLO se activa cuando hay un juego maximizado (modo teatro o fullscreen),
  // para no tapar los controles del emulador. En navegación normal SIEMPRE visibles.
  const [lBarVisible, setLBarVisible] = useState(true);
  const [gameMaximized, setGameMaximized] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const location = useLocation();
  const mobileTopBarHeight = 46;

  // 📱 Detectar orientación landscape en móvil/tablet → footer pasa a ser rightbar
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    if (!isMobile) { setIsLandscape(false); return; }
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [isMobile]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Detectar si hay un juego maximizado (popup de GameBubble en pantalla completa o modo teatro)
  useEffect(() => {
    if (!isMobile) return;
    const check = () => {
      const fs = !!document.fullscreenElement;
      const theater = !!document.getElementById("batocera-target");
      setGameMaximized(fs || theater);
    };
    check();
    const interval = setInterval(check, 300);
    document.addEventListener("fullscreenchange", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("fullscreenchange", check);
    };
  }, [isMobile, location.pathname]);

  // Auto-hide timer (solo móvil/tablet + juego maximizado)
  const scheduleHide = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setLBarVisible(false);
    }, 3500);
  };

  const showLBar = () => {
    setLBarVisible(true);
    if (gameMaximized) scheduleHide();
  };

  useEffect(() => {
    // Si no es móvil, o no hay juego maximizado, o hay paneles abiertos → SIEMPRE visible
    if (!isMobile || !gameMaximized || mobileRightOpen || mobileSidebarOpen) {
      setLBarVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isMobile, gameMaximized, mobileRightOpen, mobileSidebarOpen, location.pathname]);

  // Detectar toques en bordes (izquierdo o inferior) para reaparecer la barra
  // Solo activo cuando hay juego maximizado
  useEffect(() => {
    if (!isMobile || !gameMaximized) return;
    const EDGE = 24; // px desde el borde
    const handler = (e: TouchEvent | MouseEvent) => {
      const point = "touches" in e ? e.touches[0] : (e as MouseEvent);
      if (!point) return;
      const x = point.clientX;
      const y = point.clientY;
      const h = window.innerHeight;
      if (x <= EDGE || y >= h - EDGE) {
        if (!lBarVisible) setLBarVisible(true);
        scheduleHide();
      } else if (!mobileRightOpen && !mobileSidebarOpen) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        setLBarVisible(false);
      }
    };
    window.addEventListener("touchstart", handler, { passive: true });
    window.addEventListener("mousemove", handler);
    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("mousemove", handler);
    };
  }, [isMobile, gameMaximized, lBarVisible]);

  const toggleMobileRight = () => {
    const nextState = !mobileRightOpen;
    setMobileRightOpen(nextState);
    
    if (!nextState && mobileScrollRef.current) {
      mobileScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    window.dispatchEvent(new CustomEvent("syncMusicPlayer", { detail: { open: nextState } }));
  };

  useEffect(() => {
    const handleOpenPanel = () => {
      setMobileRightOpen(true);
      window.dispatchEvent(new CustomEvent("syncMusicPlayer", { detail: { open: true } }));
    };
    window.addEventListener("openMobilePanel", handleOpenPanel);
    return () => window.removeEventListener("openMobilePanel", handleOpenPanel);
  }, []);

  return (
    <div className="flex bg-background text-foreground w-full h-[100dvh] lg:h-auto lg:min-h-screen overflow-hidden lg:overflow-visible relative">
      {/* Sidebar de PC (Oculto en Tablet y Celular) */}
      <div className="hidden lg:block sticky top-0 h-screen">
        <ForumSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Menú Hamburguesa flotante (Visible en Tablet y Celular) - se auto-oculta tras 3.5s */}
      <div
        className={cn(
          "lg:hidden fixed inset-x-0 top-0 z-50 flex h-[46px] items-center justify-between border-b border-border/70 bg-background/92 px-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-300",
          lBarVisible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-full pointer-events-none"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded border border-border/60 bg-card/80 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setMobileSidebarOpen(true);
            showLBar();
          }}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center leading-none">
          <span
            className="font-pixel text-[9px] uppercase tracking-[0.28em]"
            style={{ color: "#de1839", textShadow: "0 0 7px rgba(222, 24, 57, 0.45)" }}
          >
            FORBIDDENS
          </span>
          <span className="mt-0.5 h-px w-16 bg-gradient-to-r from-transparent via-[#de1839]/55 to-transparent" />
        </div>
        <SiteLanguageSelect compact className="bg-card/80" />
      </div>

      {/* Fondo oscuro al abrir menú lateral en móviles */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative w-64 h-full bg-card animate-in slide-in-from-left">
            <ForumSidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* 🔥 FIX MAESTRO: main en celular tiene exactamente 100dvh menos 104px del footer. 🔥 */}
      <main
        className={cn(
          "flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden lg:h-auto lg:overflow-visible",
          isLandscape
            ? "h-[100dvh] transition-[padding-right] duration-300"
            : "h-[calc(100dvh-104px)]"
        )}
        style={
          isMobile
            ? {
                height: isLandscape ? `calc(100dvh - ${mobileTopBarHeight}px)` : `calc(100dvh - ${mobileTopBarHeight}px - 104px)`,
                marginTop: `${mobileTopBarHeight}px`,
                paddingRight: isLandscape ? (mobileRightOpen ? "min(60vw, 380px)" : "56px") : undefined,
              }
            : undefined
        }
      >
        {/* 🔥 FIX SECUNDARIO: Removidos paddings en celular (p-0) para que el hijo ocupe el 100% exacto 🔥 */}
        <div className="flex-1 flex flex-col lg:flex-row gap-0 lg:gap-3 2xl:gap-8 p-0 lg:p-3 2xl:p-6 pb-0 lg:pb-4 2xl:pb-6 max-w-[1800px] mx-auto w-full h-full">
          <div className="flex-1 min-w-0 flex flex-col h-full">
            <Outlet />
          </div>
          
          {/* Panel Derecho (Solo en PC) */}
          <div className="hidden lg:block w-60 xl:w-72 2xl:w-80 shrink-0 sticky top-3 2xl:top-4 h-[calc(100vh-1.5rem)] 2xl:h-[calc(100vh-2rem)]">
            <RightPanel />
          </div>
        </div>

        {/* Footer (Visible en Tablet y Celular). En landscape se convierte en rightbar */}
        {isMobile && (
          <div className={cn(
            "lg:hidden fixed bg-card border-border z-[80] transition-all duration-300 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]",
            isLandscape
              ? cn(
                  "top-[46px] bottom-0 right-0 border-l",
                  mobileRightOpen ? "w-[60vw] max-w-[380px]" : "w-[56px]"
                )
              : cn(
                  "left-0 right-0 border-t",
                  mobileRightOpen ? "h-[80vh] bottom-0" : "h-[110px] bottom-[-6px]"
                ),
            !lBarVisible && !mobileRightOpen
              ? (isLandscape ? "translate-x-full opacity-0 pointer-events-none" : "translate-y-full opacity-0 pointer-events-none")
              : "translate-x-0 translate-y-0 opacity-100 pointer-events-auto"
          )}>
            <button 
              onClick={toggleMobileRight}
              className={cn(
                "flex items-center justify-center gap-2 font-pixel text-[10px] text-muted-foreground border-border/30 shrink-0",
                isLandscape ? "w-full h-12 border-b writing-mode-vertical" : "w-full h-10 border-b"
              )}
            >
              {isLandscape ? (
                mobileRightOpen ? <ChevronUp className="w-4 h-4 rotate-90" /> : <ChevronDown className="w-4 h-4 rotate-90" />
              ) : (
                mobileRightOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />
              )}
              {!isLandscape && "INFO & COMUNIDAD"}
            </button>
            {/* Slot fijo del reproductor SOLO visible cuando el footer está colapsado (mini player). */}
            {!mobileRightOpen && !isLandscape && (
              <div className="shrink-0 px-3 pt-1 pb-1 pointer-events-auto">
                <div id="music-slot-mobile-collapsed" className="w-full" />
              </div>
            )}

            <div 
              ref={mobileScrollRef}
              className={cn(
                "flex-1 w-full overflow-y-auto overflow-x-hidden retro-scrollbar px-3 pt-1 pb-5 min-h-0",
                mobileRightOpen ? "" : "overflow-hidden pointer-events-none hidden"
              )}
            >
              <div className="pointer-events-auto">
                <div id="music-slot-mobile" className="w-full mb-3" />
                <RightPanel />
              </div>
            </div>
          </div>
        )}
      </main>

      <NavigationButtons />
      <GameBubble />
      <FloatingChat />
      {/* 🎵 ChillMusicPlayer: instancia ÚNICA siempre montada. Se portalea al slot activo
          (desktop / mobile / emulador) sin remontar — evita audio duplicado. */}
      <ChillMusicPlayer />
    </div>
  );
}
