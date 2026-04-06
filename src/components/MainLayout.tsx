import { useState } from "react";
import { Outlet } from "react-router-dom";
import TopNavbar from "@/components/TopNavbar";
import ForumSidebar from "@/components/ForumSidebar";
import RightPanel from "@/components/RightPanel";

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavbar
        onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
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
        {!sidebarCollapsed && (
          <div className="md:hidden fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setSidebarCollapsed(true)}
            />
            <div className="relative z-50 w-64 h-full animate-slide-in-left">
              <ForumSidebar
                collapsed={false}
                onToggle={() => setSidebarCollapsed(true)}
              />
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <div className="flex gap-4 p-4 max-w-7xl mx-auto">
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
