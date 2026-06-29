import type { Course, Lesson, LessonMeta, Step } from "../types/content";
import {
  PRACTICE_BANK_MIN,
  PRACTICE_SESSION_SIZE,
  REVIEW_SESSION_SIZE,
  TEST_OUT_MIN_QUESTIONS,
  TEST_OUT_PER_CONCEPT,
  TEST_OUT_PER_LESSON,
} from "./constants";
import { assertValidLesson } from "./validateLesson";

import courseData from "../../content/course.json";
import lesson1 from "../../content/what-is-a-derivative.json";
import lesson2 from "../../content/slope-of-a-curve.json";
import lesson4 from "../../content/power-rule.json";
import lessonDifferentiatingPolynomials from "../../content/differentiating-polynomials.json";
import lesson5 from "../../content/graph-shape.json";
import lesson6 from "../../content/maxima-and-minima.json";
import lesson7 from "../../content/what-is-an-integral.json";
import lesson8 from "../../content/area-under-a-curve.json";
import lesson9 from "../../content/fundamental-theorem.json";
import lessonIntegratingPolynomials from "../../content/integrating-polynomials.json";

const rawLessons: Lesson[] = [
  lesson1 as Lesson,
  lesson2 as Lesson,
  lesson4 as Lesson,
  lessonDifferentiatingPolynomials as Lesson,
  lesson5 as Lesson,
  lesson6 as Lesson,
  lesson7 as Lesson,
  lesson8 as Lesson,
  lesson9 as Lesson,
  lessonIntegratingPolynomials as Lesson,
];

for (const lesson of rawLessons) {
  assertValidLesson(lesson);
}

const lessonsById = new Map(rawLessons.map((l) => [l.id, l]));

export const course = courseData as Course;

// The course manifest and lessons are frozen at import time, so anything derived
// purely from them is computed once and cached (callers treat the results as
// read-only). These helpers run on nearly every render and session build, so
// caching avoids repeatedly re-filtering/sorting/aggregating the same static data.
let publishedLessonsCache: LessonMeta[] | null = null;
const practiceBankCache = new Map<string, Step[]>();
let levelsCache: ResolvedLevel[] | null = null;

export function getPublishedLessons(): LessonMeta[] {
  if (!publishedLessonsCache) {
    publishedLessonsCache = course.lessons
      .filter((l) => l.published)
      .sort((a, b) => a.order - b.order);
  }
  return publishedLessonsCache;
}

export function getLesson(id: string): Lesson | undefined {
  return lessonsById.get(id);
}

export function getLessonStepCount(lessonId: string): number {
  return lessonsById.get(lessonId)?.steps.length ?? 0;
}

/** Whether a question is hands-on, i.e. backed by a manipulable graph. */
function isInteractive(step: Step): boolean {
  return Boolean(step.interaction?.graph);
}

/** The lesson's own answerable questions (every step except "read"). */
function lessonQuestions(lesson: Lesson | undefined): Step[] {
  return (lesson?.steps ?? []).filter(
    (s) => s.type !== "read" && Boolean(s.interaction?.answer),
  );
}

/**
 * The pool of practice questions for a lesson. Uses the authored `practiceBank`
 * only — the lesson's own questions are deliberately left out so practice
 * doesn't just rerun problems the learner already worked through in the lesson.
 * If the authored bank is too small to fill a session, we backfill with the
 * lesson's own interactive questions just enough to reach the minimum.
 * Deduplicated by id.
 */
export function getPracticeBank(lessonId: string): Step[] {
  const cached = practiceBankCache.get(lessonId);
  if (cached) return cached;

  const lesson = lessonsById.get(lessonId);
  const authored = lesson?.practiceBank ?? [];
  const seen = new Set<string>();
  const pool: Step[] = [];
  const add = (q: Step) => {
    if (seen.has(q.id)) return;
    seen.add(q.id);
    pool.push(q);
  };

  authored.forEach(add);

  // Only fall back to lesson questions (which the learner has already seen) when
  // there aren't enough authored practice questions to fill a session, and even
  // then add just enough to reach the minimum rather than the whole lesson.
  if (pool.length < PRACTICE_BANK_MIN) {
    for (const q of lessonQuestions(lesson)) {
      if (pool.length >= PRACTICE_BANK_MIN) break;
      add(q);
    }
  }

  practiceBankCache.set(lessonId, pool);
  return pool;
}

/** Whether a lesson has any practice questions available. */
export function hasPractice(lessonId: string): boolean {
  return getPracticeBank(lessonId).length > 0;
}

