"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type Settings } from "./presets";

const KEY = "badges:settings:v1";

function load(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    // marginAuto is always on now (its control was removed) - force it so anyone
    // with an older saved "false" isn't stuck on a fixed margin.
    return raw
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw), marginAuto: true }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  // Persist on change (writing to localStorage in an effect is fine).
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // ignore quota / private mode
    }
  }, [settings]);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return { settings, update, reset };
}
