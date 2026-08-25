"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type BadgeImage = {
  id: string;
  url: string;
  name: string;
};

let counter = 0;
const nextId = () => `img-${Date.now().toString(36)}-${counter++}`;

export function useImages() {
  const [images, setImages] = useState<BadgeImage[]>([]);
  const urls = useRef<Set<string>>(new Set());

  const add = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setImages((prev) => [
      ...prev,
      ...list.map((f) => {
        const url = URL.createObjectURL(f);
        urls.current.add(url);
        return { id: nextId(), url, name: f.name || "pasted-image" };
      }),
    ]);
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

  // Revoke everything on unmount.
  useEffect(() => {
    const set = urls.current;
    return () => set.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  return { images, add, remove, move, clear };
}
