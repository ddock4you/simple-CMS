# 사전학습: 특별편-시연 모드 세션 캐시 격리와 basePath 페이지네이션

이 문서는 기존 `특별편-시연모드-Hydration-ReactQuery디버깅`과 `특별편-시연DB세션스코프-Snapshot복구`의 실전 후속편이다. 앞선 문서가 데이터가 비어 보이는 원인을 DB seed/session scope 관점에서 분리했다면, 여기서는 **새 시연 세션으로 바뀐 뒤에도 브라우저의 서버 상태 캐시와 일반 anchor 링크가 이전 경계를 유지하는 문제**를 다룬다.

## 이 주제에서 다루는 기술

- TanStack Query QueryClient — 서버 상태 캐시를 보관하고 query key 기준으로 재사용한다.
- Next.js basePath — 앱을 `/`가 아닌 하위 경로에 배치할 때 라우팅 prefix를 적용한다.
- Prisma demo extension — 현재 AsyncLocalStorage `sessionId`를 Prisma query에 자동 주입한다.
- AsyncLocalStorage `runWith` — Route Handler 본문을 특정 visitor session scope 안에서 실행한다.
- Browser URL resolution — 일반 `<a href="?...">`와 `<a href="/path?...">`가 서로 다르게 현재 경로를 해석한다.

## 핵심 개념

### 1. QueryClient는 사용자 세션보다 오래 살 수 있다

#### 정의

TanStack Query의 QueryClient는 React 트리 안에서 생성된 뒤, 그 Provider가 언마운트되기 전까지 query cache와 mutation cache를 유지하는 객체다.

#### 동작 원리

QueryClient는 query key를 기준으로 서버 응답을 저장한다. 예를 들어 `['home', 'list']` key로 받은 HomeSection 목록은 같은 key를 다시 요청하면 staleTime 안에서 그대로 재사용될 수 있다. 공식 문서도 React에서 QueryClient를 `useState(() => new QueryClient())`로 안정적으로 만들라고 설명한다. 이 패턴은 일반 앱에서는 올바르지만, 데모처럼 **같은 브라우저 탭에서 session-token cookie가 바뀌는 환경**에서는 Provider가 계속 살아 있으면 이전 session의 row id가 cache에 남는다. query key에 `sessionId`가 없으면 새 visitor session으로 바뀌어도 `['navigation', 'detail', menuId]`, `['media', 'list', filters]` 같은 key가 같은 데이터로 해석된다.

#### 이 프로젝트에서의 적용

Simple CMS admin은 root `app/layout.tsx`에 QueryProvider가 있었다. 데모 reset은 기존 visitor row를 지우고 `/demo-bootstrap`에서 새 session을 만든다. 그런데 root Provider가 유지되면 메뉴 항목 id, HomeSection id, Media id, User id가 이전 세션 값으로 남을 수 있다. 이 상태에서 API는 현재 sessionId로 정상 격리하므로, 이전 id를 찾지 못해 `메뉴 항목을 찾을 수 없습니다`, `섹션을 찾을 수 없습니다` 같은 오류가 발생한다.

### 2. session-scoped API는 stale id를 정상적으로 거부한다

#### 정의

session-scoped API는 요청자가 가진 `user.sessionId`와 일치하는 row만 읽고 변경하는 API다.

#### 동작 원리

Prisma extension은 `findMany`, `count`, `updateMany` 등에 `AND: [{...where}, { sessionId }]`를 추가한다. `findUnique({ where: { id } })`는 id lookup 후 결과의 `sessionId`를 비교하고, 불일치하면 `null`을 반환한다. `update`와 `delete`는 `where`에 `sessionId`를 직접 병합해 cross-session write를 막는다. 따라서 stale id가 들어왔을 때 404나 P2025가 나는 것은 extension이 깨진 것이 아니라 격리가 작동한다는 신호다.

#### 이 프로젝트에서의 적용

`apps/admin/src/shared/api/runWithUserDemoSession.ts`는 `DEMO_MODE=true`일 때 handler body를 `demo.runWith({ sessionId: user.sessionId }, fn)`으로 감싼다. `defineRoute` 기반 API는 이미 이 패턴을 갖고 있지만, 오래된 직접 작성 Route는 `requirePermission()`의 `demo.enterWith()`에 의존하는 경우가 있었다. 기능이 동작해도 경계가 암묵적이면 디버깅이 어려우므로, CRUD Route에서는 handler body를 명시적으로 감싸는 것이 운영 디버깅에 유리하다.

### 3. Next.js basePath는 Next Link에 자동 적용되지만 일반 anchor에는 적용되지 않는다

#### 정의

basePath는 Next.js 앱을 `/docs`, `/_cms/admin` 같은 하위 경로에서 서비스할 때 내부 라우팅 경로 앞에 붙는 prefix다.

#### 동작 원리

