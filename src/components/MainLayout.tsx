import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ForumSidebar from "@/components/ForumSidebar";
import RightPanel from "@/components/RightPanel";
import GameBubble from "@/components/GameBubble";
import NavigationButtons from "@/components/NavigationButtons";
import NotificationBell from "@/components/NotificationBell";
import FloatingChat from "@/components/FloatingChat";
import { Menu, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  
  const isMobile = useIsMobile();
  const location = useLocation();

  // Cerramos menús al cambiar de página
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // 🔥 Escuchamos al reproductor: Si lo expanden, abrimos el panel completo
  useEffect(() => {
    const handleOpenPanel = () => setMobileRightOpen(true);
    window.addEventListener("openMobilePanel", handleOpenPanel);
    return () => window.removeEventListener("openMobilePanel", handleOpenPanel);
  }, []);

  return (
    <div className="flex bg-background text-foreground w-full min-h-screen">
      {/* SIDEBAR ESCRITORIO */}
      <div className="hidden md:block sticky top-0 h-screen">
        <ForumSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* MOBILE HEADER (Sólo si no hay sidebar abierto) */}
      <div className="md:hidden fixed top-2 left-2 z-50 flex gap-2">
        <Button variant="secondary" size="icon" onClick={() => setMobileSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* SIDEBAR MÓVIL */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <div className="relative w-64 h-full bg-card animate-in slide-in-from-left">
            <ForumSidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex gap-4 p-4 max-w-7xl mx-auto w-full">
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
          
          {/* PANEL DERECHO ESCRITORIO */}
          {/* 🔥 EL FIX: Evitamos que React ejecute el panel fantasma en celulares */}
          {!isMobile && (
            <div className="hidden lg:block w-72 shrink-0">
              <RightPanel />
            </div>
          )}
        </div>

        {/* PANEL DERECHO MÓVIL */}
        {isMobile && (
          <div className={cn(
            "fixed bottom-0 left-0 right-0 bg-card border-t border-border z-[80] transition-all flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]",
            mobileRightOpen ? "h-[80vh]" : "h-[105px]"
          )}>
            <button 
              onClick={() => setMobileRightOpen(!mobileRightOpen)}
              className="w-full h-10 flex items-center justify-center gap-2 font-pixel text-[10px] text-muted-foreground border-b border-border/30 shrink-0"
            >
              {mobileRightOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              INFO & COMUNIDAD
            </button>
            
            <div className={cn(
              "flex-1 w-full overflow-y-auto overflow-x-hidden retro-scrollbar p-3",
              mobileRightOpen ? "" : "overflow-hidden pointer-events-none"
            )}>
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