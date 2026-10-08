import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey() {
  const source = process.env.PII_ENCRYPTION_KEY ?? process.env.DATABASE_URL;
  if (!source) throw new Error("PII_ENCRYPTION_KEY or DATABASE_URL is required for personal data encryption");
  return createHash("sha256").update(source).digest();
}

export function encryptEmail(value: string | null | undefined) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `gcm1:${iv.toString("base64url")}:${authTag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function decryptEmail(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith("gcm1:")) return value;
  try {
    const [, encodedIv, encodedTag, encodedCiphertext] = value.split(":");
    if (!encodedIv || !encodedTag || !encodedCiphertext) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(encodedIv, "base64url"));
    decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
