import { useEffect } from "react";
import { useLocation } from "react-router";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const mainElement = document.querySelector("main");

    if (mainElement) {
      mainElement.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant",
      });
    }
    // } else {
    //   console.log("scrolling to top main element not found");
    //   window.scrollTo({
    //     top: 0,
    //     left: 0,
    //     behavior: "smooth",
    //   });
    // }
  }, [pathname]);

  return null;
}
