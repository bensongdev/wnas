#!/usr/bin/env bash
# AI 에이전트와 사람이 함께 쓰는 검증 진입점. macOS 기본 /bin/bash 3.2와 호환되어야 한다.
# 종료 코드: 0 = 실행한 검사 모두 통과, 1 = 검사 실패, 2 = 사용법/환경 오류.
# 모드: all(기본) = 린트 + 빌드 + 단위 테스트 + E2E(headless 브라우저, 화면 증거)
#       lint, build, unit = 해당 단계만, e2e = 빌드 + E2E
# 브라우저는 headless로 실행하므로 사용자의 마우스·키보드를 쓰지 않는다. 언제든 돌려도 된다.
set -uo pipefail
cd "$(dirname "$0")/.."
MODE="${1:-all}"
if [[ ! "$MODE" =~ ^(lint|build|unit|e2e|all)$ ]]; then echo "사용법: scripts/verify.sh [lint|build|unit|e2e|all]" >&2; exit 2; fi
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  echo "Node.js가 없습니다. 설치: brew install node@24 (docs/GETTING_STARTED.md 참고)" >&2; exit 2
fi
if [[ ! -f package.json || ! -f package-lock.json ]]; then echo "package.json/package-lock.json이 없습니다. 프로젝트 폴더에서 실행하세요" >&2; exit 2; fi
APP_NAME="$(node -p 'require("./package.json").name')"

# 검증은 한 번에 하나만: 빌드와 브라우저를 병렬로 돌리면 8GB 기기의 메모리가 부족해진다.
mkdir -p .artifacts
LOCK=".artifacts/verify.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "다른 verify.sh가 실행 중입니다($LOCK). 실행 중인 검증이 없다면 이 디렉터리를 지우세요: rmdir $LOCK" >&2; exit 2
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

STAMP="$(date +%Y%m%d-%H%M%S)"
RUN=".artifacts/runs/$STAMP"
mkdir -p "$RUN"
printf '%s\n' "$RUN" > .artifacts/latest-run
STATUS=0

# 의존성: lockfile 그대로 설치한다(npm ci). 이미 설치돼 있고 lockfile이 바뀌지 않았으면 건너뛴다.
if [[ ! -f node_modules/.package-lock.json || package-lock.json -nt node_modules/.package-lock.json ]]; then
  echo "의존성 설치 중 (npm ci)..."
  if ! npm ci --no-audit --no-fund >"$RUN/npm-ci.log" 2>&1; then
    echo "npm ci 실패: $RUN/npm-ci.log 참고" >&2; exit 2
  fi
fi

wants() { case " $1 " in *" $MODE "*) return 0 ;; *) return 1 ;; esac; }
# 각 단계를 실행하고 결과 문자열을 돌려준다: run_step <로그 이름> <명령...>
run_step() {
  local log="$1"; shift
  if "$@" >"$RUN/$log" 2>&1; then echo PASS; else echo "FAIL ($log 참고)"; fi
}

LINT="NOT RUN ($MODE 모드)"
if wants "lint all"; then
  ESLINT="$(run_step eslint.log npx eslint --max-warnings=0 .)"
  # LayoutProps 같은 라우트 타입은 생성 파일이라, 빌드 전에도 타입 검사가 되도록 먼저 만든다.
  TSC="$(run_step tsc.log sh -c 'npx next typegen && npx tsc --noEmit')"
  PRETTIER="$(run_step prettier.log npx prettier --check .)"
  LINT="ESLint $ESLINT, 타입 검사 $TSC, Prettier $PRETTIER"
  case "$LINT" in *FAIL*) STATUS=1 ;; esac
fi

BUILD="NOT RUN ($MODE 모드)"; WARNINGS="-"
if wants "build e2e all"; then
  BUILD="$(run_step build.log npx next build)"
  grep -E '⚠|[Ww]arning' "$RUN/build.log" | sort -u >"$RUN/warnings.log"
  WARNINGS=$(wc -l <"$RUN/warnings.log" | tr -d ' ')
  case "$BUILD" in FAIL*) STATUS=1 ;; esac
