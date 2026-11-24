import { defineConfig } from "drizzle-kit";

// 마이그레이션 생성 설정. `npm run db:generate`가 lib/db/schema.ts와 drizzle/을 비교해 SQL을 만든다.
// WNAS_DRIZZLE_OUT은 verify.sh가 "마이그레이션 누락" 검사용 임시 폴더를 지정할 때만 쓴다.
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: process.env.WNAS_DRIZZLE_OUT ?? "./drizzle",
});
