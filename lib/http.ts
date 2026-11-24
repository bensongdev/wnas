import { DbNotConfiguredError } from "@/lib/db";

// API 응답 도우미. 오류 응답에 내부 오류 메시지(쿼리, 경로 등)를 넣지 않는다.

export function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

/** DB 관련 예외를 응답으로 바꾼다. 설정 누락은 503, 그 밖은 500(서버 로그에만 자세히 남김). */
export function dbErrorResponse(error: unknown): Response {
  if (error instanceof DbNotConfiguredError) return jsonError(503, "DB가 연결되지 않았습니다.");
  console.error(error);
  return jsonError(500, "서버 오류가 발생했습니다.");
}
