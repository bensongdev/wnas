import { afterEach, beforeEach, vi } from "vitest";
import { closeDb } from "@/lib/db";

/**
 * 통합 테스트용: 테스트마다 메모리 안의 새 PGlite DB를 연다(마이그레이션 자동 적용).
 * 실제 파일·외부 DB를 건드리지 않는다. 파일 맨 위에 `// @vitest-environment node`를 둔다.
 */
export function setupTestDb(): void {
  beforeEach(async () => {
    vi.stubEnv("DATABASE_URL", "memory://");
    vi.stubEnv("VERCEL", "");
    await closeDb();
  });
  afterEach(async () => {
    await closeDb();
    vi.unstubAllEnvs();
  });
}
