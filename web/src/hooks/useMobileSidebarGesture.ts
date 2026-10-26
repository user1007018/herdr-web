import { useEffect, useRef, useState } from "react";

interface Gesture {
  id: number;
  x: number;
  y: number;
  width: number;
  offset: number;
  dragging: boolean;
}

export function useMobileSidebarGesture({
  enabled,
  open,
  onOpenChange,
}: {
  enabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sidebarRef = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const suppressClickUntil = useRef(0);

  useEffect(() => {
    setProgress(null);
    if (!enabled) return;
    let gesture: Gesture | null = null;

    const cancel = () => {
      gesture = null;
      setProgress(null);
    };
    const start = (event: TouchEvent) => {
      // A fresh touch is intentional, unlike a click synthesized after a drag.
      suppressClickUntil.current = 0;
      if (event.touches.length !== 1) return cancel();
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      const sidebar = sidebarRef.current;
      if (!sidebar) return;
      const touch = event.touches[0];
      if (open) {
        if (!target || !sidebar.contains(target)) return;
      } else if (touch.clientX < document.documentElement.clientWidth - 24) return;
      const width = sidebar.getBoundingClientRect().width;
      gesture = { id: touch.identifier, x: touch.clientX, y: touch.clientY, width, offset: open ? 0 : width, dragging: false };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.touches.length !== 1) return cancel();
      const touch = Array.from(event.touches).find(touch => touch.identifier === gesture!.id);
      if (!touch) return cancel();
      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        if (Math.abs(dy) >= Math.abs(dx) || (open ? dx <= 0 : dx >= 0)) return cancel();
        gesture.dragging = true;
      }
      if (event.cancelable) event.preventDefault();
      gesture.offset = Math.max(0, Math.min(gesture.width, (open ? 0 : gesture.width) + dx));
      setProgress(1 - gesture.offset / gesture.width);
    };
    const end = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.type !== "touchcancel" && !Array.from(event.changedTouches).some(touch => touch.identifier === gesture!.id)) return;
      if (gesture.dragging) {
        suppressClickUntil.current = performance.now() + 400;
        const keepOpen = event.type === "touchcancel" ? open
          : open ? gesture.offset < gesture.width * 0.3 : gesture.offset <= gesture.width * 0.7;
        onOpenChange(keepOpen);
      }
      cancel();
    };
    const suppressClick = (event: MouseEvent) => {
      if (event.detail > 0 && performance.now() < suppressClickUntil.current) {
        suppressClickUntil.current = 0;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    document.addEventListener("click", suppressClick, true);
    window.addEventListener("resize", cancel);
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => {
      gesture = null;
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
      document.removeEventListener("click", suppressClick, true);
      window.removeEventListener("resize", cancel);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
    };
  }, [enabled, open, onOpenChange]);

  return { sidebarRef, swipeProgress: enabled ? progress : null };
}
