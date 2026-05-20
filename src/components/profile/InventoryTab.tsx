import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowLeftRight, Check, Coins, Gem, Loader2, Search, Sparkles, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface InventoryTabProps {
  userId: string;
  profile: any;
}

export default function InventoryTab({ userId, profile }: InventoryTabProps) {
  const { toast } = useToast();
  const tradeChannelRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const [wallet, setWallet] = useState(0);
  const [boosters, setBoosters] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [slotItems, setSlotItems] = useState<any[]>(Array(27).fill(null));
  const [cursorItem, setCursorItem] = useState<any | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [tradeSlots, setTradeSlots] = useState<any[]>(Array(4).fill(null));
  const [tradeId, setTradeId] = useState<string | null>(null);
  const [localReady, setLocalReady] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteTradeSlots, setRemoteTradeSlots] = useState<any[]>(Array(4).fill(null));
  const [remotePoints, setRemotePoints] = useState(0);
  const [dragMode, setDragMode] = useState<"even" | "single" | null>(null);
  const [dragTouched, setDragTouched] = useState<number[]>([]);
  const [suppressClick, setSuppressClick] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientResults, setRecipientResults] = useState<any[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<any | null>(null);
  const [pointsToSend, setPointsToSend] = useState("");
  const [statToConvert, setStatToConvert] = useState("100");
  const [fcoinToConvert, setFcoinToConvert] = useState("100");
  const [contextMenu, setContextMenu] = useState<{ item: any; slot: number; x: number; y: number } | null>(null);
  const [splitTarget, setSplitTarget] = useState<any | null>(null);
  const [splitQuantity, setSplitQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const totalBoosters = useMemo(
    () => boosters.filter((item) => item.item_slug === "points_x3_week").reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [boosters],
  );
  const tradeBoosters = useMemo(
    () => tradeSlots.filter((item) => item?.item_slug === "points_x3_week").reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
    [tradeSlots],
  );
  const remoteTradeBoosters = useMemo(
    () => remoteTradeSlots.filter((item) => item?.item_slug === "points_x3_week").reduce((sum, item) => sum + Number(item?.quantity || 0), 0),
    [remoteTradeSlots],
  );

  const loadInventory = async () => {
    setLoading(true);
    setSchemaReady(true);
    try {
      const [walletRes, inventoryRes, offersRes] = await Promise.all([
        supabase.from("point_wallets" as any).select("balance").eq("user_id", userId).maybeSingle(),
        supabase.from("user_inventory" as any).select("*").eq("user_id", userId).order("created_at", { ascending: true }),
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
          setWallet(Number(profile?.total_score || 0));
          setBoosters([]);
          setOffers([]);
          return;
        }
      }

      setWallet(Number((walletRes.data as any)?.balance ?? profile?.total_score ?? 0));
      setBoosters(inventoryRes.data || []);
      setOffers(offersRes.data || []);
    } catch {
      setSchemaReady(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) void loadInventory();
  }, [userId]);

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
      setRemoteTradeSlots(Array.isArray(payload?.items) ? payload.items.concat(Array(4).fill(null)).slice(0, 4) : Array(4).fill(null));
      setRemotePoints(Number(payload?.points || 0));
      setRemoteReady(Boolean(payload?.ready));
      if (payload?.tradeId) setTradeId(String(payload.tradeId));
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

  useEffect(() => {
    const nextSlots = Array(27).fill(null);
    const savedOrder = (() => {
      try {
        return JSON.parse(localStorage.getItem(`inventory-slot-order:${userId}`) || "[]");
      } catch {
        return [];
      }
    })();
    boosters.forEach((item, index) => {
      const preferred = Number(savedOrder[index]);
      const slot = Number.isInteger(preferred) && preferred >= 0 && preferred < 27 && !nextSlots[preferred]
        ? preferred
        : nextSlots.findIndex((slotItem) => !slotItem);
      if (slot >= 0) nextSlots[slot] = item;
    });
    setSlotItems(nextSlots);
    setTradeSlots(Array(4).fill(null));
    setCursorItem(null);
  }, [boosters, userId]);

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

  const serializeTradeItems = (slots = tradeSlots) =>
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

  const syncLiveTrade = async (ready = localReady, slots = tradeSlots, pointsValue = pointsToSend) => {
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
      if (!error.message?.toLowerCase().includes("function")) {
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
    if (selectedRecipient?.user_id && selectedRecipient.user_id !== target.user_id) {
      returnTradeSlotsToInventory();
      setPointsToSend("");
    }
    setSelectedRecipient(target);
  };

  const cancelTradeSession = () => {
    void syncLiveTrade(false, Array(4).fill(null), "0");
    returnTradeSlotsToInventory();
    setPointsToSend("");
    setRemoteTradeSlots(Array(4).fill(null));
    setRemotePoints(0);
    setLocalReady(false);
    setRemoteReady(false);
    setTradeId(null);
    setSelectedRecipient(null);
  };

  const createOffer = async () => {
    if (!selectedRecipient) {
      toast({ title: "Elige un usuario", variant: "destructive" });
      return;
    }

    const points = Math.max(0, Math.floor(Number(pointsToSend) || 0));
    const boosterQty = Math.max(0, Math.floor(Number(tradeBoosters) || 0));
    const remoteHasOffer = remotePoints > 0 || remoteTradeBoosters > 0;
    if (points <= 0 && boosterQty <= 0 && !remoteHasOffer) {
      toast({ title: "Agreguen F-coin u objetos", variant: "destructive" });
      return;
    }
    if (!localReady || !remoteReady) {
      toast({ title: "Falta confirmar", description: "Ambos usuarios deben marcar Listo antes de enviar.", variant: "destructive" });
      return;
    }

    const synced = await syncLiveTrade(true);
    const activeTradeId = synced?.trade_id || tradeId;
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
      toast({ title: "Trueque rechazado", description: result.reason || "Revisa saldos, items o confirmaciones.", variant: "destructive" });
      return;
    }

    toast({ title: "Trueque completado", description: "Items y F-coin intercambiados." });
    setSelectedRecipient(null);
    setRecipientSearch("");
    setRecipientResults([]);
    setPointsToSend("");
    setTradeSlots(Array(4).fill(null));
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

  const canStackTogether = (a: any, b: any) => a && b && a.item_slug === b.item_slug;

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

  const returnTradeSlotsToInventory = (slots = tradeSlots) => {
    const returning = slots.filter(Boolean);
    if (returning.length === 0) return;
    setSlotItems((current) => {
      let next = [...current];
      returning.forEach((item) => {
        next = addStackToSlots(next, item);
      });
      persistSlotOrder(next);
      return next;
    });
    setTradeSlots(Array(4).fill(null));
    setLocalReady(false);
  };

  const moveCursorToEvent = (event: React.MouseEvent) => {
    setCursorPos({ x: event.clientX, y: event.clientY });
  };

  const moveSlot = (from: number, to: number) => {
    if (from === to) return;
    setSlotItems((current) => {
      const next = [...current];
      const moving = next[from];
      next[from] = next[to];
      next[to] = moving;
      persistSlotOrder(next);
      return next;
    });
  };

  const cloneStack = (item: any, quantity = Number(item?.quantity || 0)) => item ? {
    ...item,
    quantity,
    sources: takeSources(item, quantity),
  } : null;
  const isBoosterItem = (item: any) => item?.item_slug === "points_x3_week";
  const isEventTicketItem = (item: any) => String(item?.item_slug || "").startsWith("event_ticket:");
  const itemActiveUntil = (item: any) => item?.metadata?.active_until ? new Date(item.metadata.active_until).getTime() : 0;
  const itemIsActive = (item: any) => itemActiveUntil(item) > Date.now();
  const boosterUsedByMe = (item: any) => Array.isArray(item?.metadata?.used_by_users) && item.metadata.used_by_users.includes(userId);
  const boosterCanBeUsed = (item: any) => isBoosterItem(item) && !itemIsActive(item) && !boosterUsedByMe(item);
  const boosterCanBeTraded = (item: any) => isBoosterItem(item) && !itemIsActive(item);
  const itemLabel = (item: any) => item?.item_name || (isEventTicketItem(item) ? "Entrada de evento" : "Objeto");
  const ItemIcon = ({ item, className }: { item: any; className?: string }) => (
    isEventTicketItem(item)
      ? <Ticket className={className} />
      : isBoosterItem(item)
        ? <Sparkles className={className} />
        : <Archive className={className} />
  );

  const placeInFirstTradeSlot = (item: any) => {
    if (!item) return false;
    if (!boosterCanBeTraded(item)) {
      toast({ title: "Objeto no comerciable aun", description: itemIsActive(item) ? "Ese potenciador esta activo; podra comerciarse cuando terminen sus 7 dias." : "La barra de trueque por ahora acepta potenciadores.", variant: "destructive" });
      return false;
    }
    let placed = false;
    setTradeSlots((current) => {
      const next = [...current];
      const sameIndex = next.findIndex((slot) => slot?.item_slug === item.item_slug);
      if (sameIndex >= 0) {
        next[sameIndex] = combineStacks(next[sameIndex], item);
        placed = true;
        return next;
      }
      const emptyIndex = next.findIndex((slot) => !slot);
      if (emptyIndex >= 0) {
        next[emptyIndex] = cloneStack(item);
        placed = true;
      }
      return next;
    });
    return placed;
  };

  const quickMoveToTrade = (slotIndex: number) => {
    const item = slotItems[slotIndex];
    if (!item) return;
    if (!placeInFirstTradeSlot(item)) {
      toast({ title: "Barra de trueque llena", variant: "destructive" });
      return;
    }
    setSlotItems((current) => {
      const next = [...current];
      next[slotIndex] = null;
      persistSlotOrder(next);
      return next;
    });
    markTradeChanged();
  };

  const handleSlotLeftClick = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    moveCursorToEvent(event);
    if (suppressClick) return;
    setContextMenu(null);
    const item = slotItems[index];
    if (event.shiftKey && item) {
      quickMoveToTrade(index);
      return;
    }
    setSlotItems((current) => {
      const next = [...current];
      const target = next[index];
      if (!cursorItem && target) {
        setCursorItem(cloneStack(target));
        next[index] = null;
      } else if (cursorItem && !target) {
        next[index] = cloneStack(cursorItem);
        setCursorItem(null);
      } else if (cursorItem && target) {
        if (target.item_slug === cursorItem.item_slug) {
          next[index] = combineStacks(target, cursorItem);
          setCursorItem(null);
        } else {
          next[index] = cloneStack(cursorItem);
          setCursorItem(cloneStack(target));
        }
      }
      persistSlotOrder(next);
      return next;
    });
  };

  const handleSlotRightClick = (index: number, event: React.MouseEvent) => {
    event.preventDefault();
    moveCursorToEvent(event);
    setContextMenu(null);
    setSlotItems((current) => {
      const next = [...current];
      const target = next[index];
      if (cursorItem) {
        if (!target) {
          const { picked, remainder } = splitStackItem(cursorItem, 1);
          next[index] = picked;
          setCursorItem(remainder);
        } else if (target.item_slug === cursorItem.item_slug) {
          const { picked, remainder } = splitStackItem(cursorItem, 1);
          next[index] = picked ? combineStacks(target, picked) : target;
          setCursorItem(remainder);
        }
      } else if (target && Number(target.quantity || 0) > 1) {
        const picked = Math.floor(Number(target.quantity || 0) / 2);
        const split = splitStackItem(target, picked);
        next[index] = split.remainder;
        setCursorItem(split.picked);
      } else if (target) {
        setContextMenu({ item: target, slot: index, x: event.clientX, y: event.clientY });
      }
      persistSlotOrder(next);
      return next;
    });
  };

  const handleSlotDoubleClick = (index: number) => {
    const item = slotItems[index];
    if (!item || cursorItem) return;
    let collected: any = null;
    setSlotItems((current) => {
      const next = current.map((slot) => {
        if (slot?.item_slug === item.item_slug) {
          collected = collected ? combineStacks(collected, slot) : cloneStack(slot);
          return null;
        }
        return slot;
      });
      setCursorItem(collected);
      persistSlotOrder(next);
      return next;
    });
  };

  const beginDistribution = (index: number, mode: "even" | "single", event: React.MouseEvent) => {
    if (!cursorItem) return;
    event.preventDefault();
    moveCursorToEvent(event);
    setDragMode(mode);
    setDragTouched([index]);
  };

  const touchDistributionSlot = (index: number) => {
    if (!dragMode) return;
    setDragTouched((current) => current.includes(index) ? current : [...current, index]);
  };

  const finishDistribution = () => {
    if (!dragMode || !cursorItem || dragTouched.length === 0) {
      setDragMode(null);
      setDragTouched([]);
      return;
    }
    setSlotItems((current) => {
      const next = [...current];
      const emptyTouched = dragTouched.filter((index) => !next[index]);
      if (emptyTouched.length === 0) return next;
      const available = Number(cursorItem.quantity || 0);
      if (dragMode === "single") {
        const count = Math.min(available, emptyTouched.length);
        let hand = cursorItem;
        emptyTouched.slice(0, count).forEach((index) => {
          const split = splitStackItem(hand, 1);
          next[index] = split.picked;
          hand = split.remainder;
        });
        setCursorItem(hand);
      } else {
        const perSlot = Math.floor(available / emptyTouched.length);
        if (perSlot > 0) {
          let hand = cursorItem;
          emptyTouched.forEach((index) => {
            const split = splitStackItem(hand, perSlot);
            next[index] = split.picked;
            hand = split.remainder;
          });
          setCursorItem(hand);
        }
      }
      persistSlotOrder(next);
      return next;
    });
    setDragMode(null);
    setDragTouched([]);
    setSuppressClick(true);
    window.setTimeout(() => setSuppressClick(false), 0);
  };

  const handleTradeSlotClick = (index: number, event?: React.MouseEvent) => {
    if (event) moveCursorToEvent(event);
    setTradeSlots((current) => {
      const next = [...current];
      const target = next[index];
      if (cursorItem && !target) {
        next[index] = cloneStack(cursorItem);
        setCursorItem(null);
      } else if (cursorItem && target?.item_slug === cursorItem.item_slug) {
        next[index] = combineStacks(target, cursorItem);
        setCursorItem(null);
      } else if (cursorItem && target) {
        next[index] = cloneStack(cursorItem);
        setCursorItem(cloneStack(target));
      } else if (!cursorItem && target) {
        setCursorItem(cloneStack(target));
        next[index] = null;
      }
      return next;
    });
    markTradeChanged();
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
    void loadInventory();
  };

  const convertFcoinToStat = async () => {
    const amount = Math.max(0, Math.floor(Number(fcoinToConvert) || 0));
    if (amount <= 0) {
      toast({ title: "Ingresa una cantidad", variant: "destructive" });
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
    toast({ title: "STAT recuperado", description: `+${amount.toLocaleString()} puntos STAT` });
    void loadInventory();
  };

  const sendStackToTrade = (slotIndex: number) => {
    const item = slotItems[slotIndex];
    if (!item) return;
    const qty = Math.max(1, Number(item.quantity || 1));
    quickMoveToTrade(slotIndex);
    setContextMenu(null);
    toast({ title: "Potenciadores listos para trueque", description: `Se colocaron ${qty} en el cuadro de trueque.` });
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
    toast({ title: "Potenciador activado", description: "x3 puntos por 7 dias." });
    void loadInventory();
  };

  const openSplitStack = (item: any) => {
    setContextMenu(null);
    setSplitTarget(item);
    setSplitQuantity("1");
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
    toast({ title: "Stack separado", description: `${qty} potenciadores movidos a un nuevo slot.` });
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

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="grid gap-3 md:grid-cols-[1fr_320px]">
        <div className="rounded border-2 border-[#5b4631] bg-[#2b2119] p-3 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="font-pixel text-[10px] uppercase text-[#f7d28b] flex items-center gap-2">
              <Archive className="h-4 w-4" /> Inventario
            </h3>
            <div className="flex items-center gap-2 rounded border border-[#8b6d46] bg-black/30 px-2 py-1 text-[10px] font-body text-[#f7d28b]">
              <Gem className="h-3.5 w-3.5" /> {loading ? "..." : wallet.toLocaleString()} F-coin
            </div>
          </div>

          {!schemaReady && (
            <div className="mb-3 rounded border border-neon-yellow/40 bg-neon-yellow/10 p-3 text-[11px] text-muted-foreground">
              Falta correr la migracion de inventario para activar trueques, stacks y saldo comerciable. Mientras tanto uso tus puntos actuales como vista previa.
            </div>
          )}

          <div className="grid grid-cols-9 gap-1.5 rounded border border-black/60 bg-[#1b140f] p-2">
            {slotItems.map((item, index) => (
              <div
                key={index}
                onClick={(event) => handleSlotLeftClick(index, event)}
                onDoubleClick={() => handleSlotDoubleClick(index)}
                onMouseDown={(event) => {
                  if (event.button === 0 && cursorItem) beginDistribution(index, "even", event);
                  if (event.button === 2 && cursorItem) beginDistribution(index, "single", event);
                }}
                onMouseEnter={() => touchDistributionSlot(index)}
                onMouseUp={finishDistribution}
                onContextMenu={(event) => {
                  handleSlotRightClick(index, event);
                }}
                className={cn(
                  "relative aspect-square select-none rounded-sm border bg-[#3b2d21] shadow-[inset_2px_2px_0_rgba(255,255,255,0.12),inset_-2px_-2px_0_rgba(0,0,0,0.5)] transition-colors",
                  item ? "cursor-pointer border-[#d6b16f] bg-[radial-gradient(circle_at_35%_25%,rgba(250,204,21,0.22),#3b2d21_55%)]" : "border-[#6b5236]",
                  dragTouched.includes(index) && "ring-2 ring-neon-cyan",
                )}
                title={item ? `${itemLabel(item)} - click izquierdo recoge. Click derecho divide. Shift+click envia a trueque.` : "Slot vacio"}
              >
                {item && (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className={cn(
                      "relative grid h-[72%] w-[72%] place-items-center rounded-sm border shadow-[inset_2px_2px_0_rgba(255,255,255,0.18),inset_-2px_-2px_0_rgba(0,0,0,0.45),0_0_12px_rgba(250,204,21,0.25)]",
                      isEventTicketItem(item) ? "border-neon-cyan/70 bg-[#14354a]" : "border-[#f7d28b]/70 bg-[#6b4a1f]",
                    )}>
                      <div className="absolute inset-1 rounded-sm border border-black/30 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_45%)]" />
                      <ItemIcon item={item} className={cn("relative h-5 w-5 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]", isEventTicketItem(item) ? "text-neon-cyan" : "text-neon-yellow")} />
                    </div>
                    {isBoosterItem(item) && itemIsActive(item) && <span className="absolute left-0.5 top-0.5 rounded bg-neon-green/90 px-1 font-pixel text-[6px] text-black">ON</span>}
                    {isBoosterItem(item) && !itemIsActive(item) && boosterUsedByMe(item) && <span className="absolute left-0.5 top-0.5 rounded bg-muted px-1 font-pixel text-[6px] text-foreground">USADO</span>}
                    <span className="absolute bottom-0.5 right-1 font-pixel text-[8px] text-white drop-shadow-[0_1px_0_#000]">x{item.quantity}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-2 text-[10px] text-muted-foreground md:grid-cols-3">
            <div className="rounded border border-[#8b6d46]/60 bg-black/20 p-2">Objetos: {boosters.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</div>
            <div className="rounded border border-[#8b6d46]/60 bg-black/20 p-2">Duracion: 7 dias</div>
            <div className="rounded border border-[#8b6d46]/60 bg-black/20 p-2">Potenciadores: {totalBoosters}</div>
          </div>

          <div className="mt-3 grid gap-2 rounded border border-[#8b6d46]/60 bg-black/25 p-2 lg:grid-cols-2">
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
                <p className="text-[10px] text-muted-foreground">Retira F-coin del inventario y conviertela de vuelta en puntos STAT.</p>
              </div>
              <div className="flex gap-1">
                <Input type="number" min="1" value={fcoinToConvert} onChange={(e) => setFcoinToConvert(e.target.value)} className="h-8 w-24 bg-[#1b140f] text-xs" />
                <Button size="sm" onClick={convertFcoinToStat} disabled={busy || !schemaReady} className="h-8 text-[10px]">
                  <ArrowLeftRight className="h-3.5 w-3.5" /> Retirar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded border border-neon-cyan/30 bg-card p-4">
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
                  onClick={() => selectTradeRecipient(target)}
                  className={cn("flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left text-xs", selectedRecipient?.user_id === target.user_id ? "border-neon-cyan bg-neon-cyan/10" : "border-border bg-muted/20")}
                >
                  <span className="h-6 w-6 overflow-hidden rounded bg-muted">{target.avatar_url ? <img src={target.avatar_url} className="h-full w-full object-cover" /> : null}</span>
                  <span className="truncate">{target.display_name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
            <Input type="number" min="0" value={pointsToSend} onChange={(e) => { setPointsToSend(e.target.value); markTradeChanged(); }} placeholder="F-coin" className="h-8 bg-muted text-xs" />
            <div className="rounded border border-neon-cyan/20 bg-black/30 px-2 py-1 text-[10px] text-neon-cyan">
              {tradeBoosters} boosters
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-[9px] font-pixel uppercase text-neon-cyan">
                <span>Tu lado</span>
                <span className={cn(localReady ? "text-neon-green" : "text-muted-foreground")}>{localReady ? "Listo" : "Editando"}</span>
              </div>
              <div className="grid w-24 grid-cols-2 gap-1 rounded border border-neon-cyan/30 bg-black/50 p-1">
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
                      "relative aspect-square rounded-sm border bg-[#1b140f] shadow-[inset_1px_1px_0_rgba(255,255,255,0.1),inset_-1px_-1px_0_rgba(0,0,0,0.5)]",
                      item ? "border-[#d6b16f]" : "border-white/10",
                    )}
                    title="Barra de trueque"
                  >
                    {item && (
                      <>
                        <ItemIcon item={item} className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-neon-yellow" />
                        <span className="absolute bottom-0 right-0.5 font-pixel text-[7px] text-white">x{item.quantity}</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[9px] font-pixel uppercase text-neon-magenta">
                <span>{selectedRecipient?.display_name ? "Su lado" : "Esperando"}</span>
                <span className={cn(remoteReady ? "text-neon-green" : "text-muted-foreground")}>{remoteReady ? "Listo" : "Editando"}</span>
              </div>
              <div className="grid w-24 grid-cols-2 gap-1 rounded border border-neon-magenta/30 bg-black/50 p-1">
                {remoteTradeSlots.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      "relative aspect-square rounded-sm border bg-[#1b140f] shadow-[inset_1px_1px_0_rgba(255,255,255,0.1),inset_-1px_-1px_0_rgba(0,0,0,0.5)]",
                      item ? "border-[#d6b16f]" : "border-white/10",
                    )}
                    title={item ? itemLabel(item) : "Slot remoto"}
                  >
                    {item && (
                      <>
                        <ItemIcon item={item} className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-neon-yellow" />
                        <span className="absolute bottom-0 right-0.5 font-pixel text-[7px] text-white">x{item.quantity}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <div className="rounded border border-neon-cyan/20 bg-black/25 p-2">Tú: {Number(pointsToSend || 0).toLocaleString()} F-coin</div>
            <div className="rounded border border-neon-magenta/20 bg-black/25 p-2">Otro: {remotePoints.toLocaleString()} F-coin</div>
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
      </div>

      <div className="rounded border border-border bg-card p-4">
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

      {contextMenu && (
        <div
          className="fixed z-[600] w-40 overflow-hidden rounded border border-[#d6b16f]/70 bg-[#1b140f] p-1 text-xs shadow-2xl shadow-black/70"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!boosterCanBeTraded(contextMenu.item)}
            onClick={() => sendStackToTrade(contextMenu.slot)}
          >
            Tradear stack
          </button>
          {isBoosterItem(contextMenu.item) && (
            <>
              <button
                className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!boosterCanBeUsed(contextMenu.item)}
                onClick={() => useBooster(contextMenu.item)}
              >
                Usar 1
              </button>
              <button
                className="block w-full rounded px-2 py-1.5 text-left hover:bg-[#d6b16f]/15 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={Number(contextMenu.item?.quantity || 0) <= 1}
                onClick={() => openSplitStack(contextMenu.item)}
              >
                Separar
              </button>
            </>
          )}
        </div>
      )}

      {splitTarget && (
        <div className="fixed inset-0 z-[590] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded border border-[#d6b16f]/70 bg-[#2b2119] p-4 shadow-2xl">
            <p className="font-pixel text-[10px] uppercase text-[#f7d28b]">Separar stack</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Tienes {Number(splitTarget.quantity || 0).toLocaleString()} potenciadores. Elige cuantos mover a otro slot.
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

      {cursorItem && (
        <div
          className="pointer-events-none fixed z-[700] h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-[#d6b16f] bg-[#3b2d21] shadow-2xl shadow-black/70"
          style={{ left: cursorPos.x, top: cursorPos.y }}
        >
          <ItemIcon item={cursorItem} className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-neon-yellow drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]" />
          <span className="absolute bottom-0.5 right-1 font-pixel text-[8px] text-white">x{cursorItem.quantity}</span>
        </div>
      )}
    </div>
  );
}
