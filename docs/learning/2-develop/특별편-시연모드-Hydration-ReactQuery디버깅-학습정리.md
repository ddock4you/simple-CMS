# 학습정리: 시연 모드 Hydration + React Query 디버깅

## 구현 요약

시연 모드 snapshot/import 문제를 추적하던 중 게시글/게시판/서브페이지 수정·삭제 500의 직접 원인을 Prisma demo extension의 `update/delete` guard 구현으로 확정하고 `5df5bc6`에서 수정했다. 이어서 사용자가 CRUD 정상화를 확인한 뒤, 남은 "DB 값 미표시"와 React #418 콘솔 오류를 별도 축으로 재분류했다. 현재 문서화의 핵심은 다음 컨텍스트가 `DemoBanner` hydration mismatch와 DEMO_MODE React Query loading/error UI 누락을 실수 없이 수정하도록 작업 지시를 남기는 것이다.

## 핵심 학습 포인트

### 1. Prisma extension write guard는 preflight보다 query-level guard가 안전하다

#### 개념

시연 모드는 Prisma extension이 모든 모델 query에 현재 visitor `sessionId`를 자동 주입해 cross-tenant 접근을 막는다. `update/delete`는 id 기반 unique lookup을 쓰기 쉬워서, write 시점에도 session guard를 붙여야 한다.

#### 동작 원리 심화

초기 구현은 `update/delete` 전에 별도 preflight `findFirst`를 수행해 해당 row가 현재 session에 속하는지 확인한 뒤 원래 query를 실행하는 방식이었다. 하지만 extension query hook 안에서 `Prisma.getExtensionContext(this)`로 delegate를 얻어 다시 query하는 방식은 모델 컨텍스트와 session context가 꼬일 위험이 있고, 실제 운영에서 500으로 드러났다.

수정된 방향은 더 단순하다. preflight를 없애고 실제 `update/delete` query의 `where`에 현재 `sessionId`를 직접 병합한다. 그러면 DB에 전달되는 write 자체가 `id + sessionId` 조건을 만족해야만 성공한다. row가 다른 visitor session이면 Prisma가 `P2025`류 not found로 처리할 수 있고, 별도 조회와 본 조회 사이 race도 줄어든다.

#### 프로젝트 코드에서의 적용

대상 파일:

```txt
packages/db/src/demo/clientExtension.ts
packages/db/src/demo/clientExtension.test.ts
```

추가 테스트:

```txt
update - where unique 조건에 sessionId를 직접 추가
delete - where unique 조건에 sessionId를 직접 추가
```

검증:

```bash
cd /home/ddock4you/project/simple-CMS/packages/db
../../node_modules/.bin/vitest run src/demo/clientExtension.test.ts
```

#### 설계 판단

preflight는 사람이 읽기에는 명확하지만 extension 내부에서 다시 Prisma delegate를 호출하는 구조라 복잡도가 높다. query-level guard는 작은 변경이지만 DB가 최종 검증자가 되므로 더 견고하다. 다만 모든 Prisma 작업에 복합 unique가 자동 적용되는 것은 아니므로 `findUnique`/raw SQL/upsert 관습은 계속 별도 관리해야 한다.

### 2. 인증 helper는 같은 resource check라도 demo context 정책을 통일해야 한다

#### 개념

admin API는 인증 사용자를 확인한 뒤, DEMO_MODE에서 `demo.enterWith({ sessionId: user.sessionId })`를 호출해 이후 Prisma query가 visitor session을 보게 한다.

#### 동작 원리 심화

`requirePermission()`은 단일 resource/action 체크에 쓰인다. 반면 `requireAnyPermission()`은 여러 resource 중 하나라도 허용되면 통과하는 OR 권한 체크다. 기능은 다르지만 둘 다 API route의 인증 경계라는 점은 같다.

문제는 `requirePermission()`에만 demo context 부착이 있고 `requireAnyPermission()`에는 없으면, 일부 API만 `__PROD__` fallback session을 볼 수 있다는 점이다. 이런 누락은 권한 검사는 통과했는데 데이터가 비거나 잘못된 tenant를 보는 형태로 드러난다.

#### 프로젝트 코드에서의 적용

대상 파일:

