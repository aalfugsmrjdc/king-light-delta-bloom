import { DEFAULT_PASSPHRASE, DEFAULT_SALT_ASCII } from "./types";

const enc = new TextEncoder();
const dec = new TextDecoder();
const ITERATIONS = 100_000;

function asBuffer(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;
}

export function defaultSalt(): Uint8Array {
  return enc.encode(DEFAULT_SALT_ASCII);
}

export async function hashPassword(
  password: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: asBuffer(salt), iterations: ITERATIONS, hash: "SHA-256" },
    base,
    256,
  );
  return new Uint8Array(bits);
}

export async function deriveAesKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: asBuffer(salt), iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function deriveDefaultKey(): Promise<CryptoKey> {
  return deriveAesKey(DEFAULT_PASSPHRASE, defaultSalt());
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function encryptBytes(
  data: Uint8Array,
  key: CryptoKey,
): Promise<{ nonce: Uint8Array; ciphertext: Uint8Array }> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBuffer(nonce) },
    key,
    asBuffer(data),
  );
  return { nonce, ciphertext: new Uint8Array(ciphertext) };
}

export async function decryptBytes(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  key: CryptoKey,
): Promise<Uint8Array> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: asBuffer(nonce) },
    key,
    asBuffer(ciphertext),
  );
  return new Uint8Array(plain);
}

export async function encryptJson(
  value: unknown,
  key: CryptoKey,
): Promise<{ nonce: Uint8Array; ciphertext: Uint8Array }> {
  return encryptBytes(enc.encode(JSON.stringify(value)), key);
}

export async function decryptJson<T>(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  key: CryptoKey,
): Promise<T> {
  const bytes = await decryptBytes(ciphertext, nonce, key);
  return JSON.parse(dec.decode(bytes)) as T;
}

export function toB64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

export function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
