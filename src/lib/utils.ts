import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function withImageVersion(url?: string | null, version?: string | number | null) {
  if (!url) return "";
  if (!version) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(version))}`;
}
