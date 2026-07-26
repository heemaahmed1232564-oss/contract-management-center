import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { AppError } from "@/lib/api-error";

const VERSION = "v1";

function encryptionKey() {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError(
      "DRIVE_ENCRYPTION_NOT_CONFIGURED",
      "مفتاح حماية اتصال Google Drive غير مضبوط.",
      503,
    );
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

export function decryptSecret(payload: string) {
  try {
    const [version, ivEncoded, tagEncoded, ciphertextEncoded] = payload.split(".");
    if (version !== VERSION || !ivEncoded || !tagEncoded || !ciphertextEncoded) {
      throw new Error("Invalid encrypted payload");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(ivEncoded, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "DRIVE_TOKEN_INVALID",
      "تعذر قراءة اتصال Google Drive المحفوظ. أعد ربط الحساب.",
      503,
    );
  }
}
