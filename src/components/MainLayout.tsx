import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

const location = useLocation(); // Asegúrate de que esta línea esté ahí

// FIX: Cerrar menús automáticamente al navegar
useEffect(() => {
  setMobileSidebarOpen(false);
  setMobileRightOpen(false);
}, [location.pathname]);

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
  const { loading, isReady } = useAuth();

// Solo mostrar el overlay de carga si realmente no estamos listos, 
// pero sin "matar" el renderizado del componente para evitar parpadeos negros
const LoadingOverlay = (!isReady && loading) ? (
  <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/60 backdrop-blur-md">
    <div className="text-center space-y-2">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-[10px] font-pixel text-muted-foreground uppercase tracking-widest">Cargando...</p>
    </div>
  </div>
) : null;

  return (
    <div className="flex flex-col bg-background text-foreground" style={{ minHeight: '100dvh', height: '100dvh', position: 'relative', overflow: 'hidden' }}>
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
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-[201] w-64 h-full animate-slide-in-left">
            <ForumSidebar
              collapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Fixed nav buttons on the left */}
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
          {/* Desktop right panel */}
          <div className="hidden lg:block w-[20%] min-w-[180px] max-w-[280px] shrink-0">
            <RightPanel />
          </div>
        </div>
      </div>

      {/* Mobile right panel as bottom tray */}
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
              <style>{`.mobile-right-tray::-webkit-scrollbar { display: none; }`}</style>
              <div className="p-3 mobile-right-tray" style={{ scrollbarWidth: 'none' }}>
                <RightPanel />
              </div>
            </div>
          )}
        </>
      )}

      {/* Global game bubble */}
      <GameBubble />

      {/* Floating chat bubble */}
      <FloatingChat />
    </div>
  );
}
