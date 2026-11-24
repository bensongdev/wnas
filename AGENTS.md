# AI 에이전트 계약 — 웹앱 (Next.js)

## 역할

주어진 수용 기준을 만족하는 가장 작고 안전한 변경을 구현한다. 제품 결정과 승인은 사람이 한다.

## 아키텍처

- Next.js App Router + TypeScript + Tailwind CSS. 기본은 서버 컴포넌트이고, 상태·이벤트·브라우저 API가 필요한 곳에만 `"use client"`를 쓴다.
- 이 Next.js 버전은 학습한 내용과 다를 수 있다. API를 쓰기 전에 `node_modules/next/dist/docs/`의 해당 문서를 읽는다.
- 도메인 로직은 `lib/`에 두어 화면과 분리하고, 도메인 동작에 대한 단위 테스트를 추가한다.
- 기존 컴포넌트와 관례를 재사용하고, 추측성 추상화는 피한다.
- 새 npm 패키지, 외부 서비스(API, DB, 로그인, 결제, 분석), 환경 변수, 영구 데이터 마이그레이션은 트레이드오프를 문서화하고 승인을 요청하기 전에는 추가하지 않는다. 패키지는 정확한 버전으로 고정한다(`npm install -E`).
- 비밀 값은 `.env.local`(Git 제외)에만 둔다. `NEXT_PUBLIC_`로 시작하는 변수는 브라우저에 그대로 노출되므로 비밀 값에 쓰지 않는다.
- 비밀 정보나 개인 데이터를 소스 관리, 로그, 스크린샷, 생성된 보고서에 절대 넣지 않는다.

## 제품 명세

- 기능 구현은 `docs/PRODUCT_SPEC.md`가 `scripts/check-spec.sh`를 통과(상태 `승인`, 미결 질문 없음)할 때, 그 명세에 있는 기능(`F-n`)만 한다. 통과하지 못하면 구현하지 않고 이유를 보고한다.
- 명세의 상태를 `승인`으로 바꾸는 것은 사람만 한다. 사람이 명시적으로 "승인"이라고 지시한 경우에만 대신 바꾼다.
- 요구사항이 바뀌면 코드보다 명세를 먼저 고치고(`/spec`), 상태를 `초안`으로 되돌려 재승인을 받는다. 명세를 고치는 단계에서는 코드를 수정하지 않는다.
- 모호한 요구사항은 추측해서 채우지 않고 명세의 미결 질문에 적는다.
- 구현 후 명세에 쓰는 것은 `## 검증 결과`와 해당 기능의 `기능 상태`뿐이다. 수용 기준 체크박스는 사람이 체크한다.

## 완료 정의 (Definition of Done)

1. 구현할 기능이 승인된 명세에 있는지 확인하고, 그 수용 기준(`F-n.AC-n`)을 구현과 테스트의 기준으로 삼는다.
2. 최소한의 변경으로 구현하고, 동작과 회귀를 검증하는 테스트를 포함한다.
3. `scripts/verify.sh all`을 실행한다(린트·타입 검사·Prettier·빌드·단위 테스트·E2E). 브라우저는 headless라 사용자의 마우스·키보드를 쓰지 않으므로 언제든 돌려도 된다. 실행할 수 없으면 명시적으로 NOT RUN으로 보고하고, 절대 PASS라고 주장하지 않는다.
4. 화면 상태의 증거는 E2E 테스트(`e2e/`)에서 assertion으로 상태를 확인한 뒤 `capture(page, testInfo, "NN-상태-설명")`으로 남긴다. 데스크톱과 모바일 두 화면에서 모두 실행된다.
5. 스크린샷을 직접 열어 확인한다. 에이전트가 이미지를 볼 수 없으면 HUMAN REVIEW REQUIRED로 표시한다.
6. 최소한 초기 상태, 변경된 상태, 그리고 해당되는 경우 오류/빈/로딩 상태의 증거를 확보한다. 기존 UI를 수정할 때는 변경 전/후를 포함한다.
7. 검증 보고서를 제공한다: 변경 사항, 실행한 명령, PASS/FAIL/SKIPPED, 증거 경로, 한계, 위험.
8. 스크린샷만으로 기능의 정확성을 추론하지 않는다. assertion과 테스트 로그로 동작을 입증해야 한다.
9. 결과는 실행 폴더의 `verification.md` 기준으로 보고한다. `전체 결과: PASS`가 아니거나 필요한 항목이 `NOT RUN`이면 완료가 아니다. `화면 검토: PENDING`은 이미지를 확인한 뒤 보고서에서 직접 판정한다.

