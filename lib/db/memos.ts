import { desc, eq } from "drizzle-orm";
import type { MemoInput } from "@/lib/memos";
import { getDb } from "./index";
import { memos, type Memo } from "./schema";

// 메모 저장소. DB 접근은 lib/db/ 안에서만 한다.

export async function listMemos(): Promise<Memo[]> {
  const db = await getDb();
  return db.select().from(memos).orderBy(desc(memos.createdAt), desc(memos.id));
}

export async function createMemo(input: MemoInput): Promise<Memo> {
  const db = await getDb();
  const [row] = await db.insert(memos).values({ text: input.text }).returning();
  return row;
}

/** 지웠으면 true, 없는 id면 false. */
export async function deleteMemo(id: number): Promise<boolean> {
  const db = await getDb();
  const rows = await db.delete(memos).where(eq(memos.id, id)).returning({ id: memos.id });
  return rows.length > 0;
}
