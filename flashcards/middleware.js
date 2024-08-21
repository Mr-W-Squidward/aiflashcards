import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Apply Clerk middleware only to these specific routes
    '/((?!_next|static|.*\\..*|favicon.ico).*)', // Ignore Next.js internals and static files
    '/',
    '/((?!signin|signup|_next|.*\\..*|favicon.ico).*)', // Ensure that signin and signup are not blocked
    '/api/(.*)', // Ensure API routes are always protected
  ],
};
