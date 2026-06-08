import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const cookieName = "northstar_admin_session";
const sessionValue = "admin@northstar-demo.dev";

function secret() {
  return process.env.NORTHSTAR_ADMIN_SESSION_SECRET ?? "northstar-local-demo-session-secret";
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function createAdminSessionToken() {
  return `${Buffer.from(sessionValue).toString("base64url")}.${sign(sessionValue)}`;
}

export function verifyAdminSessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return false;
  }

  const value = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = sign(value);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    value === sessionValue &&
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function isAdminLoggedIn() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(cookieName)?.value);
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, createAdminSessionToken(), {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}