/** Fisher–Yates shuffle returning a new array (source is left untouched). */
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Pick `size` questions for one session, preferring interactive (graph-based)
 * questions so the session stays hands-on, then filling with plain questions
 * for variety. The final order is shuffled so it isn't always graphs-first.
 */
function sampleSession(pool: Step[], size: number): Step[] {
  const interactive = shuffle(pool.filter(isInteractive));
  const plain = shuffle(pool.filter((s) => !isInteractive(s)));
  return shuffle([...interactive, ...plain].slice(0, size));
}

/**
 * A randomly chosen subset of a lesson's practice bank — one practice session.
 * Different each call, so repeated practice stays varied, and interactive
 * questions are favored so practice feels hands-on.
 */
export function getPracticeSession(
  lessonId: string,
  size: number = PRACTICE_SESSION_SIZE,
): Step[] {
  return sampleSession(getPracticeBank(lessonId), size);
}

/** Published lessons the learner has started or finished — eligible for review. */
function reviewableLessons(
  progress: Record<string, { status: string }>,
): LessonMeta[] {
  return getPublishedLessons().filter((l) => {
    const s = progress[l.id]?.status;
    return s === "in_progress" || s === "complete" || s === "mastered";
  });
}

/** Combined pool of practice questions across every lesson eligible for review. */
export function getReviewBank(
  progress: Record<string, { status: string }>,
): Step[] {
  return reviewableLessons(progress).flatMap((l) => getPracticeBank(l.id));
}

/** Whether the learner has covered enough material to run a mixed review. */
export function canReview(
  progress: Record<string, { status: string }>,
): boolean {
  return getReviewBank(progress).length > 0;
}

/**
 * The concepts a learner can practice right now — every distinct `conceptTag`
 * found in the practice banks of lessons they've started or finished, paired
 * with how many questions back it. Ordered by first appearance so the picker is
 * stable. Concepts from not-yet-started lessons are excluded, matching mixed
 * review's eligibility.
 */
export function getCustomPracticeTopics(
  progress: Record<string, { status: string }>,
): { concept: string; count: number }[] {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const l of reviewableLessons(progress)) {
    for (const s of getPracticeBank(l.id)) {
      if (!s.conceptTag) continue;
      if (!counts.has(s.conceptTag)) order.push(s.conceptTag);
      counts.set(s.conceptTag, (counts.get(s.conceptTag) ?? 0) + 1);
    }
  }
  return order.map((concept) => ({ concept, count: counts.get(concept)! }));
}

/**
 * A learner-configured practice set: up to `size` questions drawn from the
 * practice banks of started lessons, restricted to the chosen concepts. Returns
 * an empty set when nothing is selected. Sampling favors interactive questions,
 * just like the other session builders.
 */
export function getCustomPracticeSession(
  progress: Record<string, { status: string }>,
  concepts: string[],
  size: number,
): Step[] {
  const selected = new Set(concepts);
  if (selected.size === 0) return [];
  const bank = reviewableLessons(progress)
    .flatMap((l) => getPracticeBank(l.id))
    .filter((s) => s.conceptTag !== undefined && selected.has(s.conceptTag));
  return sampleSession(bank, size);
}

/**
 * Fraction of a lesson the learner has worked through, 0–100.
 * Completed lessons return 100; otherwise it's the share of steps cleared
 * (currentStepIndex points at the next unfinished step).
 */
export function getLessonProgressPercent(
  lessonId: string,
  progress: Record<string, { status: string; currentStepIndex?: number }>,
): number {
  const total = getLessonStepCount(lessonId);
  if (total === 0) return 0;
  const p = progress[lessonId];
  if (!p) return 0;
  if (p.status === "complete" || p.status === "mastered") return 100;
  const done = Math.min(p.currentStepIndex ?? 0, total);
  return Math.round((done / total) * 100);
}

export function getNextLessonId(currentId: string): string | null {
  const published = getPublishedLessons();
  const idx = published.findIndex((l) => l.id === currentId);
  if (idx === -1 || idx >= published.length - 1) return null;
  return published[idx + 1].id;
}

export function isLessonUnlocked(
  lessonId: string,
  progress: Record<string, { status: string }>,
): boolean {
  const published = getPublishedLessons();
  const idx = published.findIndex((l) => l.id === lessonId);
  if (idx <= 0) return true;
  const prev = published[idx - 1];
  const prevProgress = progress[prev.id];
  return (
    prevProgress?.status === "complete" ||
    prevProgress?.status === "mastered"
  );
}

