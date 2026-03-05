import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
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
