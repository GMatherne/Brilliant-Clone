import type { Lesson, Step } from "../types/content";
import {
  MAX_STEPS,
  MIN_STEPS,
  PRACTICE_STEPS,
  PRACTICE_BANK_MIN,
  MIN_MC_OPTIONS,
  MIN_MATCH_PAIRS,
  isRiemannDemo,
} from "../types/content";

export function validateLesson(lesson: Lesson): string[] {
  const errors: string[] = [];
  const stepCount = lesson.steps.length;

  if (stepCount < MIN_STEPS || stepCount > MAX_STEPS) {
    errors.push(
      `Lesson "${lesson.id}" has ${stepCount} steps; expected ${MIN_STEPS}-${MAX_STEPS}.`,
    );
  }

  const hasSlider = lesson.steps.some((s) => s.type === "slider_graph");
  if (!hasSlider) {
    errors.push(`Lesson "${lesson.id}" must include at least one slider_graph step.`);
  }

  for (const step of lesson.steps) {
    errors.push(...validateStep(step, lesson.id));
  }

  errors.push(...validatePractice(lesson));
  errors.push(...validatePracticeBank(lesson));

  return errors;
}

/**
 * The practice bank is a pool of interactive questions (no "read" steps) that
 * practice sessions sample from. It must hold at least a session's worth so
 * every session can be filled, and every question id must be unique.
 */
function validatePracticeBank(lesson: Lesson): string[] {
  const errors: string[] = [];
  const bank = lesson.practiceBank;
  if (!bank) return errors;

  if (bank.length < PRACTICE_BANK_MIN) {
    errors.push(
      `Lesson "${lesson.id}" practice bank has ${bank.length} questions; expected at least ${PRACTICE_BANK_MIN}.`,
    );
  }

  const ids = new Set<string>();
  for (const step of bank) {
    if (step.type === "read") {
      errors.push(
        `Practice question "${step.id}" in "${lesson.id}" must be interactive, not a read step.`,
      );
    }
    if (ids.has(step.id)) {
      errors.push(`Duplicate practice question id "${step.id}" in "${lesson.id}".`);
    }
    ids.add(step.id);
    errors.push(...validateStep(step, lesson.id));
  }

  return errors;
}

/**
 * Practice is optional, but when present it must be a short set of interactive
 * questions (no "read" steps) so every item can be answered and graded.
 */
function validatePractice(lesson: Lesson): string[] {
  const errors: string[] = [];
  const practice = lesson.practice;
  if (!practice) return errors;

  if (practice.length !== PRACTICE_STEPS) {
    errors.push(
      `Lesson "${lesson.id}" has ${practice.length} practice questions; expected ${PRACTICE_STEPS}.`,
    );
  }

  const ids = new Set<string>();
  for (const step of practice) {
    if (step.type === "read") {
      errors.push(
        `Practice question "${step.id}" in "${lesson.id}" must be interactive, not a read step.`,
      );
    }
    if (ids.has(step.id)) {
      errors.push(`Duplicate practice question id "${step.id}" in "${lesson.id}".`);
    }
    ids.add(step.id);
    errors.push(...validateStep(step, lesson.id));
  }

  return errors;
}

