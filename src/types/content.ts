import type { IconName } from "../components/common/icons";

export type StepType =
  | "read"
  | "multiple_choice"
  | "multi_choice"
  | "numeric"
  | "slider_graph"
  | "power_term"
  | "drag_drop"
  | "match"
  | "sign_chart"
  | "order_list"
  | "riemann";

type LessonStatus =
  | "not_started"
  | "in_progress"
  | "complete";

interface TextBlock {
  type: "text";
  body: string;
}

interface MathBlock {
  type: "math";
  latex: string;
  display?: boolean;
}

export type ContentBlock = TextBlock | MathBlock;

export interface GraphConfig {
  fn: string;
  domain: [number, number];
  /** Explicit y-axis range. When omitted, the range is derived from the data. */
  yDomain?: [number, number];
  /**
   * Overlay the derivative f'(x) as a second curve on the same axes, so the
   * learner can see how the sign and height of f' line up with where f rises,
   * falls, and turns. Drawn in a distinct color with a small legend. The
   * derivative is computed numerically, so this works for any `fn`. Pair with an
   * explicit `yDomain` when f' grows much faster than f (e.g. a cubic), so f
   * stays readable while the steep parts of f' are clipped to the plot box.
   */
  showDerivative?: boolean;
  fixedPoint?: number;
  sliderLabel?: string;
  showSecant?: boolean;
  showTangent?: boolean;
  /**
   * Draw the tangent at the FIXED point (`fixedPoint`) as a static reference
   * line while the secant slides. Pair with `showSecant` and an `h` slider so
   * the learner can watch the secant converge onto the tangent as h → 0.
   */
  tangentAtFixedPoint?: boolean;
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  initialSlider?: number;
  xLabel?: string;
  yLabel?: string;
  /** Override the slope readout label (e.g. "Rate of change"). */
  slopeLabel?: string;
  /**
   * Show the live slope/secant readout. Defaults to on whenever a tangent or
   * secant is drawn. Set false to keep the line visible but hide the number, so
   * a "find the x where the slope is …" question can't be solved by matching.
   */
  showSlopeValue?: boolean;
  /** Show a live "f(x) = value" readout for the current slider position. Defaults to on. */
  showValue?: boolean;
  /**
   * Render the graph as a static, non-interactive illustration: no slider and
   * no live readouts, just the curve (plus any marker/area below). Used to give
   * a relevant visual to questions whose answer is typed, picked, or built
   * rather than read off the graph.
   */
  static?: boolean;
  /**
   * For static illustrations, mark this x on the curve with a dot and a dashed
   * guide down to the x-axis. When `showTangent` is also set, the tangent line
   * is drawn there too. Anchors a question like "the slope at x = 3" without
   * revealing the numeric answer.
   */
  markerX?: number;
  /**
   * For tap-the-point questions, snap the tapped x to the nearest multiple of
   * this value (e.g. 0.5) so the learner can't pick arbitrarily precise points.
   */
  pointSnap?: number;
  /**
   * For tap-the-point questions, render these x-values as discrete, visible dots
   * on the curve. A tap snaps to the nearest dot, so the submitted x is always
   * exactly one of these values (no fuzzy decimals like 2.02). Takes precedence
   * over `pointSnap` when both are set.
   */
  pointChoices?: number[];
  /**
   * Shade the area between the curve and the x-axis, from `areaStart` to the
   * slider's current x. This is the visual for an integral (accumulated area).
   */
  showArea?: boolean;
  /** Left edge of the shaded area. Defaults to the domain minimum. */
  areaStart?: number;
  /** Show a live "area ≈ value" readout. Defaults to on when `showArea` is set. */
  showAreaValue?: boolean;
  /** Override the area readout label (e.g. "Shaded area"). */
  areaLabel?: string;
  /**
   * Render the area readout as a live definite integral instead of the plain
   * "Shaded area ≈ value" text. It typesets ∫ from `areaStart` to the slider's
   * current value of `integrand` dx, so the learner watches the integral
   * notation (with a moving upper limit) update as they drag. The running area
   * is appended as "= value" only when `showAreaValue` isn't false; on "find t"
   * questions, set `showAreaValue: false` to show the live integral while
   * withholding its value, so the readout never gives away the answer. Requires
   * `integrand`; falls back to the plain readout without it.
   */
  areaReadoutMath?: boolean;
  /**
   * LaTeX of the integrand for the `areaReadoutMath` readout, e.g. "x" or
   * "x - 2". The variable of integration is x and the upper limit is the
   * slider's current value.
   */
  integrand?: string;
}

