# 사전학습: 시연 모드 Hydration + React Query 디버깅

이 문서는 기존 시연 모드 구현 문서들의 후속 실전 디버깅 편이다. `특별편-시연모드구현-PrismaExtension-AsyncLocalStorage-Sentinel`은 DB 격리 인프라를, `특별편-시연부트스트랩-FK클론-단일origin-LayoutGate`는 visitor 자동 진입을, `특별편-시연배포실전-Vercel모노레포-Storybook서브디렉토리`는 배포 함정을 다룬다. 이번 문서는 그 위에서 실제 운영 중 나타난 React hydration mismatch와 DEMO_MODE React Query 데이터 표시 문제를 다룬다.

## 이 주제에서 다루는 기술

- **React hydration** - server HTML에 client React tree를 붙이는 단계. 첫 client render가 server HTML과 일치해야 한다.
- **React 19 hydration error reporting** - `Date.now()`/`Math.random()`/locale formatting 같은 가변 입력이 mismatch 원인으로 더 명확히 보고된다.
- **TanStack Query v5 query states** - `isPending`, `isError`, `isSuccess`, `data`를 구분해 loading/error/success UI를 안정적으로 렌더한다.
- **Next.js App Router Server Component prefetch** - Server Component에서 `prefetchQuery` 후 `HydrationBoundary`로 client cache를 넘기는 패턴.
- **DEMO_MODE prefetch no-op** - admin server prefetch가 browser cookie 없이 API를 호출해 깨지는 것을 막기 위해 demo에서는 prefetch를 비활성화한다.
- **AsyncLocalStorage 기반 demo session context** - Prisma extension이 현재 visitor `sessionId`를 알 수 있도록 요청 async chain에 context를 부착한다.

## 핵심 개념

### 1. Hydration은 "첫 렌더 일치"가 핵심이다

#### 정의

Hydration은 서버가 만든 HTML을 브라우저가 먼저 표시한 뒤, React가 client에서 같은 component tree를 다시 렌더해 이벤트 핸들러와 state를 붙이는 과정이다.

#### 동작 원리

흐름은 다음과 같다.

1. Server Component와 Client Component의 SSR 결과가 HTML 문자열로 생성된다.
2. 브라우저는 HTML을 받아 즉시 paint한다.
3. JS bundle이 내려오면 React가 client에서 같은 tree를 다시 계산한다.
4. React는 server DOM과 client render 결과의 text/attribute/tree 구조를 비교한다.
5. 일치하면 기존 DOM을 재사용하고 이벤트를 attach한다.
6. 불일치하면 mismatch error를 내고 해당 tree를 client 렌더로 재생성하거나 가장 가까운 boundary까지 fallback한다.

React 공식 문서는 hydration mismatch 원인으로 `Date.now()`, `Math.random()`, server/client branch, locale-dependent date formatting, 외부 변경 데이터를 명시한다. 특히 text content mismatch는 단순 warning이 아니라 client tree 재생성으로 이어질 수 있다.

#### 이 프로젝트에서의 적용

시연 배너는 `expiresAt`을 받아 "남은 시간 59분 58초" 같은 text를 렌더한다. 그런데 기존 코드가 `useState(() => Date.now())`로 첫 렌더 값을 계산하면 서버 HTML과 client 첫 렌더 사이에 1초 이상 차이가 생긴다.

문제 파일:

```tsx
// apps/admin/src/shared/ui/DemoBanner.tsx
// apps/web/src/shared/ui/DemoBanner.tsx
const [remaining, setRemaining] = useState<number>(() =>
  Math.max(0, expiresMs.current - Date.now()),
);
```

이 코드는 client component지만 서버에서도 SSR HTML을 만든다. 따라서 첫 렌더의 `Date.now()`는 서버 시간과 브라우저 hydration 시간이 서로 달라질 수 있다.

