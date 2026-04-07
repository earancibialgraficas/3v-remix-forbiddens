import HeroSection from "@/components/HeroSection";
import ForumCategories from "@/components/ForumCategories";
import TrendingPosts from "@/components/TrendingPosts";
import HomeCarousel from "@/components/HomeCarousel";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="space-y-6">
      <HeroSection />
      <ForumCategories />
      <HomeCarousel />
      <TrendingPosts />
      <Footer />
    </div>
  );
};

export default Index;
