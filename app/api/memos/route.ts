import { connection } from "next/server";
import { createMemo, listMemos } from "@/lib/db/memos";
import { dbErrorResponse, jsonError } from "@/lib/http";
import { parseMemoInput } from "@/lib/memos";

// GET /api/memos → 200 { memos: [...] }
export async function GET(): Promise<Response> {
  await connection(); // 요청마다 실행(빌드 때 미리 만들지 않음)
  try {
    return Response.json({ memos: await listMemos() });
  } catch (error) {
    return dbErrorResponse(error);
  }
}

// POST /api/memos { text } → 201 { memo } | 400 { error }
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "JSON 본문이 필요합니다.");
  }
  const parsed = parseMemoInput(body);
  if (!parsed.ok) return jsonError(400, parsed.error);
  try {
    return Response.json({ memo: await createMemo(parsed.value) }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error);
  }
}
