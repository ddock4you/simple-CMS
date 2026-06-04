# 사전학습: 특별편-시연 DB 세션 스코프와 Snapshot 복구

이 문서는 기존 `특별편-시연PR6-7-Snapshot운영워크플로우`와 `특별편-시연모드-Hydration-ReactQuery디버깅`의 실전 후속편이다. 앞선 문서가 snapshot 구조와 UI 상태 구분을 다뤘다면, 여기서는 **Supabase에 복제된 여러 `sessionId` row를 읽고 "API 200 + data: []"가 코드 문제인지 seed 문제인지 분리하는 운영 디버깅**에 집중한다.

## 이 주제에서 다루는 기술

- Prisma extension — `DEMO_MODE=true`에서 현재 AsyncLocalStorage sessionId를 모든 Prisma 쿼리에 자동 주입한다.
- AsyncLocalStorage — Route Handler, Server Component, metadata 함수에서 시연 visitor session을 전파한다.
- `__PROD__` / `__SEED__` / visitor `sessionId` — 운영 데이터, 시연 원본 seed, 방문자별 복제 데이터를 구분하는 sentinel 정책.
- Snapshot export/import — 개발 DB 데이터를 JSON + Media base64로 옮기고 `__SEED__`에 재적재한다.
- React Server Component render order — layout gate가 항상 page 데이터 조회보다 먼저 실행된다고 가정하면 안 된다.
- Supabase Storage — snapshot import 시 Media 파일을 `__SEED__/...` 경로에 업로드하고 visitor clone 시 session 폴더로 복제한다.

## 핵심 개념

### `sessionId` 3계층

#### 정의

시연 DB의 같은 테이블에는 운영 row, seed row, visitor row가 함께 존재한다.

#### 동작 원리

- `__PROD__`: 운영 또는 개발 원본으로 간주되는 row. 일반 운영 환경에서는 이 값만 사용한다.
- `__SEED__`: 새 시연 세션을 만들 때 복제할 템플릿 row.
- visitor sessionId: `cloneSeedToSession()`이 `__SEED__` row를 새 cuid/uuid sessionId로 복제한 결과.

따라서 Supabase Table Editor에서 같은 `sessionId`가 여러 테이블에 반복되는 것은 정상이다. 한 방문자 세션은 `Role`, `User`, `Media`, `Board`, `Post`, `Subpage` 등 여러 테이블에 같은 sessionId를 가진 row 묶음으로 존재한다.

#### 이 프로젝트에서의 적용

`packages/db/src/demo/cloneSeedToSession.ts`가 `__SEED__`를 visitor session으로 복제한다. 관리자 API가 `data: []`를 반환할 때는 먼저 해당 visitor session과 `__SEED__`에 실제 row가 있는지 확인해야 한다.

### API 200 + 빈 배열

#### 정의

HTTP 200은 쿼리가 성공했다는 뜻이지, seed가 정상이라는 뜻은 아니다.

#### 동작 원리

Prisma extension이 현재 visitor sessionId를 올바르게 주입하면, 그 session에 row가 없을 때 정상적으로 빈 배열을 반환한다. 반대로 session context가 누락되면 `__PROD__`나 다른 sentinel을 읽어 "공개 웹에는 보이는데 관리자에는 안 보이는" 식의 불일치가 생긴다.

판단 순서:

1. API가 500/403/401인지 확인한다.
2. 200이면 응답 body가 `data: []`인지 확인한다.
3. DB에서 `__SEED__`와 현재 visitor session의 모델별 count를 확인한다.
4. `__SEED__`도 비어 있으면 snapshot/import 문제다.
5. `__SEED__`는 있는데 visitor가 비어 있으면 기존 세션이 seed 갱신 전에 만들어졌거나 clone 문제다.
6. 공개 웹만 데이터가 보이면 public web 쿼리가 session context 밖에서 `__PROD__`를 보고 있는지 확인한다.

#### 이 프로젝트에서의 적용

관리자 메인 팝업 API가 `{"success": true, "data": []}`를 반환했을 때 실제 원인은 API 오류가 아니라 `HomePopup`이 `__SEED__`에 없었던 상태였다. 이후 공개 웹 홈이 팝업을 보여준 것은 홈 페이지 데이터 조회가 session context 밖에서 `__PROD__`를 읽을 수 있었기 때문이다.

### Route Handler session scope

#### 정의

인증 함수에서 `demo.enterWith()`를 호출해도, 서버리스 Route Handler의 모든 await 체인에서 항상 안정적으로 유지된다고 가정하지 않는다.

#### 동작 원리

`requirePermission()`은 인증/권한 확인 후 user 정보를 돌려준다. 하지만 그 뒤의 Prisma 조회가 다른 비동기 경계에서 실행되면 `enterWith()`로 붙인 context가 기대와 다르게 동작할 수 있다. 그래서 직접 Prisma를 조회하는 admin API는 조회 본문을 `runWithUserDemoSession(user, async () => ...)`로 감싸는 것이 안전하다.

#### 이 프로젝트에서의 적용

`apps/admin/src/shared/api/runWithUserDemoSession.ts`가 `DEMO_MODE=true`에서 `demo.runWith({ sessionId: user.sessionId }, fn)`으로 handler body를 명시적으로 감싼다. `defineRoute`를 쓰는 API는 이미 이 패턴을 갖고 있고, 직접 작성된 GET/list route는 누락되기 쉬웠다.

### Public web RSC session attach

#### 정의

