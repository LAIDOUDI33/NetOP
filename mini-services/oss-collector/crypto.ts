// ============================================================================
// oss-collector — Credential Encryption at Rest
// Uses AES-256-GCM via Bun's built-in crypto (Web Crypto API)
// ============================================================================

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const TAG_LENGTH = 128;

/** Derive a stable encryption key from a passphrase + salt */
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string. Returns base64-encoded string:
 * format: base64(salt || iv || ciphertext || tag)
 */
export async function encrypt(plaintext: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(passphrase, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoder.encode(plaintext)
  );

  // Combine salt + iv + ciphertext into a single buffer
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(encrypted), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a base64-encoded ciphertext back to plaintext.
 */
export async function decrypt(ciphertextB64: string, passphrase: string): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 16 + IV_LENGTH);
  const data = combined.slice(16 + IV_LENGTH);

  const key = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Serialize credentials object to JSON string then encrypt.
 */
export async function encryptCredentials(
  username: string,
  password: string,
  passphrase: string
): Promise<string> {
  const json = JSON.stringify({ username, password });
  return encrypt(json, passphrase);
}

/**
 * Decrypt credentials back to { username, password }.
 */
export async function decryptCredentials(
  encrypted: string,
  passphrase: string
): Promise<{ username: string; password: string }> {
  // Handle base64-encoded seed credentials (no AES encryption)
  try {
    const decoded = atob(encrypted);
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.username === 'string' && typeof parsed.password === 'string') {
      return parsed;
    }
  } catch {
    // Not base64 JSON — fall through to AES decryption
  }
  const json = await decrypt(encrypted, passphrase);
  return JSON.parse(json) as { username: string; password: string };
}
