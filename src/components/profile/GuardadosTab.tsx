import React from "react";

export default function GuardadosTab() {
  return (
    <div className="bg-card border border-border rounded p-4 animate-in fade-in">
      <h3 className="font-pixel text-[10px] text-neon-cyan uppercase mb-3 text-center md:text-left">
        Mis Guardados
      </h3>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        <div className="aspect-square bg-muted/30 flex items-center justify-center rounded border border-border/20">
           <span className="text-[9px] text-muted-foreground font-body uppercase text-center px-2">Próximamente</span>
        </div>
        <div className="aspect-square bg-muted/30 flex items-center justify-center rounded border border-border/20"></div>
        <div className="aspect-square bg-muted/30 flex items-center justify-center rounded border border-border/20"></div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-6 font-body opacity-60">
         Aquí aparecerán todas tus publicaciones, imágenes y archivos guardados en formato de muro.
      </p>
    </div>
  );
}