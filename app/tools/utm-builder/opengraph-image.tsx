import { OG_SIZE, blogCard } from "@/app/blog/_components/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ndle's free UTM builder";

export default async function Image() {
  return blogCard({ title: "UTM builder for campaign links", tags: ["Free tool", "UTM builder"], footer: "ndle.app/tools" });
}
