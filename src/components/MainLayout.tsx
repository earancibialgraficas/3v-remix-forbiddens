import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth"; // 🔥 IMPORTANTE

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);

  const isMobile = useIsMobile();
  const location = useLocation();

  // 🔥 NUEVO (CLAVE)
  const { isReady, loading } = useAuth();

  // 🔥 EVITA CRASH TOTAL
  if (!isReady || loading) {
    return null; // o loader si quieres
  }

  // Cerramos menús al cambiar de página
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex bg-background text-foreground w-full min-h-screen">
      
      {/* SIDEBAR ESCRITORIO */}
      <div className="hidden md:block sticky top-0 h-screen">
        <ForumSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-2 left-2 z-50 flex gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </Button>
      </div>

      {/* SIDEBAR MÓVIL */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-[100] flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 h-full bg-card animate-in slide-in-from-left">
            <ForumSidebar
              collapsed={false}
              onToggle={() => setMobileSidebarOpen(false)}
            />
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
          <div className="hidden lg:block w-72 shrink-0">
            <RightPanel />
          </div>
        </div>

        {/* PANEL DERECHO MÓVIL */}
        {isMobile && (
          <div
            className={cn(
              "fixed bottom-0 left-0 right-0 bg-card border-t border-border z-[80] transition-all",
              mobileRightOpen ? "h-[60vh]" : "h-12"
            )}
          >
            <button
              onClick={() => setMobileRightOpen(!mobileRightOpen)}
              className="w-full h-12 flex items-center justify-center gap-2 font-pixel text-[10px] text-muted-foreground"
            >
              {mobileRightOpen ? <ChevronDown /> : <ChevronUp />}
              INFO & COMUNIDAD
            </button>

            {mobileRightOpen && (
              <div className="p-4 h-[calc(60vh-3rem)] overflow-y-auto">
                <RightPanel />
              </div>
            )}
          </div>
        )}
      </main>

      <NavigationButtons />
      <GameBubble />
      <FloatingChat />
    </div>
  );
}