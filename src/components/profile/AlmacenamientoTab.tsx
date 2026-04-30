import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { HardDrive, Trash2, Gamepad2, X, Clock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export default function AlmacenamientoTab({ userId, maxStorage, storageUsed, storageItems, setStorageItems, setStorageUsed }: any) {
  const { toast } = useToast();
  
  // Protección contra NaN si los datos aún no cargan
  const safeMaxStorage = maxStorage || 100;
  const safeStorageUsed = storageUsed || 0;
  const storagePercent = safeMaxStorage >= 9999 ? 0 : Math.min(100, (safeStorageUsed / safeMaxStorage) * 100);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemsToRemove, setItemsToRemove] = useState<any[]>([]);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (itemsToRemove.length > 0) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [itemsToRemove]);

  // SEPARACIÓN DE DATOS
  const games = (storageItems || []).filter((i: any) => i.type && i.type.toLowerCase().includes("partida"));
  
  const socialUsage = (storageItems || [])
    .filter((i: any) => i.type === "Foto" || i.type === "Contenido social")
    .reduce((acc: number, curr: any) => acc + (curr.size || 0), 0);
    
  const avatarUsage = (storageItems || [])
    .filter((i: any) => i.type === "Avatar")
    .reduce((acc: number, curr: any) => acc + (curr.size || 0), 0);

  const toggleSelect = (itemId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(itemId)) newSelected.delete(itemId);
    else newSelected.add(itemId);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === games.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(games.map((g: any) => g.id)));
    }
  };

  // 🔥 FUNCIÓN DE BORRADO: AHORA ELIMINA DEL LOCALSTORAGE 🔥
  const confirmDelete = async () => {
    if (itemsToRemove.length === 0) return;
    setIsRemoving(true);
    
    let freedSpace = 0;
    const successfullyProcessedIds = new Set<string>();

    for (const item of itemsToRemove) {
      try {
        if (item.id.startsWith('local|')) {
          // Es una partida local guardada en el navegador
          const parts = item.id.split('|');
          const key = parts[1]; // ej: save_slots_mario3
          const timestamp = parseInt(parts[2], 10);

          const existingData = localStorage.getItem(key);
          if (existingData) {
            const slots = JSON.parse(existingData);
            // Filtramos la partida exacta que el usuario quiere borrar (usando el timestamp único)
            const filteredSlots = slots.filter((slot: any) => slot.timestamp !== timestamp);
            
            // Si aún quedan partidas en ese juego, guardamos el resto. Si no, borramos la llave completa
            if (filteredSlots.length > 0) {
              localStorage.setItem(key, JSON.stringify(filteredSlots));
            } else {
              localStorage.removeItem(key);
            }
            
            freedSpace += item.size;
            successfullyProcessedIds.add(item.id);
          }
        } else {
          // Si por alguna razón es un registro de la nube (0.01 MB), solo lo quitamos visualmente
          freedSpace += item.size;
          successfullyProcessedIds.add(item.id);
        }
      } catch (e) { 
         console.error("Error inesperado borrando partida:", e); 
      }
    }

    setStorageItems((prev: any) => prev.filter((item: any) => !successfullyProcessedIds.has(item.id)));
    setStorageUsed((prev: any) => Math.max(0, prev - freedSpace));
    setSelectedIds(new Set());
    setIsRemoving(false);
    setItemsToRemove([]);
    toast({ title: "Datos limpiados", description: `Se liberó espacio en tu navegador. Los puntajes permanecen guardados en la nube.` });
  };

  return (
    <div className="space-y-6 animate-in fade-in relative">
      
      {/* SECCIÓN DE USO Y BARRA */}
      <div className="bg-card border border-border rounded p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="font-pixel text-[10px] text-muted-foreground uppercase flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-neon-cyan" /> Uso de Almacenamiento
          </h3>
          <div className="flex justify-between text-xs font-body mb-1">
            <span className="text-muted-foreground uppercase opacity-70">Ocupado</span>
            <span className="text-foreground font-bold">{safeStorageUsed.toFixed(2)} MB <span className="font-normal opacity-50">/ {safeMaxStorage >= 9999 ? "∞" : `${safeMaxStorage} MB`}</span></span>
          </div>
          <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div 
              className={cn("h-full transition-all duration-500", storagePercent > 85 ? "bg-destructive" : "bg-neon-cyan")} 
              style={{ width: `${storagePercent}%` }} 
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN DE RESUMEN (FOTOS Y AVATARES) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
         <div className="bg-muted/10 border border-border/50 rounded p-3 flex items-center gap-3">
            <div className="p-2 bg-neon-magenta/10 rounded">
               <FileText className="w-4 h-4 text-neon-magenta" />
            </div>
            <div>
               <p className="text-[9px] font-pixel text-muted-foreground uppercase">Fotos y Redes</p>
               <p className="text-sm font-bold font-body text-neon-magenta">{socialUsage.toFixed(2)} MB</p>
            </div>
         </div>
         <div className="bg-muted/10 border border-border/50 rounded p-3 flex items-center gap-3">
            <div className="p-2 bg-neon-yellow/10 rounded">
               <HardDrive className="w-4 h-4 text-neon-yellow" />
            </div>
            <div>
               <p className="text-[9px] font-pixel text-muted-foreground uppercase">Archivos de Sistema</p>
               <p className="text-sm font-bold font-body text-neon-yellow">{avatarUsage.toFixed(2)} MB</p>
            </div>
         </div>
      </div>
      
      {/* TABLA DE JUEGOS */}
      <div className="bg-card border border-border rounded p-4">
        <div className="flex flex-wrap items-center justify-between mb-4 border-b border-white/5 pb-2 gap-2">
          <h4 className="font-pixel text-[10px] text-neon-green uppercase flex items-center gap-2">
            <Gamepad2 className="w-4 h-4" /> Partidas Guardadas
          </h4>
          
          <div className="flex items-center gap-4">
            {selectedIds.size > 0 && (
              <button 
                onClick={() => setItemsToRemove(games.filter((g: any) => selectedIds.has(g.id)))}
                className="text-[9px] font-pixel text-destructive hover:text-destructive/80 uppercase flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Borrar ({selectedIds.size})
              </button>
            )}

            {games.length > 0 && (
              <button onClick={toggleSelectAll} className="text-[9px] font-body opacity-60 hover:opacity-100 uppercase tracking-tighter transition-opacity">
                {selectedIds.size === games.length ? "Desmarcar todo" : "Marcar todo"}
              </button>
            )}
          </div>
        </div>

        {games.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body text-center py-6 italic opacity-50">No tienes partidas guardadas en este dispositivo.</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[450px]">
              
              <div 
                className="grid gap-3 text-[9px] font-pixel text-muted-foreground opacity-40 pb-2 border-b border-white/5 uppercase items-center mb-2" 
                style={{ gridTemplateColumns: '20px 30px 1fr max-content max-content 30px' }}
              >
                <span className="text-center">Sel</span>
                <span></span>
                <span>Juego y Ranura</span>
                <span className="text-right">Último Guardado</span>
                <span className="text-right">Espacio</span>
                <span></span>
              </div>
              
              {games.map((item: any) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <div 
                    key={item.id} 
                    className={cn("grid gap-3 text-xs font-body py-2.5 border-b border-white/5 hover:bg-white/5 transition-colors items-center group", isSelected && "bg-neon-cyan/5")}
                    style={{ gridTemplateColumns: '20px 30px 1fr max-content max-content 30px' }}
                  >
                    
                    <div className="flex justify-center">
                      <Checkbox 
                        checked={isSelected} 
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="w-4 h-4 border-white/20"
                      />
                    </div>

                    <div className="flex items-center justify-center">
                      <Gamepad2 className="w-3.5 h-3.5 text-neon-green opacity-70" />
                    </div>

                    <span className="text-foreground font-medium truncate" title={item.name}>{item.name}</span>
                    
                    <span className="text-muted-foreground text-[10px] flex items-center justify-end gap-1 whitespace-nowrap shrink-0">
                      <Clock className="w-3 h-3 opacity-50" />
                      {item.created_at ? new Date(item.created_at).toLocaleString() : "---"}
                    </span>
                    
                    <span className="text-right text-muted-foreground text-[10px] font-mono whitespace-nowrap shrink-0 min-w-[50px]">
                      {item.size < 1 ? `${Math.round(item.size * 1024)} KB` : `${item.size.toFixed(2)} MB`}
                    </span>
                    
                    <div className="flex justify-center">
                      <button
                        onClick={() => setItemsToRemove([item])}
                        className="text-muted-foreground hover:text-destructive transition-all p-1 opacity-0 group-hover:opacity-100 shrink-0"
                        title="Borrar partida"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      {itemsToRemove.length > 0 && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setItemsToRemove([])}>
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-card border border-destructive/30 rounded-lg p-5 shadow-2xl animate-scale-in" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
              <h3 className="font-pixel text-[10px] text-destructive flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" /> BORRAR DATOS
              </h3>
              <X className="w-4 h-4 text-muted-foreground cursor-pointer" onClick={() => setItemsToRemove([])} />
            </div>

            <div className="py-2 text-center space-y-3">
              <p className="text-xs font-body text-muted-foreground leading-relaxed">
                ¿Confirmas la limpieza de los datos de guardado de 
                <strong className="text-foreground block mt-1">
                  {itemsToRemove.length === 1 ? `"${itemsToRemove[0].name}"` : `${itemsToRemove.length} juegos seleccionados`}
                </strong>
              </p>
              <p className="text-[9px] font-pixel text-destructive/70 uppercase leading-snug">
                ¡Atención! Tu progreso se borrará de este navegador, pero tus puntajes globales se mantendrán.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <Button variant="outline" onClick={() => setItemsToRemove([])} className="h-9 text-[10px] font-body">
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isRemoving} className="h-9 text-[10px] font-pixel shadow-lg shadow-destructive/20">
                {isRemoving ? "Borrando..." : "Sí, Limpiar"}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}