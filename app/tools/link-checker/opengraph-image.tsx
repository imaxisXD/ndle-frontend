import { OG_SIZE, blogCard } from "@/app/blog/_components/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ndle's free link checker";

export default async function Image() {
  return blogCard({ title: "Is this link working?", tags: ["Free tool", "Link checker"], footer: "ndle.app/tools" });
}
