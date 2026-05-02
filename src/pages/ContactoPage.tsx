import { useState } from "react";
import { Mail, Send, CheckCircle, Instagram, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ContactoPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !subject.trim()) {
      toast({ title: "Faltan datos", description: "Completa el asunto y el mensaje.", variant: "destructive" });
      return;
    }
    const finalName = name.trim() || profile?.display_name || "Anónimo";
    const finalEmail = email.trim() || user?.email || "";
    if (!finalEmail) {
      toast({ title: "Email requerido", description: "Inicia sesión o escribe tu email.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: { name: finalName, email: finalEmail, subject, message },
      });
      if (error) throw error;
      setSent(true);
      setSubject("");
      setMessage("");
      toast({ title: "✅ Mensaje enviado", description: "Te responderemos lo antes posible." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message ?? "No se pudo enviar el mensaje", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <header className="space-y-2">
        <h1 className="font-pixel text-xl text-neon-cyan text-glow-cyan flex items-center gap-2">
          <Mail className="w-6 h-6" /> CONTACTO
        </h1>
        <p className="text-sm text-muted-foreground font-body">
          ¿Dudas, propuestas o problemas técnicos? Escríbenos y el equipo de Forbiddens te responderá pronto.
        </p>
      </header>

      <section className="bg-card border border-neon-cyan/30 rounded p-4 space-y-3">
        <h2 className="font-pixel text-xs text-neon-green">// FORMULARIO</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Input type="email" placeholder="Tu email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Input placeholder="Asunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea
          placeholder="Cuéntanos en qué podemos ayudarte..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
        />
        <Button onClick={handleSend} disabled={sending} className="w-full">
          {sent ? <CheckCircle className="w-4 h-4 mr-2" /> : <Send className="w-4 h-4 mr-2" />}
          {sending ? "Enviando..." : sent ? "Enviado" : "Enviar mensaje"}
        </Button>
      </section>

      <section className="bg-card border border-border rounded p-4 space-y-3">
        <h2 className="font-pixel text-xs text-neon-magenta">// OTROS CANALES</h2>
        <ul className="text-sm font-body space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-neon-cyan" />
            <a href="mailto:e.arancibial.graficas@gmail.com" className="hover:text-foreground">
              e.arancibial.graficas@gmail.com
            </a>
          </li>
          <li className="flex items-center gap-2">
            <Instagram className="w-4 h-4 text-neon-magenta" /> @forbiddens
          </li>
          <li className="flex items-center gap-2">
            <Youtube className="w-4 h-4 text-neon-yellow" /> Forbiddens Oficial
          </li>
        </ul>
      </section>
    </div>
  );
}
