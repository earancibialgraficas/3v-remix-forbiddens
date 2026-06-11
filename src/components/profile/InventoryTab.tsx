import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Archive, ArrowLeftRight, Check, Coins, Crown, Gem, Loader2, Search, Sparkles, Ticket, Trash2, Palette, X as XIcon, ShoppingCart, DollarSign, Swords, Flame, Bomb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { InventoryIcon } from "@/components/icons/InventoryIcon";
import { INVENTORY_SEEN_EVENT, getInventoryItemSourceIds, isInventoryItemUnseen, markInventoryItemIdsSeen } from "@/lib/inventorySeen";
import { ALL_SKINS, getSkinThumbnailUrl } from "@/lib/skinThemes";
import { AVATAR_FRAMES, getAvatarFrame, isAvatarFrameSlug } from "@/lib/avatarFrames";
import { PROFILE_TRANSITIONS, getProfileTransition, isProfileTransitionSlug } from "@/lib/profileTransitions";
import { EMULATOR_SHELLS, getEmulatorShell, isEmulatorShellSlug } from "@/lib/emulatorShells";
import { STAT_BOOST_REFRESH_EVENT, STAT_BOOST_SLUG, getStatBoostActiveUntil, isStatBoostActive, isStatBoostExpired } from "@/hooks/useActiveStatBoost";
import { VaritaMagicaIcon } from "@/components/icons/VaritaMagicaIcon";

interface InventoryTabProps {
  userId: string;
  profile: any;
  onWalletChange?: (balance: number) => void;
  onStatChange?: () => void;
}

