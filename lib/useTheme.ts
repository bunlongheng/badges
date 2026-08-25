"use client";

import { useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const EVENT = "badges:theme-change";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

/** Theme is an external system (the <html> class), so we read it with a store. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("badges:theme", next);
    } catch {
      // ignore private mode / quota
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { theme, toggle };
}