정답은 첫 렌더를 deterministic placeholder로 만들고, client mount 이후 `useEffect`에서 countdown을 시작하는 two-pass render다.

```tsx
const [remaining, setRemaining] = useState<number | null>(null);

useEffect(() => {
  setRemaining(Math.max(0, expiresMs.current - Date.now()));
}, []);

return <span>남은 시간 {remaining === null ? '계산 중' : formatRemaining(remaining)}</span>;
```

### 2. `suppressHydrationWarning`은 해결책이 아니라 escape hatch다

#### 정의

`suppressHydrationWarning`은 특정 element의 hydration mismatch 경고를 숨기는 React escape hatch다.

#### 동작 원리

이 prop은 한 단계 깊이의 text/attribute mismatch warning을 숨긴다. 하지만 React 공식 문서 기준으로 React가 mismatched text를 patch한다는 보장은 없다. 즉 "경고가 안 보이게" 할 뿐, server HTML과 client tree가 다르다는 구조적 문제는 남는다.

#### 이 프로젝트에서의 적용

`DemoBanner` countdown mismatch는 피할 수 없는 mismatch가 아니다. 첫 렌더 placeholder를 동일하게 만들 수 있으므로 `suppressHydrationWarning`을 쓰면 안 된다.

적절한 판단:

| 상황 | 선택 |
|---|---|
| 사용자 locale 날짜처럼 server/client가 본질적으로 다를 수 있음 | 제한적으로 `suppressHydrationWarning` 고려 |
| `Date.now()`를 첫 렌더에서 호출했기 때문에 다름 | `useEffect` 이후 계산으로 수정 |
| `Math.random()`으로 id 생성 | `useId()` 또는 stable id 사용 |
| 외부 데이터가 server/client에서 다름 | server snapshot을 client에 같이 전달 |

### 3. DEMO_MODE에서 server prefetch는 의도적으로 비활성화되어 있다

#### 정의

admin의 일반 페이지는 Server Component에서 TanStack Query `prefetchQuery()`를 실행하고, `HydrationBoundary`로 client에 cache를 넘긴다. 하지만 DEMO_MODE에서는 이 prefetch가 no-op이다.

#### 동작 원리

일반 흐름:

1. Server Component가 `getQueryClient()` 호출.
2. `queryClient.prefetchQuery(options)`가 admin API를 호출.
3. `dehydrate(queryClient)` 결과가 HTML payload에 포함.
4. Client Component의 `useQuery()`는 hydrated cache를 즉시 사용.

DEMO_MODE 흐름:

```ts
// apps/admin/src/shared/api/queryClient.ts
if (process.env.DEMO_MODE === 'true') {
  queryClient.prefetchQuery = (() => Promise.resolve()) as typeof queryClient.prefetchQuery;
}
```

이유는 Server Component prefetch가 browser의 `session-token` cookie 없이 admin API를 호출할 수 있기 때문이다. 시연 admin은 web origin의 `/_cms/admin/*` 아래에서 동작하며, session cookie와 basePath/proxy가 얽혀 있다. 서버 prefetch가 잘못된 origin/path/cookie로 호출되면 RSC navigation이 깨진다. 그래서 demo에서는 client `useQuery()`가 실제 브라우저 cookie를 붙여 API를 호출하게 한다.

#### 이 프로젝트에서의 적용

이 정책 자체는 맞다. 문제는 여러 client component가 `data === undefined` 상태를 loading으로 표시하지 않는 것이다.

나쁜 패턴:

```tsx
const { data } = useQuery(options);
if (!data) return null;
```

또 다른 나쁜 패턴:

```tsx
const { data: menus } = useQuery(menuSetListOptions());
return !menus || menus.length === 0 ? <Empty /> : <List menus={menus} />;
```

DEMO_MODE에서는 첫 client render에서 `data`가 `undefined`인 것이 정상이다. 이때 `null`이나 empty UI를 렌더하면 운영자는 "DB 데이터가 없다"고 오해한다.

