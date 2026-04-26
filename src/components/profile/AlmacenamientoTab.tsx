import { HardDrive, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AlmacenamientoTab({ userId, maxStorage, storageUsed, storageItems, setStorageItems, setStorageUsed }: any) {
  const { toast } = useToast();
  const storagePercent = maxStorage >= 9999 ? 0 : Math.min(100, (storageUsed / maxStorage) * 100);
  
  return (
    <div className="bg-card border border-border rounded p-4 space-y-3 text-center md:text-left animate-in fade-in">
      <h3 className="font-pixel text-[10px] text-muted-foreground mb-3 uppercase flex items-center gap-1 justify-center md:justify-start">
        <HardDrive className="w-3 h-3" /> Almacenamiento
      </h3>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-body">
          <span className="text-muted-foreground uppercase opacity-70">Usado</span>
          <span className="text-foreground">{storageUsed.toFixed(1)} MB / {maxStorage >= 9999 ? "∞" : `${maxStorage} MB`}</span>
        </div>
        <div className="w-full h-3 bg-muted rounded overflow-hidden border border-border">
          <div className={cn("h-full transition-all duration-500 rounded", storagePercent > 80 ? "bg-destructive" : "bg-neon-green")} style={{ width: `${storagePercent}%` }} />
        </div>
      </div>
      
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[400px] text-left">
          <div className="grid grid-cols-[1fr_80px_110px_60px_30px] gap-2 text-[9px] font-pixel text-muted-foreground opacity-50 border-b pb-1 uppercase">
            <span>Elemento</span>
            <span>Tipo</span>
            <span>Fecha</span>
            <span className="text-right">Peso</span>
            <span></span>
          </div>
          
          {storageItems.length === 0 ? (
            <p className="text-xs text-muted-foreground font-body py-4 text-center">No hay elementos almacenados</p>
          ) : (
            storageItems.map((item: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_80px_110px_60px_30px] gap-2 text-xs font-body py-2 border-b border-border/30 hover:bg-muted/30 transition-colors items-center group">
                <span className="text-foreground truncate" title={item.name}>{item.name}</span>
                <span className="text-muted-foreground text-[10px] opacity-60">{item.type}</span>
                <span className="text-muted-foreground text-[10px] opacity-60">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                </span>
                <span className="text-right text-muted-foreground text-[10px] opacity-60">
                  {item.size < 1 ? `${Math.round(item.size * 1024)} KB` : `${item.size.toFixed(1)} MB`}
                </span>
                <button
                  onClick={async () => {
                    if (item.id) {
                      await supabase
                        .from(item.type === 'Foto' ? 'photos' : 'social_content')
                        .delete()
                        .eq('id', item.id);
                        
                      setStorageItems((prev: any) => prev.filter((_: any, idx: number) => idx !== i));
                      setStorageUsed((prev: any) => prev - item.size);
                      toast({ title: "Eliminado permanentemente" });
                    }
                  }}
                  className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar permanentemente"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}