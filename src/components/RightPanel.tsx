import { useState, useEffect, useRef } from "react";
import { Users, Trophy, ChevronLeft, ChevronRight, Type } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { getNameStyle, getRoleStyle } from "@/lib/profileAppearance";
import Footer from "@/components/Footer";
import ChillMusicPlayer from "@/components/ChillMusicPlayer";
// 🔥 IMPORTAMOS EL NUEVO MINI CARRUSEL
import MiniCarousel from "@/components/MiniCarousel";

interface TopUser { display_name: string; total_score: number; color_name?: string | null; }
interface PremiumUser { display_name: string; membership_tier: string; created_at: string; color_name?: string | null; color_role?: string | null; }

type TextSize = "sm" | "md" | "lg";
const textSizeMap: Record<TextSize, { body: string; title: string; stat: string }> = {
  sm: { body: "text-[9px]", title: "text-[8px]", stat: "text-[10px]" },
  md: { body: "text-[11px]", title: "text-[10px]", stat: "text-xs" },
  lg: { body: "text-[13px]", title: "text-xs", stat: "text-sm" },
};

export default function RightPanel() {
  const { user } = useAuth();
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [textSize, setTextSize] = useState<TextSize>("md");
  const [memberCount, setMemberCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);

  // 🔥 Estados y Referencia para la magia del Scroll Neón
  const scrollRef = useRef<HTMLElement>(null);
  const [showTopShadow, setShowTopShadow] = useState(false);
  const [showBottomShadow, setShowBottomShadow] = useState(true);

  const sizes = textSizeMap[textSize];
  const cycleSize = () => setTextSize(p => p === "sm" ? "md" : p === "md" ? "lg" : "sm");

  // Función que calcula en qué punto del scroll estamos
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // Mostramos la sombra superior si hemos bajado un poco (más de 5px)
    setShowTopShadow(scrollTop > 5);
    
    // Mostramos la sombra inferior si aún no llegamos al final del scroll
    setShowBottomShadow(Math.ceil(scrollTop + clientHeight) < scrollHeight - 5);
  };

  useEffect(() => {
    const fetchTop = async () => {
      const { data } = await supabase.from("profiles").select("display_name, total_score, color_name").order("total_score", { ascending: false }).limit(5);
      if (data) setTopUsers(data as unknown as TopUser[]);
    };
    fetchTop();
  }, []);

  useEffect(() => {
    const fetchPremium = async () => {
      const { data } = await supabase.from("profiles").select("display_name, membership_tier, created_at, color_name, color_role").neq("membership_tier", "novato").order("created_at", { ascending: true }).limit(3);
      if (data) setPremiumUsers(data as unknown as PremiumUser[]);
    };
    fetchPremium();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: members } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      setMemberCount(members || 0);
      const { count: posts } = await supabase.from("posts").select("*", { count: "exact", head: true });
      setPostCount(posts || 0);
      setOnlineCount(100 + Math.floor(Math.random() * 20)); 
    };
    fetchStats();
  }, []);

  // Revisar el scroll apenas carguen los datos o se redimensione la pantalla
  useEffect(() => {
    handleScroll();
    window.addEventListener("resize", handleScroll);
    return () => window.removeEventListener("resize", handleScroll);
  }, [topUsers, premiumUsers]);

  const badges = ["🏆", "⚔️", "🏍️", "👑", "🎮"];
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    // Envolvemos todo en un div relativo para que los brillos floten sobre el contenido
    <div className="w-full shrink-0 relative h-[calc(100vh-80px)] overflow-hidden">
      
      {/* 🔴 SOMBRA NEÓN SUPERIOR (Más grande, intensa y por encima de todo) */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#de1839]/60 via-[#de1839]/10 to-transparent z-50 pointer-events-none transition-opacity duration-500",
          showTopShadow ? "opacity-100" : "opacity-0"
        )} 
      />

      {/* 🔴 SOMBRA NEÓN INFERIOR */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#de1839]/60 via-[#de1839]/10 to-transparent z-50 pointer-events-none transition-opacity duration-500",
          showBottomShadow ? "opacity-100" : "opacity-0"
        )} 
      />

      {/* Contenedor con Scroll */}
      <aside 
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full h-full space-y-3 pb-6 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative z-10"
      >
        <div className="flex items-center justify-end gap-1 sticky top-0 bg-background/80 backdrop-blur-sm z-30 py-1">
          {!isHome && (
            <div className="flex items-center gap-0.5 rounded bg-card border border-border p-0.5">
              <button onClick={() => navigate(-1)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><ChevronLeft className="w-3.5 h-3.5" /></button>
              <button onClick={() => navigate(1)} className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
          )}
          <button onClick={cycleSize} className="flex items-center gap-1 px-2 py-1 rounded bg-card border border-border text-muted-foreground hover:text-foreground shadow-sm">
            <Type className="w-3 h-3" />
            <span className={cn("font-body uppercase font-pixel tracking-tighter", sizes.body)}>{textSize}</span>
          </button>
        </div>

        {/* Caja de Comunidad */}
        <div className="bg-card border border-border rounded p-3 shadow-md hover:border-primary/50 transition-colors mt-2">
          <h3 className={cn("font-pixel mb-1", sizes.title)} style={{ color: '#de1839', textShadow: '0 0 8px rgba(222, 24, 57, 0.6)' }}>FORBIDDENS</h3>
          <div className="grid grid-cols-3 gap-1 my-3">
            <div className="text-center"><p className={cn("font-bold text-foreground font-body", sizes.stat)}>{memberCount}</p><p className={cn("text-muted-foreground", sizes.title)}>Miembros</p></div>
            <div className="text-center"><p className={cn("font-bold text-neon-green font-body", sizes.stat)}>{onlineCount}</p><p className={cn("text-muted-foreground", sizes.title)}>Online</p></div>
            <div className="text-center"><p className={cn("font-bold text-foreground font-body", sizes.stat)}>{postCount}</p><p className={cn("text-muted-foreground", sizes.title)}>Posts</p></div>
          </div>
          <div className="flex gap-2">
            {!user && <Button asChild className="flex-1 bg-primary text-[10px] h-7 hover:shadow-[0_0_10px_rgba(var(--primary),0.8)] transition-all"><Link to="/registro">Unirse</Link></Button>}
            <Button asChild className="flex-1 bg-[#5865F2] text-white hover:bg-[#4752C4] text-[10px] h-7 hover:shadow-[0_0_10px_rgba(88,101,242,0.8)] transition-all">
              <a href="https://discord.gg/ZHNRKVUfVF" target="_blank" rel="noopener noreferrer">Discord</a>
            </Button>
          </div>
        </div>

        {/* 🔥 NUEVO CARRUSEL MINIATURA */}
        <MiniCarousel />

        {/* Rankings */}
        <div className="bg-card border border-border rounded p-3 space-y-4 shadow-md">
          <div>
            <h3 className={cn("font-pixel text-neon-cyan mb-2", sizes.title)}>TOP USUARIOS</h3>
            <div className="space-y-1.5">
              {topUsers.map((u, i) => (
                <div key={i} className={cn("flex items-center gap-2", sizes.body)}>
                  <span className="text-muted-foreground w-3 text-right">{i+1}</span>
                  <span className="truncate flex-1" style={u.color_name ? getNameStyle(u.color_name) : {}}>{badges[i] || "🎯"} {u.display_name}</span>
                  <span className="text-neon-green font-bold">{u.total_score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <h3 className={cn("font-pixel text-neon-yellow mb-2", sizes.title)}>TOP PREMIUM</h3>
            <div className="space-y-1.5">
              {premiumUsers.map((pu, i) => (
                <div key={i} className={cn("flex items-center gap-2", sizes.body)}>
                  <span className="text-neon-yellow">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                  <span className="truncate flex-1" style={pu.color_name ? getNameStyle(pu.color_name) : {}}>{pu.display_name}</span>
                  <span className={cn("font-pixel text-neon-yellow text-[8px]")} style={pu.color_role ? getRoleStyle(pu.color_role) : {}}>{pu.membership_tier.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* REPRODUCTOR Y FOOTER */}
        <div className="mt-6 pt-4 border-t border-border space-y-4">
          <ChillMusicPlayer />
          <Footer />
        </div>
      </aside>
    </div>
  );
}