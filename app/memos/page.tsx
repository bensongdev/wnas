import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { MemoForm } from "@/components/memo-form";
import { DbNotConfiguredError } from "@/lib/db";
import { listMemos } from "@/lib/db/memos";
import { removeMemo } from "./actions";

export const metadata: Metadata = { title: "메모" };

// 서버 예제: 목록은 서버 컴포넌트가 DB에서 읽고, 추가·삭제는 Server Action이 처리한다.
export default function MemosPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-12">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">메모</h1>
        <Link href="/" className="text-blue-700 underline">
          처음으로
        </Link>
      </div>
      <MemoForm />
      <Suspense fallback={<p>불러오는 중…</p>}>
        <MemoList />
      </Suspense>
    </main>
  );
}

async function MemoList() {
  await connection(); // 요청마다 DB를 읽는다(빌드 때 미리 그리지 않음)
  let memos;
  try {
    memos = await listMemos();
  } catch (error) {
    if (error instanceof DbNotConfiguredError) {
      return <p role="status">DB가 연결되지 않았습니다. 관리자에게 문의하세요.</p>;
    }
    throw error;
  }
  if (memos.length === 0) {
    return <p data-testid="memo-empty">아직 메모가 없습니다.</p>;
  }
  return (
    <ul className="flex flex-col gap-2" aria-label="메모 목록">
      {memos.map((memo) => (
        <li
          key={memo.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-300 px-4 py-3"
        >
          <span className="break-all">{memo.text}</span>
          <form action={removeMemo}>
            <input type="hidden" name="id" value={memo.id} />
            <button
              type="submit"
              className="shrink-0 rounded-md border border-zinc-400 px-3 py-1 text-sm hover:bg-zinc-100"
              aria-label={`"${memo.text}" 삭제`}
            >
              삭제
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
