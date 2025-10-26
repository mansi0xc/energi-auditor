"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "AccessDenied":
        return {
          title: "Access Denied",
          message: "You don't have permission to access this application. Please use an @energi.team email address.",
          icon: "🚫"
        }
      case "Configuration":
        return {
          title: "Configuration Error",
          message: "There's a configuration issue with the authentication system. Please contact support.",
          icon: "⚙️"
        }
      case "Verification":
        return {
          title: "Verification Error",
          message: "Unable to verify your email address. Please try again.",
          icon: "✉️"
        }
      default:
        return {
          title: "Authentication Error",
          message: "An unexpected error occurred during sign-in. Please try again.",
          icon: "❌"
        }
    }
  }

  const errorInfo = getErrorMessage(error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8 bg-card border border-border rounded-xl shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-4">{errorInfo.icon}</div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {errorInfo.title}
          </h1>
          <p className="text-muted-foreground mb-8">
            {errorInfo.message}
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-accent/20 border border-accent rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-primary"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-foreground">
                  Need Help?
                </h3>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>
                    If you're an Energi team member and still can't access the platform,
                    please contact your system administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button asChild className="flex-1">
              <Link href="/auth/signin">
                Try Again
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/">
                Go Home
              </Link>
            </Button>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Error Code: {error || "UNKNOWN"}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full space-y-8 p-8 bg-card border border-border rounded-xl shadow-2xl">
          <div className="text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Loading...
            </h1>
            <p className="text-muted-foreground mb-8">
              Please wait while we load the error information.
            </p>
          </div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}