/**
 * Whether the learner may open a lesson directly (e.g. by its URL). True when
 * the lesson is unlocked by sequential progression, or when it's already been
 * started or finished — so resuming or reviewing keeps working even if the
 * strict unlock chain wouldn't hold (e.g. after content reordering). Route and
 * page guards must use this: the roadmap only hides locked lessons in the UI,
 * but direct navigation has to enforce the same rule.
 */
export function canAccessLesson(
  lessonId: string,
  progress: Record<string, { status: string }>,
): boolean {
  if (isLessonUnlocked(lessonId, progress)) return true;
  const status = progress[lessonId]?.status;
  return (
    status === "in_progress" || status === "complete" || status === "mastered"
  );
}

export function getContinueLessonId(
  progress: Record<string, { status: string; currentStepIndex?: number }>,
): string | null {
  const published = getPublishedLessons();
  for (const meta of published) {
    const p = progress[meta.id];
    if (p?.status === "in_progress") return meta.id;
  }
  for (const meta of published) {
    if (isLessonUnlocked(meta.id, progress)) {
      const p = progress[meta.id];
      if (!p || p.status === "not_started") return meta.id;
    }
  }
  return published[0]?.id ?? null;
}

export function getCompletionPercent(
  progress: Record<string, { status: string }>,
): number {
  const published = getPublishedLessons();
  if (published.length === 0) return 0;
  const done = published.filter((l) => {
    const s = progress[l.id]?.status;
    return s === "complete" || s === "mastered";
  }).length;
  return Math.round((done / published.length) * 100);
}

export type LevelStatus = "locked" | "not_started" | "in_progress" | "complete";

export interface ResolvedLevel {
  id: string;
  title: string;
  description: string;
  /** 1-based position of the level within the course. */
  order: number;
  lessons: LessonMeta[];
}

/**
 * Published lessons grouped into ordered levels. Falls back to a single level
 * holding every published lesson when the course defines none.
 */
export function getLevels(): ResolvedLevel[] {
  if (levelsCache) return levelsCache;

  const published = getPublishedLessons();
  const byId = new Map(published.map((l) => [l.id, l]));
  const defined = course.levels ?? [];

  levelsCache =
    defined.length === 0
      ? [
          {
            id: "all",
            title: course.title,
            description: course.description,
            order: 1,
            lessons: published,
          },
        ]
      : defined
          .map((level, i) => ({
            id: level.id,
            title: level.title,
            description: level.description,
            order: i + 1,
            lessons: level.lessonIds
              .map((id) => byId.get(id))
              .filter((m): m is LessonMeta => Boolean(m)),
          }))
          .filter((level) => level.lessons.length > 0);
  return levelsCache;
}

/** Resolve a single level by its id, including its order and lessons. */
export function getLevel(levelId: string): ResolvedLevel | undefined {
  return getLevels().find((l) => l.id === levelId);
}

/**
 * Aggregates the practice questions from every lesson in a level into one set,
 * so a level review can quiz concepts spanning all of its lessons at once.
 */
function getLevelReviewSteps(levelId: string): Step[] {
  const level = getLevel(levelId);
  if (!level) return [];
  return level.lessons.flatMap((meta) => getPracticeBank(meta.id));
}

/** Whether a level has any review questions authored across its lessons. */
export function hasLevelReview(levelId: string): boolean {
  return getLevelReviewSteps(levelId).length > 0;
}

/** A random cross-lesson set of questions for a single level-review session. */
export function getLevelReviewSession(
  levelId: string,
  size: number = REVIEW_SESSION_SIZE,
): Step[] {
  return shuffle(getLevelReviewSteps(levelId)).slice(0, size);
}

/**
 * Build a coverage-oriented "test-out" set from a pool of practice questions.
 * Unlike a practice/review draw (which favors variety from a small random
 * sample), a test-out must *certify* the material, so it first guarantees every
 * concept in the pool is represented — round-robin, up to `perConcept` questions
 * each, interactive-first — then fills any remaining room toward `max` with the
 * leftovers. The final order is shuffled. Untagged questions are used only as
 * filler, never to satisfy coverage.
 */
