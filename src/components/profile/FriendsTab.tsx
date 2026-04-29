import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Trash2, Search, UserMinus, MessageSquare, ExternalLink, Shield, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import RoleBadge from "@/components/RoleBadge";
import { getAvatarBorderStyle, getNameStyle, getRoleStyle } from "@/lib/profileAppearance";
import { MEMBERSHIP_LIMITS, MembershipTier } from "@/lib/membershipLimits";

export default function FriendsTab({
  friends,
  setFriends,
}: {
  friends: any[];
  setFriends: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const { user, profile: currentUserProfile, roles: currentUserRoles, isAdmin, isMasterWeb } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Lógica de límites de amigos
  const isCurrentUserStaff = isMasterWeb || isAdmin || (currentUserRoles || []).includes("moderator");
  const currentUserTier = (currentUserProfile?.membership_tier?.toLowerCase() || 'novato') as MembershipTier;
  const currentUserLimits = isCurrentUserStaff ? MEMBERSHIP_LIMITS.staff : MEMBERSHIP_LIMITS[currentUserTier];
  const reachedFriendLimit = !isCurrentUserStaff && friends.length >= currentUserLimits.maxFriends;

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    if (reachedFriendLimit) {
      toast({
        title: "Límite de Membresía",
        description: `Has alcanzado el límite de ${currentUserLimits.maxFriends} amigos para tu plan. No puedes buscar más usuarios.`,
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          user_id,
          display_name,
          avatar_url,
          membership_tier,
          color_avatar_border,
          color_name,
          color_role,
          color_staff_role,
          user_roles (role)
        `)
        .ilike("display_name", `%${searchQuery}%`)
        .neq("user_id", user?.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: "No se pudo realizar la búsqueda",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (receiverId: string) => {
    if (!user) return;

    if (reachedFriendLimit) {
       toast({
         title: "Límite de Membresía",
         description: `Has alcanzado el límite de ${currentUserLimits.maxFriends} amigos.`,
         variant: "destructive",
       });
       return;
    }

    try {
      const { error } = await supabase
        .from("friend_requests")
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
        });

      if (error) {
        if (error.code === '23505') {
           toast({ title: "Aviso", description: "Ya existe una solicitud o amistad con este usuario." });
        } else {
           throw error;
        }
      } else {
        toast({
          title: "Éxito",
          description: "Solicitud de amistad enviada",
        });
        setSearchResults(prev => prev.filter(p => p.user_id !== receiverId));
      }
    } catch (error) {
      console.error("Error sending request:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud",
        variant: "destructive",
      });
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("friend_requests")
        .delete()
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`);

      if (error) throw error;

      setFriends((prev) => prev.filter((f) => f.friend.user_id !== friendId));
      toast({
        title: "Éxito",
        description: "Amigo eliminado",
      });
    } catch (error) {
      console.error("Error removing friend:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar al amigo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* SECCIÓN DE BÚSQUEDA */}
      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-neon-cyan mb-3 uppercase flex items-center justify-between">
          <span>Buscar Usuarios</span>
          {!isCurrentUserStaff && (
             <span className={cn(
               "text-[9px] px-2 py-0.5 rounded",
               reachedFriendLimit ? "bg-destructive/20 text-destructive" : "bg-muted text-muted-foreground"
             )}>
               Amigos: {friends.length} / {currentUserLimits.maxFriends}
             </span>
          )}
        </h3>
        
        <div className="flex gap-2">
          <Input
            placeholder={reachedFriendLimit ? "Límite de amigos alcanzado..." : "Buscar por nombre..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="h-8 text-xs font-body"
            disabled={reachedFriendLimit}
          />
          <Button 
             size="sm" 
             onClick={handleSearch} 
             disabled={isSearching || reachedFriendLimit} 
             className="h-8"
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {searchResults.length > 0 && !reachedFriendLimit && (
          <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {searchResults.map((result) => {
              const roles = result.user_roles?.map((r: any) => r.role) || [];
              const isStaff = roles.includes('master_web') || roles.includes('admin') || roles.includes('moderator');
              
              return (
                <div key={result.user_id} className="flex items-center justify-between p-2 border border-border/50 rounded bg-muted/10 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border/50 overflow-hidden shrink-0" style={getAvatarBorderStyle(result.color_avatar_border)}>
                      {result.avatar_url ? <img src={result.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div>
                      <Link to={`/usuario/${result.user_id}`} className="text-xs font-bold font-body hover:underline hover:text-neon-cyan transition-colors line-clamp-1" style={getNameStyle(result.color_name)}>
                        {result.display_name}
                      </Link>
                      <div className="flex items-center gap-1 mt-0.5">
                        {isStaff ? (
                           <span className="text-[8px] font-pixel text-neon-magenta flex items-center gap-1" style={getRoleStyle(result.color_staff_role)}><Shield className="w-2.5 h-2.5" /> STAFF</span>
                        ) : (
                           <span className="text-[8px] font-pixel text-neon-yellow flex items-center gap-1" style={getRoleStyle(result.color_role)}><Star className="w-2.5 h-2.5" /> {result.membership_tier?.toUpperCase() || 'NOVATO'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => sendFriendRequest(result.user_id)} className="h-6 text-[9px] px-2 font-pixel">
                    Añadir
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SECCIÓN DE AMIGOS (CUADRÍCULA RESPONSIVA) */}
      <div className="bg-card border border-border rounded p-4">
        <h3 className="font-pixel text-[10px] text-neon-green mb-4 uppercase">Mis Amigos ({friends.length})</h3>
        
        {friends.length === 0 ? (
          <p className="text-xs text-muted-foreground font-body text-center py-8 italic">Aún no has añadido amigos a tu lista.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {friends.map((friendObj) => {
              const friend = friendObj.friend;
              const roles = friend.user_roles?.map((r: any) => r.role) || [];
              const isStaff = roles.includes('master_web') || roles.includes('admin') || roles.includes('moderator');
              
              return (
                <div key={friend.user_id} className="flex flex-col bg-muted/10 border border-border/50 rounded-lg overflow-hidden hover:bg-muted/30 hover:border-neon-cyan/50 transition-all group">
                  
                  {/* Avatar y Nombre (Clickeables hacia el perfil) */}
                  <div 
                    className="p-3 flex flex-col items-center justify-center text-center cursor-pointer relative"
                    onClick={() => navigate(`/usuario/${friend.user_id}`)}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center border-2 border-border/50 mb-3 overflow-hidden shadow-sm group-hover:shadow-neon-cyan/20 transition-all group-hover:scale-105" style={getAvatarBorderStyle(friend.color_avatar_border)}>
                      {friend.avatar_url ? <img src={friend.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-muted-foreground" />}
                    </div>
                    
                    <h4 className="text-xs font-bold font-body line-clamp-1 w-full px-1 mb-1 group-hover:text-neon-cyan transition-colors" style={getNameStyle(friend.color_name)}>
                      {friend.display_name}
                    </h4>
                    
                    <div className="flex justify-center items-center h-4">
                      {isStaff ? (
                         <span className="text-[8px] font-pixel text-neon-magenta flex items-center gap-1" style={getRoleStyle(friend.color_staff_role)}><Shield className="w-2.5 h-2.5" /> STAFF</span>
                      ) : (
                         <span className="text-[8px] font-pixel text-neon-yellow flex items-center gap-1" style={getRoleStyle(friend.color_role)}><Star className="w-2.5 h-2.5" /> {friend.membership_tier?.toUpperCase() || 'NOVATO'}</span>
                      )}
                    </div>
                  </div>

                  {/* Botones de Acción Rápida */}
                  <div className="grid grid-cols-3 border-t border-border/50 bg-black/20 mt-auto">
                     <button 
                       onClick={(e) => { e.stopPropagation(); navigate(`/mensajes?to=${friend.user_id}`); }}
                       className="p-2 flex items-center justify-center text-muted-foreground hover:text-neon-cyan hover:bg-neon-cyan/10 transition-colors border-r border-border/50"
                       title="Enviar Mensaje"
                     >
                        <MessageSquare className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); navigate(`/usuario/${friend.user_id}`); }}
                       className="p-2 flex items-center justify-center text-muted-foreground hover:text-neon-green hover:bg-neon-green/10 transition-colors border-r border-border/50"
                       title="Ver Perfil"
                     >
                        <ExternalLink className="w-4 h-4" />
                     </button>
                     <button 
                       onClick={(e) => { e.stopPropagation(); removeFriend(friend.user_id); }}
                       className="p-2 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                       title="Eliminar Amigo"
                     >
                        <UserMinus className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}