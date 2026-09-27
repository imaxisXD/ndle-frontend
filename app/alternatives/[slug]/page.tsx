import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductArticle } from "@/app/blog/_components/product-article";
import { ALTERNATIVES, alternativeUrl, getAlternative } from "../pages";

// Every comparison page is prerendered at build; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return ALTERNATIVES.map((page) => ({ slug: page.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getAlternative((await params).slug);
  if (!page) return {};
  const title = `${page.title} | ndle`;
  return {
    title,
    description: page.description,
    alternates: { canonical: `/alternatives/${page.slug}` },
    openGraph: { type: "website", title, description: page.description, url: alternativeUrl(page.slug), siteName: "ndle" },
    twitter: { card: "summary_large_image", title, description: page.description, creator: "@abhishk_084" },
  };
}

export default async function AlternativePage({ params }: Props) {
  const page = getAlternative((await params).slug);
  if (!page) notFound();
  const { default: Body } = await page.load();
  return (
    <ProductArticle
      url={alternativeUrl(page.slug)}
      title={page.title}
      description={page.description}
      tag="Compare"
      eyebrow={`ndle vs ${page.competitor}`}
      h1={page.h1}
      lede={page.lede}
      dated={page.checked}
      dateLabel={`${page.competitor} facts checked`}
      sections={page.sections}
      faq={page.faq}
    >
      <Body />
    </ProductArticle>
  );
}
