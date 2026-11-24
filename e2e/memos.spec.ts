import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { attachJson, capture } from "./evidence";

// 서버 예제(메모) E2E. verify.sh는 실행마다 새 DB로 서버를 띄운다.
// 배포 URL(WNAS_BASE_URL)을 검사할 때는 실제 데이터를 쓰지 않도록 쓰기 테스트를 건너뛴다.
const external = Boolean(process.env.WNAS_BASE_URL);

test("메모 화면: 빈 상태 → 추가 → 검증 오류 → 삭제", async ({ page }, testInfo) => {
  test.skip(external, "배포 URL에서는 데이터를 쓰지 않음");
  const text = `장보기 (${testInfo.project.name})`;
  await page.goto("/memos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("메모");
  await expect(page.getByTestId("memo-empty")).toHaveText("아직 메모가 없습니다.");
  await capture(page, testInfo, "01-memos-empty");

  await page.getByLabel("새 메모").fill(`  ${text}  `);
  await page.getByRole("button", { name: "추가" }).click();
  const list = page.getByRole("list", { name: "메모 목록" });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list.getByRole("listitem").first()).toContainText(text);
  await expect(page.getByLabel("새 메모")).toHaveValue("");
  await capture(page, testInfo, "02-memo-added");

  await page.getByLabel("새 메모").fill("   ");
  await page.getByRole("button", { name: "추가" }).click();
  // Next.js의 경로 안내용 role="alert" 요소가 따로 있어, 오류 문구는 id로 찾고 역할을 확인한다.
  const error = page.locator("#memo-error");
  await expect(error).toHaveText("메모 내용을 입력하세요.");
  await expect(error).toHaveAttribute("role", "alert");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await capture(page, testInfo, "03-memo-invalid");

  await page.getByRole("button", { name: `"${text}" 삭제` }).click();
  await expect(page.getByTestId("memo-empty")).toHaveText("아직 메모가 없습니다.");
  await capture(page, testInfo, "04-memo-deleted");
});

test("메모 API: 생성 201 → 목록 → 삭제 204 → 다시 삭제 404, 검증 오류 400", async ({ request }, testInfo) => {
  test.skip(external, "배포 URL에서는 데이터를 쓰지 않음");
  test.skip(testInfo.project.name !== "desktop", "API는 화면 크기와 무관하므로 한 번만 실행");

  const created = await request.post("/api/memos", { data: { text: " API 메모 " } });
  expect(created.status()).toBe(201);
  const { memo } = await created.json();
  expect(memo.text).toBe("API 메모");
  await attachJson(testInfo, "01-api-create", { status: created.status(), body: { memo } });

  const listed = await request.get("/api/memos");
  expect(listed.status()).toBe(200);
  expect((await listed.json()).memos.map((m: { id: number }) => m.id)).toContain(memo.id);

  const invalid = await request.post("/api/memos", { data: { text: "" } });
  expect(invalid.status()).toBe(400);
  const invalidBody = await invalid.json();
  expect(invalidBody).toEqual({ error: "메모 내용을 입력하세요." });
  await attachJson(testInfo, "02-api-invalid", { status: invalid.status(), body: invalidBody });

  expect((await request.delete(`/api/memos/${memo.id}`)).status()).toBe(204);
  const missing = await request.delete(`/api/memos/${memo.id}`);
  expect(missing.status()).toBe(404);
  await attachJson(testInfo, "03-api-delete-missing", {
    status: missing.status(),
    body: await missing.json(),
  });
});

test("헬스 체크: DB 연결 정상", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "한 번만 실행");
  const res = await request.get("/api/health");
  const body = await res.json();
  expect(body).toEqual({ ok: true, db: "ok" });
  expect(res.status()).toBe(200);
});

test("메모 화면 접근성: serious 이상 위반 없음", async ({ page }) => {
  await page.goto("/memos");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("메모");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
