import { OG_SIZE, blogCard } from "@/app/blog/_components/og";
import { ALTERNATIVES, getAlternative } from "../pages";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "An ndle comparison page";

export function generateStaticParams() {
  return ALTERNATIVES.map((page) => ({ slug: page.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const page = getAlternative((await params).slug);
  return blogCard({
    title: page?.h1 ?? "ndle",
    tags: ["Compare", page ? `ndle vs ${page.competitor}` : "ndle"],
    footer: "ndle.app",
  });
}
