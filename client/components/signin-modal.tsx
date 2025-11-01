"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface SignInModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  error?: string | null
}

export function SignInModal({ open, onOpenChange, error: externalError }: SignInModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Display external error (from auth callback) or internal error
  const displayError = externalError || error

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Redirect to Google OAuth
      await signIn("google", {
        callbackUrl: "/",
      })
    } catch (error) {
      setIsLoading(false)
      setError("An unexpected error occurred. Please try again.")
    }
  }

  const handleGoHome = () => {
    setError(null)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-w-md mx-auto rounded-t-2xl">
        {displayError ? (
          // Access Denied View
          <div className="py-6">
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Error Icon */}
              <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" strokeWidth="2"/>
                </svg>
              </div>

              {/* Error Title */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
                <p className="text-muted-foreground">
                  {displayError}
                </p>
              </div>

              {/* Help Section */}
              <div className="w-full bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground mb-1">Need Help?</p>
                    <p className="text-xs text-muted-foreground">
                      If you're an Energi team member and still can't access the platform, please contact your system administrator.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col w-full space-y-3">
                <Button
                  onClick={() => {
                    setError(null)
                    handleGoogleSignIn()
                  }}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-lg font-medium"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full py-3 rounded-lg font-medium"
                >
                  Go Home
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">Error Code: AccessDenied</p>
            </div>
          </div>
        ) : (
          // Normal Sign In View
          <>
            <SheetHeader>
              <SheetTitle className="text-center text-2xl">Welcome to Energi</SheetTitle>
              <SheetDescription className="text-center">
                Smart Contract Auditing Platform
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-dark rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-primary-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
              </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-primary"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-muted-foreground">
                  Only @energi.team email addresses are allowed to access this platform.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-muted hover:bg-muted/80 text-foreground border border-border font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>
              {isLoading ? "Signing in..." : "Continue with Google"}
            </span>
          </Button>

              <div className="text-center pt-2">
                <p className="text-xs text-muted-foreground">
                  By signing in, you agree to our terms of service and privacy policy.
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

