# 학습정리: 특별편-시연 DB 세션 스코프와 Snapshot 복구

## 구현 요약

시연 관리자에서 일부 페이지가 `HTTP 200 + data: []`를 반환하는 문제를 추적했다. 직접 작성된 admin API route는 `runWithUserDemoSession()`으로 감싸 시연 session scope를 명시했고, 공개 웹 홈은 DB 조회 전 `enterDemoSessionFromCookies()`를 호출하도록 수정했다. 이후 Supabase `__SEED__`가 잘못된 snapshot으로 덮인 문제를 발견해, 로컬 풀데이터 snapshot에 `HomePopup` 1건을 병합한 복구 snapshot으로 재import했다.

최종 확인된 `__SEED__` count는 `Role 2`, `User 2`, `Media 62`, `SiteSettings 7`, `NavigationMenu 3`, `Board 6`, `HomeSection 10`, `Subpage 7`, `Post 21`, `PageBlock 11`, `HomePopup 1`, `NavigationMenuItem 22`다.

## 핵심 학습 포인트

### 1. `data: []`는 오류가 아니라 격리 성공일 수 있다

#### 개념

시연 모드의 Prisma extension은 현재 sessionId를 자동으로 where에 주입한다. 따라서 해당 session에 row가 없으면 API는 정상적으로 200과 빈 배열을 반환한다.

#### 동작 원리 심화

처음에는 `/_cms/admin/api/navigation`, `/api/home-popups` 등이 200인데 빈 배열이라 API 내부 쿼리 오류를 의심했다. 하지만 Vercel 로그에도 오류가 없고 응답 body도 성공 형태였다. 이 상태에서는 "쿼리가 실패했다"가 아니라 "현재 session scope 안에 row가 없다"를 먼저 확인해야 한다.

DB count를 보면 같은 모델에 여러 sessionId가 존재한다. 기존 visitor 세션에는 `Board 6`, `Post 21`, `Media 62`가 남아 있었지만, 당시 `__SEED__`는 `Media 1`, `HomeSection 10`, `HomePopup 1`, `Role 1`, `User 1` 수준으로 줄어 있었다. 새 세션이 이 빈약한 seed에서 생성되니 관리자 페이지 대부분이 0건이 되는 것이 정상 동작이었다.

#### 프로젝트 코드에서의 적용

- `packages/db/src/demo/clientExtension.ts`: 현재 AsyncLocalStorage sessionId를 Prisma 쿼리에 자동 주입한다.
- `packages/db/src/demo/cloneSeedToSession.ts`: `__SEED__` row를 visitor sessionId로 복제한다.
- `apps/admin/app/api/home-popups/route.ts`: 올바른 session scope에서는 `HomePopup`이 없으면 `data: []`가 맞다.

#### 설계 판단

HTTP status만으로 문제를 판단하지 않고, session별 count를 함께 보는 절차가 필요하다. 시연 모드에서는 "빈 배열"이 사용자에게는 장애처럼 보이지만, 인프라 관점에서는 격리가 제대로 적용된 결과일 수 있다.

### 2. 직접 작성된 admin API는 handler body를 `runWithUserDemoSession`으로 감싼다

#### 개념

`requirePermission()`이 user session을 읽어도, 그 뒤 Prisma 조회를 명시적으로 같은 AsyncLocalStorage scope에 넣어야 한다.

#### 동작 원리 심화

`defineRoute` 기반 API는 내부에서 인증/인가 후 `runWithUserDemoSession(user, handler)` 패턴을 이미 적용한다. 하지만 직접 작성된 list/detail route는 `requirePermission()`만 호출하고 곧바로 Prisma를 조회하는 경우가 있었다. 서버리스 Route Handler에서 `enterWith()`만 믿으면 비동기 경계에서 context가 기대와 달라질 수 있어, handler 본문 전체를 `demo.runWith()`로 감싸는 쪽이 안전하다.

#### 프로젝트 코드에서의 적용

`apps/admin/src/shared/api/runWithUserDemoSession.ts`:

```ts
export function runWithUserDemoSession<T>(
  user: SessionUser,
  fn: () => Promise<T>,
): Promise<T> {
  if (process.env.DEMO_MODE !== 'true') return fn();
  return demo.runWith({ sessionId: user.sessionId }, fn);
}
```

이 패턴을 `home-popups`, `navigation`, `home`, `roles`, `users`, `settings`, `audit-logs`, `error-logs`, `subpage-feedback`, `quick-search` 등 직접 작성된 route에 적용했다.

#### 설계 판단

각 Prisma 쿼리마다 `sessionId`를 직접 where에 넣는 방식도 가능하지만, 이 프로젝트는 이미 Prisma extension을 단일 격리 계층으로 선택했다. 따라서 route handler는 extension이 읽을 context를 안정적으로 제공하는 책임만 갖는 것이 더 일관적이다.