interface MultipleChoiceAnswer {
  type: "multiple_choice";
  options: string[];
  correctIndex: number;
}

/**
 * One row inside a {@link MultiChoiceAnswer}: a short prompt (e.g. an x-value)
 * plus the index of its correct option. Options come from this row's own
 * `options`, falling back to the answer's shared `options` when omitted.
 */
export interface MultiChoicePart {
  /** Short label for this row, e.g. "x = 0". Rendered with inline math ($…$). */
  prompt: string;
  /** Index (into the row's effective options) of the correct choice. */
  correctIndex: number;
  /** Options for this row; defaults to the answer's shared `options`. */
  options?: string[];
}

/**
 * A stack of independent multiple-choice rows graded as a single question: each
 * row (e.g. one x-value) is answered on its own, and the step is correct only
 * when every row is correct. Set the shared `options` for the common case where
 * every row picks from the same labels (e.g. "Maximum" / "Minimum" / "Neither");
 * a row may override them with its own `options`. The submitted answer is an
 * array of chosen option indices, one per row (null where a row is unanswered).
 */
export interface MultiChoiceAnswer {
  type: "multi_choice";
  /** Default options shared by every row that doesn't define its own. */
  options?: string[];
  /** The independent rows, in display order. */
  parts: MultiChoicePart[];
}

interface NumericAnswer {
  type: "numeric";
  value: number;
  tolerance?: number;
}

/**
 * Drag-the-slider question: the learner moves the graph slider until a
 * condition is met. The submitted answer is the slider's value.
 */
interface SliderAnswer {
  type: "slider";
  value: number;
  tolerance?: number;
}

/**
 * Tap-the-point question: the learner clicks a location on the curve. The
 * submitted answer is the x-coordinate of the tap.
 */
interface GraphPointAnswer {
  type: "graph_point";
  x: number;
  /**
   * Extra x-values that also count as correct, each judged with the same
   * `tolerance` as `x`. Use when several points satisfy the prompt — e.g. for
   * f′(x) = 3x² = 12 both x = 2 and x = -2 have a tangent slope of 12.
   */
  acceptX?: number[];
  tolerance?: number;
}

/**
 * "Derivative builder" question: the learner assembles a single power term
 * a·xⁿ with a coefficient stepper and an exponent stepper, applying the power
 * rule by hand instead of typing or picking the answer. The submitted answer is
 * the `{ coefficient, exponent }` pair. A coefficient of 0 collapses the whole
 * term to 0 (e.g. the derivative of a constant), so the exponent is ignored when
 * grading that case.
 */
interface PowerTermAnswer {
  type: "power_term";
  coefficient: number;
  exponent: number;
  /** Coefficient shown in the builder before editing — usually the original term's. */
  startCoefficient?: number;
  /** Exponent shown in the builder before editing — usually the original power. */
  startExponent?: number;
  /**
   * LaTeX prefix for the live preview of the term being built. Defaults to
   * "f'(x) =" for a derivative builder; set to "F(x) =" when the learner is
   * building an antiderivative via the reverse power rule.
   */
  previewPrefix?: string;
}

/** One blank in a {@link DragDropAnswer}, filled by dragging a tile from the bank. */
interface DragDropBlank {
  /**
   * LaTeX of the tile that correctly fills this blank. Must appear verbatim in
   * the answer's `bank`.
   */
  accept: string;
  /**
   * Operator rendered just before this blank, e.g. "+" or "-". Ignored on the
   * first blank. Defaults to "+", so a sum of positive terms needs no connectors.
   */
  connector?: string;
}

/**
 * Drag-and-drop "assemble the answer" question: the learner drags term tiles
 * from a shared bank into ordered blanks to build an expression — e.g. the
 * derivative of a polynomial, one term per blank. Tiles are LaTeX strings, and
 * the bank holds every correct tile plus distractors (shuffled when rendered).
 * The submitted answer is the array of placed tile values, one entry per blank
 * (null where a blank is still empty).
 *
 * Grading compares the multiset of *signed* terms, not their positions, so a sum
 * can be built in any order (addition is commutative). Each blank's sign is the
 * operator fixed in front of it, so a term in a "-" slot is treated as negative
 * — keeping subtraction order-sensitive while pure sums are order-free.
 */
