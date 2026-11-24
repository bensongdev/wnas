#!/usr/bin/env bash
# Vercel 배포: scripts/deploy.sh [preview|prod]   (기본 preview)
# 사람이 지시한 경우에만 실행한다. 순서: verify.sh all PASS → vercel deploy → 배포 URL에서 E2E 다시 실행 → 보고서.
# 최초 1회는 사람이 터미널에서 직접 로그인·연결한다(토큰을 저장소나 로그에 넣지 않기 위해):
#   npx vercel@66.6.0 login && npx vercel@66.6.0 link
# 종료 코드: 0 = 배포와 배포 후 검사 통과, 1 = 실패, 2 = 사용법/환경 오류.
set -uo pipefail
cd "$(dirname "$0")/.."
VERCEL="npx --yes vercel@66.6.0"
TARGET="${1:-preview}"
if [[ ! "$TARGET" =~ ^(preview|prod)$ ]]; then echo "사용법: scripts/deploy.sh [preview|prod]" >&2; exit 2; fi
if [[ ! -f .vercel/project.json ]]; then
  echo "Vercel 프로젝트가 연결되어 있지 않습니다. 터미널에서 직접 한 번 실행하세요:" >&2
  echo "  $VERCEL login && $VERCEL link" >&2
  exit 2
fi
if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  echo "참고: 커밋하지 않은 변경이 있습니다. 배포에는 지금 폴더의 파일이 그대로 올라갑니다."
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT=".artifacts/deploys/$STAMP"
mkdir -p "$OUT"
STATUS=0

echo "1/3 배포 전 검증 (verify.sh all)..."
./scripts/verify.sh all >"$OUT/verify.log" 2>&1
VERIFY_EXIT=$?
VERIFY_RUN="$(cat .artifacts/latest-run 2>/dev/null)"
if [[ $VERIFY_EXIT -ne 0 ]]; then
  VERIFY="FAIL ($VERIFY_RUN/verification.md 참고)"; DEPLOY="NOT RUN (배포 전 검증 실패)"; SMOKE="NOT RUN"; URL=""; STATUS=1
else
  VERIFY="PASS ($VERIFY_RUN)"
  echo "2/3 Vercel 배포 ($TARGET)..."
  FLAGS="--yes"; if [[ "$TARGET" == prod ]]; then FLAGS="--prod --yes"; fi
  # 표준 출력의 마지막 줄이 배포 URL이다. 진행 메시지(표준 오류)는 로그에만 남긴다.
  # shellcheck disable=SC2086
  URL="$($VERCEL deploy $FLAGS 2>"$OUT/vercel.log" | tail -1)"
  if [[ "$URL" =~ ^https:// ]]; then
    DEPLOY="PASS ($URL)"
    echo "3/3 배포 URL에서 E2E 검사..."
    WNAS_BASE_URL="$URL" WNAS_E2E_OUTPUT="$OUT/e2e" npx playwright test >"$OUT/e2e.log" 2>&1
    SMOKE_EXIT=$?
    REPORT=""; PASSED=0; FAILED=0; SHOTS=0
    while IFS='=' read -r k v; do
      case "$k" in REPORT) REPORT="$v" ;; PASSED) PASSED="$v" ;; FAILED) FAILED="$v" ;; SHOTS) SHOTS="$v" ;; esac
    done < <(node scripts/collect-evidence.mjs "$OUT/e2e/results.json" "$OUT")
    if [[ "$REPORT" == ok && $SMOKE_EXIT -eq 0 && $FAILED -eq 0 && $PASSED -gt 0 ]]; then
      SMOKE="PASS (통과 $PASSED, 스크린샷 ${SHOTS}장)"
    else
      SMOKE="FAIL (통과 $PASSED, 실패 $FAILED, e2e.log 참고)"; STATUS=1
      if grep -qE '401|Authentication Required|vercel.com/login' "$OUT/e2e.log" 2>/dev/null; then
        SMOKE="$SMOKE — 미리보기 배포 보호(Vercel Authentication) 때문일 수 있습니다"
      fi
    fi
  else
    DEPLOY="FAIL (vercel.log 참고)"; SMOKE="NOT RUN (배포 실패)"; STATUS=1
  fi
fi

if [[ $STATUS -eq 0 ]]; then OVERALL=PASS; else OVERALL=FAIL; fi
{
  echo "# 배포 보고서"
  echo
  echo "- 전체 결과: **$OVERALL** (exit $STATUS)"
  echo "- 실행 시각: $STAMP"
  echo "- 대상: $TARGET"
  echo "- 커밋: $(git rev-parse --short HEAD 2>/dev/null || echo 없음)$([[ -n "$(git status --porcelain 2>/dev/null)" ]] && echo ' (커밋하지 않은 변경 포함)')"
  echo "- 배포 전 검증: $VERIFY"
  echo "- 배포: $DEPLOY"
  echo "- 배포 URL E2E: $SMOKE"
  echo "- 화면 검토: PENDING (배포 URL의 스크린샷을 직접 열어 확인하세요)"
  if [[ -s "$OUT/e2e-screenshots.md" ]]; then echo; echo "## 스크린샷"; cat "$OUT/e2e-screenshots.md"; fi
  if [[ -s "$OUT/e2e-failures.md" ]]; then echo; echo "## 실패한 테스트"; cat "$OUT/e2e-failures.md"; fi
  echo
  echo "## 파일"
  echo "- verify.log, vercel.log, e2e.log, e2e/playwright-report/"
} >"$OUT/deploy-verification.md"
rm -f "$OUT"/e2e-*.md
printf '\n보고서: %s/deploy-verification.md\n' "$OUT"
cat "$OUT/deploy-verification.md"
exit "$STATUS"
