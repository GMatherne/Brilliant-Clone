import { validateLesson, assertValidLesson } from "./validateLesson";
import type { Lesson, Step, MultiChoicePart } from "../types/content";

function numericStep(id: string): Step {
  return {
    id,
    type: "numeric",
    content: [],
    interaction: { answer: { type: "numeric", value: 1 } },
    feedback: { correct: "c", incorrect: "i", hint: "h" },
  };
}

function sliderGraphStep(id: string): Step {
  return {
    id,
    type: "slider_graph",
    content: [],
    interaction: {
      graph: { fn: "x^2", domain: [0, 4] },
      answer: { type: "slider", value: 2 },
    },
    feedback: { correct: "c", incorrect: "i", hint: "h" },
  };
}

function dragDropStep(id: string): Step {
  return {
    id,
    type: "drag_drop",
    content: [],
    interaction: {
      answer: {
        type: "drag_drop",
        blanks: [{ accept: "3x^2" }, { accept: "2x" }],
        bank: ["3x^2", "2x", "x^2"],
      },
    },
    feedback: { correct: "c", incorrect: "i", hint: "h" },
  };
}

function validLesson(): Lesson {
  return {
    id: "test-lesson",
    title: "Test",
    order: 1,
    estimatedMinutes: 5,
    conceptTags: [],
    published: true,
    steps: [
      sliderGraphStep("s1"),
      numericStep("s2"),
      numericStep("s3"),
      numericStep("s4"),
      numericStep("s5"),
      numericStep("s6"),
    ],
  };
}

const hasError = (errors: string[], re: RegExp) => errors.some((e) => re.test(e));