function buildTestOutSession(
  pool: Step[],
  perConcept: number,
  max: number,
): Step[] {
  const byConcept = new Map<string, Step[]>();
  const untagged: Step[] = [];
  for (const s of pool) {
    if (s.conceptTag) {
      const list = byConcept.get(s.conceptTag);
      if (list) list.push(s);
      else byConcept.set(s.conceptTag, [s]);
    } else {
      untagged.push(s);
    }
  }

  // One queue per concept, interactive-first then shuffled within each tier so
  // the draw stays hands-on but varies between attempts.
  const queues = [...byConcept.values()].map((qs) => {
    const interactive = shuffle(qs.filter(isInteractive));
    const plain = shuffle(qs.filter((s) => !isInteractive(s)));
    return [...interactive, ...plain];
  });

  const picked: Step[] = [];
  const seen = new Set<string>();
  const take = (s: Step | undefined) => {
    if (!s || seen.has(s.id) || picked.length >= max) return;
    seen.add(s.id);
    picked.push(s);
  };

  // Coverage pass: one question per concept per round, up to `perConcept`
  // rounds, so every concept is represented before any is doubled up.
  for (let round = 0; round < perConcept && picked.length < max; round++) {
    for (const queue of queues) {
      if (picked.length >= max) break;
      take(queue.shift());
    }
  }

  // Fill remaining room with leftovers (interactive-first), including untagged
  // questions, so a lesson with few concepts still yields a full-length set.
  if (picked.length < max) {
    const leftovers = [...queues.flat(), ...untagged];
    const fill = [
      ...shuffle(leftovers.filter(isInteractive)),
      ...shuffle(leftovers.filter((s) => !isInteractive(s))),
    ];
    for (const s of fill) take(s);
  }

  return shuffle(picked);
}

/**
 * Every published lesson from the start of the course through the given level,
 * inclusive — the full span a "skip ahead" reaches across. Empty for an unknown
 * level.
 */
function lessonsUpToLevel(levelId: string): LessonMeta[] {
  const levels = getLevels();
  const idx = levels.findIndex((l) => l.id === levelId);
  if (idx === -1) return [];
  return levels.slice(0, idx + 1).flatMap((l) => l.lessons);
}

/**
 * The lessons a skip-ahead at this level actually bypasses: every lesson up to
 * and including it that the learner hasn't already finished, in course order. A
 * skip is a claim to know the material you *haven't done yet*, so already-
 * completed lessons drop out of both the questions drawn and the lessons marked
 * complete (they're already complete). The earlier "complete everything up to
 * here" guarantee still holds — finishing these leaves the whole span done.
 */
export function getLevelTestOutLessonIds(
  levelId: string,
  progress: Record<string, { status: string }>,
): string[] {
  return lessonsUpToLevel(levelId)
    .filter((meta) => {
      const status = progress[meta.id]?.status;
      return status !== "complete" && status !== "mastered";
    })
    .map((meta) => meta.id);
}

/**
 * A quota-per-lesson coverage set drawn from an explicit list of lessons: each
 * lesson contributes up to {@link TEST_OUT_PER_LESSON} questions, chosen
 * concept-first from its own bank, then the per-lesson draws are pooled and
 * shuffled. The basis for a skip-ahead test-out — building from a fixed list
 * keeps the questions in lock-step with the lessons that will be marked
 * complete.
 */
export function getTestOutSessionForLessons(lessonIds: string[]): Step[] {
  const picked = lessonIds.flatMap((id) =>
    buildTestOutSession(
      getPracticeBank(id),
      TEST_OUT_PER_CONCEPT,
      TEST_OUT_PER_LESSON,
    ),
  );
  return shuffle(picked);
}

/**
 * Whether a skip-ahead at this level is worth offering — i.e. there are enough
 * questions across the lessons it would actually skip (the unfinished ones up
 * to and including it) to certify them.
 */
export function canTestOutLevel(
  levelId: string,
  progress: Record<string, { status: string }>,
): boolean {
  const total = getLevelTestOutLessonIds(levelId, progress).reduce(
    (n, id) => n + getPracticeBank(id).length,
    0,
  );
  return total >= TEST_OUT_MIN_QUESTIONS;
}

/** Completed-lesson tally and percentage for a level. */
export function getLevelCompletion(
  level: ResolvedLevel,
  progress: Record<string, { status: string }>,
): { done: number; total: number; percent: number } {
  const total = level.lessons.length;
  const done = level.lessons.filter((l) => {
    const s = progress[l.id]?.status;
    return s === "complete" || s === "mastered";
  }).length;
  return {
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

/**
 * A level is locked until its first lesson unlocks (i.e. the prior level is
 * finished), in progress once any lesson is touched, and complete when every
 * lesson is done.
 */
export function getLevelStatus(
  level: ResolvedLevel,
  progress: Record<string, { status: string }>,
): LevelStatus {
  const first = level.lessons[0];
  if (!first || !isLessonUnlocked(first.id, progress)) return "locked";

  const statuses = level.lessons.map(
    (l) => progress[l.id]?.status ?? "not_started",
  );
  const isDone = (s: string) => s === "complete" || s === "mastered";
  if (statuses.every(isDone)) return "complete";
  if (statuses.some((s) => s === "in_progress" || isDone(s)))
    return "in_progress";
  return "not_started";
}
