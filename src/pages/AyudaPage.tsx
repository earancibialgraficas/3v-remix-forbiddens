import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { HelpCircle, ChevronDown, ChevronRight, Send, CheckCircle, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const faqs = [
  { q: "¿Cómo juego en los emuladores?", a: "Ve a Salas de Juego en el menú lateral, escoge un juego de la Biblioteca o sube tu propia ROM. El emulador se abrirá automáticamente en el navegador." },
  { q: "¿Cómo subo de clasificación?", a: "Acumula puntos jugando en los emuladores o en la pagina de biblioteca. Los puntos se actualizan en tiempo real en el Leaderboard." },
  { q: "¿Qué incluye cada membresía?", a: "Cada plan ofrece diferentes beneficios como avatares animados, más espacio de subida, acceso VIP y más. Revisa la sección de Membresías para ver los detalles." },
  { q: "¿Cómo linkeo mis redes sociales?", a: "Ve a tu perfil, Configuración > Redes Sociales y agrega tus URLs de Instagram, YouTube y TikTok." },
  { q: "¿Cómo reporto a un usuario?", a: "En cualquier post, haz clic en el botón de reporte (bandera). Los administradores revisarán tu reporte." },
  { q: "¿Puedo cambiar mi nombre de usuario?", a: "Sí, depende de tu membresía. Los usuarios gratuitos no pueden cambiarlo, mientras que miembros de pago pueden hacerlo según su plan." },
];

type SectionId = "ayuda" | "contacto" | "privacidad";

export default function AyudaPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [openSection, setOpenSection] = useState<SectionId | null>("ayuda");
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const ayudaRef = useRef<HTMLDivElement>(null);
  const contactoRef = useRef<HTMLDivElement>(null);
  const privacidadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const seccion = searchParams.get("seccion") as SectionId | null;
    if (seccion && ["ayuda", "contacto", "privacidad"].includes(seccion)) {
      setOpenSection(seccion);
      setTimeout(() => {
        const ref = seccion === "ayuda" ? ayudaRef : seccion === "contacto" ? contactoRef : privacidadRef;
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [searchParams]);

  const toggleSection = (s: SectionId) => setOpenSection(openSection === s ? null : s);

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión para enviar una consulta", variant: "destructive" });
      return;
    }
    const name = contactName.trim() || profile?.display_name || user?.user_metadata?.username || "Anónimo";
    const email = user.email!;
    setSending(true);

    try {
      await supabase.from("contact_messages").insert({
        user_id: user.id, name, email, message,
      } as any);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer re_CH7h6Grx_GXG6mMB5484i3TaZrsNp6AM1"
        },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: ["forbiddens.mcraft@gmail.com"],
          subject: `Nueva Consulta de Soporte Forbiddens - ${name}`,
          html: `
            <h2>Nueva solicitud de contacto</h2>
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email del usuario:</strong> ${email}</p>
            <hr />
            <p><strong>Mensaje:</strong></p>
            <p>${message}</p>
          `
        })
      });

      if (!res.ok) throw new Error("No se pudo enviar el correo a través de Resend.");

      setSent(true);
      toast({ title: "Enviado", description: "Tu consulta fue enviada exitosamente." });
    } catch (e) {
      console.error("Error al enviar consulta:", e);
      toast({ title: "Aviso", description: "El mensaje se guardó en el sistema, pero el correo falló.", variant: "destructive" });
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  const SectionHeader = ({ id, icon: Icon, title, color }: { id: SectionId; icon: any; title: string; color: string }) => (
    <button
      onClick={() => toggleSection(id)}
      className={cn(
        "w-full flex items-center justify-between p-3 text-left transition-colors hover:bg-muted/30",
        openSection === id && "bg-muted/20"
      )}
    >
      <span className="font-pixel text-[10px] flex items-center gap-2" style={{ color }}>
        <Icon className="w-3.5 h-3.5" /> {title}
      </span>
      {openSection === id
        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
        : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="space-y-3 animate-fade-in max-w-2xl">
      <div className="bg-card border border-border rounded p-4">
        <h1 className="font-pixel text-sm text-muted-foreground mb-1 flex items-center gap-2">
          <HelpCircle className="w-4 h-4" /> CENTRO DE AYUDA
        </h1>
        <p className="text-xs text-muted-foreground font-body">Ayuda, contacto y privacidad — todo en un solo lugar.</p>
      </div>

      {/* SECCIÓN AYUDA / FAQ */}
      <div ref={ayudaRef} className="bg-card border border-neon-green/30 rounded overflow-hidden scroll-mt-4">
        <SectionHeader id="ayuda" icon={HelpCircle} title="AYUDA Y PREGUNTAS FRECUENTES" color="hsl(var(--neon-green))" />
        {openSection === "ayuda" && (
          <div className="p-3 space-y-1 border-t border-border animate-fade-in">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-muted/20 border border-border rounded overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/40 transition-colors"
                >
                  <span className="text-xs font-body text-foreground">{faq.q}</span>
                  {expanded === i
                    ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                </button>
                <div className={cn("overflow-hidden transition-all duration-300", expanded === i ? "max-h-40 opacity-100" : "max-h-0 opacity-0")}>
                  <p className="px-3 pb-3 text-xs text-muted-foreground font-body leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN CONTACTO */}
      <div ref={contactoRef} className="bg-card border border-neon-cyan/30 rounded overflow-hidden scroll-mt-4">
        <SectionHeader id="contacto" icon={Mail} title="CONTACTO" color="hsl(var(--neon-cyan))" />
        {openSection === "contacto" && (
          <div className="p-4 space-y-4 border-t border-border animate-fade-in">
            <div className="space-y-2 text-xs font-body text-muted-foreground leading-relaxed">
              <p>¿Tienes una pregunta, sugerencia o necesitas reportar algo? Estamos aquí para ayudarte.</p>
              <ul className="space-y-1 pl-2">
                <li>📩 <span className="text-foreground">Email general:</span> forbiddens.mcraft@gmail.com</li>
                <li>🛠️ <span className="text-foreground">Soporte técnico:</span> usa el formulario de abajo</li>
                <li>⏱️ <span className="text-foreground">Tiempo de respuesta:</span> 24–48 horas</li>
              </ul>
            </div>

            <div className="bg-muted/20 border border-neon-cyan/20 rounded p-3 space-y-3">
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
        )}
      </div>

      {/* SECCIÓN PRIVACIDAD */}
      <div ref={privacidadRef} className="bg-card border border-neon-magenta/30 rounded overflow-hidden scroll-mt-4">
        <SectionHeader id="privacidad" icon={Shield} title="POLÍTICA DE PRIVACIDAD" color="hsl(var(--neon-magenta))" />
        {openSection === "privacidad" && (
          <div className="p-4 space-y-4 border-t border-border animate-fade-in text-xs font-body text-muted-foreground leading-relaxed">
            <section className="space-y-1">
              <h3 className="font-pixel text-[10px] text-neon-magenta">1. DATOS QUE RECOPILAMOS</h3>
              <p>Cuando te registras y usas Forbiddens, almacenamos: tu correo electrónico, nombre de usuario, avatar, mensajes en el foro, puntuaciones del arcade y configuraciones de tu perfil.</p>
            </section>

            <section className="space-y-1">
              <h3 className="font-pixel text-[10px] text-neon-magenta">2. CÓMO USAMOS TUS DATOS</h3>
              <p>Tus datos se utilizan únicamente para hacer funcionar la comunidad: autenticarte, mostrar tu perfil, calcular rankings y permitirte interactuar con otros usuarios. <span className="text-foreground">No vendemos ni compartimos tu información con terceros</span>.</p>
            </section>

            <section className="space-y-1">
              <h3 className="font-pixel text-[10px] text-neon-magenta">3. COOKIES Y SESIÓN</h3>
              <p>Usamos cookies técnicas para mantener tu sesión iniciada. No usamos cookies publicitarias ni de rastreo de terceros.</p>
            </section>

            <section className="space-y-1">
              <h3 className="font-pixel text-[10px] text-neon-magenta">4. CONTENIDO QUE PUBLICAS</h3>
              <p>Eres responsable del contenido que subes (posts, fotos, ROMs). Nos reservamos el derecho de eliminar contenido que viole nuestras reglas o leyes vigentes.</p>
            </section>

            <section className="space-y-1">
              <h3 className="font-pixel text-[10px] text-neon-magenta">5. TUS DERECHOS</h3>
              <p>Puedes solicitar en cualquier momento: acceso a tus datos, corrección, eliminación de tu cuenta o exportación de tu información. Escríbenos desde la sección de Contacto.</p>
            </section>

            <section className="space-y-1">
              <h3 className="font-pixel text-[10px] text-neon-magenta">6. SEGURIDAD</h3>
              <p>Tus contraseñas se almacenan cifradas y la base de datos está protegida con políticas de acceso a nivel de fila (RLS). Aun así, ningún sistema es 100% invulnerable; te recomendamos usar contraseñas únicas.</p>
            </section>

            <section className="space-y-1">
              <h3 className="font-pixel text-[10px] text-neon-magenta">7. CAMBIOS A ESTA POLÍTICA</h3>
              <p>Si actualizamos esta política, te lo notificaremos en el sitio. La última actualización es del año en curso.</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
