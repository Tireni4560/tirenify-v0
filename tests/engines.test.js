import { describe, it, expect } from "vitest";
import { scoreQuiz, summarizeWeakTopics, deriveDayIndex } from "../src/components/engines.jsx";

const QS = [
  { id: "q1", topic: "Links", prompt: "P1", choices: ["a", "b"], answer: 0, explanation: "E1" },
  { id: "q2", topic: "Links", prompt: "P2", choices: ["a", "b"], answer: 1, explanation: "E2" },
  { id: "q3", topic: "Passwords", prompt: "P3", choices: ["a", "b"], answer: 0, explanation: "E3" },
];

describe("engines pure logic", () => {
  it("scores answers and tracks wrong ids", () => {
    const s = scoreQuiz(QS, { q1: 0, q2: 0, q3: 0 });
    expect(s).toMatchObject({ total: 3, correct: 2, wrongIds: ["q2"] });
    expect(s.byTopic.Links).toMatchObject({ total: 2, correct: 1 });
  });
  it("summarizes weak topics below 70%", () => {
    const s = scoreQuiz(QS, { q1: 0, q2: 0, q3: 0 });
    expect(summarizeWeakTopics(s)).toEqual(["Links"]);
    const perfect = scoreQuiz(QS, { q1: 0, q2: 1, q3: 0 });
    expect(summarizeWeakTopics(perfect)).toEqual([]);
  });
  it("derives a stable day index", () => {
    const a = deriveDayIndex("2026-10-10", 7);
    expect(deriveDayIndex("2026-10-10", 7)).toBe(a);
    expect(deriveDayIndex("2026-10-11", 7)).toBe((a + 1) % 7);
    expect(deriveDayIndex("x", 0)).toBe(0);
  });
});
