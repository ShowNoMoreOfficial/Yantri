import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const DAFTAR_ORIGINS = [
  "https://daftar-one.vercel.app",
  "http://localhost:3000",
];

function addCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && DAFTAR_ORIGINS.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Daftar-User, X-Daftar-Role, X-Daftar-Email, X-Daftar-Brands");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  return response;
}

// Page routes that require authentication
const AUTH_PAGES = [
  "/dashboard",
  "/trends",
  "/brands",
  "/platform-rules",
  "/plan",
  "/history",
  "/performance",
  "/workspace",
  "/narrative-trees",
];

export async function middleware(req: NextRequest) {
  const origin = req.headers.get("origin");
  const { pathname } = req.nextUrl;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, origin);
  }

  // If request comes from Daftar proxy (has X-Daftar-User header), bypass NextAuth
  const daftarUser = req.headers.get("x-daftar-user");
  if (daftarUser) {
    const response = NextResponse.next();
    // Allow iframe embedding from Daftar
    response.headers.set("Content-Security-Policy", `frame-ancestors 'self' ${DAFTAR_ORIGINS.join(" ")}`);
    response.headers.delete("X-Frame-Options");
    return addCorsHeaders(response, origin);
  }

  // For API routes, check for Daftar headers or NextAuth session
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const token = await getToken({ req });
    const hasDaftarAuth = !!req.headers.get("x-daftar-user");
    if (!token && !hasDaftarAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.next();
    return addCorsHeaders(response, origin);
  }

  // For page routes, check NextAuth session
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));
  if (isAuthPage) {
    const token = await getToken({ req });
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  const response = NextResponse.next();
  // Allow iframe embedding from Daftar for all pages
  response.headers.set("Content-Security-Policy", `frame-ancestors 'self' ${DAFTAR_ORIGINS.join(" ")}`);
  response.headers.delete("X-Frame-Options");
  return addCorsHeaders(response, origin);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/trends/:path*",
    "/brands/:path*",
    "/platform-rules/:path*",
    "/plan/:path*",
    "/history/:path*",
    "/performance/:path*",
    "/workspace/:path*",
    "/narrative-trees/:path*",
  ],
};
