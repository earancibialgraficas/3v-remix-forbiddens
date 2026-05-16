import { useState, useEffect, useRef } from "react";
import { BookOpen, Lightbulb, Gamepad2, Shield, Zap, Send, X, Cloud, FolderOpen, Link2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const tips = [
  { icon: Gamepad2, title: "Configura tu gamepad", desc: "Conecta un mando USB o Bluetooth y el emulador lo detectará automáticamente. Puedes remapear los botones desde el menú del emulador.", color: "text-neon-green" },
  { icon: Shield, title: "Guarda tu progreso", desc: "Usa los save states del emulador (botón de guardar en la barra de herramientas) para no perder tu avance. ¡Puedes crear múltiples puntos de guardado!", color: "text-neon-cyan" },
  { icon: Zap, title: "Mejora el rendimiento", desc: "Si el juego va lento, prueba cerrar otras pestañas del navegador. Chrome y Edge suelen dar el mejor rendimiento para la emulación web.", color: "text-neon-magenta" },
  { icon: Lightbulb, title: "Controles de teclado", desc: "NES: Flechas = D-Pad, Z = B, X = A, Enter = Start, Shift = Select. SNES: Los mismos + A/S para L/R.", color: "text-neon-yellow" },
  { icon: Gamepad2, title: "Juega con amigos", desc: "El emulador soporta multijugador local. Conecta un segundo mando para jugar juegos cooperativos como Contra o Double Dragon.", color: "text-neon-orange" },
];

export default function ConsejosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const tutorialRef = useRef<HTMLDivElement>(null);
  const [highlightTutorial, setHighlightTutorial] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tipTitle, setTipTitle] = useState("");
  const [tipDesc, setTipDesc] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (location.hash === "#retroroms-tutorial") {
      setTimeout(() => {
        tutorialRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightTutorial(true);
        setTimeout(() => setHighlightTutorial(false), 6000);
      }, 200);
    }
  }, [location.hash]);

  const handleSubmit = async () => {
    if (!user || !tipTitle.trim() || !tipDesc.trim()) return;
    setSending(true);
    
    // 🔥 SOLUCIÓN: Generamos un ID único aquí mismo para evitar el error de "null value"
    const { error } = await supabase.from("tip_suggestions").insert({
      id: crypto.randomUUID(), 
      user_id: user.id,
      title: tipTitle.trim(),
      description: tipDesc.trim(),
    } as any);
    
    if (!error) {
      const content = `[COLOR:#ef4444]💡 [SISTEMA] NUEVA SUGERENCIA DE CONSEJO[/COLOR]

[COLOR:#3b82f6]👤 Usuario: ${user.user_metadata?.username || user.email || 'Anónimo'}[/COLOR]
[COLOR:#eab308]🏷️ Título: ${tipTitle}[/COLOR]

[COLOR:#ffffff]💬 Descripción:
${tipDesc}[/COLOR]

[COLOR:#3b82f6]🔗 ENLACE:[/COLOR] [LINK:/arcade/consejos]Ir a Consejos[/LINK]`;
      
      await supabase.rpc("send_system_staff_message" as any, {
        p_title: `Sugerencia de consejo: ${tipTitle}`,
        p_content: content,
        p_message_type: 'tip_suggestion',
      });
    }
    
    setSending(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "¡Consejo enviado!", description: "Un administrador lo revisará antes de publicarlo." });
      setTipTitle("");
      setTipDesc("");
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-green/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> CONSEJOS GAMING <VaultHint letter="n" position={7} color="text-neon-cyan" />
        </h1>
        <p className="text-xs text-muted-foreground font-body">
          Tips y trucos para sacar el máximo provecho de los emuladores
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tips.map((tip, i) => (
          <div key={i} className="bg-card border border-border rounded p-4 transition-all duration-300 hover:border-neon-green/30">
            <div className="flex items-start gap-3">
              <tip.icon className={`w-5 h-5 shrink-0 mt-0.5 ${tip.color}`} />
              <div>
                <h3 className="text-sm font-body font-medium text-foreground mb-1">{tip.title}</h3>
                <p className="text-xs text-muted-foreground font-body leading-relaxed">{tip.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tutorial RetroRoms (Drive sync) */}
      <div
        id="retroroms-tutorial"
        ref={tutorialRef}
        className={cn(
          "bg-card border border-neon-yellow/40 rounded-lg p-5 space-y-4 transition-all",
          highlightTutorial && "fire-highlight"
        )}
      >
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <h2 className="font-pixel text-xs text-neon-yellow">CÓMO SINCRONIZAR TUS ROMS CON GOOGLE DRIVE</h2>
        </div>
        <p className="text-xs text-muted-foreground font-body leading-relaxed">
          Lleva tu propia colección de ROMs y juégala desde cualquier dispositivo vinculando tu Google Drive a tu cuenta arcade.
        </p>
        <ol className="space-y-3 text-xs font-body text-foreground">
          <li className="flex items-start gap-3">
            <span className="font-pixel text-neon-cyan shrink-0">1.</span>
            <div>
              <div className="flex items-center gap-2 font-medium">
                <FolderOpen className="w-4 h-4 text-neon-cyan" /> Crea una carpeta llamada <code className="bg-muted px-1.5 py-0.5 rounded text-neon-yellow">RetroRoms</code> en tu Google Drive
              </div>
              <p className="text-muted-foreground mt-1">El nombre debe ser exactamente <strong>RetroRoms</strong> (sin espacios, respeta mayúsculas).</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-pixel text-neon-cyan shrink-0">2.</span>
            <div>
              <div className="font-medium">Organización por consola</div>
                  <p className="text-muted-foreground mt-1">
                    No organices tus ROMs por consola en subcarpetas </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-pixel text-neon-cyan shrink-0">3.</span>
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Link2 className="w-4 h-4 text-neon-green" /> Vincula tu cuenta desde el Perfil
              </div>
                  <p className="text-muted-foreground mt-1">
                    Para vincular ve a tu <strong>Perfil → sección Storage</strong> y pulsa el botón <strong>Vincular Google Drive</strong>. Verás una barra que indica cuántas ROMs tienes vinculadas.
                  </p>            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-pixel text-neon-cyan shrink-0">4.</span>
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Cloud className="w-4 h-4 text-neon-magenta" /> Pulsa el botón <strong>Actualizar</strong> al lado de la barra buscadora
              </div>
              <p className="text-muted-foreground mt-1">Cada vez que añadas nuevas ROMs a Drive, vuelve aquí y pulsa actualizar para sincronizarlas.</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-pixel text-neon-cyan shrink-0">5.</span>
            <div>
              <div className="font-medium">Formatos soportados</div>
                  <p className="text-muted-foreground mt-1">.nes, .smc/.sfc, .gba, .n64/.z64, .bin/.cue/.chd (PS1), .zip (Arcade).</p>
            </div>
          </li>
        </ol>
        <p className="text-[10px] text-muted-foreground font-body italic border-t border-border pt-3">
          ⚠️ Tus ROMs nunca se suben a nuestros servidores. Solo se leen directamente desde tu Drive cuando juegas.
        </p>
      </div>

      <div className="bg-card border border-neon-cyan/20 rounded p-4">
        {!showForm ? (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-pixel text-[10px] text-neon-cyan mb-0.5">¿TIENES UN CONSEJO?</h3>
              <p className="text-[10px] text-muted-foreground font-body">Envía tu sugerencia y un administrador la revisará</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => {
              if (!user) { toast({ title: "Inicia sesión", description: "Necesitas una cuenta para enviar consejos", variant: "destructive" }); return; }
              setShowForm(true);
            }} className="text-xs font-body gap-1 border-neon-cyan/30 text-neon-cyan">
              <Lightbulb className="w-3 h-3" /> Sugerir
            </Button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-pixel text-[10px] text-neon-cyan">NUEVO CONSEJO</h3>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <Input placeholder="Título del consejo" value={tipTitle} onChange={(e) => setTipTitle(e.target.value)} className="h-8 bg-muted text-sm font-body" maxLength={100} />
            <Textarea placeholder="Describe tu consejo..." value={tipDesc} onChange={(e) => setTipDesc(e.target.value)} className="bg-muted text-sm font-body min-h-[80px]" maxLength={500} />
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-muted-foreground font-body">⚠️ Un administrador revisará tu consejo antes de publicarlo</p>
              <Button size="sm" onClick={handleSubmit} disabled={sending || !tipTitle.trim() || !tipDesc.trim()} className="text-xs gap-1">
                <Send className="w-3 h-3" /> {sending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}