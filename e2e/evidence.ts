import { writeFile } from "node:fs/promises";
import type { Page, TestInfo } from "@playwright/test";

/**
 * 상태를 assertion으로 확인한 뒤 화면 증거를 남긴다.
 * 이름은 `NN-상태-설명` 형식(예: `02-after-increment`). 이 형식이 아니면 verify.sh가 FAIL 처리한다.
 * 전체 페이지를 찍는다. 브라우저 페이지만 찍히므로 다른 앱 화면은 섞이지 않는다.
 */
export async function capture(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  if (!/^[0-9]{2}-[a-z0-9-]+$/.test(name)) {
    throw new Error(`스크린샷 이름은 NN-상태-설명 형식이어야 합니다: ${name}`);
  }
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

/**
 * API 응답 같은 데이터 증거를 JSON으로 남긴다. 이름 규칙은 스크린샷과 같다(예: `01-api-create`).
 * 비밀 값·개인 정보가 들어 있는 응답은 남기지 않는다.
 */
export async function attachJson(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
  if (!/^[0-9]{2}-[a-z0-9-]+$/.test(name)) {
    throw new Error(`증거 이름은 NN-상태-설명 형식이어야 합니다: ${name}`);
  }
  const path = testInfo.outputPath(`${name}.json`);
  await writeFile(path, JSON.stringify(data, null, 2) + "\n");
  await testInfo.attach(name, { path, contentType: "application/json" });
}
