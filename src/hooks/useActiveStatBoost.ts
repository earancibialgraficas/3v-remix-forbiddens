import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const STAT_BOOST_SLUG = "points_x3_week";

export interface ActiveStatBoostState {
  active: boolean;
  expiresAt: string | null;
  multiplier: number;
}

const emptyBoost: ActiveStatBoostState = {
  active: false,
  expiresAt: null,
  multiplier: 1,
};

export const getStatBoostActiveUntil = (item: any) => {
  const rawDate = item?.ends_at || item?.metadata?.active_until;
  if (!rawDate) return 0;
  const time = new Date(rawDate).getTime();
  return Number.isFinite(time) ? time : 0;
};

export const isStatBoostActive = (item: any, now = Date.now()) => getStatBoostActiveUntil(item) > now;

export const isStatBoostExpired = (item: any, now = Date.now()) => {
  const activeUntil = getStatBoostActiveUntil(item);
  return activeUntil > 0 && activeUntil <= now;
};

export function useActiveStatBoost(userId?: string | null) {
  const [boost, setBoost] = useState<ActiveStatBoostState>(emptyBoost);

  const loadBoost = useCallback(async () => {
    if (!userId) {
      setBoost(emptyBoost);
      return;
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await (supabase as any)
      .from("active_account_boosters")
      .select("item_slug,multiplier,starts_at,ends_at")
      .eq("user_id", userId)
      .eq("item_slug", STAT_BOOST_SLUG)
      .lte("starts_at", nowIso)
      .gt("ends_at", nowIso)
      .order("ends_at", { ascending: false })
      .limit(1);

    if (error || !data?.length) {
      setBoost(emptyBoost);
      return;
    }

    const row = data[0];
    setBoost({
      active: true,
      expiresAt: row.ends_at,
      multiplier: Math.max(1, Number(row.multiplier || 1)),
    });
  }, [userId]);

  useEffect(() => {
    void loadBoost();
  }, [loadBoost]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`active-stat-boost-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "active_account_boosters", filter: `user_id=eq.${userId}` },
        () => void loadBoost(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadBoost, userId]);

  useEffect(() => {
    if (!boost.active || !boost.expiresAt) return;
    const expiresIn = new Date(boost.expiresAt).getTime() - Date.now();
    if (!Number.isFinite(expiresIn)) return;
    const timer = window.setTimeout(() => void loadBoost(), Math.min(Math.max(expiresIn + 1000, 1000), 2147483647));
    return () => window.clearTimeout(timer);
  }, [boost.active, boost.expiresAt, loadBoost]);

  return boost;
}
