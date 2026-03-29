import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navType = useNavigationType();

  useLayoutEffect(() => {
    if (navType === "POP") return;

    const forceTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    forceTop();
    const rafId = requestAnimationFrame(forceTop);

    return () => cancelAnimationFrame(rafId);
  }, [pathname, navType]);

  return null;
};

export default ScrollToTop;
