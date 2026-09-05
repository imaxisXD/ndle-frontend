import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import { Doto, Geist_Mono, Sigmar } from "next/font/google";
import {
  GeistPixelSquare,
  GeistPixelGrid,
  GeistPixelCircle,
  GeistPixelTriangle,
  GeistPixelLine,
} from "geist/font/pixel";
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

const sigmar = Sigmar({
  variable: "--font-sigmar",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ndle.app"),
  title: "ndle - Short. Sharp. Smarter.",
  description:
    "The simple URL shortener with real-time analytics and custom domains.",
  icons: "/favicon.ico",
  openGraph: {
    title: "ndle - Short. Sharp. Smarter.",
    description:
      "The simple URL shortener with real-time analytics and custom domains.",
    url: "https://ndle.app",
    siteName: "ndle",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image.webp",
        width: 1200,
        height: 630,
        alt: "ndle - Short. Sharp. Smarter. The intelligent URL shortener.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ndle - Short. Sharp. Smarter.",
    description:
      "The simple URL shortener with real-time analytics and custom domains.",
    creator: "@abhishk_084",
    images: ["/opengraph-image.webp"],
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
      className={`${geistMono.variable} ${doto.variable} ${sigmar.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelCircle.variable} ${GeistPixelTriangle.variable} ${GeistPixelLine.variable} antialiased`}
    >
      <body>
        <Script id="orange-replay" strategy="beforeInteractive">
          {`(function(c){var w=window,d=document;if(w.__orLoaderStarted)return;w.__orLoaderStarted=1;var q=w.__orq=w.__orq||[],r=w.__orCleanup=w.__orCleanup||[],l=c.queueLimit>0?Math.floor(c.queueLimit):100,b="[data-orange-block]"+(c.init&&c.init.blockSelector?", "+c.init.blockSelector:""),n=function(){return Date.now()},t=function(v){v=String(v);return v.length>200?v.slice(0,200):v},p=function(o){if(typeof o.t!=="number")o.t=n();if(q.length>=l)q.splice(0,q.length-l+1);q.push(o)},a=function(x,y,f){x.addEventListener(y,f,true);r.push(function(){x.removeEventListener(y,f,true)})},h=function(v){return String(v).replace(/[^a-zA-Z0-9_-]/g,"_")},g=function(e){var z=e.tagName.toLowerCase(),i=e.id?"#"+h(e.id):"",c="",j=0;if(e.classList)for(;j<e.classList.length&&j<3;j++)c+="."+h(e.classList[j]);return z+i+c},s=function(e){if(!e||!e.tagName)return"unknown";for(var p=[],x=e;x&&p.length<3;x=x.parentElement)p.unshift(g(x));return t(p.join(" > "))},m=function(e){try{return e&&e.closest&&e.closest(b)?"[blocked]":s(e)}catch(_){try{return e&&e.closest&&e.closest("[data-orange-block]")?"[blocked]":s(e)}catch(_){return s(e)}}};if(c.init){w.__orInit=c.init;p({k:"init",o:c.init})}a(w,"error",function(e){p({k:"error",m:t(e.message||String(e.error||"error"))})});a(w,"unhandledrejection",function(e){var r=e.reason;p({k:"unhandledrejection",m:t(r&&r.message?r.message:String(r))})});a(d,"click",function(e){p({k:"click",d:m(e.target),x:e.clientX||0,y:e.clientY||0,w:w.innerWidth||0,h:w.innerHeight||0})});p({k:"vital",start:w.performance&&w.performance.timeOrigin||n(),u:w.location.href});var o=d.createElement("script");o.async=1;o.src=c.bundleUrl;o.onerror=function(){var i=c.init;if(!i||!i.key||!i.ingestUrl)return;try{fetch(String(i.ingestUrl).replace(/\\/+$/,"")+"/v1/sdk-health",{method:"POST",headers:{"content-type":"application/json","x-or-key":i.key},body:'{"version":1,"code":"bundle_load_failed"}',cache:"no-store",credentials:"omit",keepalive:true}).catch(function(){})}catch(_){}};d.head.appendChild(o)})({bundleUrl:"https://orangereplay.app/or-recorder.js",init:{"ingestUrl":"https://orangereplay.app","key":"or_live_eufhRwNvpbuLI99rke5Ln4yO5JlCoetJ"},queueLimit:undefined});`}
        </Script>
        <ClerkProvider dynamic>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
