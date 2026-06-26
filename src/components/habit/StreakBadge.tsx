import { useProgress } from "../../contexts/ProgressContext";
import { Icon } from "../common/Icon";
import { FireFX } from "./FireFX";

export function StreakBadge() {
  const { profile } = useProgress();
  // Render whenever signed in (like the XP badge) so the streak always sits in
  // the header. With no active streak it shows a muted "0" that nudges the
  // learner to start one, then lights up orange once the streak is going.
  if (!profile) return null;

  const count = profile.streak.count;
  const active = count > 0;

  return (
    <div className="group relative inline-flex shrink-0">
      <div
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-sm font-semibold transition-transform group-hover:scale-105 ${
          active
            ? "bg-orange-100 text-orange-800"
            : "bg-slate-100 text-slate-500"
        }`}
        aria-label={active ? `${count} day streak` : "No active streak yet"}
      >
        <Icon
          name="flame"
          className={`streak-icon h-4 w-4 ${active ? "text-orange-500" : "text-slate-400"}`}
          fill="currentColor"
        />
        <span aria-hidden>
          {count}
          {/* The "days" label is dropped on small screens so the streak and XP
              badges fit beside each other in the header. */}
          <span className="hidden sm:inline"> day{count !== 1 ? "s" : ""}</span>
        </span>
      </div>

      {/* Fire flickers around the badge on hover — only once a streak is going,
          so the muted zero-state doesn't glow warm. */}
      {active && <FireFX />}
    </div>
  );
}