## 테스트 작성 규칙

- 상태 변화는 먼저 assertion으로 검증하고, 그 다음 스크린샷을 남긴다.
- 요소는 사용자가 보는 방식으로 찾는다: `getByRole`(버튼 이름, 제목), `getByLabel`, 그다음 `getByTestId`. CSS 선택자는 피한다. 문자열은 `toHaveText`로 정확히 비교한다.
- 임의의 대기(`waitForTimeout`)를 쓰지 않는다. `expect(...).toHaveText` 같은 자동 대기 assertion을 쓴다.
- 스크린샷 이름은 `NN-상태-설명` 형식(소문자, 숫자, 하이픈)으로 붙인다 (예: `01-initial`, `02-after-increment`). 이 형식이 아닌 첨부는 `verify.sh`가 FAIL 처리한다.
- 외부 API는 테스트에서 실제로 부르지 않는다. `page.route`로 응답을 고정한다. 테스트 브라우저는 매번 빈 프로필이므로 실제 계정·쿠키가 들어가지 않는다.
- 접근성 검사(`@axe-core/playwright`)에서 serious 이상 위반이 없어야 한다. 새 페이지를 만들면 그 페이지도 검사에 추가한다.
- 검증 스크립트를 수정하면 통제된 실패(타입 오류, 테스트 실패 등)를 주입해 FAIL과 0이 아닌 종료 코드를 확인하고, 주입한 변경은 원상 복구한다.

## 실행 규칙

- 명시적 허락 없이 `.artifacts/`의 실행 증거, 사용자 파일, 다른 프로젝트를 삭제하지 않는다. 정리할 때는 `scripts/prune-evidence.sh`로 목록과 크기를 보여 주고 승인을 받는다.
- 8GB RAM 기기이므로 빌드·테스트를 병렬로 돌리지 않는다. `.artifacts/verify.lock`은 실행 중인 검증이 없음을 확인하기 전에는 지우지 않는다. 개발 서버(`npm run dev`)를 띄웠으면 작업이 끝날 때 종료한다.
- 의존성은 `package-lock.json` 그대로 설치한다(`npm ci`). lockfile을 바꾸는 설치는 승인받은 패키지 추가일 때만 한다.
- 앱 이름 변경은 `scripts/rename-app.sh`로 한다.
- 새 빌드 경고·ESLint 경고를 만들지 않는다(ESLint는 경고도 실패로 처리한다).
- 생성된 증거는 프로젝트 소스 폴더가 아닌 `.artifacts/`(gitignore 대상)에 둔다.
- 실패 시 닫힘(fail closed): 검증을 실행하지 못했다면 완료 상태는 UNVERIFIED다.
- 사용자 지시 없이 `git commit`, `git push`, 배포를 실행하지 않는다. 배포는 `scripts/deploy.sh`로만 하고, 결과는 `.artifacts/deploys/<시각>/deploy-verification.md` 기준으로 보고한다.
- Vercel 토큰, API 키 등 계정 정보를 저장소나 로그에 넣지 않는다. Vercel 로그인·연결은 사람이 터미널에서 직접 한다.

## 응답 템플릿

- 구현 내용: ...
- 수용 기준: ...
- 검증: lint PASS/FAIL/NOT RUN; build PASS/FAIL/NOT RUN; unit PASS/FAIL/NOT RUN; E2E PASS/FAIL/NOT RUN
- 증거: 실행 폴더, 스크린샷 이름(데스크톱·모바일)
- 사람 검토: required / approved
- 남은 위험: ...

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
