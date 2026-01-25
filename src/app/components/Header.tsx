'use client'

import ThemeToggle from './ThemeToggle'

export default function Header() {
  return (
    <header className="header">
      <a href="/" className="logo">RCV Lunch Picker</a>
      <ThemeToggle />
    </header>
  )
}
