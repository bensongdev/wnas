#!/usr/bin/env bash
# 서버 예제(메모 API, DB)와 서버 패키지를 지워 화면만 있는 프로젝트로 만든다: scripts/remove-server.sh
# new-project.sh가 명세의 "서버: 없음"(또는 --no-server)일 때 새 프로젝트에서 실행한다. 템플릿(wnas)에서는 실행하지 않는다.
# 나중에 서버가 필요해지면 /spec으로 명세를 바꾸고, WNAS 템플릿의 같은 파일을 참고해 다시 추가한다.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f .wnas-template ]]; then echo "템플릿 저장소에서는 실행하지 않습니다 (.wnas-template 있음)" >&2; exit 2; fi

while IFS= read -r path; do
  case "$path" in ''|'#'*) continue ;; esac
  rm -rf -- "$path"
done < scripts/server-files.txt
rmdir test 2>/dev/null || true

# 표시 구간(server-example:start ~ end)과 "// server-example"로 끝나는 줄을 지운다.
for f in app/page.tsx next.config.ts .env.example; do
  [[ -f "$f" ]] || continue
  sed -i '' -e '/server-example:start/,/server-example:end/d' -e '/\/\/ server-example$/d' "$f"
done

# package.json의 DB 스크립트를 지우고 서버 패키지를 제거한다(lockfile도 함께 갱신).
node -e '
  const fs = require("fs"), p = JSON.parse(fs.readFileSync("package.json", "utf8"));
  for (const k of ["db:generate", "db:migrate", "vercel-build"]) delete p.scripts[k];
  fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");'
# npm 10.9의 의존성 해석 버그를 피하려고 npm 11로 실행한다.
npx --yes npm@11 uninstall --no-audit --no-fund \
  drizzle-orm @electric-sql/pglite @neondatabase/serverless zod drizzle-kit >/dev/null

rm -f scripts/server-files.txt scripts/remove-server.sh
echo "서버 예제와 DB 패키지를 지웠습니다. 다음 단계: scripts/verify.sh all"
