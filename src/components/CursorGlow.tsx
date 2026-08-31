"use client";

import { useEffect } from "react";

/**
 * Подсветка фона за курсором + виньетки — строго под контентом.
 */
export function CursorGlow() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    let targetX = 50;
    let targetY = 35;
    let currentX = 50;
    let currentY = 35;

    const tick = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      root.style.setProperty("--cursor-x", `${currentX}%`);
      root.style.setProperty("--cursor-y", `${currentY}%`);
      raf = requestAnimationFrame(tick);
    };

    const onMove = (event: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      targetX = (event.clientX / w) * 100;
      targetY = (event.clientY / h) * 100;
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 no-print ambient-vignette"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 no-print cursor-glow"
      />
    </>
  );
}
