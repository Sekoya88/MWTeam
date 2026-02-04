'use client'

import { useState } from 'react'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  href?: string
  className?: string
}

const LOGO_SIZES = { sm: 32, md: 48, lg: 64 }

export function Logo({ size = 'md', showText = true, href, className = '' }: LogoProps) {
  const [imgError, setImgError] = useState(false)
  const px = LOGO_SIZES[size]
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }

  const content = (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className={`${sizeClasses[size]} flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-lg overflow-hidden`}>
        {imgError ? (
          <span className="font-bold text-gray-600" style={{ fontSize: px * 0.4 }}>MW</span>
        ) : (
          <img
            src="/logo.png"
            alt="MWTeam"
            width={px}
            height={px}
            className="object-contain w-full h-full"
            loading="eager"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-black ${textSizeClasses[size]}`}>
            MWTeam
          </span>
          <span className={`text-gray-600 ${size === 'sm' ? 'text-xs' : 'text-xs'}`}>
            Middle Distance Running
          </span>
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    )
  }

  return content
}