### 3. 공개 웹 홈은 DB 조회 전 session attach가 필요했다

#### 개념

App Router layout에서 `ensureDemoSession()`을 호출해도 page-level DB helper가 항상 그 context 아래에서 실행된다고 보장하지 않는다.

#### 동작 원리 심화

공개 웹에서 팝업이 보이는데 관리자 팝업 목록은 비어 있는 현상이 있었다. DB를 확인하니 `HomePopup`은 `__PROD__`에만 1건 있고, 당시 `__SEED__`와 visitor session에는 없었다. 즉 공개 웹은 visitor session이 아니라 `__PROD__` 팝업을 보여주고 있었다.

`HomePage`는 `getActiveHomePopups()`와 `getHomeSections()`를 병렬 호출한다. 이 helper들은 Prisma extension의 현재 session context에 의존한다. 따라서 홈 페이지 자체에서 cookie 기반 session attach를 먼저 수행해야 공개 웹도 관리자와 같은 visitor data를 본다.

#### 프로젝트 코드에서의 적용

`apps/web/src/pages/home/ui/HomePage.tsx`:

```tsx
export async function HomePage() {
  const demoSession = await enterDemoSessionFromCookies();
  if (process.env.DEMO_MODE === 'true' && !demoSession) {
    return null;
  }

  const [popups, sections] = await Promise.all([
    getActiveHomePopups(),
    getHomeSections(),
  ]);
  // ...
}
```

#### 설계 판단

session attach를 각 DB helper 안에 넣으면 중복이 늘고 운영 모드에도 불필요한 cookies 호출이 퍼진다. 대신 public web의 route/page 진입점에서 DB 조회 직전에 attach하는 방식이 더 좁고 명확하다. 다음 컨텍스트에서 공개 웹의 다른 route도 같은 기준으로 점검해야 한다.

### 4. Snapshot source를 잘못 잡으면 `__SEED__`가 정상적으로 망가진다

#### 개념

`demo:import`는 Supabase DB 전체를 초기화하지 않는다. 하지만 `__SEED__`는 새 세션의 원본이므로, 빈약한 snapshot을 import하면 이후 새 세션이 모두 빈약해진다.

#### 동작 원리 심화

문제 상황에서 현재 Supabase `__PROD__`를 export했더니 결과는 `Role 0`, `User 0`, `Media 1`, `HomeSection 10`, `HomePopup 1`이었다. 이 snapshot을 import하면 `resetSeedData()`가 기존 `__SEED__` row와 Storage `__SEED__/` 파일을 정리한 뒤, 빈약한 payload를 seed로 적재한다.

`ensureDemoAdminSeed()`가 import 후 `demo_admin`과 시스템 역할은 보정하므로 로그인은 된다. 하지만 `Board`, `Post`, `Subpage`, `NavigationMenu` 같은 콘텐츠 모델은 자동 보정되지 않는다. 그래서 관리자 로그인이 성공해도 대부분 페이지가 0건으로 보인다.

#### 프로젝트 코드에서의 적용

- `packages/db/src/demo/importSnapshot.ts`: import 후 `ensureDemoAdminSeed()` 호출.
- `packages/db/src/demo/resetSeedData.ts`: `__SEED__` row와 Storage seed 파일만 정리.
- `packages/db/scripts/demo-export.ts`: 기본 `sourceSessionId=__PROD__` export.

복구 작업은 기존 로컬 snapshot에 `__PROD__`의 `HomePopup` 1건을 병합해 `/tmp/simple-cms-demo-snapshot-restored.json`을 만들고, 이를 `pnpm demo:import`로 `__SEED__`에 재적재했다.

#### 설계 판단

snapshot import 전에는 반드시 모델별 count를 확인해야 한다. 특히 source가 "로컬 개발 DB"인지 "시연 Supabase의 빈약한 `__PROD__`"인지 구분해야 한다. 앞으로는 `demo:export` 결과를 바로 import하지 말고, `Role/User/Board/Subpage/Post/Media/NavigationMenuItem/HomePopup` count를 먼저 출력하는 운영 체크를 넣는 것이 안전하다.

### 5. Snapshot CLI 패키징은 실행 위치 기준 의존성을 가져야 한다

#### 개념

`packages/db/scripts/demo-export.ts`와 `demo-import.ts`가 Supabase Storage client를 직접 import하면, `@simple-cms/db` package 의존성에 `@supabase/supabase-js`가 있어야 한다.

#### 동작 원리 심화

