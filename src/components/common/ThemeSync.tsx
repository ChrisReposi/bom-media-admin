import { useLayoutEffect } from "react";
import { useAppSelector } from "@/store/hooks";

const ThemeSync = () => {
  const mode = useAppSelector((s) => s.theme.mode);

  useLayoutEffect(() => {
    const root = document.documentElement;
    let frame = 0;

    root.classList.toggle("dark", mode === "dark");
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    root.style.backgroundColor = mode === "dark" ? "#18191a" : "#eff4fb";

    frame = window.requestAnimationFrame(() => {
      root.classList.remove("theme-preload");
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [mode]);

  return null;
};

export default ThemeSync;
