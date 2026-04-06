import { useState } from "react";
import { Outlet } from "react-router-dom";
import TopNavbar from "@/components/TopNavbar";
import ForumSidebar from "@/components/ForumSidebar";
import RightPanel from "@/components/RightPanel";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavbar
        onMenuToggle={() => {
          // On mobile: toggle overlay. On desktop: toggle collapse.
          if (window.innerWidth < 768) {
            setMobileSidebarOpen(!mobileSidebarOpen);
          } else {
            setSidebarCollapsed(!sidebarCollapsed);
          }
        }}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div className="flex flex-1">
        {/* Sidebar - hidden on mobile, visible on md+ */}
        <div className="hidden md:block">
          <ForumSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        {/* Mobile sidebar overlay */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative z-50 w-64 h-full animate-slide-in-left">
              <ForumSidebar
                collapsed={false}
                onToggle={() => setMobileSidebarOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <div className="flex gap-3 p-3 max-w-7xl mx-auto">
            <div className="flex-1 min-w-0 animate-fade-in">
              <Outlet />
            </div>
            <div className="hidden lg:block">
              <RightPanel />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
