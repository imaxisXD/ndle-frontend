import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FOCUS } from "@/app/home-2/_components/kit";
import { Tag } from "./_components/chrome";
import { BLOG_URL, POSTS, formatDate, type Post } from "./posts";

const DESCRIPTION = "Guides to short links, QR codes and keeping links working, from the maker of ndle.";

export const metadata: Metadata = {
  title: "Blog | ndle",
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Blog | ndle",
    description: DESCRIPTION,
    url: BLOG_URL,
    siteName: "ndle",
  },
};

export default function BlogIndex() {
  return (
    <>
      <header className="h2-canvas border-b-2 border-[#141312]">
        <div className="mx-auto max-w-[1100px] px-5 pt-14 pb-10 sm:px-8 lg:pt-20">
          <h1 className="font-[family-name:var(--font-bebas)] text-[clamp(3.5rem,8vw,6rem)] leading-[0.85] tracking-[-0.005em] text-[#141312] uppercase">
            Blog
          </h1>
          <p className="mt-4 max-w-[52ch] font-mono text-[15px] leading-[1.5] text-[#3d3d3d]">{DESCRIPTION}</p>
        </div>
      </header>

      {/* One post per row: the diagrams need the width to read. */}
      <div className="mx-auto max-w-[1100px] space-y-6 px-5 py-12 sm:px-8 lg:py-16">
        {POSTS.map((post, i) => (
          <PostCard key={post.slug} post={post} featured={i === 0} />
        ))}
      </div>
    </>
  );
}

/* A post's card, outlined in 2px ink like the bento's panels: its words on
   white, its own diagram on the dashboard's dot-grid canvas. The whole card is
   the link; on hover its title underlines. */
function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  const Cover = post.cover;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={cn(
        "group grid grid-cols-[minmax(0,1fr)] overflow-hidden border-2 border-[#141312] bg-white lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]",
        FOCUS,
      )}
    >
      <div className="flex flex-col justify-end gap-3 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#3d3d3d]">
          {post.tags.map((tag, i) => (
            <Tag key={tag} lit={i === 0}>
              {tag}
            </Tag>
          ))}
          <time dateTime={post.published} className="ml-1">
            {formatDate(post.published)}
          </time>
        </div>
        <h2
          className={cn(
            "font-[family-name:var(--font-bebas)] tracking-[-0.005em] text-balance text-[#141312] uppercase decoration-[var(--sig)] decoration-2 underline-offset-4 group-hover:underline",
            // Size before leading: tailwind-merge drops a line height set before a font size.
            featured ? "text-[clamp(2.25rem,3.6vw,3rem)]" : "text-[clamp(2rem,3vw,2.5rem)]",
            "leading-[0.92]",
          )}
        >
          {post.title}
        </h2>
        <p className="max-w-[52ch] font-mono text-[13px] leading-5 text-[#3d3d3d]">{post.description}</p>
      </div>
      {/* On phones the diagram stacks tall, so the card shows only its words. */}
      <div
        aria-hidden
        className="dot-page hidden border-t-2 border-[#141312] p-6 sm:p-8 md:block lg:border-t-0 lg:border-l-2"
      >
        <div className="pointer-events-none flex h-full items-center">
          <div className="w-full">
            <Cover />
          </div>
        </div>
      </div>
    </Link>
  );
}
