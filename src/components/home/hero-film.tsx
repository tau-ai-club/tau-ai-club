"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The home hero's looping "film" (DECISIONS 23.11: option 1 with option 3's opening): purple light
 * running along a grid floor, and the club's pixel blocks drifting up. Drawn on a small canvas, so
 * there is no video file to download. Decorative and behind everything (-z-10, aria-hidden).
 *
 * - Starts after hydration and fades in; before that (and with JS off) the static backdrop shows,
 *   so it never delays the first paint or LCP (a canvas is never an LCP candidate).
 * - Reduced motion or Save-Data: not rendered at all; the static backdrop stays.
 * - Pauses when it's off screen or the tab is hidden; <HeroFilmToggle> pauses it for good
 *   (remembered in this browser), as WCAG 2.2.2 asks of anything that moves for over 5 s.
 * - Colours come from the tokens at runtime. The Next event card above it never moves.
 */

const EVENT = "tau-film";
const KEY = "tau-film-paused";
const LOOP = 8; // seconds
const STILL = 2.4; // the frame shown when the film doesn't run

function readPaused() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

type Colors = { p: string; s: string; g: string; b: string };

function draw(cv: HTMLCanvasElement, c: Colors, t: number, rtl: boolean) {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
  }
  const x = cv.getContext("2d");
  if (!x) return;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, w, h);

  // A grid floor sliding toward the viewer, its vanishing point away from the headline.
  const hz = h * 0.42;
  const cx = w * (rtl ? 0.32 : 0.68);
  x.strokeStyle = c.g;
  x.lineWidth = 1;
  x.globalAlpha = 0.9;
  for (let i = -24; i <= 24; i++) {
    x.beginPath();
    x.moveTo(cx + i * 18, hz);
    x.lineTo(cx + i * 260, h);
    x.stroke();
  }
  for (let k = 0; k < 14; k++) {
    const f = ((k + (t / LOOP) * 7) % 14) / 14;
    const y = hz + (h - hz) * f * f;
    x.globalAlpha = 0.2 + 0.6 * f;
    x.beginPath();
    x.moveTo(0, y);
    x.lineTo(w, y);
    x.stroke();
  }

  // Light running along the floor lines.
  x.shadowColor = c.p;
  x.shadowBlur = 24;
  for (let i = 0; i < 14; i++) {
    const lane = i * 3 - 20;
    const ph = ((t / LOOP) * (1 + (i % 3) * 0.5) + i * 0.137) % 1;
    const sx = cx + lane * 18;
    const ex = cx + lane * 260;
    const a = ph;
    const b = Math.min(1, ph + 0.18);
    const ax = sx + (ex - sx) * a, ay = hz + (h - hz) * a;
    const bx = sx + (ex - sx) * b, by = hz + (h - hz) * b;
    const g = x.createLinearGradient(ax, ay, bx, by);
    g.addColorStop(0, "transparent");
    g.addColorStop(1, i % 2 ? c.s : c.p);
    x.globalAlpha = 1;
    x.strokeStyle = g;
    x.lineWidth = 2.5 + 4 * b;
    x.beginPath();
    x.moveTo(ax, ay);
    x.lineTo(bx, by);
    x.stroke();
  }
  x.shadowBlur = 0;

  // Glow on the horizon.
  const rg = x.createRadialGradient(cx, hz, 0, cx, hz, w * 0.55);
  rg.addColorStop(0, c.p);
  rg.addColorStop(1, "transparent");
  x.globalAlpha = 0.45;
  x.fillStyle = rg;
  x.fillRect(0, 0, w, h);

  // The club's pixel blocks drifting up.
  for (let i = 0; i < 26; i++) {
    const r = (n: number) => {
      const v = Math.sin(i * 91.7 + n * 47.3) * 9631.7;
      return v - Math.floor(v);
    };
    const s = 4 + Math.floor(r(1) * 4) * 4;
    const y = (((r(2) * h - t * (10 + r(3) * 22)) % h) + h) % h;
    x.globalAlpha = 0.25 + r(5) * 0.6;
    x.fillStyle = r(6) > 0.75 ? c.p : c.b;
    x.fillRect(Math.round(r(4) * w), Math.round(y), s, s);
  }
  x.globalAlpha = 1;
}

/**
 * Real meetup footage can replace the drawn film later: pass `video` (a short muted loop, ~6–8 s,
 * 720p WebM/MP4 under ~1.2 MB, plus a poster). Everything else stays the same: it only loads and
 * plays after hydration, never under reduced motion or Save-Data, and pauses off screen, in a
 * hidden tab and from the toggle.
 */
export type HeroFilmVideo = { src: string; type?: string; poster: string };

/**
 * Where the film sits (25.11: on every page, not only home). "home": the tall hero film, under the
 * header and the hero. "band": the other pages, behind the header and the title area only, fading
 * out before the content (long reading and forms stay calm).
 */
