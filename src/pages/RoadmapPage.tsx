import { Link } from "react-router-dom";
import {
  course,
  getContinueLessonId,
  getCompletionPercent,
  getPublishedLessons,
  getLevels,
  getLevelStatus,
  getLevelCompletion,
  canReview,
} from "../lib/contentLoader";
import { getReviewTargets } from "../lib/reviewPlanner";
import { isLessonComplete } from "../lib/progressService";
import { useProgress } from "../contexts/ProgressContext";
import { AppHeader } from "../components/layout/AppHeader";
import { SafeArea } from "../components/layout/SafeArea";
import { LevelSection } from "../components/roadmap/LevelSection";
import { DevTools } from "../components/dev/DevTools";
import { Icon } from "../components/common/Icon";
import { MILESTONE_DEFS, MILESTONE_ORDER } from "../types/content";

export function RoadmapPage() {
  const { progress, loading, profile } = useProgress();
  const levels = getLevels();
  const continueId = getContinueLessonId(progress);
  const percent = getCompletionPercent(progress);

  // Lessons finished out of the total, shown alongside the percentage so the
  // hero card carries a course-relevant stat (XP already lives in the header).
  const publishedLessons = getPublishedLessons();
  const lessonsDone = publishedLessons.filter((l) =>
    isLessonComplete(progress[l.id]?.status),
  ).length;

  // Earned achievements, in canonical order, for the compact summary card. We
  // show a few medals plus the earned/total count rather than every badge.
  const earnedMilestones = MILESTONE_ORDER.filter((id) =>
    profile?.milestones.includes(id),
  );
  const shownMilestones = earnedMilestones.slice(0, 4);

  // The concepts this review will home in on, for the card's subtitle. Empty
  // until the learner has worked through some material (then we fall back to
  // generic copy).
  const reviewTargets = getReviewTargets(progress, 2);
  const reviewSubtitle =
    reviewTargets.length > 0
      ? `Focus on ${reviewTargets.join(" & ")}`
      : "Sharpens the topics you're shakiest on";

  return (
    <SafeArea>
      <AppHeader />
      <main className="flex-1 px-4 py-6 max-w-[100rem] mx-auto w-full pb-8">
        <DevTools />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
          <p className="text-sm text-slate-500 mt-1">{course.description}</p>
        </div>

        {/* Two-column dashboard on large screens: the overview cards collapse
            into a sticky sidebar so the wide roadmap fills the horizontal
            space instead of leaving large empty margins. */}
        <div className="lg:grid lg:grid-cols-[20rem_1fr] lg:gap-8">
          <div>
            <div className="space-y-6 lg:sticky lg:top-24">
              <div className="rounded-2xl bg-indigo-600 text-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-indigo-200 text-sm">Course progress</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                    {lessonsDone} / {publishedLessons.length} lessons
                  </span>
                </div>
                <p className="text-3xl font-bold mt-1">{percent}%</p>
                <div className="mt-3 h-2 rounded-full bg-indigo-400/50 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {continueId && (
                  <Link
                    to={`/lesson/${continueId}`}
                    className="mt-4 block w-full min-h-[44px] rounded-xl bg-white text-indigo-700 font-semibold text-center leading-[44px]"
                  >
                    Continue learning →
                  </Link>
                )}
              </div>

              {!loading && canReview(progress) && (
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
                  <Link
                    to="/review"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white p-4 hover:border-indigo-400 hover:bg-indigo-50/50 active:scale-[0.99] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100"
                        aria-hidden
                      >
                        <Icon name="target" className="h-5 w-5 text-indigo-600" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">Targeted review</p>
                        <p className="text-sm text-slate-500">{reviewSubtitle}</p>
                      </div>
                    </div>
                    <span className="text-indigo-600 font-semibold" aria-hidden>
                      →
                    </span>
                  </Link>

                  <Link
                    to="/practice/custom"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-white p-4 hover:border-indigo-400 hover:bg-indigo-50/50 active:scale-[0.99] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100"
                        aria-hidden
                      >
                        <Icon name="sliders" className="h-5 w-5 text-indigo-600" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">Custom practice</p>
                        <p className="text-sm text-slate-500">
                          Choose your topics and how many questions
                        </p>
                      </div>
                    </div>
                    <span className="text-indigo-600 font-semibold" aria-hidden>
                      →
                    </span>
                  </Link>
                </div>
              )}

              {earnedMilestones.length > 0 && (
                <Link
                  to="/profile#achievements"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 hover:border-indigo-300 hover:bg-indigo-50/40 active:scale-[0.99] transition"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex -space-x-2" aria-hidden>
                      {shownMilestones.map((id) => (
                        <span
                          key={id}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 ring-2 ring-white"
                        >
                          <Icon
                            name={MILESTONE_DEFS[id]?.icon ?? "trophy"}
                            className="h-5 w-5 text-emerald-700"
                          />
                        </span>
                      ))}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">Achievements</p>
                      <p className="text-sm text-slate-500">
                        {earnedMilestones.length} of {MILESTONE_ORDER.length} earned
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold text-indigo-600" aria-hidden>
                    →
                  </span>
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 min-w-0 lg:mt-0">
            {loading ? (
              <p className="text-slate-500">Loading progress…</p>
            ) : (
              <div className="space-y-8">
                {levels.map((level, i) => (
                  <LevelSection
                    key={level.id}
                    level={level}
                    status={getLevelStatus(level, progress)}
                    completion={getLevelCompletion(level, progress)}
                    progress={progress}
                    isLast={i === levels.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </SafeArea>
  );
}
