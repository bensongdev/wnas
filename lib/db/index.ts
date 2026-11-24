// DB 연결. 서버 코드에서만 쓴다(클라이언트 컴포넌트에서 import하지 않는다).
// - DATABASE_URL이 postgres:// 또는 postgresql:// 이면 Neon(배포)
// - 없으면 로컬 PGlite(.data/pglite), 경로나 memory:// 이면 그 위치의 PGlite(테스트·검증)
// - Vercel에서 DATABASE_URL이 없으면 연결하지 않고 DbNotConfiguredError를 던진다(읽기 전용 파일 시스템이라 PGlite를 쓸 수 없다).
// PGlite는 열 때 drizzle/ 마이그레이션을 자동으로 적용한다. Neon은 `npm run db:migrate`(배포 빌드)로 적용한다.
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type Db = PgliteDatabase<typeof schema>;

export class DbNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL이 설정되지 않았습니다. Vercel 프로젝트에 Neon Postgres를 연결하세요.");
    this.name = "DbNotConfiguredError";
  }
}

const LOCAL_DIR = ".data/pglite";
const isRemote = (url: string) => /^postgres(ql)?:\/\//.test(url);

type Opened = { db: Db; close: () => Promise<void> };
let opening: Promise<Opened> | undefined;

async function open(): Promise<Opened> {
  const url = process.env.DATABASE_URL?.trim();
  if (url && isRemote(url)) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    // neon-http와 pglite의 쿼리 API는 같다. 타입은 하나(Db)로 맞춘다.
    const db = drizzle(neon(url), { schema }) as unknown as Db;
    return { db, close: async () => {} };
  }
  if (!url && process.env.VERCEL) throw new DbNotConfiguredError();

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(url || LOCAL_DIR);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "drizzle" });
  return { db, close: () => client.close() };
}

export async function getDb(): Promise<Db> {
  opening ??= open().catch((error: unknown) => {
    opening = undefined; // 다음 요청에서 다시 시도한다
    throw error;
  });
  return (await opening).db;
}

/** 테스트에서 DB를 새로 열 때 쓴다. */
export async function closeDb(): Promise<void> {
  const current = opening;
  opening = undefined;
  if (current) await (await current.catch(() => undefined))?.close();
}
