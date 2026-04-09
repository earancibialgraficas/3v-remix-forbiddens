import { Shield, AlertTriangle } from "lucide-react";

const defaultRules = [
  {
    title: "📜 Normas Generales",
    items: [
      "Trata a todos con respeto. No se toleran insultos, acoso ni discriminación de ningún tipo.",
      "No publiques contenido repetitivo, spam o publicidad no autorizada.",
      "Publica en la categoría correcta. Si no estás seguro, usa el foro general.",
      "No compartas información personal de otros sin su consentimiento (doxxing).",
      "Si ves contenido inapropiado, usa el botón de reportar.",
    ],
  },
  {
    title: "🤝 Respeto y Cero Discriminación",
    items: [
      "Forbiddens es un foro de debate, pero el trato entre usuarios es monitoreado constantemente.",
      "Cero tolerancia a la discriminación por etnia, género, orientación sexual, religión o cualquier otra condición.",
      "Las infracciones a esta norma serán sancionadas con suspensión inmediata según la gravedad.",
    ],
  },
  {
    title: "🔞 Prohibición de Contenido +18",
    items: [
      "Forbiddens es un sitio libre de contenido sexual explícito o morbo.",
      "Subir contenido sexual, gore o material grotesco resultará en una suspensión inmediata de 15 días y control de publicaciones.",
      "La reincidencia resultará en expulsión permanente sin posibilidad de apelación.",
    ],
  },
  {
    title: "⚖️ Sanciones",
    items: [
      "El staff se reserva el derecho de sancionar a cualquier usuario que incumpla las normas.",
      "Las sanciones van desde advertencias hasta expulsión permanente, dependiendo de la gravedad.",
      "Si consideras que una sanción es injusta, contacta al staff por Discord.",
    ],
  },
];

export default function RulesPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-card border border-neon-orange/30 rounded p-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-neon-orange" />
          <div>
            <h1 className="font-pixel text-sm text-neon-orange">REGLAS DE CONVIVENCIA</h1>
            <p className="text-xs text-muted-foreground font-body">Normas que todos los miembros deben respetar</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {defaultRules.map((section, i) => (
          <div key={i} className="bg-card border border-border rounded p-4">
            <h3 className="font-pixel text-[11px] text-foreground mb-3">{section.title}</h3>
            <ul className="space-y-2">
              {section.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-xs font-body text-muted-foreground">
                  <span className="text-neon-orange shrink-0 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-card border border-destructive/20 rounded p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h3 className="font-pixel text-[10px] text-destructive">IMPORTANTE</h3>
        </div>
        <p className="text-xs font-body text-muted-foreground">
          El incumplimiento de estas normas puede resultar en suspensión temporal o permanente de tu cuenta.
          Al registrarte y participar en Forbiddens, aceptas estas reglas de convivencia.
        </p>
      </div>
    </div>
  );
}
