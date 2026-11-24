#!/usr/bin/env bash
# 앱 이름을 바꾼다: scripts/rename-app.sh <새이름>   (예: MyApp)
# 화면에 보이는 이름(WebStarter 등)은 소스의 문자열을, 패키지 이름은 kebab-case(my-app)로 바꾼다.
# 아무것도 삭제하지 않는다.
set -euo pipefail
cd "$(dirname "$0")/.."
NEW="${1:-}"
if [[ ! "$NEW" =~ ^[A-Za-z][A-Za-z0-9]*$ ]]; then
  echo "사용법: scripts/rename-app.sh <새이름>  (영문자/숫자만, 영문자로 시작. 예: MyApp)" >&2
  exit 2
fi
# 현재 표시 이름은 app/layout.tsx의 metadata title에서 읽는다.
OLD="$(sed -n 's/^[[:space:]]*title: "\([A-Za-z][A-Za-z0-9]*\)",$/\1/p' app/layout.tsx | head -1)"
if [[ -z "$OLD" ]]; then echo "app/layout.tsx에서 현재 이름(title: \"...\")을 읽지 못했습니다" >&2; exit 2; fi
if [[ "$OLD" == "$NEW" ]]; then echo "이미 이름이 $NEW 입니다"; exit 0; fi
kebab() { printf '%s' "$1" | sed -E 's/([a-z0-9])([A-Z])/\1-\2/g; s/([A-Z])([A-Z][a-z])/\1-\2/g' | tr '[:upper:]' '[:lower:]'; }
PKG="$(kebab "$NEW")"

FILES=()
while IFS= read -r f; do FILES+=("$f"); done < <(grep -rl "$OLD" app components lib e2e 2>/dev/null || true)
for f in "${FILES[@]}"; do sed -i '' "s/$OLD/$NEW/g" "$f"; done
# package.json과 package-lock.json의 이름(최상위와 packages[""])
node -e '
  const fs = require("fs"), name = process.argv[1];
  for (const f of ["package.json", "package-lock.json"]) {
    if (!fs.existsSync(f)) continue;
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    j.name = name;
    if (j.packages && j.packages[""]) j.packages[""].name = name;
    fs.writeFileSync(f, JSON.stringify(j, null, 2) + "\n");
  }' "$PKG"

echo "$OLD -> $NEW 로 이름을 바꿨습니다 (패키지 이름: $PKG)."
echo "수정한 파일: package.json package-lock.json ${FILES[*]}"
echo "다음 단계: scripts/verify.sh all"