Next.js App Router에서 layout이 session을 붙인다고 해서 모든 page data function이 그 context를 상속한다고 단정하면 안 된다.

#### 동작 원리

`generateMetadata`, Route Handler, sitemap, proxy, page-level Server Component는 layout의 async 흐름과 분리될 수 있다. React `cache()`가 있는 DB helper가 session context 부착 전에 먼저 호출되면, 그 결과가 같은 request 안에서 재사용될 수 있다. 따라서 공개 웹의 주요 진입점은 DB 조회 직전에 cookie 기반 session attach를 수행해야 한다.

#### 이 프로젝트에서의 적용

`apps/web/src/pages/home/ui/HomePage.tsx`는 팝업/홈 섹션 조회 전 `enterDemoSessionFromCookies()`를 호출하도록 수정했다. 이로써 공개 웹 홈이 `__PROD__` 팝업을 잘못 보여주는 경로를 차단했다.

### Snapshot source 검증

#### 정의

`demo:import`는 전체 DB 초기화가 아니라 `__SEED__`만 reset/import한다. 하지만 잘못된 snapshot을 import하면 이후 새 visitor 세션이 모두 잘못된 seed에서 복제된다.

#### 동작 원리

`pnpm demo:export`는 기본적으로 `sourceSessionId='__PROD__'`를 export한다. 현재 연결된 DB의 `__PROD__`가 풍부한 개발 데이터인지, 아니면 이미 시연 Supabase의 일부 테스트 데이터인지 확인하지 않으면 빈약한 snapshot으로 `__SEED__`를 덮을 수 있다.

import 전 체크:

- snapshot 모델별 count를 출력한다.
- `Role`, `User`, `Media`, `Board`, `Subpage`, `Post`, `NavigationMenuItem` count가 기대값인지 본다.
- `HomePopup`처럼 snapshot에 빠진 모델은 별도 병합이 필요한지 판단한다.
- import 후 `__SEED__` count를 다시 확인한다.
- 기존 visitor session은 자동 갱신되지 않으므로 새 세션으로 확인한다.

#### 이 프로젝트에서의 적용

잘못된 Supabase `__PROD__` snapshot은 `Role 0`, `User 0`, `Media 1`, `HomeSection 10`, `HomePopup 1` 수준이었다. 이를 import하면 `ensureDemoAdminSeed()`가 관리자 계정만 보정하지만, 실제 콘텐츠 seed는 대부분 사라진다. 복구는 기존 로컬 snapshot에 `__PROD__`의 `HomePopup` 1건을 병합한 뒤 다시 import하는 방식으로 수행했다.

## 레거시 ↔ 모던 대조표

| 관점 | 레거시 환경에서는 | 이 프로젝트에서는 |
| ---- | ----------------- | ----------------- |
| 시연 데이터 분리 | 별도 DB를 복사하거나 운영 DB 일부를 직접 수정 | 같은 Supabase DB 안에서 `sessionId` sentinel로 운영/seed/visitor row를 분리 |
| 빈 목록 판단 | SQL 결과가 0건이면 데이터 없음으로 단순 판단 | API 성공, session context, `__SEED__` count, visitor count를 함께 확인 |
| 데이터 복구 | DB dump 전체 restore 중심 | snapshot JSON을 `__SEED__`에 import하고 새 visitor 세션으로 재복제 |
| 서버 상태 전파 | 전역 변수나 request 객체에 직접 저장 | AsyncLocalStorage + Prisma extension으로 쿼리 스코프 자동 주입 |
| 공개/관리자 불일치 | 서로 다른 DB/URL 설정 의심 | RSC render order와 session attach 위치까지 확인 |

## 구현 시 주의할 점

- Supabase Table Editor에서 같은 `sessionId`가 여러 row에 반복되는 것은 정상이다. 문제는 `__SEED__` count가 기대값과 다른지다.
- `demo:import`는 전체 DB를 초기화하지 않는다. `resetSeedData()`는 `__SEED__` row와 `__SEED__/` Storage만 정리한다.
- 잘못된 source snapshot을 import하면 기존 visitor session은 남아 있고, 새 visitor session만 잘못된 seed에서 생성된다.
- seed 갱신 후에는 기존 브라우저 세션이 자동으로 바뀌지 않는다. 반드시 [새 세션 시작] 또는 cookie 삭제 후 재진입으로 확인한다.
- public web이 데이터를 보여주는데 admin이 비면 public web이 `__PROD__`를 보고 있는지 의심한다.
- `Role/User`가 snapshot에 없어도 import 후 `ensureDemoAdminSeed()`가 `demo_admin`은 보정한다. 하지만 콘텐츠 모델은 자동 보정되지 않는다.
- `@simple-cms/db` CLI가 Supabase Storage를 직접 import하면 `packages/db/package.json`에 `@supabase/supabase-js`가 있어야 한다.

## 이 주제를 마치면 설명할 수 있어야 하는 것

- [ ] `__PROD__`, `__SEED__`, visitor sessionId가 각각 어떤 데이터를 의미하는가?
- [ ] API가 200인데 `data: []`일 때 코드 오류와 seed 누락을 어떻게 구분하는가?
- [ ] Next.js 공개 웹에서 layout session attach만 믿으면 왜 `__PROD__` 데이터가 섞일 수 있는가?
- [ ] snapshot import 전에 모델별 row count를 확인해야 하는 이유는 무엇인가?
- [ ] seed를 복구한 뒤 기존 브라우저 세션이 아니라 새 세션으로 확인해야 하는 이유는 무엇인가?
