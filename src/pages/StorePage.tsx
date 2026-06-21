import { useState, useEffect } from "react";
import { ShoppingBag, Sparkles, Lock, Check, Coins, Trophy, Crown, Ticket, Palette, Archive, Flame, Bomb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveStatBoost } from "@/hooks/useActiveStatBoost";
import { useToast } from "@/hooks/use-toast";
import { ALL_SKINS, getSkinThumbnailUrl } from "@/lib/skinThemes";
import { AVATAR_FRAME_SHOP_ITEMS, getAvatarFrame, isAvatarFrameSlug } from "@/lib/avatarFrames";
import { PROFILE_TRANSITION_SHOP_ITEMS, getProfileTransition, isProfileTransitionSlug } from "@/lib/profileTransitions";
import { EMULATOR_SHELL_SHOP_ITEMS, getEmulatorShell, isEmulatorShellSlug } from "@/lib/emulatorShells";
import { VaritaMagicaIcon } from "@/components/icons/VaritaMagicaIcon";

interface ShopItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  price_type: 'stats' | 'fcoins';
  image_url: string;
  category: 'launcher_skin' | 'agario_skin' | 'game_chest' | 'cosmetic' | string;
  tier_requirement: string;
  is_active: boolean;
  tradeable: boolean;
}

