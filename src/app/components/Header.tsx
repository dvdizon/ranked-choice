'use client'

import Image from 'next/image'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  return (
    <header className="header">
      <a href="/" className="logo-link">
        <Image
          src={`${basePath}/logo.png`}
          alt="RCV App"
          width={120}
          height={120}
          className="logo-image"
          priority
        />
      </a>
      <ThemeToggle />
    </header>
  )
}
