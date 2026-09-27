import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductArticle } from "@/app/blog/_components/product-article";
import { USE_CASES, getUseCase, urlForUseCase } from "../pages";

// Every use-case page is prerendered at build; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return USE_CASES.map((page) => ({ slug: page.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getUseCase((await params).slug);
  if (!page) return {};
  const title = `${page.title} | ndle`;
  return {
    title,
    description: page.description,
    alternates: { canonical: `/use-cases/${page.slug}` },
    openGraph: { type: "website", title, description: page.description, url: urlForUseCase(page.slug), siteName: "ndle" },
    twitter: { card: "summary_large_image", title, description: page.description, creator: "@abhishk_084" },
  };
}

export default async function UseCasePage({ params }: Props) {
  const page = getUseCase((await params).slug);
  if (!page) notFound();
  const { default: Body } = await page.load();
  return (
    <ProductArticle
      url={urlForUseCase(page.slug)}
      title={page.title}
      description={page.description}
      tag="Use case"
      eyebrow={page.topic}
      h1={page.h1}
      lede={page.lede}
      dated={page.updated}
      dateLabel="Updated"
      sections={page.sections}
      faq={page.faq}
    >
      <Body />
    </ProductArticle>
  );
}
