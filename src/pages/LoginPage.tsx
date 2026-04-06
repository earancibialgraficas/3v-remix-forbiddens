import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/forbiddens_logo.svg";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="bg-card border border-border rounded p-6 w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logo} alt="Forbiddens" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="font-pixel text-sm text-neon-green text-glow-green">INICIAR SESIÓN</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-body text-muted-foreground mb-1 block">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 bg-muted border-border font-body text-sm transition-colors" />
          </div>
          <div>
            <label className="text-xs font-body text-muted-foreground mb-1 block">Contraseña</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-9 bg-muted border-border font-body text-sm transition-colors" />
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
