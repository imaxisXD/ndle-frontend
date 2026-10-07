import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import { Caveat, Doto, Sigmar } from "next/font/google";
import localFont from "next/font/local";
import type React from "react";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { SessionReplayGuard } from "@/components/session-replay-guard";
import { REPLAY_PAUSED_PATH, REPLAY_RECORDER_URL } from "@/lib/session-replay";

// Paper Mono (paper.design/mono, OFL 1.1), self-hosted. The upstream variable
// font is cut to weights 400-800 (nothing here is lighter than 400) and split
// the way Google Fonts splits subsets, so first paint downloads 26 KB instead
// of 53 KB. The core file (Latin, punctuation, arrows, hotkey symbols) is
// preloaded. The extended file (Latin Extended, box drawing, maths, other
// symbols) downloads only on a page that uses one of its characters. Each
// unicode-range must match the characters in its file. --font-mono in
// globals.css lists the extended family first: the browser skips it for
// characters outside its range, and it has to come before "paperMono
// Fallback", which covers every character.
const paperMono = localFont({
  src: "../assets/fonts/PaperMono-Core.woff2",
  variable: "--font-paper-mono",
  weight: "400 800",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0-FF,U+131,U+152-153,U+2BB-2BC,U+2C6,U+2DA,U+2DC,U+304,U+308,U+329,U+2000-206F,U+20AC,U+2122,U+2190-21FF,U+2212,U+2215,U+2264-2265,U+2300-23FF,U+FEFF,U+FFFD",
    },
  ],
});

const paperMonoExtended = localFont({
  src: "../assets/fonts/PaperMono-Extended.woff2",
  variable: "--font-paper-mono-extended",
  weight: "400 800",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+100-113,U+116-12B,U+12E-130,U+132-137,U+139-148,U+14A-14D,U+150-151,U+154-17E,U+18F,U+192,U+1CD-1CE,U+1E4-1E9,U+218-21B,U+237,U+259,U+2C7,U+2D8-2D9,U+2DB,U+2DD,U+300-303,U+306-307,U+30A-30C,U+312,U+326-328,U+335-338,U+39B,U+3A9,U+3BB-3BC,U+3C0,U+E3F,U+1E20-1E21,U+1E80-1E85,U+1E9E,U+1EBC-1EBD,U+1EF2-1EF3,U+1EF8-1EF9,U+2070,U+2074-2079,U+2080-2089,U+20AA,U+20B1,U+20B4,U+20B9,U+20BD,U+2116-2117,U+2153-2155,U+215B-215E,U+2202,U+2206,U+220F,U+2211,U+221A,U+221E,U+222B,U+2236,U+2248,U+2260,U+2460-2468,U+24EA,U+24FF-259F,U+25CA-25CB,U+25CF,U+25E6,U+2776-277E,U+3003,U+301C,U+A78B-A78C,U+F8FF,U+FB01-FB02",
    },
  ],
});

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  axes: ["ROND"],
});

// Sigmar (sign-in and sign-up) and Caveat (a few doodles) are used on few
// pages, so they load when used instead of being preloaded on every page.
const sigmar = Sigmar({
  variable: "--font-sigmar",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  preload: false,
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
      className={`${paperMono.variable} ${paperMonoExtended.variable} ${doto.variable} ${sigmar.variable} ${caveat.variable} antialiased`}
    >
      <body>
        {/* Replay is off on sign-in and sign-up. SessionReplayGuard covers moves between pages. */}
        <Script id="orange-replay" strategy="beforeInteractive">
          {`window.__ndleStartReplay=function(){(function(c){var w=window,d=document;if(w.__orLoaderStarted)return;w.__orLoaderStarted=1;var q=w.__orq=w.__orq||[],r=w.__orCleanup=w.__orCleanup||[],l=c.queueLimit>0?Math.floor(c.queueLimit):100,b="[data-orange-block]"+(c.init&&c.init.blockSelector?", "+c.init.blockSelector:""),n=function(){return Date.now()},t=function(v){v=String(v);return v.length>200?v.slice(0,200):v},p=function(o){if(typeof o.t!=="number")o.t=n();if(q.length>=l)q.splice(0,q.length-l+1);q.push(o)},a=function(x,y,f){x.addEventListener(y,f,true);r.push(function(){x.removeEventListener(y,f,true)})},h=function(v){return String(v).replace(/[^a-zA-Z0-9_-]/g,"_")},g=function(e){var z=e.tagName.toLowerCase(),i=e.id?"#"+h(e.id):"",c="",j=0;if(e.classList)for(;j<e.classList.length&&j<3;j++)c+="."+h(e.classList[j]);return z+i+c},s=function(e){if(!e||!e.tagName)return"unknown";for(var p=[],x=e;x&&p.length<3;x=x.parentElement)p.unshift(g(x));return t(p.join(" > "))},m=function(e){try{return e&&e.closest&&e.closest(b)?"[blocked]":s(e)}catch(_){try{return e&&e.closest&&e.closest("[data-orange-block]")?"[blocked]":s(e)}catch(_){return s(e)}}};if(c.init){w.__orInit=c.init;p({k:"init",o:c.init})}a(w,"error",function(e){p({k:"error",m:t(e.message||String(e.error||"error"))})});a(w,"unhandledrejection",function(e){var r=e.reason;p({k:"unhandledrejection",m:t(r&&r.message?r.message:String(r))})});a(d,"click",function(e){p({k:"click",d:m(e.target),x:e.clientX||0,y:e.clientY||0,w:w.innerWidth||0,h:w.innerHeight||0})});p({k:"vital",start:w.performance&&w.performance.timeOrigin||n(),u:w.location.href});var o=d.createElement("script");o.async=1;o.src=c.bundleUrl;o.onerror=function(){var i=c.init;if(!i||!i.key||!i.ingestUrl)return;try{fetch(String(i.ingestUrl).replace(/\\/+$/,"")+"/v1/sdk-health",{method:"POST",headers:{"content-type":"application/json","x-or-key":i.key},body:'{"version":1,"code":"bundle_load_failed"}',cache:"no-store",credentials:"omit",keepalive:true}).catch(function(){})}catch(_){}};d.head.appendChild(o)})({bundleUrl:${JSON.stringify(REPLAY_RECORDER_URL)},init:{"ingestUrl":"https://orangereplay.app","key":"or_live_eufhRwNvpbuLI99rke5Ln4yO5JlCoetJ"},queueLimit:undefined})};if(!new RegExp(${JSON.stringify(REPLAY_PAUSED_PATH.source)}).test(location.pathname))window.__ndleStartReplay();`}
        </Script>
        <SessionReplayGuard />
        {/* Static, so marketing pages can be prerendered. The signed-in app opts
            into request auth data in app/[...path]/layout.tsx. */}
        <ClerkProvider
          // Clerk's styles go in their own cascade layer (declared at the top
          // of globals.css) so Tailwind classes in `appearance` can win.
          appearance={{ cssLayerName: "clerk" }}
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
        >
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
