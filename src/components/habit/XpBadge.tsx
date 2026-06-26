import { useEffect, useRef, useState } from "react";
import { useProgress } from "../../contexts/ProgressContext";
import { useCountUp } from "../../hooks/useCountUp";
import { Icon } from "../common/Icon";
import { Sparkles } from "./Sparkles";
import { ElectricityFX } from "./ElectricityFX";

/**
 * Compact display of the learner's total XP. Renders only when signed in so the
 * count is always visible in the app chrome (e.g. the header). When XP is
 * earned during the session the number rolls up and a little burst plays.
 */
export function XpBadge() {
  const { profile } = useProgress();
  const xp = profile?.xp ?? 0;

  const display = useCountUp(xp);
  const prevXp = useRef(xp);
  // Key for the current celebratory burst (null when idle). Re-keying replays
  // the pop/wiggle/sparkles on each gain.
  const [burstKey, setBurstKey] = useState<number | null>(null);

  // Celebrate only a real in-session increase, never the first load or a route
  // change (where the badge simply remounts at its total).
  useEffect(() => {
    if (xp > prevXp.current) {
      setBurstKey(Date.now());
    }
    prevXp.current = xp;
  }, [xp]);

  // Reset once the burst has played so its classes/nodes don't linger.
  useEffect(() => {
    if (burstKey === null) return;
    const timer = setTimeout(() => setBurstKey(null), 1100);
    return () => clearTimeout(timer);
  }, [burstKey]);

  if (!profile) return null;

  const bursting = burstKey !== null;

  return (
    <div className="group relative inline-flex shrink-0">
      <div
        key={burstKey ?? "static"}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-amber-300 to-yellow-200 text-amber-900 px-2.5 py-1.5 text-sm font-semibold shadow-sm ring-1 ring-amber-300/60 transition-transform group-hover:scale-105 ${bursting ? "xp-pop" : ""}`}
        aria-label={`${xp.toLocaleString()} XP total`}
      >
        <Icon
          name="zap"
          className={`xp-bolt-icon h-4 w-4 text-amber-500 ${bursting ? "xp-bolt-wiggle" : ""}`}
          fill="currentColor"
        />
        <span aria-hidden>
          {display.toLocaleString()}
          {/* "XP" label is dropped on small screens so the badge stays compact
              next to the streak in the header (the bolt already implies XP). */}
          <span className="hidden sm:inline"> XP</span>
        </span>
      </div>

      {/* Electricity crackles around the badge on hover. */}
      <ElectricityFX />

      {bursting && <Sparkles trigger={burstKey} />}
    </div>
  );
}
