import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Lock, ArrowLeft, Zap } from "lucide-react";
import { isVaultUnlocked, lockVault } from "@/lib/vaultAuth";
import { useGameBubble } from "@/contexts/GameBubbleContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getTodaySeconds, VAULT_DAILY_CAP_SECONDS } from "@/lib/vaultTracking";
import { Button } from "@/components/ui/button";

const VAULT_GAMES = [
  {
    id: "vault-pacman",
    name: "Pac-Man",
    romUrl: "/roms/vault/Pacman.nes",
    cover: "https://upload.wikimedia.org/wikipedia/en/2/2a/Pac-Man_NES_box_art.jpg",
    color: "from-yellow-500/30 to-yellow-500/10 border-yellow-400",
  },
  {
    id: "vault-galaga",
    name: "Galaga",
    romUrl: "/roms/vault/Galaga.nes",
    cover: "https://upload.wikimedia.org/wikipedia/en/8/89/Galaga_arcade_flyer.jpg",
    color: "from-red-500/30 to-red-500/10 border-red-400",
  },
  {
    id: "vault-bomberman",
    name: "Bomberman",
    romUrl: "/roms/vault/Bomberman.nes",
    cover: "https://upload.wikimedia.org/wikipedia/en/3/3a/Bomberman_NES_cover.jpg",
    color: "from-blue-500/30 to-blue-500/10 border-blue-400",
  },
];

export default function VaultPage() {
  const unlocked = isVaultUnlocked();
  const { launchGame } = useGameBubble();
  const { user } = useAuth();
  const { toast } = useToast();
  const [secondsByGame, setSecondsByGame] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user || !unlocked) return;
    (async () => {
      const map: Record<string, number> = {};
      for (const g of VAULT_GAMES) map[g.name] = await getTodaySeconds(user.id, g.name);
      setSecondsByGame(map);
    })();
  }, [user, unlocked]);

  if (!unlocked) return <Navigate to="/" replace />;

  const launch = (g: typeof VAULT_GAMES[0]) => {
    if (!user) {
      toast({ title: "Inicia sesión", description: "Necesitas una cuenta para jugar en la bóveda.", variant: "destructive" });
      return;
    }
    launchGame({
      romUrl: g.romUrl,
      consoleName: "nes",
      gameName: g.name,
      consoleCore: "fceumm",
      score: 0,
      playTime: 0,
      // @ts-ignore — campo extra usado por GameBubble para multiplicar puntos
      vaultMode: true,
    } as any);
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <Link to="/arcade/biblioteca">
          <Button variant="ghost" size="sm" className="text-neon-yellow gap-1 font-pixel text-[10px]">
            <ArrowLeft className="w-3 h-3" /> SALIR
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { lockVault(); window.location.href = "/"; }}
          className="text-muted-foreground gap-1 font-pixel text-[10px]"
        >
          <Lock className="w-3 h-3" /> CERRAR BÓVEDA
        </Button>
      </div>

      <div className="bg-gradient-to-br from-yellow-500/10 to-black border-2 border-neon-yellow/60 rounded-xl p-6 text-center shadow-[0_0_40px_rgba(250,204,21,0.3)]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="w-6 h-6 text-neon-yellow animate-pulse" />
          <h1 className="font-pixel text-base text-neon-yellow">BÓVEDA SECRETA</h1>
          <Zap className="w-6 h-6 text-neon-yellow animate-pulse" />
        </div>
        <p className="text-xs font-body text-muted-foreground">
          🎯 Triple puntos por <strong className="text-neon-yellow">1 hora diaria</strong> en cada juego.
          <br />
          Solo cuenta cuando juegas <em>aquí dentro</em>.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {VAULT_GAMES.map((g) => {
          const sec = secondsByGame[g.name] ?? 0;
          const remaining = Math.max(0, VAULT_DAILY_CAP_SECONDS - sec);
          const mins = Math.floor(remaining / 60);
          const active = remaining > 0;
          return (
            <button
              key={g.id}
              onClick={() => launch(g)}
              className={`group relative bg-gradient-to-br ${g.color} border-2 rounded-lg overflow-hidden text-left transition-transform hover:scale-105 hover:shadow-[0_0_30px_rgba(250,204,21,0.4)]`}
            >
              <div className="aspect-[3/4] overflow-hidden bg-black">
                <img src={g.cover} alt={g.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" loading="lazy" />
              </div>
              <div className="p-3 bg-black/80">
                <div className="font-pixel text-[10px] text-neon-yellow mb-1">{g.name}</div>
                <div className="text-[9px] font-body text-muted-foreground">
                  {active ? <>⚡ Bono x3 disponible · <span className="text-neon-green">{mins} min</span> restantes</> : <span className="text-red-400">Bono agotado hoy</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-card border border-border rounded p-3 text-[10px] font-body text-muted-foreground">
        ℹ️ El bono x3 se aplica automáticamente al puntaje guardado en el leaderboard mientras juegas dentro de la bóveda. Cuando se acaba la hora del día para un juego, los puntos se cuentan normalmente.
      </div>
    </div>
  );
}
