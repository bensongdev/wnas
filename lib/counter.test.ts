import { describe, expect, it } from "vitest";
import { countLabel, increment, initialCount, maxCount, reset } from "./counter";

describe("counter", () => {
  it("1씩 증가한다", () => {
    expect(increment(initialCount)).toBe(1);
    expect(increment(41)).toBe(42);
  });

  it("최댓값을 넘지 않는다", () => {
    expect(increment(maxCount)).toBe(maxCount);
  });

  it("초기화하면 시작 값으로 돌아간다", () => {
    expect(reset()).toBe(initialCount);
  });

  it("표시 문자열", () => {
    expect(countLabel(3)).toBe("3번 눌렀습니다");
  });
});
