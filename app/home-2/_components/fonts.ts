import { Bebas_Neue } from "next/font/google";

/* The features bento's display face: tall, condensed capitals for its panel
   titles, the comic-panel look it borrows. Scoped to the section through
   `--font-bebas`, so nothing else on the page picks it up. */
export const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bebas",
});
