import { z } from "zod";

// 메모 입력 규칙. 서버(Server Action, API)에서 반드시 이 함수로 검증한다.
export const memoMaxLength = 200;

export const memoInput = z.object({
  text: z
    .string({ error: "메모 내용을 입력하세요." })
    .trim()
    .min(1, { error: "메모 내용을 입력하세요." })
    .max(memoMaxLength, { error: `메모는 ${memoMaxLength}자 이하로 입력하세요.` }),
});

export type MemoInput = z.infer<typeof memoInput>;

export type ParseResult = { ok: true; value: MemoInput } | { ok: false; error: string };

export function parseMemoInput(input: unknown): ParseResult {
  const result = memoInput.safeParse(input);
  if (result.success) return { ok: true, value: result.data };
  return { ok: false, error: result.error.issues[0]?.message ?? "입력이 올바르지 않습니다." };
}

/** URL 경로의 id("12")를 양의 정수로. 아니면 null. */
export function parseMemoId(raw: string): number | null {
  return /^[1-9][0-9]{0,9}$/.test(raw) ? Number(raw) : null;
}
