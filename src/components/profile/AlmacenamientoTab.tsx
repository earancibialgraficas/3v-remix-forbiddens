import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { HardDrive, Trash2, Gamepad2, Image as ImageIcon, Globe, User, X, CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function AlmacenamientoTab({ userId, maxStorage, storageUsed, storageItems, setStorageItems, setStorageUsed }: any) {
  const { toast } = useToast();
  const storagePercent = maxStorage >= 9999 ? 0 : Math.min(100, (storageUsed / maxStorage) * 100);
  
  // Estado para la selección múltiple
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Estados para el Modal de Confirmación
  const [itemsToRemove, setItemsToRemove] = useState<any[]>([]);
  const [isRemoving, setIsRemoving] = useState(false);

  // Congelar scroll cuando el modal está abierto
  useEffect(() => {
    if (itemsToRemove.length > 0) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [itemsToRemove]);

  // Agrupar elementos por categoría
  const games = storageItems.filter((i: any) => i.type === "Partida guardada");
  const media = storageItems.filter((i: any) => i.type === "Foto" || i.type === "Contenido social");
  const avatars = storageItems.filter((i: any) => i.type === "Avatar");

  const getItemIcon = (type: string) => {
    switch (type) {
      case "Partida guardada": return <Gamepad2 className="w-3.5 h-3.5 text-neon-green" />;
      case "Foto": return <ImageIcon className="w-3.5 h-3.5 text-neon-cyan" />;
      case "Contenido social": return <Globe className="w-3.5 h-3.5 text-neon-magenta" />;
      case "Avatar": return <User className="w-3.5 h-3.5 text-neon-yellow" />;
      default: return <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const toggleSelect = (itemId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAllCategory = (items: any[]) => {
    const categoryIds = items.filter(i => i.id).map(i => i.id);
    const allSelected = categoryIds.every(id => selectedIds.has(id));
    const newSelected = new Set(selectedIds);
    
    if (allSelected) {
      categoryIds.forEach(id => newSelected.delete(id));
    } else {
      categoryIds.forEach(id => newSelected.add(id));
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDeleteClick = () => {
    if (selectedIds.size === 0) return;
    const itemsToDelete = storageItems.filter((i: any) => selectedIds.has(i.id));
    setItemsToRemove(itemsToDelete);
  };

  // 🔥 LÓGICA CORREGIDA: MANTIENE EL PUNTAJE, BORRA SOLO LA PARTIDA 🔥
  const confirmDelete = async () => {
    if (itemsToRemove.length === 0) return;
    setIsRemoving(true);
    
    let freedSpace = 0;
    const successfullyProcessedIds = new Set<string>();

    for (const item of itemsToRemove) {
      if (!item.id) continue;
      
      try {
        let error = null;
        
        if (item.type === 'Partida guardada') {
          // 🔥 AQUÍ ESTÁ EL CAMBIO: No borramos la fila, solo ponemos el game_state en null 🔥
          const res = await supabase.from('leaderboard_scores')
            .update({ game_state: null } as any)
            .eq('id', item.id);
          error = res.error;
        } else if (item.type === 'Foto') {
          const res = await supabase.from('photos').delete().eq('id', item.id);
          error = res.error;
        } else if (item.type === 'Contenido social') {
          const res = await supabase.from('social_content').delete().eq('id', item.id);
          error = res.error;
        }

        if (!error) {
          freedSpace += item.size;
          successfullyProcessedIds.add(item.id);
        } else {
          console.error(`Error procesando ${item.name}:`, error);
        }
      } catch (e) {
        console.error("Excepción procesando item:", e);
      }
    }

    // Actualizar estado visual: quitamos los que ya no tienen datos guardados
    setStorageItems((prev: any) => prev.filter((item: any) => !successfullyProcessedIds.has(item.id)));
    setStorageUsed((prev: any) => Math.max(0, prev - freedSpace));
    
    // Limpiar selección
    const newSelected = new Set(selectedIds);
    successfullyProcessedIds.forEach(id => newSelected.delete(id));
    setSelectedIds(newSelected);

    setIsRemoving(false);
    setItemsToRemove([]);
    toast({ 
      title: "Almacenamiento actualizado", 
      description: `Se liberaron ${freedSpace.toFixed(1)} MB. Los puntajes se mantienen intactos.` 
    });
  };

  const renderTable = (items: any[], title: string, colorClass: string) => {
    if (items.length === 0) return null;

    const categoryIds = items.filter(i => i.id).map(i => i.id);
    const allSelected = categoryIds.length > 0 && categoryIds.every(id => selectedIds.has(id));

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/10">
          <h4 className={cn("font-pixel text-[11px] uppercase", colorClass)}>{title}</h4>
          {items.some(i => i.id) && (
             <Button variant="ghost" size="sm" onClick={() => toggleSelectAllCategory(items)} className="h-6 text-[9px] font-body opacity-70 hover:opacity-100">
               {allSelected ? "Desmarcar Todos" : "Marcar Todos"}
             </Button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-[450px]">
            <div className="grid grid-cols-[30px_auto_1fr_80px_100px_60px_30px] gap-2 text-[9px] font-pixel text-muted-foreground opacity-50 border-b border-border/30 pb-1 mb-1 uppercase items-center">
              <span className="text-center">#</span>
              <span></span>
              <span>Elemento</span>
              <span>Tipo</span>
              <span>Fecha</span>
              <span className="text-right">Peso</span>
              <span></span>
            </div>
            
            {items.map((item: any) => {
              const isSelected = item.id ? selectedIds.has(item.id) : false;
              
              return (
                <div key={item.id || item.name} className={cn("grid grid-cols-[30px_auto_1fr_80px_100px_60px_30px] gap-2 text-xs font-body py-2 border-b border-border/10 hover:bg-muted/30 transition-colors items-center group", isSelected && "bg-muted/20")}>
                  
                  <div className="flex justify-center">
                    {item.id ? (
                      <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 border-muted-foreground/50 data-[state=checked]:bg-neon-cyan data-[state=checked]:border-neon-cyan"
                      />
                    ) : <span className="w-4 h-4" />}
                  </div>

                  <div className="flex items-center justify-center shrink-0">
                    {getItemIcon(item.type)}
                  </div>

                  <span className="text-foreground truncate pr-2 font-medium" title={item.name}>{item.name}</span>
                  <span className="text-muted-foreground text-[10px] opacity-70 truncate">{item.type}</span>
                  <span className="text-muted-foreground text-[10px] opacity-70">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : "—"}
                  </span>
                  <span className="text-right text-muted-foreground text-[10px] opacity-70">
                    {item.size < 1 ? `${Math.round(item.size * 1024)} KB` : `${item.size.toFixed(1)} MB`}
                  </span>
                  
                  <div className="flex justify-center">
                    {item.id && item.type !== 'Avatar' && (
                      <button
                        onClick={() => setItemsToRemove([item])}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-sm hover:bg-destructive/10"
                        title="Eliminar datos guardados"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded p-4 space-y-4 animate-in fade-in relative">
      
      {/* CABECERA DE ALMACENAMIENTO */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 pb-4 border-b border-border/50">
        <div className="w-full md:w-1/2 space-y-2">
          <h3 className="font-pixel text-[10px] text-muted-foreground uppercase flex items-center gap-2">
            <HardDrive className="w-4 h-4" /> Uso de Almacenamiento
          </h3>
          <div className="flex justify-between text-xs font-body mb-1">
            <span className="text-muted-foreground uppercase opacity-70">Ocupado</span>
            <span className="text-foreground font-bold">{storageUsed.toFixed(1)} MB <span className="font-normal opacity-50">/ {maxStorage >= 9999 ? "∞" : `${maxStorage} MB`}</span></span>
          </div>
          <div className="w-full h-3 bg-black/40 rounded overflow-hidden border border-white/10 shadow-inner">
            <div className={cn("h-full transition-all duration-500 rounded", storagePercent > 80 ? "bg-destructive shadow-[0_0_10px_rgba(220,38,38,0.5)]" : "bg-neon-green shadow-[0_0_10px_rgba(57,255,20,0.5)]")} style={{ width: `${storagePercent}%` }} />
          </div>
        </div>

        <div className="flex items-end h-full">
           <Button 
             variant="destructive" 
             disabled={selectedIds.size === 0}
             onClick={handleBulkDeleteClick}
             className="text-xs font-pixel gap-2 h-9 transition-all"
           >
             <Trash2 className="w-3.5 h-3.5" /> 
             Eliminar Seleccionados ({selectedIds.size})
           </Button>
        </div>
      </div>
      
      {/* LISTAS CATEGORIZADAS */}
      {storageItems.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center opacity-50">
           <HardDrive className="w-12 h-12 mb-3" />
           <p className="text-xs font-body uppercase tracking-widest">Almacenamiento Vacío</p>
        </div>
      ) : (
        <div className="space-y-2">
          {renderTable(games, "🎮 Partidas Guardadas", "text-neon-green")}
          {renderTable(media, "🖼️ Fotos y Publicaciones", "text-neon-cyan")}
          {renderTable(avatars, "👤 Archivos de Avatar", "text-neon-yellow")}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {itemsToRemove.length > 0 && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setItemsToRemove([])}>
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md bg-card border border-destructive/40 rounded-xl p-6 shadow-[0_0_50px_rgba(220,38,38,0.15)] animate-scale-in flex flex-col" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10 shrink-0">
              <h3 className="font-pixel text-[11px] text-destructive flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> CONFIRMAR ACCIÓN
              </h3>
              <button onClick={() => setItemsToRemove([])} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 text-center">
              <p className="text-sm font-body text-muted-foreground mb-3">
                ¿Seguro que deseas eliminar los datos guardados de 
                <strong className="text-foreground mx-1">
                  {itemsToRemove.length === 1 ? `"${itemsToRemove[0].name}"` : `estos ${itemsToRemove.length} elementos`}
                </strong>?
              </p>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-left max-h-[100px] overflow-y-auto custom-scrollbar mb-2">
                 <ul className="text-xs font-body text-destructive/90 space-y-1">
                    {itemsToRemove.map(i => (
                       <li key={i.id || i.name} className="truncate">• {i.name} ({i.type})</li>
                    ))}
                 </ul>
              </div>

              <p className="text-[10px] font-body text-destructive/80 mt-3 uppercase tracking-wide">
                En los juegos, el puntaje se conservará pero la partida se reiniciará.
                <br/>Esta acción es irreversible.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full pt-4 border-t border-white/10 mt-2">
              <Button 
                variant="outline" 
                onClick={() => setItemsToRemove([])} 
                className="w-full text-xs font-body border-white/10 hover:bg-white/5 h-10"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmDelete} 
                disabled={isRemoving} 
                className="w-full text-xs font-pixel shadow-[0_0_15px_rgba(220,38,38,0.3)] h-10 tracking-tighter"
              >
                {isRemoving ? "Procesando..." : "Sí, Limpiar Datos"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}