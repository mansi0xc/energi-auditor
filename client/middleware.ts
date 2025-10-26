import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Allow access to audit routes only for authenticated users
    if (req.nextUrl.pathname.startsWith("/audit")) {
      if (!req.nextauth.token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url))
      }
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // For audit routes, require authentication
        if (req.nextUrl.pathname.startsWith("/audit")) {
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
    "/audit/:path*",
    "/api/audit/:path*",
    "/logs/:path*",
    "/api/logs/:path*",
    "/api/user/:path*"
  ]
}
