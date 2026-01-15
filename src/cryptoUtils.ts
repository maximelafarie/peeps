// Types for crypto operations
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedMessage {
  iv: Uint8Array;
  ciphertext: ArrayBuffer;
}

export interface SessionKeys {
  [peerId: string]: CryptoKey;
}

// Generate ECDH keypair for P-256 (supported in all browsers)
export async function generateKeyPair(): Promise<KeyPair> {
  return await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
}

// Export public key as raw bytes
export async function exportPublicKey(
  publicKey: CryptoKey,
): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey("raw", publicKey));
}

// Import public key from raw bytes
export async function importPublicKey(
  publicKeyRaw: Uint8Array,
): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    publicKeyRaw.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    [],
  );
}

// Derive shared secret using ECDH
export async function deriveSharedSecret(
  privateKey: CryptoKey,
  peerPublicKey: CryptoKey,
): Promise<ArrayBuffer> {
  return await crypto.subtle.deriveBits(
    { name: "ECDH", public: peerPublicKey },
    privateKey,
    256,
  );
}

// Derive AES key using HKDF
export async function deriveAESKey(
  sharedSecret: ArrayBuffer,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const sessionKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveKey"],
  );

  return await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt.buffer as ArrayBuffer,
      info: new TextEncoder().encode("chat-e2ee"),
    },
    sessionKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// Encrypt a message
export async function encryptMessage(
  key: CryptoKey,
  message: string,
): Promise<EncryptedMessage> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(message);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded,
  );

  return { iv, ciphertext };
}

// Decrypt a message
export async function decryptMessage(
  key: CryptoKey,
  encrypted: EncryptedMessage,
): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: encrypted.iv.buffer as ArrayBuffer },
    key,
    encrypted.ciphertext,
  );

  return new TextDecoder().decode(plaintext);
}

// Generate a group key (AES-GCM)
export async function generateGroupKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

// Export group key as raw bytes (for distribution)
export async function exportGroupKey(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey("raw", key));
}

// Import group key from raw bytes
export async function importGroupKey(keyRaw: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    keyRaw.buffer as ArrayBuffer,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

// Compute fingerprint of public key for verification
export async function computeFingerprint(
  publicKey: CryptoKey,
): Promise<string> {
  const raw = await exportPublicKey(publicKey);
  const hash = await crypto.subtle.digest("SHA-256", raw.buffer as ArrayBuffer);
  const hashArray = new Uint8Array(hash);
  return Array.from(hashArray.slice(0, 8)) // First 8 bytes for short fingerprint
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
