import { describe, expect, it } from "vitest";
import { memoMaxLength, parseMemoId, parseMemoInput } from "./memos";

describe("parseMemoInput", () => {
  it("앞뒤 공백을 지운다", () => {
    expect(parseMemoInput({ text: "  장보기  " })).toEqual({ ok: true, value: { text: "장보기" } });
  });

  it("비었거나 공백뿐이면 거부한다", () => {
    expect(parseMemoInput({ text: "   " })).toEqual({ ok: false, error: "메모 내용을 입력하세요." });
    expect(parseMemoInput({})).toEqual({ ok: false, error: "메모 내용을 입력하세요." });
    expect(parseMemoInput(null).ok).toBe(false);
  });

  it(`${memoMaxLength}자까지 허용하고 넘으면 거부한다`, () => {
    expect(parseMemoInput({ text: "가".repeat(memoMaxLength) }).ok).toBe(true);
    expect(parseMemoInput({ text: "가".repeat(memoMaxLength + 1) })).toEqual({
      ok: false,
      error: `메모는 ${memoMaxLength}자 이하로 입력하세요.`,
    });
  });
});

describe("parseMemoId", () => {
  it("양의 정수만 받는다", () => {
    expect(parseMemoId("12")).toBe(12);
    for (const bad of ["0", "-1", "1.5", "abc", "", "01"]) expect(parseMemoId(bad)).toBeNull();
  });
});
