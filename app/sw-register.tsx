"use client";

import { useEffect } from "react";

// Registers the network-first service worker (public/sw.js) so the app is an
// installable PWA. Shared, unchanged, across every bunlongheng app.
export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
