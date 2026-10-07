import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/* The home page's share card, drawn at build time from the page's own
   pieces: the dotted canvas, the hero line ("Short links," in Geist,
   "WATCHED." in Bebas capitals with its yellow LED full stop), and a small
   Link Monitoring window, ink-edged with a hard ink shadow, one row broken,
   with the black "back online" toast over it. Closed by an ink rule like
   the blog's cards (app/blog/_components/og.tsx), so they read as a family.
   Other routes with their own card override this one. */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ndle: short links, watched. A free URL shortener that checks every link every 30 minutes.";

const INK = "#141312";
const SIG = "#ffc921";
const GREY = "#6f6c65";

const ROWS = [
  { slug: "launch", status: "error", right: "404" },
  { slug: "docs", status: "healthy", right: "88ms" },
  { slug: "repo", status: "healthy", right: "64ms" },
];

async function font(path: string) {
  return readFile(join(process.cwd(), path));
}

function Badge({ status }: { status: string }) {
  const bad = status === "error";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        width: 92,
        padding: "3px 0",
        borderRadius: 5,
        border: `1.5px solid ${bad ? "rgba(239,68,68,0.7)" : "rgba(34,197,94,0.7)"}`,
        backgroundColor: bad ? "#fee2e2" : "#dcfce7",
        color: bad ? "#b91c1c" : "#15803d",
        fontSize: 18,
      }}
    >
      {status}
    </div>
  );
}

export default async function Image() {
  const [bebas, geist, geistSemi, mono] = await Promise.all([
    font("assets/fonts/BebasNeue-Regular.ttf"),
    font("node_modules/geist/dist/fonts/geist-sans/Geist-Medium.ttf"),
    font("node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf"),
    font("assets/fonts/PaperMono-Regular.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "58px 64px 52px",
          position: "relative",
          backgroundColor: "#ffffff",
          borderBottom: `12px solid ${INK}`,
          fontFamily: "Paper Mono",
          color: INK,
        }}
      >
        {/* The page's dotted canvas, as a pattern (the renderer skips
            gradient backgrounds) */}
        <svg width="1200" height="618" style={{ position: "absolute", top: 0, left: 0 }}>
          <defs>
            <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.6" fill="#e2e2e0" />
            </pattern>
          </defs>
          <rect width="1200" height="618" fill="url(#dots)" />
        </svg>

        {/* The words */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontFamily: "Geist", fontSize: 92, letterSpacing: -3.5, lineHeight: 1 }}>Short links,</div>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 4 }}>
              <div style={{ display: "flex", fontFamily: "Bebas Neue", fontSize: 150, lineHeight: 0.86 }}>WATCHED</div>
              {/* The LED full stop */}
              <div
                style={{
                  display: "flex",
                  width: 26,
                  height: 26,
                  marginLeft: 4,
                  marginBottom: 14,
                  borderRadius: 13,
                  backgroundColor: SIG,
                  boxShadow: "0 0 0 2px rgba(179,138,0,0.5), 0 0 18px rgba(255,201,33,0.55)",
                }}
              />
            </div>
            <div style={{ display: "flex", marginTop: 26, maxWidth: 520, fontSize: 25, lineHeight: 1.45, color: "#3d3d3d" }}>
              A free URL shortener that checks every link every 30 minutes and flags the ones that break.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 22 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Geist Semi",
                fontSize: 60,
                letterSpacing: -3,
                lineHeight: 1,
                color: SIG,
                textShadow: "0 0 1.5px rgba(160, 124, 0, 0.9)",
              }}
            >
              ndle
            </div>
            <div style={{ display: "flex", fontSize: 24, color: GREY, marginBottom: 6 }}>ndle.app</div>
          </div>
        </div>

        {/* The product: Link Monitoring, one row down, and the alert toast */}
        <div style={{ display: "flex", position: "relative", flexGrow: 1, marginLeft: 20 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "absolute",
              top: 40,
              left: 10,
              width: 470,
              borderRadius: 14,
              border: `2.5px solid ${INK}`,
              backgroundColor: "#ffffff",
              boxShadow: `5px 6px 0 0 ${INK}`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderBottom: "1.5px solid #e4e4e7",
                backgroundColor: "#fafafa",
                fontSize: 19,
                color: "#3f3f46",
              }}
            >
              <div style={{ display: "flex" }}>Link Monitoring</div>
              <div style={{ display: "flex", color: "#a1a1aa" }}>3 links</div>
            </div>
            {ROWS.map((row) => {
              const bad = row.status === "error";
              return (
                <div
                  key={row.slug}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "16px 20px",
                    borderTop: "1.5px solid #f4f4f5",
                    backgroundColor: bad ? "rgba(254,242,242,0.9)" : "#ffffff",
                    fontSize: 20,
                  }}
                >
                  <Badge status={row.status} />
                  <div style={{ display: "flex", flexGrow: 1, color: "#52525b" }}>ndle.fyi/{row.slug}</div>
                  <div style={{ display: "flex", color: bad ? "#dc2626" : "#16a34a" }}>{row.right}</div>
                </div>
              );
            })}
            <div style={{ display: "flex", height: 34 }} />
          </div>

          {/* The toast, landing over the window */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              position: "absolute",
              top: 318,
              left: 30,
              width: 430,
              padding: "18px 22px",
              borderRadius: 16,
              backgroundColor: INK,
              color: "#ffffff",
              fontFamily: "Geist",
              boxShadow: "0 18px 40px -14px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                marginTop: 2,
                borderRadius: 13,
                backgroundColor: "#22c55e",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7.4 L5.6 10.3 L11.5 3.8" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 22 }}>
                <span style={{ fontFamily: "Paper Mono" }}>ndle.fyi/launch</span>&nbsp;is back online
              </div>
              <div style={{ display: "flex", marginTop: 6, fontSize: 19, color: "rgba(255,255,255,0.55)" }}>
                Back on the next check.
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bebas Neue", data: bebas, weight: 400, style: "normal" },
        { name: "Geist", data: geist, weight: 500, style: "normal" },
        { name: "Geist Semi", data: geistSemi, weight: 600, style: "normal" },
        { name: "Paper Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