fi

UNIT="NOT RUN ($MODE 모드)"
if wants "unit all"; then
  npx vitest run --reporter=default --reporter=json --outputFile="$RUN/unit-results.json" >"$RUN/unit.log" 2>&1
  UNIT_EXIT=$?
  if [[ -f "$RUN/unit-results.json" ]]; then
    read -r U_PASS U_FAIL U_TOTAL < <(node -e '
      const r = require(process.argv[1]);
      console.log(r.numPassedTests, r.numFailedTests, r.numTotalTests)' "$PWD/$RUN/unit-results.json")
    if [[ $UNIT_EXIT -ne 0 || ${U_FAIL:-1} -gt 0 ]]; then UNIT="FAIL (통과 $U_PASS, 실패 $U_FAIL, unit.log 참고)"
    elif [[ ${U_TOTAL:-0} -eq 0 ]]; then UNIT="FAIL (테스트 0개)"
    else UNIT="PASS (통과 $U_PASS)"; fi
  else
    UNIT="FAIL (결과 파일 없음, unit.log 참고)"
  fi
  case "$UNIT" in FAIL*) STATUS=1 ;; esac
fi

# E2E: 프로덕션 빌드를 빈 포트에 띄우고 headless 브라우저로 실제 클릭 흐름을 검사한다.
E2E="NOT RUN ($MODE 모드)"; EVIDENCE="NOT RUN (E2E를 실행하지 않음)"; E2E_RAN=0
if wants "e2e all"; then
  if [[ "$BUILD" != PASS ]]; then
    E2E="NOT RUN (빌드 실패)"; EVIDENCE="NOT RUN (빌드 실패)"
  else
    E2E_RAN=1
    PORT="${WNAS_PORT:-$(node -e 'const s=require("net").createServer();s.listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')}"
    WNAS_PORT="$PORT" WNAS_E2E_OUTPUT="$RUN/e2e" npx playwright test >"$RUN/e2e.log" 2>&1
    E2E_EXIT=$?
    REPORT=""; PASSED=0; FAILED=0; SKIPPED=0; SHOTS=0; STRAY=0; DIAGNOSTICS=0; GLOBAL_ERRORS=0
    while IFS='=' read -r k v; do
      case "$k" in
        REPORT) REPORT="$v" ;; PASSED) PASSED="$v" ;; FAILED) FAILED="$v" ;; SKIPPED) SKIPPED="$v" ;;
        SHOTS) SHOTS="$v" ;; STRAY) STRAY="$v" ;; DIAGNOSTICS) DIAGNOSTICS="$v" ;; GLOBAL_ERRORS) GLOBAL_ERRORS="$v" ;;
      esac
    done < <(node scripts/collect-evidence.mjs "$RUN/e2e/results.json" "$RUN")
    if [[ "$REPORT" != ok ]]; then
      E2E="FAIL (결과 파일 없음, e2e.log 참고)"
      if grep -q "Executable doesn't exist" "$RUN/e2e.log"; then E2E="FAIL (브라우저 없음: npx playwright install chromium)"; fi
    elif [[ $E2E_EXIT -ne 0 || $FAILED -gt 0 || $GLOBAL_ERRORS -gt 0 ]]; then
      E2E="FAIL (통과 $PASSED, 실패 $FAILED, 전역 오류 $GLOBAL_ERRORS, e2e.log 참고)"
    elif [[ $PASSED -eq 0 ]]; then
      E2E="FAIL (통과한 테스트 0개)"
    else
      E2E="PASS (통과 $PASSED, 건너뜀 $SKIPPED)"
    fi
    case "$E2E" in FAIL*) STATUS=1 ;; esac

    # 화면 증거: 테스트가 이름 규칙(NN-상태-설명)으로 붙인 PNG만 스크린샷으로 인정한다.
    EVIDENCE="EXPORTED (스크린샷 ${SHOTS}장)"
    if [[ $DIAGNOSTICS -gt 0 ]]; then EVIDENCE="$EVIDENCE, 실패 진단 ${DIAGNOSTICS}개(failures/)"; fi
    if [[ $STRAY -gt 0 ]]; then
      EVIDENCE="FAIL (스크린샷 ${SHOTS}장, 이름 규칙 밖의 첨부 ${STRAY}개)"; STATUS=1
    elif [[ "$REPORT" == ok && $SHOTS -eq 0 ]]; then
      EVIDENCE="FAIL (E2E 테스트가 스크린샷을 남기지 않음)"; STATUS=1
    fi
  fi
