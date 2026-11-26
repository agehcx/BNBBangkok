"use client";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Frame, SourceId } from "@/lib/types";

interface Props {
  frames: Frame[];
  idx: number;
  poisoned: SourceId;
  attackRange: [number, number] | null;
}

const fmt = (v: number) => `$${v.toFixed(2)}`;

export function PriceChart({ frames, idx, poisoned, attackRange }: Props) {
  const all = frames.flatMap((f) => [f.tick.truePrice, f.tick.cmc.price, f.tick.atlas.price]);
  const lo = Math.min(...all) * 0.995;
  const hi = Math.max(...all) * 1.005;

  const data = frames.map((f, i) =>
    i <= idx
      ? { i, true: f.tick.truePrice, cmc: f.tick.cmc.price, atlas: f.tick.atlas.price }
      : { i },
  );
  const shown = frames.slice(0, idx + 1);
  const trades = (k: "naive" | "guarded") =>
    shown.filter((f) => f[k].action.kind === "SELL" || f[k].action.kind === "BUY");

  const color = { cmc: "var(--green)", atlas: "var(--cyan)" };

  return (
    <div className="h-full min-h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--green-4)" strokeDasharray="2 4" />
          <XAxis dataKey="i" type="number" domain={[0, frames.length - 1]} tick={{ fill: "var(--muted)", fontSize: 16 }} stroke="var(--green-3)" tickCount={7} />
          <YAxis domain={[lo, hi]} tickFormatter={(v) => v.toFixed(0)} width={48} tick={{ fill: "var(--muted)", fontSize: 16 }} stroke="var(--green-3)" />
          {attackRange && (
            <ReferenceArea
              x1={attackRange[0]}
              x2={Math.min(attackRange[1], frames.length - 1)}
              fill="var(--red)"
              fillOpacity={0.12}
              stroke="var(--red)"
              strokeDasharray="4 4"
              label={{ value: "ATTACK", fill: "var(--red)", fontSize: 16, position: "insideTop" }}
            />
          )}
          <Tooltip
            contentStyle={{ background: "var(--panel)", border: "2px solid var(--green-3)", borderRadius: 0, fontFamily: "var(--font-vt323)" }}
            labelFormatter={(l) => `tick ${l}`}
            formatter={(v: number, n: string) => [fmt(v), n.toUpperCase()]}
          />
          <Line type="stepAfter" dataKey="true" stroke="var(--white)" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
          {(["cmc", "atlas"] as SourceId[]).map((s) => (
            <Line
              key={s}
              type="stepAfter"
              dataKey={s}
              stroke={s === poisoned && attackRange ? "var(--red)" : color[s]}
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
          ))}
          {trades("naive").map((f) => (
            <ReferenceDot key={`n${f.tick.i}`} x={f.tick.i} y={f.naive.action.price!} r={6} fill="var(--red)" stroke="#000" strokeWidth={2} />
          ))}
          {trades("guarded").map((f) => (
            <ReferenceDot key={`g${f.tick.i}`} x={f.tick.i} y={f.guarded.action.price!} r={6} fill="var(--green)" stroke="#000" strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
