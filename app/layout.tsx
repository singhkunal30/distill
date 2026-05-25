import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';
import { ThemeScript } from '@/components/theme/theme-script';
import { RegisterSW } from '@/components/pwa/register-sw';

export const metadata: Metadata = {
  title: {
    default: 'Distill — The essence of every book.',
    template: '%s · Distill',
  },
  description:
    'Distill takes the essence of every book you read — summaries, insights, and connections — and keeps it within reach.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Distill',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Distill',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f2e8' },
    { media: '(prefers-color-scheme: dark)', color: '#11161f' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body
        style={
          {
            '--font-sans':
              'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Inter", sans-serif',
            '--font-serif':
              'ui-serif, "Source Serif Pro", "Iowan Old Style", "Apple Garamond", Georgia, serif',
          } as React.CSSProperties
        }
      >
        <Providers>
          {children}
          <RegisterSW />
        </Providers>
      </body>
    </html>
  );
}