### 4. TanStack Query의 상태는 `data` 하나로 판단하지 않는다

#### 정의

TanStack Query v5의 query는 `isPending`, `isError`, `isSuccess` 같은 상태 flag를 제공한다. `data`는 성공 전에는 undefined일 수 있고, 성공 이후에도 empty array일 수 있다.

#### 동작 원리

공식 권장 패턴:

```tsx
const { isPending, isError, data, error } = useQuery({ queryKey, queryFn });

if (isPending) return <Loading />;
if (isError) return <Error message={error.message} />;

return <Success data={data} />;
```

상태 의미:

| 상태 | 의미 | UI |
|---|---|---|
| `isPending` | 아직 사용할 data가 없음 | loading skeleton 또는 안내 |
| `isError` | queryFn이 throw함 | error message 표시 |
| `isSuccess` | data 사용 가능 | 실제 table/list/form 렌더 |
| `isFetching` | 초기 fetch 또는 background refetch 중 | 보조 spinner, refresh indicator |

#### 이 프로젝트에서의 적용

다음 파일은 demo 환경에서 loading/error를 숨기기 쉬운 대표 파일이다.

```txt
apps/admin/src/pages/navigation-management/ui/NavigationListClient.tsx
apps/admin/src/pages/home-management/ui/HomePageClient.tsx
apps/admin/src/features/user-management/ui/UserTable.tsx
apps/admin/src/features/subpage-feedback/ui/FeedbackStatsSection.tsx
apps/admin/src/features/subpage-feedback/ui/FeedbackListTable.tsx
apps/admin/src/features/audit-log/ui/AuditLogTable.tsx
apps/admin/src/features/error-log/ui/ErrorLogTable.tsx
apps/admin/src/features/site-settings/ui/*SettingsForm.tsx
```

수정 후에는 "0건"과 "아직 로딩 중"과 "API 실패"가 분리되어야 한다. 이 분리는 사용자 경험 개선이면서 동시에 디버깅 도구다. API가 500이면 화면이 비는 대신 에러 메시지가 보이고, 다음 원인 추적이 쉬워진다.

### 5. demo session 문제와 UI 상태 문제를 분리해서 진단해야 한다

#### 정의

시연 모드 데이터 누락은 크게 세 층에서 발생할 수 있다.

#### 동작 원리

| 층 | 확인할 것 | 증상 |
|---|---|---|
| DB clone/import | visitor `sessionId` row가 실제로 생성됐는지 | API가 200이어도 실제 count 0 |
| API/session context | API route가 visitor sessionId로 Prisma query를 수행하는지 | 401/403/500 또는 잘못된 데이터 |
| Client query/render | `useQuery()` 상태를 화면이 어떻게 표현하는지 | API 200인데 화면이 빈 상태처럼 보임 |

이번 분석에서는 CRUD 500은 DB clone 문제가 아니라 Prisma demo extension write guard 문제였다. 반면 남은 "대부분의 admin 페이지가 비어 보임"은 아직 API status 확인 전이며, 정적 분석상 client query 상태 UI 누락 가능성이 크다.

#### 이 프로젝트에서의 적용

진단 순서:

1. Network 탭에서 `/_cms/admin/api/...` 요청 status와 body 확인.
2. 401/403이면 session cookie 또는 permission 확인.
3. 500이면 Vercel server log의 `console.error` 확인.
4. 200이면 response body의 `data`가 비어 있는지 확인.
5. response body에 data가 있는데 화면이 비면 React Query UI 분기 문제.
6. response body data 자체가 비어 있으면 Supabase visitor `sessionId`별 count 확인.

## 레거시 ↔ 모던 대조표