const TIER_ORDER = ['novato', 'lite', 'legacy', 'creator', 'staff'];
const shopVisuals = {
  demoniaco: {
    frame: "border-red-500/70 bg-[#160605]",
    icon: "text-red-300",
    badge: "DEMON",
    background:
      "linear-gradient(rgba(10,4,4,.18),rgba(2,2,2,.32)), url('/skins/demoniaco/home/banner-hero.png') center / cover",
  },
  mercenario_bocasas: {
    frame: "border-red-500/70 bg-[#140706]",
    icon: "text-red-200",
    badge: "MERC",
    background:
      "linear-gradient(rgba(8,4,4,.16),rgba(2,2,2,.34)), url('/skins/mercenario_bocasas/home/banner-hero.png') center / cover",
  },
  angelical: {
    frame: "border-pink-300/80 bg-[#fff0f7]",
    icon: "text-pink-700",
    badge: "PASTEL",
    background:
      "radial-gradient(circle at 30% 25%, rgba(255,255,255,.7), transparent 28%), linear-gradient(135deg, #fffafd, #ffd7e9 52%, #f3a4c7)",
  },
  mi_melodia_rosa: {
    frame: "border-pink-300/80 bg-[#fff0f8]",
    icon: "text-pink-700",
    badge: "MELODY",
    background:
      "linear-gradient(rgba(255,245,251,.2),rgba(255,222,238,.28)), url('/skins/mi_melodia_rosa/home/banner-hero.png') center / cover",
  },
  cyberpunk: {
    frame: "border-cyan-300/70 bg-[#061d2a]",
    icon: "text-cyan-200",
    badge: "NEON",
    background:
      "linear-gradient(135deg, rgba(0,255,255,.18), transparent 35%), repeating-linear-gradient(90deg, rgba(0,255,255,.18) 0 1px, transparent 1px 14px), linear-gradient(135deg, #061d2a, #210a35)",
  },
  points_x3_week: {
    frame: "border-yellow-300/70 bg-[#3d2508]",
    icon: "text-yellow-200",
    badge: "x3",
    background:
      "radial-gradient(circle at 50% 42%, rgba(250,204,21,.42), transparent 28%), linear-gradient(135deg, #3d2508, #11100a)",
  },
  game_chest: {
    frame: "border-amber-300/70 bg-[#2f1d0d]",
    icon: "text-amber-200",
    badge: "BOX",
    background:
      "linear-gradient(135deg, rgba(245,158,11,.28), transparent 38%), repeating-linear-gradient(45deg, rgba(255,255,255,.08) 0 1px, transparent 1px 10px), linear-gradient(135deg, #2f1d0d, #0d0906)",
  },
  cosmetic: {
    frame: "border-fuchsia-300/70 bg-[#321437]",
    icon: "text-fuchsia-200",
    badge: "FX",
    background:
      "radial-gradient(circle at 70% 25%, rgba(217,70,239,.35), transparent 28%), linear-gradient(135deg, #321437, #111018)",
  },
  avatar_frame: {
    frame: "border-pink-300/80 bg-[#3a1730]",
    icon: "text-pink-100",
    badge: "FRAME",
    background:
      "radial-gradient(circle at 50% 42%, rgba(255,182,217,.34), transparent 34%), linear-gradient(135deg, #3a1730, #170712)",
  },
  profile_transition: {
    frame: "border-orange-400/70 bg-[#2b1006]",
    icon: "text-orange-200",
    badge: "INTRO",
    background:
      "radial-gradient(circle at center, rgba(255,84,18,.28), rgba(8,4,2,.92)), linear-gradient(135deg, #2b1006, #090403)",
  },
  emulator_shell: {
    frame: "border-pink-300/80 bg-pink-100",
    icon: "text-pink-800",
    badge: "NES",
    background:
      "radial-gradient(circle at 50% 42%, rgba(255,255,255,.46), transparent 34%), linear-gradient(135deg, #ffd6ef, #ff86cc 54%, #c93d8a)",
  },
  varita_magica: {
    frame: "border-pink-300/80 bg-pink-100",
    icon: "text-pink-700",
    badge: "MAGIC",
    background:
      "radial-gradient(circle at 50% 42%, rgba(255,182,217,.55), transparent 34%), linear-gradient(135deg, #ffe4f1, #7f1748)",
  },
  boomshacka: {
    frame: "border-red-300/80 bg-[#250805]",
    icon: "text-red-200",
    badge: "BOOM",
    background:
      "radial-gradient(circle at 50% 42%, rgba(248,113,113,.46), transparent 34%), linear-gradient(135deg, #3a0905, #080302)",
  },
  boomshacka_v2: {
    frame: "border-red-300/80 bg-[#250805]",
    icon: "text-red-200",
    badge: "BOOM v2",
    background:
      "radial-gradient(circle at 50% 42%, rgba(248,113,113,.5), transparent 34%), linear-gradient(135deg, #4a0a05, #080302)",
  },
  dragon_fuego: {
    frame: "border-orange-300/80 bg-[#200600]",
    icon: "text-orange-100",
    badge: "DRAGON",
    background:
      "radial-gradient(circle at 50% 42%, rgba(255,166,35,.5), transparent 35%), linear-gradient(135deg, #481000, #070201)",
  },
  ticket: {
    frame: "border-sky-300/70 bg-[#102b3a]",
    icon: "text-sky-200",
    badge: "PASS",
    background:
      "linear-gradient(135deg, rgba(56,189,248,.35), transparent 35%), repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0 1px, transparent 1px 8px), linear-gradient(135deg, #102b3a, #080d12)",
  },
  membership: {
    frame: "border-purple-300/70 bg-[#2f1742]",
    icon: "text-purple-200",
    badge: "VIP",
    background:
      "radial-gradient(circle at 50% 20%, rgba(216,180,254,.34), transparent 30%), linear-gradient(135deg, #2f1742, #120919)",
  },
  fallback: {
    frame: "border-[#f7d28b]/70 bg-[#342412]",
    icon: "text-[#f7d28b]",
    badge: "ITEM",
    background:
      "linear-gradient(135deg, rgba(247,210,139,.2), transparent 36%), linear-gradient(135deg, #342412, #0d0906)",
  },
};

