import { OG_SIZE, blogCard } from "./_components/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "The ndle blog";

export default async function Image() {
  return blogCard({ title: "Guides to links that keep working", tags: ["Blog"], footer: "ndle.app/blog" });
}
