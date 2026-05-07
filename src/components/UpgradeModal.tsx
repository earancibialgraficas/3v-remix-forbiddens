import { createContext, useCallback, useContext, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Zap, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UpgradePayload {
  title?: string;
  message: string;
  feature?: string;
}

interface UpgradeContextType {
  openUpgrade: (payload: UpgradePayload) => void;
  /** Devuelve true si se mostró el modal (era un error de límite). */
  handleLimitError: (error: unknown, fallback?: string) => boolean;
}

const UpgradeContext = createContext<UpgradeContextType>({
  openUpgrade: () => {},
  handleLimitError: () => false,
});

export const useUpgrade = () => useContext(UpgradeContext);

const LIMIT_KEYWORDS = [
  "membresía permite",
  "límite de",
  "Has alcanzado",
  "no puede superar",
];

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<UpgradePayload>({ message: "" });
  const navigate = useNavigate();

  const openUpgrade = useCallback((p: UpgradePayload) => {
    setPayload(p);
    setOpen(true);
  }, []);

  const handleLimitError = useCallback(
    (error: unknown, fallback?: string) => {
      const msg =
        (error as any)?.message ||
        (typeof error === "string" ? error : "") ||
        fallback ||
        "";
      const isLimit = LIMIT_KEYWORDS.some((k) => msg.includes(k));
      if (isLimit) {
        setPayload({
          title: "Límite de tu membresía alcanzado",
          message: msg,
        });
        setOpen(true);
        return true;
      }
      return false;
    },
    []
  );

  return (
    <UpgradeContext.Provider value={{ openUpgrade, handleLimitError }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-2 border-primary/40 bg-card shadow-[0_0_30px_hsl(var(--primary)/0.4)]">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/40">
              <AlertTriangle className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-center text-xl">
              {payload.title || "Mejora tu membresía"}
            </DialogTitle>
            <DialogDescription className="text-center text-base text-foreground/80">
              {payload.message}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Crown className="h-4 w-4 text-yellow-400" />
              Con una membresía superior obtienes:
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-cyan-400" /> Más fotos, posts y amigos
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-cyan-400" /> Mensajes y comentarios más largos
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-cyan-400" /> Avatares y temas exclusivos
              </li>
              <li className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-cyan-400" /> Más almacenamiento en la nube
              </li>
            </ul>
          </div>

          <DialogFooter className="sm:justify-center gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Ahora no
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-primary/70 hover:opacity-90"
              onClick={() => {
                setOpen(false);
                navigate("/membresias");
              }}
            >
              <Crown className="mr-2 h-4 w-4" />
              Ver planes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UpgradeContext.Provider>
  );
}
