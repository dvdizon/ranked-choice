'use client'

import Image from 'next/image'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="header">
      <a href="/" className="logo-link">
        <Image
          src="/logo.png"
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
