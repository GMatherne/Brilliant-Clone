import { Link } from "react-router-dom";
import {
  hasLevelReview,
  type LevelStatus,
  type ResolvedLevel,
} from "../../lib/contentLoader";
import { Icon } from "../common/Icon";
import { LessonCard } from "./LessonCard";

interface LevelSectionProps {
  level: ResolvedLevel;
  status: LevelStatus;
  completion: { done: number; total: number; percent: number };
  progress: Record<string, { status: string; currentStepIndex?: number }>;
  isLast: boolean;
}

export function LevelSection({
  level,
  status,
  completion,
  progress,
  isLast,
}: LevelSectionProps) {
  const locked = status === "locked";
  const complete = status === "complete";

  const badgeClasses = complete
    ? "bg-emerald-500 text-white"
    : locked
      ? "bg-slate-200 text-slate-400"
      : "bg-indigo-600 text-white";

  return (
    <section className={`relative pl-14 ${locked ? "opacity-70" : ""}`}>
      <div
        className={`absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${badgeClasses}`}
        aria-hidden
      >
        {complete ? (
          <Icon name="check" className="h-5 w-5" />
        ) : locked ? (
          <Icon name="lock" className="h-4 w-4" />
        ) : (
          level.order
        )}
      </div>

      {/* Connector links each level badge to the next to show the progression. */}
      {!isLast && (
        <span
          className={`absolute left-5 top-12 -bottom-8 w-0.5 -translate-x-1/2 ${
            complete ? "bg-emerald-300" : "bg-slate-200"
          }`}
          aria-hidden
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Level {level.order}
          </p>
          <h2 className="text-lg font-bold text-slate-900">{level.title}</h2>
          <p className="mt-0.5 text-sm text-slate-500">{level.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              complete
                ? "bg-emerald-100 text-emerald-700"
                : locked
                  ? "bg-slate-100 text-slate-400"
                  : "bg-indigo-100 text-indigo-700"
            }`}
          >
            {completion.done}/{completion.total}
          </span>
          {hasLevelReview(level.id) &&
            (complete ? (
              <Link
                to={`/level/${level.id}/review`}
                className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:border-indigo-400 hover:bg-indigo-50 active:scale-[0.98] transition"
              >
                Review
                <span aria-hidden>→</span>
              </Link>
            ) : (
              <span
                className="inline-flex items-center rounded-full border border-dashed border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400"
                title="Finish this level to unlock a mixed review"
              >
                Review
              </span>
            ))}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full transition-all ${
            complete ? "bg-emerald-500" : "bg-indigo-500"
          }`}
          style={{ width: `${completion.percent}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3">
        {level.lessons.map((meta) => (
          <LessonCard
            key={meta.id}
            meta={meta}
            status={progress[meta.id]?.status ?? "not_started"}
            progress={progress}
          />
        ))}
      </div>
    </section>
  );
}
