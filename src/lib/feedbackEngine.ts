import { create, all, type EvalFunction } from "mathjs";
import type { Step } from "../types/content";
import type { FeedbackResult } from "../types/content";

const math = create(all);

// Cache compiled expressions; math.js uses "^" for exponentiation natively
// (do NOT convert to "**", which math.js does not support).
const compiledCache = new Map<string, EvalFunction>();

export function evalFunction(fn: string, x: number): number {
  let expr = compiledCache.get(fn);
  if (!expr) {
    expr = math.compile(fn);
    compiledCache.set(fn, expr);
  }
  const result = expr.evaluate({ x });
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error(`Invalid evaluation at x=${x}`);
  }
  return result;
}

export function secantSlope(
  fn: string,
  x0: number,
  h: number,
): number {
  if (Math.abs(h) < 1e-9) return NaN;
  return (evalFunction(fn, x0 + h) - evalFunction(fn, x0)) / h;
}

/**
 * Instantaneous slope (derivative) at a point via a central difference.
 * Defined for all points where the function is smooth, so it has no 0/0
 * blow-up the way a secant does when its two points coincide.
 */
export function derivativeAt(fn: string, x: number, h = 1e-4): number {
  return (evalFunction(fn, x + h) - evalFunction(fn, x - h)) / (2 * h);
}

/**
 * Midpoint Riemann sum of `fn` over [a, b] with `n` equal-width rectangles. The
 * same routine drives the interactive widget's rectangles and grades how close
 * the learner's chosen `n` gets, so the picture and the verdict always agree.
 */
export function riemannSum(fn: string, a: number, b: number, n: number): number {
  if (n <= 0 || !Number.isFinite(n)) return 0;
  const count = Math.round(n);
  const w = (b - a) / count;
  let sum = 0;
  for (let i = 0; i < count; i++) {
    sum += evalFunction(fn, a + (i + 0.5) * w) * w;
  }
  return sum;
}

