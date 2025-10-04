import type { Metadata } from "next";
import { Doto, Geist_Mono } from "next/font/google";
import type React from "react";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ndle - Short. Sharp. Smarter.",
  description:
    "Create shortened links that heal themselves and remember context",
  icons: "/favicon.ico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${doto.variable} antialiased`}
    >
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
