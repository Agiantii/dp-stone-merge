import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'dp-stone-merge',
  keywords: ['stone merge', 'visualization', 'algorithm', 'dynamic programming'],
  description: 'A visualization of the Stone Merge algorithm',
  generator: 'next.js',
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