export function checkAnswer(
  step: Step,
  answer: unknown,
): FeedbackResult {
  const spec = step.interaction?.answer;
  if (!spec) {
    return { correct: true, message: step.feedback.correct };
  }

  switch (spec.type) {
    case "multiple_choice": {
      const index = answer as number;
      const correct = index === spec.correctIndex;
      return correct
        ? { correct: true, message: step.feedback.correct }
        : {
            correct: false,
            message: step.feedback.incorrect,
            showHint: false,
            hint: step.feedback.hint,
          };
    }
    case "multi_choice": {
      const picks = Array.isArray(answer) ? (answer as (number | null)[]) : [];
      const allAnswered =
        spec.parts.length > 0 &&
        spec.parts.every((_, i) => typeof picks[i] === "number");
      const allCorrect =
        allAnswered && spec.parts.every((p, i) => picks[i] === p.correctIndex);
      return allCorrect
        ? { correct: true, message: step.feedback.correct }
        : {
            correct: false,
            message: step.feedback.incorrect,
            showHint: false,
            hint: step.feedback.hint,
          };
    }
    case "numeric":
    case "slider": {
      const num = Number(answer);
      if (!Number.isFinite(num)) {
        return {
          correct: false,
          message: "Please enter a valid number.",
          showHint: false,
          hint: step.feedback.hint,
        };
      }
      const tolerance = spec.tolerance ?? 0.01;
      const verified = math.abs(math.subtract(num, spec.value)) <= tolerance;
      return verified
        ? { correct: true, message: step.feedback.correct }
        : {
            correct: false,
            message: step.feedback.incorrect,
            showHint: false,
            hint: step.feedback.hint,
          };
    }
    case "graph_point": {
      const num = Number(answer);
      if (!Number.isFinite(num)) {
        return {
          correct: false,
          message: "Tap a point on the curve.",
          showHint: false,
          hint: step.feedback.hint,
        };
      }
      const tolerance = spec.tolerance ?? 0.25;
      // Several points can satisfy a prompt (e.g. f′(x) = 3x² = 12 holds at
      // x = ±2), so any listed x within tolerance counts as correct.
      const targets = [spec.x, ...(spec.acceptX ?? [])];
      const verified = targets.some(
        (t) => math.abs(math.subtract(num, t)) <= tolerance,
      );
      return verified
        ? { correct: true, message: step.feedback.correct }
        : {
            correct: false,
            message: step.feedback.incorrect,
            showHint: false,
            hint: step.feedback.hint,
          };
    }
    case "power_term": {
      const v = (answer ?? {}) as { coefficient?: number; exponent?: number };
      const coeff = Number(v.coefficient);
      const exp = Number(v.exponent);
      if (!Number.isFinite(coeff) || !Number.isFinite(exp)) {
        return {
          correct: false,
          message: step.feedback.incorrect,
          showHint: false,
          hint: step.feedback.hint,
        };
      }
      // A zero coefficient means the term vanished (e.g. a constant's
      // derivative), so the exponent doesn't matter in that case.
      const verified =
        spec.coefficient === 0
          ? coeff === 0
          : coeff === spec.coefficient && exp === spec.exponent;
      return verified
        ? { correct: true, message: step.feedback.correct }
        : {
            correct: false,
            message: step.feedback.incorrect,
            showHint: false,
            hint: step.feedback.hint,
          };
    }
    case "drag_drop": {
      const placed = Array.isArray(answer) ? (answer as (string | null)[]) : [];
      const allFilled =
        placed.length >= spec.blanks.length &&
        spec.blanks.every((_, i) => placed[i] != null);
      // Grade by the multiset of signed terms rather than by position, so a sum
      // can be assembled in any order (addition is commutative). Each blank's
      // sign comes from the operator fixed in front of it ("+" for the first),
      // so a term dropped into a "-" slot counts as negative — which keeps
      // subtraction order-sensitive while making pure sums order-free.
      const sign = (i: number) => (i === 0 ? "+" : spec.blanks[i].connector ?? "+");
      const expected = spec.blanks.map((b, i) => `${sign(i)}${b.accept}`).sort();
      const got = placed.map((p, i) => `${sign(i)}${p}`).sort();
      const allCorrect =
        allFilled && expected.every((e, i) => e === got[i]);
      return allCorrect
        ? { correct: true, message: step.feedback.correct }
        : {
            correct: false,
            message: step.feedback.incorrect,
            showHint: false,
            hint: step.feedback.hint,
          };
    }
    case "match": {
      const picks = Array.isArray(answer) ? (answer as (string | null)[]) : [];
      const allMatched =
        spec.pairs.length > 0 &&
        spec.pairs.every((_, i) => picks[i] != null);
      // Graded by position: each prompt must hold its own correct option. Since
      // every `match` is unique, an option maps to exactly one prompt.
      const allCorrect =
        allMatched && spec.pairs.every((p, i) => picks[i] === p.match);
      return allCorrect
        ? { correct: true, message: step.feedback.correct }
        : {
            correct: false,
            message: step.feedback.incorrect,
            showHint: false,
            hint: step.feedback.hint,
          };
    }
    case "sign_chart": {
      const picks = Array.isArray(answer) ? (answer as (number | null)[]) : [];
      const allAnswered =
        spec.regions.length > 0 &&
        spec.regions.every((_, i) => typeof picks[i] === "number");
      const allCorrect =
        allAnswered &&
        spec.regions.every((r, i) => picks[i] === r.correctIndex);
      return allCorrect
        ? { correct: true, message: step.feedback.correct }
        : {
            correct: false,
            message: step.feedback.incorrect,
            showHint: false,
            hint: step.feedback.hint,
          };
    }
    case "order_list": {
      const order = Array.isArray(answer) ? (answer as string[]) : [];
      const allCorrect =
        order.length === spec.items.length &&
        spec.items.every((item, i) => order[i] === item);
      return allCorrect
        ? { correct: true, message: step.feedback.correct }
        : {
            correct: false,
            message: step.feedback.incorrect,
            showHint: false,
            hint: step.feedback.hint,
          };
    }
    case "riemann": {
      const n = Number(answer);
      if (!Number.isFinite(n) || n <= 0) {
        return {
          correct: false,
          message: "Drag the slider to add rectangles.",
          showHint: false,
          hint: step.feedback.hint,
        };
      }
      const estimate = riemannSum(spec.fn, spec.a, spec.b, n);
      const verified = Math.abs(estimate - spec.trueArea) <= spec.targetWithin;
      return verified
        ? { correct: true, message: step.feedback.correct }
        : {
            correct: false,
            message: step.feedback.incorrect,
            showHint: false,
            hint: step.feedback.hint,
          };
    }
    default:
      return {
        correct: false,
        message: "Unknown answer type.",
        showHint: false,
      };
  }
}

export function verifyNumericWithMathJs(
  expected: number,
  actual: number,
  tolerance = 0.01,
): boolean {
  return math.abs(math.subtract(actual, expected)) <= tolerance;
}
