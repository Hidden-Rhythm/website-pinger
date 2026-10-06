import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pulse — Advanced Database-Free Website Monitoring',
  description: 'Monitor websites and APIs, track response times and uptime, receive notifications — completely database-free.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/favicon.ico',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const prefs = JSON.parse(localStorage.getItem('pulse_preferences_v1') || '{}');
                const theme = prefs.theme || 'oled';
                const accent = prefs.accent || 'cyan';
                document.documentElement.classList.add('theme-' + theme, 'accent-' + accent);
                document.body?.classList.add('theme-' + theme, 'accent-' + accent);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="theme-oled accent-cyan min-h-screen bg-background text-text-primary antialiased selection:bg-accent/20 selection:text-accent">
        {children}
      </body>
    </html>
  );
}
