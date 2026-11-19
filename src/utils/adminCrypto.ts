export const ADMIN_VAULT_ALGORITHM = 'PBKDF2-SHA256' as const;
export const ADMIN_VAULT_ITERATIONS = 120_000;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  const len = Math.floor(clean.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function deriveAdminPasswordHash(
  password: string,
  saltHex: string,
  iterations = ADMIN_VAULT_ITERATIONS
): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const saltBytes = hexToBytes(saltHex);
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bytesToHex(new Uint8Array(derivedBits));
}

export async function createAdminPasswordRecord(password: string): Promise<{
  algorithm: typeof ADMIN_VAULT_ALGORITHM;
  iterations: number;
  saltHex: string;
  hashHex: string;
}> {
  const saltBytes = new Uint8Array(16);
  window.crypto.getRandomValues(saltBytes);
  const saltHex = bytesToHex(saltBytes);
  const hashHex = await deriveAdminPasswordHash(password, saltHex, ADMIN_VAULT_ITERATIONS);
  return {
    algorithm: ADMIN_VAULT_ALGORITHM,
    iterations: ADMIN_VAULT_ITERATIONS,
    saltHex,
    hashHex,
  };
}

export async function verifyAdminPassword(
  candidatePassword: string,
  stored: { saltHex: string; hashHex: string; iterations: number }
): Promise<boolean> {
  const derived = await deriveAdminPasswordHash(
    candidatePassword,
    stored.saltHex,
    stored.iterations
  );
  return timingSafeEqualHex(derived, stored.hashHex.toLowerCase());
}
