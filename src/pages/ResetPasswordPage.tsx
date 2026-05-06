import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/forbiddens_logo.svg";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Soporta los dos formatos: PKCE (?code=...) y el viejo (#access_token=...&type=recovery)
    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = window.location.hash || "";

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setLinkError("El enlace ya no es válido o expiró. Pide uno nuevo.");
            return;
          }
          // Limpiamos el ?code= de la URL
          window.history.replaceState({}, "", "/reset-password");
          setReady(true);
          return;
        }

        if (hash.includes("type=recovery")) {
          // Supabase JS ya procesa el hash automáticamente al cargar
          setReady(true);
          return;
        }

        // Si ya hay sesión activa de recovery (por ejemplo recargó la página)
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
        } else {
          setLinkError("Abre esta página solo desde el enlace que recibiste por correo.");
        }
      } catch (err: any) {
        setLinkError(err?.message || "No se pudo validar el enlace.");
      }
    };
    init();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "¡Contraseña actualizada!", description: "Ya puedes iniciar sesión" });
      await supabase.auth.signOut();
      navigate("/login");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="bg-card border border-border rounded p-6 w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logo} alt="Forbiddens" className="w-16 h-16 mx-auto mb-3" />
          <Lock className="w-8 h-8 text-neon-cyan mx-auto mb-2" />
          <h1 className="font-pixel text-sm text-neon-cyan text-glow-cyan">NUEVA CONTRASEÑA</h1>
        </div>

        {linkError ? (
          <div className="text-center space-y-3">
            <p className="text-xs font-body text-destructive">{linkError}</p>
            <Button onClick={() => navigate("/forgot-password")} className="w-full font-body text-sm h-9">
              Pedir nuevo enlace
            </Button>
          </div>
        ) : !ready ? (
          <p className="text-xs font-body text-muted-foreground text-center">Validando enlace...</p>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="text-xs font-body text-muted-foreground mb-1 block">Nueva contraseña</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required minLength={6}
                  className="h-9 bg-muted border-border font-body text-sm pr-9"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-body text-muted-foreground mb-1 block">Confirmar contraseña</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="h-9 bg-muted border-border font-body text-sm" />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-destructive font-body mt-1">Las contraseñas no coinciden</p>
              )}
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-body text-sm h-9">
              {loading ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
