import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroBanner from "@/assets/hero-banner.jpg";
import logo from "@/assets/forbiddens_logo.svg";

export default function HeroSection() {
  return (
    <section className="relative w-full h-[70vh] min-h-[500px] overflow-hidden">
      <img
        src={heroBanner}
        alt="FORBIDDENS arcade"
        className="absolute inset-0 w-full h-full object-cover"
        width={1920}
        height={800}
      />
      <div className="retro-scanlines absolute inset-0 z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />

      <div className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4 gap-6 animate-slide-up">
        <img src={logo} alt="Forbiddens Logo" className="w-28 h-28 animate-pulse-glow" />
        <h1 className="text-3xl md:text-5xl text-neon-green text-glow-green animate-flicker tracking-wider">
          FORBIDDENS
        </h1>
        <p className="font-body text-lg md:text-xl text-foreground/80 max-w-2xl">
          &gt; EL FORO QUE NO DEBERÍA EXISTIR_<span className="animate-blink">|</span>
        </p>
        <p className="font-body text-sm text-muted-foreground max-w-lg">
          Gaming retro, anime, motociclismo y más. Únete a la comunidad más underground de la red.
        </p>
        <div className="flex gap-4 mt-2">
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/80 font-pixel text-xs px-6 py-3 box-glow-green">
            <Link to="/registro">UNIRSE AHORA</Link>
          </Button>
          <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent/10 font-pixel text-xs px-6 py-3">
            <Link to="/arcade">ZONA ARCADE</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