describe("validateLesson", () => {
  it("returns no errors for a well-formed lesson", () => {
    expect(validateLesson(validLesson())).toEqual([]);
  });

  it("flags lessons with too few steps", () => {
    const lesson = validLesson();
    lesson.steps = lesson.steps.slice(0, 3);
    expect(hasError(validateLesson(lesson), /steps; expected/)).toBe(true);
  });

  it("requires at least one slider_graph step", () => {
    const lesson = validLesson();
    lesson.steps[0] = numericStep("s1");
    expect(hasError(validateLesson(lesson), /slider_graph/)).toBe(true);
  });

  it("flags an interactive step with no answer spec", () => {
    const lesson = validLesson();
    lesson.steps[1] = { ...numericStep("s2"), interaction: {} };
    expect(hasError(validateLesson(lesson), /no answer spec/)).toBe(true);
  });

  it("requires at least four multiple-choice options", () => {
    const lesson = validLesson();
    lesson.steps[1] = {
      id: "s2",
      type: "multiple_choice",
      content: [],
      interaction: {
        answer: { type: "multiple_choice", options: ["a", "b", "c"], correctIndex: 0 },
      },
      feedback: { correct: "c", incorrect: "i", hint: "h" },
    };
    expect(hasError(validateLesson(lesson), /multiple-choice options/)).toBe(true);
  });

  it("requires a graph config for slider answers", () => {
    const lesson = validLesson();
    lesson.steps[1] = {
      id: "s2",
      type: "numeric",
      content: [],
      interaction: { answer: { type: "slider", value: 1 } },
      feedback: { correct: "c", incorrect: "i", hint: "h" },
    };
    expect(hasError(validateLesson(lesson), /slider answer but has no graph/)).toBe(true);
  });

  it("flags missing feedback fields", () => {
    const lesson = validLesson();
    lesson.steps[1] = {
      ...numericStep("s2"),
      feedback: { correct: "", incorrect: "", hint: "" },
    };
    expect(hasError(validateLesson(lesson), /missing feedback/)).toBe(true);
  });

  describe("drag_drop", () => {
    it("accepts a valid drag_drop step", () => {
      const lesson = validLesson();
      lesson.steps[1] = dragDropStep("s2");
      expect(validateLesson(lesson)).toEqual([]);
    });

    it("flags a blank whose tile is not in the bank", () => {
      const lesson = validLesson();
      lesson.steps[1] = {
        ...dragDropStep("s2"),
        interaction: {
          answer: {
            type: "drag_drop",
            blanks: [{ accept: "3x^2" }, { accept: "missing" }],
            bank: ["3x^2", "2x", "x^2"],
          },
        },
      };
      expect(hasError(validateLesson(lesson), /not in the bank/)).toBe(true);
    });

    it("flags duplicate bank tiles", () => {
      const lesson = validLesson();
      lesson.steps[1] = {
        ...dragDropStep("s2"),
        interaction: {
          answer: {
            type: "drag_drop",
            blanks: [{ accept: "3x^2" }, { accept: "2x" }],
            bank: ["3x^2", "2x", "2x"],
          },
        },
      };
      expect(hasError(validateLesson(lesson), /duplicate tiles/)).toBe(true);
    });

    it("requires at least one distractor beyond the blanks", () => {
      const lesson = validLesson();
      lesson.steps[1] = {
        ...dragDropStep("s2"),
        interaction: {
          answer: {
            type: "drag_drop",
            blanks: [{ accept: "3x^2" }, { accept: "2x" }],
            bank: ["3x^2", "2x"],
          },
        },
      };
      expect(hasError(validateLesson(lesson), /distractor/)).toBe(true);
    });
  });

  describe("multi_choice", () => {
    function withMultiChoice(parts: MultiChoicePart[], options?: string[]): Lesson {
      const lesson = validLesson();
      lesson.steps[1] = {
        id: "s2",
        type: "multi_choice",
        content: [],
        interaction: { answer: { type: "multi_choice", options, parts } },
        feedback: { correct: "c", incorrect: "i", hint: "h" },
      };
      return lesson;
    }

    it("accepts a valid multi_choice step", () => {
      const lesson = withMultiChoice(
        [
          { prompt: "x = 0", correctIndex: 0 },
          { prompt: "x = 2", correctIndex: 1 },
        ],
        ["Maximum", "Minimum", "Neither"],
      );
      expect(validateLesson(lesson)).toEqual([]);
    });

    it("flags fewer than two parts", () => {
      const lesson = withMultiChoice([{ prompt: "x = 0", correctIndex: 0 }], [
        "Maximum",
        "Minimum",
      ]);
      expect(hasError(validateLesson(lesson), /at least two parts/)).toBe(true);
    });

    it("flags a row with too few options", () => {
      const lesson = withMultiChoice(
        [
          { prompt: "x = 0", correctIndex: 0 },
          { prompt: "x = 2", correctIndex: 0 },
        ],
        ["only-one"],
      );
      expect(hasError(validateLesson(lesson), /at least two options/)).toBe(true);
    });

    it("flags a correctIndex outside the row's options", () => {
      const lesson = withMultiChoice(
        [
          { prompt: "x = 0", correctIndex: 0 },
          { prompt: "x = 2", correctIndex: 9 },
        ],
        ["Maximum", "Minimum", "Neither"],
      );
      expect(hasError(validateLesson(lesson), /correctIndex outside/)).toBe(true);
    });

    it("lets a row override the shared options", () => {
      const lesson = withMultiChoice([
        { prompt: "x = 0", correctIndex: 1, options: ["Rising", "Falling"] },
        { prompt: "x = 2", correctIndex: 0, options: ["Rising", "Falling"] },
      ]);
      expect(validateLesson(lesson)).toEqual([]);
    });
  });

  describe("match", () => {
    function matchStep(id: string): Step {
      return {
        id,
        type: "match",
        content: [],
        interaction: {
          answer: {
            type: "match",
            pairs: [
              { prompt: "$x^2$", match: "x^3/3" },
              { prompt: "$x$", match: "x^2/2" },
            ],
            distractors: ["x^3/2"],
          },
        },
        feedback: { correct: "c", incorrect: "i", hint: "h" },
      };
    }

    it("accepts a valid match step", () => {
      const lesson = validLesson();
      lesson.steps[1] = matchStep("s2");
      expect(validateLesson(lesson)).toEqual([]);
    });

    it("flags fewer than two pairs", () => {
      const lesson = validLesson();
      lesson.steps[1] = {
        ...matchStep("s2"),
        interaction: {
          answer: { type: "match", pairs: [{ prompt: "$x$", match: "x^2/2" }] },
        },
      };
      expect(hasError(validateLesson(lesson), /at least 2 pairs/)).toBe(true);
    });

    it("flags a pair missing its prompt or match", () => {
      const lesson = validLesson();
      lesson.steps[1] = {
        ...matchStep("s2"),
        interaction: {
          answer: {
            type: "match",
            pairs: [
              { prompt: "$x^2$", match: "x^3/3" },
              { prompt: "", match: "x^2/2" },
            ],
          },
        },
      };
      expect(hasError(validateLesson(lesson), /both a prompt and a match/)).toBe(true);
    });

    it("allows a distractor that mirrors a correct match (plausible duplicate)", () => {
      const lesson = validLesson();
      lesson.steps[1] = {
        ...matchStep("s2"),
        interaction: {
          answer: {
            type: "match",
            pairs: [
              { prompt: "$1+1$", match: "2" },
              { prompt: "$2+2$", match: "4" },
            ],
            distractors: ["2"],
          },
        },
      };
      expect(validateLesson(lesson)).toEqual([]);
    });

    it("allows two prompts that share the same correct answer", () => {
      const lesson = validLesson();
      lesson.steps[1] = {
        ...matchStep("s2"),
        interaction: {
          answer: {
            type: "match",
            pairs: [
              { prompt: "$1+1$", match: "2" },
              { prompt: "$4-2$", match: "2" },
            ],
          },
        },
      };
      expect(validateLesson(lesson)).toEqual([]);
    });
  });

  describe("practiceBank", () => {
    it("requires a minimum number of questions", () => {
      const lesson = validLesson();
      lesson.practiceBank = [numericStep("p1"), numericStep("p2")];
      expect(hasError(validateLesson(lesson), /practice bank has/)).toBe(true);
    });

    it("rejects read steps in the bank", () => {
      const lesson = validLesson();
      lesson.practiceBank = [
        numericStep("p1"),
        numericStep("p2"),
        { id: "p3", type: "read", content: [], feedback: { correct: "", incorrect: "", hint: "" } },
      ];
      expect(hasError(validateLesson(lesson), /must be interactive/)).toBe(true);
    });

    it("rejects duplicate question ids", () => {
      const lesson = validLesson();
      lesson.practiceBank = [numericStep("dup"), numericStep("dup"), numericStep("p3")];
      expect(hasError(validateLesson(lesson), /Duplicate practice question id/)).toBe(true);
    });

    it("accepts a valid bank", () => {
      const lesson = validLesson();
      lesson.practiceBank = [numericStep("p1"), numericStep("p2"), numericStep("p3")];
      expect(validateLesson(lesson)).toEqual([]);
    });
  });
});

describe("assertValidLesson", () => {
  it("does not throw for a valid lesson", () => {
    expect(() => assertValidLesson(validLesson())).not.toThrow();
  });

  it("throws for an invalid lesson", () => {
    const lesson = validLesson();
    lesson.steps = [];
    expect(() => assertValidLesson(lesson)).toThrow();
  });
});
