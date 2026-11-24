#!/usr/bin/env bash
# 이 템플릿으로 새 웹앱 프로젝트를 만든다.
#   scripts/new-project.sh --spec <승인된 명세.md> [만들 폴더]   # 권장: 제품 명세에서 이름을 읽음
#   scripts/new-project.sh <앱이름> [만들 폴더]
# Git에 커밋된 파일만 복사하므로 node_modules, .next, .artifacts, 커밋하지 않은 변경은 따라가지 않는다.
# 만들 폴더를 생략하면 홈 폴더(~)에 <앱 이름의 kebab-case> 폴더를 만든다(MyApp → ~/my-app).
# 이미 있는 폴더는 건드리지 않는다.
set -euo pipefail
# ~/.local/bin 등에 심볼릭 링크로 설치해도 템플릿 위치를 찾도록 링크를 따라간다.
TEMPLATE="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
usage() {
  echo "사용법: $(basename "$0") --spec <승인된 명세.md> [만들 폴더]" >&2
  echo "        $(basename "$0") <앱이름> [만들 폴더]" >&2
  echo "  앱이름: 영문자/숫자만, 영문자로 시작. 예: $(basename "$0") MyApp" >&2
  exit 2
}
kebab() { printf '%s' "$1" | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g; s/([A-Z])([A-Z][a-z])/\1-\2/g' | tr '[:upper:]' '[:lower:]'; }

SPEC=""
if [[ "${1:-}" == "--spec" ]]; then
  SPEC="${2:-}"
  [[ -f "$SPEC" ]] || usage
  # 승인되지 않았거나 형식이 틀린 명세로는 아무것도 만들지 않는다.
  "$TEMPLATE/scripts/check-spec.sh" "$SPEC" || { echo "명세 검사를 통과하지 못해 프로젝트를 만들지 않았습니다." >&2; exit 1; }
  NAME="$(sed 's/<!--.*-->//g' "$SPEC" | sed -n 's/^- 앱 이름:[[:space:]]*//p' | head -1 | sed 's/[[:space:]]*$//')"
  DEST="${3:-$HOME/$(kebab "$NAME")}"
else
  NAME="${1:-}"
  [[ "$NAME" =~ ^[A-Za-z][A-Za-z0-9]*$ ]] || usage
  DEST="${2:-$HOME/$(kebab "$NAME")}"
fi

for tool in git node npm; do
  command -v "$tool" >/dev/null || { echo "$tool 이 필요합니다 (README의 설치 단계 참고)" >&2; exit 2; }
done
if [[ -e "$DEST" ]]; then echo "이미 있는 경로입니다: $DEST (다른 이름이나 폴더를 지정하세요)" >&2; exit 2; fi
git -C "$TEMPLATE" rev-parse --verify -q HEAD >/dev/null \
  || { echo "템플릿 저장소에 커밋이 없습니다: $TEMPLATE" >&2; exit 2; }
if [[ -n "$(git -C "$TEMPLATE" status --porcelain)" ]]; then
  echo "참고: 템플릿에 커밋하지 않은 변경이 있습니다. 새 프로젝트에는 마지막 커밋 내용만 들어갑니다."
fi

mkdir -p "$DEST"
git -C "$TEMPLATE" archive --format=tar HEAD | tar -x -C "$DEST"
"$DEST/scripts/rename-app.sh" "$NAME"
if [[ -n "$SPEC" ]]; then cp "$SPEC" "$DEST/docs/PRODUCT_SPEC.md"; fi
git -C "$DEST" init -q -b main
echo "의존성 설치 중 (npm ci)..."
(cd "$DEST" && npm ci --no-audit --no-fund >/dev/null) || { echo "npm ci 실패: $DEST 에서 npm ci 를 다시 실행해 보세요" >&2; exit 1; }
# Playwright 브라우저(Chromium)는 컴퓨터에 한 번만 설치하면 된다. 이미 있으면 바로 끝난다.
(cd "$DEST" && npx playwright install chromium >/dev/null) || echo "참고: 브라우저 설치 실패. 나중에 npx playwright install chromium"

echo
echo "새 프로젝트를 만들었습니다: $DEST"
[[ -z "$SPEC" ]] || echo "제품 명세를 복사했습니다: docs/PRODUCT_SPEC.md"
echo "Git 저장소는 초기화만 했고 커밋은 하지 않았습니다."
echo "다음 단계:"
echo "  cd \"$DEST\""
echo "  ./scripts/verify.sh all      # 린트, 빌드, 테스트, 화면 증거가 통과하는지 확인"
[[ -z "$SPEC" ]] || echo "  claude 실행 후 /implement F-1   # 명세의 기능을 하나씩 구현"
echo "  npm run dev                  # 개발 서버: http://localhost:3000"
