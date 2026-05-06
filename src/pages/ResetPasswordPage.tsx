import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, ShieldCheck, KeyRound, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/forbiddens_logo.svg";
import { cn } from "@/lib/utils";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hash = window.location.hash || "";

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) { setLinkError("El enlace ya no es válido o expiró. Pide uno nuevo."); return; }
          window.history.replaceState({}, "", "/reset-password");
          setReady(true); return;
        }
        if (hash.includes("type=recovery")) { setReady(true); return; }
        const { data } = await supabase.auth.getSession();
        if (data.session) setReady(true);
        else setLinkError("Abre esta página solo desde el enlace que recibiste por correo.");
      } catch (err: any) {
        setLinkError(err?.message || "No se pudo validar el enlace.");
      }
    };
    init();
  }, []);

  const rules = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    match: password.length > 0 && password === confirmPassword,
  };
  const allOk = rules.length && rules.upper && rules.number && rules.match;
  const strength = [rules.length, rules.upper, rules.number].filter(Boolean).length;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" }); return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setSuccess(true);
    toast({ title: "¡Contraseña actualizada!", description: "Redirigiendo al login..." });
    await supabase.auth.signOut();
    setTimeout(() => navigate("/login"), 1800);
  };

  return (
    <div className="relative flex items-center justify-center min-h-[80vh] py-10 px-4 overflow-hidden">
      {/* Fondo arcade */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--neon-cyan)/0.18),transparent_55%),radial-gradient(circle_at_80%_70%,hsl(var(--neon-magenta)/0.18),transparent_55%),radial-gradient(circle_at_50%_100%,hsl(var(--neon-green)/0.12),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Glow exterior */}
        <div className="absolute -inset-1 bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-green rounded-2xl blur-xl opacity-50 animate-pulse" />
        <div className="relative bg-card/95 backdrop-blur-xl border-2 border-neon-cyan/40 rounded-2xl p-8 shadow-[0_0_60px_rgba(0,255,255,0.25)]">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-neon-cyan/30 blur-2xl rounded-full" />
              <img src={logo} alt="Forbiddens" className="relative w-20 h-20 drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-magenta/10 border border-neon-magenta/40 mb-3">
              <KeyRound className="w-3 h-3 text-neon-magenta" />
              <span className="font-pixel text-[10px] text-neon-magenta tracking-widest">RECOVERY MODE</span>
            </div>
            <h1 className="font-pixel text-base sm:text-lg text-neon-cyan text-glow-cyan leading-tight">NUEVA CONTRASEÑA</h1>
            <p className="text-xs font-body text-muted-foreground mt-2 max-w-xs">
              Crea una contraseña fuerte para proteger tu cuenta de Forbiddens.
            </p>
          </div>

          {linkError ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-destructive/15 border border-destructive/40 flex items-center justify-center">
                <X className="w-7 h-7 text-destructive" />
              </div>
              <p className="text-sm font-body text-destructive">{linkError}</p>
              <Button onClick={() => navigate("/forgot-password")} className="w-full font-body text-sm h-10 bg-neon-magenta/20 border border-neon-magenta/50 hover:bg-neon-magenta/30 text-neon-magenta">
                Pedir nuevo enlace
              </Button>
            </div>
          ) : success ? (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="w-16 h-16 mx-auto rounded-full bg-neon-green/15 border-2 border-neon-green/50 flex items-center justify-center shadow-[0_0_30px_rgba(57,255,20,0.5)]">
                <Check className="w-8 h-8 text-neon-green" />
              </div>
              <p className="font-pixel text-sm text-neon-green text-glow-green">¡LISTO!</p>
              <p className="text-xs text-muted-foreground font-body">Tu contraseña se actualizó. Redirigiendo...</p>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-body text-muted-foreground">Validando enlace...</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              {/* Nueva contraseña */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-pixel text-neon-cyan/90 tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> NUEVA CONTRASEÑA
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required minLength={6}
                    placeholder="••••••••"
                    className="h-11 bg-muted/40 border-neon-cyan/30 focus-visible:ring-neon-cyan/40 font-body text-sm pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-neon-cyan transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength bar */}
                <div className="flex gap-1 pt-1">
                  {[0,1,2].map(i => (
                    <div key={i} className={cn(
                      "h-1 flex-1 rounded-full transition-all",
                      strength > i
                        ? strength === 1 ? "bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]"
                          : strength === 2 ? "bg-neon-yellow shadow-[0_0_8px_rgba(255,255,0,0.6)]"
                          : "bg-neon-green shadow-[0_0_8px_rgba(57,255,20,0.6)]"
                        : "bg-muted/50"
                    )} />
                  ))}
                </div>
              </div>

              {/* Confirmar */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-pixel text-neon-magenta/90 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" /> CONFIRMAR CONTRASEÑA
                </label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required minLength={6}
                    placeholder="••••••••"
                    className="h-11 bg-muted/40 border-neon-magenta/30 focus-visible:ring-neon-magenta/40 font-body text-sm pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-neon-magenta transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Reglas */}
              <ul className="space-y-1.5 bg-muted/20 border border-border/50 rounded-lg p-3">
                {[
                  { ok: rules.length, label: "Al menos 8 caracteres" },
                  { ok: rules.upper, label: "Una letra mayúscula" },
                  { ok: rules.number, label: "Un número" },
                  { ok: rules.match, label: "Las contraseñas coinciden" },
                ].map((r, i) => (
                  <li key={i} className={cn("flex items-center gap-2 text-[11px] font-body transition-colors", r.ok ? "text-neon-green" : "text-muted-foreground")}>
                    <span className={cn("w-4 h-4 rounded-full flex items-center justify-center border", r.ok ? "bg-neon-green/20 border-neon-green/60" : "border-muted-foreground/30")}>
                      {r.ok ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5 opacity-40" />}
                    </span>
                    {r.label}
                  </li>
                ))}
              </ul>

              <Button
                type="submit"
                disabled={loading || !allOk}
                className="w-full h-11 font-pixel text-xs tracking-widest bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-green text-black hover:opacity-90 disabled:opacity-40 shadow-[0_0_25px_rgba(255,0,255,0.4)]"
              >
                {loading ? "ACTUALIZANDO..." : "GUARDAR CONTRASEÑA"}
              </Button>

              <p className="text-center text-[10px] font-body text-muted-foreground">
                🔒 Tu enlace es de un solo uso y expira pronto
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
