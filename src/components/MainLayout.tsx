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

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  
  const isMobile = useIsMobile();
  const location = useLocation();

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex bg-[#0a0a0c] text-foreground w-full min-h-screen relative overflow-x-hidden">
      
      {/* SIDEBAR ESCRITORIO */}
      <div className="hidden md:block sticky top-0 h-screen shrink-0 z-40">
        <ForumSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      {/* MOBILE TRIGGER */}
      {!mobileSidebarOpen && (
        <div className="md:hidden fixed top-2 left-2 z-[60]">
          <Button variant="secondary" size="icon" className="h-9 w-9 bg-[#0f0f12] border border-white/5 shadow-xl" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* MOBILE SIDEBAR MODAL */}
      <div className={cn("md:hidden fixed inset-0 z-[100] transition-all duration-300", mobileSidebarOpen ? "visible" : "invisible")}>
        <div className={cn("absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300", mobileSidebarOpen ? "opacity-100" : "opacity-0")} onClick={() => setMobileSidebarOpen(false)} />
        <div className={cn("absolute top-0 left-0 h-full w-64 bg-[#0f0f12] shadow-2xl transition-transform duration-300", mobileSidebarOpen ? "translate-x-0" : "-translate-x-full")}>
          <ForumSidebar collapsed={false} onToggle={() => setMobileSidebarOpen(false)} />
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex gap-4 p-4 max-w-7xl mx-auto w-full">
          <div className="flex-1 min-w-0">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </div>
          
          <div className="hidden lg:block w-[300px] shrink-0">
            <RightPanel />
          </div>
        </div>

        {/* PANEL MÓVIL (MÚSICA) */}
        {isMobile && (
          <div className={cn("fixed bottom-0 left-0 right-0 bg-[#0f0f12] border-t border-white/5 z-[80] transition-all duration-500", mobileRightOpen ? "h-[55vh]" : "h-12")}>
            <button onClick={() => setMobileRightOpen(!mobileRightOpen)} className="w-full h-12 flex items-center justify-center gap-2 font-pixel text-[9px] text-muted-foreground border-b border-white/5">
              {mobileRightOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              INFO & COMUNIDAD
            </button>
            <div className={cn("p-4 h-[calc(55vh-3rem)] overflow-y-auto", !mobileRightOpen && "hidden")}>
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