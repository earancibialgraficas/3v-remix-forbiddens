const DRIVE_TOKEN_KEYS = {
  accessToken: "drive_access_token",
  expiry: "drive_token_expiry",
  linkedUntil: "drive_linked_until",
};

export const getDriveOAuthChannelName = (state: string) => {
  const safeState = String(state || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 96);
  return safeState ? `drive-oauth-${safeState}` : "";
};

export const getDriveTokenTtlMs = (expiresIn?: number | string | null) => {
  const seconds = Number(expiresIn || 3300);
  return Math.max(60_000, seconds * 1000 - 60_000);
};

export const storeDriveAccessToken = (token: string, expiresIn?: number | string | null) => {
  const ttlMs = getDriveTokenTtlMs(expiresIn);
  const expiry = (Date.now() + ttlMs).toString();
  const linkedUntil = (Date.now() + 24 * 60 * 60 * 1000).toString();

  localStorage.setItem(DRIVE_TOKEN_KEYS.accessToken, token);
  localStorage.setItem(DRIVE_TOKEN_KEYS.expiry, expiry);
  localStorage.setItem(DRIVE_TOKEN_KEYS.linkedUntil, linkedUntil);
  sessionStorage.setItem(DRIVE_TOKEN_KEYS.accessToken, token);
  sessionStorage.setItem(DRIVE_TOKEN_KEYS.expiry, expiry);

  return ttlMs;
};
