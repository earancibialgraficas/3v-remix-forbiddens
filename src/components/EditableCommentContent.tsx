import { useState } from "react";
import { Pencil, Check, X, History } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  commentId: string;
  content: string;
  originalContent?: string | null;
  edited?: boolean;
  isOwner: boolean;
  table: "comments" | "social_comments";
  renderContent: (content: string) => React.ReactNode;
  onUpdated?: (newContent: string) => void;
}

export function EditableCommentContent({
  commentId, content, originalContent, edited, isOwner, table, renderContent, onUpdated,
}: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!draft.trim() || draft === content) { setEditing(false); return; }
    setSaving(true);
    try {
      // If first edit, store original content as backup history
      const payload: any = { content: draft, edited: true, updated_at: new Date().toISOString() };
      if (!edited && !originalContent) payload.original_content = content;

      const { error } = await supabase.from(table as any).update(payload).eq("id", commentId);
      if (error) throw error;

      toast({ title: "Comentario editado" });
      onUpdated?.(draft);
      setEditing(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="text-sm bg-muted min-h-[70px]" autoFocus />
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving} className="h-7 text-[10px]"><Check className="w-3 h-3" /> Guardar</Button>
          <Button size="sm" variant="ghost" onClick={() => { setDraft(content); setEditing(false); }} className="h-7 text-[10px]"><X className="w-3 h-3" /> Cancelar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {renderContent(content)}
      <div className="flex items-center gap-2 mt-1">
        {edited && originalContent && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="text-[9px] text-muted-foreground italic hover:text-neon-cyan flex items-center gap-0.5">
                <History className="w-2.5 h-2.5" /> (editado)
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-card border-neon-cyan/30 text-xs">
              <p className="font-pixel text-[10px] text-neon-cyan mb-2">Original:</p>
              <p className="text-foreground whitespace-pre-wrap">{originalContent}</p>
            </PopoverContent>
          </Popover>
        )}
        {isOwner && (
          <button onClick={() => setEditing(true)} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-0.5">
            <Pencil className="w-3 h-3" /> Editar
          </button>
        )}
      </div>
    </div>
  );
}