```txt
apps/admin/src/entities/auth/lib/requireAnyPermission.ts
apps/admin/src/entities/auth/lib/requireAnyPermission.test.ts
```

테스트 범위:

```txt
401 미인증
403 권한 없음
OR 권한 통과
DEMO_MODE session context 부착
```

검증:

```bash
cd /home/ddock4you/project/simple-CMS/apps/admin
../../node_modules/.bin/vitest run src/entities/auth/lib/requirePermission.test.ts src/entities/auth/lib/requireAnyPermission.test.ts
```

#### 설계 판단

권한 helper는 단순히 permission boolean을 반환하는 함수가 아니라, API route의 session boundary를 확정하는 인프라 함수다. 따라서 `requirePermission`과 `requireAnyPermission`은 인증 방식, 401/403 응답, DEMO_MODE context 부착 정책이 같아야 한다. 차이는 권한 판정 방식만 남기는 것이 안전하다.

### 3. Hydration mismatch는 데이터 문제처럼 보일 수 있다

#### 개념

React hydration mismatch는 server HTML과 client 첫 렌더 결과가 다를 때 발생한다. React #418은 minified production build에서 이런 mismatch를 압축 코드로 보고한 것이다.

#### 동작 원리 심화

`DemoBanner`는 SSR된 client component다. server render 시 `Date.now()`로 남은 시간을 계산하고, 브라우저 hydration 시 다시 `Date.now()`로 남은 시간을 계산하면 text가 달라질 수 있다. React 19 공식 문서도 `Date.now()`와 `Math.random()`을 hydration mismatch의 대표 원인으로 든다.

Hydration이 실패하면 단순히 콘솔 경고만 나는 것이 아니다. 해당 tree가 client render로 재생성되거나, 경우에 따라 이벤트 attach와 client query 실행 흐름이 불안정해질 수 있다. 그래서 "DB 값이 안 나온다"와 "콘솔 hydration error"를 별개의 우연으로 보지 말고, 먼저 hydration을 안정화해야 한다.

#### 프로젝트 코드에서의 적용

수정 예정 파일:

```txt
apps/admin/src/shared/ui/DemoBanner.tsx
apps/web/src/shared/ui/DemoBanner.tsx
```

현재 문제 패턴:

```tsx
const [remaining, setRemaining] = useState<number>(() =>
  Math.max(0, expiresMs.current - Date.now()),
);
```

수정 방향:

```tsx
const [remaining, setRemaining] = useState<number | null>(null);

useEffect(() => {
  const updateRemaining = () => {
    setRemaining(Math.max(0, expiresMs.current - Date.now()));
  };
  updateRemaining();
  const id = setInterval(updateRemaining, 1000);
  return () => clearInterval(id);
}, []);
```

#### 설계 판단

`suppressHydrationWarning`을 쓰면 경고만 감출 수 있고 mismatch text patch는 보장되지 않는다. 이번 케이스는 첫 렌더 placeholder를 동일하게 만들 수 있으므로 two-pass render가 맞다. 서버와 클라이언트가 같은 "계산 중" text를 렌더하고, client mount 이후에만 시간이 흐르게 하면 구조적으로 안정적이다.

### 4. DEMO_MODE의 prefetch no-op은 의도된 trade-off다

#### 개념

admin은 평소 Server Component에서 TanStack Query `prefetchQuery()`를 실행해 client에 cache를 넘긴다. 하지만 demo admin은 browser cookie와 rewrites/basePath가 중요한 환경이라 server prefetch가 오히려 잘못된 요청을 만들 수 있다.

#### 동작 원리 심화

`apps/admin/src/shared/api/queryClient.ts`는 DEMO_MODE에서 `prefetchQuery`를 no-op으로 덮는다. 이 결정은 RSC navigation 안정성을 위한 것이다. server prefetch가 browser의 `session-token` cookie 없이 API를 호출하면 401/403/404가 섞이고, client navigation에서 RSC payload가 깨질 수 있다.

이 trade-off의 결과는 명확하다. demo 환경에서는 client `useQuery()`가 반드시 첫 fetch를 수행한다. 따라서 `data`는 초기에 undefined이고, 이를 empty state로 취급하면 안 된다.

