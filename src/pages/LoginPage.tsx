import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/forbiddens_logo.svg";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "¡Bienvenido!", description: "Has iniciado sesión correctamente" });
      navigate("/");
    }
  };

  return (
    <div className="flex items-center justify-center py-8 px-4 animate-fade-in" style={{ minHeight: 'calc(100dvh - 120px)', minHeight: 'calc(100vh - 120px)' }}>
      <div className="bg-card border border-border rounded p-6 w-full max-w-sm space-y-6 relative">
        {/* Close button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <img src={logo} alt="Forbiddens" className="w-20 h-20 mx-auto mb-2 animate-pixel-logo" />
          <h1 className="font-pixel text-sm text-neon-green text-glow-green animate-fade-in">INICIAR SESIÓN</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
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
                className="h-9 bg-muted border-border font-body text-sm transition-colors pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-between items-center mt-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3 h-3 rounded border-border bg-muted accent-primary"
                />
                <span className="text-[10px] font-body text-muted-foreground">Mantener sesión</span>
              </label>
              <Link to="/forgot-password" className="text-[10px] font-body text-neon-cyan hover:text-neon-cyan/80 transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-body text-sm h-9 transition-all duration-200">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <p className="text-center text-xs font-body text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link to="/registro" className="text-primary hover:text-primary/80 transition-colors">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
