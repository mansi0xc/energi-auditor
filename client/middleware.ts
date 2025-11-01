import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Middleware for API routes - require authentication
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // For API routes that need auth, require token
        if (req.nextUrl.pathname.startsWith("/api/audit") ||
            req.nextUrl.pathname.startsWith("/api/logs") ||
            req.nextUrl.pathname.startsWith("/api/user")) {
          return !!token
        }
        
        // For other routes, allow access
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/api/audit/:path*",
    "/api/logs/:path*",
    "/api/user/:path*"
  ]
}
