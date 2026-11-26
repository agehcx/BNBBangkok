import type { AgentAction, TrustResult } from "./types";

/**
 * Deterministic fallback rationale. An LLM may later rephrase this from the same
 * JSON inputs, but must never change the numbers (validate its output against a schema).
 */
export function rationaleFor(trust: TrustResult, action: AgentAction): string {
  const why = trust.reasons
    .filter((r) => r.level !== "trust")
    .map((r) => r.message)
    .join("; ");
  const px = action.price ? `$${action.price.toFixed(2)}` : "";

  switch (action.kind) {
    case "REFUSE":
      return `Refused to act: ${why || "data untrusted"}. Holding position until sources agree.`;
    case "SELL":
    case "BUY": {
      const size = action.sizeFactor < 1 ? ` at ${Math.round(action.sizeFactor * 100)}% size (caution: ${why})` : " at full size";
      return `${action.kind} ${action.qtyBnb.toFixed(3)} BNB @ ${px}${size}. Signal: ${action.note}.`;
    }
    default:
      return trust.verdict === "caution"
        ? `Holding. Data usable with caution (${why}); ${action.note}.`
        : `Holding. Sources agree (gap ${trust.gapPct.toFixed(2)}%); ${action.note}.`;
  }
}
