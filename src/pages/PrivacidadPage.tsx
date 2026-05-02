import { Shield, Lock, Eye, Database, Mail } from "lucide-react";

export default function PrivacidadPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <header className="space-y-2">
        <h1 className="font-pixel text-xl text-neon-green text-glow-green flex items-center gap-2">
          <Shield className="w-6 h-6" /> POLÍTICA DE PRIVACIDAD
        </h1>
        <p className="text-xs text-muted-foreground font-body">Última actualización: 2 de mayo de 2026</p>
      </header>

      <section className="bg-card border border-neon-green/30 rounded p-4 space-y-2">
        <h2 className="font-pixel text-xs text-neon-cyan flex items-center gap-2">
          <Eye className="w-4 h-4" /> 1. QUÉ INFORMACIÓN RECOPILAMOS
        </h2>
        <p className="text-sm font-body text-muted-foreground">
          Recopilamos los datos mínimos necesarios para que la comunidad funcione: tu email, nombre de usuario,
          avatar, publicaciones, comentarios, puntuaciones de los emuladores y preferencias de configuración.
        </p>
      </section>

      <section className="bg-card border border-neon-cyan/30 rounded p-4 space-y-2">
        <h2 className="font-pixel text-xs text-neon-magenta flex items-center gap-2">
          <Database className="w-4 h-4" /> 2. CÓMO USAMOS TUS DATOS
        </h2>
        <ul className="text-sm font-body text-muted-foreground list-disc pl-5 space-y-1">
          <li>Para autenticarte y mantener tu sesión activa.</li>
          <li>Para mostrar tu actividad pública (posts, fotos, leaderboards).</li>
          <li>Para enviarte notificaciones del sitio (mensajes, reportes, amistades).</li>
          <li>Para mejorar la experiencia y prevenir abusos.</li>
        </ul>
      </section>

      <section className="bg-card border border-neon-magenta/30 rounded p-4 space-y-2">
        <h2 className="font-pixel text-xs text-neon-yellow flex items-center gap-2">
          <Lock className="w-4 h-4" /> 3. SEGURIDAD
        </h2>
        <p className="text-sm font-body text-muted-foreground">
          Usamos infraestructura cifrada (HTTPS) y políticas de seguridad a nivel de fila (RLS) para que solo tú
          puedas ver y editar tu información personal. Nunca vendemos tus datos a terceros.
        </p>
      </section>

      <section className="bg-card border border-neon-yellow/30 rounded p-4 space-y-2">
        <h2 className="font-pixel text-xs text-neon-green">// 4. TUS DERECHOS</h2>
        <p className="text-sm font-body text-muted-foreground">
          Puedes solicitar en cualquier momento el acceso, rectificación o eliminación de tus datos personales
          escribiéndonos a través del formulario de contacto.
        </p>
      </section>

      <section className="bg-card border border-border rounded p-4 space-y-2">
        <h2 className="font-pixel text-xs text-neon-cyan">// 5. COOKIES</h2>
        <p className="text-sm font-body text-muted-foreground">
          Solo usamos cookies técnicas necesarias para mantener tu sesión iniciada. No usamos cookies de
          publicidad ni rastreadores de terceros.
        </p>
      </section>

      <section className="bg-card border border-border rounded p-4 space-y-2">
        <h2 className="font-pixel text-xs text-neon-magenta flex items-center gap-2">
          <Mail className="w-4 h-4" /> 6. CONTACTO
        </h2>
        <p className="text-sm font-body text-muted-foreground">
          Para cualquier consulta sobre privacidad escríbenos a{" "}
          <a href="mailto:e.arancibial.graficas@gmail.com" className="text-neon-cyan hover:underline">
            e.arancibial.graficas@gmail.com
          </a>
          .
        </p>
      </section>
    </div>
  );
}
