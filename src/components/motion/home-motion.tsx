"use client";

import { useEffect, useRef } from "react";
import { ease } from "@/lib/motion";

/**
 * The home page's motion, in one client island (pixel-builder pass). Renders nothing visible.
 * Everything it touches is already in the server HTML, fully visible: this only enhances it
 * after hydration, so no-JS visitors, crawlers and slow phones see the finished page.
 *
 * Scroll (skipped under reduced motion and for WebDriver captures, see reveal-on-scroll.tsx):
 *  - [data-mosaic] columns lift off at different speeds as the hero scrolls away;
 *  - [data-band-text] slides sideways (toward the reading start) while the tagline band crosses the screen;
 *  - [data-heading-rise] lines rise out of their clip boxes when they enter;
 *  - [data-build] grids build cell by cell, in diagonal order;
 *  - [data-portrait] photos resolve from a 4x4 block of pixels.
 * Only elements still below the fold are hidden and revealed, so nothing on screen flashes.
 *
 * Pointer (mouse/trackpad only, never touch; off under reduced motion):
 *  - a trail of pixels on a 14px grid behind the cursor;
 *  - .cell-grid lines light up near the cursor;
 *  - [data-tilt] cells lean toward the cursor;
 *  - [data-magnetic] buttons pull a few pixels toward it.
 * Nothing loops: every animation ends on its own.
 */
export function HomeMotion() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = marker.current?.parentElement;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;

    const cleanups: Array<() => void> = [];
    let cancelled = false;
    const below = (el: Element) => el.getBoundingClientRect().top > window.innerHeight;

    // ---- Scroll ---------------------------------------------------------------------------
    if (!navigator.webdriver) {
      void import("motion").then(({ animate, scroll, inView }) => {
        if (cancelled) return;

        // Mosaic: each column rises by a different amount as the hero leaves the screen.
        const hero = root.querySelector<HTMLElement>("[data-hero]")?.parentElement;
        root.querySelectorAll<SVGGElement>("[data-mosaic] [data-mosaic-col]").forEach((g) => {
          const col = Number(g.dataset.mosaicCol);
          const lift = 30 + ((col * 37) % 90); // px in SVG units, uneven so it reads as loose blocks
          const anim = animate(g, { transform: ["translateY(0px)", `translateY(${-lift}px)`], opacity: [1, 0.35] }, { ease: "linear" });
          cleanups.push(scroll(anim, { target: hero ?? undefined, offset: ["start start", "end start"] }));
        });

        // Band: drifts toward the reading start as it crosses the viewport (left in LTR, right in RTL).
        root.querySelectorAll<HTMLElement>("[data-band-text]").forEach((el) => {
          const band = el.parentElement!;
          const dir = getComputedStyle(band).direction === "rtl" ? -1 : 1;
          const anim = animate(el, { transform: [`translateX(${6 * dir}%)`, `translateX(${-14 * dir}%)`] }, { ease: "linear" });
          cleanups.push(scroll(anim, { target: band, offset: ["start end", "end start"] }));
        });

        // Headings: each line rises out of its clip box, line 2 just after line 1.
        root.querySelectorAll<HTMLElement>("[data-heading-rise]").forEach((h) => {
          if (!below(h)) return;
          const lines = Array.from(h.querySelectorAll<HTMLElement>("[data-line]"));
          lines.forEach((l) => (l.style.transform = "translateY(105%)"));
          cleanups.push(
            inView(
              h,
              () => {
                lines.forEach((l, i) =>
                  animate(l, { transform: ["translateY(105%)", "translateY(0%)"] }, { duration: 0.7, ease: [...ease.out], delay: i * 0.09 }),
                );
              },
              { margin: "0px 0px -15% 0px" },
            ),
          );
          cleanups.push(() => lines.forEach((l) => (l.style.transform = "")));
        });

        // Grids: cells appear as blocks, ordered along the diagonal from the reading start.
        root.querySelectorAll<HTMLElement>("[data-build]").forEach((grid) => {
          if (!below(grid)) return;
          // Skip the [data-pad] masks of .people-grid; they are empty, not cells.
          const cells = (Array.from(grid.children) as HTMLElement[]).filter((c) => !c.hasAttribute("data-pad"));
          let cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length || 1;
          // .people-grid uses 2 tracks per column on desktop (cells span 2).
          if (grid.classList.contains("people-grid") && cols > 2) cols = Math.max(1, Math.round(cols / 2));
          cells.forEach((c) => {
            c.style.opacity = "0";
            c.style.translate = "0 18px";
          });
          cleanups.push(
            inView(
              grid,
              () => {
                cells.forEach((c, i) => {
                  const order = (i % cols) + Math.floor(i / cols);
                  animate(c, { opacity: [0, 1], translate: ["0 18px", "0 0"] }, { duration: 0.5, ease: [...ease.out], delay: order * 0.07 });
                });
                grid.querySelectorAll<HTMLElement>("[data-portrait]").forEach((p, i) => dissolve(p, 0.25 + i * 0.06));
              },
              { margin: "0px 0px -12% 0px" },
            ),
          );
          cleanups.push(() =>
            cells.forEach((c) => {
              c.style.opacity = "";
              c.style.translate = "";
            }),
          );
        });

        /** Covers a photo with 16 blocks that switch off in a shuffled order. */
        function dissolve(photo: HTMLElement, delay: number) {
          const veil = document.createElement("span");
          veil.setAttribute("aria-hidden", "true");
          veil.style.cssText = "position:absolute;inset:0;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,1fr);z-index:1";
          const fills = ["var(--logo-block)", "var(--logo-indigo)", "var(--brand-purple-deeper)", "var(--brand-purple)"];
          const order = [5, 12, 0, 9, 14, 3, 7, 10, 1, 15, 6, 11, 2, 13, 4, 8];
          for (let i = 0; i < 16; i++) {
            const b = document.createElement("i");
            b.style.cssText = `display:block;background:${fills[(i * 7 + Math.floor(i / 4)) % fills.length]}`;
            veil.append(b);
            animate(b, { opacity: [1, 0] }, { duration: 0.12, delay: delay + order[i] * 0.035, ease: "linear" });
          }
          photo.append(veil);
          const t = window.setTimeout(() => veil.remove(), (delay + 16 * 0.035 + 0.3) * 1000);
          cleanups.push(() => {
            window.clearTimeout(t);
            veil.remove();
          });
        }
      });
    }

    // ---- Pointer --------------------------------------------------------------------------
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (finePointer.matches) cleanups.push(pointerEffects(root));

    return () => {
      cancelled = true;
      cleanups.forEach((c) => c());
    };
  }, []);

  return <span ref={marker} hidden />;
}

