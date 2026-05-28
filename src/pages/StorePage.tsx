import { useState, useEffect } from "react";
import { ShoppingBag, Sparkles, Lock, Check, Package, Zap, Crown, Ticket, Palette, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ALL_SKINS } from "@/lib/skinThemes";

interface ShopItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  price_type: 'stats' | 'fcoins';
  image_url: string;
  category: 'launcher_skin' | 'agario_skin' | 'game_chest' | 'cosmetic';
  tier_requirement: string;
  is_active: boolean;
  tradeable: boolean;
}

const TIER_ORDER = ['novato', 'lite', 'legacy', 'creator', 'staff'];

export default function StorePage() {
  const { user, profile, refreshProfile } = useAuth(); // Limpiado duplicado
  const { toast } = useToast();
  
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | string>('all');
  const [userInventory, setUserInventory] = useState<any[]>([]);

  const userTier = profile?.membership_tier?.toLowerCase() || 'novato';
  const userStats = profile?.total_score || 0;
  
  // Obtener F-COINS del usuario
  const [userFCoins, setUserFCoins] = useState(0);
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Obtener items de la tienda
        const { data: items, error: itemsError } = await (supabase as any)
          .from('shop_items')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (!itemsError && items) {
          setShopItems(items);
        }

        // Obtener inventario del usuario
        const { data: inventory, error: invError } = await (supabase as any)
          .from('user_inventory')
          .select('*')
          .eq('user_id', user.id);

        if (!invError && inventory) {
          setUserInventory(inventory);
        }

        // Obtener F-COINS del usuario
        const { data: wallet, error: walletError } = await (supabase as any)
          .from('point_wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();

        if (!walletError && wallet) {
          setUserFCoins(wallet.balance || 0);
        }
      } catch (err) {
        console.error('Error fetching shop data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const canBuyItem = (item: ShopItem): boolean => {
    // Staff puede comprar todo
    if (userTier === 'staff') return true;

    // Verificar si tiene suficientes monedas/puntos
    const hasEnoughCurrency = item.price_type === 'stats' 
      ? userStats >= item.price 
      : userFCoins >= item.price;

    if (!hasEnoughCurrency) return false;

    // Verificar requisito de tier
    const tierIndex = TIER_ORDER.indexOf(userTier);
    const requiredTierIndex = TIER_ORDER.indexOf(item.tier_requirement);
    
    if (tierIndex < requiredTierIndex) return false;

    // Verificar permisos específicos por tier
    if (userTier === 'novato') {
      // Novatos solo pueden comprar recolors (stats)
      return item.price_type === 'stats' && item.category === 'cosmetic';
    }

    if (userTier === 'lite') {
      // Lites no pueden comprar launcher skins
      return item.category !== 'launcher_skin';
    }

    return true;
  };

  // Funciones para categorizar items
  const isBoosterItem = (item: ShopItem) => item?.slug === "points_x3_week";
  const isEventTicketItem = (item: ShopItem) => String(item?.slug || "").startsWith("event_ticket:");
  const isMembershipItem = (item: ShopItem) => String(item?.slug || "").startsWith("membership:");
  const isSkinItem = (item: ShopItem) => item?.slug && (ALL_SKINS as any)[item.slug];

  // Renderizador de icono de item
  const ItemIcon = ({ item, className }: { item: ShopItem; className?: string }) => (
    isMembershipItem(item)
      ? <Crown className={className} />
      : isEventTicketItem(item)
      ? <Ticket className={className} />
      : isBoosterItem(item)
        ? <Sparkles className={className} />
        : isSkinItem(item)
          ? <Palette className={className} />
          : <Archive className={className} />
  );

  const handleBuyItem = async (item: ShopItem) => {
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión", variant: "destructive" });
      return;
    }

    const isOwned = userInventory.some(inv => inv.item_slug === item.slug);
    if (isOwned) {
      toast({ 
        title: "Aviso", 
        description: "Ya posees este item en tu inventario." 
      });
      return;
    }

    if (!canBuyItem(item)) {
      toast({ 
        title: "No puedes comprar esto",
        description: `Tu tier ${userTier.toUpperCase()} no tiene acceso a este item`,
        variant: "destructive"
      });
      return;
    }

    try {
      // PRIMERO: Agregar a inventario usando la función RPC
      const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('buy_shop_item', {
        p_user_id: user.id,
        p_item_slug: item.slug,
        p_item_name: item.name,
        p_category: item.category,
      });

      if (rpcError || !rpcResult?.success) {
        console.error('Error al insertar en inventario:', rpcError);
        throw new Error(`No se pudo agregar el item al inventario: ${rpcError?.message || rpcResult?.error || 'Error desconocido'}`);
      }

      // SEGUNDO: Restar monedas/puntos SOLO si la inserción fue exitosa
      const newBalance = (item.price_type === 'stats' ? userStats : userFCoins) - item.price;
      
      if (item.price_type === 'stats') {
        const { error: statsError } = await supabase
          .from('profiles')
          .update({ total_score: newBalance } as any)
          .eq('user_id', user.id);
        
        if (statsError) {
          throw new Error(`No se pudo restar los puntos: ${statsError.message || 'Error desconocido'}`);
        }
        
        await refreshProfile();
      } else {
        const { error: coinsError } = await (supabase as any)
          .from('point_wallets')
          .update({ balance: newBalance })
          .eq('user_id', user.id);
        
        if (coinsError) {
          throw new Error(`No se pudo restar los F-coins: ${coinsError.message || 'Error desconocido'}`);
        }
        
        setUserFCoins(newBalance);
      }

      toast({
        title: "¡Compra exitosa!",
        description: `Obtuviste: ${item.name}`,
        variant: "default"
      });

      // Recargar datos
      window.location.reload();
    } catch (err: any) {
      console.error('Error buying item:', err);
      toast({ 
        title: "Error en la compra",
        description: err.message || "No se pudo completar la compra",
        variant: "destructive"
      });
    }
  };

  const categoryLabels: Record<string, string> = {
    all: '🎯 Todos',
    launcher_skin: '🎨 Skins Launcher',
    agario_skin: '🟢 Skins Agario',
    game_chest: '📦 Cofres de Juegos',
    cosmetic: '✨ Cosméticos',
  };

  const categories = ['all', 'launcher_skin', 'agario_skin', 'game_chest', 'cosmetic'];

  const filteredItems = selectedCategory === 'all' 
    ? shopItems 
    : shopItems.filter(item => item.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Sparkles className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="w-8 h-8 text-neon-cyan" />
            <h1 className="font-pixel text-3xl text-neon-cyan">TIENDA</h1>
          </div>
          <p className="text-muted-foreground">Compra skins, cofres y cosméticos con STATS o F-COINS</p>
        </div>

        {/* User Balance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-card border border-neon-green/50 rounded p-3">
            <p className="text-xs text-muted-foreground">STATS</p>
            <p className="font-pixel text-neon-green text-lg">{userStats.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-neon-cyan/50 rounded p-3">
            <p className="text-xs text-muted-foreground">F-COINS</p>
            <p className="font-pixel text-neon-cyan text-lg">{userFCoins.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-neon-yellow/50 rounded p-3">
            <p className="text-xs text-muted-foreground">TIER</p>
            <p className="font-pixel text-neon-yellow text-lg">{userTier.toUpperCase()}</p>
          </div>
          <div className="bg-card border border-border rounded p-3">
            <p className="text-xs text-muted-foreground">INVENTARIO</p>
            <p className="font-pixel text-foreground text-lg">{userInventory.length}</p>
          </div>
        </div>

        {/* Categorías */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded text-sm whitespace-nowrap transition-all font-pixel",
                selectedCategory === cat
                  ? "bg-neon-cyan text-background"
                  : "bg-card border border-border hover:border-neon-cyan/50"
              )}
            >
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const canBuy = canBuyItem(item);
            const isOwned = userInventory.some(inv => inv.item_slug === item.slug);

            return (
              <div
                key={item.id}
                className={cn(
                  "bg-card border rounded-lg overflow-hidden hover:border-neon-cyan/50 transition-all",
                  canBuy ? "border-border" : "border-border/30 opacity-60"
                )}
              >
                {/* Miniatura con icono */}
                <div className={cn(
                  "aspect-video bg-gradient-to-br from-[#3b2d21] to-[#1b140f] overflow-hidden relative group/img flex items-center justify-center border-b border-border",
                  isMembershipItem(item) && "from-[#4a235e] to-[#2a1d3e]",
                  isEventTicketItem(item) && "from-[#14354a] to-[#0a1f2e]",
                  isSkinItem(item) && "from-[#0a2e2e] to-[#051818]",
                )}>
                  {/* Imagen de fondo si existe */}
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110 opacity-40"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  
                  {/* Icono del item como miniatura principal */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={cn(
                      "relative grid h-14 w-14 place-items-center rounded-sm border shadow-[inset_2px_2px_0_rgba(255,255,255,0.18),inset_-2px_-2px_0_rgba(0,0,0,0.45)]",
                      isMembershipItem(item)
                        ? "border-neon-magenta/70 bg-[#4a235e]"
                        : isEventTicketItem(item)
                          ? "border-neon-cyan/70 bg-[#14354a]"
                          : isSkinItem(item)
                            ? "border-neon-cyan/70 bg-[#0a2e2e]"
                          : "border-[#f7d28b]/70 bg-[#6b4a1f]",
                    )}>
                      <ItemIcon
                        item={item}
                        className={cn(
                          "relative h-8 w-8 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]",
                          isMembershipItem(item) ? "text-neon-magenta" : isEventTicketItem(item) ? "text-neon-cyan" : "text-neon-yellow",
                        )}
                      />
                    </div>
                  </div>
                  
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none" />
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-pixel text-sm text-foreground flex-1">{item.name}</h3>
                    {item.tier_requirement !== 'novato' && (
                      <span className="text-xs bg-neon-yellow/20 text-neon-yellow px-2 py-0.5 rounded">
                        {item.tier_requirement.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  )}

                  {/* Precio */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <div className={cn(
                      "flex items-center gap-1",
                      item.price_type === 'stats' ? "text-neon-green" : "text-neon-cyan"
                    )}>
                      {item.price_type === 'stats' ? <Zap className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                      <span className="font-pixel text-sm">{item.price.toLocaleString()}</span>
                    </div>

                    {isOwned && (
                      <div className="ml-auto flex items-center gap-1 text-neon-green text-xs">
                        <Check className="w-3 h-3" />
                        Poseído
                      </div>
                    )}
                  </div>

                  {/* Botón */}
                  <Button
                    onClick={() => handleBuyItem(item)}
                    disabled={!canBuy || isOwned}
                    className="w-full h-7 text-xs font-pixel mt-2"
                    variant={canBuy ? "default" : "outline"}
                  >
                    {isOwned ? (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        POSEÍDO
                      </>
                    ) : !canBuy ? (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        BLOQUEADO
                      </>
                    ) : (
                      "COMPRAR"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay items disponibles en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
}
