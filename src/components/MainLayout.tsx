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

  // FIX: Cerrar sidebar al navegar, pero mantener el estado del panel derecho si prefieres
  useEffect(() => {
    setMobileSidebarOpen(false);
    
    if (!loading && isReady) {
      document.body.style.overflow = 'auto';
    }
  }, [location.pathname, loading, isReady]);

  // CARGADOR FANTASMA: No bloquea el renderizado (la música sigue viva debajo)
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
      className="flex flex-col bg-background text-foreground w-full" 
      style={{ 
        minHeight: '100dvh', 
        height: '100dvh', 
        position: 'relative',
        overflow: 'hidden' 
      }}
    >
      {LoadingOverlay}

      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <ForumSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-2 left-2 h-9 w-9 md:hidden z-50 bg-card/90 backdrop-blur border border-border shadow-lg"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      >
        <Menu className="w-4 h-4" />
      </Button>

      {/* Mobile fixed notification bell */}
      {isMobile && (
        <div className="fixed top-2 right-2 z-50">
          <div className="bg-card/90 backdrop-blur border border-border shadow-lg rounded-full p-0.5">
            <NotificationBell />
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[200]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-[201] w-64 h-full animate-slide-in-left shadow-2xl">
            <ForumSidebar
              collapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      <NavigationButtons />

      {/* Área principal scrollable */}
      <div className={cn(
        "flex-1 min-w-0 transition-all duration-300 overflow-y-auto overflow-x-hidden",
        "md:ml-12",
        !sidebarCollapsed && "md:ml-56",
        // En móvil damos espacio abajo para el botón del panel
        isMobile && "pb-12"
      )}>
        <div className="flex gap-3 p-3 max-w-7xl mx-auto min-h-full">
          <div className="flex-1 min-w-0">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </div>
          
          {/* Panel derecho para escritorio */}
          <div className="hidden lg:block w-[20%] min-w-[180px] max-w-[280px] shrink-0">
            <RightPanel />
          </div>
        </div>
      </div>

      {/* --- SOLUCIÓN PARA LA MÚSICA EN MÓVIL --- */}
      {/* Este contenedor está SIEMPRE en el código para que la música NO se pare.
          Simplemente lo movemos con CSS (bottom) para mostrarlo u ocultarlo.
      */}
      <div
        className={cn(
          "lg:hidden fixed left-0 right-0 z-[105] bg-card border-t border-border overflow-y-auto transition-all duration-500 ease-in-out shadow-[0_-10px_30px_rgba(0,0,0,0.5)]",
          mobileRightOpen ? "bottom-10 h-[50dvh] opacity-100 visible" : "bottom-[-60dvh] h-0 opacity-0 invisible"
        )}
      >
        <div className="p-4">
          <RightPanel />
        </div>
      </div>

      {/* Botón disparador del panel (siempre visible en móvil) */}
      {isMobile && (
        <button
          onClick={() => setMobileRightOpen(!mobileRightOpen)}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] bg-card border-t border-border flex items-center justify-center py-2.5 gap-1 text-[10px] font-pixel text-muted-foreground shadow-[0_-4px_10px_rgba(0,0,0,0.3)] hover:text-primary transition-colors"
        >
          {mobileRightOpen ? <ChevronDown className="w-3 h-3 text-primary" /> : <ChevronUp className="w-3 h-3" />}
          {mobileRightOpen ? "OCULTAR PANEL" : "INFO & COMUNIDAD"}
        </button>
      )}

      {/* Componentes Globales Extras */}
      <GameBubble />
      <FloatingChat />
    </div>
  );
}