function pointerEffects(root: HTMLElement) {
  const offs: Array<() => void> = [];
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    el.addEventListener(type, fn as EventListener, { passive: true });
    offs.push(() => el.removeEventListener(type, fn as EventListener));
  };

  // Trail: a pool of squares; a new one lights up each time the cursor enters a new grid cell.
  const STEP = 14;
  const trail = document.createElement("div");
  trail.className = "pixel-trail";
  trail.setAttribute("aria-hidden", "true");
  const fills = ["var(--brand-purple)", "var(--brand-purple-soft)", "var(--logo-block)", "var(--brand-lilac)"];
  const pool = Array.from({ length: 28 }, (_, i) => {
    const sq = document.createElement("i");
    sq.style.background = fills[i % fills.length];
    trail.append(sq);
    return sq;
  });
  document.body.append(trail);
  offs.push(() => trail.remove());
  let next = 0;
  let lastCell = "";
  on(window, "pointermove", (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const x = Math.floor(e.clientX / STEP) * STEP;
    const y = Math.floor(e.clientY / STEP) * STEP;
    const cell = `${x},${y}`;
    if (cell === lastCell) return;
    lastCell = cell;
    const sq = pool[next];
    next = (next + 1) % pool.length;
    sq.getAnimations().forEach((a) => a.cancel());
    sq.style.transform = `translate(${x}px, ${y}px)`;
    sq.animate(
      [
        { opacity: 0.9, transform: `translate(${x}px, ${y}px) scale(1)` },
        { opacity: 0, transform: `translate(${x}px, ${y}px) scale(0.4)` },
      ],
      { duration: 520, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    );
  });

  // Grid spotlight.
  root.querySelectorAll<HTMLElement>(".cell-grid").forEach((grid) => {
    on(grid, "pointermove", (e: PointerEvent) => {
      const r = grid.getBoundingClientRect();
      grid.style.setProperty("--mx", `${e.clientX - r.left}px`);
      grid.style.setProperty("--my", `${e.clientY - r.top}px`);
      grid.dataset.spot = "";
    });
    on(grid, "pointerleave", () => delete grid.dataset.spot);
  });

  // Tilt: up to 6 degrees toward the cursor.
  root.querySelectorAll<HTMLElement>("[data-tilt]").forEach((cell) => {
    on(cell, "pointermove", (e: PointerEvent) => {
      const r = cell.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      cell.dataset.hover = "";
      cell.style.setProperty("--ry", `${(px * 12).toFixed(2)}deg`);
      cell.style.setProperty("--rx", `${(-py * 12).toFixed(2)}deg`);
    });
    on(cell, "pointerleave", () => {
      delete cell.dataset.hover;
      cell.style.removeProperty("--rx");
      cell.style.removeProperty("--ry");
    });
  });

  // Magnetic buttons: follow the cursor by up to a third of the distance, capped at 8px.
  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((btn) => {
    const base = getComputedStyle(btn).transition;
    // Keep the button's own colour transitions and add the pull.
    btn.style.transition = `${base && base !== "all 0s ease 0s" ? `${base}, ` : ""}translate 250ms cubic-bezier(0.22, 1, 0.36, 1)`;
    on(btn, "pointermove", (e: PointerEvent) => {
      const r = btn.getBoundingClientRect();
      const dx = Math.max(-8, Math.min(8, (e.clientX - (r.left + r.width / 2)) / 3));
      const dy = Math.max(-8, Math.min(8, (e.clientY - (r.top + r.height / 2)) / 3));
      btn.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
    });
    on(btn, "pointerleave", () => (btn.style.translate = ""));
    offs.push(() => {
      btn.style.transition = "";
      btn.style.translate = "";
    });
  });

  return () => offs.forEach((o) => o());
}
