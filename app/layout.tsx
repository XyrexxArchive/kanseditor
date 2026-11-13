import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'KansEditor — Photo Studio',
  description: 'Edit, enhance, and export your photos in one lightweight studio.',
  applicationName: 'KansEditor',
  metadataBase: new URL('https://kanseditor.vercel.app'),
  openGraph: { title: 'KansEditor — Photo Studio', description: 'Your photo, your style. Edit and export in HD.', type: 'website' },
  twitter: { card: 'summary_large_image', title: 'KansEditor — Photo Studio', description: 'Your photo, your style. Edit and export in HD.' },
}

export const viewport: Viewport = { themeColor: '#090b10', width: 'device-width', initialScale: 1, maximumScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>
}
