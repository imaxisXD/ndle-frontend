import { OG_SIZE, blogCard } from "@/app/blog/_components/og";
import { USE_CASES, getUseCase } from "../pages";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ndle for a kind of link";

export function generateStaticParams() {
  return USE_CASES.map((page) => ({ slug: page.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const page = getUseCase((await params).slug);
  return blogCard({ title: page?.h1 ?? "ndle", tags: ["Use case", page?.topic ?? "ndle"], footer: "ndle.app" });
}
