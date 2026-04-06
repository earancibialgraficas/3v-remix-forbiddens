import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";
import logo from "@/assets/forbiddens_logo.svg";

export default function HeroSection() {
  return (
    <section className="relative w-full h-48 sm:h-64 overflow-hidden rounded transition-all duration-300">
      <img
        src={heroBanner}
        alt="FORBIDDENS arcade"
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="retro-scanlines absolute inset-0 z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />

      <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4 gap-3 animate-slide-up">
        <img src={logo} alt="Forbiddens Logo" className="w-16 h-16 sm:w-20 sm:h-20 animate-pulse-glow" />
        <h1 className="text-xl sm:text-3xl text-neon-green text-glow-green animate-flicker tracking-wider">
          FORBIDDENS
        </h1>
        <p className="font-body text-xs sm:text-sm text-foreground/80 max-w-lg">
          &gt; EL FORO QUE NO DEBERÍA EXISTIR_<span className="animate-blink">|</span>
        </p>
        <div className="flex gap-3 mt-1">
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/80 font-pixel text-[9px] px-4 py-2 box-glow-green transition-all duration-200">
            <Link to="/registro">UNIRSE</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="border-accent text-accent hover:bg-accent/10 font-pixel text-[9px] px-4 py-2 transition-all duration-200">
            <Link to="/arcade/salas">ZONA ARCADE</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
