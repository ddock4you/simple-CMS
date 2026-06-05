# 학습정리: 특별편-시연 모드 세션 캐시 격리와 basePath 페이지네이션

## 구현 요약

시연 모드에서 메뉴, 메인 섹션, 사용자, 브랜딩/푸터 저장이 “찾을 수 없습니다”로 실패하는 문제를 세션 캐시 경계 문제로 분리했다. `QueryProvider`를 authenticated layout 아래로 옮기고 `demoSession.sessionId`를 key로 사용해 새 시연 세션마다 QueryClient를 재생성했다. shadcn pagination이 일반 anchor를 렌더하는 문제는 `ListPagination` href를 query-only로 바꿔 `/_cms/admin` basePath 이탈을 막았다. legacy admin API Route에는 `runWithUserDemoSession`을 명시 적용했고, 활동이력은 데모 모드에서 `where.sessionId = user.sessionId`를 직접 추가했다.

## 핵심 학습 포인트

### 1. QueryClient lifetime은 세션 lifetime과 다르다

#### 개념

TanStack Query의 QueryClient는 서버 상태 cache를 담는 클라이언트 객체다. React Provider가 살아 있는 동안 query key별 data, stale state, mutation cache가 유지된다.

#### 동작 원리 심화

이번 문제의 핵심은 DB session이 바뀌었는데 QueryClient가 바뀌지 않았다는 점이다. `apps/admin/app/api/demo/reset/route.ts`는 기존 visitor `sessionId` 데이터를 `cleanupExpiredSessions({ forceSessionIds: [isolationId] })`로 삭제하고 cookie를 지운다. 이후 `/demo-bootstrap`이 새 sessionId를 만들지만, 기존 root `QueryProvider`가 계속 살아 있으면 `['home', 'list']`, `['navigation', 'detail', menuId]`, `['settings', 'branding']` 같은 cache가 새 session에서도 재사용될 수 있다. 새 session API는 현재 `user.sessionId`로 격리되므로 이전 session의 row id를 받으면 정상적으로 404를 낸다. 따라서 이것은 “운영 DB를 본다”기보다 “새 session에서 이전 session id를 보낸다”는 문제였다.

#### 프로젝트 코드에서의 적용

수정 전에는 `apps/admin/app/layout.tsx`가 전역으로 `<QueryProvider>`를 감쌌다. 수정 후에는 `apps/admin/app/(authenticated)/layout.tsx`에서 다음처럼 인증된 영역만 감싼다.

```tsx
const queryProviderKey = demoSession?.sessionId ?? 'prod';

return (
  <QueryProvider key={queryProviderKey}>
    <SidebarProvider style={stickyOffsetStyle}>...</SidebarProvider>
  </QueryProvider>
);
```

`QueryProvider` 자체는 기존처럼 `useState(() => new QueryClient(...))`를 사용한다. key가 바뀌면 Provider component가 언마운트/리마운트되고, 그 안의 `useState` 초기화도 다시 실행되어 새 QueryClient가 만들어진다.

#### 설계 판단

대안은 모든 query key factory에 `sessionId`를 포함하는 것이었다. 하지만 현재 key factory가 `userKeys`, `navigationKeys`, `homeKeys`, `settingsKeys`, `mediaKeys` 등 넓게 퍼져 있어 누락 위험이 높다. `queryClient.clear()`를 reset 성공 시 호출하는 방법도 가능하지만, 만료나 bootstrap 재진입처럼 reset 버튼을 거치지 않는 경로를 놓칠 수 있다. Provider를 authenticated layout에 두고 sessionId로 keying하면 세션 경계와 cache 경계가 같은 트리 경계로 맞춰져 더 단순하다.

### 2. basePath 환경에서 일반 anchor는 위험하다

#### 개념

Next.js `basePath`는 Next router와 `next/link`가 이해하는 routing prefix다. 일반 브라우저 anchor는 Next runtime을 거치지 않으므로 basePath를 자동으로 붙이지 않는다.

#### 동작 원리 심화

시연 admin은 `apps/admin/next.config.ts`에서 `basePath: '/_cms/admin'`을 쓴다. `next/link`는 공식 문서대로 `<Link href="/about">`을 `/docs/about` 같은 실제 href로 변환한다. 하지만 shadcn pagination의 `PaginationLink`는 `Button`의 `render={<a ... />}` 구조라 일반 `<a>`를 렌더한다. 여기에 `/media?page=2`를 넣으면 브라우저는 origin root의 `/media`로 이동하고, web app에는 해당 route가 없어 404가 된다. 반면 `?page=2`는 현재 pathname, 즉 `/_cms/admin/media`를 유지하면서 query만 바꾼다.