function validateStep(step: Step, lessonId: string): string[] {
  const errors: string[] = [];
  const interactive = step.type !== "read";
  const answer = step.interaction?.answer;

  if (interactive && !answer) {
    errors.push(`Step "${step.id}" in "${lessonId}" is interactive but has no answer spec.`);
  }

  // A question only needs a graph when the answer is physically tied to one: a
  // slider must move along a curve, a graph_point is a tap on the plot, and a
  // slider_graph step is a graph by definition. Other question types (numeric,
  // multiple_choice, power_term) are fine with just an interaction.
  const needsGraph =
    step.type === "slider_graph" ||
    answer?.type === "slider" ||
    answer?.type === "graph_point";
  if (needsGraph && !step.interaction?.graph) {
    const kind = answer ? `${answer.type} answer` : `${step.type} step`;
    errors.push(
      `Step "${step.id}" in "${lessonId}" has a ${kind} but has no graph config.`,
    );
  }

  if (answer?.type === "multiple_choice" && answer.options.length < MIN_MC_OPTIONS) {
    errors.push(
      `Step "${step.id}" in "${lessonId}" has ${answer.options.length} multiple-choice options; expected at least ${MIN_MC_OPTIONS}.`,
    );
  }

  if (
    answer?.type === "power_term" &&
    (!Number.isFinite(answer.coefficient) || !Number.isInteger(answer.exponent))
  ) {
    errors.push(
      `Step "${step.id}" in "${lessonId}" has an invalid power_term answer (need a numeric coefficient and integer exponent).`,
    );
  }

  if (answer?.type === "multi_choice") {
    // The point of this type is to ask about several things at once, so it
    // needs more than one row. Each row needs a real choice (>= 2 options), but
    // not the 4-option floor of a standalone multiple_choice — these rows are
    // usually short classification labels (e.g. max/min/neither).
    if (answer.parts.length < 2) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" multi_choice needs at least two parts.`,
      );
    }
    answer.parts.forEach((part, i) => {
      const options = part.options ?? answer.options;
      if (!options || options.length < 2) {
        errors.push(
          `Step "${step.id}" in "${lessonId}" multi_choice part ${i + 1} needs at least two options.`,
        );
      } else if (
        !Number.isInteger(part.correctIndex) ||
        part.correctIndex < 0 ||
        part.correctIndex >= options.length
      ) {
        errors.push(
          `Step "${step.id}" in "${lessonId}" multi_choice part ${i + 1} has a correctIndex outside its options.`,
        );
      }
    });
  }

  if (answer?.type === "drag_drop") {
    if (answer.blanks.length < 1) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" drag_drop needs at least one blank.`,
      );
    }
    const uniqueBank = new Set(answer.bank);
    if (uniqueBank.size !== answer.bank.length) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" drag_drop bank has duplicate tiles; each tile must be unique.`,
      );
    }
    // The bank must offer at least one distractor beyond the correct tiles, or
    // there's nothing to choose wrong and the question grades itself.
    if (answer.bank.length <= answer.blanks.length) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" drag_drop bank needs more tiles than blanks (add at least one distractor).`,
      );
    }
    for (const blank of answer.blanks) {
      if (!uniqueBank.has(blank.accept)) {
        errors.push(
          `Step "${step.id}" in "${lessonId}" drag_drop blank expects "${blank.accept}", which is not in the bank.`,
        );
      }
    }
  }

  if (answer?.type === "match") {
    // Matching needs more than one pair, or there's nothing to match.
    if (answer.pairs.length < MIN_MATCH_PAIRS) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" match needs at least ${MIN_MATCH_PAIRS} pairs.`,
      );
    }
    answer.pairs.forEach((pair, i) => {
      if (!pair.prompt || !pair.match) {
        errors.push(
          `Step "${step.id}" in "${lessonId}" match pair ${i + 1} needs both a prompt and a match.`,
        );
      }
    });
    // Options (matches + distractors) may intentionally share a label: two
    // prompts can have the same correct answer, or a distractor can mirror a
    // correct value to defeat solving by elimination. Grading is positional and
    // by value, and the widget tracks each tile by a stable id, so no uniqueness
    // is required and duplicate labels are allowed.
  }

  if (answer?.type === "sign_chart") {
    if (answer.points.length < 1) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" sign_chart needs at least one critical point.`,
      );
    }
    // Ticks must be listed in increasing order so the regions read left-to-right.
    for (let i = 1; i < answer.points.length; i++) {
      if (answer.points[i] <= answer.points[i - 1]) {
        errors.push(
          `Step "${step.id}" in "${lessonId}" sign_chart points must be in strictly increasing order.`,
        );
        break;
      }
    }
    if (answer.options.length < 2) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" sign_chart needs at least two options.`,
      );
    }
    // There is always exactly one more region than there are dividing points.
    if (answer.regions.length !== answer.points.length + 1) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" sign_chart must have exactly points.length + 1 regions (got ${answer.regions.length} for ${answer.points.length} points).`,
      );
    }
    answer.regions.forEach((region, i) => {
      if (
        !Number.isInteger(region.correctIndex) ||
        region.correctIndex < 0 ||
        region.correctIndex >= answer.options.length
      ) {
        errors.push(
          `Step "${step.id}" in "${lessonId}" sign_chart region ${i + 1} has a correctIndex outside its options.`,
        );
      }
    });
  }

  if (answer?.type === "order_list") {
    if (answer.items.length < 2) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" order_list needs at least two items.`,
      );
    }
    // Items are graded by exact identity, so duplicates would be ambiguous.
    if (new Set(answer.items).size !== answer.items.length) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" order_list items must be unique.`,
      );
    }
  }

  if (answer?.type === "riemann") {
    if (!(answer.b > answer.a)) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" riemann needs b > a.`,
      );
    }
    if (!Number.isFinite(answer.trueArea)) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" riemann needs a finite trueArea.`,
      );
    }
    if (!(answer.targetWithin > 0)) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" riemann targetWithin must be positive.`,
      );
    }
    // A Riemann step draws its own curve and rectangles, so a separate graph
    // config would render a confusing duplicate plot above the widget.
    if (step.interaction?.graph) {
      errors.push(
        `Step "${step.id}" in "${lessonId}" riemann must not also define a graph (the widget draws its own).`,
      );
    }
  }

  // Read steps and ungraded Riemann demos show no feedback, so they're exempt
  // from the feedback-fields requirement below.
  if (step.type === "read" || isRiemannDemo(step)) {
    return errors;
  }

  if (!step.feedback?.correct || !step.feedback?.incorrect || !step.feedback?.hint) {
    errors.push(`Step "${step.id}" in "${lessonId}" is missing feedback fields.`);
  }

  return errors;
}

export function assertValidLesson(lesson: Lesson): void {
  const errors = validateLesson(lesson);
  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}
