import HeroSection from "@/components/HeroSection";
import ForumCategories from "@/components/ForumCategories";
import TrendingPosts from "@/components/TrendingPosts";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="space-y-6">
      <HeroSection />
      <ForumCategories />
      <TrendingPosts />
      <Footer />
    </div>
  );
};

export default Index;
