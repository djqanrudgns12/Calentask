import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";
import { Toaster } from "sonner";
import { GlobalShortcutsProvider } from "@/providers/GlobalShortcutsProvider";

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
};

export const metadata: Metadata = {
  title: "Calentask",
  description: "통합 캘린더 애플리케이션",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={customFont.variable}>
      <body className={`antialiased font-sans bg-[#f7f9fb]`}>
        <QueryProvider>
          {children}
        </QueryProvider>
        <GlobalShortcutsProvider />
        <Toaster position="bottom-center" richColors />
      </body>
    </html>
  );
}
