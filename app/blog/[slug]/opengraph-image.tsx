import { OG_SIZE, blogCard } from "../_components/og";
import { POSTS, getPost } from "../posts";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "An ndle blog post";

export function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug);
  return blogCard({ title: post?.title ?? "ndle blog", tags: post?.tags ?? [], footer: "ndle.app/blog" });
}
