import type { NextRequest } from "next/server";
import { appRoles, normalizeRole } from "@/lib/permissions";
import type { AppRole } from "@/lib/permissions";

export type SessionPayload = {
  sub: string;
  email: string;
  role: string;
  exp: number;
};

export const sessionCookieName = "fdh_session";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

export async function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
  secret: string,
  ttlSeconds = 60 * 60 * 12,
): Promise<string> {
  const body: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(body)));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token: string | undefined, secret: string): Promise<SessionPayload | null> {
  if (!token || !secret) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await sign(encodedPayload, secret);
  if (!timingSafeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload))) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export class AuthRequiredError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class RoleRequiredError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "RoleRequiredError";
  }
}

export async function requireAuth(request: NextRequest): Promise<SessionPayload> {
  const session = await verifySessionToken(request.cookies.get(sessionCookieName)?.value, process.env.SESSION_SECRET ?? "");
  if (!session) throw new AuthRequiredError();
  return session;
}

export async function requireRole(request: NextRequest, roles: AppRole[]): Promise<SessionPayload> {
  const session = await requireAuth(request);
  const role = normalizeRole(session.role);
  const allowedRoles = roles.filter((value) => appRoles.includes(value));
  if (!allowedRoles.includes(role)) throw new RoleRequiredError();
  return session;
}
