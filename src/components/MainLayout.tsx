import { useState, useEffect } from "react"; // IMPORTANTE: Agregamos useEffect aquí
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
  // 1. Estados
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  
  // 2. Hooks de librerías y personalizados
  const isMobile = useIsMobile();
  const location = useLocation(); // Movido adentro
  const { loading, isReady } = useAuth();

// 3. FIX MAESTRO: Cerrar TODO al navegar o al cambiar estado de carga
useEffect(() => {
  setMobileSidebarOpen(false);
  setMobileRightOpen(false);
  
  // Esto asegura que si el navbar estaba abierto durante el login, 
  // se cierre forzosamente al terminar de cargar.
  if (!loading && isReady) {
     document.body.style.overflow = 'auto'; // Desbloquea el scroll del sitio
  }
}, [location.pathname, loading, isReady]);

const LoadingOverlay = (!isReady && loading) ? (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
    {/* Bajamos la opacidad y el blur para que NO sea una pantalla negra */}
    <div className="bg-card/80 p-4 rounded-xl border border-border shadow-2xl text-center space-y-2">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-[9px] font-pixel text-muted-foreground uppercase">Autenticando...</p>
    </div>
  </div>
) : null;

  return (
    <div className="flex flex-col bg-background text-foreground" style={{ minHeight: '100dvh', height: '100dvh', position: 'relative', overflow: 'hidden' }}>
      
      {/* Overlay de Carga (Agregado para que realmente se vea) */}
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
        className="fixed top-2 left-2 h-9 w-9 md:hidden z-50 bg-card/90 backdrop-blur border border-border shadow-lg text-muted-foreground hover:text-foreground"
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
      // CAMBIO: Usamos un color negro traslúcido manual en lugar de la variable de tema
      // para asegurar que nunca sea una pared sólida
      className="absolute inset-0 bg-black/40 backdrop-blur-sm"
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

      {/* Main scrollable area */}
      <div className={cn(
        "flex-1 min-w-0 transition-all duration-300 overflow-y-auto",
        "md:ml-12",
        !sidebarCollapsed && "md:ml-56",
        isMobile && mobileRightOpen && "pb-[42dvh]"
      )}>
        <div className="flex gap-3 p-3 max-w-7xl mx-auto">
          <div className="flex-1 min-w-0">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </div>
          <div className="hidden lg:block w-[20%] min-w-[180px] max-w-[280px] shrink-0">
            <RightPanel />
          </div>
        </div>
      </div>

      {/* Mobile right panel tray */}
      {isMobile && (
        <>
          <button
            onClick={() => setMobileRightOpen(!mobileRightOpen)}
            className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-card border-t border-border flex items-center justify-center py-1.5 gap-1 text-[10px] font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            {mobileRightOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
            {mobileRightOpen ? "Ocultar panel" : "Info & Comunidad"}
          </button>
          {mobileRightOpen && (
            <div
              className="lg:hidden fixed bottom-7 left-0 right-0 z-[99] bg-card border-t border-border overflow-y-auto"
              style={{ maxHeight: '40dvh', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="p-3">
                <RightPanel />
              </div>
            </div>
          )}
        </>
      )}

      <GameBubble />
      <FloatingChat />
    </div>
  );
}
