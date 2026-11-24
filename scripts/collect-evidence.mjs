// Playwright JSON 보고서(results.json)에서 테스트 합계와 첨부를 읽어 실행 폴더에 정리한다.
// 사용법: node scripts/collect-evidence.mjs <results.json> <실행 폴더>
// 출력(표준 출력, 셸에서 읽음): KEY=값 줄. 상세 목록은 <실행 폴더>/e2e-*.md 파일로 쓴다.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const [resultsPath, runDir] = process.argv.slice(2);
if (!resultsPath || !runDir) {
  console.error("사용법: node scripts/collect-evidence.mjs <results.json> <실행 폴더>");
  process.exit(2);
}
if (!existsSync(resultsPath)) {
  console.log("REPORT=missing");
  process.exit(0);
}

const report = JSON.parse(readFileSync(resultsPath, "utf8"));
const SHOT_NAME = /^[0-9]{2}-[a-z0-9-]+$/;
// Playwright가 실패한 테스트에만 남기는 진단(브라우저 페이지만 담김). 성공한 테스트에 있으면 이상한 것이다.
const DIAGNOSTIC = new Set(["trace", "video", "screenshot", "error-context"]);
const slug = (s) => s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

let passed = 0;
let failed = 0;
let skipped = 0;
const shots = [];
const apis = [];
const stray = [];
const diagnostics = [];
const failures = [];

function visit(suite, parents) {
  for (const spec of suite.specs ?? []) {
    const title = [...parents, spec.title].filter(Boolean).join(" › ");
    for (const t of spec.tests) {
      const result = t.results.at(-1);
      const status = result?.status ?? "skipped";
      if (status === "skipped") skipped++;
      else if (t.status === "expected") passed++;
      else failed++;
      if (t.status === "unexpected" || t.status === "flaky") {
        const message = (result?.error?.message ?? "").split("\n")[0].replace(/\u001b\[[0-9;]*m/g, "");
        failures.push(`[${t.projectName}] ${title}: ${message}`);
      }
      for (const r of t.results) {
        for (const a of r.attachments ?? []) {
          const where = `[${t.projectName}] ${title}`;
          if (SHOT_NAME.test(a.name) && a.contentType === "image/png" && a.path && existsSync(a.path)) {
            const dir = join(runDir, "screenshots", t.projectName, slug(title));
            mkdirSync(dir, { recursive: true });
            const dest = join(dir, `${a.name}.png`);
            copyFileSync(a.path, dest);
            shots.push(dest.slice(runDir.length + 1));
          } else if (
            SHOT_NAME.test(a.name) &&
            a.contentType === "application/json" &&
            a.path &&
            existsSync(a.path)
          ) {
            const dir = join(runDir, "api", t.projectName, slug(title));
            mkdirSync(dir, { recursive: true });
            const dest = join(dir, `${a.name}.json`);
            copyFileSync(a.path, dest);
            apis.push(dest.slice(runDir.length + 1));
          } else if (DIAGNOSTIC.has(a.name) && r.status !== "passed" && a.path && existsSync(a.path)) {
            const dir = join(runDir, "failures", t.projectName, slug(title));
            mkdirSync(dir, { recursive: true });
            const dest = join(dir, `${a.name}${extname(a.path) || ""}`);
            copyFileSync(a.path, dest);
            diagnostics.push(dest.slice(runDir.length + 1));
          } else {
            stray.push(`${a.name}${a.path ? ` (${basename(a.path)})` : ""} — ${where}`);
          }
        }
      }
    }
  }
  for (const child of suite.suites ?? []) visit(child, [...parents, child.title]);
}
for (const s of report.suites ?? []) visit(s, []);

const list = (items) => items.map((i) => `- ${i}`).join("\n") + (items.length ? "\n" : "");
writeFileSync(join(runDir, "e2e-screenshots.md"), list(shots));
writeFileSync(join(runDir, "e2e-api.md"), list(apis));
writeFileSync(join(runDir, "e2e-stray.md"), list(stray));
writeFileSync(join(runDir, "e2e-diagnostics.md"), list(diagnostics));
writeFileSync(join(runDir, "e2e-failures.md"), list(failures));
const errors = (report.errors ?? []).map((e) => (e.message ?? "").split("\n")[0]);
writeFileSync(join(runDir, "e2e-errors.md"), list(errors));

console.log(`REPORT=ok`);
console.log(`PASSED=${passed}`);
console.log(`FAILED=${failed}`);
console.log(`SKIPPED=${skipped}`);
console.log(`SHOTS=${shots.length}`);
console.log(`API=${apis.length}`);
console.log(`STRAY=${stray.length}`);
console.log(`DIAGNOSTICS=${diagnostics.length}`);
console.log(`GLOBAL_ERRORS=${errors.length}`);