export interface DragDropAnswer {
  type: "drag_drop";
  /** LaTeX shown to the left of the blanks, e.g. "f'(x) =". Optional. */
  prefix?: string;
  /** The ordered blanks the learner fills, left to right. */
  blanks: DragDropBlank[];
  /**
   * Full pool of draggable tiles (LaTeX). Must include each blank's `accept`
   * value plus at least one distractor, with no duplicate entries.
   */
  bank: string[];
}

/**
 * One row in a {@link MatchAnswer}: a fixed left-hand prompt and the LaTeX of
 * the right-hand option that correctly matches it (e.g. a function paired with
 * its antiderivative).
 */
interface MatchPair {
  /** Left-hand item shown in fixed order, e.g. "$x^2$". Rendered with inline math ($…$). */
  prompt: string;
  /**
   * LaTeX of the right-hand option that matches this prompt. Values may repeat
   * across pairs — two prompts can legitimately share the same correct answer.
   * Grading is positional (by value), so each prompt is checked against its own
   * `match` regardless of any duplicates in the bank.
   */
  match: string;
}

/**
 * "Match the pairs" question: the learner pairs each fixed left-hand prompt with
 * one right-hand option (e.g. each function with its antiderivative). The option
 * bank holds one tile per pair's `match` plus one per distractor, shuffled when
 * rendered, and each tile can be used at most once. Tiles may share a label
 * (the widget tracks them by id), so the bank can offer plausible duplicate
 * answers. The submitted answer is an array of chosen option values, one per
 * prompt by position (null where a prompt is still unmatched). Graded by
 * position: every prompt must hold its own `match`.
 */
export interface MatchAnswer {
  type: "match";
  /** The pairs to match, with prompts shown in this order. */
  pairs: MatchPair[];
  /**
   * Extra options (LaTeX) mixed into the bank as distractors, so the answer
   * can't be reached purely by elimination. Labels may repeat and may even
   * mirror a pair's `match` (e.g. a second "2" alongside the correct "2" so a
   * sibling prompt can't be solved by process of elimination); each distractor
   * still adds exactly one extra tile to the bank.
   */
  distractors?: string[];
}

/** One interval in a {@link SignChartAnswer}. */
interface SignChartRegion {
  /** Index into the answer's shared `options` that correctly labels this interval. */
  correctIndex: number;
}

/**
 * "Sign chart" question: the learner reads the behavior of a quantity (usually
 * f') across a number line split by its critical points and labels every
 * interval — e.g. tagging each stretch "Increasing" or "Decreasing". This is the
 * standard hands-on tool for analyzing where a function rises and falls. The
 * critical x-values in `points` are shown as labeled ticks, and the intervals
 * between and beyond them are the regions, so there is always exactly one more
 * region than there are points. The submitted answer is an array of chosen
 * option indices, one per region in left-to-right order (null where a region is
 * still unlabeled); graded by position, every region must hold its correct label.
 */
export interface SignChartAnswer {
  type: "sign_chart";
  /** Critical x-values dividing the line, in increasing order (display only). */
  points: number[];
  /** Labels every region picks from, e.g. ["Increasing", "Decreasing"]. */
  options: string[];
  /** One entry per region (points.length + 1), left to right. */
  regions: SignChartRegion[];
  /** Optional caption for what's being analyzed, e.g. "Sign of f'(x)". */
  variableLabel?: string;
}

/**
 * "Put in order" question: the learner drags shuffled items into the right
 * sequence — the steps of a computation, or values sorted least-to-greatest, for
 * example. The authored `items` are listed in their CORRECT order and rendered
 * shuffled; the submitted answer is the current ordering (the item strings),
 * graded by an exact match against the authored order.
 */
export interface OrderListAnswer {
  type: "order_list";
  /** Items in their correct order; rendered shuffled. Each supports inline $…$ math. */
  items: string[];
  /** Optional instruction, e.g. "Order the steps from first to last". */
  orderLabel?: string;
}

/**
 * Interactive Riemann-sum question: the learner drags a slider to pile more
 * rectangles under a curve and watches the running estimate close in on the true
 * area, feeling the limit that defines the integral. The submitted answer is the
 * rectangle count n; it grades correct once the midpoint estimate lands within
 * `targetWithin` of `trueArea`, so the learner has to refine the approximation by
 * hand. The widget draws the curve, the rectangles, and the live readouts itself,
 * so a Riemann step needs no separate `graph` config.
 */