#### 프로젝트 코드에서의 적용

`apps/admin/src/shared/ui/ListPagination.tsx`의 `buildPageUrl`을 다음 방향으로 바꿨다.

```ts
function buildPageUrl(searchParams: ReturnType<typeof useSearchParams>, targetPage: number): string {
  const params = new URLSearchParams(searchParams?.toString() ?? '');
  params.set('page', String(targetPage));
  return `?${params.toString()}`;
}
```

이 수정으로 `/media`, `/audit-logs`를 포함해 `ListPagination`을 쓰는 모든 admin 목록이 현재 admin path 아래에 머문다.

#### 설계 판단

shadcn pagination 내부를 Next Link 기반으로 바꾸는 방법도 있었지만, shadcn 원본 컴포넌트는 직접 수정하지 않는 정책이 있다. 또 pagination은 항상 현재 목록의 page query만 바꾸는 UI라 query-only href가 더 작은 수정이다. 다른 페이지로 이동하는 링크는 계속 Next `Link` 또는 `router.push`를 써야 한다.

### 3. `runWithUserDemoSession`은 암묵적 context를 명시적 scope로 바꾼다

#### 개념

`runWithUserDemoSession(user, fn)`은 데모 모드에서 `demo.runWith({ sessionId: user.sessionId }, fn)`을 호출해 callback 안의 Prisma query가 현재 visitor session을 보게 하는 helper다.

#### 동작 원리 심화

`requirePermission()`도 내부에서 `demo.enterWith({ sessionId: user.sessionId })`를 호출한다. 그래서 기존 Route들이 모두 깨진 것은 아니었다. 하지만 `enterWith`는 현재 async chain에 context를 붙이는 방식이라, handler body 전체가 이 scope 안에 있다는 의도가 코드에서 잘 보이지 않는다. `runWith`는 callback boundary가 명확하고, create/update/delete와 audit log create가 같은 session scope 안에 있다는 사실을 읽기 쉽다. 특히 storage adapter가 `demo.getCurrentSessionId()`로 upload prefix를 만들기 때문에 media upload는 DB create뿐 아니라 파일 경로도 같은 session context에 묶여야 한다.

#### 프로젝트 코드에서의 적용

다음 Route들에 명시 wrapping을 추가했다.

- `apps/admin/app/api/navigation/**`
- `apps/admin/app/api/home/[id]/route.ts`
- `apps/admin/app/api/home/reorder/route.ts`
- `apps/admin/app/api/media/upload/route.ts`
- `apps/admin/app/api/media/branding-upload/route.ts`
- `apps/admin/app/api/users/[id]/role/route.ts`
- `apps/admin/app/api/settings/branding/route.ts`
- `apps/admin/app/api/settings/footer/route.ts`
- `apps/admin/app/api/audit-logs/export/route.ts`

예시는 다음과 같다.

```ts
const { user, error } = await requirePermission('home', 'update');
if (error) return error;

return runWithUserDemoSession(user, async () => {
  // 기존 PATCH 로직
});
```

#### 설계 판단

모든 legacy Route를 한 번에 `defineRoute`로 이관하는 방법도 있지만 변경 범위가 커진다. 이번 작업의 목적은 시연 운영 문제 수정이므로 사용자가 보고한 기능에 집중해 context scope를 보강했다. 장기적으로는 Stage 16b 패턴처럼 `defineRoute`로 점진 이관하는 것이 더 일관적이다.

### 4. 감사 로그는 요구사항을 where에 직접 드러낸다

#### 개념

데모 활동이력은 현재 visitor session에서 발생한 감사 로그만 보여야 한다.

#### 동작 원리 심화

`AuditLog`도 session-isolated model이라 extension이 자동으로 `sessionId`를 붙인다. 그러나 감사 로그는 운영 추적 데이터이므로 누가 어떤 scope를 보는지 코드에서 명시되는 편이 좋다. `where.sessionId = user.sessionId`는 extension과 중복되지만 같은 조건이므로 결과를 바꾸지 않고 의도를 강화한다.

#### 프로젝트 코드에서의 적용

`apps/admin/app/api/audit-logs/route.ts`와 `apps/admin/app/api/audit-logs/export/route.ts`에 다음 조건을 추가했다.

```ts
if (process.env.DEMO_MODE === 'true') where.sessionId = user.sessionId;
```

export route는 추가로 `runWithUserDemoSession`으로 감싸 내보내기 조회와 내보내기 audit log create가 같은 session scope에서 실행되도록 했다.

#### 설계 판단

