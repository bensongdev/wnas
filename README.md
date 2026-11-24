# WNAS

**Web Native AI System**

**Next.js 웹앱을 위한 AI 구현 → 빌드 → 브라우저 테스트 → 스크린샷 증거 → 사람 승인 템플릿**

> **개발이 처음이라면 [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)부터 읽으세요.** 이 README는 이미 익숙한 사람을 위한 참조 문서입니다.

macOS 앱용 자매 템플릿은 [MNAS](https://github.com/bensongdev/mnas)입니다. 흐름(명세 → 사람 승인 → 구현 → 증거가 남는 검증)은 같고, 웹에서는 브라우저를 화면에 띄우지 않고(headless) 실제 클릭 테스트까지 돌리므로 검증 중에도 컴퓨터를 그대로 쓸 수 있습니다.

## 0. 준비

- Node.js 22 이상 (권장 24 LTS: `brew install node@24`). CI는 `.nvmrc`의 버전을 씁니다.
- Git

## 1. 시작

```bash
cd wnas
npm ci                                # package-lock.json 그대로 설치
npx playwright install chromium       # 테스트용 브라우저 (컴퓨터에 한 번만)
./scripts/verify.sh all               # 린트·빌드·단위 테스트·E2E·스크린샷
npm run dev                           # 개발 서버: http://localhost:3000
```

## 2. 실행 결과

`verify.sh`는 실행마다 `.artifacts/runs/<시각>/`에 결과를 남기고 `verification.md`를 출력합니다.

| 단계        | 도구                                                               | 실패 조건                                    |
| ----------- | ------------------------------------------------------------------ | -------------------------------------------- |
| 린트        | ESLint(경고도 실패), `tsc --noEmit`, Prettier                      | 하나라도 실패                                |
| 빌드        | `next build`                                                       | 빌드 실패 (경고는 개수만 보고)               |
| 단위 테스트 | Vitest + Testing Library                                           | 실패 1개 이상 또는 0개                       |
| E2E         | Playwright, headless Chromium, 데스크톱 1280×800 + 모바일(Pixel 7) | 실패, 0개, 스크린샷 0장, 이름 규칙 밖의 첨부 |
| 접근성      | `@axe-core/playwright` (E2E 안에서)                                | serious 이상 위반                            |

결과 폴더:

- `verification.md`: 단계별 PASS/FAIL/NOT RUN, 실패한 테스트, 스크린샷 목록, 사람 검토 체크리스트
- `screenshots/<desktop|mobile>/<테스트>/NN-상태-설명.png`
- `failures/`: 실패한 테스트만의 trace·영상·실패 화면 (`npx playwright show-trace <trace.zip>`)
- `e2e/playwright-report/`: HTML 보고서 (`npx playwright show-report <경로>`)
- 각 단계 로그 (`eslint.log`, `build.log`, `unit.log`, `e2e.log` …)

## 3. 명령어

| 명령                                                     | 하는 일                                           |
| -------------------------------------------------------- | ------------------------------------------------- |
| `./scripts/verify.sh [all]`                              | 전체 검증 (기본)                                  |
| `./scripts/verify.sh lint\|build\|unit\|e2e`             | 해당 단계만 (e2e는 빌드 포함)                     |
| `./scripts/check-spec.sh [--draft] docs/PRODUCT_SPEC.md` | 제품 명세 형식 검사                               |
| `./scripts/rename-app.sh MyApp`                          | 앱 이름 변경 (화면 이름, 패키지 이름 `my-app`)    |
| `./scripts/deploy.sh [preview\|prod]`                    | Vercel 배포 + 배포 URL에서 E2E (사람 지시 시에만) |
| `./scripts/prune-evidence.sh`                            | 실행 증거 크기 목록 (삭제는 하지 않음)            |
| `npm run dev` / `npm run format`                         | 개발 서버 / 코드 서식 자동 정리                   |

## 4. AI 에이전트 사용법: 명세 → 승인 → 구현

1. **명세 초안**: 어느 폴더에서든 Claude Code에서 `/new-web-app <요구사항>` → `~/app-specs/<앱이름>/PRODUCT_SPEC.md`.
2. **사람 검토**: 명세를 읽고 고친 뒤 `- 상태: 승인`, 미결 질문을 `- 없음`으로.
3. **프로젝트 생성**: `new-web-app --spec ~/app-specs/<앱이름>/PRODUCT_SPEC.md` → `~/<앱-이름>`.
4. **구현**: 새 프로젝트에서 `claude` 실행 후 `/implement F-1`. 에이전트는 승인된 명세의 기능만 구현하고 `verify.sh all`로 검증한 뒤 명세의 `## 검증 결과`에 기록합니다.
5. **요구사항 변경**: `/spec <바뀐 요구사항>` → 명세가 초안으로 돌아감 → 재승인 → `/implement`.

에이전트 규칙은 [AGENTS.md](AGENTS.md)에 있습니다.

## 5. 설치: 어디서나 새 프로젝트 만들기

한 번만 실행합니다(이 폴더에서).

```bash
mkdir -p ~/.local/bin ~/.claude/skills
ln -s "$PWD/scripts/new-project.sh" ~/.local/bin/new-web-app
ln -s "$PWD/claude/global-skills/new-web-app" ~/.claude/skills/new-web-app
```

`~/.local/bin`이 PATH에 없으면 `~/.zshrc`에 `export PATH="$HOME/.local/bin:$PATH"`를 추가합니다.

명세 없이 바로 만들 수도 있습니다: `new-web-app MyApp` → `~/my-app`. 새 프로젝트에는 템플릿의 **마지막 커밋** 내용만 들어갑니다.

## 6. 배포: Vercel

1. 최초 1회, 사람이 터미널에서 직접: `npx vercel@66.6.0 login` → `npx vercel@66.6.0 link`.
2. `./scripts/deploy.sh` (미리보기) 또는 `./scripts/deploy.sh prod` (프로덕션).
   - `verify.sh all` PASS → `vercel deploy` → 배포된 URL에서 같은 E2E를 다시 돌려 스크린샷을 남깁니다.
   - 결과: `.artifacts/deploys/<시각>/deploy-verification.md`
3. 선택: Vercel 대시보드에서 GitHub 저장소를 연결하면 PR마다 미리보기 URL이 자동으로 만들어집니다.
   - 미리보기에 배포 보호(Vercel Authentication)가 켜져 있으면 `deploy.sh preview`의 E2E가 401로 실패할 수 있습니다.

비밀 값은 `.env.local`(Git 제외)과 Vercel 프로젝트의 환경 변수에만 넣습니다. 변수 이름은 `.env.example`에 값 없이 적습니다.

## 7. 증거 해석과 한계

- 스크린샷은 테스트가 assertion을 통과한 뒤 찍은 것입니다. 기능이 맞는지는 assertion과 로그로 판단하고, 스크린샷은 사람이 화면이 정상인지 확인하는 용도입니다.
- 검증하는 브라우저는 Chromium뿐입니다. Safari·Firefox의 차이는 확인하지 않습니다(`playwright.config.ts`의 `projects`에 추가할 수 있지만 시간과 디스크를 더 씁니다).
- 외부 API는 테스트에서 고정 응답으로 대체하므로 실제 서비스와의 연동은 배포 후 확인이 필요합니다.
- 로컬 Node 버전과 CI(`.nvmrc`) 버전이 다르면 결과가 다를 수 있습니다.
- 이 컴퓨터의 npm 10.9에는 패키지를 새로 추가할 때 오류(`Cannot read properties of null (reading 'edgesOut')`)가 나는 버그가 있습니다. Node 24(npm 11)를 쓰거나 `npx npm@11 install -E <패키지>`로 추가합니다. `npm ci`는 영향이 없습니다.

## 8. 공간 관리

- `node_modules`(수백 MB)와 `.next`는 프로젝트마다 생깁니다. Playwright 브라우저(`~/Library/Caches/ms-playwright`)는 모든 프로젝트가 함께 씁니다.
- `./scripts/prune-evidence.sh`로 실행 증거 크기를 확인하고, 필요 없는 실행 폴더만 직접 지웁니다.
