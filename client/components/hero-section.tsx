import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import DarkVeilBackground from "@/components/dark-veil-background"
import { CollaborativeLogo } from "@/components/collaborative-logo"

interface HeroSectionProps {
  onGetStarted?: () => void
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="flex flex-col items-center justify-center text-center relative w-full h-screen overflow-hidden">
      {/* Dark Veil Background */}
      <div className="absolute inset-0 z-0">
        <DarkVeilBackground speed={1.5} warpAmount={1.5} hueShift={152} noiseIntensity={0.02} />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 space-y-4 md:space-y-5 lg:space-y-6 mb-6 md:mb-7 lg:mb-9 max-w-md md:max-w-[500px] lg:max-w-[588px] px-4">
        <h1 className="text-foreground text-3xl md:text-4xl lg:text-6xl font-semibold leading-tight">
          Find Vulnerabilities Before Hackers Do
        </h1>
        <p className="text-muted-foreground text-base md:text-base lg:text-lg font-medium leading-relaxed max-w-lg mx-auto">
          Powered by ChainGPT AI to detect vulnerabilities, optimize gas usage, and ensure your smart contracts are
          production-ready.
        </p>
      </div>

      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-4 mb-12">
        <Button 
          onClick={onGetStarted}
          className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 py-3 rounded-full font-medium text-base shadow-lg ring-1 ring-white/10"
        >
          Get Started
        </Button>
        <Link href="/analytics">
          <Button 
            variant="outline"
            className="px-8 py-3 rounded-full font-medium text-base shadow-lg ring-1 ring-white/10"
          >
            View Analytics
          </Button>
        </Link>
      </div>

      {/* Collaborative Branding */}
      <div className="relative z-10 flex flex-col items-center space-y-8 mt-8">
        {/* Collaborative Logo with Glow */}
        <div className="relative group">
          {/* Glow Background */}
          <div className="absolute -inset-8 bg-gradient-to-r from-primary via-primary-light to-primary opacity-40 blur-3xl group-hover:opacity-60 transition-opacity duration-500"></div>
          
          {/* Logo Container */}
          <div className="relative">
            <CollaborativeLogo size="lg" />
          </div>
        </div>

        {/* Platform Description */}
        <div className="flex flex-col items-center space-y-3">
          <div className="flex items-center space-x-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary"></div>
            <p className="text-sm md:text-base text-muted-foreground font-medium tracking-widest uppercase">
              Smart Contract Auditor
            </p>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary"></div>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground/80 font-light tracking-wide">
            Powered by AI • Secured by Expertise
          </p>
        </div>

        {/* Decorative Elements */}
        <div className="flex items-center space-x-4 text-muted-foreground text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span>AI-Powered</span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150"></div>
            <span>Secure</span>
          </div>
          <span>•</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-300"></div>
            <span>Reliable</span>
          </div>
        </div>
      </div>
    </section>
  )
}