export default function StorePage() {
  const { user, profile, refreshProfile } = useAuth(); // Limpiado duplicado
  const activeStatBoost = useActiveStatBoost(user?.id);
  const { toast } = useToast();
  
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<'all' | string>('all');
  const [userInventory, setUserInventory] = useState<any[]>([]);
  const [purchaseNotice, setPurchaseNotice] = useState<{ name: string } | null>(null);

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
          const mergedItems = [...items];
          AVATAR_FRAME_SHOP_ITEMS.forEach((frameItem) => {
            if (!mergedItems.some((item: ShopItem) => item.slug === frameItem.slug)) {
              mergedItems.push(frameItem as ShopItem);
            }
          });
          PROFILE_TRANSITION_SHOP_ITEMS.forEach((transitionItem) => {
            if (!mergedItems.some((item: ShopItem) => item.slug === transitionItem.slug)) {
              mergedItems.push(transitionItem as ShopItem);
            }
          });
          EMULATOR_SHELL_SHOP_ITEMS.forEach((shellItem) => {
            if (!mergedItems.some((item: ShopItem) => item.slug === shellItem.slug)) {
              mergedItems.push(shellItem as ShopItem);
            }
          });
          setShopItems(mergedItems);
        } else {
          setShopItems([...AVATAR_FRAME_SHOP_ITEMS, ...PROFILE_TRANSITION_SHOP_ITEMS, ...EMULATOR_SHELL_SHOP_ITEMS] as ShopItem[]);
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
      return isProfileTransitionSlug(item.slug) || (item.price_type === 'stats' && item.category === 'cosmetic');
    }

    if (userTier === 'lite') {
      // Lites no pueden comprar launcher skins
      return item.category !== 'launcher_skin';
    }

    return true;
  };

  const getPurchaseBlockReason = (item: ShopItem): { title: string; description: string } | null => {
    if (userTier === 'staff') return null;

    if (item.price_type === 'stats' && userStats < item.price) {
      return {
        title: "Saldo insuficiente",
        description: `Necesitas ${item.price.toLocaleString()} STATS y tienes ${userStats.toLocaleString()}.`,
      };
    }

    if (item.price_type === 'fcoins' && userFCoins < item.price) {
      return {
        title: "Saldo insuficiente",
        description: `Necesitas ${item.price.toLocaleString()} F-COINS y tienes ${userFCoins.toLocaleString()}.`,
      };
    }

    const tierIndex = TIER_ORDER.indexOf(userTier);
    const requiredTierIndex = TIER_ORDER.indexOf(item.tier_requirement);

    if (tierIndex < requiredTierIndex) {
      return {
        title: "No puedes comprar esto",
        description: `Tu tier ${userTier.toUpperCase()} no tiene acceso a este item.`,
      };
    }

    if (userTier === 'novato') {
      const allowed = isProfileTransitionSlug(item.slug) || (item.price_type === 'stats' && item.category === 'cosmetic');
      if (!allowed) {
        return {
          title: "No puedes comprar esto",
          description: "Los usuarios NOVATO solo pueden comprar cosmeticos con STATS y transiciones de perfil.",
        };
      }
    }

    if (userTier === 'lite' && item.category === 'launcher_skin') {
      return {
        title: "No puedes comprar esto",
        description: "Los usuarios LITE no pueden comprar skins del launcher.",
      };
    }

    return null;
  };

  // Funciones para categorizar items
  const isBoosterItem = (item: ShopItem) => item?.slug === "points_x3_week";
  const isEventTicketItem = (item: ShopItem) => String(item?.slug || "").startsWith("event_ticket:");
  const isMembershipItem = (item: ShopItem) => String(item?.slug || "").startsWith("membership:");
  const isSkinItem = (item: ShopItem) => item?.slug && (ALL_SKINS as any)[item.slug];
  const isAvatarFrameItem = (item: ShopItem) => isAvatarFrameSlug(item?.slug);
  const isProfileTransitionItem = (item: ShopItem) => isProfileTransitionSlug(item?.slug);
  const isEmulatorShellItem = (item: ShopItem) => isEmulatorShellSlug(item?.slug);
  const isReadyItem = (item: ShopItem) => item.slug === "angelical" || item.slug === "mi_melodia_rosa" || item.slug === "demoniaco" || item.slug === "mercenario_bocasas" || isAvatarFrameItem(item) || isProfileTransitionItem(item) || isEmulatorShellItem(item);
  const getShopVisual = (item: ShopItem) => {
    if ((shopVisuals as any)[item.slug]) return (shopVisuals as any)[item.slug];
    if (isAvatarFrameItem(item)) return shopVisuals.avatar_frame;
    if (isProfileTransitionItem(item)) return shopVisuals.profile_transition;
    if (isEmulatorShellItem(item)) return shopVisuals.emulator_shell;
    if (isMembershipItem(item)) return shopVisuals.membership;
    if (isEventTicketItem(item)) return shopVisuals.ticket;
    if (item.category === "game_chest") return shopVisuals.game_chest;
    if (item.category === "cosmetic") return shopVisuals.cosmetic;
    return shopVisuals.fallback;
  };

  const getShopThumbnailUrl = (item: ShopItem) => {
    if (isSkinItem(item)) return getSkinThumbnailUrl(item.slug);
    if (isAvatarFrameItem(item)) return getAvatarFrame(item.slug)?.thumbnailUrl || null;
    if (isProfileTransitionItem(item)) return getProfileTransition(item.slug)?.thumbnailUrl || null;
    if (isEmulatorShellItem(item)) return getEmulatorShell(item.slug)?.thumbnailUrl || null;
    return null;
  };

  // Renderizador de icono de item
  const ItemIcon = ({ item, className }: { item: ShopItem; className?: string }) => (
    isSkinItem(item) && getSkinThumbnailUrl(item.slug)
      ? <img src={getSkinThumbnailUrl(item.slug) || ""} alt="" className={cn("h-full w-full rounded-sm object-contain", className)} />
      : isAvatarFrameItem(item)
      ? <img src={getAvatarFrame(item.slug)?.thumbnailUrl} alt="" className={cn("h-full w-full object-contain", className)} />
      : isProfileTransitionItem(item)
      ? getProfileTransition(item.slug)?.thumbnailUrl
        ? <img src={getProfileTransition(item.slug)?.thumbnailUrl} alt="" className={cn("h-full w-full rounded-sm object-contain", className)} />
        : item.slug === "varita_magica" ? <VaritaMagicaIcon className={className} /> : item.slug?.startsWith("boomshacka") ? <Bomb className={className} /> : <Flame className={className} />
      : isEmulatorShellItem(item)
      ? <img src={getEmulatorShell(item.slug)?.thumbnailUrl} alt="" className={cn("h-full w-full rounded-sm object-contain", className)} />
      : isMembershipItem(item)
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

    if (!isReadyItem(item)) {
      toast({
        title: "Item en desarrollo",
        description: "Por ahora solo las skins listas, los marcos de avatar, las transiciones y la consola Rosita NES estan disponibles para comprar.",
        variant: "destructive",
      });
      return;
    }

    const purchaseBlockReason = getPurchaseBlockReason(item);
    if (purchaseBlockReason) {
      toast({ 
        title: purchaseBlockReason.title,
        description: purchaseBlockReason.description,
        variant: "destructive"
      });
      return;
    }

    try {
      // Llamar a la función RPC mejorada que valida, deduce y agrega atómicamente
      const { data: rpcResult, error: rpcError } = await (supabase as any).rpc('buy_shop_item_with_validation', {
        p_user_id: user.id,
        p_item_slug: item.slug,
        p_item_name: item.name,
        p_category: item.category,
        p_price: item.price,
        p_price_type: item.price_type,
      });

      if (rpcError) {
        console.error('Error en RPC de compra:', rpcError);
        throw new Error(`Error en la transacción: ${rpcError.message || 'Error desconocido'}`);
      }

      // Validar resultado
      if (!rpcResult?.success) {
        const current = Number(rpcResult?.current ?? 0).toLocaleString();
        const required = Number(rpcResult?.required ?? item.price).toLocaleString();
        const errorMsg = rpcResult?.reason === 'insufficient_stats'
          ? `No tienes suficientes STATS. Necesitas ${required} y tienes ${current}.`
          : rpcResult?.reason === 'insufficient_fcoins'
            ? `No tienes suficientes F-COINS. Necesitas ${required} y tienes ${current}.`
            : rpcResult?.error || 'Error desconocido en la compra';
        throw new Error(errorMsg);
      }

      // Actualizar estado local con el nuevo balance
      const newBalance = rpcResult.new_balance;
      if (item.price_type === 'stats') {
        await refreshProfile();
      } else {
        setUserFCoins(newBalance);
      }

      toast({
        title: "¡Compra exitosa!",
        description: `Obtuviste: ${item.name}`,
        variant: "default"
      });

      setUserInventory((items) => [
        ...items,
        { item_slug: item.slug, item_name: item.name, quantity: 1 },
      ]);
      setPurchaseNotice({ name: item.name });
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

  categoryLabels.avatar_frame = 'Marcos Avatar';
  categoryLabels.emulator_shell = 'Consolas Web';

  const categories = ['all', 'launcher_skin', 'avatar_frame', 'emulator_shell', 'agario_skin', 'game_chest', 'cosmetic'];

  const getShopItemTypeRank = (item: ShopItem) => {
    if (isSkinItem(item)) return 0;
    if (isAvatarFrameItem(item)) return 1;
    if (isEmulatorShellItem(item)) return 2;
    if (isProfileTransitionItem(item)) return 3;
    if (isBoosterItem(item)) return 4;
    if (isMembershipItem(item)) return 5;
    if (isEventTicketItem(item)) return 6;
    if (item.category === "agario_skin") return 7;
    if (item.category === "game_chest") return 8;
    if (item.category === "cosmetic") return 9;
    return 10;
  };

  const sortShopItems = (items: ShopItem[]) => [...items].sort((a, b) => {
    const readyDelta = Number(!isReadyItem(a)) - Number(!isReadyItem(b));
    if (readyDelta !== 0) return readyDelta;

    const typeDelta = getShopItemTypeRank(a) - getShopItemTypeRank(b);
    if (typeDelta !== 0) return typeDelta;

    const priceDelta = Number(a.price || 0) - Number(b.price || 0);
    if (priceDelta !== 0) return priceDelta;

    return String(a.name || a.slug).localeCompare(String(b.name || b.slug), "es");
  });

  const filteredItems = sortShopItems(selectedCategory === 'all'
    ? shopItems
    : selectedCategory === 'avatar_frame'
      ? shopItems.filter(item => isAvatarFrameSlug(item.slug))
      : shopItems.filter(item => item.category === selectedCategory && !isAvatarFrameSlug(item.slug)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Sparkles className="w-8 h-8 animate-spin text-neon-cyan" />
      </div>
    );
  }

  return (
    <div className="store-page min-h-screen bg-background p-4 md:p-6">
      {purchaseNotice && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setPurchaseNotice(null)}>
          <div className="w-full max-w-sm rounded-lg border border-red-500/45 bg-[#100504]/95 p-5 text-center shadow-[0_0_46px_rgba(208,43,25,0.32)]" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border border-red-400/60 bg-red-500/15 text-red-200">
              <Check className="h-5 w-5" />
            </div>
            <h2 className="font-pixel text-sm uppercase text-[#f7d28b]">Guardado en tu inventario</h2>
            <p className="mt-2 text-xs text-muted-foreground">{purchaseNotice.name} ya esta disponible en tu inventario.</p>
            <Button className="mt-4 h-8 bg-red-700 text-xs font-pixel text-white hover:bg-red-600" onClick={() => setPurchaseNotice(null)}>
              Entendido
            </Button>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingBag className="w-7 h-7 text-neon-cyan" />
            <h1 className="font-pixel text-2xl text-neon-cyan">TIENDA</h1>
          </div>
          <p className="text-sm text-muted-foreground">Compra skins, cofres y cosméticos con STATS o F-COINS</p>
        </div>

        {/* User Balance */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-card border border-neon-green/50 rounded p-3">
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="shop-balance-icon shop-balance-icon-stats">
                <Trophy className="h-3 w-3 text-emerald-400" />
              </span>
              STATS
            </p>
            <p className="flex items-center gap-1 font-pixel text-neon-green text-sm">
              {userStats.toLocaleString()}
              {activeStatBoost.active && <span className="rounded bg-neon-green/15 px-1 text-[8px] uppercase">x{activeStatBoost.multiplier}</span>}
            </p>
          </div>
          <div className="bg-card border border-neon-cyan/50 rounded p-3">
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="shop-balance-icon shop-balance-icon-fcoins">
                <Coins className="h-3 w-3 text-yellow-300" />
              </span>
              F-COINS
            </p>
            <p className="font-pixel text-neon-cyan text-sm">{userFCoins.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-neon-yellow/50 rounded p-3">
            <p className="text-[10px] text-muted-foreground">TIER</p>
            <p className="font-pixel text-neon-yellow text-sm">{userTier.toUpperCase()}</p>
          </div>
          <div className="bg-card border border-border rounded p-3">
            <p className="text-[10px] text-muted-foreground">INVENTARIO</p>
            <p className="font-pixel text-foreground text-sm">{userInventory.length}</p>
          </div>
        </div>

        {/* Categorías */}
        <div className="store-category-tabs flex flex-wrap gap-2 mb-8 overflow-visible pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "store-category-tab min-w-0 px-3 py-1.5 rounded text-[clamp(9px,1.65vw,10px)] whitespace-normal text-center leading-tight transition-all font-body font-semibold",
                selectedCategory === cat
                  ? "is-active bg-neon-cyan text-background"
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
            const ready = isReadyItem(item);
            const canBuy = ready && canBuyItem(item);
            const isOwned = userInventory.some(inv => inv.item_slug === item.slug);
            const visual = getShopVisual(item);
            const artworkThumbnail = getShopThumbnailUrl(item);
            const hasArtworkThumbnail = Boolean(artworkThumbnail);
            const artworkBackdrop = item.slug === "mi_melodia_rosa" || item.slug === "angelical" || isAvatarFrameItem(item) || isEmulatorShellItem(item)
              ? "linear-gradient(135deg, rgba(255,251,253,.96), rgba(255,224,240,.9) 58%, rgba(219,91,151,.22))"
              : "linear-gradient(135deg, rgba(20,7,11,.92), rgba(74,18,34,.72) 55%, rgba(10,4,6,.94))";

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
                  "aspect-video overflow-hidden relative group/img flex items-center justify-center border-b border-border",
                )}
                style={{ background: hasArtworkThumbnail ? artworkBackdrop : visual.background }}>
                  {/* Imagen de fondo si existe */}
                  {!hasArtworkThumbnail && item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110 opacity-30 mix-blend-screen"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  
                  {/* Icono del item como miniatura principal */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={cn(
                      "demoniaco-item-frame relative grid h-16 w-16 place-items-center rounded-sm border shadow-[inset_2px_2px_0_rgba(255,255,255,0.18),inset_-2px_-2px_0_rgba(0,0,0,0.55),0_0_18px_rgba(0,0,0,.45)]",
                      hasArtworkThumbnail && "h-28 w-28 overflow-visible border-0 bg-transparent shadow-none",
                      isAvatarFrameItem(item) && "h-20 w-20 border-pink-200/70 bg-black/15 shadow-[0_0_24px_rgba(244,114,182,0.28)]",
                      isProfileTransitionItem(item) && "h-20 w-20 overflow-hidden border-orange-300/70 bg-black/40 shadow-[0_0_24px_rgba(249,115,22,0.28)]",
                      isEmulatorShellItem(item) && "h-20 w-20 overflow-hidden border-pink-200/80 bg-pink-100 shadow-[0_0_24px_rgba(244,114,182,0.28)]",
                      hasArtworkThumbnail && "h-28 w-28 border-0 bg-transparent shadow-none",
                      item.slug === "varita_magica" && "border-pink-300/80 bg-pink-100 shadow-[0_0_24px_rgba(244,114,182,0.3)]",
                      item.slug?.startsWith("boomshacka") && "border-red-300/80 bg-[#250805] shadow-[0_0_24px_rgba(248,113,113,0.28)]",
                      visual.frame,
                      hasArtworkThumbnail && "h-28 w-28 border-0 bg-transparent shadow-none",
                    )}>
                      {!hasArtworkThumbnail && <div className="absolute inset-1 rounded-sm border border-black/40 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_45%)]" />}
                      <ItemIcon
                        item={item}
                        className={cn(
                          "relative h-8 w-8 drop-shadow-[0_0_8px_rgba(255,255,255,0.28)]",
                          hasArtworkThumbnail ? "h-full w-full drop-shadow-none" : visual.icon,
                          !hasArtworkThumbnail && isProfileTransitionItem(item) && "h-8 w-8 text-orange-200 drop-shadow-[0_0_12px_rgba(249,115,22,0.75)]",
                          !hasArtworkThumbnail && item.slug === "varita_magica" && "h-full w-full drop-shadow-none",
                          !hasArtworkThumbnail && item.slug?.startsWith("boomshacka") && "h-10 w-10 text-red-200 drop-shadow-[0_0_12px_rgba(248,113,113,0.72)]",
                        )}
                      />
                      <span className="absolute bottom-1 left-1/2 max-w-[88%] -translate-x-1/2 truncate rounded border border-black/45 bg-black/80 px-1.5 py-0.5 font-pixel text-[7px] uppercase leading-none text-white/90">
                        {visual.badge}
                      </span>
                    </div>
                  </div>
                  <div className="absolute left-2 top-2 max-w-[70%] truncate rounded border border-white/10 bg-black/55 px-2 py-1 font-pixel text-[7px] uppercase text-white/80">
                    {item.category.replace("_", " ")}
                  </div>
                  {!ready && (
                    <div className="absolute right-2 top-2 rounded border border-yellow-300/30 bg-black/75 px-2 py-1 font-pixel text-[7px] uppercase text-yellow-200">
                      En desarrollo
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none" />
                </div>

                {/* Info */}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-pixel text-[11px] leading-5 text-foreground flex-1">{item.name}</h3>
                    {item.tier_requirement !== 'novato' && (
                      <span className="text-[9px] bg-neon-yellow/20 text-neon-yellow px-2 py-0.5 rounded">
                        {item.tier_requirement.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-[11px] leading-4 text-muted-foreground">{item.description}</p>
                  )}
                  {!ready && (
                    <p className="rounded border border-yellow-300/25 bg-yellow-300/10 px-2 py-1 text-[10px] text-yellow-100">
                      Este item todavia no esta listo. Solo Rosa Pastel, Skin Demoniaco, Skin Mercenario Bocasas, los marcos de avatar, las transiciones y la consola Rosita NES estan disponibles por ahora.
                    </p>
                  )}

                  {/* Precio */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <div className={cn(
                      "shop-price-pill flex items-center gap-1",
                      item.price_type === 'stats' ? "text-emerald-400" : "text-yellow-300"
                    )}>
                      <span className={cn("shop-price-icon", item.price_type === 'stats' ? "shop-price-icon-stats" : "shop-price-icon-fcoins")}>
                        {item.price_type === 'stats' ? <Trophy className="w-3 h-3" /> : <Coins className="w-3 h-3" />}
                      </span>
                      <span className="font-pixel text-[11px]">{item.price.toLocaleString()}</span>
                    </div>

                    {isOwned && (
                      <div className="ml-auto flex items-center gap-1 text-neon-green text-[10px]">
                        <Check className="w-3 h-3" />
                        Poseído
                      </div>
                    )}
                  </div>

                  {/* Botón */}
                  <Button
                    onClick={() => handleBuyItem(item)}
                    disabled={!canBuy}
                    className="w-full h-7 text-[10px] font-pixel mt-2"
                    variant={canBuy ? "default" : "outline"}
                  >
                    {!ready ? (
                      <>
                        <Lock className="w-3 h-3 mr-1" />
                        EN DESARROLLO
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
