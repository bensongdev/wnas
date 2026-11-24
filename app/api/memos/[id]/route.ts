import { deleteMemo } from "@/lib/db/memos";
import { dbErrorResponse, jsonError } from "@/lib/http";
import { parseMemoId } from "@/lib/memos";

// DELETE /api/memos/:id → 204 | 400(잘못된 id) | 404(없음)
export async function DELETE(_request: Request, ctx: RouteContext<"/api/memos/[id]">): Promise<Response> {
  const id = parseMemoId((await ctx.params).id);
  if (id === null) return jsonError(400, "id가 올바르지 않습니다.");
  try {
    return (await deleteMemo(id)) ? new Response(null, { status: 204 }) : jsonError(404, "메모가 없습니다.");
  } catch (error) {
    return dbErrorResponse(error);
  }
}
