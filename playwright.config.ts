import { defineConfig, devices } from "@playwright/test";

// scripts/verify.sh가 환경 변수로 포트와 결과 폴더를 넘긴다.
// - WNAS_BASE_URL이 있으면 이미 떠 있는 주소(예: 배포 URL)를 검사하고 서버를 띄우지 않는다.
// - 없으면 `next build`가 끝난 상태에서 `next start`로 프로덕션 서버를 띄운다.
const port = Number(process.env.WNAS_PORT ?? 3100);
const externalBaseURL = process.env.WNAS_BASE_URL;
const outputDir = process.env.WNAS_E2E_OUTPUT ?? ".artifacts/e2e-local";

export default defineConfig({
  testDir: "./e2e",
  outputDir: `${outputDir}/test-results`,
  fullyParallel: false,
  workers: 1, // 8GB 기기: 브라우저를 하나씩만 띄운다
  forbidOnly: true,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: `${outputDir}/results.json` }],
    ["html", { outputFolder: `${outputDir}/playwright-report`, open: "never" }],
  ],
  use: {
    baseURL: externalBaseURL ?? `http://127.0.0.1:${port}`,
    headless: true, // 화면에 창을 띄우지 않는다: 사용자의 마우스·키보드를 쓰지 않는다
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    colorScheme: "light",
    // 실패한 테스트만 브라우저 화면의 trace·영상·스크린샷을 남긴다(브라우저 페이지만 찍힌다).
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    // 보호된 Vercel 미리보기 배포를 검사할 때만 쓴다(scripts/deploy.sh). 값은 환경 변수로만 받는다.
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npx next start -H 127.0.0.1 -p ${port}`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: false,
        timeout: 60_000,
      },
});
