import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { verifyVaultPassword } from "@/lib/vaultAuth";
import { useToast } from "@/hooks/use-toast";

export default function VaultPasswordModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await verifyVaultPassword(pwd);
      if (ok) {
        toast({ title: "🔓 Bóveda abierta", description: "Bienvenido a la sala secreta." });
        onOpenChange(false);
        setPwd("");
        navigate("/vault");
      } else {
        toast({ title: "❌ Código incorrecto", description: "Sigue buscando las pistas en el sitio.", variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-2 border-neon-yellow/60 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-pixel text-neon-yellow text-sm flex items-center gap-2">
            <Lock className="w-4 h-4" /> BÓVEDA SECRETA
          </DialogTitle>
          <DialogDescription className="text-xs font-body text-muted-foreground">
            Introduce el código de 10 caracteres. Las pistas están repartidas por el sitio en letras de colores.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-neon-yellow" />
            <Input
              autoFocus
              maxLength={10}
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="••••••••••"
              className="font-mono tracking-widest text-center bg-muted text-neon-yellow border-neon-yellow/40"
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={busy || pwd.length !== 10}
            className="w-full font-pixel text-[10px] bg-neon-yellow/20 hover:bg-neon-yellow/30 text-neon-yellow border border-neon-yellow/60"
          >
            {busy ? "VERIFICANDO..." : "ABRIR BÓVEDA"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
