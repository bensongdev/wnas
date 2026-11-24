#!/usr/bin/env bash
# 제품 명세 형식 검사: scripts/check-spec.sh [--draft] <명세.md>
# 기본: 구현/프로젝트 생성 전 검사. 상태가 "승인"이고 미결 질문이 없어야 통과한다.
# --draft: 초안 검사. 상태와 미결 질문은 보지 않고 형식만 본다 (AI가 초안을 쓴 직후).
# 종료 코드: 0 통과, 1 명세 문제, 2 사용법 오류.
set -euo pipefail
DRAFT=0
if [[ "${1:-}" == "--draft" ]]; then DRAFT=1; shift; fi
SPEC="${1:-}"
if [[ -z "$SPEC" || ! -f "$SPEC" ]]; then
  echo "사용법: $(basename "$0") [--draft] <명세.md>" >&2
  exit 2
fi

PROBLEMS=0
problem() { echo "  - $1"; PROBLEMS=$((PROBLEMS + 1)); }
# 한 줄짜리 HTML 주석(<!-- ... -->)은 안내문이므로 검사에서 뺀다.
BODY="$(sed 's/<!--.*-->//g' "$SPEC")"
field() { printf '%s\n' "$BODY" | sed -n "s/^- $1:[[:space:]]*//p" | head -1 | sed 's/[[:space:]]*$//'; }
section() { printf '%s\n' "$BODY" | awk -v h="## $1" '$0 == h { on = 1; next } /^## / { on = 0 } on'; }

echo "명세 검사: $SPEC ($([[ $DRAFT == 1 ]] && echo 초안 || echo 승인) 기준)"

STATUS="$(field 상태)"
NAME="$(field '앱 이름')"
DEPLOY="$(field 배포)"
case "$STATUS" in 초안|승인) ;; *) problem "상태가 '초안' 또는 '승인'이 아닙니다: '${STATUS}'" ;; esac
# rename-app.sh와 같은 규칙
[[ "$NAME" =~ ^[A-Za-z][A-Za-z0-9]*$ ]] || problem "앱 이름은 영문자/숫자만, 영문자로 시작해야 합니다: '${NAME}'"
case "$DEPLOY" in Vercel|없음) ;; *) problem "배포는 'Vercel' 또는 '없음'이어야 합니다: '${DEPLOY}'" ;; esac

for h in "원본 요구사항" "목적과 대상 사용자" "범위 밖" "기능 목록" "화면" "데이터 저장" \
         "외부 서비스·비밀 값·개인정보" "위험 요소" "미결 질문" "변경 이력" "검증 결과"; do
  printf '%s\n' "$BODY" | grep -qx "## $h" || { problem "필수 절이 없습니다: '## $h'"; continue; }
  [[ -n "$(section "$h" | grep -v '^[[:space:]]*$' || true)" ]] || problem "'## $h' 절이 비어 있습니다"
done

# 채우지 않은 자리 표시
while IFS= read -r line; do problem "채우지 않은 자리 표시 (줄 ${line%%:*}): ${line#*:}"; done \
  < <(printf '%s\n' "$BODY" | grep -nE '\.\.\.|…|YYYY-MM-DD|\(어떤 |\(무엇을\)' || true)

FEATURES="$(printf '%s\n' "$BODY" | sed -n 's/^### \(F-[0-9][0-9]*\)\. .*/\1/p')"
[[ -n "$FEATURES" ]] || problem "기능이 하나도 없습니다 ('### F-1. 기능 이름' 형식)"
for f in $FEATURES; do
  [[ "$(printf '%s\n' "$FEATURES" | grep -cx "$f")" == 1 ]] || problem "기능 번호가 중복됩니다: $f"
  # "### F-n." 부터 다음 "### " 또는 "## " 전까지
  BLOCK="$(printf '%s\n' "$BODY" | awk -v p="### $f. " 'index($0, p) == 1 { on = 1; next } /^##/ { on = 0 } on')"
  printf '%s\n' "$BLOCK" | grep -qE "^[[:space:]]*- \[[ x]\] $f\.AC-[0-9]+:" || problem "$f 에 수용 기준이 없습니다 ('- [ ] $f.AC-1: ...' 형식)"
  printf '%s\n' "$BLOCK" | grep -qE "^- 기능 상태: (대기|구현 완료)$" || problem "$f 에 기능 상태 줄이 없습니다 ('- 기능 상태: 대기' 또는 '구현 완료')"
done
# 모든 수용 기준은 테스트 계획 표의 첫 칸에 나와야 한다.
for ac in $(printf '%s\n' "$BODY" | sed -nE 's/^[[:space:]]*- \[[ x]\] (F-[0-9]+\.AC-[0-9]+):.*/\1/p'); do
  printf '%s\n' "$BODY" | grep -qE "^\| *$ac *\|" || problem "$ac 가 테스트 계획 표에 없습니다"
done

if [[ $DRAFT == 0 ]]; then
  [[ "$STATUS" == 승인 ]] || problem "상태가 '승인'이 아닙니다 (사람이 검토 후 직접 바꿉니다)"
  OPEN="$(section '미결 질문' | grep -v '^[[:space:]]*$' | grep -vx -- '- 없음' || true)"
  [[ -z "$OPEN" ]] || problem "미결 질문이 남아 있습니다: $(printf '%s' "$OPEN" | tr '\n' ' ')"
fi

if [[ $PROBLEMS -gt 0 ]]; then echo "결과: FAIL (문제 ${PROBLEMS}건)"; exit 1; fi
echo "결과: PASS (앱 이름 $NAME, 배포 $DEPLOY, 기능 $(printf '%s\n' "$FEATURES" | wc -l | tr -d ' ')개)"
