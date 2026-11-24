// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { setupTestDb } from "@/test/db";
import { DELETE } from "./[id]/route";
import { GET, POST } from "./route";

// connection()은 Next 요청 안에서만 동작하므로 단독 실행하는 라우트 테스트에서는 비운다.
vi.mock("next/server", () => ({ connection: async () => {} }));

setupTestDb();

const post = (body: string) =>
  POST(
    new Request("http://test/api/memos", {
      method: "POST",
      body,
      headers: { "content-type": "application/json" },
    }),
  );
const del = (id: string) =>
  DELETE(new Request(`http://test/api/memos/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });

describe("/api/memos", () => {
  it("POST 201: 공백을 지워 저장하고 GET 목록에 나온다", async () => {
    const created = await post(JSON.stringify({ text: "  우유 사기 " }));
    expect(created.status).toBe(201);
    const { memo } = await created.json();
    expect(memo.text).toBe("우유 사기");

    const listed = await GET();
    expect(listed.status).toBe(200);
    expect((await listed.json()).memos.map((m: { text: string }) => m.text)).toEqual(["우유 사기"]);
  });

  it("POST 400: 빈 내용, 잘못된 JSON", async () => {
    const empty = await post(JSON.stringify({ text: " " }));
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: "메모 내용을 입력하세요." });
    expect((await post("not json")).status).toBe(400);
  });

  it("DELETE 204 → 다시 지우면 404, 잘못된 id는 400", async () => {
    const { memo } = await (await post(JSON.stringify({ text: "지울 것" }))).json();
    expect((await del(String(memo.id))).status).toBe(204);
    expect((await del(String(memo.id))).status).toBe(404);
    expect((await del("abc")).status).toBe(400);
  });

  it("Vercel에서 DATABASE_URL이 없으면 503", async () => {
    const { closeDb } = await import("@/lib/db");
    await closeDb();
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("VERCEL", "1");
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "DB가 연결되지 않았습니다." });
  });
});