기존에는 `@supabase/supabase-js`가 admin app dependency에만 있었다. admin route에서는 정상 동작하지만, `pnpm demo:export`는 `@simple-cms/db` 패키지 스크립트로 실행된다. 이때 Node module resolution은 db 패키지의 dependency graph를 기준으로 보므로 `ERR_MODULE_NOT_FOUND`가 발생했다.

#### 프로젝트 코드에서의 적용

- `packages/db/package.json`: `@supabase/supabase-js` 추가.
- `pnpm-lock.yaml`: db importer에 Supabase client dependency 반영.
- `packages/db/src/demo/importSnapshot.ts`: `rowsCreatedByModel.Role/User` 통계가 `undefined += 1`로 `NaN`이 되던 문제를 `(value ?? 0) + 1`로 수정.

#### 설계 판단

workspace에서 어떤 앱에 이미 설치된 패키지가 있더라도, 스크립트를 직접 실행하는 패키지의 `package.json`에 의존성을 선언해야 한다. monorepo hoisting에 기대는 것은 배포/CLI 환경에서 깨지기 쉽다.

## 레거시 경험과의 연결

- 레거시에서는 "DB에 row가 있냐 없냐"를 직접 테이블 기준으로 봤지만, 이번에는 같은 테이블 안에서도 `sessionId`에 따라 완전히 다른 tenant로 해석한다.
- 기존 운영 경험에서 중요했던 "실제 바라보는 DB가 어디인지 확인" 습관은 그대로 유효했다. 다만 이제는 DB URL뿐 아니라 `sourceSessionId`와 current visitor session까지 확인해야 한다.
- 레거시 dump/restore는 전체 DB 단위였지만, 이 프로젝트는 `__SEED__`만 reset/import하고 기존 visitor session은 보존한다. 그래서 복구 후에도 "새 세션 시작"이 필요하다.
- 로그가 없고 HTTP 200이면 정상으로 넘어가기 쉬웠지만, 운영 경험상 "성공 응답인데 데이터가 이상함"은 데이터 범위/필터 문제일 가능성이 크다.

## 면접 예상 질문 & 답변

### Q1. 시연 모드에서 API가 200인데 빈 배열이면 어떻게 디버깅하겠습니까?

#### 답변 예시

먼저 HTTP 200을 쿼리 성공으로 해석하고, 오류 로그보다 데이터 scope를 확인합니다. 이 프로젝트의 시연 모드는 같은 테이블에 `__PROD__`, `__SEED__`, visitor session row가 함께 있으므로, 빈 배열은 현재 sessionId에 row가 없다는 의미일 수 있습니다. 그래서 API body, 현재 로그인 user의 `sessionId`, 그리고 해당 모델의 `__SEED__` count와 visitor count를 같이 봅니다. `__SEED__`가 비어 있으면 snapshot/import 문제이고, `__SEED__`는 있는데 visitor가 비어 있으면 seed 갱신 전 세션이거나 clone 문제입니다. 공개 웹만 데이터가 보이면 오히려 공개 웹이 `__PROD__`를 잘못 읽고 있는지 확인합니다. 이런 순서로 보면 "코드 오류", "seed 누락", "session context 누락"을 분리할 수 있습니다.

#### 꼬리 질문 대응

**"왜 로그에는 오류가 없었나요?"**  
쿼리 자체는 성공했기 때문입니다. Prisma extension이 올바른 sessionId를 적용한 결과 해당 session row가 없어 빈 배열이 나온 것이므로 서버 오류가 아닙니다.

**"사용자에게는 장애인데 정상이라고 볼 수 있나요?"**  
기술적으로는 정상 쿼리 결과지만 운영 상태로는 잘못된 seed에서 생성된 세션이라 장애입니다. 그래서 API 상태와 운영 데이터 상태를 분리해서 봐야 합니다.

### Q2. `demo:import`가 전체 DB를 초기화하지 않는다면 왜 위험합니까?

#### 답변 예시

`demo:import`는 전체 Supabase DB를 reset하지 않고 `__SEED__` row와 `__SEED__/` Storage만 정리합니다. 그래서 기존 visitor session은 남아 있지만, 이후 새 visitor session은 새로 적재된 `__SEED__`에서 복제됩니다. 만약 source snapshot이 빈약하면 `__SEED__`가 정상적으로 빈약해지고, 새 세션마다 관리자 페이지가 0건으로 보입니다. 더 위험한 점은 import 후 `demo_admin`은 자동 보정되어 로그인이 성공한다는 것입니다. 로그인은 되지만 콘텐츠가 없는 상태가 되어 원인을 API 문제로 오해하기 쉽습니다. 따라서 import 전 snapshot count 검증과 import 후 `__SEED__` count 검증이 필수입니다.

#### 꼬리 질문 대응

