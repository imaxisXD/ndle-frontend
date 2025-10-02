import type { Metadata } from "next";
import { Doto, Geist_Mono } from "next/font/google";
import type React from "react";
import "./globals.css";
import { ToastProvider } from "@/lib/toast-context";

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const doto = Doto({
	variable: "--font-doto",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "ndle - Self-Healing Links with AI",
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
				<ToastProvider>{children}</ToastProvider>
			</body>
		</html>
	);
}
