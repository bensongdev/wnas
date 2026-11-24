import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { capture } from "./evidence";

test("초기 → 증가 → 초기화 상태와 화면 증거", async ({ page }, testInfo) => {
  await page.goto("/");
  const count = page.getByTestId("count");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("WebStarter");
  await expect(count).toHaveText("0번 눌렀습니다");
  await capture(page, testInfo, "01-initial");

  await page.getByRole("button", { name: "증가" }).click();
  await page.getByRole("button", { name: "증가" }).click();
  await expect(count).toHaveText("2번 눌렀습니다");
  await capture(page, testInfo, "02-after-increment");

  await page.getByRole("button", { name: "초기화" }).click();
  await expect(count).toHaveText("0번 눌렀습니다");
  await capture(page, testInfo, "03-after-reset");
});

test("접근성 검사: serious 이상 위반 없음", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
