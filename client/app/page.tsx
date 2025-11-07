"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession, signOut } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HeroSection } from "@/components/hero-section"
import { SignInModal } from "@/components/signin-modal"
import { AuditSection } from "@/components/sections/audit-section"
import { CollaborativeLogo } from "@/components/collaborative-logo"

function LandingPageContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [showSignInModal, setShowSignInModal] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Handle auth errors from URL params
  useEffect(() => {
    const error = searchParams.get('error')
    
    if (error === 'AccessDenied' || error === 'OAuthSignin') {
      setAuthError('You don\'t have permission to access this application. Please use an @energi.team email address.')
      setShowSignInModal(true)
      
      // Clear error after showing it
      const timer = setTimeout(() => setAuthError(null), 15000)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Show loading state while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Unauthenticated view - Landing page with hero
  if (!session) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <HeroSection onGetStarted={() => setShowSignInModal(true)} />
        <SignInModal 
          open={showSignInModal} 
          onOpenChange={setShowSignInModal}
          error={authError}
        />
      </div>
    )
  }

  // Authenticated view - App with tabs
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center">
                <CollaborativeLogo size="md" />
              </Link>
              
              {/* Tab Navigation */}
              <nav className="hidden md:flex space-x-1">
                <Link href="/">
                  <button
                    className="px-4 py-2 rounded-lg font-medium transition-colors bg-primary text-primary-foreground"
                  >
                    Audit
                  </button>
                </Link>
                <Link href="/history">
                  <button
                    className="px-4 py-2 rounded-lg font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    History
                  </button>
                </Link>
                <Link href="/analytics">
                  <button
                    className="px-4 py-2 rounded-lg font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    Analytics
                  </button>
                </Link>
              </nav>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-foreground">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.user?.email}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => signOut({ callbackUrl: "/" })}
                variant="outline"
                size="sm"
              >
                Sign Out
              </Button>
            </div>
          </div>

          {/* Mobile Tab Navigation */}
          <div className="md:hidden flex space-x-1 pb-3">
            <Link href="/" className="flex-1">
              <button
                className="w-full px-4 py-2 rounded-lg font-medium transition-colors bg-primary text-primary-foreground"
              >
                Audit
              </button>
            </Link>
            <Link href="/history" className="flex-1">
              <button
                className="w-full px-4 py-2 rounded-lg font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                History
              </button>
            </Link>
            <Link href="/analytics" className="flex-1">
              <button
                className="w-full px-4 py-2 rounded-lg font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                Analytics
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        <AuditSection />
      </main>
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  )
}
