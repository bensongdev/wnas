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
