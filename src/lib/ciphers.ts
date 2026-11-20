// Pure functions for various text ciphers. AES-GCM uses the Web Crypto API
// (real, secure encryption); the rest are classical/encoding methods.

export type CipherMethod = 'aes-gcm' | 'caesar' | 'vigenere' | 'base64' | 'rot13';

export interface CipherInfo {
  id: CipherMethod;
  label: string;
  description: string;
  needsKey: boolean;
  keyLabel?: string;
  keyPlaceholder?: string;
  secure: boolean;
}

export const CIPHER_METHODS: CipherInfo[] = [
  {
    id: 'aes-gcm',
    label: 'AES-GCM (Secure)',
    description:
      'Military-grade authenticated encryption. Uses the Web Crypto API with a 256-bit key derived from your passphrase via PBKDF2. Truly secure.',
    needsKey: true,
    keyLabel: 'Passphrase',
    keyPlaceholder: 'Enter a strong passphrase…',
    secure: true,
  },
  {
    id: 'vigenere',
    label: 'Vigenère Cipher',
    description:
      'A classical polyalphabetic cipher that uses a keyword to shift each letter. Better than Caesar, but not cryptographically secure.',
    needsKey: true,
    keyLabel: 'Keyword',
    keyPlaceholder: 'Letters only (e.g. secret)…',
    secure: false,
  },
  {
    id: 'caesar',
    label: 'Caesar Cipher',
    description:
      'One of the oldest known ciphers — each letter is shifted by a fixed number of places. Great for learning, not for secrets.',
    needsKey: true,
    keyLabel: 'Shift (1–25)',
    keyPlaceholder: 'e.g. 3',
    secure: false,
  },
  {
    id: 'rot13',
    label: 'ROT13',
    description:
      "A Caesar cipher with a fixed shift of 13. Because 13 is half of 26, encrypting and decrypting are the same operation — press the same button twice to get back the original.",
    needsKey: false,
    secure: false,
  },
  {
    id: 'base64',
    label: 'Base64 Encoding',
    description:
      'Not encryption at all — just an encoding that represents text as printable ASCII characters. Anyone can decode it instantly.',
    needsKey: false,
    secure: false,
  },
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/g, '');
}

export function caesarShift(text: string, shift: number): string {
  const s = ((shift % 26) + 26) % 26;
  return text.replace(/[a-z]/gi, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(((ch.charCodeAt(0) - base + s) % 26) + base);
  });
}

export function vigenere(text: string, key: string, decrypt = false): string {
  const k = normalizeKey(key);
  if (!k) return text;
  let ki = 0;
  return text.replace(/[a-z]/gi, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    const shift = k.charCodeAt(ki % k.length) - 97;
    ki++;
    const s = decrypt ? (26 - shift) % 26 : shift;
    return String.fromCharCode(((ch.charCodeAt(0) - base + s) % 26) + base);
  });
}

export function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

export function fromBase64(text: string): string {
  const binary = atob(text.trim());
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// --- AES-GCM via Web Crypto API ---

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 250_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/\s+/g, '');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

export async function aesEncrypt(text: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(text))
  );
  // output = salt(16) + iv(12) + ciphertext, hex-encoded
  const combined = new Uint8Array(salt.length + iv.length + cipher.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(cipher, salt.length + iv.length);
  return toHex(combined);
}

export async function aesDecrypt(hex: string, passphrase: string): Promise<string> {
  const combined = fromHex(hex);
  if (combined.length < 28) throw new Error('Encrypted data is too short or corrupted.');
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const cipher = combined.slice(28);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipher as BufferSource
  );
  return dec.decode(plain);
}

// --- Unified entry points ---

export async function encrypt(
  method: CipherMethod,
  text: string,
  key: string
): Promise<string> {
  switch (method) {
    case 'aes-gcm':
      if (!key) throw new Error('A passphrase is required for AES-GCM encryption.');
      return aesEncrypt(text, key);
    case 'caesar': {
      const shift = parseInt(key, 10);
      if (Number.isNaN(shift)) throw new Error('Caesar shift must be a number between 1 and 25.');
      return caesarShift(text, shift);
    }
    case 'vigenere': {
      if (!normalizeKey(key)) throw new Error('Vigenère keyword must contain at least one letter.');
      return vigenere(text, key, false);
    }
    case 'rot13':
      return caesarShift(text, 13);
    case 'base64':
      return toBase64(text);
  }
}

export async function decrypt(
  method: CipherMethod,
  text: string,
  key: string
): Promise<string> {
  switch (method) {
    case 'aes-gcm':
      if (!key) throw new Error('A passphrase is required for AES-GCM decryption.');
      return aesDecrypt(text, key);
    case 'caesar': {
      const shift = parseInt(key, 10);
      if (Number.isNaN(shift)) throw new Error('Caesar shift must be a number between 1 and 25.');
      return caesarShift(text, -shift);
    }
    case 'vigenere': {
      if (!normalizeKey(key)) throw new Error('Vigenère keyword must contain at least one letter.');
      return vigenere(text, key, true);
    }
    case 'rot13':
      return caesarShift(text, 13);
    case 'base64':
      return fromBase64(text);
  }
}