Next.js 공식 문서에 따르면 `next/link`는 `basePath`가 설정되어 있을 때 `<Link href="/about">`을 실제 HTML에서 `/docs/about`처럼 자동 prefix한다. 반대로 일반 `<a href="/about">`는 브라우저 표준 anchor일 뿐이라 Next.js가 basePath를 붙이지 않는다. 브라우저에서 `/path`로 시작하는 href는 origin root 기준 절대 경로이고, `?page=2`처럼 query만 있는 href는 현재 pathname을 유지한 채 query만 바꾼다.

#### 이 프로젝트에서의 적용

시연 admin은 `apps/admin/next.config.ts`에서 `basePath: '/_cms/admin'`을 사용한다. `ListPagination`은 shadcn pagination을 통해 일반 `<a>`를 렌더하므로 `/media?page=2`는 `/_cms/admin/media`가 아니라 public web의 `/media`로 이동한다. 따라서 pagination처럼 현재 목록 화면의 query만 바꾸는 UI는 `?page=2` 형태가 가장 작은 수정이다.

### 4. 감사 로그는 extension 격리와 명시 필터를 함께 써도 된다

#### 정의

감사 로그의 session filtering은 현재 visitor가 만든 활동 이력만 조회하도록 제한하는 정책이다.

#### 동작 원리

일반 모델 query는 Prisma extension이 `sessionId`를 자동 주입한다. 하지만 감사 로그는 운영 추적 데이터이기 때문에 의도한 scope를 코드에서 바로 읽을 수 있어야 한다. `where.sessionId = user.sessionId`를 명시하면 extension과 중복되더라도 결과는 같고, 디버깅 시 query policy가 더 분명해진다.

#### 이 프로젝트에서의 적용

`AuditLog` 모델에는 `sessionId`가 있고, `logAuditEvent()`의 create도 demo context 안에서는 자동으로 현재 sessionId를 받는다. 목록/내보내기 API에서는 데모 모드일 때 명시 필터를 추가해 “현재 사용자의 sessionId와 일치하는 기록만 보인다”는 요구를 코드 레벨에서 표현한다.

## 레거시 ↔ 모던 대조표

| 관점 | 레거시 환경에서는 | 이 프로젝트에서는 |
| ---- | ----------------- | ----------------- |
| 세션 전환 | 로그아웃 후 새 로그인으로 서버 세션이 바뀌면 페이지 전체 reload로 화면 상태도 초기화 | SPA/RSC 전환 중 Provider가 살아 있어 서버 상태 캐시를 별도 초기화해야 함 |
| 목록 페이지 링크 | `<a href="/admin/list?page=2">`처럼 서버 경로를 직접 작성 | Next basePath와 client router를 고려해 `Link`, `router.push`, query-only href를 구분 |
| 데이터 격리 | SQL마다 `WHERE tenant_id = ?`를 직접 작성 | Prisma extension이 자동 주입하되 Route Handler는 `runWithUserDemoSession`으로 context를 제공 |
| stale id 처리 | 삭제된 PK로 update하면 DB row count 0 또는 오류 | sessionId가 다른 id도 삭제된 id처럼 404/P2025로 처리되어 cross-tenant write를 막음 |
| 감사 로그 | 전역 admin 로그를 한 테이블에서 기간별 조회 | 데모에서는 visitor sessionId별 로그만 보여 시연 참가자 간 기록을 분리 |

## 구현 시 주의할 점

- QueryClient를 root에 두면 인증되지 않은 화면까지 cache lifetime이 이어질 수 있다.
- query key에 sessionId를 넣는 방법도 가능하지만, 모든 key factory를 바꾸지 않으면 누락이 생긴다.
- `queryClient.clear()`는 즉시 cache를 비우지만, session이 바뀔 때마다 Provider를 key로 재마운트하는 쪽이 더 구조적이다.
- `runWithUserDemoSession`은 `requirePermission` 이후에 호출해야 한다. user를 알기 전에는 어떤 sessionId로 감쌀지 결정할 수 없다.
- 일반 `<a href="/path">`는 Next basePath를 모른다. shadcn 컴포넌트가 내부적으로 anchor를 렌더하는지 확인해야 한다.
- `?page=2`는 현재 pathname을 유지하므로 pagination에는 적합하지만, 다른 목록으로 이동하는 링크에는 적합하지 않다.
- 감사 로그 같은 운영 데이터는 extension에만 의존하기보다 명시 where를 추가하면 요구사항과 코드가 더 잘 맞는다.

## 이 주제를 마치면 설명할 수 있어야 하는 것

- [ ] 데모 reset 후 이전 세션의 id가 새 세션 API에서 404가 되는 이유는 무엇인가?
- [ ] QueryClient를 sessionId로 keying하는 방식과 query key에 sessionId를 포함하는 방식의 차이는 무엇인가?
- [ ] `next/link`와 일반 `<a>`가 basePath 환경에서 다르게 동작하는 이유는 무엇인가?
- [ ] `runWithUserDemoSession`이 `requirePermission` 이후에 호출되어야 하는 이유는 무엇인가?
- [ ] AuditLog에서 extension filtering과 명시 `where.sessionId`를 함께 쓰는 것이 왜 허용 가능한가?
