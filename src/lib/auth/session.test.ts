import { describe, it, expect, beforeEach } from "vitest";
import { createSessionToken, isValidSessionToken, isCorrectPassword } from "./session";

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret";
  process.env.APP_PASSWORD = "hunter2";
});

describe("session tokens", () => {
  it("accepts a freshly created token", async () => {
    expect(await isValidSessionToken(await createSessionToken())).toBe(true);
  });

  it("rejects missing or malformed tokens", async () => {
    expect(await isValidSessionToken(undefined)).toBe(false);
    expect(await isValidSessionToken("garbage")).toBe(false);
    expect(await isValidSessionToken("123.badsig")).toBe(false);
  });

  it("rejects expired tokens", async () => {
    const token = await createSessionToken(Date.now() - 1000 * 60 * 60 * 24 * 31);
    expect(await isValidSessionToken(token)).toBe(false);
  });

  it("rejects tampered payloads", async () => {
    const token = await createSessionToken();
    const [payload, sig] = token.split(".");
    expect(await isValidSessionToken(`${Number(payload) + 999999}.${sig}`)).toBe(false);
  });
});

describe("isCorrectPassword", () => {
  it("matches the configured password", () => {
    expect(isCorrectPassword("hunter2")).toBe(true);
    expect(isCorrectPassword("wrong")).toBe(false);
  });

  it("rejects everything when no password configured", () => {
    delete process.env.APP_PASSWORD;
    expect(isCorrectPassword("")).toBe(false);
  });
});