export interface RiemannAnswer {
  type: "riemann";
  /**
   * Present this Riemann widget as an ungraded demonstration rather than a graded
   * question: the learner still drags to pile on rectangles and watch the estimate
   * converge, but the step advances with a "Continue" button (like a read step) and
   * never counts toward concept mastery. Pair it with a follow-up question that
   * checks comprehension. See {@link isRiemannDemo}.
   */
  demo?: boolean;
  /** Curve to integrate, a math.js expression in x (e.g. "x^2"). */
  fn: string;
  /** Left endpoint of the integration interval. */
  a: number;
  /** Right endpoint of the integration interval (must exceed `a`). */
  b: number;
  /** Exact area over [a, b], used for the readout and to grade convergence. */
  trueArea: number;
  /** Correct once |estimate − trueArea| ≤ this (must be positive). */
  targetWithin: number;
  /** Largest rectangle count the slider allows (default 40). */
  maxRects?: number;
  /** Plot window; defaults to [a, b]. Widen it to leave margin around the interval. */
  domain?: [number, number];
  /** Explicit y-axis maximum; defaults to the curve's peak across the domain. */
  yMax?: number;
}

export type AnswerSpec =
  | MultipleChoiceAnswer
  | MultiChoiceAnswer
  | NumericAnswer
  | SliderAnswer
  | GraphPointAnswer
  | PowerTermAnswer
  | DragDropAnswer
  | MatchAnswer
  | SignChartAnswer
  | OrderListAnswer
  | RiemannAnswer;

interface Interaction {
  graph?: GraphConfig;
  answer?: AnswerSpec;
  /** Hints shown after this many wrong attempts (default 2; lesson 1 uses 1) */
  hintAfterAttempts?: number;
}

export interface StepFeedback {
  correct: string;
  incorrect: string;
  hint: string;
}

export interface Step {
  id: string;
  type: StepType;
  conceptTag?: string;
  content: ContentBlock[];
  interaction?: Interaction;
  feedback: StepFeedback;
}

/**
 * A Riemann step flagged as a demonstration (`answer.demo`): it renders the
 * interactive widget for the learner to explore, but isn't graded — it advances
 * with a "Continue" button and is excluded from concept mastery, just like a
 * read step.
 */
export function isRiemannDemo(step: Step): boolean {
  const answer = step.interaction?.answer;
  return answer?.type === "riemann" && answer.demo === true;
}

/**
 * Steps that present material without grading: plain `read` steps and Riemann
 * demos. These advance with "Continue", show as info in the step nav, and never
 * count toward concept mastery.
 */
export function isInstructionStep(step: Step): boolean {
  return step.type === "read" || isRiemannDemo(step);
}

export interface Lesson {
  id: string;
  title: string;
  order: number;
  estimatedMinutes: number;
  conceptTags: string[];
  published: boolean;
  steps: Step[];
  /**
   * @deprecated Use `practiceBank`. Legacy fixed practice set kept for
   * backward compatibility; the loader falls back to it when no bank exists.
   */
  practice?: Step[];
  /**
   * Pool of practice questions for this lesson. Each practice session draws a
   * random subset so repeated practice stays varied.
   */
  practiceBank?: Step[];
}

/** Outcome of a practice session: how many questions were correct on the first try. */
export interface PracticeResult {
  correct: number;
  total: number;
}

export interface LessonMeta {
  id: string;
  title: string;
  order: number;
  estimatedMinutes: number;
  published: boolean;
}

/**
 * A level groups several lessons into a stage of the course that builds on the
 * previous one (e.g. "What Is a Derivative?" → "Finding Derivatives"). Lessons
 * are referenced by id and rendered in the listed order.
 */
interface CourseLevel {
  id: string;
  title: string;
  /** One-line summary of what this level builds toward. */
  description: string;
  lessonIds: string[];
}

export interface Course {
  id: "derivatives";
  title: string;
  subject: string;
  description: string;
  /** Ordered learning stages. When omitted, all lessons fall under one level. */
  levels?: CourseLevel[];
  lessons: LessonMeta[];
}

export interface LessonProgress {
  status: LessonStatus;
  currentStepIndex: number;
  stepAttempts: Record<string, number>;
  stepAnswers: Record<string, unknown>;
  completedAt: string | null;
  updatedAt: string;
}

export interface StreakData {
  count: number;
  lastActiveDate: string;
}

