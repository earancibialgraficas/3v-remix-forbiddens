export const INVENTORY_SEEN_EVENT = "forbiddens:inventory-seen-updated";

const seenKey = (userId: string) => `inventory-seen-items:${userId}`;

const readSeenSet = (userId: string) => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(seenKey(userId)) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
};

const writeSeenSet = (userId: string, seen: Set<string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(seenKey(userId), JSON.stringify([...seen]));
  window.dispatchEvent(new CustomEvent(INVENTORY_SEEN_EVENT, { detail: { userId } }));
};

export const getInventoryItemSourceIds = (item: any) => {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const ids = sources.length > 0 ? sources.map((source: any) => source?.id) : [item?.id];
  return ids.filter(Boolean).map(String);
};

export const markInventoryItemIdsSeen = (userId: string, ids: string[]) => {
  if (!userId || ids.length === 0) return;
  const seen = readSeenSet(userId);
  ids.forEach((id) => seen.add(String(id)));
  writeSeenSet(userId, seen);
};

export const markInventoryItemsSeen = (userId: string, items: any[]) => {
  markInventoryItemIdsSeen(userId, items.flatMap(getInventoryItemSourceIds));
};

export const getUnseenInventoryIds = (userId: string, items: any[]) => {
  if (!userId || typeof window === "undefined") return [];
  const allIds = items.flatMap(getInventoryItemSourceIds);
  if (allIds.length === 0) return [];
  const key = seenKey(userId);
  const seen = readSeenSet(userId);

  if (!window.localStorage.getItem(key)) {
    writeSeenSet(userId, new Set(allIds));
    return [];
  }

  return allIds.filter((id) => !seen.has(String(id)));
};

export const hasUnseenInventoryItems = (userId: string, items: any[]) =>
  getUnseenInventoryIds(userId, items).length > 0;

export const isInventoryItemUnseen = (userId: string, item: any) => {
  if (!userId || typeof window === "undefined") return false;
  const ids = getInventoryItemSourceIds(item);
  if (ids.length === 0) return false;
  const seen = readSeenSet(userId);
  return ids.some((id) => !seen.has(String(id)));
};