fi

if [[ $STATUS -eq 0 ]]; then OVERALL=PASS; else OVERALL=FAIL; fi
section() { # section <제목> <파일> [설명]
  if [[ -s "$RUN/$2" ]]; then echo; echo "## $1"; if [[ -n "${3:-}" ]]; then echo "$3"; fi; cat "$RUN/$2"; fi
}
{
  echo "# 검증 보고서"
  echo
  echo "- 전체 결과: **$OVERALL** (exit $STATUS)"
  echo "- 실행 시각: $STAMP"
  echo "- 모드: $MODE"
  echo "- 앱: $APP_NAME"
  echo "- 실행 환경: $(uname -s) $(uname -r), Node $(node -v), npm $(npm -v)"
  echo "- Next.js $(node -p 'require("next/package.json").version' 2>/dev/null), Playwright $(node -p 'require("@playwright/test/package.json").version' 2>/dev/null)"
  echo "- 린트: $LINT"
  echo "- 빌드 (next build): $BUILD"
  echo "- 빌드 경고: ${WARNINGS}건 (warnings.log 참고, 실패로 처리하지 않음)"
  echo "- 단위 테스트 (Vitest): $UNIT"
  echo "- E2E 테스트 (Playwright, headless): $E2E"
  echo "- 스크린샷 추출: $EVIDENCE"
  echo "- 화면 검토: PENDING (스크린샷을 직접 열어 확인하세요. 파일이 있다고 화면이 정상인 것은 아닙니다)"
  echo "- 검증하지 않은 것: Chromium 외 브라우저(Safari, Firefox), 실제 배포 환경, 실제 외부 API"
  if [[ $E2E_RAN -eq 1 ]]; then
    section "실패한 E2E 테스트" e2e-failures.md
    section "E2E 전역 오류" e2e-errors.md
    section "이름 규칙 밖의 첨부 (FAIL)" e2e-stray.md "스크린샷은 e2e/evidence.ts의 capture()로 NN-상태-설명 이름을 붙여 남기세요."
    section "실패 진단 (trace, 영상, 실패 화면)" e2e-diagnostics.md \
      "실패한 테스트의 브라우저 페이지만 담깁니다. trace는 npx playwright show-trace <파일>로 엽니다."
    section "스크린샷 (프로젝트/테스트별)" e2e-screenshots.md
  fi
  echo
  echo "## 파일"
  echo "- eslint.log, tsc.log, prettier.log, build.log, warnings.log, unit.log, unit-results.json"
  echo "- e2e.log, e2e/results.json, e2e/playwright-report/index.html (npx playwright show-report $RUN/e2e/playwright-report)"
  echo
  echo "## 사람 검토 체크리스트"
  echo "- [ ] 필요한 상태가 모두 캡처되어 있고 열어 볼 수 있다 (데스크톱·모바일)"
  echo "- [ ] 잘림, 겹침, 깨진 글자가 없다"
  echo "- [ ] 동작이 이미지뿐 아니라 assertion과 로그로 입증된다"
  echo "- [ ] 증거에 비밀 정보나 개인 정보가 없다"
} > "$RUN/verification.md"
rm -f "$RUN"/e2e-*.md
printf '\n보고서: %s/verification.md\n' "$RUN"
cat "$RUN/verification.md"
exit "$STATUS"
