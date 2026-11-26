"use client";
import { useEffect, useRef } from "react";

// Game-Boy-style green palette, dark → light
const PALETTE = [
  [4, 12, 6],
  [14, 107, 44],
  [31, 193, 83],
  [61, 255, 116],
  [212, 255, 224],
];

/**
 * Renders /logo.webp as pixel art: downsample to `res` px, quantize to a green palette,
 * and scale up with nearest-neighbour. Pass `tint={false}` to keep original colours.
 */
export function PixelLogo({ size = 72, res = 40, tint = true }: { size?: number; res?: number; tint?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = "/logo.webp";
    img.onload = () => {
      const c = ref.current;
      if (!c) return;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      c.width = res;
      c.height = res;
      ctx.imageSmoothingEnabled = true;
      // centre-crop a square around the upper body
      const s = Math.min(img.width, img.height) * 0.78;
      const sx = (img.width - s) / 2;
      const sy = 0;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, res, res);
      if (!tint) return;
      const d = ctx.getImageData(0, 0, res, res);
      for (let i = 0; i < d.data.length; i += 4) {
        const l = (0.299 * d.data[i] + 0.587 * d.data[i + 1] + 0.114 * d.data[i + 2]) / 255;
        const idx = Math.min(PALETTE.length - 1, Math.floor(Math.pow(l, 0.85) * PALETTE.length));
        [d.data[i], d.data[i + 1], d.data[i + 2]] = PALETTE[idx];
      }
      ctx.putImageData(d, 0, 0);
    };
  }, [res, tint]);

  return (
    <canvas
      ref={ref}
      aria-label="TrustedPrice logo"
      role="img"
      className="pixelated block bg-green-4"
      style={{ width: size, height: size }}
    />
  );
}
