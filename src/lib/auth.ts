import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { createHash } from "crypto";
import { prisma } from "./prisma";

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || "terminovka-super-secret-key-production-grade-2026-safe"
);

export const COOKIE_NAME = "terminovka_auth_token";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR";
}

export async function createSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET_KEY);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Autorizace přes osobní API token (AI / MCP): "Authorization: Bearer trm_..."
async function getUserFromBearerToken(): Promise<SessionPayload | null> {
  const auth = (await headers()).get("authorization");
  const match = auth?.match(/^Bearer\s+(trm_[A-Za-z0-9_-]+)$/);
  if (!match) return null;

  const record = await prisma.apiToken.findUnique({
    where: { tokenHash: hashApiToken(match[1]) },
    include: { user: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  });
  if (!record || !record.user.isActive) return null;

  prisma.apiToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return {
    userId: record.user.id,
    email: record.user.email,
    name: record.user.name,
    role: record.user.role as "ADMIN" | "EDITOR",
  };
}

export async function getCurrentUser(): Promise<SessionPayload | null> {
  const bearerUser = await getUserFromBearerToken();
  if (bearerUser) return bearerUser;

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await verifyToken(token);
  if (!session) return null;

  // Verify active user in DB
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "ADMIN" | "EDITOR",
  };
}

export async function requireAuth(): Promise<SessionPayload> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