export interface UserProfile {
  displayName: string;
  email: string;
  streak: StreakData;
  milestones: string[];
  /** Total experience points earned, primarily by completing lessons. */
  xp: number;
  /**
   * Lifetime count of practice/review questions cleared on the first try.
   * Lesson-walkthrough questions and questions that needed more than one attempt
   * are deliberately excluded. Powers the "practice questions" achievements;
   * backfilled to 0 on older profiles.
   */
  practiceQuestionsAnswered: number;
  /**
   * Per-day activity tally keyed by ISO date (YYYY-MM-DD); the value counts the
   * questions answered that day. Powers the activity heatmap and longest-streak
   * stat. Absent on profiles created before this field existed.
   */
  activityLog?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

/** How well a learner has demonstrated a concept, coarsest to strongest. */
export type ConceptMasteryTier =
  | "not_started"
  | "learning"
  | "proficient"
  | "mastered";

/** Aggregated mastery of a single concept tag across every lesson that teaches it. */
export interface ConceptMastery {
  /** Concept tag slug, e.g. "power_rule". */
  concept: string;
  /** Human-readable label for display. */
  label: string;
  tier: ConceptMasteryTier;
  /** 0–100 share of the concept's questions answered correctly on the first try. */
  percent: number;
  /** Concept questions answered correctly on the first try. */
  firstTry: number;
  /** Concept questions the learner has cleared (eventually answered correctly). */
  cleared: number;
  /** Total answerable questions tagged with this concept. */
  total: number;
  /** Published lesson ids that teach this concept, in course order. */
  lessonIds: string[];
}

export type FeedbackResult =
  | { correct: true; message: string }
  | { correct: false; message: string; showHint: boolean; hint?: string };

/** Which learner statistic a milestone tracks, used to compute progress. */
export type MilestoneMetric =
  | "lessons"
  | "streak"
  | "course"
  | "xp"
  | "questions"
  | "concepts"
  | "allConcepts";

export interface MilestoneDef {
  title: string;
  description: string;
  /** Registered icon ({@link IconName}) shown on the achievement badge. */
  icon: IconName;
  metric: MilestoneMetric;
  /**
   * Threshold required to earn the milestone. For the "course" metric the live
   * target is the published lesson count; `goal` is only a sensible fallback.
   */
  goal: number;
}

export const MILESTONE_DEFS: Record<string, MilestoneDef> = {
  first_lesson: {
    title: "First Steps",
    description: "Complete your first calculus lesson",
    icon: "sprout",
    metric: "lessons",
    goal: 1,
  },
  three_lessons: {
    title: "On a Roll",
    description: "Complete 3 calculus lessons",
    icon: "flame",
    metric: "lessons",
    goal: 3,
  },
  five_day_streak: {
    title: "Consistent Learner",
    description: "Maintain a 5-day learning streak",
    icon: "calendarCheck",
    metric: "streak",
    goal: 5,
  },
  course_complete: {
    title: "Calculus Master",
    description: "Complete every lesson in the course",
    icon: "graduationCap",
    metric: "course",
    goal: 1,
  },
  questions_10: {
    title: "Warming Up",
    description: "Answer 10 practice questions right on the first try",
    icon: "dumbbell",
    metric: "questions",
    goal: 10,
  },
  questions_25: {
    title: "Getting Reps In",
    description: "Answer 25 practice questions right on the first try",
    icon: "penLine",
    metric: "questions",
    goal: 25,
  },
  questions_50: {
    title: "Practice Pro",
    description: "Answer 50 practice questions right on the first try",
    icon: "library",
    metric: "questions",
    goal: 50,
  },
  questions_100: {
    title: "Century",
    description: "Answer 100 practice questions right on the first try",
    icon: "target",
    metric: "questions",
    goal: 100,
  },
  concepts_3: {
    title: "Concept Explorer",
    description: "Master 3 concepts",
    icon: "brain",
    metric: "concepts",
    goal: 3,
  },
  all_concepts: {
    title: "Concept Conqueror",
    description: "Master every concept in the course",
    icon: "crown",
    metric: "allConcepts",
    goal: 1,
  },
  xp_250: {
    title: "Point Collector",
    description: "Earn 250 XP",
    icon: "gem",
    metric: "xp",
    goal: 250,
  },
  xp_1000: {
    title: "XP Champion",
    description: "Earn 1,000 XP",
    icon: "trophy",
    metric: "xp",
    goal: 1000,
  },
};

/** A labeled group of related achievements, shown as one section in the UI. */
export interface MilestoneSection {
  id: string;
  label: string;
  /** Milestone ids belonging to this section, in display order. */
  milestoneIds: string[];
}

/**
 * Achievements grouped by theme for display. {@link MILESTONE_ORDER} is derived
 * from this, so every id in {@link MILESTONE_DEFS} must appear in exactly one
 * section.
 */
export const MILESTONE_SECTIONS: MilestoneSection[] = [
  {
    id: "lessons",
    label: "Lessons",
    milestoneIds: ["first_lesson", "three_lessons", "course_complete"],
  },
  {
    id: "practice",
    label: "Practice",
    milestoneIds: [
      "questions_10",
      "questions_25",
      "questions_50",
      "questions_100",
    ],
  },
  {
    id: "mastery",
    label: "Concept mastery",
    milestoneIds: ["concepts_3", "all_concepts"],
  },
  {
    id: "streak",
    label: "Streaks",
    milestoneIds: ["five_day_streak"],
  },
  {
    id: "xp",
    label: "Experience",
    milestoneIds: ["xp_250", "xp_1000"],
  },
];

/** Milestone ids in display order, flattened from {@link MILESTONE_SECTIONS}. */
export const MILESTONE_ORDER: string[] = MILESTONE_SECTIONS.flatMap(
  (section) => section.milestoneIds,
);

/** Learner stats needed to evaluate progress toward any milestone. */
export interface MilestoneStats {
  lessonsCompleted: number;
  totalLessons: number;
  streak: number;
  /** Total experience points earned across lessons and practice. */
  xp: number;
  /** Practice/review questions cleared on the first try (lesson questions excluded). */
  practiceQuestionsAnswered: number;
  /** Concepts the learner has fully mastered. */
  conceptsMastered: number;
  /** Total concepts taught by the published course. */
  totalConcepts: number;
}

/**
 * Current progress toward a milestone: `current` is how far the learner has
 * come and `target` is what they must reach to earn it. A milestone is earned
 * once `current >= target`, which keeps the award rules and the achievements UI
 * reading from one source of truth.
 */
export function milestoneProgress(
  def: MilestoneDef,
  stats: MilestoneStats,
): { current: number; target: number } {
  switch (def.metric) {
    case "lessons":
      return { current: stats.lessonsCompleted, target: def.goal };
    case "streak":
      return { current: stats.streak, target: def.goal };
    case "course":
      return { current: stats.lessonsCompleted, target: stats.totalLessons };
    case "xp":
      return { current: stats.xp, target: def.goal };
    case "questions":
      return { current: stats.practiceQuestionsAnswered, target: def.goal };
    case "concepts":
      return { current: stats.conceptsMastered, target: def.goal };
    case "allConcepts":
      return { current: stats.conceptsMastered, target: stats.totalConcepts };
  }
}

export const MIN_STEPS = 6;
export const MAX_STEPS = 10;

/** XP awarded the first time a lesson is completed. */
export const XP_PER_LESSON = 50;

/**
 * XP awarded per question answered correctly on the first try during a practice
 * or review session. Worth less than a full lesson so new material stays the
 * primary way to earn XP.
 */
export const XP_PER_PRACTICE_CORRECT = 10;

/** Number of questions a legacy fixed practice set should contain. */
export const PRACTICE_STEPS = 3;

/** Questions shown in a single lesson practice session (sampled from the bank). */
export const PRACTICE_SESSION_SIZE = 3;

/** Questions shown in a single cross-lesson mixed-review session. */
export const REVIEW_SESSION_SIZE = 5;

/** Default question count pre-filled when a learner opens custom practice. */
export const CUSTOM_PRACTICE_DEFAULT_SIZE = 5;

/** Upper bound on how many questions a single custom practice set may request. */
export const CUSTOM_PRACTICE_MAX_SIZE = 20;

/** Minimum number of questions a practice bank should contain. */
export const PRACTICE_BANK_MIN = PRACTICE_SESSION_SIZE;

/** Minimum number of answer choices every multiple-choice question must offer. */
export const MIN_MC_OPTIONS = 4;

/** Minimum number of pairs a match question must offer. */
export const MIN_MATCH_PAIRS = 2;

/**
 * First-try accuracy (0–1) needed to count a fully-covered concept as
 * "proficient" — every question cleared, most of them on the first try.
 */
export const MASTERY_PROFICIENT = 0.6;

/**
 * First-try accuracy (0–1) needed to count a fully-covered concept as
 * "mastered" — every question cleared, nearly all on the first try.
 */
export const MASTERY_MASTERED = 0.9;