#### 프로젝트 코드에서의 적용

문제 패턴:

```tsx
const { data } = useQuery(options);
if (!data) return null;
```

수정 패턴:

```tsx
const { data, isPending, isError, error } = useQuery(options);

if (isPending) return <Loading />;
if (isError) return <Error message={error.message} />;

return <Content data={data} />;
```

대상 파일은 debug 문서의 "다음 구현 지시서"에 구체적으로 기록했다.

#### 설계 판단

server prefetch를 다시 켜는 것은 근본 해결처럼 보일 수 있지만, demo 단일 origin + admin basePath + browser cookie 흐름을 다시 깨뜨릴 수 있다. 더 작은 수정은 client query 상태 UI를 정확히 표현하는 것이다. 이것은 운영자 UX도 좋아지고, API가 진짜 실패했는지 화면에서 바로 알 수 있게 해준다.

### 5. 운영 디버깅은 "원인 층"을 분리해야 빠르다

#### 개념

시연 모드에서 "데이터가 안 보인다"는 말은 DB clone, API auth/session, React Query, hydration 중 어느 층에서도 발생할 수 있다.

#### 동작 원리 심화

이번 디버깅에서는 처음에 seed/import/session mismatch 가능성을 넓게 의심했다. 하지만 CRUD 500은 Prisma extension write guard 문제로 확정됐고, 남은 데이터 미표시는 API status 확인 전에는 UI 상태 분기 문제일 수 있다고 재분류했다.

효율적인 순서:

1. 브라우저 console hydration error 확인.
2. Network 탭에서 API status/body 확인.
3. API 200이면 response `data`와 화면 렌더 차이 확인.
4. API 500이면 server log 확인.
5. response data 자체가 0건이면 Supabase visitor `sessionId`별 count 확인.

#### 프로젝트 코드에서의 적용

debug 문서:

```txt
docs/codex/demo-mode-supabase-snapshot-debug-2026-06-04.md
```

이 문서에 현재 상태, 해결된 커밋, 남은 후보, 다음 구현 지시서를 모두 갱신했다. 다음 컨텍스트는 이 문서만 읽어도 어떤 파일을 어떤 순서로 고칠지 알 수 있어야 한다.

#### 설계 판단

문제 원인을 하나로 단정하면 수정이 커지고 위험해진다. 이번처럼 CRUD 500과 hydration mismatch와 blank UI는 서로 연결될 수 있지만, 해결 단위는 분리해야 한다. 먼저 확정된 CRUD write guard를 고치고, 다음으로 hydration 안정화, 그 다음 UI 상태 분기를 고치는 순서가 가장 작고 안전하다.

## 레거시 경험과의 연결

- 레거시에서는 서버가 완성된 HTML table을 내려주기 때문에 "0건"과 "로딩 중"을 크게 구분하지 않아도 됐다. React Query에서는 `undefined`가 정상적인 pending 상태일 수 있으므로 빈 배열과 분리해야 한다.
- 레거시에서 현재 시간 표시는 JSP나 서버 템플릿에서 출력하고 JS가 나중에 덮어써도 큰 문제가 아니었다. SSR React에서는 server HTML과 client 첫 렌더가 일치해야 하므로 시간 계산을 effect 이후로 미루는 사고방식이 필요하다.
- 레거시 운영 디버깅은 WAS 로그와 DB count가 중심이었다. 이번 프로젝트는 Vercel server log, browser Network, React hydration error, TanStack Query state, Supabase row count를 층별로 봐야 한다.
- 기존 운영 경험은 오히려 도움이 됐다. "데이터가 없다"는 표면 증상을 DB 문제로 바로 단정하지 않고, 요청 경로와 화면 상태를 나눠 보는 방식은 레거시 장애 대응 경험의 확장이다.

## 면접 예상 질문 & 답변

### Q1. 시연 모드에서 서버 prefetch를 왜 껐고, 그 부작용은 어떻게 다뤘나요?

#### 답변 예시

