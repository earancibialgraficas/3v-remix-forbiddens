import { useState } from "react";
import { X, Send, Flag, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const REPORT_REASONS = [
  "Contenido inapropiado",
  "Spam o publicidad no autorizada",
  "Acoso o bullying",
  "Contenido explícito o violento",
  "Suplantación de identidad",
  "Discurso de odio o discriminación",
  "Información falsa / desinformación",
  "Doxxing o información personal",
  "Otro",
];

// 🔥 ID OFICIAL DE TU BOT DE SISTEMA
const BOT_SYSTEM_ID = "b20cd3e4-ea5e-49ab-9418-fb9c60998105";

interface ReportModalProps {
  reportedUserId: string;
  reportedUserName: string;
  postId?: string;
  onClose: () => void;
}

export default function ReportModal({ reportedUserId, reportedUserName, postId, onClose }: ReportModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!user) return;
    setSending(true);
    try {
      // 1. Conseguimos el nombre de quien hace el clic (el usuario real)
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
        
      const reporterName = profile?.display_name || 'Usuario';

      // 2. Preparamos el ticket de sistema limpio
      const systemTicket = `🚨 REPORTE DE SISTEMA 🚨
      
EMISOR: ${reporterName}
REPORTADO: ${reportedUserName}
MOTIVO: ${reason}
ORIGEN: ${postId ? 'Post ID: ' + postId : 'Reporte de Perfil'}

DETALLES ADICIONALES:
${details.trim() || 'El usuario no proporcionó detalles.'}

---------------------------
Requiere revisión inmediata.`;

      // 3. ENVIAMOS EL MENSAJE COMO SI FUERA EL BOT
      const { error } = await supabase.rpc("send_staff_report", {
        p_reporter_id: BOT_SYSTEM_ID, // 🔥 MAGIA: Supabase registrará al Bot como el remitente
        p_reported_user_id: reportedUserId,
        p_reason: reason,
        p_details: systemTicket,
        p_post_id: postId || null,
      });

      if (error) throw error;
      toast({ title: "Reporte enviado", description: "El staff revisará tu reporte." });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    /* fixed inset-0 hace que siga a la pantalla, ignorando el scroll de fondo */
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      
      {/* Centrado Absoluto Geométrico */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-card border border-destructive/40 rounded-xl p-5 shadow-[0_0_50px_rgba(220,38,38,0.15)] animate-scale-in flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 shrink-0">
          <h3 className="font-pixel text-[11px] text-destructive flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> REPORTAR USUARIO
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 pr-1 space-y-4">
          <div className="bg-destructive/10 rounded p-2.5 text-xs font-body text-muted-foreground border border-destructive/20">
            Reportando a: <span className="text-foreground font-medium">{reportedUserName}</span>
          </div>

          <div>
            <label className="text-[10px] font-pixel text-muted-foreground block mb-2 uppercase tracking-widest">Motivo del reporte</label>
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full h-9 rounded-md border border-border bg-black/50 text-xs font-body text-foreground px-3 focus:border-destructive/50 outline-none transition-colors"
            >
              {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-pixel text-muted-foreground block mb-2 uppercase tracking-widest">Detalles adicionales</label>
            <Textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Describe la situación (opcional)..."
              className="bg-black/50 text-xs font-body min-h-[100px] border-border focus:border-destructive/50 resize-none"
              maxLength={1000}
            />
          </div>
        </div>

        <div className="pt-4 flex gap-2 justify-end shrink-0 mt-2 border-t border-white/10">
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs font-body border-white/10 hover:bg-white/5">
            Cancelar
          </Button>
          <Button size="sm" variant="destructive" onClick={handleSend} disabled={sending} className="text-xs gap-1 font-pixel shadow-[0_0_15px_rgba(220,38,38,0.4)]">
            <Send className="w-3 h-3" /> {sending ? "Enviando..." : "Enviar Reporte"}
          </Button>
        </div>
      </div>
    </div>
  );
}