**"기존 세션 데이터가 많이 보이는 건 문제인가요?"**  
방문자 세션별 복제 row가 남아 있는 것은 정상입니다. 문제는 새 세션의 원본인 `__SEED__`가 기대한 count를 갖고 있는지입니다.

**"복구 후 왜 새 세션 시작이 필요한가요?"**  
이미 만들어진 visitor session은 seed를 다시 참조하지 않습니다. seed 갱신은 이후 생성되는 세션에만 반영됩니다.

### Q3. 공개 웹에서만 데이터가 보이면 어떤 가능성을 의심해야 합니까?

#### 답변 예시

공개 웹만 데이터가 보이면 먼저 공개 웹이 visitor session이 아니라 `__PROD__`를 읽고 있는지 확인합니다. App Router에서 layout이 session을 붙인다고 해서 page-level DB helper나 metadata 함수가 항상 같은 AsyncLocalStorage context를 공유한다고 가정하면 안 됩니다. React `cache()`가 session attach 전에 호출되면 잘못된 scope의 결과가 request 안에서 재사용될 수도 있습니다. 이 프로젝트에서는 홈 페이지에서 팝업/홈 섹션 조회 전에 `enterDemoSessionFromCookies()`를 호출하도록 수정했습니다. 앞으로 게시판, 서브페이지, 검색 같은 공개 route도 같은 방식으로 DB 조회 직전 session attach가 보장되는지 확인해야 합니다.

#### 꼬리 질문 대응

**"DB helper 내부에서 항상 session attach를 하면 안 되나요?"**  
가능하지만 cookies 호출이 helper 전체에 퍼지고 운영 모드의 정적/ISR 특성에도 영향을 줄 수 있습니다. route/page 진입점에서 필요한 곳만 attach하는 편이 범위가 좁습니다.

**"layout에서 이미 ensureDemoSession을 하는데 중복 아닌가요?"**  
운영 모드에서는 early return하고, 시연 모드에서는 안전망 역할을 합니다. RSC 실행 경계가 분리될 수 있어서 중복보다 명시성이 더 중요했습니다.

## 트러블슈팅 로그

| 문제 | 원인 | 해결 |
| ---- | ---- | ---- |
| 관리자 여러 페이지가 `data: []` | direct admin API route가 handler body를 명시 session scope로 감싸지 않음 | `runWithUserDemoSession(user, async () => ...)` 적용 |
| 관리자 팝업은 비었는데 공개 웹 팝업은 보임 | 공개 웹 홈이 `__PROD__` 팝업을 읽을 수 있었음 | `HomePage`에서 DB 조회 전 `enterDemoSessionFromCookies()` 호출 |
| `pnpm demo:export`에서 `@supabase/supabase-js` module not found | db CLI가 Supabase client를 import하지만 db package dependency에 없음 | `packages/db/package.json`에 dependency 추가 |
| import 출력 `Role: NaN`, `User: NaN` | `rowsCreatedByModel.Role`이 undefined인 상태에서 `+= 1` | `(stats.rowsCreatedByModel.Role ?? 0) + 1`로 수정 |
| 복구 전 새 시연 세션 데이터 대부분 0건 | 빈약한 Supabase `__PROD__` snapshot으로 `__SEED__`를 덮음 | 로컬 풀데이터 snapshot + `HomePopup` 병합 snapshot으로 `__SEED__` 재import |

## 한 줄 요약 카드

- **`data: []`**: "시연 모드에서는 오류가 아니라 현재 session scope 안에 row가 없다는 정상 결과일 수 있다."
- **`__SEED__`**: "새 visitor session의 원본이다. 잘못된 snapshot으로 덮으면 이후 새 세션이 모두 잘못 복제된다."
- **기존 visitor session**: "seed 갱신 후 자동 갱신되지 않는다. 검증은 새 세션 시작 후 해야 한다."
- **public web session attach**: "layout gate만 믿지 말고 DB 조회 전 route/page 진입점에서 cookie 기반 attach를 보장한다."
- **snapshot source 검증**: "import 전 모델별 count를 보고 source가 진짜 개발 풀데이터인지 확인한다."

## 추가 학습 자료

- `docs/learning/2-develop/특별편-시연PR6-7-Snapshot운영워크플로우-사전학습.md`
- `docs/learning/2-develop/특별편-시연PR6-7-Snapshot운영워크플로우-학습정리.md`
- `docs/learning/2-develop/특별편-시연모드-Hydration-ReactQuery디버깅-사전학습.md`
- `docs/codex/demo-mode-supabase-snapshot-debug-2026-06-04.md`
- `packages/db/src/demo/importSnapshot.ts`
- `packages/db/src/demo/cloneSeedToSession.ts`
- `apps/web/src/shared/lib/requestDemoSession.ts`
