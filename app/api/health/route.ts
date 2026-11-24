import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { DbNotConfiguredError, getDb } from "@/lib/db";

// 배포 후 확인용(scripts/deploy.sh). 200 { ok: true, db: "ok" } | 503 { ok: false, db: "not-configured" | "error" }
export async function GET(): Promise<Response> {
  await connection();
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: "ok" });
  } catch (error) {
    const db = error instanceof DbNotConfiguredError ? "not-configured" : "error";
    if (db === "error") console.error(error);
    return Response.json({ ok: false, db }, { status: 503 });
  }
}
