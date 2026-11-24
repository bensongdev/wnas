"use client";

import { useActionState } from "react";
import { addMemo, type MemoFormState } from "@/app/memos/actions";
import { memoMaxLength } from "@/lib/memos";

export function MemoForm() {
  const [state, action, pending] = useActionState<MemoFormState, FormData>(addMemo, {});

  return (
    <form action={action} className="flex w-full flex-col gap-2">
      <label htmlFor="memo-text" className="font-medium">
        새 메모
      </label>
      <div className="flex gap-2">
        {/* 길이 제한은 서버에서 검사한다(브라우저 제한만 믿지 않음). 그래서 maxLength 속성을 두지 않는다. */}
        <input
          id="memo-text"
          name="text"
          className="min-w-0 flex-1 rounded-lg border border-zinc-400 px-3 py-2"
          placeholder={`${memoMaxLength}자 이하`}
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "memo-error" : undefined}
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-700 px-5 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          추가
        </button>
      </div>
      {state.error ? (
        <p id="memo-error" role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
