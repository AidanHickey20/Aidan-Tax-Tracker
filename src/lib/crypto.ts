import crypto from "crypto";

/**
 * Symmetric encryption for secrets at rest (Plaid access tokens).
 *
 * Uses AES-256-GCM: authenticated encryption, so tampering is detected on
 * decrypt. A fresh random IV is generated per encryption. The stored payload
 * is "iv.authTag.ciphertext", each part base64-encoded.
 *
 * The key comes from PLAID_ENCRYPTION_KEY — a base64-encoded 32-byte value.
 * Rotating the key invalidates existing ciphertext (users must re-link).
 */

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.PLAID_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("PLAID_ENCRYPTION_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("PLAID_ENCRYPTION_KEY must decode to 32 bytes (base64 of 32 random bytes)");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit nonce, recommended for GCM
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
