// Bóveda Secreta — verificación de contraseña con SHA-256.
// El hash corresponde a la contraseña real definida por el dueño del sitio.
// La contraseña en claro NUNCA se guarda en el bundle.
const VAULT_HASH = "1b2b0eb5b7b59eb1a167cb9147f472517b5c043f78815985021f9f1b478d07ff";
const SESSION_KEY = "vault_unlocked_v1";

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyVaultPassword(pwd: string): Promise<boolean> {
  if (!pwd || pwd.length !== 10) return false;
  const h = await sha256Hex(pwd.trim());
  const ok = h === VAULT_HASH;
  if (ok) sessionStorage.setItem(SESSION_KEY, "1");
  return ok;
}

export function isVaultUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

export function lockVault(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
