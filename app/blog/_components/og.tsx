import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/* Share cards for the blog, drawn at build time: a white card closed by an
   ink rule, the title in Bebas capitals in ink, the tags as ink-edged chips,
   and the ndle wordmark in Signal Yellow with the landing page's amber
   hairline so it holds on white. Every blog route
   is prerendered, so the fonts are read from disk only during the build. */

export const OG_SIZE = { width: 1200, height: 630 };

const INK = "#141312";
const SIG = "#ffc921";

async function font(path: string) {
  return readFile(join(process.cwd(), path));
}

export async function blogCard({ title, tags, footer }: { title: string; tags: string[]; footer: string }) {
  const [bebas, geist, mono] = await Promise.all([
    font("assets/fonts/BebasNeue-Regular.ttf"),
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
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: "#ffffff",
          borderBottom: `12px solid ${INK}`,
          fontFamily: "Paper Mono",
          color: INK,
        }}
      >
        <div style={{ display: "flex", gap: 12 }}>
          {tags.map((tag, i) => (
            <div
              key={tag}
              style={{
                display: "flex",
                padding: "4px 12px",
                border: `2px solid ${INK}`,
                borderRadius: 6,
                backgroundColor: i === 0 ? SIG : "#ffffff",
                fontSize: 24,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Bebas Neue",
            fontSize: title.length > 48 ? 104 : 124,
            lineHeight: 0.92,
            textTransform: "uppercase",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Geist",
              fontSize: 64,
              letterSpacing: -3,
              color: SIG,
              textShadow: "0 0 1.5px rgba(160, 124, 0, 0.9)",
            }}
          >
            ndle
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#3d3d3d" }}>{footer}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Bebas Neue", data: bebas, weight: 400, style: "normal" },
        { name: "Geist", data: geist, weight: 600, style: "normal" },
        { name: "Paper Mono", data: mono, weight: 400, style: "normal" },
      ],
    },
  );
}
