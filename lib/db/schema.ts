import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// DB 테이블 정의. 바꾼 뒤에는 `npm run db:generate`로 마이그레이션(drizzle/)을 만들어 함께 커밋한다.
export const memos = pgTable("memos", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Memo = typeof memos.$inferSelect;
