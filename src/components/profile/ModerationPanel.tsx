import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Ban, Unlock, Shield, Search, Star, UserCheck } from "lucide-react";

export default function ModerationPanel({ isStaff, isMasterWeb }: { isStaff: boolean; isMasterWeb: boolean }) {
  const { toast } = useToast();
  
  // Estados para Búsqueda y Resultados
  const [searchTerm, setSearchTerm] = useState("");
  const [foundUser, setFoundUser] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Estados para Acciones
  const [banReason, setBanReason] = useState("");
  const [selectedTier, setSelectedTier] = useState("novato");
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [expandedBanned, setExpandedBanned] = useState(false);

  // 🔥 FUNCIÓN DE BÚSQUEDA MAESTRA (Nombre o Email) 🔥
  const handleSearchUser = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setFoundUser(null);

    try {
      // Usamos la función segura que creamos en el Paso 1
      const { data, error } = await supabase.rpc("get_user_by_identifier", { 
        search_text: searchTerm.trim() 
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const u = data[0];
        // Verificamos si es STAFF
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user_id);
        const isUserStaff = roles?.some(r => ['master_web', 'admin', 'moderator'].includes(r.role));
        
        setFoundUser({ ...u, isStaff: isUserStaff });
        setSelectedTier(u.membership_tier || "novato");
      } else {
        toast({ title: "No encontrado", description: "No se halló al usuario por nombre ni por correo.", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error en búsqueda", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  // --- LÓGICA DE ACCIONES ---
  const handleBan = async () => {
    if (!foundUser || !banReason.trim()) return;
    const { error } = await supabase.from("banned_users").insert({ 
      id: crypto.randomUUID(), user_id: foundUser.user_id, reason: banReason, ban_type: 'ban' 
    } as any);
    if (!error) { toast({ title: "Usuario baneado" }); setBanReason(""); setFoundUser(null); }
  };

  const handleUpdateMembership = async () => {
    if (!foundUser || foundUser.isStaff) return;
    const { error } = await supabase.from("profiles").update({ membership_tier: selectedTier } as any).eq("user_id", foundUser.user_id);
    if (!error) { toast({ title: "Membresía actualizada" }); handleSearchUser(); }
  };

  const handleAssignRole = async (role: "moderator" | "admin") => {
    if (!foundUser) return;
    const { error } = await supabase.from("user_roles").insert({ id: crypto.randomUUID(), user_id: foundUser.user_id, role } as any);
    if (!error) { toast({ title: `Rol de ${role} asignado` }); handleSearchUser(); }
    else { toast({ title: "Error", description: "Ya posee este rol o hubo un fallo.", variant: "destructive" }); }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* 🔍 BUSCADOR PRINCIPAL */}
      <div className="bg-card border border-neon-cyan/50 rounded-lg p-5 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
        <h3 className="font-pixel text-[11px] text-neon-cyan uppercase mb-4 flex items-center gap-2">
          <Search className="w-4 h-4" /> Buscador de Usuarios
        </h3>
        <div className="flex gap-2">
          <Input 
            placeholder="Nombre de usuario o Correo registrado..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
            className="h-10 bg-muted/50 font-body text-sm"
          />
          <Button 
            onClick={handleSearchUser} 
            disabled={isSearching} 
            className="bg-neon-cyan text-black hover:bg-neon-cyan/80 font-pixel text-[10px] px-6"
          >
            {isSearching ? "..." : "BUSCAR"}
          </Button>
        </div>

        {/* 👤 FICHA DEL USUARIO ENCONTRADO */}
        {foundUser && (
          <div className="mt-5 bg-black/40 border border-white/10 rounded-xl p-4 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-3">
              <div>
                <p className="text-lg font-bold font-body text-foreground flex items-center gap-2">
                  {foundUser.display_name} 
                  {foundUser.isStaff && <Shield className="w-4 h-4 text-neon-magenta animate-pulse" />}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-[10px] font-pixel px-2 py-0.5 rounded",
                    foundUser.isStaff ? "bg-neon-magenta/20 text-neon-magenta" : "bg-neon-yellow/20 text-neon-yellow"
                  )}>
                    {foundUser.isStaff ? "RANGO: STAFF" : `PLAN: ${foundUser.membership_tier.toUpperCase()}`}
                  </span>
                </div>
              </div>
              <UserCheck className="w-6 h-6 text-neon-green opacity-50" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* ACCIÓN: BANEO */}
              <div className="space-y-2 border-r border-white/5 pr-4">
                <p className="text-[9px] font-pixel text-destructive uppercase">Sancionar</p>
                <Input 
                  placeholder="Razón del baneo..." 
                  value={banReason} 
                  onChange={e => setBanReason(e.target.value)}
                  className="h-7 text-[11px] bg-muted"
                />
                <Button variant="destructive" onClick={handleBan} size="sm" className="w-full h-8 text-[10px] font-pixel">
                  EJECUTAR BANEO
                </Button>
              </div>

              {/* ACCIÓN: MEMBRESÍA */}
              <div className="space-y-2 border-r border-white/5 px-4">
                <p className="text-[9px] font-pixel text-neon-yellow uppercase">Gestionar Plan</p>
                {foundUser.isStaff ? (
                  <div className="h-16 flex items-center justify-center bg-muted/20 rounded border border-white/5">
                    <p className="text-[9px] font-body text-muted-foreground italic text-center px-2">
                      Inmune: No puedes cambiar el plan de un STAFF.
                    </p>
                  </div>
                ) : (
                  <>
                    <select 
                      value={selectedTier} 
                      onChange={e => setSelectedTier(e.target.value)}
                      className="w-full h-8 bg-muted border border-border rounded text-[10px] uppercase font-body"
                    >
                      {["novato", "entusiasta", "coleccionista", "leyenda arcade", "miembro del legado", "creador de contenido"].map(t => (
                        <option key={t} value={t}>{t.toUpperCase()}</option>
                      ))}
                    </select>
                    <Button onClick={handleUpdateMembership} size="sm" className="w-full h-8 text-[10px] font-pixel bg-neon-yellow text-black hover:bg-neon-yellow/80">
                      ACTUALIZAR PLAN
                    </Button>
                  </>
                )}
              </div>

              {/* ACCIÓN: ROLES (Solo MasterWeb) */}
              <div className="space-y-2 pl-4">
                <p className="text-[9px] font-pixel text-neon-magenta uppercase">Jerarquía</p>
                {isMasterWeb ? (
                  <div className="flex flex-col gap-1.5">
                    <Button variant="outline" onClick={() => handleAssignRole("moderator")} className="h-7 text-[9px] font-pixel border-neon-magenta/40 text-neon-magenta hover:bg-neon-magenta/10">PROMOCIONAR A MOD</Button>
                    <Button variant="outline" onClick={() => handleAssignRole("admin")} className="h-7 text-[9px] font-pixel border-neon-magenta text-neon-magenta hover:bg-neon-magenta/20">PROMOCIONAR A ADMIN</Button>
                  </div>
                ) : (
                  <p className="text-[9px] text-muted-foreground italic py-4">Requiere nivel Maestro Web.</p>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* --- EL RESTO DEL PANEL SE MANTIENE IGUAL (Sancionados y Contenido Baneado) --- */}
      <div className="bg-card border border-destructive/30 rounded p-4">
        <button onClick={() => setExpandedBanned(!expandedBanned)} className="w-full flex justify-between font-pixel text-[10px] text-destructive uppercase items-center">
          <span>Historial de Sanciones ({expandedBanned ? bannedUsers.length : "?"})</span>
          <span className="text-xs">{expandedBanned ? "▲" : "▼"}</span>
        </button>
        {expandedBanned && (
           <p className="text-center py-4 text-[10px] text-muted-foreground italic uppercase">Usa el buscador arriba para gestionar usuarios específicos</p>
        )}
      </div>
    </div>
  );
}