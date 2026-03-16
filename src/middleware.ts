export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    // Protect all routes except login, API auth, static files
    "/((?!login|signup|api/auth|api/webhooks|_next/static|_next/image|favicon.ico).*)",
  ],
};
