import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "sonner";
import { GlobalShortcutsProvider } from "@/providers/GlobalShortcutsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

const customFont = localFont({
  src: "./fonts/RIDIBatang.otf",
  variable: "--font-sans",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Calentask",
  description: "통합 캘린더 애플리케이션",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Calentask",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={customFont.variable} suppressHydrationWarning>
      <body className={`antialiased font-sans`}>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.deferredPWAEvent = null;
            window.__pwaPromptFired = false;
            window.addEventListener('beforeinstallprompt', function(e) {
              e.preventDefault();
              window.deferredPWAEvent = e;
              window.__pwaPromptFired = true;
            });
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function(err) {
                  console.warn('[SW] Registration failed:', err);
                });
              });
            }
          `
        }} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
          </QueryProvider>
          <GlobalShortcutsProvider />
          <Toaster position="bottom-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
