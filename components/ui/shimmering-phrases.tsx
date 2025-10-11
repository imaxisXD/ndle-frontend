"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ShimmeringText } from "@/components/ui/shimmering-text";

const phrases = ["Ndleing", "Shrinking", "Ndleing", "Chopping", "Quick snip"];

export function ShimmeringPhrases() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % phrases.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    // <Button
    //   type="submit"
    //   className="bg-accent hover:bg-accent/90 w-36 rounded-sm text-sm font-medium text-black drop-shadow-none transition-shadow duration-75 ease-out hover:drop-shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
    // >
    //   {false ? (
    //     <span className="flex items-center gap-3">
    //       <CircleGridLoaderIcon className="size-3 text-black" />
    //       Shortening
    //     </span>
    //   ) : (
    <AnimatePresence mode="wait">
      <motion.div
        className="w-16 tabular-nums"
        key={currentIndex}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <ShimmeringText
          text={phrases[currentIndex]}
          className="font-doto roundness-100 font-black tabular-nums"
        />
      </motion.div>
    </AnimatePresence>
    //   )}
    // </Button>
  );
}