const INVENTORY_DEFAULT_PAGE_SIZE = 18;
const INVENTORY_MIN_PAGES = 6;
export default function InventoryTab({ userId, profile, onWalletChange, onStatChange }: InventoryTabProps) {
  const { toast } = useToast();
  const tradeChannelRef = useRef<any>(null);
  const slotItemsRef = useRef<any[]>(Array(INVENTORY_DEFAULT_PAGE_SIZE).fill(null));
  const tradeSlotsRef = useRef<any[]>(Array(4).fill(null));
  const sellSlotsRef = useRef<any[]>(Array(4).fill(null));
  const inventoryGridRef = useRef<HTMLDivElement | null>(null);
  const cursorItemRef = useRef<any | null>(null);
  const slotOrderPersistTimerRef = useRef<number | null>(null);
  const tradeCompletedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [wallet, setWallet] = useState(0);
  const [boosters, setBoosters] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [slotItems, setSlotItems] = useState<any[]>(Array(INVENTORY_DEFAULT_PAGE_SIZE).fill(null));
  const [cursorItem, setCursorItem] = useState<any | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [tradeSlots, setTradeSlots] = useState<any[]>(Array(4).fill(null));
  const [tradeId, setTradeId] = useState<string | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [activeSkins, setActiveSkins] = useState<Record<string, string>>({});
  const [sellSlots, setSellSlots] = useState<any[]>(Array(4).fill(null));
  const [priceMap, setPriceMap] = useState<Record<string, { price: number, type: string }>>({});
  const [remoteTradeSlots, setRemoteTradeSlots] = useState<any[]>(Array(4).fill(null));
  const [remotePoints, setRemotePoints] = useState(0);
  const [dragMode, setDragMode] = useState<"even" | "single" | null>(null);
  const [dragTouched, setDragTouched] = useState<number[]>([]);
  const [suppressClick, setSuppressClick] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientResults, setRecipientResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [incomingTradeRequest, setIncomingTradeRequest] = useState<any | null>(null);
  const [outgoingTradeRequest, setOutgoingTradeRequest] = useState<any | null>(null);
  const [pointsToSend, setPointsToSend] = useState("");
  const [statToConvert, setStatToConvert] = useState("100");
  const [fcoinToConvert, setFcoinToConvert] = useState("100");
  const [contextMenu, setContextMenu] = useState<{ item: any; slot: number; x: number; y: number } | null>(null);
  const [splitTarget, setSplitTarget] = useState<any | null>(null);
  const [splitQuantity, setSplitQuantity] = useState("1");
  const [discardTarget, setDiscardTarget] = useState<{ item: any; slot: number | null; fromCursor?: boolean } | null>(null);
  const [seenVersion, setSeenVersion] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [inventoryPage, setInventoryPage] = useState(0);
  const [inventorySlotsPerPage, setInventorySlotsPerPage] = useState(INVENTORY_DEFAULT_PAGE_SIZE);
  const [inventoryColumns, setInventoryColumns] = useState(6);

  const totalBoosters = useMemo(
    () => boosters.filter((item) => item.item_slug === STAT_BOOST_SLUG).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [boosters],
  );
  const activeInventoryStatBoost = useMemo(
    () => ({
      active: boosters.some((item) => item.item_slug === STAT_BOOST_SLUG && isStatBoostActive(item)),
      multiplier: 3,
    }),
    [boosters],
  );
  const tradeItemCount = useMemo(
    () => tradeSlots.filter(Boolean).reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
    [tradeSlots],
  );
  const remoteTradeItemCount = useMemo(
    () => remoteTradeSlots.filter(Boolean).reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
    [remoteTradeSlots],
  );
  const inventoryPageCount = Math.max(1, Math.ceil(slotItems.length / inventorySlotsPerPage));
  const currentInventoryPage = Math.min(inventoryPage, inventoryPageCount - 1);
  const visibleInventoryStart = currentInventoryPage * inventorySlotsPerPage;
  const visibleSlotItems = useMemo(
    () => slotItems.slice(visibleInventoryStart, visibleInventoryStart + inventorySlotsPerPage),
    [slotItems, visibleInventoryStart, inventorySlotsPerPage],
  );
  const activeSkinSlugs = useMemo(() => new Set(Object.values(activeSkins).filter(Boolean)), [activeSkins]);
  const activeAvatarFrameSlug = activeSkins.avatar_frame;
  const activeAvatarFrame = getAvatarFrame(activeAvatarFrameSlug);
  const activeProfileTransitionSlug = activeSkins.profile_transition;
  const activeProfileTransition = getProfileTransition(activeProfileTransitionSlug);
  const activeEmulatorShellSlug = activeSkins.emulator_shell;
  const activeEmulatorShell = getEmulatorShell(activeEmulatorShellSlug);

  useEffect(() => {
    if (inventoryPage >= inventoryPageCount) setInventoryPage(Math.max(0, inventoryPageCount - 1));
  }, [inventoryPage, inventoryPageCount]);

  useEffect(() => {
    const grid = inventoryGridRef.current;
    if (!grid || typeof ResizeObserver === "undefined") return;

    const updateSlotsPerPage = () => {
      const width = grid.clientWidth;
      if (!width) return;
      const styles = window.getComputedStyle(grid);
      const gap = Number.parseFloat(styles.columnGap || styles.gap || "8") || 8;
      const padding =
        (Number.parseFloat(styles.paddingLeft || "0") || 0) +
        (Number.parseFloat(styles.paddingRight || "0") || 0);
      const available = Math.max(0, width - padding);
      const targetSlot = width < 420 ? 58 : width < 640 ? 64 : 78;
      const columns = Math.max(2, Math.min(6, Math.floor((available + gap) / (targetSlot + gap))));
      const rows = width < 520 ? 3 : 3;
      const nextPageSize = Math.max(columns * rows, 6);
      grid.style.setProperty("grid-template-columns", `repeat(${columns}, minmax(0, 1fr))`, "important");
      grid.style.setProperty("--inventory-responsive-columns", String(columns));
      setInventoryColumns((current) => current === columns ? current : columns);
      setInventorySlotsPerPage((current) => current === nextPageSize ? current : nextPageSize);
    };

    updateSlotsPerPage();
    const observer = new ResizeObserver(updateSlotsPerPage);
    observer.observe(grid);
    window.addEventListener("orientationchange", updateSlotsPerPage);
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", updateSlotsPerPage);
    };
  }, []);

  useEffect(() => {
    const grid = inventoryGridRef.current;
    if (!grid) return;
    grid.style.setProperty("grid-template-columns", `repeat(${inventoryColumns}, minmax(0, 1fr))`, "important");
    grid.style.setProperty("--inventory-responsive-columns", String(inventoryColumns));
  }, [inventoryColumns]);

  const loadInventory = async () => {
    setLoading(true);
    setSchemaReady(true);
    try {
      const [walletRes, inventoryRes, offersRes] = await Promise.all([
        supabase.from("point_wallets" as any).select("balance").eq("user_id", userId).maybeSingle(),
        (supabase.from("user_inventory" as any).select("*") as any).eq("user_id" as any, userId).order("created_at", { ascending: true }),
        supabase
          .from("inventory_trade_offers" as any)
          .select("*")
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      if (walletRes.error || inventoryRes.error || offersRes.error) {
        const message = walletRes.error?.message || inventoryRes.error?.message || offersRes.error?.message || "";
        if (message.toLowerCase().includes("does not exist") || message.toLowerCase().includes("schema cache")) {
          setSchemaReady(false);
          setWallet(0);
          onWalletChange?.(0);
          setBoosters([]);
          setOffers([]);
          return;
        }
      }

      const nextWallet = Number((walletRes.data as any)?.balance ?? 0);
      setWallet(nextWallet);
      onWalletChange?.(nextWallet);
      setBoosters(inventoryRes.data || []);
      setOffers(offersRes.data || []);
    } catch {
      setSchemaReady(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchShopPrices = useCallback(async () => {
    const { data } = await supabase.from('shop_items' as any).select('slug, price, price_type');
    if (data) {
      const map: Record<string, { price: number, type: string }> = {};
      data.forEach((item: any) => {
        map[item.slug] = { price: item.price, type: item.price_type };
      });
      Object.values(AVATAR_FRAMES).forEach((frame) => {
        if (!map[frame.slug]) map[frame.slug] = { price: frame.price, type: frame.priceType };
      });
      Object.values(PROFILE_TRANSITIONS).forEach((transition) => {
        if (!map[transition.slug]) map[transition.slug] = { price: transition.price, type: transition.priceType };
      });
      Object.values(EMULATOR_SHELLS).forEach((shell) => {
        if (!map[shell.slug]) map[shell.slug] = { price: shell.price, type: shell.priceType };
      });
      setPriceMap(map);
    }
  }, []);

  useEffect(() => {
    void fetchShopPrices();
  }, [fetchShopPrices]);

  const fetchActiveSkins = useCallback(async () => {
    const { data } = await (supabase
      .from('user_active_skins' as any)
      .select('skin_type, skin_slug') as any)
      .eq('user_id' as any, userId);

    if (data) {
      const activeMap: Record<string, string> = {};
      data.forEach((s: any) => {
        activeMap[s.skin_type] = s.skin_slug;
      });
      setActiveSkins(activeMap);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) void fetchActiveSkins();
  }, [userId, fetchActiveSkins]);

  useEffect(() => {
    if (userId) void loadInventory();
  }, [userId]);

  useEffect(() => {
    const refreshSeenState = () => setSeenVersion((value) => value + 1);
    window.addEventListener(INVENTORY_SEEN_EVENT, refreshSeenState);
    window.addEventListener("storage", refreshSeenState);
    return () => {
      window.removeEventListener(INVENTORY_SEEN_EVENT, refreshSeenState);
      window.removeEventListener("storage", refreshSeenState);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`inventory-trade-request:${userId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on("broadcast", { event: "trade_request" }, ({ payload }: any) => {
      if (payload?.to !== userId || payload?.from === userId) return;
      setIncomingTradeRequest(payload);
      toast({
        title: "Solicitud de trueque",
        description: `${payload.fromName || "Un usuario"} quiere comerciar contigo.`,
      });
    });
    channel.on("broadcast", { event: "trade_request_accepted" }, ({ payload }: any) => {
      if (payload?.to !== userId || payload?.from === userId) return;
      const target = {
        user_id: payload.from,
        display_name: payload.fromName || "Usuario",
        avatar_url: payload.fromAvatar || "",
      };
      setSelectedRecipient(target);
      setOutgoingTradeRequest(null);
      toast({ title: "Trueque aceptado", description: `${target.display_name} entro a la mesa de trueque.` });
    });
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [toast, userId]);

  useEffect(() => {
    slotItemsRef.current = slotItems;
  }, [slotItems]);

  useEffect(() => {
    tradeSlotsRef.current = tradeSlots;
  }, [tradeSlots]);

  useEffect(() => {
    sellSlotsRef.current = sellSlots;
  }, [sellSlots]);

  useEffect(() => {
    cursorItemRef.current = cursorItem;
  }, [cursorItem]);

  useEffect(() => {
    setLocalReady(false);
    setRemoteReady(false);
    setRemoteTradeSlots(Array(4).fill(null));
    setRemotePoints(0);
    setTradeId(null);
  }, [selectedRecipient?.user_id]);

  useEffect(() => {
    const trackCursor = (event: MouseEvent) => setCursorPos({ x: event.clientX, y: event.clientY });
    window.addEventListener("mousemove", trackCursor);
    return () => window.removeEventListener("mousemove", trackCursor);
  }, []);

  useEffect(() => {
    if (!selectedRecipient?.user_id) return;
    const pairKey = [userId, selectedRecipient.user_id].sort().join(":");
    const channel = supabase.channel(`inventory-trade:${pairKey}`, {
      config: { broadcast: { self: false } },
    });
    tradeChannelRef.current = channel;
    channel.on("broadcast", { event: "trade_state" }, ({ payload }: any) => {
      if (payload?.from === userId) return;
      if (tradeCompletedRef.current) return;
      setRemoteTradeSlots(Array.isArray(payload?.items) ? payload.items.concat(Array(4).fill(null)).slice(0, 4) : Array(4).fill(null));
      setRemotePoints(Number(payload?.points || 0));
      setRemoteReady(Boolean(payload?.ready));
      if (payload?.tradeId) setTradeId(String(payload.tradeId));
    });
    channel.on("broadcast", { event: "trade_completed" }, ({ payload }: any) => {
      if (payload?.from === userId) return;
      tradeCompletedRef.current = true;
      toast({ title: "Trueque completado", description: "Items y F-coin intercambiados." });
      setSelectedRecipient(null);
      setRecipientSearch("");
      setRecipientResults([]);
      setPointsToSend("");
      commitTradeSlots(Array(4).fill(null), false);
      setRemoteTradeSlots(Array(4).fill(null));
      setRemotePoints(0);
      setLocalReady(false);
      setRemoteReady(false);
      setTradeId(null);
      setNote("");
      void loadInventory();
    });
    channel.subscribe();
    return () => {
      if (tradeChannelRef.current === channel) tradeChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [selectedRecipient?.user_id, userId]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!dragMode) return;
    window.addEventListener("mouseup", finishDistribution);
    return () => window.removeEventListener("mouseup", finishDistribution);
  }, [dragMode, cursorItem, dragTouched]);

  const persistSlotSnapshot = (slots: any[]) => {
    const snapshot = slots.map((slot) => slot ? {
      item_slug: slot.item_slug,
      sources: stackSources(slot),
    } : null);
    localStorage.setItem(`inventory-slot-snapshot:${userId}`, JSON.stringify(snapshot));
  };

  useEffect(() => {
    const savedSnapshot = (() => {
      try {
        return JSON.parse(localStorage.getItem(`inventory-slot-snapshot:${userId}`) || "[]");
      } catch {
        return [];
      }
    })();
    const visibleBoosters = boosters.filter((item) => {
      if (isSkinItem(item) && activeSkinSlugs.has(item.item_slug)) return false;
      if (isAvatarFrameSlug(item.item_slug) && activeAvatarFrameSlug === item.item_slug) return false;
      if (isProfileTransitionSlug(item.item_slug) && activeProfileTransitionSlug === item.item_slug) return false;
      if (isEmulatorShellSlug(item.item_slug) && activeEmulatorShellSlug === item.item_slug) return false;
      return true;
    });
    const slotCount = Math.max(
      inventorySlotsPerPage * INVENTORY_MIN_PAGES,
      Math.ceil(Math.max(visibleBoosters.length, Array.isArray(savedSnapshot) ? savedSnapshot.length : 0) / inventorySlotsPerPage) * inventorySlotsPerPage,
    );
    const nextSlots = Array(slotCount).fill(null);
    const availableById = new Map((visibleBoosters || []).map((item) => [String(item.id), item]));
    const consumed = new Set<string>();

    if (Array.isArray(savedSnapshot) && savedSnapshot.length > 0) {
      savedSnapshot.slice(0, slotCount).forEach((entry: any, slotIndex: number) => {
        if (!entry || !Array.isArray(entry.sources)) return;
        const candidates = entry.sources
          .map((source: any) => {
            const sourceItem = availableById.get(String(source.id));
            if (!sourceItem || sourceItem.item_slug !== entry.item_slug || consumed.has(String(source.id))) return null;
            const qty = Math.min(Number(source.quantity || 0), Number(sourceItem.quantity || 0));
            if (qty <= 0) return null;
            return { item: sourceItem, source: { id: sourceItem.id, quantity: qty } };
          })
          .filter(Boolean);
        if (candidates.length === 0) return;
        const base = candidates[0].item;
        const parts = candidates.filter((part: any) => canStackTogether(part.item, base));
        if (parts.length === 0) return;
        parts.forEach((part: any) => consumed.add(String(part.source.id)));
        nextSlots[slotIndex] = {
          ...base,
          quantity: parts.reduce((sum: number, part: any) => sum + Number(part.source.quantity || 0), 0),
          sources: parts.map((part: any) => part.source),
        };
      });
    }

    const savedOrder = (() => {
      try {
        return JSON.parse(localStorage.getItem(`inventory-slot-order:${userId}`) || "[]");
      } catch {
        return [];
      }
    })();
    visibleBoosters.forEach((item, index) => {
      if (consumed.has(String(item.id))) return;
      const preferred = Number(savedOrder[index]);
      const slot = Number.isInteger(preferred) && preferred >= 0 && preferred < slotCount && !nextSlots[preferred]
        ? preferred
        : nextSlots.findIndex((slotItem) => !slotItem);
      if (slot >= 0) nextSlots[slot] = item;
    });
    setSlotItems(nextSlots);
    slotItemsRef.current = nextSlots;
    setTradeSlots(Array(4).fill(null));
    tradeSlotsRef.current = Array(4).fill(null);
    setCursorItem(null);
    cursorItemRef.current = null;
  }, [activeAvatarFrameSlug, activeEmulatorShellSlug, activeProfileTransitionSlug, activeSkinSlugs, boosters, inventorySlotsPerPage, userId]);

  const searchUsers = async () => {
    if (!recipientSearch.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .ilike("display_name", `%${recipientSearch.trim()}%`)
      .neq("user_id", userId)
      .limit(6);
    setRecipientResults(data || []);
  };

  const stackSources = (item: any) => {
    const sources = Array.isArray(item?.sources) ? item.sources : [];
    if (sources.length > 0) {
      return sources
        .map((source: any) => ({ id: source.id || item.id, quantity: Math.max(0, Math.floor(Number(source.quantity || 0))) }))
        .filter((source: any) => source.id && source.quantity > 0);
    }
    return item?.id ? [{ id: item.id, quantity: Math.max(1, Math.floor(Number(item.quantity || 1))) }] : [];
  };

  const serializeTradeItems = (slots = tradeSlotsRef.current) =>
    slots
      .filter(Boolean)
      .flatMap((item, index) =>
        stackSources(item).map((source: any) => ({
          slot_index: index,
          id: source.id,
          item_slug: item.item_slug,
          item_name: item.item_name,
          quantity: source.quantity,
          metadata: item.metadata || {},
        })),
      );

  const syncLiveTrade = async (ready = localReady, slots = tradeSlotsRef.current, pointsValue = pointsToSend) => {
    if (tradeCompletedRef.current) return null;
    if (!selectedRecipient?.user_id || !schemaReady) return null;
    const points = Math.max(0, Math.floor(Number(pointsValue) || 0));
    const items = serializeTradeItems(slots);
    const { data, error } = await (supabase as any).rpc("upsert_live_inventory_trade", {
      p_other_user_id: selectedRecipient.user_id,
      p_points: points,
      p_items: items,
      p_ready: ready,
    });
    if (error) {
      if (error.message && !error.message.toLowerCase().includes("function")) {
        toast({ title: "No se pudo sincronizar el trueque", description: error.message, variant: "destructive" });
      }
      return null;
    }
    const result = data as any;
    if (result?.trade_id) setTradeId(String(result.trade_id));
    if (result?.user_a && result?.user_b) {
      setRemoteReady(userId === result.user_a ? Boolean(result.user_b_ready) : Boolean(result.user_a_ready));
    }
    void tradeChannelRef.current?.send({
      type: "broadcast",
      event: "trade_state",
      payload: { from: userId, tradeId: result?.trade_id || tradeId, points, items, ready },
    });
    return result;
  };

  useEffect(() => {
    if (!selectedRecipient?.user_id) return;
    const timer = window.setTimeout(() => {
      void syncLiveTrade(localReady);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [selectedRecipient?.user_id, tradeSlots, pointsToSend, localReady]);

  const markTradeChanged = () => {
    if (localReady) setLocalReady(false);
  };

  const selectTradeRecipient = (target: any) => {
    tradeCompletedRef.current = false;
    if (selectedRecipient?.user_id && selectedRecipient.user_id !== target.user_id) {
      returnTradeSlotsToInventory();
      setPointsToSend("");
    }
    setSelectedRecipient(target);
    setOutgoingTradeRequest(null);
  };

  const sendTradeRequest = async (target: any) => {
    if (!target?.user_id) return;
    setOutgoingTradeRequest(target);
    const requesterName = profile?.display_name || profile?.username || "Un usuario";
    const payload = {
      from: userId,
      fromName: requesterName,
      fromAvatar: profile?.avatar_url || "",
      to: target.user_id,
      sentAt: Date.now(),
    };
    await supabase.from("notifications").insert({
      id: crypto.randomUUID(),
      user_id: target.user_id,
      type: "trade_request",
      title: "Solicitud de trueque",
      body: `${requesterName} quiere comerciar contigo en el inventario.`,
      related_id: userId,
      is_read: false,
    } as any);
    const channel = supabase.channel(`inventory-trade-request:${target.user_id}`);
    await channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.send({ type: "broadcast", event: "trade_request", payload });
        void supabase.removeChannel(channel);
      }
    });
    toast({ title: "Solicitud enviada", description: "Si el usuario esta viendo su inventario, podra aceptar al instante." });
  };

  const acceptTradeRequest = async () => {
    if (!incomingTradeRequest?.from) return;
    const target = {
      user_id: incomingTradeRequest.from,
      display_name: incomingTradeRequest.fromName || "Usuario",
      avatar_url: incomingTradeRequest.fromAvatar || "",
    };
    selectTradeRecipient(target);
    const payload = {
      from: userId,
      fromName: profile?.display_name || profile?.username || "Usuario",
      fromAvatar: profile?.avatar_url || "",
      to: incomingTradeRequest.from,
      sentAt: Date.now(),
    };
    const channel = supabase.channel(`inventory-trade-request:${incomingTradeRequest.from}`);
    await channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.send({ type: "broadcast", event: "trade_request_accepted", payload });
        void supabase.removeChannel(channel);
      }
    });
    setIncomingTradeRequest(null);
    toast({ title: "Trueque iniciado", description: "Ambos deben mantenerse en inventario para comerciar en vivo." });
  };

  const cancelTradeSession = () => {
    tradeCompletedRef.current = false;
    void syncLiveTrade(false, Array(4).fill(null), "0");
    returnTradeSlotsToInventory();
    setPointsToSend("");
    setRemoteTradeSlots(Array(4).fill(null));
    setRemotePoints(0);
    setLocalReady(false);
    setRemoteReady(false);
    setTradeId(null);
    setSelectedRecipient(null);
    setIncomingTradeRequest(null);
    setOutgoingTradeRequest(null);
  };

  const createOffer = async () => {
    if (tradeCompletedRef.current || busy) return;
    if (!selectedRecipient) {
      toast({ title: "Elige un usuario", variant: "destructive" });
      return;
    }

    const points = Math.max(0, Math.floor(Number(pointsToSend) || 0));
    const itemQty = Math.max(0, Math.floor(Number(tradeItemCount) || 0));
    const remoteHasOffer = remotePoints > 0 || remoteTradeItemCount > 0;
    if (points <= 0 && itemQty <= 0 && !remoteHasOffer) {
      toast({ title: "Agreguen F-coin u objetos", variant: "destructive" });
      return;
    }
    if (!localReady || !remoteReady) {
      toast({ title: "Falta confirmar", description: "Ambos usuarios deben marcar Listo antes de enviar.", variant: "destructive" });
      return;
    }

    const synced = tradeId ? null : await syncLiveTrade(true);
    const activeTradeId = tradeId || synced?.trade_id;
    if (!activeTradeId) {
      toast({ title: "Trueque no sincronizado", description: "Espera a que la mesa de trueque este lista.", variant: "destructive" });
      return;
    }

    setBusy(true);
    const { data, error } = await (supabase as any).rpc("complete_live_inventory_trade", {
      p_trade_id: activeTradeId,
    });
    setBusy(false);

    if (error) {
      toast({ title: "No se pudo completar el trueque", description: error.message, variant: "destructive" });
      return;
    }

    const result = data as any;
    if (result?.ok === false) {
      if (tradeCompletedRef.current || ["both_users_must_be_ready", "trade_not_pending"].includes(String(result.reason || ""))) {
        tradeCompletedRef.current = true;
        toast({ title: "Trueque actualizado", description: "La mesa ya fue cerrada. Recargando inventario." });
        setSelectedRecipient(null);
        setRecipientSearch("");
        setRecipientResults([]);
        setPointsToSend("");
        commitTradeSlots(Array(4).fill(null), false);
        setRemoteTradeSlots(Array(4).fill(null));
        setRemotePoints(0);
        setLocalReady(false);
        setRemoteReady(false);
        setTradeId(null);
        setNote("");
        void loadInventory();
        return;
      }
      toast({ title: "Trueque rechazado", description: result.reason || "Revisa saldos, items o confirmaciones.", variant: "destructive" });
      return;
    }

    tradeCompletedRef.current = true;
    void tradeChannelRef.current?.send({
      type: "broadcast",
      event: "trade_completed",
      payload: { from: userId, tradeId: activeTradeId },
    });
    toast({ title: "Trueque completado", description: "Items y F-coin intercambiados." });
    setSelectedRecipient(null);
    setRecipientSearch("");
    setRecipientResults([]);
    setPointsToSend("");
    commitTradeSlots(Array(4).fill(null), false);
    setRemoteTradeSlots(Array(4).fill(null));
    setRemotePoints(0);
    setLocalReady(false);
    setRemoteReady(false);
    setTradeId(null);
    setNote("");
    void loadInventory();
  };

  const persistSlotOrder = (slots: any[]) => {
    const order = boosters.map((item) => slots.findIndex((slotItem) => slotItem?.id === item.id));
    localStorage.setItem(`inventory-slot-order:${userId}`, JSON.stringify(order));
    persistSlotSnapshot(slots);
  };

  const schedulePersistSlotOrder = (slots: any[]) => {
    if (slotOrderPersistTimerRef.current) window.clearTimeout(slotOrderPersistTimerRef.current);
    slotOrderPersistTimerRef.current = window.setTimeout(() => {
      persistSlotOrder(slots);
      slotOrderPersistTimerRef.current = null;
    }, 90);
  };

  const commitSlotItems = (next: any[], persist = true) => {
    slotItemsRef.current = next;
    setSlotItems(next);
    if (persist) schedulePersistSlotOrder(next);
  };

  const commitTradeSlots = (next: any[], changed = true) => {
    tradeSlotsRef.current = next;
    setTradeSlots(next);
    if (changed) markTradeChanged();
  };

  const commitCursorItem = (next: any | null) => {
    cursorItemRef.current = next;
    setCursorItem(next);
  };

  const compactSources = (sources: any[]) => {
    const totals = new Map<string, number>();
    sources.forEach((source) => {
      if (!source?.id) return;
      totals.set(source.id, (totals.get(source.id) || 0) + Math.max(0, Math.floor(Number(source.quantity || 0))));
    });
    return Array.from(totals.entries())
      .map(([id, quantity]) => ({ id, quantity }))
      .filter((source) => source.quantity > 0);
  };

  const takeSources = (item: any, quantity: number) => {
    let remaining = Math.max(0, Math.floor(Number(quantity || 0)));
    const taken: any[] = [];
    for (const source of stackSources(item)) {
      if (remaining <= 0) break;
      const qty = Math.min(remaining, Number(source.quantity || 0));
      if (qty > 0) {
        taken.push({ id: source.id, quantity: qty });
        remaining -= qty;
      }
    }
    return compactSources(taken);
  };

  const splitStackItem = (item: any, quantity: number) => {
    const total = Math.max(0, Math.floor(Number(item?.quantity || 0)));
    const pickedQty = Math.min(total, Math.max(0, Math.floor(Number(quantity || 0))));
    let remainingPick = pickedQty;
    const pickedSources: any[] = [];
    const remainderSources: any[] = [];

    stackSources(item).forEach((source: any) => {
      const sourceQty = Math.max(0, Math.floor(Number(source.quantity || 0)));
      if (remainingPick > 0) {
        const take = Math.min(remainingPick, sourceQty);
        if (take > 0) pickedSources.push({ id: source.id, quantity: take });
        if (sourceQty - take > 0) remainderSources.push({ id: source.id, quantity: sourceQty - take });
        remainingPick -= take;
      } else if (sourceQty > 0) {
        remainderSources.push({ id: source.id, quantity: sourceQty });
      }
    });

    return {
      picked: pickedQty > 0 ? { ...item, quantity: pickedQty, sources: compactSources(pickedSources) } : null,
      remainder: total - pickedQty > 0 ? { ...item, quantity: total - pickedQty, sources: compactSources(remainderSources) } : null,
    };
  };

  const boosterStackState = (item: any) => {
    if (!item || item.item_slug !== STAT_BOOST_SLUG) return "";
    const activeUntil = getStatBoostActiveUntil(item);
    const usedBy = Array.isArray(item?.metadata?.used_by_users)
      ? item.metadata.used_by_users.map(String).sort().join("|")
      : "";
    if (activeUntil > Date.now()) return `active:${activeUntil}:${usedBy}`;
    if (activeUntil > 0) return `expired:${activeUntil}:${usedBy}`;
    if (usedBy) return `used:${usedBy}`;
    return "fresh";
  };

  const stackKey = (item: any) => {
    if (!item?.item_slug) return "";
    if (item.item_slug === STAT_BOOST_SLUG) return `${item.item_slug}:${boosterStackState(item)}`;
    return item.item_slug;
  };

  const canStackTogether = (a: any, b: any) => a && b && stackKey(a) === stackKey(b);

  const combineStacks = (base: any, addition: any) => {
    if (!canStackTogether(base, addition)) return cloneStack(addition);
    const quantity = Number(base.quantity || 0) + Number(addition.quantity || 0);
    return {
      ...base,
      quantity,
      sources: compactSources([...stackSources(base), ...stackSources(addition)]),
    };
  };

  const addStackToSlots = (slots: any[], item: any) => {
    const next = [...slots];
    const sameIndex = next.findIndex((slot) => canStackTogether(slot, item));
    if (sameIndex >= 0) {
      next[sameIndex] = combineStacks(next[sameIndex], item);
      return next;
    }
    const emptyIndex = next.findIndex((slot) => !slot);
    if (emptyIndex >= 0) next[emptyIndex] = cloneStack(item);
    return next;
  };

  const placeStackInTradeSlots = (slots: any[], item: any) => {
    const next = [...slots];
    const sameIndex = next.findIndex((slot) => canStackTogether(slot, item));
    if (sameIndex >= 0) {
      next[sameIndex] = combineStacks(next[sameIndex], item);
      return { placed: true, slots: next };
    }
    const emptyIndex = next.findIndex((slot) => !slot);
    if (emptyIndex >= 0) {
      next[emptyIndex] = cloneStack(item);
      return { placed: true, slots: next };
    }
    return { placed: false, slots };
  };

  const returnTradeSlotsToInventory = (slots = tradeSlotsRef.current) => {
    const returning = slots.filter(Boolean);
    if (returning.length === 0) return;
    let nextInventory = [...slotItemsRef.current];
    returning.forEach((item) => {
      nextInventory = addStackToSlots(nextInventory, item);
    });
    commitSlotItems(nextInventory);
    commitTradeSlots(Array(4).fill(null), false);
    setLocalReady(false);
  };

  const moveCursorToEvent = (event: React.MouseEvent) => {
    const nativeEvent = event.nativeEvent as MouseEvent;
    setCursorPos({
      x: Number.isFinite(nativeEvent.clientX) ? nativeEvent.clientX : event.clientX,
      y: Number.isFinite(nativeEvent.clientY) ? nativeEvent.clientY : event.clientY,
    });
  };

  const getAnchoredMenuPosition = (event: React.MouseEvent) => {
    const nativeEvent = event.nativeEvent as MouseEvent;
    const rawX = Number.isFinite(nativeEvent.clientX) ? nativeEvent.clientX : event.clientX;
    const rawY = Number.isFinite(nativeEvent.clientY) ? nativeEvent.clientY : event.clientY;
    const width = 176;
    const height = 260;
    const margin = 8;
    const viewportWidth = typeof document !== "undefined" ? document.documentElement.clientWidth : 1024;
    const viewportHeight = typeof document !== "undefined" ? document.documentElement.clientHeight : 768;
    const x = Math.min(Math.max(rawX, margin), Math.max(margin, viewportWidth - width - margin));
    const y = Math.min(Math.max(rawY, margin), Math.max(margin, viewportHeight - height - margin));
    return { x, y };
  };

  const moveSlot = (from: number, to: number) => {
    if (from === to) return;
    const next = [...slotItemsRef.current];
    const moving = next[from];
    next[from] = next[to];
    next[to] = moving;
    commitSlotItems(next);
  };

  const cloneStack = (item: any, quantity = Number(item?.quantity || 0)) => item ? {
    ...item,
    quantity,
    sources: takeSources(item, quantity),
  } : null;
  const isBoosterItem = (item: any) => item?.item_slug === STAT_BOOST_SLUG;
  const isEventTicketItem = (item: any) => String(item?.item_slug || "").startsWith("event_ticket:");
  const isMembershipItem = (item: any) => String(item?.item_slug || "").startsWith("membership:");
  const isAvatarFrameItem = (item: any) => isAvatarFrameSlug(item?.item_slug);
  const isProfileTransitionItem = (item: any) => isProfileTransitionSlug(item?.item_slug);
  const isEmulatorShellItem = (item: any) => isEmulatorShellSlug(item?.item_slug);
  const itemActiveUntil = (item: any) => getStatBoostActiveUntil(item);
  const itemIsActive = (item: any) => isStatBoostActive(item);
  const boosterIsExpired = (item: any) => isStatBoostExpired(item);
  const boosterUsedByMe = (item: any) => Array.isArray(item?.metadata?.used_by_users) && item.metadata.used_by_users.includes(userId);
  const boosterCanBeUsed = (item: any) => isBoosterItem(item) && !itemIsActive(item) && !boosterUsedByMe(item);
  const itemLabel = (item: any) => item?.item_name || (isMembershipItem(item) ? "Membresia" : isEventTicketItem(item) ? "Entrada de evento" : "Objeto");
  const markStackSeen = (item: any) => {
    const ids = getInventoryItemSourceIds(item);
    if (ids.length === 0) return;
    markInventoryItemIdsSeen(userId, ids);
    setSeenVersion((value) => value + 1);
  };
  const ItemIcon = ({ item, className }: { item: any; className?: string }) => (
    isSkinItem(item) && getSkinThumbnailUrl(item.item_slug)
      ? <img src={getSkinThumbnailUrl(item.item_slug) || ""} alt="" className={cn("h-full w-full rounded-sm object-cover", className)} />
      : isAvatarFrameItem(item)
      ? <img src={getAvatarFrame(item.item_slug)?.thumbnailUrl} alt="" className={cn("h-full w-full object-contain", className)} />
      : isProfileTransitionItem(item)
      ? item?.item_slug === "varita_magica" ? <VaritaMagicaIcon className={className} /> : item?.item_slug?.startsWith("boomshacka") ? <Bomb className={className} /> : <Flame className={className} />
      : isEmulatorShellItem(item)
      ? <img src={getEmulatorShell(item.item_slug)?.thumbnailUrl} alt="" className={cn("h-full w-full rounded-sm object-cover", className)} />
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

  const quickMoveToTrade = (slotIndex: number) => {
    const item = slotItemsRef.current[slotIndex];
    if (!item) return;
    const result = placeStackInTradeSlots(tradeSlotsRef.current, item);
    if (!result.placed) {
      toast({ title: "Barra de trueque llena", variant: "destructive" });
      return;
    }
    const nextInventory = [...slotItemsRef.current];
    nextInventory[slotIndex] = null;
    commitTradeSlots(result.slots);
    commitSlotItems(nextInventory);
  };

  const handleSlotLeftClick = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    moveCursorToEvent(event);
    if (suppressClick) return;
    setContextMenu(null);
    const item = slotItemsRef.current[index];
    if (item) markStackSeen(item);
    if (event.shiftKey && item) {
      quickMoveToTrade(index);
      return;
    }
    const next = [...slotItemsRef.current];
    const target = next[index];
    const hand = cursorItemRef.current;
    if (!hand && target) {
      commitCursorItem(cloneStack(target));
      next[index] = null;
    } else if (hand && !target) {
      next[index] = cloneStack(hand);
      commitCursorItem(null);
    } else if (hand && target) {
      if (canStackTogether(target, hand)) {
        next[index] = combineStacks(target, hand);
        commitCursorItem(null);
      } else {
        next[index] = cloneStack(hand);
        commitCursorItem(cloneStack(target));
      }
    }
    commitSlotItems(next);
  };

  const handleSlotRightClick = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    moveCursorToEvent(event);
    setContextMenu(null);
    const next = [...slotItemsRef.current];
    const target = next[index];
    const hand = cursorItemRef.current;
    if (target) markStackSeen(target);
    if (hand) {
      if (!target) {
        const { picked, remainder } = splitStackItem(hand, 1);
        next[index] = picked;
        commitCursorItem(remainder);
      } else if (canStackTogether(target, hand)) {
        const { picked, remainder } = splitStackItem(hand, 1);
        next[index] = picked ? combineStacks(target, picked) : target;
        commitCursorItem(remainder);
      }
    } else if (target && Number(target.quantity || 0) > 1) {
      const picked = Math.floor(Number(target.quantity || 0) / 2);
      const split = splitStackItem(target, picked);
      next[index] = split.remainder;
      commitCursorItem(split.picked);
    } else if (target) {
      setContextMenu({ item: target, slot: index, ...getAnchoredMenuPosition(event) });
    }
    commitSlotItems(next);
  };

  const handleSlotDoubleClick = (index: number) => {
    const item = slotItemsRef.current[index] || cursorItemRef.current;
    if (!item) return;
    markStackSeen(item);
    let collected: any = null;
    if (cursorItemRef.current && !canStackTogether(cursorItemRef.current, item)) return;
    if (cursorItemRef.current) collected = cloneStack(cursorItemRef.current);
    const next = slotItemsRef.current.map((slot) => {
      if (canStackTogether(slot, item)) {
        collected = collected ? combineStacks(collected, slot) : cloneStack(slot);
        return null;
      }
      return slot;
    });
    commitCursorItem(collected);
    commitSlotItems(next);
  };

  const beginDistribution = (index: number, mode: "even" | "single", event: React.MouseEvent) => {
    if (!cursorItemRef.current) return;
    event.preventDefault();
    moveCursorToEvent(event);
    setDragMode(mode);
    setDragTouched(slotItemsRef.current[index] ? [] : [index]);
  };

  const touchDistributionSlot = (index: number) => {
    if (!dragMode) return;
    setDragTouched((current) => {
      if (current.includes(index) || slotItemsRef.current[index]) return current;
      const available = Math.max(0, Math.floor(Number(cursorItemRef.current?.quantity || 0)));
      if (available <= 0 || current.length >= available) return current;
      return [...current, index];
    });
  };

  const finishDistribution = () => {
    const hand = cursorItemRef.current;
    if (!dragMode || !hand || dragTouched.length === 0) {
      setDragMode(null);
      setDragTouched([]);
      return;
    }
    if (dragTouched.length <= 1) {
      setDragMode(null);
      setDragTouched([]);
      return;
    }

    const next = [...slotItemsRef.current];
    const emptyTouched = dragTouched.filter((index) => !next[index]);
    let distributed = false;
    if (emptyTouched.length > 0) {
      const available = Number(hand.quantity || 0);
      if (dragMode === "single") {
        const count = Math.min(available, emptyTouched.length);
        let currentHand = hand;
        emptyTouched.slice(0, count).forEach((slotIndex) => {
          const split = splitStackItem(currentHand, 1);
          if (split.picked) {
            next[slotIndex] = split.picked;
            distributed = true;
          }
          currentHand = split.remainder;
        });
        commitCursorItem(currentHand);
      } else {
        const perSlot = Math.floor(available / emptyTouched.length);
        if (perSlot > 0) {
          let currentHand = hand;
          emptyTouched.forEach((slotIndex) => {
            const split = splitStackItem(currentHand, perSlot);
            if (split.picked) {
              next[slotIndex] = split.picked;
              distributed = true;
            }
            currentHand = split.remainder;
          });
          commitCursorItem(currentHand);
        }
      }
    }
    if (distributed) commitSlotItems(next);
    setDragMode(null);
    setDragTouched([]);
    if (distributed) {
      setSuppressClick(true);
      window.setTimeout(() => setSuppressClick(false), 0);
    }
  };

  const handleTradeSlotClick = (index: number, event?: React.MouseEvent) => {
    if (event) moveCursorToEvent(event);
    const next = [...tradeSlotsRef.current];
    const target = next[index];
    const hand = cursorItemRef.current;
    if (hand && !target) {
      next[index] = cloneStack(hand);
      commitCursorItem(null);
    } else if (hand && canStackTogether(target, hand)) {
      next[index] = combineStacks(target, hand);
      commitCursorItem(null);
    } else if (hand && target) {
      next[index] = cloneStack(hand);
      commitCursorItem(cloneStack(target));
    } else if (!hand && target) {
      commitCursorItem(cloneStack(target));
      next[index] = null;
    }
    commitTradeSlots(next);
  };

  const handleSellSlotClick = (index: number, event?: React.MouseEvent) => {
    if (event) moveCursorToEvent(event);
    const next = [...sellSlotsRef.current];
    const target = next[index];
    const hand = cursorItemRef.current;
    
    if (hand && !target) {
      next[index] = cloneStack(hand);
      commitCursorItem(null);
    } else if (hand && canStackTogether(target, hand)) {
      next[index] = combineStacks(target, hand);
      commitCursorItem(null);
    } else if (hand && target) {
      next[index] = cloneStack(hand);
      commitCursorItem(cloneStack(target));
    } else if (!hand && target) {
      commitCursorItem(cloneStack(target));
      next[index] = null;
    }
    setSellSlots(next);
  };

  const handleSellItems = async (items: any[] = sellSlots.filter(Boolean), sourceSlot?: number | null) => {
    const itemsToSell = items.filter(Boolean);
    if (itemsToSell.length === 0) return;
    
    if (!confirm("Â¿Vender estos items por la mitad de su precio original? Esta acciÃ³n es irreversible.")) return;

    setBusy(true);
    try {
      let totalStatsRefund = 0;
      let totalFCoinsRefund = 0;
      const idsToDelete: string[] = [];

      for (const stack of itemsToSell) {
        const info = priceMap[stack?.item_slug];
        if (info) {
          const refundPerItem = Math.floor(info.price / 2);
          const stackRefund = refundPerItem * (stack?.quantity || 1);
          
          if (info.type === 'stats') totalStatsRefund += stackRefund;
          else totalFCoinsRefund += stackRefund;
          
          stackSources(stack).forEach(s => idsToDelete.push(s.id));
        }
      }

      if (idsToDelete.length === 0) {
        toast({ title: "Error", description: "Estos objetos no tienen valor de re-venta.", variant: "destructive" });
        return;
      }

      // Paso 1: Verificar que los items existen antes de eliminar
      const { data: existingItems, error: checkError } = await ((supabase as any)
        .from('user_inventory')
        .select('id')
        .eq('user_id', userId)
        .in('id', idsToDelete));
      
      if (checkError) throw checkError;
      if (!existingItems || existingItems.length !== idsToDelete.length) {
        throw new Error('Algunos items no existen o no te pertenecen.');
      }

      // Paso 2: Eliminar los items
      const { error: delError } = await ((supabase as any).from('user_inventory')
        .delete()
        .eq('user_id', userId)
        .in('id', idsToDelete));
      
      if (delError) throw delError;

      // Paso 3: Verificar que se eliminaron
      const { data: afterDelete } = await ((supabase as any)
        .from('user_inventory')
        .select('id')
        .eq('user_id', userId)
        .in('id', idsToDelete));
      
      if (afterDelete && afterDelete.length > 0) {
        throw new Error('Fallo al eliminar los items. Intenta de nuevo.');
      }

      if (totalStatsRefund > 0) {
        const { data: prof } = await supabase.from('profiles').select('total_score').eq('user_id', userId as any).single();
        const currentStats = prof?.total_score || 0;
        await supabase.from('profiles').update({ total_score: currentStats + totalStatsRefund }).eq('user_id', userId as any);
        onStatChange?.();
      }

      if (totalFCoinsRefund > 0) {
        const { data: walletRow } = await supabase.from('point_wallets' as any).select('balance').eq('user_id', userId).single();
        const currentFCoins = (walletRow as any)?.balance || 0;
        const nextBalance = currentFCoins + totalFCoinsRefund;
        await supabase.from('point_wallets' as any).update({ balance: nextBalance } as any).eq('user_id', userId);
        setWallet(nextBalance);
        onWalletChange?.(nextBalance);
      }

      if (typeof sourceSlot === "number") {
        const next = [...slotItemsRef.current];
        next[sourceSlot] = null;
        commitSlotItems(next, false);
      }
      setSellSlots(Array(4).fill(null));
      toast({ 
        title: "Â¡Venta completada!", 
        description: `Recuperaste ${totalStatsRefund > 0 ? `${totalStatsRefund.toLocaleString()} STATS` : ''} ${totalStatsRefund > 0 && totalFCoinsRefund > 0 ? 'y' : ''} ${totalFCoinsRefund > 0 ? `${totalFCoinsRefund.toLocaleString()} F-coins` : ''}.` 
      });
      void loadInventory();
    } catch (err: any) {
      toast({ title: "Error al vender", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const canSellItem = (item: any) => Boolean(item?.item_slug && priceMap[item.item_slug]);

  const isSkinItem = (item: any) => item?.item_slug && (ALL_SKINS as any)[item.item_slug];
  const activeEquipmentEntries = useMemo(() => {
    const skinEntries = Object.entries(activeSkins)
      .filter(([skinType]) => skinType !== 'avatar_frame' && skinType !== 'profile_transition' && skinType !== 'emulator_shell')
      .map(([skinType, skinSlug]) => {
        const skin = (ALL_SKINS as any)[skinSlug];
        return skin ? { kind: 'skin' as const, skinType, slug: skinSlug, name: skin.name } : null;
      })
      .filter(Boolean) as { kind: 'skin' | 'avatar_frame' | 'profile_transition' | 'emulator_shell'; skinType: string; slug: string; name: string }[];
    if (activeAvatarFrame) {
      skinEntries.push({
        kind: 'avatar_frame',
        skinType: 'avatar_frame',
        slug: activeAvatarFrame.slug,
        name: activeAvatarFrame.name,
      });
    }
    if (activeProfileTransition) {
      skinEntries.push({
        kind: 'profile_transition',
        skinType: 'profile_transition',
        slug: activeProfileTransition.slug,
        name: activeProfileTransition.name,
      });
    }
    if (activeEmulatorShell) {
      skinEntries.push({
        kind: 'emulator_shell',
        skinType: 'emulator_shell',
        slug: activeEmulatorShell.slug,
        name: activeEmulatorShell.name,
      });
    }
    return skinEntries.slice(0, 5);
  }, [activeAvatarFrame, activeEmulatorShell, activeProfileTransition, activeSkins]);
  const activeSkinEntries = useMemo(
    () => Object.entries(activeSkins)
      .map(([skinType, skinSlug]) => {
        const skin = (ALL_SKINS as any)[skinSlug];
        return skin ? { skinType, skinSlug, skin } : null;
      })
      .filter(Boolean) as { skinType: string; skinSlug: string; skin: any }[],
    [activeSkins],
  );

  const handleActivateSkin = async (skinSlug: string) => {
    const skin = (ALL_SKINS as any)[skinSlug];
    if (!skin) return;
    const skinType = skin.type || 'launcher';
    
    setContextMenu(null);
    setBusy(true);
    try {
      const result = (supabase as any)
        .from('user_active_skins')
        .select('id')
        .eq('user_id', userId)
        .eq('skin_type', skinType)
        .maybeSingle();
      const { data: existing } = await result;

      if (existing) {
        const { error: updateError } = await (supabase as any)
          .from('user_active_skins')
          .update({ skin_slug: skinSlug })
          .eq('id', (existing as any).id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_active_skins' as any)
          .insert({ user_id: userId, skin_type: skinType, skin_slug: skinSlug } as any);
        if (insertError) throw insertError;
      }

      setActiveSkins(prev => ({ ...prev, [skinType]: skinSlug }));
      window.dispatchEvent(new CustomEvent('forbiddens:active-skin-updated', { detail: { userId, skinType, skinSlug } }));
      toast({ title: "âœ… Skin Equipada", description: `Has activado la skin "${skin.name}"` });
    } catch (err: any) {
      console.error('Error activating skin:', err);
      toast({ title: "Error", description: err?.message || "No se pudo equipar la skin", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDeactivateSkin = async (skinType: string) => {
    setContextMenu(null);
    setBusy(true);
    try {
      const { error: deleteError } = await (supabase as any)
        .from('user_active_skins')
        .delete()
        .eq('user_id', userId)
        .eq('skin_type', skinType);
      if (deleteError) throw deleteError;

      setActiveSkins(prev => {
        const updated = { ...prev };
        delete updated[skinType];
        return updated;
      });
      window.dispatchEvent(new CustomEvent('forbiddens:active-skin-updated', { detail: { userId, skinType, skinSlug: 'default' } }));
      if (skinType === 'avatar_frame') {
        window.dispatchEvent(new CustomEvent('forbiddens:active-avatar-frame-updated', { detail: { userId, frameSlug: null } }));
        toast({ title: "Marco desequipado", description: "Tu avatar volvera al marco del tema activo." });
      } else if (skinType === 'profile_transition') {
        window.dispatchEvent(new CustomEvent('forbiddens:active-profile-transition-updated', { detail: { userId, transitionSlug: null } }));
        toast({ title: "Transicion desequipada", description: "Tu perfil ya no mostrara esta intro." });
      } else if (skinType === 'emulator_shell') {
        window.dispatchEvent(new CustomEvent('forbiddens:active-emulator-shell-updated', { detail: { userId, shellSlug: null } }));
        toast({ title: "Consola desequipada", description: "Los emuladores web volveran al marco original." });
      } else {
        toast({ title: "âœ… Skin Desequipada", description: "Has vuelto al diseÃ±o original" });
      }
    } catch (err: any) {
      console.error('Error deactivating skin:', err);
      toast({ title: "Error", description: err?.message || "No se pudo desequipar", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleActivateAvatarFrame = async (frameSlug: string) => {
    const frame = getAvatarFrame(frameSlug);
    if (!frame) return;
    setContextMenu(null);
    setBusy(true);
    try {
      const { data: existing } = await (supabase as any)
        .from('user_active_skins')
        .select('id')
        .eq('user_id', userId)
        .eq('skin_type', 'avatar_frame')
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from('user_active_skins')
          .update({ skin_slug: frameSlug })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('user_active_skins')
          .insert({ user_id: userId, skin_type: 'avatar_frame', skin_slug: frameSlug });
        if (error) throw error;
      }

      setActiveSkins((prev) => ({ ...prev, avatar_frame: frameSlug }));
      window.dispatchEvent(new CustomEvent('forbiddens:active-avatar-frame-updated', { detail: { userId, frameSlug } }));
      toast({ title: "Marco equipado", description: `${frame.name} reemplazara el marco del tema en tu avatar.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo equipar el marco", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleActivateProfileTransition = async (transitionSlug: string) => {
    const transition = getProfileTransition(transitionSlug);
    if (!transition) return;
    setContextMenu(null);
    setBusy(true);
    try {
      const { data: existing } = await (supabase as any)
        .from('user_active_skins')
        .select('id')
        .eq('user_id', userId)
        .eq('skin_type', 'profile_transition')
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from('user_active_skins')
          .update({ skin_slug: transitionSlug })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('user_active_skins')
          .insert({ user_id: userId, skin_type: 'profile_transition', skin_slug: transitionSlug });
        if (error) throw error;
      }

      setActiveSkins((prev) => ({ ...prev, profile_transition: transitionSlug }));
      window.dispatchEvent(new CustomEvent('forbiddens:active-profile-transition-updated', { detail: { userId, transitionSlug } }));
      window.dispatchEvent(new CustomEvent('forbiddens:play-profile-transition', { detail: { slug: transitionSlug } }));
      toast({ title: "Transicion equipada", description: `${transition.name} se reproducira en tu perfil publico.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo equipar la transicion", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleActivateEmulatorShell = async (shellSlug: string) => {
    const shell = getEmulatorShell(shellSlug);
    if (!shell) return;
    setContextMenu(null);
    setBusy(true);
    try {
      const { data: existing } = await (supabase as any)
        .from('user_active_skins')
        .select('id')
        .eq('user_id', userId)
        .eq('skin_type', 'emulator_shell')
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from('user_active_skins')
          .update({ skin_slug: shellSlug })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('user_active_skins')
          .insert({ user_id: userId, skin_type: 'emulator_shell', skin_slug: shellSlug });
        if (error) throw error;
      }

      setActiveSkins((prev) => ({ ...prev, emulator_shell: shellSlug }));
      window.dispatchEvent(new CustomEvent('forbiddens:active-emulator-shell-updated', { detail: { userId, shellSlug } }));
      window.dispatchEvent(new CustomEvent('forbiddens:active-skin-updated', { detail: { userId, skinType: 'emulator_shell', skinSlug: shellSlug } }));
      toast({ title: "Consola equipada", description: `${shell.name} se aplicara a juegos NES web.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "No se pudo equipar la consola", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const convertStatToFcoin = async () => {
    const amount = Math.max(0, Math.floor(Number(statToConvert) || 0));
    if (amount <= 0) {
      toast({ title: "Ingresa una cantidad", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("convert_stat_points_to_fcoins", { p_points: amount });
    setBusy(false);
    if (error) {
      toast({ title: "No se pudo convertir", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as any;
    if (result?.ok === false) {
      toast({ title: "Conversion rechazada", description: result.reason || "Sin saldo suficiente", variant: "destructive" });
      return;
    }
    toast({ title: "F-coin cargada", description: `+${amount.toLocaleString()} F-coin` });
    if (typeof result?.wallet_balance === "number") {
      const nextWallet = Number(result.wallet_balance);
      setWallet(nextWallet);
      onWalletChange?.(nextWallet);
    }
    onStatChange?.();
  };

  const convertFcoinToStat = async () => {
    const amount = Math.max(0, Math.floor(Number(fcoinToConvert) || 0));
    if (amount <= 0) {
      toast({ title: "Ingresa una cantidad", variant: "destructive" });
      return;
    }
    if (amount % 5 !== 0) {
      toast({ title: "Cantidad invalida", description: "Usa multiplos de 5 F-coin. Cada 5 F-coin valen 1 punto STAT.", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("convert_fcoins_to_stat_points", { p_points: amount });
    setBusy(false);
    if (error) {
      toast({ title: "No se pudo convertir", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as any;
    if (result?.ok === false) {
      toast({ title: "Conversion rechazada", description: result.reason || "F-coin insuficiente", variant: "destructive" });
      return;
    }
    const statAwarded = Number(result?.stat_awarded ?? Math.floor(amount / 5));
    toast({ title: "STAT recuperado", description: `+${statAwarded.toLocaleString()} puntos STAT por ${amount.toLocaleString()} F-coin` });
    if (typeof result?.wallet_balance === "number") {
      const nextWallet = Number(result.wallet_balance);
      setWallet(nextWallet);
      onWalletChange?.(nextWallet);
    }
    onStatChange?.();
  };

  const sendStackToTrade = (slotIndex: number) => {
    const item = slotItemsRef.current[slotIndex];
    if (!item) return;
    const qty = Math.max(1, Number(item.quantity || 1));
    quickMoveToTrade(slotIndex);
    setContextMenu(null);
    toast({ title: "Item listo para trueque", description: `Se colocaron ${qty} en el cuadro de trueque.` });
  };

  const useBooster = async (item: any) => {
    setContextMenu(null);
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("use_inventory_booster", { p_stack_id: item.id });
    setBusy(false);
    if (error) {
      toast({ title: "No se pudo usar", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as any;
    if (result?.ok === false) {
      toast({ title: "No se pudo usar", description: result.reason || "Item no disponible", variant: "destructive" });
      return;
    }
    const expiresAt = result?.active_until ? new Date(result.active_until).toLocaleString("es-CL") : null;
    toast({ title: "Potenciador activado", description: expiresAt ? `x3 puntos activo hasta ${expiresAt}.` : "x3 puntos por 7 dias." });
    void loadInventory();
    window.dispatchEvent(new Event(STAT_BOOST_REFRESH_EVENT));
  };

  const useMembership = async (item: any) => {
    setContextMenu(null);
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("use_inventory_membership", { p_stack_id: item.id });
    setBusy(false);
    if (error) {
      toast({ title: "No se pudo activar", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as any;
    if (result?.ok === false) {
      toast({ title: "No se pudo activar", description: result.reason || "Membresia no disponible", variant: "destructive" });
      return;
    }
    const expires = result?.expires_at ? new Date(result.expires_at).toLocaleDateString() : "30 dias";
    const boosters = Number(result?.boosters_granted || 0);
    toast({
      title: "Membresia activada",
      description: `${result?.tier_label || itemLabel(item)} activa hasta ${expires}.${boosters > 0 ? ` +${boosters} potenciadores en inventario.` : ""}`,
    });
    void loadInventory();
  };

  const openSplitStack = (item: any) => {
    setContextMenu(null);
    setSplitTarget(item);
    setSplitQuantity("1");
  };

  const openDiscardStack = (item: any, slot: number | null, fromCursor = false) => {
    if (!item) return;
    markStackSeen(item);
    setContextMenu(null);
    setDiscardTarget({ item: cloneStack(item), slot, fromCursor });
  };

  const discardStack = async () => {
    if (!discardTarget?.item || busy) return;
    const items = stackSources(discardTarget.item).map((source: any) => ({
      id: source.id,
      quantity: source.quantity,
    }));
    if (items.length === 0) return;
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("discard_inventory_items", { p_items: items });
    setBusy(false);
    if (error) {
      toast({ title: "No se pudo desechar", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as any;
    if (result?.ok === false) {
      toast({ title: "No se pudo desechar", description: result.reason || "Item no disponible", variant: "destructive" });
      return;
    }

    if (discardTarget.fromCursor) {
      commitCursorItem(null);
    } else if (typeof discardTarget.slot === "number") {
      const next = [...slotItemsRef.current];
      next[discardTarget.slot] = null;
      commitSlotItems(next, false);
    }
    toast({ title: "Item desechado", description: "El objeto fue eliminado de tu inventario." });
    setDiscardTarget(null);
    void loadInventory();
  };

  const splitStack = async () => {
    if (!splitTarget) return;
    const available = Number(splitTarget.quantity || 0);
    const qty = Math.max(1, Math.floor(Number(splitQuantity) || 1));
    if (qty >= available) {
      toast({ title: "Cantidad invalida", description: `Puedes separar entre 1 y ${Math.max(1, available - 1)}.`, variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await (supabase as any).rpc("split_inventory_stack", {
      p_stack_id: splitTarget.id,
      p_quantity: qty,
    });
    setBusy(false);
    if (error) {
      toast({ title: "No se pudo separar", description: error.message, variant: "destructive" });
      return;
    }
    const result = data as any;
    if (result?.ok === false) {
      toast({ title: "No se pudo separar", description: result.reason || "Cantidad invalida", variant: "destructive" });
      return;
    }
    toast({ title: "Item separado", description: `${qty} item(s) movidos a un nuevo slot.` });
    setSplitTarget(null);
    void loadInventory();
  };

  const answerOffer = async (offerId: string, action: "accept" | "cancel") => {
    setBusy(true);
    const rpcName = action === "accept" ? "accept_inventory_trade_offer" : "cancel_inventory_trade_offer";
    const { error } = await (supabase as any).rpc(rpcName, { p_offer_id: offerId });
    setBusy(false);
    if (error) {
      toast({ title: "No se pudo actualizar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: action === "accept" ? "Trueque aceptado" : "Trueque cancelado" });
    void loadInventory();
  };

  const cursorOverlay = cursorItem && typeof document !== "undefined" ? createPortal(
    <div
      className="pointer-events-none fixed z-[10000] h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-[#d6b16f] bg-[#3b2d21] shadow-2xl shadow-black/70"
      style={{ left: cursorPos.x, top: cursorPos.y }}
    >
      <ItemIcon item={cursorItem} className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-neon-yellow drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" />
      <span className="absolute bottom-0.5 right-1 font-pixel text-[8px] text-white">x{cursorItem.quantity}</span>
    </div>,
    document.body,
  ) : null;

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="demoniaco-inventory-equipment-shell rounded border border-border bg-card p-4">
        <div className="demoniaco-shell-ornaments" aria-hidden="true" />
        <div className="inventory-equipment-grid grid gap-3 xl:grid-cols-2">
        <div className="demoniaco-inventory-panel rounded border-2 border-[#5b4631] bg-[#2b2119] p-3 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-pixel text-[10px] uppercase text-[#f7d28b] flex items-center gap-2">
              <InventoryIcon className="h-4 w-4" /> Inventario
            </h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={!cursorItem || busy}
                onClick={() => openDiscardStack(cursorItem, null, true)}
                className="h-8 w-8 border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-100 disabled:opacity-35"
                title={cursorItem ? "Desechar item en el cursor" : "Toma un item y presiona aqui para desecharlo"}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {!schemaReady && (
            <div className="mb-3 rounded border border-neon-yellow/40 bg-neon-yellow/10 p-3 text-[11px] text-muted-foreground">
              Falta correr la migracion de inventario para activar trueques, stacks y saldo comerciable. Mientras tanto uso tus puntos actuales como vista previa.
            </div>
          )}

          <div className="demoniaco-inventory-mini-stats mb-3 grid gap-1.5 text-[9px] text-muted-foreground sm:grid-cols-3">
            <div className="rounded border border-[#8b6d46]/50 bg-black/20 px-2 py-1.5">F-coins: {loading ? "..." : wallet.toLocaleString()}</div>
            <div className="rounded border border-[#8b6d46]/50 bg-black/20 px-2 py-1.5">
              STAT: {Number(profile?.total_score || 0).toLocaleString()}
              {activeInventoryStatBoost.active && <span className="ml-1 rounded bg-neon-green/15 px-1 font-pixel text-[7px] uppercase text-neon-green">x{activeInventoryStatBoost.multiplier}</span>}
            </div>
            <div className="rounded border border-[#8b6d46]/50 bg-black/20 px-2 py-1.5">Objetos: {boosters.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toLocaleString()}</div>
          </div>

          {false && activeSkinEntries.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {activeSkinEntries.map(({ skinType, skinSlug, skin }) => (
                <button
                  key={`${skinType}:${skinSlug}`}
                  type="button"
                  onClick={() => handleDeactivateSkin(skinType)}
                  disabled={busy}
                  className="demoniaco-active-skin-chip flex h-8 min-w-0 items-center gap-1.5 rounded border border-neon-green/40 bg-neon-green/10 px-2 text-left text-[9px] text-neon-green transition-colors hover:border-red-400/70 hover:text-red-200 disabled:opacity-60"
                  title={`Desequipar ${skin.name}`}
                >
                  <Palette className="h-3.5 w-3.5 shrink-0" />
                  <span className="font-pixel uppercase">{skinType}</span>
                  <span className="max-w-[120px] truncate font-body text-[10px] text-foreground/85">{skin.name}</span>
                  <XIcon className="h-3 w-3 shrink-0 opacity-70" />
                </button>
              ))}
            </div>
          )}

          <div
            ref={inventoryGridRef}
            className="inventory-slot-grid grid gap-2 rounded border border-black/60 bg-[#1b140f] p-2"
            style={{
              gridTemplateColumns: `repeat(${inventoryColumns}, minmax(0, 1fr))`,
              width: "100%",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {visibleSlotItems.map((item, pageIndex) => {
              const index = visibleInventoryStart + pageIndex;
              return (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div
                    onClick={(event) => handleSlotLeftClick(index, event)}
                    onDoubleClick={() => handleSlotDoubleClick(index)}
                    onMouseDown={(event) => {
                      if (event.button === 0 && cursorItem) beginDistribution(index, "even", event);
                      if (event.button === 2 && cursorItem) beginDistribution(index, "single", event);
                    }}
                    onMouseEnter={() => touchDistributionSlot(index)}
                    onContextMenu={(event) => {
                      handleSlotRightClick(index, event);
                    }}
                    className={cn(
                      "demoniaco-item-frame relative aspect-square select-none rounded-sm border bg-[#3b2d21] shadow-[inset_2px_2px_0_rgba(255,255,255,0.12),inset_-2px_-2px_0_rgba(0,0,0,0.5)] transition-colors",
                      item ? "cursor-pointer border-[#d6b16f] bg-[radial-gradient(circle_at_35%_25%,rgba(250,204,21,0.22),#3b2d21_55%)]" : "border-[#6b5236]",
                      item && isBoosterItem(item) && itemIsActive(item) && "border-neon-green/80 bg-[radial-gradient(circle_at_35%_25%,rgba(34,197,94,0.32),rgba(18,64,31,0.82)_58%,#0c160f_100%)] shadow-[inset_2px_2px_0_rgba(255,255,255,0.14),inset_-2px_-2px_0_rgba(0,0,0,0.55),0_0_14px_rgba(34,197,94,0.45)]",
                      dragTouched.includes(index ?? -1) && "ring-2 ring-neon-cyan",
                      item && isSkinItem(item) && activeSkins[(ALL_SKINS as any)[item.item_slug!]?.type || 'launcher'] === item.item_slug && "ring-2 ring-neon-green shadow-[0_0_12px_rgba(34,197,94,0.7)]",
                      item && isEmulatorShellItem(item) && activeEmulatorShellSlug === item.item_slug && "ring-2 ring-neon-green shadow-[0_0_12px_rgba(34,197,94,0.7)]",
                    )}
                    title={item ? `${itemLabel(item)} - click izquierdo recoge. Click derecho divide. Shift+click envia a trueque.` : "Slot vacio"}
                  >

                    {item && (() => {
                      const itemIsNew = isInventoryItemUnseen(userId, item);
                      const itemBoosterExpired = isBoosterItem(item) && boosterIsExpired(item);
                      void seenVersion;
                      return (
                      <div className="flex h-full w-full items-center justify-center">
                        <div className={cn(
                          "relative grid h-[72%] w-[72%] place-items-center rounded-sm border shadow-[inset_2px_2px_0_rgba(255,255,255,0.18),inset_-2px_-2px_0_rgba(0,0,0,0.45),0_0_12px_rgba(250,204,21,0.25)]",
                          isSkinItem(item) && getSkinThumbnailUrl(item.item_slug) && "inventory-demoniaco-thumbnail-card overflow-hidden border-red-500/70 bg-[#2a0906]",
                          isAvatarFrameItem(item) && "overflow-hidden border-pink-300/70 bg-[#3a1730]",
                          isProfileTransitionItem(item) && "overflow-hidden border-orange-300/70 bg-[#2b1006]",
                          isEmulatorShellItem(item) && "overflow-hidden border-pink-300/80 bg-pink-100",
                          isMembershipItem(item)
                            ? "border-neon-magenta/70 bg-[#4a235e]"
                            : isEventTicketItem(item)
                              ? "border-neon-cyan/70 bg-[#14354a]"
                              : isSkinItem(item)
                                ? "border-neon-cyan/70 bg-[#0a2e2e]"
                              : "border-[#f7d28b]/70 bg-[#6b4a1f]",
                          isBoosterItem(item) && itemIsActive(item) && "border-neon-green/80 bg-[#18351f] shadow-[inset_2px_2px_0_rgba(255,255,255,0.16),inset_-2px_-2px_0_rgba(0,0,0,0.5),0_0_14px_rgba(34,197,94,0.5)]",
                        )}>
                          <div className={cn(
                            "absolute inset-1 rounded-sm border border-black/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_45%)]",
                            (isSkinItem(item) && getSkinThumbnailUrl(item.item_slug) || isAvatarFrameItem(item) || isProfileTransitionItem(item) || isEmulatorShellItem(item)) && "hidden",
                          )} />
                          <ItemIcon
                            item={item}
                            className={cn(
                              isSkinItem(item) && getSkinThumbnailUrl(item.item_slug) || isAvatarFrameItem(item) || isProfileTransitionItem(item) || isEmulatorShellItem(item) ? "relative h-full w-full" : "relative h-5 w-5 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]",
                              itemBoosterExpired
                                ? "text-zinc-400 grayscale opacity-70 drop-shadow-none"
                                : isProfileTransitionItem(item) ? item?.item_slug?.startsWith("boomshacka") ? "text-red-200 drop-shadow-[0_0_10px_rgba(248,113,113,0.75)]" : "text-orange-300 drop-shadow-[0_0_10px_rgba(249,115,22,0.75)]" : isMembershipItem(item) ? "text-neon-magenta" : isEventTicketItem(item) ? "text-neon-cyan" : "text-neon-yellow",
                            )}
                          />
                        </div>
                        {isBoosterItem(item) && itemIsActive(item) && <span className="absolute left-0.5 top-0.5 rounded bg-neon-green/90 px-1 font-pixel text-[5px] text-black">ACTIVO</span>}
                        {isBoosterItem(item) && !itemIsActive(item) && boosterUsedByMe(item) && (
                          <span className="absolute left-0.5 top-0.5 rounded bg-muted px-1 font-pixel text-[5px] text-foreground">
                            {boosterIsExpired(item) ? "VENCIDO" : "USADO"}
                          </span>
                        )}
                        {isMembershipItem(item) && <span className="absolute left-0.5 top-0.5 rounded bg-neon-magenta/90 px-1 font-pixel text-[6px] text-white">30D</span>}
                        {isSkinItem(item) && activeSkins[(ALL_SKINS as any)[item.item_slug!]?.type || 'launcher'] === item.item_slug && <span className="absolute left-0.5 top-0.5 rounded bg-neon-green/90 px-1 font-pixel text-[6px] text-black">EQUIPADA</span>}
                        {isAvatarFrameItem(item) && activeAvatarFrameSlug === item.item_slug && <span className="absolute left-0.5 top-0.5 rounded bg-neon-green/90 px-1 font-pixel text-[6px] text-black">EQUIPADO</span>}
                        {isProfileTransitionItem(item) && activeProfileTransitionSlug === item.item_slug && <span className="absolute left-0.5 top-0.5 rounded bg-neon-green/90 px-1 font-pixel text-[6px] text-black">EQUIPADA</span>}
                        {isEmulatorShellItem(item) && activeEmulatorShellSlug === item.item_slug && <span className="absolute left-0.5 top-0.5 rounded bg-neon-green/90 px-1 font-pixel text-[6px] text-black">EQUIPADA</span>}

                        {itemIsNew && <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border border-black bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.9)]" />}
                        <span className="absolute bottom-0.5 right-1 font-pixel text-[8px] text-white drop-shadow-[0_1px_0_#000]">x{item.quantity}</span>
                      </div>
                      );
                    })()}
                  </div>
                </TooltipTrigger>
                {item && <TooltipContent className="bg-black/90 border-neon-yellow/50 text-neon-yellow font-pixel text-xs">{itemLabel(item)}</TooltipContent>}
              </Tooltip>
              );
            })}
          </div>

          {inventoryPageCount > 1 && (
            <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentInventoryPage === 0}
                onClick={() => setInventoryPage((page) => Math.max(0, page - 1))}
                className="h-7 px-2 text-[10px]"
              >
                Anterior
              </Button>
              <span className="font-pixel text-[8px] uppercase">
                Pagina {currentInventoryPage + 1}/{inventoryPageCount}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentInventoryPage >= inventoryPageCount - 1}
                onClick={() => setInventoryPage((page) => Math.min(inventoryPageCount - 1, page + 1))}
                className="h-7 px-2 text-[10px]"
              >
                Siguiente
              </Button>
            </div>
          )}

          <div className="hidden">
            <div className="demoniaco-inventory-meta rounded border border-[#8b6d46]/60 bg-black/20 p-2">Objetos: {boosters.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</div>
            <div className="demoniaco-inventory-meta rounded border border-[#8b6d46]/60 bg-black/20 p-2">Duracion: 7 dias</div>
            <div className="demoniaco-inventory-meta rounded border border-[#8b6d46]/60 bg-black/20 p-2">Potenciadores: {totalBoosters}</div>
          </div>

        </div>

        <div className="equipment-panel rounded border border-border bg-card/80 p-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="equipment-title flex items-center gap-2 font-pixel text-[10px] uppercase text-[#f7d28b]">
              <Swords className="h-4 w-4" />
              Equipamiento
            </h3>
            <span className="font-pixel text-[8px] text-muted-foreground">{activeEquipmentEntries.length}/5</span>
          </div>
          <div className="equipment-star relative mx-auto aspect-square w-full max-w-[320px] xl:max-w-[min(38vw,360px)]">
            {Array.from({ length: 5 }).map((_, index) => {
              const entry = activeEquipmentEntries[index];
              return (
                <button
                  key={index}
                  type="button"
                  className={cn(
                    "demoniaco-item-frame equipment-slot absolute grid aspect-square w-[31%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-sm border bg-[#1b140f] text-left transition-colors",
                    entry ? "border-neon-green/60 bg-neon-green/10" : "border-border/70 bg-black/35",
                  )}
                  style={{
                    left: ["50%", "84%", "71%", "29%", "16%"][index],
                    top: ["17%", "40%", "78%", "78%", "40%"][index],
                  }}
                  title={entry ? `${entry.skinType}: ${entry.name}` : "Slot de equipamiento"}
                  onClick={() => entry && handleDeactivateSkin(entry.skinType)}
                >
                  {entry ? (
                    <>
                      <span className="equipment-remove-marker absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-sm border border-red-400/60 bg-black/75 text-red-200 shadow-[0_0_8px_rgba(239,68,68,0.45)]">
                        <XIcon className="h-2.5 w-2.5" />
                      </span>
                      {entry.kind === "avatar_frame" ? (
                        <img src={getAvatarFrame(entry.slug)?.thumbnailUrl} alt="" className="h-[86%] w-[86%] object-contain drop-shadow-[0_0_8px_rgba(244,114,182,0.65)]" />
                      ) : entry.kind === "profile_transition" ? (
                        entry.slug === "varita_magica" ? (
                          <VaritaMagicaIcon className="h-[62%] w-[62%]" />
                        ) : entry.slug.startsWith("boomshacka") ? (
                          <Bomb className="h-5 w-5 text-red-200 drop-shadow-[0_0_8px_rgba(248,113,113,0.65)]" />
                        ) : (
                          <Flame className="h-5 w-5 text-orange-300 drop-shadow-[0_0_8px_rgba(249,115,22,0.65)]" />
                        )
                      ) : entry.kind === "emulator_shell" ? (
                        <img src={getEmulatorShell(entry.slug)?.thumbnailUrl} alt="" className="h-[82%] w-[82%] rounded-sm object-cover drop-shadow-[0_0_8px_rgba(244,114,182,0.65)]" />
                      ) : getSkinThumbnailUrl(entry.slug) ? (
                        <img src={getSkinThumbnailUrl(entry.slug) || ""} alt="" className="h-[72%] w-[72%] rounded-sm object-cover drop-shadow-[0_0_8px_rgba(34,197,94,0.65)]" />
                      ) : (
                        <Palette className="h-4 w-4 text-neon-green drop-shadow-[0_0_8px_rgba(34,197,94,0.65)]" />
                      )}
                      <span className="absolute bottom-0.5 left-1 right-1 truncate text-center font-pixel text-[5px] uppercase text-neon-green">{entry.skinType}</span>
                    </>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      <div className="demoniaco-inventory-conversion-panel demoniaco-inventory-meta grid gap-2 rounded border border-[#8b6d46]/60 bg-black/25 p-2 lg:grid-cols-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[8px] uppercase text-[#f7d28b]">STAT a F-coin</p>
            <p className="text-[10px] text-muted-foreground">Convierte puntos STAT para apostar en juegos de azar multiplayer.</p>
          </div>
          <div className="flex gap-1">
            <Input type="number" min="1" value={statToConvert} onChange={(e) => setStatToConvert(e.target.value)} className="h-8 w-24 bg-[#1b140f] text-xs" />
            <Button size="sm" onClick={convertStatToFcoin} disabled={busy || !schemaReady} className="h-8 text-[10px]">
              <Coins className="h-3.5 w-3.5" /> Cambiar
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-pixel text-[8px] uppercase text-[#f7d28b]">F-coin a STAT</p>
            <p className="text-[10px] text-muted-foreground">Retira F-coin del inventario. Cada 5 F-coin valen 1 punto STAT.</p>
          </div>
          <div className="flex gap-1">
            <Input type="number" min="5" step="5" value={fcoinToConvert} onChange={(e) => setFcoinToConvert(e.target.value)} className="h-8 w-24 bg-[#1b140f] text-xs" />
            <Button size="sm" onClick={convertFcoinToStat} disabled={busy || !schemaReady} className="h-8 text-[10px]">
              <ArrowLeftRight className="h-3.5 w-3.5" /> Retirar
            </Button>
          </div>
        </div>
      </div>

      <div className="inventory-trade-offers-grid grid gap-3 xl:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
        <div className="demoniaco-trade-panel rounded border border-neon-cyan/30 bg-card p-4">
          <h3 className="font-pixel text-[10px] uppercase text-neon-cyan flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" /> Trueque
          </h3>
          <div className="mt-3 flex gap-2">
            <Input value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} placeholder="Usuario..." className="h-8 bg-muted text-xs" />
            <Button size="icon" variant="outline" onClick={searchUsers} className="h-8 w-8">
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>

          {recipientResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {recipientResults.map((target) => (
                <button
                  key={target.user_id}
                  onClick={() => sendTradeRequest(target)}
                  className={cn("flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-xs", selectedRecipient?.user_id === target.user_id ? "border-neon-cyan bg-neon-cyan/10" : "border-border bg-muted/20")}
                >
                  <span className="h-6 w-6 overflow-hidden rounded bg-muted">{target.avatar_url ? <img src={target.avatar_url} className="h-full w-full object-cover" /> : null}</span>
                  <span className="truncate">{target.display_name}</span>
                  <span className="ml-auto rounded border border-neon-cyan/30 px-1.5 py-0.5 font-pixel text-[7px] uppercase text-neon-cyan">Solicitar</span>
                </button>
              ))}
            </div>
          )}

          {outgoingTradeRequest && !selectedRecipient && (
            <div className="mt-2 rounded border border-neon-yellow/30 bg-neon-yellow/10 p-2 text-[10px] text-neon-yellow">
              Solicitud enviada a {outgoingTradeRequest.display_name || "usuario"}. El trueque empieza cuando acepte desde inventario.
            </div>
          )}

          {selectedRecipient && (
            <div className="mt-2 rounded border border-neon-green/30 bg-neon-green/10 p-2 text-[10px] text-neon-green">
              Trueque en vivo con {selectedRecipient.display_name || "usuario"}.
            </div>
          )}

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <Input type="number" min="0" value={pointsToSend} onChange={(e) => { setPointsToSend(e.target.value); markTradeChanged(); }} placeholder="F-coin" className="h-8 bg-muted text-xs" />
            <div className="rounded border border-neon-cyan/20 bg-black/30 px-2 py-1 text-[10px] text-neon-cyan">
              {tradeItemCount} item(s)
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="demoniaco-trade-box rounded border border-neon-cyan/25 bg-black/25 p-1.5">
              <div className="mb-1 grid gap-0.5 text-[9px] font-pixel uppercase leading-tight text-neon-cyan">
                <span>Tu lado</span>
                <span className={cn("text-[8px]", localReady ? "text-neon-green" : "text-muted-foreground")}>{localReady ? "Listo" : "Editando"}</span>
              </div>
              <div className="demoniaco-trade-slots grid w-full grid-cols-2 gap-1 rounded border border-neon-cyan/30 bg-black/50 p-1">
                {tradeSlots.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={(event) => handleTradeSlotClick(index, event)}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      handleTradeSlotClick(index, event);
                    }}
                    className={cn(
                      "demoniaco-item-frame relative aspect-square rounded-sm border bg-[#1b140f] shadow-[inset_1px_1px_0_rgba(255,255,255,0.1),inset_-1px_-1px_0_rgba(0,0,0,0.5)]",
                      item ? "border-[#d6b16f]" : "border-white/10",
                    )}
                    title="Barra de trueque"
                  >
                    {item && (
                      <>
                        <ItemIcon item={item} className={cn("absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2", isMembershipItem(item) ? "text-neon-magenta" : isEventTicketItem(item) ? "text-neon-cyan" : "text-neon-yellow")} />
                        <span className="absolute bottom-0 right-0.5 font-pixel text-[7px] text-white">x{item.quantity}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-1 rounded border border-neon-cyan/20 bg-black/25 px-1.5 py-1 text-[9px] text-muted-foreground">
                Tu: {Number(pointsToSend || 0).toLocaleString()} F-coin
              </div>
            </div>
            <div className="demoniaco-trade-box rounded border border-neon-magenta/25 bg-black/25 p-1.5">
              <div className="mb-1 grid gap-0.5 text-[9px] font-pixel uppercase leading-tight text-neon-magenta">
                <span>{selectedRecipient?.display_name ? "Su lado" : "Esperando"}</span>
                <span className={cn("text-[8px]", remoteReady ? "text-neon-green" : "text-muted-foreground")}>{remoteReady ? "Listo" : "Editando"}</span>
              </div>
              <div className="demoniaco-trade-slots grid w-full grid-cols-2 gap-1 rounded border border-neon-magenta/30 bg-black/50 p-1">
                {remoteTradeSlots.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      "demoniaco-item-frame relative aspect-square rounded-sm border bg-[#1b140f] shadow-[inset_1px_1px_0_rgba(255,255,255,0.1),inset_-1px_-1px_0_rgba(0,0,0,0.5)]",
                      item ? "border-[#d6b16f]" : "border-white/10",
                    )}
                    title={item ? itemLabel(item) : "Slot remoto"}
                  >
                    {item && (
                      <>
                        <ItemIcon item={item} className={cn("absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2", isMembershipItem(item) ? "text-neon-magenta" : isEventTicketItem(item) ? "text-neon-cyan" : "text-neon-yellow")} />
                        <span className="absolute bottom-0 right-0.5 font-pixel text-[7px] text-white">x{item.quantity}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-1 rounded border border-neon-magenta/20 bg-black/25 px-1.5 py-1 text-[9px] text-muted-foreground">
                Otro: {remotePoints.toLocaleString()} F-coin
              </div>
            </div>
          </div>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota opcional..." className="mt-2 min-h-[62px] bg-muted text-xs" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant={localReady ? "outline" : "secondary"}
              onClick={() => {
                const nextReady = !localReady;
                setLocalReady(nextReady);
                void syncLiveTrade(nextReady);
              }}
              disabled={busy || !schemaReady || !selectedRecipient}
              className="h-8 text-xs"
            >
              <Check className="h-3.5 w-3.5" /> {localReady ? "Quitar listo" : "Listo"}
            </Button>
            <Button onClick={createOffer} disabled={busy || !schemaReady || !localReady || !remoteReady} className="h-8 text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Enviar trueque"}
            </Button>
          </div>
          {(selectedRecipient || tradeSlots.some(Boolean)) && (
            <Button variant="ghost" onClick={cancelTradeSession} disabled={busy} className="mt-2 h-7 w-full text-[10px] text-muted-foreground">
              Cancelar trueque y devolver items
            </Button>
          )}
        </div>

        <div className="demoniaco-offers-panel rounded border border-border bg-card p-4">
          <h3 className="font-pixel text-[10px] uppercase text-muted-foreground">Ofertas recientes</h3>
          {offers.length === 0 ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">Sin trueques activos.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {offers.map((offer) => {
                const incoming = offer.receiver_id === userId;
                return (
                  <div key={offer.id} className="flex flex-col gap-2 rounded border border-border/60 bg-muted/20 p-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-pixel text-[8px] uppercase text-foreground">{incoming ? "Recibida" : "Enviada"} - {offer.status}</p>
                      <p className="text-muted-foreground">{Number(offer.points || 0).toLocaleString()} F-coin + {offer.boosters || 0} potenciadores</p>
                      {offer.note && <p className="truncate text-[10px] text-muted-foreground">{offer.note}</p>}
                    </div>
                    {incoming && offer.status === "pending" && (
                      <Button size="sm" onClick={() => answerOffer(offer.id, "accept")} disabled={busy} className="h-7 text-[10px]">Aceptar</Button>
                    )}
                    {!incoming && offer.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => answerOffer(offer.id, "cancel")} disabled={busy} className="h-7 text-[10px]">Cancelar</Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="hidden">
          <h3 className="font-pixel text-[10px] uppercase text-red-400 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Vender (50% cashback)
          </h3>
          <p className="mt-1 text-[9px] text-muted-foreground font-body leading-tight">
            Arrastra aquÃ­ los items de la tienda que ya no quieras para recuperar la mitad de su valor.
          </p>
          
          <div className="inventory-slot-grid mt-3 grid grid-cols-[repeat(auto-fit,minmax(54px,72px))] justify-start gap-1.5 rounded border border-red-500/20 bg-black/40 p-2 sm:grid-cols-[repeat(4,minmax(54px,72px))]">
            {sellSlots.map((item, index) => (
              <div
                key={index}
                onClick={(event) => handleSellSlotClick(index, event)}
                className={cn(
                  "demoniaco-item-frame inventory-sell-slot relative aspect-square rounded-sm border bg-[#1b140f] shadow-[inset_1px_1px_0_rgba(255,255,255,0.1),inset_-1px_-1px_0_rgba(0,0,0,0.5)] transition-colors cursor-pointer",
                  item ? "border-red-500/60 bg-red-500/5" : "border-white/10 hover:border-red-500/30",
                )}
              >
                {item && (
                  <div className="flex h-full w-full items-center justify-center">
                    <ItemIcon item={item} className="h-5 w-5 text-red-400 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                    <span className="absolute bottom-0.5 right-1 font-pixel text-[8px] text-white">x{item.quantity}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {(() => {
            let totalRefund = 0;
            sellSlots.forEach(s => {
              if (s && priceMap[s.item_slug]) totalRefund += Math.floor(priceMap[s.item_slug].price / 2) * s.quantity;
            });
            return totalRefund > 0 ? (
              <div className="mt-2 text-center">
                <p className="font-pixel text-[8px] text-neon-green uppercase animate-pulse">Reembolso estimado: {totalRefund.toLocaleString()}</p>
              </div>
            ) : null;
          })()}

          <Button 
            onClick={() => handleSellItems(sellSlots)} 
            disabled={busy || !sellSlots.some(Boolean)} 
            variant="destructive"
            className="mt-3 w-full h-8 text-[9px] font-pixel shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DollarSign className="h-3.5 w-3.5 mr-1" />}
            VENDER SELECCIÃ“N
          </Button>
        </div>
      </div>

      <div className="hidden">
        <h3 className="font-pixel text-[10px] uppercase text-muted-foreground">Ofertas recientes</h3>
        {offers.length === 0 ? (
          <p className="mt-3 text-center text-xs text-muted-foreground">Sin trueques activos.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {offers.map((offer) => {
              const incoming = offer.receiver_id === userId;
              return (
                <div key={offer.id} className="flex flex-col gap-2 rounded border border-border/60 bg-muted/20 p-3 text-xs md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="font-pixel text-[8px] uppercase text-foreground">{incoming ? "Recibida" : "Enviada"} - {offer.status}</p>
                    <p className="text-muted-foreground">{Number(offer.points || 0).toLocaleString()} F-coin + {offer.boosters || 0} potenciadores</p>
                    {offer.note && <p className="truncate text-[10px] text-muted-foreground">{offer.note}</p>}
                  </div>
                  {incoming && offer.status === "pending" && (
                    <Button size="sm" onClick={() => answerOffer(offer.id, "accept")} disabled={busy} className="h-7 text-[10px]">Aceptar</Button>
                  )}
                  {!incoming && offer.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => answerOffer(offer.id, "cancel")} disabled={busy} className="h-7 text-[10px]">Cancelar</Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {contextMenu && typeof document !== "undefined" && createPortal((
        <div
          className="fixed z-[600] w-44 overflow-hidden rounded border border-[#d6b16f]/70 bg-[#1b140f] p-1 text-xs shadow-2xl shadow-black/70"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => sendStackToTrade(contextMenu.slot)}
          >
            Tradear item
          </button>
          <button
            className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-red-200 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={busy || !canSellItem(contextMenu.item)}
            onClick={() => handleSellItems([contextMenu.item], contextMenu.slot)}
          >
            <DollarSign className="h-3 w-3" /> Vender item
          </button>
          {isSkinItem(contextMenu.item) && (
            <>
              {contextMenu.item?.item_slug && activeSkins[(ALL_SKINS as any)[contextMenu.item.item_slug]?.type || 'launcher'] === contextMenu.item.item_slug ? (
                <button
                  className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:opacity-45"
                  disabled={busy}
                  onClick={() => handleDeactivateSkin((ALL_SKINS as any)[contextMenu.item.item_slug].type)}
                >
                  Desequipar
                </button>
              ) : (
                <button
                  className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:opacity-45"
                  disabled={busy}
                  onClick={() => handleActivateSkin(contextMenu.item.item_slug)}
                >
                  Equipar
                </button>
              )}
            </>
          )}
          {isAvatarFrameItem(contextMenu.item) && (
            <>
              {activeAvatarFrameSlug === contextMenu.item.item_slug ? (
                <button
                  className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:opacity-45"
                  disabled={busy}
                  onClick={() => handleDeactivateSkin('avatar_frame')}
                >
                  Desequipar marco
                </button>
              ) : (
                <button
                  className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:opacity-45"
                  disabled={busy}
                  onClick={() => handleActivateAvatarFrame(contextMenu.item.item_slug)}
                >
                  Equipar marco
                </button>
              )}
            </>
          )}
          {isProfileTransitionItem(contextMenu.item) && (
            <>
              {activeProfileTransitionSlug === contextMenu.item.item_slug ? (
                <button
                  className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:opacity-45"
                  disabled={busy}
                  onClick={() => handleDeactivateSkin('profile_transition')}
                >
                  Desequipar transicion
                </button>
              ) : (
                <button
                  className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:opacity-45"
                  disabled={busy}
                  onClick={() => handleActivateProfileTransition(contextMenu.item.item_slug)}
                >
                  Equipar transicion
                </button>
              )}
            </>
          )}
          {isEmulatorShellItem(contextMenu.item) && (
            <>
              {activeEmulatorShellSlug === contextMenu.item.item_slug ? (
                <button
                  className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:opacity-45"
                  disabled={busy}
                  onClick={() => handleDeactivateSkin('emulator_shell')}
                >
                  Desequipar consola
                </button>
              ) : (
                <button
                  className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:opacity-45"
                  disabled={busy}
                  onClick={() => handleActivateEmulatorShell(contextMenu.item.item_slug)}
                >
                  Equipar consola
                </button>
              )}
            </>
          )}
          {isMembershipItem(contextMenu.item) && (
            <button
              className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={busy}
              onClick={() => useMembership(contextMenu.item)}
            >
              Usar membresia
            </button>
          )}
          {isBoosterItem(contextMenu.item) && (
            <>
              <button
                className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!boosterCanBeUsed(contextMenu.item)}
                onClick={() => useBooster(contextMenu.item)}
              >
                Usar 1
              </button>
            </>
          )}
          <button
            className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={Number(contextMenu.item?.quantity || 0) <= 1}
            onClick={() => openSplitStack(contextMenu.item)}
          >
            Separar
          </button>
          <button
            className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-red-300 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={busy}
            onClick={() => openDiscardStack(contextMenu.item, contextMenu.slot)}
          >
            <Trash2 className="h-3 w-3" /> Desechar
          </button>
        </div>
      ), document.body)}

      {discardTarget && (
        <div className="fixed inset-0 z-[620] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border-2 border-red-500/50 bg-[#1b1010] p-4 shadow-2xl shadow-red-950/60">
            <div className="flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded border border-red-400/50 bg-red-500/15 text-red-200">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="font-pixel text-[10px] uppercase text-red-200">Desechar item</p>
                <p className="mt-1 text-xs text-muted-foreground">{itemLabel(discardTarget.item)} x{Number(discardTarget.item?.quantity || 1).toLocaleString()}</p>
              </div>
            </div>
            <p className="mt-3 rounded border border-red-500/30 bg-red-500/10 p-3 text-[11px] leading-relaxed text-red-100/90">
              Esta accion es irreversible. El item se eliminara permanentemente de tu inventario y no podra recuperarse.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="h-8 text-[10px]" disabled={busy} onClick={() => setDiscardTarget(null)}>
                Cancelar
              </Button>
              <Button size="sm" variant="destructive" className="h-8 text-[10px]" disabled={busy} onClick={discardStack}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Desechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {incomingTradeRequest && (
        <div className="fixed bottom-4 right-4 z-[650] w-[min(92vw,340px)] rounded border border-neon-cyan/50 bg-[#0a1018] p-3 shadow-2xl shadow-neon-cyan/20">
          <p className="font-pixel text-[9px] uppercase text-neon-cyan">Solicitud de trueque</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {incomingTradeRequest.fromName || "Un usuario"} quiere iniciar un trueque contigo.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => setIncomingTradeRequest(null)}>
              Rechazar
            </Button>
            <Button size="sm" className="h-8 text-[10px]" onClick={acceptTradeRequest}>
              Aceptar
            </Button>
          </div>
        </div>
      )}

      {splitTarget && (
        <div className="fixed inset-0 z-[590] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded border border-[#d6b16f]/70 bg-[#2b2119] p-4 shadow-2xl">
            <p className="font-pixel text-[10px] uppercase text-[#f7d28b]">Separar stack</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Tienes {Number(splitTarget.quantity || 0).toLocaleString()} de {itemLabel(splitTarget)}. Elige cuantos mover a otro slot.
            </p>
            <Input
              type="number"
              min="1"
              max={Math.max(1, Number(splitTarget.quantity || 0) - 1)}
              value={splitQuantity}
              onChange={(event) => setSplitQuantity(event.target.value)}
              className="mt-3 h-9 bg-[#1b140f] text-xs"
              autoFocus
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="h-8 text-[10px]" onClick={() => setSplitTarget(null)}>
                Cancelar
              </Button>
              <Button size="sm" className="h-8 text-[10px]" onClick={splitStack} disabled={busy}>
                Separar
              </Button>
            </div>
          </div>
        </div>
      )}

      {cursorOverlay}
    </div>
  );
}
