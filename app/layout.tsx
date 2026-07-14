import type React from "react"
import type { Metadata, Viewport } from "next"
import { AuthGuard } from "@/components/auth-guard"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "Nexify Terminal",
  description: "High-Performance Interactive Cyberpunk Terminal Dashboard",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Nexify",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
        type: "image/png",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
        type: "image/png",
      },
      {
        url: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: "/icons/icon-1024x1024.png",
  },
  // Security metadata
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
  referrer: "strict-origin-when-cross-origin",
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AuthGuard>
          {children}
        </AuthGuard>
        <Toaster />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(reg) { console.log('ServiceWorker registered:', reg.scope); },
                    function(err) { console.warn('ServiceWorker registration failed:', err); }
                  );
                });
              }
            `
          }}
        />
      </body>
    </html>
  )
}
