import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronRight, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const faqs = [
  { q: "¿Cómo juego en los emuladores?", a: "Ve a Salas de Juego en el menú lateral, escoge un juego de la Biblioteca o sube tu propia ROM. El emulador se abrirá automáticamente en el navegador." },
  { q: "¿Cómo subo de rango?", a: "Acumula puntos jugando en los emuladores y participando en el foro. Los puntos se actualizan en tiempo real en el Leaderboard." },
  { q: "¿Qué incluye cada membresía?", a: "Cada plan ofrece diferentes beneficios como avatares animados, más espacio de subida, acceso VIP y más. Revisa la sección de Membresías para ver los detalles." },
  { q: "¿Cómo linkeo mis redes sociales?", a: "Ve a Configuración > Redes Sociales y agrega tus URLs de Instagram, YouTube y TikTok." },
  { q: "¿Cómo reporto a un usuario?", a: "En cualquier post, haz clic en el botón de reporte (bandera). Los administradores revisarán tu reporte." },
  { q: "¿Puedo cambiar mi nombre de usuario?", a: "Sí, depende de tu membresía. Los usuarios gratuitos no pueden cambiarlo, mientras que miembros de pago pueden hacerlo según su plan." },
];

export default function AyudaPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión para enviar una consulta", variant: "destructive" });
      return;
    }
    const name = contactName.trim() || profile?.display_name || user?.user_metadata?.username || "Anónimo";
    const email = user.email!;
    setSending(true);

    // Save to DB
    await supabase.from("contact_messages").insert({
      user_id: user.id, name, email, message,
    } as any);

    // Send notification email to admin via Resend
    try {
      const res = await supabase.functions.invoke("send-contact-email", {
        body: { name, email, message },
      });
      if (res.error) console.error("Email send error:", res.error);
    } catch (e) {
      console.error("Email function error:", e);
    }

    setSending(false);
    setSent(true);
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-2xl">
      <div className="bg-card border border-border rounded p-4">
        <h1 className="font-pixel text-sm text-muted-foreground mb-1 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" /> AYUDA Y PREGUNTAS FRECUENTES
        </h1>
        <p className="text-xs text-muted-foreground font-body">¿Esta wea iba así? Aquí te lo explicamos</p>
      </div>

      <div className="space-y-1">
        {faqs.map((faq, i) => (
          <div key={i} className="bg-card border border-border rounded overflow-hidden transition-all duration-200">
            <button onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors">
              <span className="text-xs font-body text-foreground">{faq.q}</span>
              {expanded === i ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            </button>
            <div className={cn("overflow-hidden transition-all duration-300", expanded === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0")}>
              <p className="px-3 pb-3 text-xs text-muted-foreground font-body leading-relaxed">{faq.a}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3">
        <h3 className="font-pixel text-[10px] text-neon-cyan flex items-center gap-1">
          <Send className="w-3 h-3" /> CONSULTA DIRECTAMENTE
        </h3>
        {sent ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle className="w-8 h-8 text-neon-green" />
            <p className="text-sm font-body text-foreground">¡Mensaje enviado!</p>
            <p className="text-xs font-body text-muted-foreground">Te contactaremos a la brevedad posible.</p>
          </div>
        ) : !user ? (
          <p className="text-xs font-body text-muted-foreground">Debes iniciar sesión para enviar una consulta.</p>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-body text-muted-foreground">Correo</label>
              <Input value={user.email || ""} disabled className="h-8 bg-muted/50 text-xs font-body opacity-70" />
            </div>
            <Input placeholder="Tu nick o nombre" value={contactName} onChange={(e) => setContactName(e.target.value)} className="h-8 bg-muted text-xs font-body" />
            <Textarea placeholder="Escribe tu consulta aquí..." value={message} onChange={(e) => setMessage(e.target.value)} className="bg-muted text-xs font-body min-h-[80px]" />
            <Button size="sm" onClick={handleSend} disabled={sending || !message.trim()} className="text-xs gap-1">
              <Send className="w-3 h-3" /> {sending ? "Enviando..." : "Enviar Consulta"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
