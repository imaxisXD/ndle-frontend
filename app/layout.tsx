import type { Metadata } from "next";
import { Doto, Geist_Mono } from "next/font/google";
import type React from "react";
import Script from "next/script";
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
      <head>
        <Script
          src="https://cdn.visitors.now/v.js"
          data-token="5a3e9fdd-566d-40d3-94fc-264351530748"
        />
      </head>
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
        {typeof window !== "undefined" &&
          window.location.hostname !== "localhost" && (
            <>
              <Script
                id="openpanel-init"
                strategy="afterInteractive"
                dangerouslySetInnerHTML={{
                  __html: `
                  window.op = window.op || function (...args) {
                    (window.op.q = window.op.q || []).push(args);
                  };
                  window.op('init', {
                    apiUrl: 'https://openpanel-api-production-b833.up.railway.app', 
                    clientId: '3fee2715-1da7-4c02-a23f-e9fa96094c1b',
                    trackScreenViews: true,
                    trackOutgoingLinks: true,
                    trackAttributes: true,
                  });
                `,
                }}
              />
              <Script
                id="openpanel-script"
                src="https://openpanel.dev/op1.js"
                strategy="afterInteractive"
              />
            </>
          )}
      </body>
    </html>
  );
}
