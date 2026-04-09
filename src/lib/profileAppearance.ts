import type { CSSProperties } from "react";

const normalizeHex = (value?: string | null) => {
  if (!value) return null;

  const clean = value.trim().replace("#", "");

  if (clean.length === 3) {
    return clean.split("").map((char) => `${char}${char}`).join("");
  }

  return clean.length === 6 ? clean : null;
};

export const withAlpha = (value?: string | null, alpha = 1) => {
  const hex = normalizeHex(value);
  if (!hex) return value || undefined;

  const boundedAlpha = Math.max(0, Math.min(1, alpha));
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${boundedAlpha})`;
};

export const getAvatarBorderStyle = (color?: string | null, width = 2): CSSProperties | undefined => {
  if (!color) return undefined;

  return {
    border: `${width}px solid ${color}`,
  };
};

export const getNameStyle = (color?: string | null): CSSProperties | undefined => {
  if (!color) return undefined;

  return {
    color,
  };
};

export const getRoleStyle = (color?: string | null): CSSProperties | undefined => {
  if (!color) return undefined;

  return {
    color,
  };
};

export const getStaffRoleStyle = (color?: string | null): CSSProperties | undefined => {
  if (!color) return undefined;

  return {
    color,
    borderColor: withAlpha(color, 0.35),
    backgroundColor: withAlpha(color, 0.12),
    boxShadow: `0 0 14px ${withAlpha(color, 0.18)}`,
  };
};