import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RCV Lunch Picker',
  description: 'Ranked Choice Voting for deciding where to eat',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <main className="container">
          <header className="header">
            <a href="/" className="logo">RCV Lunch Picker</a>
          </header>
          {children}
        </main>
      </body>
    </html>
  )
}
