import { useState } from "react";
import { X, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ReportModalProps {
  reportedUserId: string;
  reportedUserName: string;
  postId?: string;
  onClose: () => void;
}

export default function ReportModal({ reportedUserId, reportedUserName, postId, onClose }: ReportModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      post_id: postId,
      reason: reason.trim(),
      status: 'pending'
    });
    setSubmitting(false);
    if (!error) {
      setSuccess(true);
      setTimeout(onClose, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-card border border-border rounded-xl p-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] animate-scale-in" 
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
        
        {success ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-neon-green" />
            <h3 className="font-pixel text-sm text-neon-green">Reporte Enviado</h3>
            <p className="text-xs text-muted-foreground text-center font-body">Nuestro equipo de moderación revisará este caso.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-destructive" />
              </div>
              <div className="min-w-0 pr-6">
                <h3 className="font-pixel text-[11px] text-destructive leading-tight mb-1">Reportar Usuario</h3>
                <p className="text-[10px] text-muted-foreground font-body truncate">
                  Reportando a <strong className="text-foreground">{reportedUserName}</strong>
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[11px] font-pixel text-foreground opacity-80 uppercase tracking-widest">Motivo del reporte:</label>
              <Textarea 
                placeholder="Describe por qué este contenido incumple las reglas..." 
                value={reason} 
                onChange={e => setReason(e.target.value)}
                className="min-h-[120px] text-xs font-body bg-black/50 border-white/10 resize-none custom-scrollbar focus:border-destructive/50"
              />
            </div>
            
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-body border-white/10 hover:bg-white/5">
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleSubmit} disabled={!reason.trim() || submitting} className="text-xs font-pixel shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                {submitting ? "Enviando..." : "Enviar Reporte"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}