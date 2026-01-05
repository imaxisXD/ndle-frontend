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
  axes: ["ROND"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ndle.app"),
  title: "ndle - Short. Sharp. Smarter.",
  description:
    "The intelligent URL shortener with real-time analytics and custom domains.",
  icons: "/favicon.ico",
  openGraph: {
    title: "ndle - Short. Sharp. Smarter.",
    description:
      "The intelligent URL shortener with real-time analytics and custom domains.",
    url: "https://ndle.app",
    siteName: "ndle",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ndle - Short. Sharp. Smarter.",
    description:
      "The intelligent URL shortener with real-time analytics and custom domains.",
    creator: "@abhishk_084",
  },
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