시연 admin은 web origin의 `/_cms/admin/*` 아래에서 proxy로 동작하고, 인증은 browser의 `session-token` cookie에 의존합니다. Server Component에서 admin API를 prefetch하면 browser cookie와 동일한 요청 경로가 보장되지 않아 401/404/RSC payload 오류가 발생할 수 있었습니다. 그래서 DEMO_MODE에서는 `queryClient.prefetchQuery`를 no-op으로 두고, client `useQuery()`가 실제 브라우저 cookie를 붙여 데이터를 가져오게 했습니다. 이 선택의 trade-off는 첫 렌더에서 hydrated data가 없기 때문에 `data`가 undefined인 pending 상태가 더 자주 보인다는 점입니다. 따라서 UI에서 `isPending`, `isError`, `isSuccess`를 명확히 분기해야 합니다. 이 방식은 server prefetch를 억지로 복구하는 것보다 변경 범위가 작고, demo 단일 origin 흐름을 깨지 않는 안전한 선택이었습니다. 운영 모드에서는 기존 prefetch 패턴이 그대로 유지되므로 일반 사용자 경험에는 영향이 없습니다.

#### 꼬리 질문 대응

**"그럼 server prefetch에 cookie forwarding을 붙이면 되지 않나요?"**
가능하지만 basePath, rewrite destination, server origin, cookie domain까지 다시 맞춰야 해서 회귀 위험이 큽니다. 이번 이슈의 목적은 demo 안정화였으므로 client query 상태 UI를 보강하는 더 작은 수정을 선택하는 편이 안전합니다.

**"prefetch를 꺼도 성능 문제는 없나요?"**
demo admin은 운영 트래픽이 아니라 시연용이고, Vercel/Supabase region 정렬 이후 API latency도 감당 가능한 수준입니다. 대신 운영 모드는 prefetch를 유지해 기존 성능 특성을 보존합니다.

### Q2. React hydration mismatch를 어떻게 진단했고, 왜 `suppressHydrationWarning`을 쓰지 않았나요?

#### 답변 예시

React #418은 production build에서 hydration mismatch가 minified error로 보이는 형태입니다. React 공식 문서에서 `Date.now()`나 `Math.random()`처럼 server/client 첫 렌더 값이 달라지는 입력을 대표 원인으로 설명하고 있습니다. 이 프로젝트에서는 `DemoBanner`가 `useState(() => Date.now())`로 남은 시간을 첫 렌더에 계산하고 있었고, 서버가 만든 text와 브라우저 hydration 시점의 text가 초 단위로 달라질 수 있었습니다. `suppressHydrationWarning`은 경고를 숨기는 escape hatch일 뿐 mismatch text를 안정적으로 patch하는 해결책은 아닙니다. 이번 케이스는 첫 렌더를 "계산 중" 같은 deterministic placeholder로 고정하고, `useEffect` 이후 countdown을 시작하면 구조적으로 해결됩니다. 그래서 경고 숨김보다 two-pass render를 선택했습니다. 이 판단은 hydration 안정성과 유지보수성을 모두 고려한 것입니다.

#### 꼬리 질문 대응

**"Client Component인데도 서버에서 렌더되나요?"**
Next.js App Router의 Client Component도 초기 HTML을 만들기 위해 서버에서 prerender될 수 있습니다. 따라서 Client Component 내부 첫 렌더도 server/client 일치 제약을 받습니다.

**"모든 시간 표시를 effect 이후로 미뤄야 하나요?"**
SSR HTML과 client 첫 렌더가 달라질 수 있는 시간 표시는 effect 이후로 미루는 것이 안전합니다. 꼭 서버 시간이 필요하면 서버에서 계산한 snapshot을 prop으로 내려 client 첫 렌더도 같은 값을 쓰게 해야 합니다.

### Q3. "데이터가 안 보인다"는 문제를 어떻게 층별로 나눠 진단했나요?

#### 답변 예시

