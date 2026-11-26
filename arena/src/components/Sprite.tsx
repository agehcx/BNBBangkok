// Tiny pixel sprites drawn from string maps. Each char → colour.
const SPRITES: Record<string, string[]> = {
  naive: [
    "....RRRR....",
    "...R....R...",
    "..GGGGGGGG..",
    ".GGGGGGGGGG.",
    ".GWXGGGGXWG.",
    ".GGGGGGGGGG.",
    ".GGG.GG.GGG.",
    ".GGGGGGGGGG.",
    "..GG....GG..",
    "..GGGGGGGG..",
    "...G....G...",
    "..GG....GG..",
  ],
  guarded: [
    ".....AA.....",
    "....A..A....",
    "..GGGGGGGG..",
    ".GGGGGGGGGG.",
    ".GWWGGGGWWG.",
    ".GWKGGGGWKG.",
    ".GGGGGGGGGG.",
    ".GGG.GG.GGG.",
    "SSSSGGGGGGG.",
    "SLLSGGGGGG..",
    "SLLS....G...",
    ".SS....GG...",
  ],
};

const COLORS: Record<string, string> = {
  G: "var(--green-2)",
  W: "var(--white)",
  K: "#000",
  X: "var(--red)",
  R: "var(--red)",
  A: "var(--amber)",
  S: "var(--green)",
  L: "var(--green-4)",
};

export function Sprite({ name, size = 48 }: { name: "naive" | "guarded"; size?: number }) {
  const rows = SPRITES[name];
  const w = rows[0].length;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${w} ${rows.length}`} shapeRendering="crispEdges" aria-hidden>
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === "." ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={COLORS[ch]} />)),
      )}
    </svg>
  );
}
