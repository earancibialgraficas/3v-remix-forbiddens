import { useState } from "react";
import { X, Send, Flag } from "lucide-react";
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
      const { error } = await supabase.rpc("send_staff_report", {
        p_reporter_id: user.id,
        p_reported_user_id: reportedUserId,
        p_reason: reason,
        p_details: details.trim(),
        p_post_id: postId || null,
      });
      if (error) throw error;
      toast({ title: "Reporte enviado", description: "El staff revisará tu reporte" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative bg-card border border-destructive/30 rounded-lg p-5 max-w-md w-full space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-pixel text-[11px] text-destructive flex items-center gap-2">
            <Flag className="w-4 h-4" /> REPORTAR USUARIO
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-muted/30 rounded p-2 text-xs font-body text-muted-foreground">
          Reportando a: <span className="text-foreground font-medium">{reportedUserName}</span>
        </div>

        <div>
          <label className="text-[10px] font-body text-muted-foreground block mb-1">Motivo del reporte</label>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full h-8 rounded border border-border bg-muted text-xs font-body text-foreground px-2"
          >
            {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[10px] font-body text-muted-foreground block mb-1">Detalles adicionales (opcional)</label>
          <Textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Describe la situación con más detalle..."
            className="bg-muted text-xs font-body min-h-[80px]"
            maxLength={1000}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onClose} className="text-xs">Cancelar</Button>
          <Button size="sm" variant="destructive" onClick={handleSend} disabled={sending} className="text-xs gap-1">
            <Send className="w-3 h-3" /> {sending ? "Enviando..." : "Enviar Reporte"}
          </Button>
        </div>
      </div>
    </div>
  );
}
