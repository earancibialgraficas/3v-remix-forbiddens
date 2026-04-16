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
  const { loading, isReady } = useAuth(); //

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex bg-background text-foreground w-full min-h-screen relative overflow-x-hidden">
      
      {/* CARGADOR FANTASMA - No bloquea la vista */}
      {loading && !isReady && (
        <div className="fixed top-2 right-12 z-[100] animate-pulse pointer-events-none">
          <div className="bg-card/80 backdrop-blur border border-primary/20 px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
            <span className="text-[8px] font-pixel text-primary uppercase">Sincronizando</span>
          </div>
        </div>
      )}

      {/* SIDEBAR ESCRITORIO */}
      <div className="hidden md:block sticky top-0 h-screen shrink-0 z-40">
        <ForumSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* MOBILE TRIGGER */}
      {!mobileSidebarOpen && (
        <div className="md:hidden fixed top-2 left-2 z-50">
          <Button variant="secondary" size="icon" className="h-8 w-8 shadow-lg bg-card/90" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* MOBILE SIDEBAR MODAL */}
      <div className={cn(
        "md:hidden fixed inset-0 z-[100] flex transition-all duration-300",
        mobileSidebarOpen ? "visible" : "invisible"
      )}>
        <div className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300", mobileSidebarOpen ? "opacity-100" : "opacity-0")} onClick={() => setMobileSidebarOpen(false)} />
        <div className={cn(
          "absolute top-0 left-0 h-full w-64 bg-card shadow-2xl transition-transform duration-300 ease-out",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <ForumSidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
        </div>
      </div>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex gap-4 p-3 max-w-7xl mx-auto w-full">
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
          
          <div className="hidden lg:block w-[280px] shrink-0">
            <RightPanel />
          </div>
        </div>

        {/* PANEL DERECHO MÓVIL */}
        {isMobile && (
          <div className={cn(
            "fixed bottom-0 left-0 right-0 bg-card border-t border-border z-[80] transition-all duration-500",
            mobileRightOpen ? "h-[55vh]" : "h-11"
          )}>
            <button 
              onClick={() => setMobileRightOpen(!mobileRightOpen)}
              className="w-full h-11 flex items-center justify-center gap-2 font-pixel text-[9px] text-muted-foreground border-b border-border/50"
            >
              {mobileRightOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              INFO & COMUNIDAD
            </button>
            <div className={cn("p-4 h-[calc(55vh-2.75rem)] overflow-y-auto", !mobileRightOpen && "hidden")}>
              <RightPanel />
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