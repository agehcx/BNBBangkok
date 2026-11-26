"use client";

import { useEffect, useRef } from "react";

/** The scene is drawn at 1/PIXEL resolution then scaled up, so every dot is one big square. */
const PIXEL = 8;
const WAVE_AMPLITUDE = 2; // scene px of per-row horizontal distortion
const PETALS = 6;
const CELL = 56; // scene px between flower centres (smaller = more flowers)
const FLOWER_SIZE = 0.3; // flower radius as a fraction of CELL
const GROUND = "#1F1F23";
const FLOWER = "#4E421E"; // muted gold: low contrast so it stays in the background

// 4x4 ordered-dither matrix: gives the halftone dot pattern from the badge.
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothstep(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Petal outline: 6 lobes separated by notches. */
function petalRadius(theta: number, rotation: number): number {
  const lobe = Math.abs(Math.cos((PETALS / 2) * (theta - rotation)));
  return 0.36 + 0.64 * Math.pow(lobe, 0.55);
}

function isFlower(x: number, y: number, cx: number, cy: number, radius: number, rotation: number): boolean {
  const dx = x - cx;
  const dy = y - cy;
  const reach = radius * petalRadius(Math.atan2(dy, dx), rotation);
  const t = Math.hypot(dx, dy) / reach;
  if (t > 1) return false;
  // Sparse dots near the centre, solid white toward the petal tips.
  const density = t > 0.88 ? 1 : 0.3 + 0.7 * smoothstep(0.15, 0.8, t);
  return density > (BAYER[y & 3][x & 3] + 0.5) / 16;
}

/** Flowers sit on a staggered grid; each pixel only checks the flower in its own cell. */
function paintScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = GROUND;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = FLOWER;
  for (let y = 0; y < h; y++) {
    const row = Math.floor(y / CELL);
    const offset = row % 2 ? CELL / 2 : 0;
    for (let x = 0; x < w; x++) {
      const col = Math.floor((x - offset) / CELL);
      const cx = (col + 0.5) * CELL + offset;
      const cy = (row + 0.5) * CELL;
      const radius = CELL * (FLOWER_SIZE + 0.06 * hash(col, row));
      const rotation = hash(row, col) * Math.PI;
      if (isFlower(x, y, cx, cy, radius, rotation)) ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** Scale up row by row, nudging blocks of rows sideways for a glitchy distortion. */
function present(scene: HTMLCanvasElement, out: HTMLCanvasElement) {
  const ctx = out.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < scene.height; y++) {
    const shift = Math.round(Math.sin(y * 0.18) * WAVE_AMPLITUDE * hash(0, Math.floor(y / 5)));
    ctx.drawImage(scene, 0, y, scene.width, 1, shift * PIXEL, y * PIXEL, scene.width * PIXEL, PIXEL);
  }
}

/** Fixed full-screen halftone pixel flower, gold on dark grey, after the BNB "Build N Build" badge. */
export function PixelBg() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const out = ref.current;
    if (!out) return;

    function draw() {
      if (!out) return;
      const scene = document.createElement("canvas");
      scene.width = Math.ceil(window.innerWidth / PIXEL) + WAVE_AMPLITUDE * 2;
      scene.height = Math.ceil(window.innerHeight / PIXEL);
      const sceneCtx = scene.getContext("2d");
      if (!sceneCtx) return;
      paintScene(sceneCtx, scene.width, scene.height);
      out.width = scene.width * PIXEL;
      out.height = scene.height * PIXEL;
      present(scene, out);
    }

    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);

  return <canvas ref={ref} aria-hidden className="drift fixed inset-0 -z-10 h-full w-full object-cover [image-rendering:pixelated]" />;
}
