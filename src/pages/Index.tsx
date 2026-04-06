import { useState, useEffect, useRef } from "react";
import HeroSection from "@/components/HeroSection";
import TopNavbar from "@/components/TopNavbar";
import ForumSidebar from "@/components/ForumSidebar";
import ForumCategories from "@/components/ForumCategories";
import TrendingPosts from "@/components/TrendingPosts";
import RightPanel from "@/components/RightPanel";
import Footer from "@/components/Footer";

const Index = () => {
  const [pastHero, setPastHero] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setPastHero(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div ref={heroRef}>
        <HeroSection />
      </div>

      {/* Sticky Navbar appears after scrolling past hero */}
      {pastHero && <TopNavbar />}

      {/* Reddit-style 3-column layout */}
      <div className={pastHero ? "flex" : ""}>
        {pastHero && (
          <ForumSidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        )}

        <main className="flex-1 min-w-0">
          <div className={pastHero ? "flex gap-4 p-4 max-w-7xl mx-auto" : "container max-w-6xl mx-auto px-4 py-8"}>
            <div className="flex-1 min-w-0 space-y-6">
              <ForumCategories />
              <TrendingPosts />
            </div>

            {pastHero && <RightPanel />}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
