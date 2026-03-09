import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export interface DaftarContext {
  userId: string;
  email: string;
  role: string;
  brands: string[];
  source: "daftar" | "local";
}

/**
 * Get the authenticated user context from either Daftar proxy headers
 * or the local NextAuth session. Returns null if unauthenticated.
 */
export async function getDaftarContext(): Promise<DaftarContext | null> {
  const hdrs = await headers();
  const daftarUser = hdrs.get("x-daftar-user");

  // If request came through Daftar's module proxy
  if (daftarUser) {
    return {
      userId: daftarUser,
      email: hdrs.get("x-daftar-email") || "",
      role: hdrs.get("x-daftar-role") || "MEMBER",
      brands: JSON.parse(hdrs.get("x-daftar-brands") || "[]"),
      source: "daftar",
    };
  }

  // Fall back to local NextAuth session
  const session = await getServerSession(authOptions);
  if (session?.user) {
    return {
      userId: (session.user as { id?: string }).id || "",
      email: session.user.email || "",
      role: "ADMIN",
      brands: [],
      source: "local",
    };
  }

  return null;
}
