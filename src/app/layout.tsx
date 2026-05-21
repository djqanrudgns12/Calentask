import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { QueryProvider } from "@/providers/QueryProvider";

const customFont = localFont({
  src: "./fonts/RIDIBatang.otf",
  variable: "--font-sans",
  display: "swap",
});

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
      </body>
    </html>
  );
}