시연 모드는 DB row가 visitor `sessionId`로 격리되기 때문에 데이터 미표시가 곧바로 UI 문제인지 DB 문제인지 알 수 없습니다. 먼저 Supabase에 `__SEED__`와 visitor session row가 있는지 확인해 clone/import 문제를 봅니다. 다음으로 브라우저 Network 탭에서 `/_cms/admin/api/...` 요청의 status와 response body를 확인합니다. 401/403이면 cookie나 permission 문제, 500이면 server log 기준 route 문제, 200인데 data가 있으면 client render 문제로 좁힙니다. 이번에는 CRUD 500은 Prisma extension write guard로 해결됐고, 남은 blank UI는 DEMO_MODE prefetch no-op과 `if (!data) return null` 패턴이 결합된 UI 상태 분기 문제일 가능성이 커졌습니다. 이렇게 층을 나누면 한 번에 큰 수정으로 덮지 않고 작은 원인부터 제거할 수 있습니다. 운영 디버깅에서는 이 분리 자체가 시간 단축에 중요합니다.

#### 꼬리 질문 대응

**"DB count만 확인하면 충분하지 않나요?"**
DB count는 clone/import 층만 확인합니다. API가 올바른 session context로 조회하는지, client가 pending/error를 어떻게 보여주는지는 별도 층이라 Network와 UI 상태 확인이 필요합니다.

**"왜 UI error fallback도 디버깅 도구라고 보나요?"**
화면이 비어 있으면 API 실패와 empty result를 구분할 수 없습니다. error fallback이 있으면 운영자와 개발자가 response 상태를 즉시 인지해 다음 원인을 빠르게 찾을 수 있습니다.

## 트러블슈팅 로그

| 문제 | 원인 | 해결 |
| ---- | ---- | ---- |
| 게시글/게시판/서브페이지 PATCH/DELETE 500 | Prisma demo extension `update/delete` preflight guard가 안정적으로 session-scoped write를 만들지 못함 | preflight 제거, 실제 `where`에 `sessionId` 직접 병합, `clientExtension.test.ts` 회귀 테스트 추가 |
| `requireAnyPermission()` 사용 route의 demo context 누락 위험 | `requirePermission()`과 달리 OR 권한 helper에 `demo.enterWith`가 없음 | `requireAnyPermission()`에도 DEMO_MODE context 부착, 테스트 추가 |
| React #418 콘솔 오류 | `DemoBanner` 첫 렌더에서 `Date.now()` 기반 text 생성 후보 | 다음 구현에서 first render placeholder + effect countdown으로 수정 예정 |
| 여러 admin 페이지가 0건/빈 화면처럼 보임 | DEMO_MODE server prefetch no-op + client component의 `if (!data) return null` 또는 empty 처리 | `isPending`/`isError`/success empty 상태 분기 추가 예정 |
| 원인 후보가 DB/import/session/UI로 섞임 | "데이터가 없다"는 증상이 여러 층에서 발생 가능 | debug 문서에 DB clone, API status, client render 진단 순서 기록 |

## 한 줄 요약 카드

- **Hydration mismatch**: server HTML과 client 첫 렌더가 다르면 React가 mismatch를 보고한다. `Date.now()`/`Math.random()`은 effect 이후로 미루거나 stable snapshot을 써야 한다.
- **`suppressHydrationWarning`**: 경고를 숨기는 escape hatch일 뿐 근본 해결이 아니다. deterministic first render로 고칠 수 있으면 그렇게 고친다.
- **DEMO prefetch no-op**: demo admin은 browser cookie 기반 client query를 신뢰하기 위해 server prefetch를 끈다. 따라서 pending/error UI가 필수다.
- **React Query 상태 분기**: `data === undefined`는 empty가 아니라 pending일 수 있다. `isPending`, `isError`, `isSuccess` 순서로 렌더한다.
- **Demo write guard**: session-scoped write는 preflight보다 실제 `where`에 `sessionId`를 붙이는 방식이 더 단순하고 안전하다.
- **운영 디버깅**: DB count, API status/body, client render를 분리해서 봐야 문제를 작게 고칠 수 있다.

## 추가 학습 자료

- React 공식 문서: `hydrateRoot`, hydration mismatch, two-pass rendering, `suppressHydrationWarning`
- React 19 release notes: improved hydration error reporting
- TanStack Query 공식 문서: Query states, `isPending`, `isError`, `data`, `error`
- 프로젝트 debug 문서: `docs/codex/demo-mode-supabase-snapshot-debug-2026-06-04.md`
- 관련 사전학습: `docs/learning/2-develop/특별편-시연모드-Hydration-ReactQuery디버깅-사전학습.md`
