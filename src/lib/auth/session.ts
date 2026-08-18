/**
 * Edge-safe session utilities (Web Crypto only) so the same code runs in
 * Next.js middleware and in Node server actions.
 */
const SESSION_COOKIE = "bookit_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

const secret = () => process.env.SESSION_SECRET ?? "dev-secret-change-me";

const hmacKey = async () =>
  crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);

const toBase64Url = (buffer: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const sign = async (payload: string): Promise<string> =>
  toBase64Url(await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload)));

export const createSessionToken = async (now = Date.now()): Promise<string> => {
  const payload = String(now + SESSION_TTL_MS);
  return `${payload}.${await sign(payload)}`;
};

export const isValidSessionToken = async (
  token: string | undefined,
  now = Date.now(),
): Promise<boolean> => {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = await sign(payload);
  if (!timingSafeEqualStr(signature, expected)) return false;
  return Number(payload) > now;
};

const timingSafeEqualStr = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export const isCorrectPassword = (password: string): boolean => {
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) return false;
  return timingSafeEqualStr(password, expected);
};

export const sessionCookieName = SESSION_COOKIE;
