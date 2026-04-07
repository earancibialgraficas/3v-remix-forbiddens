import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const emojiOptions = [
  "⭐", "🔥", "💎", "👑", "🎮", "🏆", "⚡", "🎯", "🌟", "💫",
  "🦾", "🎪", "🛡️", "⚔️", "🎲", "🕹️", "🏅", "🎖️", "💀", "🐉",
  "🦅", "🦊", "🐺", "🦁", "🦈", "🔮", "💠", "🌀", "✨", "🎵",
];

interface RoleIconSelectorProps {
  currentIcon: string;
  onSelect: (icon: string) => void;
  onClose: () => void;
}

export default function RoleIconSelector({ currentIcon, onSelect, onClose }: RoleIconSelectorProps) {
  return (
    <div className="fixed inset-0 z-[350] flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg p-4 max-w-xs w-full mx-4 animate-scale-in">
        <button onClick={onClose} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        <h3 className="font-pixel text-[10px] text-neon-yellow mb-3">SELECCIONAR ICONO DE ROL</h3>
        <div className="grid grid-cols-6 gap-2">
          {emojiOptions.map(emoji => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); onClose(); }}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center text-lg hover:bg-muted/50 transition-all border",
                currentIcon === emoji ? "border-neon-green bg-neon-green/10" : "border-transparent"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
