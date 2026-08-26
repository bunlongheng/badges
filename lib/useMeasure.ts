"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Track an element's width with a ResizeObserver via a CALLBACK ref, so it
 * attaches the moment the node mounts (the preview stage only exists once images
 * are added - an effect-based ref would miss it and leave width at 0).
 */
export function useMeasure<T extends HTMLElement = HTMLDivElement>() {
  const [width, setWidth] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);

  const ref = useCallback((node: T | null) => {
    ro.current?.disconnect();
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    ro.current = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.current.observe(node);
  }, []);

  return { ref, width };
}
