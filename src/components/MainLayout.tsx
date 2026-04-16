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
import { useAuth } from "@/hooks/useAuth";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  
  const isMobile = useIsMobile();
  const location = useLocation();
  const { loading, isReady } = useAuth();

  // Cerrar el menú lateral al navegar, pero dejamos el panel derecho 
  // como esté para no interrumpir la música si el usuario no quiere.
  useEffect(() => {
    setMobileSidebarOpen(false);
    if (!loading && isReady) {
      document.body.style.overflow = 'auto';
    }
  }, [location.pathname, loading, isReady]);

  // Cargador que no bloquea la música ni los clics si ya terminó
  const LoadingOverlay = (loading || !isReady) ? (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-md pointer-events-none transition-opacity duration-500">
      <div className="bg-card/90 p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-pixel text-primary animate-pulse uppercase tracking-widest">Sincronizando...</p>
      </div>
    </div>
  ) : null;

  return (
    <div 
      className="flex flex-col bg-background text-foreground w-full h-screen overflow-hidden relative" 
    >
      {LoadingOverlay}

      {/* SIDEBAR ESCRITORIO */}
      <div className="hidden md:block">
        <ForumSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* BOTONES DE INTERFAZ MÓVIL */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-2 left-2 h-10 w-10 md:hidden z-[60] bg-card/90 backdrop-blur border border-border shadow-xl"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      >
        <Menu className="w-6 h-6" />
      </Button>

      {isMobile && (
        <div className="fixed top-2 right-2 z-[60]">
          <div className="bg-card/90 backdrop-blur border border-border shadow-lg rounded-full p-0.5">
            <NotificationBell />
          </div>
        </div>
      )}

      {/* NAVBAR MÓVIL (SIDEBAR) - ESTRUCTURA ANTI-BLOQUEO NEGRO */}
      <div className={cn(
        "md:hidden fixed inset-0 z-[500] transition-all duration-300",
        mobileSidebarOpen ? "visible" : "invisible"
      )}>
        {/* Fondo oscuro suave */}
        <div 
          className={cn(
            "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
            mobileSidebarOpen ? "opacity-100" : "opacity-0"
          )} 
          onClick={() => setMobileSidebarOpen(false)} 
        />
        
        {/* El Menú deslizable */}
        <div className={cn(
          "absolute top-0 left-0 h-full w-64 bg-card shadow-2xl transition-transform duration-300 ease-out",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <ForumSidebar
            collapsed={false}
            onToggle={() => setMobileSidebarOpen(false)}
          />
        </div>
      </div>

      <NavigationButtons />

      {/* CONTENIDO PRINCIPAL */}
      <div className={cn(
        "flex-1 min-w-0 transition-all duration-300 overflow-y-auto overflow-x-hidden md:ml-14",
        !sidebarCollapsed && "md:ml-60",
        isMobile && "pb-14" // Espacio para el botón de abajo
      )}>
        <div className="flex gap-4 p-4 max-w-7xl mx-auto min-h-full">
          <div className="flex-1 min-w-0">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </div>
          
          {/* Panel derecho (Escritorio) */}
          <div className="hidden lg:block w-[22%] min-w-[220px] max-w-[300px] shrink-0">
            <RightPanel />
          </div>
        </div>
      </div>

      {/* PANEL DERECHO MÓVIL (PERSISTENTE PARA LA MÚSICA) */}
      <div
        className={cn(
          "lg:hidden fixed left-0 right-0 z-[105] bg-card border-t border-border overflow-y-auto transition-all duration-500 ease-in-out shadow-[0_-10px_30px_rgba(0,0,0,0.5)]",
          mobileRightOpen ? "bottom-10 h-[55dvh] opacity-100 visible" : "bottom-[-70dvh] h-0 opacity-0 invisible"
        )}
      >
        <div className="p-4">
          <RightPanel />
        </div>
      </div>

      {/* BOTÓN "INFO & COMUNIDAD" (MÓVIL) */}
      {isMobile && (
        <button
          onClick={() => setMobileRightOpen(!mobileRightOpen)}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] bg-card border-t border-border flex items-center justify-center py-3 gap-2 text-[10px] font-pixel text-muted-foreground shadow-[0_-4px_15px_rgba(0,0,0,0.4)] hover:text-primary transition-colors"
        >
          {mobileRightOpen ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronUp className="w-4 h-4" />}
          {mobileRightOpen ? "OCULTAR PANEL" : "INFO & COMUNIDAD"}
        </button>
      )}

      {/* EXTRAS GLOBALES */}
      <GameBubble />
      <FloatingChat />
    </div>
  );
}