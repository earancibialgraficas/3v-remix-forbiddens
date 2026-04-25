import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SignatureDisplay from "@/components/SignatureDisplay";
import { cn } from "@/lib/utils";

export default function ConfiguracionTab({ user, profile, refreshProfile, displayTier, userTier, canUseSignature, canAdvancedSignature, onClose }: any) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [signature, setSignature] = useState("");
  const [localSigFontFamily, setLocalSigFontFamily] = useState("Inter");
  const [localSigFontSize, setLocalSigFontSize] = useState(13);
  const [localSigColor, setLocalSigColor] = useState("#facc15");
  const [localSigStrokeColor, setLocalSigStrokeColor] = useState<string | null>("#000000");
  const [localSigStrokeWidth, setLocalSigStrokeWidth] = useState(1);
  const [localSigStrokePosition, setLocalSigStrokePosition] = useState("middle");
  const [localSigTextAlign, setLocalSigTextAlign] = useState("center");
  const [localSigTextOverImage, setLocalSigTextOverImage] = useState(true);
  const [localSigImageUrl, setLocalSigImageUrl] = useState("");
  const [localSigImageWidth, setLocalSigImageWidth] = useState(100);
  const [localSigImageOffset, setLocalSigImageOffset] = useState(50);
  const [localSigImageAlign, setLocalSigImageAlign] = useState("center");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      setInstagram(profile.instagram_url || "");
      setYoutube(profile.youtube_url || "");
      setTiktok(profile.tiktok_url || "");
      
      setSignature(profile.signature || "");
      setLocalSigFontFamily(profile.signature_font_family || "Inter");
      setLocalSigFontSize(profile.signature_font_size || 13);
      setLocalSigColor(profile.signature_color || "#facc15");
      setLocalSigStrokeColor(profile.signature_stroke_color || "#000000");
      setLocalSigStrokeWidth(profile.signature_stroke_width ?? 1);
      
      const stPos = profile.signature_stroke_position;
      setLocalSigStrokePosition(stPos === "inside" ? "middle" : (stPos || "middle"));
      
      setLocalSigTextAlign(profile.signature_text_align || "center");
      setLocalSigTextOverImage(profile.signature_text_over_image ?? true);
      setLocalSigImageUrl(profile.signature_image_url || "");
      setLocalSigImageWidth(profile.signature_image_width ?? 100);
      setLocalSigImageOffset(profile.signature_image_offset ?? 50);
      setLocalSigImageAlign(profile.signature_image_align || "center");
    }
  }, [profile]);

  const updateSig = (patch: Record<string, any>) => {
    (window as any).__sigPatch = { ...(window as any).__sigPatch || {}, ...patch };
    if ((window as any).__sigUpdateTimer) clearTimeout((window as any).__sigUpdateTimer);
    (window as any).__sigUpdateTimer = setTimeout(() => {
      const finalPatch = { ...(window as any).__sigPatch };
      (window as any).__sigPatch = {}; 
      supabase.from("profiles").update(finalPatch as any).eq("user_id", user.id).then(() => refreshProfile());
    }, 500);
  };

  const handleSave = async () => {
    setSaving(true);
    if (newPassword.trim()) {
      if (newPassword.length < 6) {
        toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" });
        setSaving(false); return;
      }
      const { error: pwError } = await (supabase.auth as any).updateUser({ password: newPassword });
      if (pwError) {
        toast({ title: "Error al cambiar contraseña", description: pwError.message, variant: "destructive" });
        setSaving(false); return;
      }
    }
    
    const { error } = await supabase.from("profiles").update({
      display_name: displayName, bio, instagram_url: instagram || null, youtube_url: youtube || null, tiktok_url: tiktok || null,
      signature: signature.trim() || null, signature_font_family: localSigFontFamily, signature_font_size: localSigFontSize,
      signature_color: localSigColor, signature_stroke_color: localSigStrokeColor, signature_stroke_width: localSigStrokeWidth,
      signature_stroke_position: localSigStrokePosition, signature_text_align: localSigTextAlign, signature_text_over_image: localSigTextOverImage,
      signature_image_url: localSigImageUrl, signature_image_width: localSigImageWidth, signature_image_offset: localSigImageOffset, signature_image_align: localSigImageAlign
    } as any).eq("user_id", user.id);
      
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); } 
    else { toast({ title: "Perfil actualizado" }); setNewPassword(""); await refreshProfile(); onClose(); }
  };

  return (
    <div className="bg-card border border-border rounded p-4 space-y-4 animate-in fade-in">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
         <h3 className="font-pixel text-[10px] text-neon-cyan uppercase">Ajustes de Perfil</h3>
         <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs underline">Cerrar</button>
      </div>
      
      <div className="space-y-3">
        <div><label className="text-[10px] font-body text-muted-foreground block mb-0.5">Nombre</label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="h-8 bg-muted text-sm font-body w-full" /></div>
        <div><label className="text-[10px] font-body text-muted-foreground block mb-0.5">Bio</label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="bg-muted text-sm font-body min-h-[60px] w-full" placeholder="Cuéntanos sobre ti..." /></div>
        <div><label className="text-[10px] font-body text-muted-foreground block mb-0.5">Instagram URL</label><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" /></div>
        <div><label className="text-[10px] font-body text-muted-foreground block mb-0.5">YouTube URL</label><Input value={youtube} onChange={(e) => setYoutube(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" /></div>
        <div><label className="text-[10px] font-body text-muted-foreground block mb-0.5">TikTok URL</label><Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" /></div>
        <div><label className="text-[10px] font-body text-muted-foreground block mb-0.5">Contraseña (dejar vacío para no cambiar)</label><Input type="password" placeholder="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-8 bg-muted text-xs font-body w-full" /></div>
      </div>
      
      {canUseSignature ? (
        <div className="space-y-2 border border-border/50 rounded p-3 mt-4">
          <label className="text-[10px] font-body text-muted-foreground block mb-0.5 uppercase tracking-tighter">✍️ Firma personalizada</label>
          <Input
            value={signature}
            onChange={(e) => { const v = e.target.value; setSignature(v); updateSig({ signature: v.trim() || null }); }}
            className="h-8 bg-muted text-xs font-body w-full"
            placeholder={`— ${profile?.display_name} [${displayTier}]`}
            maxLength={userTier === "staff" ? 500 : userTier === "entusiasta" ? 100 : userTier === "coleccionista" ? 150 : 250}
          />
          
          {canAdvancedSignature && (
            <>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Tipografía</label>
                  <select value={localSigFontFamily} onChange={(e) => { setLocalSigFontFamily(e.target.value); updateSig({ signature_font_family: e.target.value }); }} className="w-full h-7 rounded border border-border bg-muted text-[10px] font-body px-1">
                    {["Inter", "Roboto", "Lobster", "Pacifico", "Bebas Neue", "Press Start 2P", "Orbitron", "Dancing Script", "Permanent Marker", "Bangers"].map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Tamaño de letra</label>
                  <select value={localSigFontSize} onChange={(e) => { const val = parseInt(e.target.value, 10); setLocalSigFontSize(val); updateSig({ signature_font_size: val }); }} className="w-full h-7 rounded border border-border bg-muted text-[10px] font-body px-1">
                    {[10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30].map(size => <option key={size} value={size}>{size}px</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Color relleno</label>
                  <input type="color" value={localSigColor} onChange={(e) => { setLocalSigColor(e.target.value); updateSig({ signature_color: e.target.value }); }} className="w-full h-7 rounded border border-border cursor-pointer bg-muted" />
                </div>
                <div>
                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Color trazo</label>
                  <div className="flex gap-1">
                    <input type="color" value={localSigStrokeColor || "#000000"} onChange={(e) => { setLocalSigStrokeColor(e.target.value); updateSig({ signature_stroke_color: e.target.value }); }} className="flex-1 h-7 rounded border border-border cursor-pointer bg-muted" />
                    {localSigStrokeColor && <button type="button" onClick={() => { setLocalSigStrokeColor(null); updateSig({ signature_stroke_color: null }); }} className="h-7 px-2 text-[9px] bg-muted border border-border rounded">×</button>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Grosor trazo ({localSigStrokeWidth}px)</label>
                  <input type="range" min="0" max="10" step="0.5" value={localSigStrokeWidth} onChange={(e) => { const val = parseFloat(e.target.value); setLocalSigStrokeWidth(val); updateSig({ signature_stroke_width: val }); }} className="w-full" />
                </div>
                <div>
                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Tipo de Trazo</label>
                  <div className="flex gap-1">
                    {['outside', 'middle'].map(align => (
                      <button key={align} type="button" onClick={() => { setLocalSigStrokePosition(align); updateSig({ signature_stroke_position: align }); }} className={cn("flex-1 h-7 rounded border text-[9px] uppercase transition-colors", localSigStrokePosition === align || (!localSigStrokePosition && align === 'outside') ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:bg-muted/80")}>
                        {align === 'outside' ? 'Fuera' : 'Medio'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Alineación Texto</label>
                  <div className="flex gap-1">
                    {['left', 'center', 'right'].map(align => (
                      <button key={align} type="button" onClick={() => { setLocalSigTextAlign(align); updateSig({ signature_text_align: align }); }} className={cn("flex-1 h-7 rounded border text-[9px] uppercase transition-colors", localSigTextAlign === align || (!localSigTextAlign && align === 'center') ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:bg-muted/80")}>
                        {align === 'left' ? 'Izq' : align === 'center' ? 'Centro' : 'Der'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Ubicación de Texto</label>
                  <div className="flex gap-1">
                    {[true, false].map(pos => (
                      <button key={pos ? "inside" : "outside"} type="button" onClick={() => { setLocalSigTextOverImage(pos); updateSig({ signature_text_over_image: pos }); }} className={cn("flex-1 h-7 rounded border text-[9px] uppercase transition-colors", localSigTextOverImage === pos || (localSigTextOverImage == null && pos === true) ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:bg-muted/80")}>
                        {pos ? 'En Imagen' : 'Afuera'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Imagen (URL)</label>
                <Input value={localSigImageUrl} onChange={(e) => { setLocalSigImageUrl(e.target.value); updateSig({ signature_image_url: e.target.value || null }); }} className="h-7 bg-muted text-[10px] font-body w-full" placeholder="URL .png o .gif" />
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Ancho Imagen ({localSigImageWidth}%)</label>
                  <input type="range" min="10" max="100" step="1" value={localSigImageWidth} onChange={(e) => { const val = parseInt(e.target.value, 10); setLocalSigImageWidth(val); updateSig({ signature_image_width: val }); }} className="w-full" />
                </div>
                <div>
                  <label className="text-[9px] font-body text-muted-foreground block mb-0.5 uppercase">Posición Vertical ({localSigImageOffset}%)</label>
                  <input type="range" min="0" max="100" step="1" value={localSigImageOffset} onChange={(e) => { const val = parseInt(e.target.value, 10); setLocalSigImageOffset(val); updateSig({ signature_image_offset: val }); }} className="w-full" />
                </div>
              </div>

              <div className="mt-2 p-2 border border-dashed border-border/50 rounded bg-muted/20 text-center">
                <p className="text-[9px] font-body text-muted-foreground mb-1 uppercase tracking-tighter">Vista previa:</p>
                <SignatureDisplay
                  text={signature || `— ${profile?.display_name || "Usuario"} [${displayTier}]`}
                  profile={profile ? { 
                    ...(profile as any), signature, signature_font_family: localSigFontFamily, signature_font_size: localSigFontSize, 
                    signature_color: localSigColor, signature_stroke_color: localSigStrokeColor, signature_stroke_width: localSigStrokeWidth,
                    signature_stroke_position: localSigStrokePosition, signature_text_align: localSigTextAlign, signature_text_over_image: localSigTextOverImage,
                    signature_image_url: localSigImageUrl, signature_image_width: localSigImageWidth, signature_image_offset: localSigImageOffset
                  } : { signature } as any}
                  fontSize={localSigFontSize}
                />
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-destructive/80 font-body p-2 border border-destructive/20 rounded bg-destructive/10 text-center mt-4">
          Las firmas personalizadas no están disponibles para el nivel Novato.
        </p>
      )}
      
      <div className="flex gap-2 w-full mt-4">
        <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs flex-1">{saving ? "Guardando..." : "Guardar Cambios"}</Button>
        <Button size="sm" variant="outline" onClick={onClose} className="text-xs flex-1">Cancelar</Button>
      </div>
    </div>
  );
}