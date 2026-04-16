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

  useEffect(() => {
    setMobileSidebarOpen(false);
    if (!loading && isReady) {
      document.body.style.overflow = 'auto';
    }
  }, [location.pathname, loading, isReady]);

  // Cargador más sutil que no bloquea la visibilidad si hay un error
  const LoadingOverlay = (loading || !isReady) ? (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none transition-opacity duration-500">
      <div className="bg-card/90 p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-pixel text-primary animate-pulse uppercase tracking-widest">Sincronizando...</p>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col bg-background text-foreground w-full min-h-screen relative">
      {LoadingOverlay}

      {/* SIDEBAR ESCRITORIO */}
      <div className="hidden md:block h-screen fixed top-0 left-0 z-40">
        <ForumSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* BOTÓN MENU MÓVIL */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-2 left-2 h-10 w-10 md:hidden z-[60] bg-card/90 backdrop-blur border border-border shadow-xl"
        onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
      >
        <Menu className="w-6 h-6" />
      </Button>

      {/* SIDEBAR MÓVIL */}
      <div className={cn(
        "md:hidden fixed inset-0 z-[500] transition-all duration-300",
        mobileSidebarOpen ? "visible" : "invisible"
      )}>
        <div className={cn("absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity", mobileSidebarOpen ? "opacity-100" : "opacity-0")} onClick={() => setMobileSidebarOpen(false)} />
        <div className={cn("absolute top-0 left-0 h-full w-64 bg-card shadow-2xl transition-transform duration-300", mobileSidebarOpen ? "translate-x-0" : "-translate-x-full")}>
          <ForumSidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
        </div>
      </div>

      <NavigationButtons />

      {/* CONTENIDO PRINCIPAL */}
      <main className={cn(
        "flex-1 transition-all duration-300 md:ml-16",
        !sidebarCollapsed && "md:ml-60",
        isMobile && "pb-16"
      )}>
        <div className="flex gap-4 p-4 max-w-7xl mx-auto min-h-full">
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
          
          {/* PANEL DERECHO (ESCRITORIO) */}
          <div className="hidden lg:block w-[22%] min-w-[220px] max-w-[300px] shrink-0">
            <RightPanel />
          </div>
        </div>
      </main>

      {/* PANEL DERECHO MÓVIL (PERSISTENTE PARA MÚSICA) */}
      <div
        className={cn(
          "lg:hidden fixed left-0 right-0 z-[105] bg-card border-t border-border overflow-y-auto transition-all duration-500 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]",
          mobileRightOpen ? "bottom-12 h-[50dvh] opacity-100" : "bottom-[-60dvh] h-0 opacity-0"
        )}
      >
        <div className="p-4">
          <RightPanel />
        </div>
      </div>

      {/* BOTÓN INFO & COMUNIDAD */}
      {isMobile && (
        <button
          onClick={() => setMobileRightOpen(!mobileRightOpen)}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-[110] bg-card border-t border-border flex items-center justify-center py-3 gap-2 text-[10px] font-pixel text-muted-foreground shadow-lg transition-colors"
        >
          {mobileRightOpen ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronUp className="w-4 h-4" />}
          {mobileRightOpen ? "OCULTAR PANEL" : "INFO & COMUNIDAD"}
        </button>
      )}

      <GameBubble />
      <FloatingChat />
    </div>
  );
}