| 관점 | 레거시 환경에서는 | 이 프로젝트에서는 |
| ---- | ----------------- | ----------------- |
| 첫 화면 렌더 | 서버가 HTML을 만들고 jQuery가 나중에 붙어도 DOM mismatch 개념이 약함 | SSR HTML과 client React 첫 렌더가 일치해야 hydration 성공 |
| 시간 표시 | JSP/서버 템플릿에서 현재 시간 출력 후 JS로 덮어쓰기 | 첫 렌더에서는 deterministic placeholder, `useEffect` 이후 시간 계산 |
| 데이터 로딩 | page load마다 서버가 완성된 HTML table을 내려줌 | Server prefetch + HydrationBoundary 또는 client `useQuery()`로 server state 동기화 |
| 빈 데이터 표시 | SQL 결과 0건이면 바로 빈 table | React Query에서는 `undefined`는 로딩, `[]`는 성공한 빈 결과로 구분 |
| 오류 표시 | 서버 error page 또는 alert 중심 | query state의 `isError`로 화면 내 error fallback 표시 |
| 운영 디버깅 | WAS 로그와 DB count 확인 중심 | Network 탭, React hydration error, Query 상태, Vercel log, Supabase row count를 층별로 분리 |
| 멀티테넌시 | 세션별 DB schema 또는 WHERE 조건 직접 관리 | AsyncLocalStorage + Prisma extension이 `sessionId`를 자동 주입하되 raw SQL/API boundary는 별도 확인 |

## 구현 시 주의할 점

- 첫 렌더에서 `Date.now()`, `Math.random()`, locale-dependent formatting을 호출하지 않는다.
- `suppressHydrationWarning`을 먼저 쓰지 않는다. deterministic first render로 고칠 수 있으면 그게 정답이다.
- DEMO_MODE에서 `prefetchQuery`가 no-op이라는 사실을 기억한다. client query가 정상적으로 pending 상태를 거친다.
- `data === undefined`를 empty state로 취급하지 않는다. `isPending`, `isError`, `isSuccess` 순서로 분기한다.
- settings form은 기본값이 실제 DB 값처럼 보일 수 있으므로 query pending 중 form을 렌더하지 않는다.
- Network 탭에서 API status/body를 확인하기 전에는 DB clone 문제로 단정하지 않는다.
- admin client fetch는 demo path에서 `/_cms/admin/api/...`로 나가야 한다. `fetchClient.resolveAdminApiPath()` 정책을 우회하지 않는다.
- API route에서 직접 Prisma를 쓰면 `requirePermission()`/`runWithUserDemoSession()` 경계를 확인한다.
- 브라우저 console의 React #418만 보고 끝내지 말고, 어떤 text/attribute가 server/client에서 달라졌는지 후보를 grep한다.

## 이 주제를 마치면 설명할 수 있어야 하는 것

- [ ] React hydration mismatch가 왜 `Date.now()`/`Math.random()`에서 발생하는지 설명할 수 있는가?
- [ ] `suppressHydrationWarning`을 남용하면 왜 근본 해결이 아닌지 설명할 수 있는가?
- [ ] DEMO_MODE에서 admin `prefetchQuery`를 no-op으로 둔 이유와 그 trade-off를 설명할 수 있는가?
- [ ] TanStack Query의 `isPending`, `isError`, `isSuccess`, `data`를 어떻게 구분해서 UI에 반영하는지 설명할 수 있는가?
- [ ] 시연 모드 데이터 미표시를 DB clone, API session context, client render 세 층으로 나눠 진단할 수 있는가?

## 참고 자료

- React 공식 문서: `hydrateRoot` hydration mismatch, two-pass rendering, `suppressHydrationWarning` escape hatch
- React 19 release notes: improved hydration error reporting and `Date.now()`/`Math.random()` mismatch 예시
- TanStack Query 공식 문서: Query states with `isPending`, `isError`, `data`, `error`
- 프로젝트 문서: `docs/codex/demo-mode-supabase-snapshot-debug-2026-06-04.md`
- 프로젝트 문서: `docs/learning/2-develop/10-사용자피드백-익명수집-Hydration경계-사전학습.md`
