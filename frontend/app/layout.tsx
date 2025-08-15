import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Live Polling System',
  description: 'Interactive live polling system for real-time audience engagement and feedback collection',
  generator: 'Next.js',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
