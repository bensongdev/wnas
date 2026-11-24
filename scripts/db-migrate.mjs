// drizzle/의 마이그레이션을 DATABASE_URL의 DB에 적용한다: npm run db:migrate
// - postgres:// → Neon(배포 DB). 프로덕션 DB에 적용하는 것은 사람이 승인한 경우에만 한다(AGENTS.md).
// - 없으면 로컬 PGlite(.data/pglite), 경로나 memory:// 이면 그 PGlite.
const url = process.env.DATABASE_URL?.trim();

if (url && /^postgres(ql)?:\/\//.test(url)) {
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const { migrate } = await import("drizzle-orm/neon-http/migrator");
  await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
  console.log("마이그레이션 적용 완료 (Neon)");
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(url || ".data/pglite");
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  await client.close();
  console.log(`마이그레이션 적용 완료 (PGlite: ${url || ".data/pglite"})`);
}
