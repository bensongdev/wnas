// Vercel 빌드 명령(package.json의 vercel-build). DATABASE_URL이 있을 때만 마이그레이션을 적용하고 빌드한다.
// DATABASE_URL이 없으면(Neon 미연결) 빌드만 한다. 사이트는 뜨고 DB 기능은 "DB 미설정" 안내를 보여 준다.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
if (process.env.DATABASE_URL) run("node scripts/db-migrate.mjs");
else console.log("DATABASE_URL 없음: 마이그레이션을 건너뜁니다.");
run("next build");
