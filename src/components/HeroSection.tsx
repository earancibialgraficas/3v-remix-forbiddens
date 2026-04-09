import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";
import logo from "@/assets/forbiddens_logo.svg";
import { useAuth } from "@/hooks/useAuth";

export default function HeroSection() {
  const { user } = useAuth();
  const [phase, setPhase] = useState<"logo" | "transition" | "text">("logo");

  useEffect(() => {
    // Show logo for 3 seconds, then transition
    const t1 = setTimeout(() => setPhase("transition"), 3000);
    const t2 = setTimeout(() => setPhase("text"), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <section className="relative w-full h-[70vh] min-h-[400px] overflow-hidden rounded transition-all duration-300">
      <img
        src={heroBanner}
        alt="FORBIDDENS arcade"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="retro-scanlines absolute inset-0 z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />

      <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4 gap-3 animate-slide-up">
        {/* Animated logo → text transition */}
        <div className="relative h-28 sm:h-36 flex items-center justify-center">
          {phase === "logo" && (
            <img
              src={logo}
              alt="Forbiddens Logo"
              className="w-20 h-20 sm:w-28 sm:h-28 animate-pulse-glow"
            />
          )}
          {phase === "transition" && (
            <div className="animate-banner-pixelate">
              <img
                src={logo}
                alt="Forbiddens Logo"
                className="w-20 h-20 sm:w-28 sm:h-28 opacity-0"
                style={{ animation: 'fade-out 0.8s ease-out forwards' }}
              />
            </div>
          )}
          {(phase === "transition" || phase === "text") && (
            <h1
              className="absolute text-2xl sm:text-4xl font-pixel tracking-wider animate-banner-text-in"
              style={{
                color: '#a5062d',
                textShadow: '0 0 10px rgba(165, 6, 45, 0.8), 0 0 30px rgba(165, 6, 45, 0.4), 0 0 60px rgba(165, 6, 45, 0.2)',
                animationDelay: phase === "transition" ? '0.3s' : '0s',
                animationFillMode: 'forwards',
              }}
            >
              FORBIDDENS
            </h1>
          )}
        </div>

        <p className="font-body text-sm sm:text-base text-foreground/80 max-w-lg">
          &gt; EL FORO QUE NO DEBERÍA EXISTIR_<span className="animate-blink">|</span>
        </p>
        <div className="flex gap-3 mt-2">
          {!user && (
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/80 font-pixel text-[10px] px-5 py-2.5 box-glow-green transition-all duration-200">
              <Link to="/registro">UNIRSE</Link>
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="border-accent text-accent hover:bg-accent/10 font-pixel text-[10px] px-5 py-2.5 transition-all duration-200">
            <a href="https://discord.gg/ZHNRKVUfVF" target="_blank" rel="noopener noreferrer">DISCORD</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
