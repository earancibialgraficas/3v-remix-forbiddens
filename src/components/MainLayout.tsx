import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ForumSidebar from "@/components/ForumSidebar";
import RightPanel from "@/components/RightPanel";
import GameBubble from "@/components/GameBubble";
import NavigationButtons from "@/components/NavigationButtons";
import NotificationBell from "@/components/NotificationBell";
import FloatingChat from "@/components/FloatingChat";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  return (
    <div className="flex flex-col" style={{ minHeight: '100dvh' }}>
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

      {/* Fixed nav buttons on the left (hidden on home) */}
      <NavigationButtons />

      {/* Main content — flex-1 ensures it fills remaining space */}
      <main className={cn(
        "flex-1 min-w-0 transition-all duration-300",
        "md:ml-12",
        !sidebarCollapsed && "md:ml-56"
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
      </main>

      {/* Global game bubble */}
      <GameBubble />

      {/* Floating chat bubble */}
      <FloatingChat />
    </div>
  );
}