export type HeroFilmVariant = "home" | "band";
const PLACE: Record<HeroFilmVariant, string> = {
  home: "top-0 h-[50rem]",
  band: "top-0 h-[26rem] lg:h-[32rem] [mask-image:linear-gradient(to_bottom,black_45%,transparent)]",
};

export function HeroFilm({ video, variant = "home" }: { video?: HeroFilmVideo; variant?: HeroFilmVariant } = {}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false); // mounted, motion allowed
  const [shown, setShown] = useState(false);

  // Reduced motion or Save-Data: render nothing at all (the static backdrop stays), so it costs nothing.
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches || conn?.saveData === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- decided once on the client: the server can't know
    if (!still) setOn(true);
  }, []);

  useEffect(() => {
    if (!on) return;
    const box = wrap.current;
    const cv = canvas.current;
    const vid = player.current;
    if (!box || (!cv && !vid)) return;
    const css = getComputedStyle(document.documentElement);
    const v = (n: string) => css.getPropertyValue(n).trim();
    const colors = { p: v("--brand-purple"), s: v("--brand-purple-soft"), g: v("--logo-grid"), b: v("--logo-block") };
    const rtl = document.documentElement.dir === "rtl";

    let paused = readPaused();
    let onScreen = true;
    let raf = 0;
    let last = 0;
    let t = STILL;

    const frame = (now: number) => {
      raf = 0;
      if (now - last >= 33) {
        // ~30 fps is plenty for slow light
        t += last ? Math.min(now - last, 100) / 1000 : 0;
        last = now;
        if (cv) draw(cv, colors, t, rtl);
      }
      tick();
    };
    const tick = () => {
      if (paused || !onScreen || document.hidden) return;
      if (vid) void vid.play().catch(() => {});
      else if (!raf) raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (vid) vid.pause();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };

    // The backdrop's grid steps aside while the film shows its own floor.
    document.documentElement.setAttribute("data-film", "");
    if (cv) draw(cv, colors, t, rtl);
    setShown(true);

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) tick();
      else stop();
    });
    io.observe(box);
    const ro = cv ? new ResizeObserver(() => draw(cv, colors, t, rtl)) : null;
    if (cv) ro?.observe(cv);
    const onVis = () => (document.hidden ? stop() : tick());
    document.addEventListener("visibilitychange", onVis);
    const onToggle = (e: Event) => {
      paused = (e as CustomEvent<boolean>).detail;
      if (paused) stop();
      else tick();
    };
    window.addEventListener(EVENT, onToggle);
    tick();

    return () => {
      stop();
      io.disconnect();
      ro?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(EVENT, onToggle);
      document.documentElement.removeAttribute("data-film");
    };
  }, [on]);

  if (!on) return null;
  return (
    <div
      ref={wrap}
      aria-hidden
      className={`hero-film pointer-events-none absolute inset-x-0 -z-10 overflow-hidden ${PLACE[variant]}`}
      data-shown={shown || undefined}
      data-variant={variant}
      data-testid="site-film"
    >
      {video ? (
        <video
          ref={player}
          className="absolute inset-0 size-full object-cover"
          poster={video.poster}
          muted
          loop
          playsInline
          preload="metadata"
        >
          <source src={video.src} type={video.type ?? "video/webm"} />
        </video>
      ) : (
        <canvas ref={canvas} className="absolute inset-0 size-full" />
      )}
    </div>
  );
}

/** "Pause background" / "Play background". Hidden under reduced motion, where nothing moves. */
export function HeroFilmToggle({ pauseLabel, playLabel, className }: { pauseLabel: string; playLabel: string; className?: string }) {
  const [paused, setPaused] = useState(false);
  const [gone, setGone] = useState(false); // Save-Data: no film, so no button
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after mount: the server can't know
    setPaused(readPaused());
    setGone(conn?.saveData === true);
  }, []);
  if (gone) return null;
  const toggle = () => {
    const next = !paused;
    setPaused(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  };
  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="film-toggle"
      className={`${className ?? "absolute -bottom-12 end-4 sm:end-8"} inline-flex h-8 items-center gap-2 rounded-full border border-border-strong bg-bg/60 px-3 text-[0.75rem] font-medium text-fg-muted backdrop-blur-sm transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple motion-reduce:hidden`}
    >
      <svg aria-hidden viewBox="0 0 12 12" className="size-3" fill="currentColor">
        {paused ? <path d="M3 1.5v9l7.5-4.5z" /> : (
          <>
            <rect x="2" y="1.5" width="3" height="9" />
            <rect x="7" y="1.5" width="3" height="9" />
          </>
        )}
      </svg>
      {paused ? playLabel : pauseLabel}
    </button>
  );
}
