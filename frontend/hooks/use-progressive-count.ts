"use client";

import { useEffect, useRef, useState } from "react";

// Render another batch just before the user reaches the end of the current one.
export function useProgressiveCount(total: number, batchSize = 24) {
  const [visible, setVisible] = useState(batchSize);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible >= total || !sentinel.current) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setVisible(total));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible((count) => Math.min(count + batchSize, total));
    }, { rootMargin: "300px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [visible, total, batchSize]);

  return { visible, sentinel, showMore: () => setVisible((count) => Math.min(count + batchSize, total)) };
}
