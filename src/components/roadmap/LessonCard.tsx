import { Link } from "react-router-dom";
import type { LessonMeta } from "../../types/content";
import {
  isLessonUnlocked,
  getLessonStepCount,
  getLessonProgressPercent,
  hasPractice,
} from "../../lib/contentLoader";

interface LessonCardProps {
  meta: LessonMeta;
  status: string;
  progress: Record<string, { status: string; currentStepIndex?: number }>;
}

export function LessonCard({ meta, status, progress }: LessonCardProps) {
  const unlocked = isLessonUnlocked(meta.id, progress);
  const isDone = status === "complete" || status === "mastered";
  const inProgress = status === "in_progress";
  const totalSteps = getLessonStepCount(meta.id);
  const percent = getLessonProgressPercent(meta.id, progress);
  const stepsDone = isDone
    ? totalSteps
    : Math.min(progress[meta.id]?.currentStepIndex ?? 0, totalSteps);
  const showProgress = unlocked && (isDone || inProgress);

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 transition ${
        !unlocked ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
        <div className="min-w-0 sm:flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-slate-500">
            <span className="uppercase tracking-wide">Lesson {meta.order}</span>
            <span aria-hidden>·</span>
            <span>~{meta.estimatedMinutes} min</span>
          </div>
          <h3 className="font-semibold text-lg text-slate-900">{meta.title}</h3>
        </div>

        {showProgress && (
          <div className="sm:w-44 sm:shrink-0">
            <div className="flex items-center justify-between text-xs font-medium mb-1">
              <span className={isDone ? "text-emerald-700" : "text-slate-500"}>
                {isDone ? "Completed" : `${stepsDone} of ${totalSteps} steps`}
              </span>
              <span className={isDone ? "text-emerald-700" : "text-slate-500"}>
                {percent}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isDone ? "bg-emerald-500" : "bg-indigo-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="sm:shrink-0">
          {!unlocked ? (
            <span className="block w-full sm:w-auto min-h-[44px] rounded-xl bg-slate-100 px-4 text-slate-400 text-center leading-[44px] text-sm">
              Complete previous lesson to unlock
            </span>
          ) : isDone && hasPractice(meta.id) ? (
            <div className="flex gap-2">
              <Link
                to={`/lesson/${meta.id}/practice`}
                className="flex-1 sm:flex-none min-h-[44px] rounded-xl bg-indigo-600 px-5 text-white text-center leading-[44px] font-medium hover:bg-indigo-700"
              >
                Practice
              </Link>
              <Link
                to={`/lesson/${meta.id}`}
                className="flex-1 sm:flex-none min-h-[44px] rounded-xl border border-slate-300 px-5 text-slate-700 text-center leading-[44px] font-medium hover:bg-slate-50"
              >
                Review
              </Link>
            </div>
          ) : (
            <Link
              to={`/lesson/${meta.id}`}
              className="block w-full sm:w-auto min-h-[44px] rounded-xl bg-indigo-600 px-6 text-white text-center leading-[44px] font-medium hover:bg-indigo-700"
            >
              {isDone ? "Review" : status === "in_progress" ? "Continue" : "Start"}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
