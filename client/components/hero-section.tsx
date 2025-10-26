import React from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import DarkVeilBackground from "@/components/dark-veil-background"

export function HeroSection() {
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

      <Link href="/audit">
        <Button className="relative z-10 bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 py-3 rounded-full font-medium text-base shadow-lg ring-1 ring-white/10 mb-12">
          Get Started
        </Button>
      </Link>

      {/* Energi Branding */}
      <div className="relative z-10 flex flex-col items-center space-y-6 mt-8">
        {/* Logo Container with Glow Effect */}
        <div className="relative group">
          {/* Glow Background */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary via-primary-light to-primary opacity-40 blur-3xl group-hover:opacity-60 transition-opacity duration-500"></div>
          
          {/* Logo Circle */}
          <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-2xl ring-2 ring-primary/40 group-hover:ring-primary/60 transition-all duration-300 group-hover:scale-110">
            <svg
              className="w-10 h-10 text-primary-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        </div>

        {/* Brand Name */}
        <div className="flex flex-col items-center space-y-2">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-transparent tracking-tight">
            ENERGI
          </h2>
          <div className="flex items-center space-x-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary"></div>
            <p className="text-sm md:text-base text-muted-foreground font-medium tracking-widest uppercase">
              Smart Contract Auditor
            </p>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary"></div>
          </div>
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
