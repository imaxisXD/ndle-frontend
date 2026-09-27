import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { FOCUS } from "@/app/home-2/_components/kit";
import { SignupBox, Tag } from "../_components/chrome";
import { POSTS, formatDate, getPost, postUrl } from "../posts";

// Every post is prerendered at build; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPost((await params).slug);
  if (!post) return {};
  // Search results cut titles at about 60 characters; drop the brand before the words.
  const title = post.title.length + 7 <= 60 ? `${post.title} | ndle` : post.title;
  return {
    title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description: post.description,
      url: postUrl(post.slug),
      siteName: "ndle",
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
      authors: [post.author],
      tags: post.tags,
      // The image is the post's own card, from opengraph-image.tsx.
    },
    twitter: { card: "summary_large_image", title, description: post.description, creator: "@abhishk_084" },
  };
}

export default async function PostPage({ params }: Props) {
  const post = getPost((await params).slug);
  if (!post) notFound();
  const { default: Body } = await post.load();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.updated ?? post.published,
    author: { "@type": "Person", name: post.author, url: "https://x.com/abhishk_084" },
    publisher: { "@type": "Organization", name: "ndle", url: "https://ndle.app" },
    mainEntityOfPage: postUrl(post.slug),
    image: `${postUrl(post.slug)}/opengraph-image`,
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />

      {/* The title sits on the landing page's dot-grid canvas, closed by a 2px
          ink rule like the bento's panels; the reading column below is white. */}
      <header className="h2-canvas border-b-2 border-[#141312]">
        <div className="mx-auto max-w-[1100px] px-5 pt-14 pb-12 sm:px-8 lg:grid lg:grid-cols-[220px_minmax(0,680px)] lg:gap-16 lg:pt-20 lg:pb-16">
          <div className="lg:col-start-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#3d3d3d]">
              <Link href="/blog" className={cn("rounded-sm hover:text-[#141312]", FOCUS)}>
                Blog
              </Link>
              <span aria-hidden>/</span>
              {post.tags.map((tag, i) => (
                <Tag key={tag} lit={i === 0}>
                  {tag}
                </Tag>
              ))}
              <time dateTime={post.published} className="ml-1">
                {formatDate(post.published)}
              </time>
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-bebas)] text-[clamp(2.9rem,6vw,4.5rem)] leading-[0.9] tracking-[-0.005em] text-balance text-[#141312] uppercase">
              {post.title}
            </h1>
            <p className="mt-5 max-w-[60ch] font-mono text-[15px] leading-[1.5] text-pretty text-[#3d3d3d]">{post.description}</p>
            <p className="mt-6 font-mono text-xs text-[#3d3d3d]">By {post.author}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-5 pt-4 pb-24 sm:px-8 lg:grid lg:grid-cols-[220px_minmax(0,680px)] lg:gap-16">
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-8 pt-10">
            <nav aria-labelledby="contents-title">
              <p
                id="contents-title"
                className="font-[family-name:var(--font-bebas)] text-[28px] leading-none tracking-[-0.005em] text-[#141312] uppercase"
              >
                Contents
              </p>
              <ol className="mt-3 space-y-2 text-sm leading-5">
                {post.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className={cn("text-[#3d3d3d] hover:text-[#141312] hover:underline hover:decoration-[var(--sig)] hover:decoration-2 hover:underline-offset-4", FOCUS)}>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <SignupBox />
          </div>
        </div>

        <div className="min-w-0">
          <Body />
          <SignupBox className="mt-16 lg:hidden" />
          <MorePosts current={post.slug} />
        </div>
      </div>
    </article>
  );
}

/* Up to three other posts, newest first, so every post links to the rest. */
function MorePosts({ current }: { current: string }) {
  const others = POSTS.filter((post) => post.slug !== current).slice(0, 3);
  if (others.length === 0) return null;
  return (
    <nav aria-labelledby="more-posts" className="mt-20 border-t-2 border-[#141312] pt-8">
      <p
        id="more-posts"
        className="font-[family-name:var(--font-bebas)] text-[28px] leading-none tracking-[-0.005em] text-[#141312] uppercase"
      >
        More from the blog
      </p>
      <ul className="mt-5 divide-y divide-[var(--line)]">
        {others.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className={cn("group block py-4", FOCUS)}>
              <span className="block text-lg leading-snug font-medium text-[#141312] decoration-[var(--sig)] decoration-2 underline-offset-4 group-hover:underline">
                {post.title}
              </span>
              <span className="mt-1 block font-mono text-[13px] leading-5 text-[#3d3d3d]">{post.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
