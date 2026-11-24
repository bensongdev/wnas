"use client";

import { useState } from "react";
import { countLabel, increment, initialCount, maxCount, reset } from "@/lib/counter";

// 상태를 가진 클라이언트 컴포넌트. 테스트와 미리보기를 위해 시작 값을 받을 수 있다.
export function Counter({ start = initialCount }: { start?: number }) {
  const [count, setCount] = useState(start);

  return (
    <section className="flex flex-col items-center gap-6" aria-label="카운터">
      <p className="text-4xl font-semibold tabular-nums" data-testid="count" aria-live="polite">
        {countLabel(count)}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          className="rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          onClick={() => setCount(increment)}
          disabled={count >= maxCount}
        >
          증가
        </button>
        <button
          type="button"
          className="rounded-lg border border-zinc-400 px-5 py-2.5 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          onClick={() => setCount(reset())}
        >
          초기화
        </button>
      </div>
    </section>
  );
}
