import { useState, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ForumSidebar from "@/components/ForumSidebar";
import RightPanel from "@/components/RightPanel";
import GameBubble from "@/components/GameBubble";
import NavigationButtons from "@/components/NavigationButtons";
import FloatingChat from "@/components/FloatingChat";
import { Menu, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  // 🔥 Auto-hide de la "barra en L" (hamburguesa + footer info) tras 3.5s sin interacción.
  // Reaparecen al tocar el borde izquierdo o el borde inferior de la pantalla.
  const [lBarVisible, setLBarVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const location = useLocation();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Auto-hide timer (solo móvil/tablet)
  const scheduleHide = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      // No ocultar si el panel inferior está abierto o si el menú lateral está abierto
      setLBarVisible(false);
    }, 3500);
  };

  const showLBar = () => {
    setLBarVisible(true);
    scheduleHide();
  };

  useEffect(() => {
    if (!isMobile) {
      setLBarVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    // No ocultar mientras esté abierto el panel info o el menú lateral
    if (mobileRightOpen || mobileSidebarOpen) {
      setLBarVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      return;
    }
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isMobile, mobileRightOpen, mobileSidebarOpen, location.pathname]);

  // Detectar toques en bordes (izquierdo o inferior) para reaparecer la barra
  useEffect(() => {
    if (!isMobile) return;
    const EDGE = 24; // px desde el borde
    const handler = (e: TouchEvent | MouseEvent) => {
      const point = "touches" in e ? e.touches[0] : (e as MouseEvent);
      if (!point) return;
      const x = point.clientX;
      const y = point.clientY;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (x <= EDGE || y >= h - EDGE) {
        if (!lBarVisible) setLBarVisible(true);
        scheduleHide();
      }
    };
    window.addEventListener("touchstart", handler, { passive: true });
    window.addEventListener("mousemove", handler);
    return () => {
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("mousemove", handler);
    };
  }, [isMobile, lBarVisible]);

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
    /* 🔥 FIX MAESTRO: En móvil/tablet usamos h-[100dvh] (NO min-h-screen) para que el contenedor 
        ocupe EXACTAMENTE el viewport y nunca haya scroll global. El scroll vive solo dentro de <main>.
        En desktop volvemos a min-h-screen para permitir scroll normal de página completa. 🔥 */
    <div className="flex bg-background text-foreground w-full h-[100dvh] lg:h-auto lg:min-h-screen overflow-hidden lg:overflow-visible relative">
      {/* Sidebar de PC (Oculto en Tablet y Celular) */}
      <div className="hidden lg:block sticky top-0 h-screen">
        <ForumSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* Menú Hamburguesa flotante (Visible en Tablet y Celular) */}
      <div className="lg:hidden fixed top-2 left-2 z-50 flex gap-2">
        <Button variant="secondary" size="icon" onClick={() => setMobileSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </Button>
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

      {/* 🔥 FIX: En móvil, <main> ocupa el espacio restante (viewport - 104px del footer fijo) y 
          es el ÚNICO scroll. Como el contenedor raíz es h-[100dvh] sin scroll global, no se 
          genera scroll innecesario en páginas cortas y el contenido nunca queda tapado por el footer.
          Añadimos pb-4 al contenedor interno para que el último contenido no toque la sombra del footer. 🔥 */}
      <main className="flex-1 flex flex-col min-w-0 h-[calc(100dvh-104px)] overflow-y-auto lg:h-auto lg:overflow-visible">
        <div className="flex-1 flex gap-4 xl:gap-8 p-4 xl:p-6 pb-6 lg:pb-6 max-w-[1800px] mx-auto w-full">
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
          
          {/* Panel Derecho (Solo en PC) */}
          <div className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-4 h-[calc(100vh-2rem)]">
            <RightPanel />
          </div>
        </div>

        {/* Footer (Visible en Tablet y Celular) */}
        {isMobile && (
          <div className={cn(
            "lg:hidden fixed left-0 right-0 bg-card border-t border-border z-[80] transition-all flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]",
            /* 🔥 FIX MAESTRO: Cuando está cerrado, lo bajamos 5px con bottom-[-5px] 🔥 */
            mobileRightOpen ? "h-[80vh] bottom-0" : "h-[110px] bottom-[-6px]"
          )}>
            <button 
              onClick={toggleMobileRight}
              className="w-full h-10 flex items-center justify-center gap-2 font-pixel text-[10px] text-muted-foreground border-b border-border/30 shrink-0"
            >
              {mobileRightOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              INFO & COMUNIDAD
            </button>
            
            <div 
              ref={mobileScrollRef}
              className={cn(
                "flex-1 w-full overflow-y-auto overflow-x-hidden retro-scrollbar px-3 pt-1 pb-5",
                mobileRightOpen ? "" : "overflow-hidden pointer-events-none"
              )}
            >
              <div className="pointer-events-auto">
                 <RightPanel />
              </div>
            </div>
          </div>
        )}
      </main>

      <NavigationButtons />
      <GameBubble />
      <FloatingChat />
    </div>
  );
}