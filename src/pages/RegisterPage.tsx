import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/forbiddens_logo.svg";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username }, emailRedirectTo: "https://foroforbiddens.vercel.app/" },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setShowVerifyModal(true);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      {/* Verification modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative bg-card border border-neon-green/30 rounded-lg p-6 max-w-sm w-full mx-4 animate-scale-in space-y-4">
            <button onClick={() => { setShowVerifyModal(false); navigate("/login"); }} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-neon-green/10 rounded-full flex items-center justify-center">
                <span className="text-3xl">📧</span>
              </div>
              <h2 className="font-pixel text-xs text-neon-green text-glow-green">¡CUENTA CREADA!</h2>
              <p className="text-sm font-body text-foreground">
                Se ha enviado un correo de verificación a:
              </p>
              <p className="text-sm font-body text-neon-cyan font-medium">{email}</p>
              <p className="text-xs font-body text-muted-foreground">
                Revisa tu bandeja de entrada (y la carpeta de spam) para verificar tu cuenta antes de iniciar sesión.
              </p>
              <Button onClick={() => { setShowVerifyModal(false); navigate("/login"); }} className="w-full bg-primary text-primary-foreground text-sm font-body">
                Entendido
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded p-6 w-full max-w-sm space-y-6 relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <img src={logo} alt="Forbiddens" className="w-20 h-20 mx-auto mb-2 animate-pixel-logo" />
          <h1 className="font-pixel text-sm text-neon-green text-glow-green animate-fade-in">CREAR CUENTA</h1>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-body text-muted-foreground mb-1 block">Nombre de usuario</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required className="h-9 bg-muted border-border font-body text-sm transition-colors" />
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground mb-1 block">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 bg-muted border-border font-body text-sm transition-colors" />
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground mb-1 block">Contraseña</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-9 bg-muted border-border font-body text-sm transition-colors pr-9"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground mb-1 block">Confirmar contraseña</label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="h-9 bg-muted border-border font-body text-sm transition-colors pr-9"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[10px] text-destructive font-body mt-1">Las contraseñas no coinciden</p>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-body text-sm h-9 transition-all duration-200">
            {loading ? "Creando cuenta..." : "Registrarse"}
          </Button>
        </form>
        <p className="text-center text-xs font-body text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-primary hover:text-primary/80 transition-colors">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
