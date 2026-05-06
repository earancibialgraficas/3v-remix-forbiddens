import { Shield, Trash2, Ban, User as UserIcon, Copy } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Props {
  commentId: string;
  authorId: string;
  authorName?: string;
  table?: "comments" | "social_comments";
  onDeleted?: (id: string) => void;
}

export default function CommentModMenu({ commentId, authorId, authorName, table = "comments", onDeleted }: Props) {
  const { user, isAdmin, isMasterWeb, roles } = useAuth() as any;
  const { toast } = useToast();
  const navigate = useNavigate();
  const isStaff = isMasterWeb || isAdmin || (roles || []).includes("moderator");
  if (!isStaff || !user || user.id === authorId) return null;

  const handleDelete = async () => {
    if (!confirm("¿Eliminar este comentario permanentemente?")) return;
    const { error } = await supabase.from(table).delete().eq("id", commentId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    onDeleted?.(commentId);
    toast({ title: "Comentario eliminado" });
  };

  const handleBan = async () => {
    if (!confirm(`¿Banear a ${authorName || "este usuario"} permanentemente?`)) return;
    const { error } = await supabase.from("banned_users").insert({
      user_id: authorId, banned_by: user.id, ban_type: "ban", reason: "Ban desde comentario moderado",
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Usuario baneado" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="text-muted-foreground hover:text-neon-magenta transition-colors" title="Moderación">
          <Shield className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[200] bg-card border-border">
        <DropdownMenuItem onClick={handleDelete} className="text-destructive cursor-pointer focus:bg-destructive/10">
          <Trash2 className="w-3 h-3 mr-2" /> Eliminar comentario
        </DropdownMenuItem>
        {(isAdmin || isMasterWeb) && (
          <DropdownMenuItem onClick={handleBan} className="text-neon-orange cursor-pointer focus:bg-neon-orange/10">
            <Ban className="w-3 h-3 mr-2" /> Banear usuario
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate(`/usuario/${authorId}`)} className="cursor-pointer">
          <UserIcon className="w-3 h-3 mr-2" /> Ver perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(commentId); toast({ title: "ID copiado" }); }} className="cursor-pointer">
          <Copy className="w-3 h-3 mr-2" /> Copiar ID
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
