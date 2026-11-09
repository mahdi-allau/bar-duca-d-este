import "server-only";
import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";

const KEY_LEN = 64;
const N = 16384;

function scryptAsync(password: string, salt: Buffer, keylen: number, cost: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, { N: cost }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

/** scrypt$N$salt$hash (all base64url) */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LEN, N);
  return `scrypt$${N}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, cost, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !cost || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64url"), expected.length, Number(cost));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");
