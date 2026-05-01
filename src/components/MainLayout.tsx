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
  
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const location = useLocation();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

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
    <div className="flex bg-background text-foreground w-full min-h-screen relative">
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

      {/* 🔥 FIX: En móvil, en vez de pb-[105px] que añadía scroll innecesario, limitamos la altura
          máxima del main a (100vh - 104px = altura visible del footer minimizado). Así el contenido
          nunca queda tapado por el footer y solo hace scroll si su contenido real lo excede. 🔥 */}
      <main className="flex-1 flex flex-col min-w-0 max-h-[calc(100vh-104px)] overflow-y-auto lg:max-h-none lg:overflow-visible">
        <div className="flex-1 flex gap-4 xl:gap-8 p-4 xl:p-6 max-w-[1800px] mx-auto w-full">
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