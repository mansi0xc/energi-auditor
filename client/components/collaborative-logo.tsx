import React from "react"

interface CollaborativeLogoProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function CollaborativeLogo({ size = "md", className = "" }: CollaborativeLogoProps) {
  const sizes = {
    sm: { height: "h-6", connector: "text-xs", gap: "gap-2" },
    md: { height: "h-8", connector: "text-sm", gap: "gap-3" },
    lg: { height: "h-12", connector: "text-base", gap: "gap-4" }
  }

  const sizeConfig = sizes[size]

  return (
    <div className={`flex items-center ${sizeConfig.gap} ${className}`}>
      {/* Energi Logo */}
      <img
        src="https://eadn-wc01-5393995.nxedge.io/wp-content/uploads/2024/04/Energi-logo-Light.svg"
        alt="Energi"
        className={`${sizeConfig.height} w-auto object-contain`}
      />
      
      {/* Collaboration Indicator */}
      <span className={`${sizeConfig.connector} text-primary font-bold`}>×</span>
      
      {/* ChainGPT Logo */}
      <img
        src="https://cdn.prod.website-files.com/64354b8ce4872ad8cd1c7b04/648329053d5c25f54cbb89c2_chaingpt-logoLight-Neon-2.svg"
        alt="ChainGPT"
        className={`${sizeConfig.height} w-auto object-contain`}
      />
    </div>
  )
}

