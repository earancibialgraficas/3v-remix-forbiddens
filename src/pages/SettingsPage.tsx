import { useState } from "react";
import { Settings, Lock, User, HelpCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [instagram, setInstagram] = useState(profile?.instagram_url || "");
  const [youtube, setYoutube] = useState(profile?.youtube_url || "");
  const [tiktok, setTiktok] = useState(profile?.tiktok_url || "");
  const [saving, setSaving] = useState(false);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 animate-fade-in">
        <Settings className="w-12 h-12 text-muted-foreground" />
        <p className="text-sm font-body text-muted-foreground">Inicia sesión para acceder a la configuración</p>
        <Button asChild><Link to="/login">Iniciar Sesión</Link></Button>
      </div>
    );
  }

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Contraseña actualizada" });
      setNewPassword("");
    }
  };

  const handleSaveLinks = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      instagram_url: instagram || null,
      youtube_url: youtube || null,
      tiktok_url: tiktok || null,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Enlaces actualizados" });
      await refreshProfile();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-lg">
      <div className="bg-card border border-border rounded p-4">
        <h1 className="font-pixel text-sm text-muted-foreground mb-1 flex items-center gap-2">
          <Settings className="w-4 h-4" /> CONFIGURACIÓN
        </h1>
      </div>

      {/* Account info */}
      <div className="bg-card border border-border rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1"><User className="w-3 h-3" /> CUENTA</h3>
        <div className="text-xs font-body space-y-1">
          <p className="text-muted-foreground">Email: <span className="text-foreground">{user.email}</span></p>
          <p className="text-muted-foreground">Plan: <span className="text-neon-yellow">{profile?.membership_tier?.toUpperCase()}</span></p>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-card border border-border rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1"><Lock className="w-3 h-3" /> CAMBIAR CONTRASEÑA</h3>
        <Input type="password" placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-8 bg-muted text-sm font-body" />
        <Button size="sm" onClick={handlePasswordChange} className="text-xs">Actualizar Contraseña</Button>
      </div>

      {/* Social links */}
      <div className="bg-card border border-border rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1"><Camera className="w-3 h-3" /> REDES SOCIALES</h3>
        <Input placeholder="Instagram URL" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="h-8 bg-muted text-xs font-body" />
        <Input placeholder="YouTube URL" value={youtube} onChange={(e) => setYoutube(e.target.value)} className="h-8 bg-muted text-xs font-body" />
        <Input placeholder="TikTok URL" value={tiktok} onChange={(e) => setTiktok(e.target.value)} className="h-8 bg-muted text-xs font-body" />
        <Button size="sm" onClick={handleSaveLinks} disabled={saving} className="text-xs">{saving ? "Guardando..." : "Guardar Enlaces"}</Button>
      </div>

      {/* Support */}
      <div className="bg-card border border-border rounded p-4 space-y-2">
        <h3 className="font-pixel text-[10px] text-muted-foreground flex items-center gap-1"><HelpCircle className="w-3 h-3" /> SOPORTE</h3>
        <Button size="sm" variant="outline" asChild className="text-xs"><Link to="/ayuda">Centro de Ayuda</Link></Button>
      </div>
    </div>
  );
}
