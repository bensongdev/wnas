"use server";

import { refresh } from "next/cache";
import { DbNotConfiguredError } from "@/lib/db";
import { createMemo, deleteMemo } from "@/lib/db/memos";
import { parseMemoId, parseMemoInput } from "@/lib/memos";

// Server Action은 누구나 호출할 수 있는 공개 엔드포인트다. 입력을 항상 서버에서 다시 검증한다.

export type MemoFormState = { error?: string };

export async function addMemo(_prev: MemoFormState, formData: FormData): Promise<MemoFormState> {
  const parsed = parseMemoInput({ text: formData.get("text") });
  if (!parsed.ok) return { error: parsed.error };
  try {
    await createMemo(parsed.value);
  } catch (error) {
    if (error instanceof DbNotConfiguredError) return { error: "DB가 연결되지 않아 저장할 수 없습니다." };
    throw error;
  }
  refresh();
  return {};
}

export async function removeMemo(formData: FormData): Promise<void> {
  const id = parseMemoId(String(formData.get("id") ?? ""));
  if (id === null) return;
  await deleteMemo(id);
  refresh();
}