extension만으로도 작동할 수 있지만, 사용자의 요구는 “현재 사용자의 sessionId와 일치하는 기록만”이었다. 명시 where는 보안 요구사항과 코드가 직접 연결되어 리뷰하기 쉽다. 단, 운영 모드에서는 기존 전역 감사 로그 조회 정책을 유지해야 하므로 `DEMO_MODE` 분기 안에만 추가했다.

## 레거시 경험과의 연결

- 레거시에서는 session 전환이나 관리자 이동이 대부분 full page reload였기 때문에 브라우저 메모리 cache가 다음 사용자까지 살아남는 문제가 덜했다.
- 이번 프로젝트는 React Provider와 QueryClient가 앱 내부에서 오래 살아 있으므로, 인증/session 경계와 cache 경계를 직접 설계해야 한다.
- 레거시에서 PK가 없으면 “삭제된 데이터”로 봤다면, 여기서는 “다른 tenant/session의 PK일 수도 있다”는 관점이 추가된다.
- 기존 운영 경험에서 익숙한 “URL이 어디로 이동했는지 Network/주소창으로 확인”하는 습관은 basePath 이탈 문제를 찾는 데 그대로 도움이 된다.
- SQL에 tenant 조건을 직접 넣던 감각은 `where.sessionId` 명시 필터와 raw SQL 주의사항을 판단하는 데 도움이 된다.

## 면접 예상 질문 & 답변

### Q1. 시연 모드에서 CRUD가 404를 냈는데 왜 DB 문제가 아니라 캐시 문제로 판단했나요?

#### 답변 예시

먼저 에러가 난 API Route들을 확인했을 때 대부분 `requirePermission()`을 먼저 호출하고 있었고, 이 helper가 데모 모드에서 `demo.enterWith({ sessionId })`를 실행하고 있었습니다. Prisma extension도 `findUnique({ id })` 결과의 sessionId를 검증하도록 설계되어 있어서 id lookup 자체가 운영 DB를 직접 보는 구조는 아니었습니다. 반면 TanStack Query의 QueryClient는 root layout에 있어서 demo reset과 bootstrap을 거쳐도 같은 인스턴스가 유지될 수 있었습니다. query key에는 sessionId가 없었기 때문에 이전 visitor session의 menuId, sectionId, mediaId가 새 session UI에 남을 수 있었습니다. 새 session의 API가 이전 id를 받으면 현재 session에서는 row가 없으므로 404가 나는 것이 정상입니다. 그래서 DB 격리 자체보다 세션 전환 시 client cache 경계를 맞추는 것이 우선이라고 판단했습니다. 이 판단은 reset API가 기존 session row를 실제로 삭제한다는 점과도 일치했습니다.

#### 꼬리 질문 대응

**"query key에 sessionId를 넣으면 안 되나요?"**

가능합니다. 하지만 모든 key factory와 prefetch/mutation invalidation을 빠짐없이 바꿔야 하므로 누락 위험이 컸고, 이번 문제는 세션 경계에서 QueryClient 전체를 새로 만드는 편이 더 단순했습니다.

**"queryClient.clear()와 어떤 차이가 있나요?"**

`clear()`는 특정 이벤트에서 수동으로 cache를 비우는 방식입니다. Provider keying은 React 트리 경계 자체를 session과 맞추므로 reset 버튼 외의 재진입 경로도 더 자연스럽게 처리합니다.

### Q2. Next.js basePath가 있는데 왜 페이지네이션은 public web 404로 이동했나요?

#### 답변 예시

Next.js basePath는 `next/link`나 Next router가 내부 링크를 처리할 때 자동 적용됩니다. 하지만 해당 pagination 컴포넌트는 shadcn UI의 일반 `<a>`를 렌더하고 있었습니다. 일반 anchor의 `href="/media?page=2"`는 브라우저 표준상 origin root의 `/media`를 의미하므로, `/_cms/admin/media`가 아니라 public web app의 `/media`로 이동했습니다. public web에는 관리자 미디어 route가 없어서 404가 표시된 것입니다. 해결은 shadcn 원본을 Next Link로 바꾸는 대신 `ListPagination`이 `?page=2`처럼 query-only href를 만들게 했습니다. query-only href는 현재 pathname을 유지하므로 `/_cms/admin/media?page=2`로 해석됩니다. pagination은 현재 목록 화면의 page query만 바꾸는 기능이라 이 방식이 가장 작은 수정이었습니다.

#### 꼬리 질문 대응

**"모든 anchor를 query-only로 바꿔도 되나요?"**

아닙니다. query-only href는 현재 페이지 안에서 query만 바꿀 때 적합합니다. 다른 route로 이동하는 링크는 Next `Link`나 `router.push`를 써야 basePath와 client navigation이 안전합니다.

**"shadcn 컴포넌트를 직접 수정하지 않은 이유는 무엇인가요?"**

