import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'FinePrint Studio — Maldivian Art Marketplace',
  description: 'Browse and order fine art prints by Maldivian artists, printed and fulfilled by FinePrint Studio.',
  openGraph: {
    title: 'FinePrint Studio',
    description: 'Original artwork by Maldivian artists.',
    url: 'https://fineprintmv.com',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              borderRadius: '20px',
              background: '#1a1a1a',
              color: '#fff',
              padding: '10px 18px',
            },
            success: {
              iconTheme: {
                primary: '#1D9E75',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#E24B4A',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
