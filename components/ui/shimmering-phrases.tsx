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
    <AnimatePresence initial={false} mode="wait">
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
          color="rgba(255,255,255,0.88)"
          shimmerColor="rgba(255,255,255,1)"
        />
      </motion.div>
    </AnimatePresence>
  );
}
