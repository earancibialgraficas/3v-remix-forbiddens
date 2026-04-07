import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/forbiddens_logo.svg";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
      toast({ title: "Email enviado", description: "Revisa tu bandeja de entrada" });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="bg-card border border-border rounded p-6 w-full max-w-sm space-y-6">
        <div className="text-center">
          <img src={logo} alt="Forbiddens" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="font-pixel text-sm text-neon-cyan text-glow-cyan">RECUPERAR CONTRASEÑA</h1>
        </div>
        {sent ? (
          <div className="text-center space-y-4">
            <Mail className="w-12 h-12 text-neon-green mx-auto" />
            <p className="text-sm font-body text-foreground">Hemos enviado un enlace de recuperación a <span className="text-neon-cyan">{email}</span></p>
            <p className="text-xs font-body text-muted-foreground">Revisa tu bandeja de entrada y sigue las instrucciones</p>
            <Button asChild variant="outline" size="sm" className="text-xs gap-1">
              <Link to="/login"><ArrowLeft className="w-3 h-3" /> Volver al login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <p className="text-xs font-body text-muted-foreground">Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña</p>
            <div>
              <label className="text-xs font-body text-muted-foreground mb-1 block">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-9 bg-muted border-border font-body text-sm" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/80 font-body text-sm h-9">
              {loading ? "Enviando..." : "Enviar enlace"}
            </Button>
            <p className="text-center text-xs font-body text-muted-foreground">
              <Link to="/login" className="text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Volver al login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
