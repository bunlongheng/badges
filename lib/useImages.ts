"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type BadgeImage = {
  id: string;
  url: string;
  name: string;
  /** focal point as object-position percentages (0-100), default centered */
  offsetX: number;
  offsetY: number;
};

let counter = 0;
const nextId = () => `img-${Date.now().toString(36)}-${counter++}`;

const isHeic = (f: File) =>
  /image\/hei(c|f)/i.test(f.type) || /\.hei(c|f)$/i.test(f.name);

/** iPhone photos are HEIC, which Chrome/Firefox cannot render in <img>. Convert to JPEG. */
async function toDisplayableBlob(file: File): Promise<Blob> {
  if (!isHeic(file)) return file;
  try {
    const { heicTo } = await import("heic-to");
    return await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  } catch (err) {
    console.error("[badges] HEIC conversion failed:", err);
    return file; // fall back; Safari can display HEIC natively
  }
}

export function useImages() {
  const [images, setImages] = useState<BadgeImage[]>([]);
  const [converting, setConverting] = useState(0);
  const urls = useRef<Set<string>>(new Set());

  const add = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || isHeic(f)
    );
    if (list.length === 0) return;
    setConverting((n) => n + list.length);
    for (const f of list) {
      const blob = await toDisplayableBlob(f);
      const url = URL.createObjectURL(blob);
      urls.current.add(url);
      setImages((prev) => [
        ...prev,
        { id: nextId(), url, name: f.name || "pasted-image", offsetX: 50, offsetY: 50 },
      ]);
      setConverting((n) => n - 1);
    }
  }, []);

  const remove = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
        urls.current.delete(target.url);
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const setOffset = useCallback((id: string, x: number, y: number) => {
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    setImages((prev) =>
      prev.map((i) => (i.id === id ? { ...i, offsetX: clamp(x), offsetY: clamp(y) } : i))
    );
  }, []);

  const move = useCallback((from: number, to: number) => {
    setImages((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }, []);

  const clear = useCallback(() => {
    setImages((prev) => {
      prev.forEach((i) => URL.revokeObjectURL(i.url));
      urls.current.clear();
      return [];
    });
  }, []);

  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  return { images, add, remove, move, clear, setOffset, converting };
}
