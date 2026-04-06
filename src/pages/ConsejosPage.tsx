import { BookOpen, Lightbulb, Gamepad2, Shield, Zap } from "lucide-react";

const tips = [
  { icon: Gamepad2, title: "Configura tu gamepad", desc: "Conecta un mando USB o Bluetooth y EmulatorJS lo detectará automáticamente. Puedes remapear los botones desde el menú del emulador.", color: "text-neon-green" },
  { icon: Shield, title: "Guarda tu progreso", desc: "Usa los save states del emulador (botón de guardar en la barra de herramientas) para no perder tu avance. ¡Puedes crear múltiples puntos de guardado!", color: "text-neon-cyan" },
  { icon: Zap, title: "Mejora el rendimiento", desc: "Si el juego va lento, prueba cerrar otras pestañas del navegador. Chrome y Edge suelen dar el mejor rendimiento para la emulación web.", color: "text-neon-magenta" },
  { icon: Lightbulb, title: "Controles de teclado", desc: "NES: Flechas = D-Pad, Z = B, X = A, Enter = Start, Shift = Select. SNES: Los mismos + A/S para L/R.", color: "text-neon-yellow" },
  { icon: Gamepad2, title: "Juega con amigos", desc: "EmulatorJS soporta multijugador local. Conecta un segundo mando para jugar juegos cooperativos como Contra o Double Dragon.", color: "text-neon-orange" },
  { icon: Shield, title: "ROMs legales", desc: "Solo utiliza ROMs de juegos que poseas físicamente. Existen también ROMs homebrew gratuitas creadas por la comunidad indie retro.", color: "text-destructive" },
];

export default function ConsejosPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-green/30 rounded p-4">
        <h1 className="font-pixel text-sm text-neon-green text-glow-green mb-1 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> CONSEJOS GAMING
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
    </div>
  );
}