프로젝트 정책상 shadcn 원본은 직접 수정하지 않고 wrapper나 호출부에서 조정합니다. 이번 문제는 pagination 호출부의 href 생성만 바꿔도 해결되므로 원본 변경이 불필요했습니다.

### Q3. `runWithUserDemoSession`을 추가했는데 기존 `requirePermission`의 `enterWith`와 중복 아닌가요?

#### 답변 예시

기능적으로 일부 중복은 맞습니다. `requirePermission()`은 인증과 권한 확인 뒤 데모 모드에서 `demo.enterWith({ sessionId })`를 호출합니다. 그러나 `enterWith`는 현재 async chain에 context를 붙이는 방식이라 handler body의 scope가 코드 구조로 명확히 드러나지 않습니다. `runWithUserDemoSession`은 callback 안의 모든 Prisma query, audit log create, storage prefix 계산이 같은 session scope에서 실행된다는 점을 명시합니다. 특히 오래된 직접 작성 Route는 `defineRoute`와 달리 공통 래핑이 없었기 때문에 실전 디버깅에서 의심 지점이 되었습니다. 이번에는 사용자가 보고한 기능에 우선 적용해 fallback 가능성을 줄이고 코드 가독성을 높였습니다. 장기적으로는 legacy Route를 `defineRoute`로 이관해 같은 패턴을 표준화할 수 있습니다.

#### 꼬리 질문 대응

**"모든 Route에 바로 적용하지 않은 이유는 무엇인가요?"**

한 번에 전체 Route를 바꾸면 회귀 범위가 커집니다. 이번에는 증상이 확인된 기능과 관련된 route를 우선 보강하고, 나머지는 별도 리팩터링으로 진행하는 편이 안전합니다.

**"raw SQL에도 이 helper만 있으면 충분한가요?"**

아닙니다. Prisma extension은 `$queryRaw`를 가로채지 못합니다. raw SQL은 `demo.getCurrentSessionId()`를 사용해 SQL where에 직접 sessionId를 넣어야 합니다.

## 트러블슈팅 로그

| 문제 | 원인 | 해결 |
| ---- | ---- | ---- |
| 메뉴/메인/사용자/브랜딩 저장 시 “찾을 수 없습니다” | 새 데모 세션에서도 이전 QueryClient cache의 stale id가 남을 수 있음 | `QueryProvider`를 authenticated layout으로 이동하고 `key={demoSession.sessionId}` 적용 |
| 미디어/활동이력 페이지네이션 클릭 시 public web 404 | shadcn pagination이 일반 `<a href="/media?...">`를 렌더해 basePath를 우회 | `ListPagination` href를 `?page=...` query-only로 변경 |
| legacy Route가 운영 fallback을 의심받음 | `requirePermission`의 context attach는 있었지만 handler body scope가 암묵적 | 관련 Route를 `runWithUserDemoSession`으로 명시 래핑 |
| 활동이력 데모 데이터 요구 불명확 | extension filtering만으로는 코드상 요구가 잘 보이지 않음 | 데모 모드에서 `where.sessionId = user.sessionId` 명시 추가 |

## 한 줄 요약 카드

- **QueryClient 세션 경계**: "서버 session이 바뀌어도 React Provider가 살아 있으면 cache는 남는다. 데모처럼 sessionId가 데이터 tenant인 구조에서는 Provider keying으로 cache lifetime을 session lifetime에 맞춘다."
- **basePath와 anchor**: "Next `Link`는 basePath를 알지만 일반 `<a>`는 모른다. 현재 페이지 query만 바꾸는 pagination은 `?page=2`가 가장 안전하다."
- **stale id 404**: "다른 session의 id를 현재 session API에 보내면 404가 정상이다. 이는 cross-tenant 접근 차단이 작동한다는 뜻이다."
- **명시 session scope**: "`runWithUserDemoSession`은 Route Handler 본문이 어떤 visitor session에서 실행되는지 코드 구조로 드러낸다."
- **AuditLog 격리**: "운영 추적 데이터는 extension에만 기대지 않고 데모 모드 where에 sessionId를 명시하면 요구사항이 더 선명해진다."

## 추가 학습 자료

- TanStack Query 공식 문서: QueryClientProvider, stable QueryClient, `queryClient.clear()`, `invalidateQueries()`
- Next.js 공식 문서: `basePath`, `next/link`의 basePath 자동 prefix
- 관련 사전학습: `docs/learning/2-develop/특별편-시연모드-Hydration-ReactQuery디버깅-사전학습.md`
- 관련 학습정리: `docs/learning/2-develop/특별편-시연DB세션스코프-Snapshot복구-학습정리.md`
