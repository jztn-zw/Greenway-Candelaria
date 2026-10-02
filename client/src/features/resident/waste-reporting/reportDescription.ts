import { QUICK_CHIPS, type ViolationType } from "./types";

const missedCollectionPrompts = [
  "What was the scheduled collection day?",
  "Which street or landmark was affected?",
  "How many households are affected?",
];

const openBurningPrompts = [
  "When did you observe the burning?",
  "Is smoke affecting nearby homes?",
  "Describe the exact location.",
];

const suggestedPrompts = new Set([
  ...QUICK_CHIPS,
  ...missedCollectionPrompts,
  ...openBurningPrompts,
]);

export const getReportPrompts = (violationType?: ViolationType | null): string[] =>
  violationType === "missed-collection"
    ? missedCollectionPrompts
    : violationType === "open-burning"
      ? openBurningPrompts
      : QUICK_CHIPS;

/** Remove only unanswered suggestions; keep the resident's own questions and answers. */
export const prepareReportDescription = (description: string): string =>
  description
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !suggestedPrompts.has(block))
    .join("\n\n");
