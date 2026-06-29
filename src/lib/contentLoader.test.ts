import {
  getPublishedLessons,
  getLesson,
  getNextLessonId,
  isLessonUnlocked,
  canAccessLesson,
  getLessonProgressPercent,
  getCompletionPercent,
  getLevels,
  getLevelStatus,
  getPracticeBank,
  getPracticeSession,
  canReview,
  getReviewBank,
  getCustomPracticeTopics,
  getCustomPracticeSession,
  shuffle,
  getLessonStepCount,
  getTestOutSessionForLessons,
  getLevelTestOutLessonIds,
  canTestOutLevel,
} from "./contentLoader";
import {
  PRACTICE_SESSION_SIZE,
  TEST_OUT_PER_LESSON,
} from "./constants";

const published = getPublishedLessons();

describe("getPublishedLessons", () => {
  it("returns published lessons sorted by order", () => {
    expect(published.length).toBeGreaterThan(1);
    expect(published.every((l) => l.published)).toBe(true);
    const orders = published.map((l) => l.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe("getLesson", () => {
  it("finds an existing lesson and returns undefined otherwise", () => {
    expect(getLesson(published[0].id)?.id).toBe(published[0].id);
    expect(getLesson("does-not-exist")).toBeUndefined();
  });
});

describe("isLessonUnlocked", () => {
  it("unlocks the first lesson with no progress", () => {
    expect(isLessonUnlocked(published[0].id, {})).toBe(true);
  });

  it("locks later lessons until the previous one is complete", () => {
    const second = published[1].id;
    expect(isLessonUnlocked(second, {})).toBe(false);
    expect(
      isLessonUnlocked(second, { [published[0].id]: { status: "complete" } }),
    ).toBe(true);
  });
});

describe("canAccessLesson", () => {
  const first = published[0].id;
  const second = published[1].id;

  it("allows the first lesson and blocks a locked later lesson", () => {
    expect(canAccessLesson(first, {})).toBe(true);
    expect(canAccessLesson(second, {})).toBe(false);
  });

  it("allows a later lesson once the previous one is complete", () => {
    expect(canAccessLesson(second, { [first]: { status: "complete" } })).toBe(
      true,
    );
  });

  it("allows a started or finished lesson even if it would otherwise be locked", () => {
    expect(canAccessLesson(second, { [second]: { status: "in_progress" } })).toBe(
      true,
    );
    expect(canAccessLesson(second, { [second]: { status: "complete" } })).toBe(
      true,
    );
  });
});

describe("getNextLessonId", () => {
  it("returns the next lesson, or null at the end", () => {
    expect(getNextLessonId(published[0].id)).toBe(published[1].id);
    expect(getNextLessonId(published[published.length - 1].id)).toBeNull();
    expect(getNextLessonId("does-not-exist")).toBeNull();
  });
});

describe("getLessonProgressPercent", () => {
  const id = published[0].id;

  it("is 100 for a completed lesson", () => {
    expect(
      getLessonProgressPercent(id, {
        [id]: { status: "complete", currentStepIndex: 0 },
      }),
    ).toBe(100);
  });

  it("is the fraction of steps cleared while in progress", () => {
    const total = getLessonStepCount(id);
    const res = getLessonProgressPercent(id, {
      [id]: { status: "in_progress", currentStepIndex: 1 },
    });
    expect(res).toBe(Math.round((1 / total) * 100));
  });

  it("is 0 with no progress", () => {
    expect(getLessonProgressPercent(id, {})).toBe(0);
  });
});

describe("getCompletionPercent", () => {
  it("is 0 with no progress and 100 when all are complete", () => {
    expect(getCompletionPercent({})).toBe(0);
    const all = Object.fromEntries(
      published.map((l) => [l.id, { status: "complete" }]),
    );
    expect(getCompletionPercent(all)).toBe(100);
  });
});

describe("getLevels", () => {
  const levels = getLevels();

  it("returns ordered, non-empty levels", () => {
    expect(levels.length).toBeGreaterThanOrEqual(1);
    expect(levels.map((l) => l.order)).toEqual(levels.map((_, i) => i + 1));
    expect(levels.every((l) => l.lessons.length > 0)).toBe(true);
  });
});

describe("getLevelStatus", () => {
  const levels = getLevels();

  it("marks the first level not_started and a gated later level locked", () => {
    expect(getLevelStatus(levels[0], {})).toBe("not_started");
    expect(getLevelStatus(levels[1], {})).toBe("locked");
  });

  it("marks a level complete once all its lessons are done", () => {
    const done = Object.fromEntries(
      levels[0].lessons.map((l) => [l.id, { status: "complete" }]),
    );
    expect(getLevelStatus(levels[0], done)).toBe("complete");
  });
});

describe("practice sessions", () => {
  const id = published[0].id;

  it("samples a session drawn entirely from the lesson's practice bank", () => {
    const bank = getPracticeBank(id);
    expect(bank.length).toBeGreaterThanOrEqual(PRACTICE_SESSION_SIZE);

    const session = getPracticeSession(id);
    expect(session.length).toBe(Math.min(PRACTICE_SESSION_SIZE, bank.length));

    const bankIds = new Set(bank.map((s) => s.id));
    expect(session.every((s) => bankIds.has(s.id))).toBe(true);
  });

  it("excludes questions the learner already saw in the lesson", () => {
    // Every published lesson has enough authored practice questions, so none of
    // the lesson's own (already-seen) step questions should leak into practice.
    for (const meta of published) {
      const lesson = getLesson(meta.id)!;
      const lessonStepIds = new Set(
        lesson.steps
          .filter((s) => s.type !== "read" && Boolean(s.interaction?.answer))
          .map((s) => s.id),
      );
      const bank = getPracticeBank(meta.id);
      expect(bank.length).toBeGreaterThanOrEqual(PRACTICE_SESSION_SIZE);
      expect(bank.some((s) => lessonStepIds.has(s.id))).toBe(false);
    }
  });
});

describe("canReview", () => {
  it("is false with no progress and true once a lesson is started", () => {
    expect(canReview({})).toBe(false);
    expect(canReview({ [published[0].id]: { status: "in_progress" } })).toBe(true);
  });
});

describe("getCustomPracticeTopics", () => {
  const first = published[0].id;
  const startedFirst = { [first]: { status: "in_progress" } };

  it("is empty with no progress", () => {
    expect(getCustomPracticeTopics({})).toEqual([]);
  });

  it("lists concepts and counts drawn from started lessons only", () => {
    const topics = getCustomPracticeTopics(startedFirst);
    expect(topics.length).toBeGreaterThan(0);
    expect(topics.every((t) => t.count > 0)).toBe(true);

    // Should match the concept grouping of the started lesson's practice bank.
    const expected = new Map<string, number>();
    for (const s of getPracticeBank(first)) {
      if (!s.conceptTag) continue;
      expected.set(s.conceptTag, (expected.get(s.conceptTag) ?? 0) + 1);
    }
    expect(new Map(topics.map((t) => [t.concept, t.count]))).toEqual(expected);
  });
});

describe("getCustomPracticeSession", () => {
  const first = published[0].id;
  const startedFirst = { [first]: { status: "in_progress" } };

  it("returns nothing when no concepts are selected", () => {
    expect(getCustomPracticeSession(startedFirst, [], 5)).toEqual([]);
  });

  it("draws only questions tagged with the selected concepts", () => {
    const topics = getCustomPracticeTopics(startedFirst);
    const { concept, count } = topics[0];
    // Request more than exist so the whole concept pool comes back.
    const session = getCustomPracticeSession(startedFirst, [concept], 100);
    expect(session.length).toBe(count);
    expect(session.every((s) => s.conceptTag === concept)).toBe(true);
  });

  it("never returns more than the requested size", () => {
    const topics = getCustomPracticeTopics(startedFirst);
    const concepts = topics.map((t) => t.concept);
    const total = topics.reduce((sum, t) => sum + t.count, 0);
    const size = Math.max(1, total - 1);
    const session = getCustomPracticeSession(startedFirst, concepts, size);
    expect(session.length).toBe(Math.min(size, total));
    expect(
      session.every(
        (s) => s.conceptTag !== undefined && concepts.includes(s.conceptTag),
      ),
    ).toBe(true);
  });

  it("ignores lessons the learner hasn't started", () => {
    const concept = getCustomPracticeTopics(startedFirst)[0].concept;
    expect(getCustomPracticeSession({}, [concept], 5)).toEqual([]);
  });
});

describe("getReviewBank", () => {
  it("is empty with no progress and otherwise draws from started lessons", () => {
    expect(getReviewBank({})).toEqual([]);

    const id = published[0].id;
    const bank = getReviewBank({ [id]: { status: "in_progress" } });
    expect(bank.length).toBeGreaterThan(0);

    const practiceIds = new Set(getPracticeBank(id).map((s) => s.id));
    expect(bank.every((s) => practiceIds.has(s.id))).toBe(true);
  });
});

describe("shuffle", () => {
  it("returns a permutation without mutating the source", () => {
    const source = [1, 2, 3, 4, 5];
    const snapshot = [...source];
    const out = shuffle(source);
    expect(out).toHaveLength(source.length);
    expect([...out].sort((a, b) => a - b)).toEqual(snapshot);
    expect(source).toEqual(snapshot);
  });
});

describe("level skip-ahead test-out (getTestOutSessionForLessons of getLevelTestOutLessonIds)", () => {
  const levels = getLevels();
  const noProgress: Record<string, { status: string }> = {};

  // The composition TestOutPage performs: draw a per-lesson quota across the
  // unfinished lessons a skip-ahead at this level would bypass.
  const levelTestOut = (
    levelId: string,
    progress: Record<string, { status: string }>,
  ) => getTestOutSessionForLessons(getLevelTestOutLessonIds(levelId, progress));

  // Lessons from the start of the course through a level, inclusive.
  const lessonsUpTo = (i: number) =>
    levels.slice(0, i + 1).flatMap((l) => l.lessons);

  // What one lesson contributes: its whole bank, capped at the per-lesson quota.
  const lessonQuota = (lessonId: string) =>
    Math.min(getPracticeBank(lessonId).length, TEST_OUT_PER_LESSON);

  it("draws a deduped set summing the per-lesson quota across the whole span", () => {
    const idx = levels.length - 1; // last level: the widest span
    const span = lessonsUpTo(idx);
    const uniqueIds = new Set(
      span.flatMap((l) => getPracticeBank(l.id)).map((s) => s.id),
    );
    const session = levelTestOut(levels[idx].id, noProgress);

    expect(new Set(session.map((s) => s.id)).size).toBe(session.length);
    expect(session.every((s) => uniqueIds.has(s.id))).toBe(true);
    expect(session.length).toBe(
      span.reduce((n, l) => n + lessonQuota(l.id), 0),
    );
  });

  it("pulls the quota from every lesson in the span, earlier levels included", () => {
    const idx = levels.length - 1;
    const span = lessonsUpTo(idx);
    const session = levelTestOut(levels[idx].id, noProgress);

    for (const lesson of span) {
      const bankIds = new Set(getPracticeBank(lesson.id).map((s) => s.id));
      const fromLesson = session.filter((s) => bankIds.has(s.id));
      expect(fromLesson.length).toBe(lessonQuota(lesson.id));
    }
  });

  it("only draws from lessons being skipped, never ones already finished", () => {
    const idx = levels.length - 1;
    const span = lessonsUpTo(idx);
    // Mark the first half of the span done (a mix of complete and mastered).
    const finished = span.slice(0, Math.ceil(span.length / 2));
    const progress: Record<string, { status: string }> = {};
    finished.forEach((l, i) => {
      progress[l.id] = { status: i % 2 === 0 ? "complete" : "mastered" };
    });
    const finishedIds = new Set(
      finished.flatMap((l) => getPracticeBank(l.id)).map((s) => s.id),
    );

    const session = levelTestOut(levels[idx].id, progress);
    expect(session.length).toBeGreaterThan(0);
    expect(session.some((s) => finishedIds.has(s.id))).toBe(false);
    // Exactly the quota from each still-unfinished lesson, and nothing more.
    const unfinished = span.filter((l) => !finished.includes(l));
    expect(session.length).toBe(
      unfinished.reduce((n, l) => n + lessonQuota(l.id), 0),
    );
  });

  it("grows the more lessons it bypasses", () => {
    const lengths = levels.map(
      (l) => levelTestOut(l.id, noProgress).length,
    );
    for (let i = 1; i < lengths.length; i++) {
      expect(lengths[i]).toBeGreaterThan(lengths[i - 1]);
    }
  });

  it("returns nothing for an unknown level", () => {
    expect(levelTestOut("does-not-exist", noProgress)).toEqual([]);
  });

  it("returns nothing once every lesson in the span is finished", () => {
    const idx = 1;
    const progress: Record<string, { status: string }> = {};
    lessonsUpTo(idx).forEach((l) => {
      progress[l.id] = { status: "complete" };
    });
    expect(levelTestOut(levels[idx].id, progress)).toEqual([]);
  });
});

describe("getLevelTestOutLessonIds", () => {
  const levels = getLevels();
  const noProgress: Record<string, { status: string }> = {};

  it("lists every unfinished lesson up to and including the level, in course order", () => {
    const idx = Math.min(2, levels.length - 1);
    const expected = levels
      .slice(0, idx + 1)
      .flatMap((l) => l.lessons.map((m) => m.id));
    expect(getLevelTestOutLessonIds(levels[idx].id, noProgress)).toEqual(
      expected,
    );
  });

  it("omits lessons the learner has already finished", () => {
    const idx = Math.min(2, levels.length - 1);
    const all = levels
      .slice(0, idx + 1)
      .flatMap((l) => l.lessons.map((m) => m.id));
    const progress: Record<string, { status: string }> = {
      [all[0]]: { status: "complete" },
      [all[1]]: { status: "mastered" },
    };
    expect(getLevelTestOutLessonIds(levels[idx].id, progress)).toEqual(
      all.slice(2),
    );
  });

  it("is empty for an unknown level", () => {
    expect(getLevelTestOutLessonIds("does-not-exist", noProgress)).toEqual([]);
  });
});

describe("test-out eligibility", () => {
  const noProgress: Record<string, { status: string }> = {};

  it("is available for a real level", () => {
    expect(canTestOutLevel(getLevels()[0].id, noProgress)).toBe(true);
  });

  it("is unavailable for an unknown level", () => {
    expect(canTestOutLevel("does-not-exist", noProgress)).toBe(false);
  });

  it("is unavailable once every lesson it would skip is finished", () => {
    const level = getLevels()[0];
    const progress: Record<string, { status: string }> = {};
    level.lessons.forEach((l) => {
      progress[l.id] = { status: "complete" };
    });
    expect(canTestOutLevel(level.id, progress)).toBe(false);
  });
});
