// @vitest-environment node
import { describe, expect, it } from "vitest";
import { setupTestDb } from "@/test/db";
import { createMemo, deleteMemo, listMemos } from "./memos";

setupTestDb();

describe("메모 저장소 (PGlite)", () => {
  it("처음에는 비어 있다", async () => {
    expect(await listMemos()).toEqual([]);
  });

  it("추가한 메모를 최신순으로 돌려준다", async () => {
    await createMemo({ text: "첫째" });
    await createMemo({ text: "둘째" });
    expect((await listMemos()).map((m) => m.text)).toEqual(["둘째", "첫째"]);
  });

  it("삭제하면 true, 없는 id는 false", async () => {
    const memo = await createMemo({ text: "지울 것" });
    expect(await deleteMemo(memo.id)).toBe(true);
    expect(await deleteMemo(memo.id)).toBe(false);
    expect(await listMemos()).toEqual([]);
  });
});
