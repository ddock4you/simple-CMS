# 사전학습: 게시판 CRUD — 패턴 복제와 삭제 안전성

> **2-develop/8** | 이전: [3a. 서브 페이지 + Tiptap + 권한 UI](3a-서브페이지-Tiptap-권한UI-사전학습.md) | 다음: (Stage 3b 학습정리)
>
> 3a에서 "서브 페이지 CRUD의 전체 슬라이스 구조, Tiptap 에디터, 클라이언트 권한 체크"를 다뤘다. 3b는 에디터 없는 더 단순한 엔티티(게시판)를 대상으로, **확립된 CRUD 슬라이스를 새 도메인에 체계적으로 복제하는 방법론, Prisma 참조 액션의 내부 동작과 애플리케이션 레벨 삭제 안전성, displayOrder 서버 관리 패턴, FSD 슬라이스 간 코드 공유 제약**을 다룬다.

## 이 주제에서 다루는 기술

- **CRUD 기능 슬라이스 복제** — 확립된 FSD feature 슬라이스를 새 도메인에 적용할 때의 체계적 분석/조정 방법론
- **Prisma 참조 액션 (Referential Actions)** — `onDelete: Cascade`/`SetNull`이 DB 레벨에서 어떻게 동작하고, 왜 애플리케이션 레벨에서 추가 검증이 필요한지
- **`_count` 관계 카운팅** — Prisma의 관계 레코드 수를 효율적으로 조회하는 메커니즘
- **displayOrder 서버 관리** — 정수 기반 순서 필드의 자동 증가, 삭제 후 재정규화, 갭 없는 정렬 유지
- **FSD 동일 레이어 격리 규칙** — 슬라이스 간 직접 import 금지와 의도적 중복의 트레이드오프

---

## 핵심 개념

### 1. CRUD 기능 슬라이스 체계적 복제

#### 정의

확립된 CRUD 패턴(subpage-management)을 새 도메인(board-management)에 적용할 때, 단순 복사가 아닌 "원본 분석 → 차이 식별 → 선택적 적용"으로 진행하는 엔지니어링 방법론.

#### 동작 원리

**1단계 — 원본 슬라이스의 구조 해체:**

기존 subpage-management 슬라이스를 역할별로 분해한다:

```
features/subpage-management/
├── model/     ← 데이터 형태 정의 (스키마, 필터, DTO)
├── api/       ← 서버 통신 계층 (fetcher, query, mutation)
└── ui/        ← 사용자 인터페이스 (테이블, 폼, 뱃지, 다이얼로그)
```

각 파일의 역할을 "도메인 무관 구조"와 "도메인 특화 로직"으로 분류한다:

| 파일 | 도메인 무관 (복사 가능) | 도메인 특화 (재설계 필요) |
|------|------------------------|--------------------------|
| `subpageSchemas.ts` | Zod 스키마 구조 (`z.object`, `z.coerce`) | 필드 목록, 검증 규칙 |
| `subpageFilters.ts` | 필터 인터페이스 패턴, 기본값 상수 | 필터 타입 (`status` vs `visibility`) |
| `subpageFetchers.ts` | `fetchClient` 호출 패턴 | 엔드포인트 URL, 파라미터 매핑 |
| `SubpageForm.tsx` | react-hook-form + zodResolver 구조 | 폼 필드 구성, 사이드바 카드 |
| `SubpageTable.tsx` | TanStack Query + Table 렌더링 구조 | 컬럼 정의, 뱃지 종류 |
| `SubpageView.tsx` | 상세 뷰 레이아웃 + 권한 체크 | 표시 필드, 콘텐츠 렌더링 |

**2단계 — 새 도메인과의 차이 분석:**

Board vs Subpage의 구조적 차이를 식별한다:

```
Subpage: title, slug, seoTitle, seoDescription, contentJson, content, status, publishedAt
Board:   name,  slug, description,              skinType,    isPublic
                                                ^^^^^^^^     ^^^^^^^^
                                                새 필드 타입  새 필드 타입

차이 요약:
  - 콘텐츠 없음 → Tiptap 에디터 제거, content 추출 제거
  - 상태 없음   → StatusBadge → VisibilityBadge, 필터 변경
  - 새 enum     → BoardSkinType(LIST/GALLERY) 뱃지 추가
  - 새 boolean  → isPublic 필터/뱃지/폼 필드 추가
  - 관계 차이   → 삭제 시 posts + navigationMenuItems 양쪽 체크
```

**3단계 — 파일별 조정 결정:**

| 조정 유형 | 설명 | 예시 |
|-----------|------|------|
| 구조 그대로 + 값만 변경 | 파일 역할 동일, 도메인 값만 치환 | `boardFetchers.ts`, `boardQueries.ts` |
| 구조 유지 + 필드 추가/제거 | 기본 골격 유지하되 필드 목록 변경 | `boardSchemas.ts`, `BoardTable.tsx` |
| 구조 변경 | 레이아웃이나 로직 흐름이 달라짐 | `BoardForm.tsx` (사이드바 카드 구성 변경) |
| 제거 | 원본에 있지만 새 도메인에 불필요 | `TiptapEditor.tsx`, `SubpageStatusBadge.tsx` |
| 신규 추가 | 원본에 없지만 새 도메인에 필요 | `BoardSkinTypeBadge.tsx`, `BoardVisibilityBadge.tsx` |

#### 이 프로젝트에서의 적용

- subpage-management의 22개 파일 구조를 분석하여 board-management에 24개 파일 생성
- API Route 2개, Feature 12개, Pages 4개, App Router 4개, Shared 수정 1개 + 기존 교체 1개
- 제거: TiptapEditor, StatusBadge, SEO 카드, contentJson 처리
- 추가: SkinTypeBadge, VisibilityBadge, VisibilityFilter
- 구조 변경: Form 레이아웃 (2+1 그리드에서 콘텐츠 카드 제거, 설정 카드 내용 변경)

### 2. Prisma 참조 액션 (Referential Actions)

#### 정의

`@relation` 속성의 `onDelete`/`onUpdate` 옵션으로, 참조되는 레코드가 삭제/수정될 때 참조하는 레코드에 어떤 일이 일어나는지를 데이터베이스 레벨에서 정의하는 메커니즘.

#### 동작 원리

**Prisma가 지원하는 참조 액션:**

| 액션 | 삭제 시 동작 | 필수 조건 |
|------|-------------|-----------|
| `Cascade` | 참조하는 레코드도 함께 삭제 | 없음 |
| `SetNull` | FK 필드를 NULL로 설정 | FK가 optional (`?`)이어야 함 |
| `Restrict` | 참조하는 레코드가 있으면 삭제 차단 | 없음 |
| `NoAction` | DB에 위임 (보통 에러 발생) | 없음 |
| `SetDefault` | FK 필드를 기본값으로 설정 | `@default` 있어야 함 |

**DB 레벨에서 일어나는 일:**

Prisma 스키마의 참조 액션은 SQL의 `FOREIGN KEY ... ON DELETE` 절로 변환된다:

```
Prisma:  @relation(fields: [boardId], references: [id], onDelete: Cascade)
   ↓ prisma migrate
SQL:     FOREIGN KEY (boardId) REFERENCES Board(id) ON DELETE CASCADE

실행 흐름:
  DELETE FROM Board WHERE id = 'xxx'
    ↓ (DB 엔진이 FK 제약 검사)
    ↓ ON DELETE CASCADE 발견
    ↓ DELETE FROM Post WHERE boardId = 'xxx'  ← DB가 자동 실행
    ↓ Board 삭제 완료
```

중요한 점은 이 모든 과정이 **단일 트랜잭션** 안에서 일어난다는 것이다. 애플리케이션 코드가 개입할 틈이 없다.

**이 프로젝트의 Board 관계:**

```prisma
// Post → Board: Cascade (게시글은 게시판과 생사를 함께)
model Post {
  board   Board  @relation(fields: [boardId], references: [id], onDelete: Cascade)
  boardId String
}

// NavigationMenuItem → Board: SetNull (메뉴는 게시판 없어도 존재 가능)
model NavigationMenuItem {
  board   Board?  @relation(fields: [boardId], references: [id], onDelete: SetNull)
  boardId String?
}
```

#### 이 프로젝트에서의 적용

**핵심 설계 결정: DB에 Cascade가 있는데도 애플리케이션에서 삭제를 차단하는 이유.**

```
DB 설정:     onDelete: Cascade (게시글은 게시판과 함께 삭제)
앱 정책:     게시글이 있으면 삭제 차단 (400 에러)

왜 불일치가 의도적인가?

  1. 운영 안전성: Cascade는 "기술적으로 가능"하지만, 50개의 게시글이 들어있는
     게시판을 실수로 삭제하면 복구가 불가능 → 운영자에게 먼저 정리를 요구

  2. 감사 추적: Cascade 삭제된 게시글은 AuditLog에 개별 기록이 남지 않음
     → 감사 로그의 완전성 훼손

  3. Cascade는 안전망: 앱 레벨 차단이 1차 방어선,
     Cascade는 데이터 무결성 최후의 방어선 (FK가 가리키는 게 없는 고아 레코드 방지)
```

### 3. `_count` 관계 카운팅

#### 정의

Prisma의 `_count` 파라미터로 관계 레코드의 수를 별도 쿼리 없이 효율적으로 가져오는 메커니즘.

#### 동작 원리

**N+1 문제를 피하는 카운팅:**

```typescript
// 비효율적 — 목록을 가져온 후 각각에 대해 count 쿼리
const boards = await prisma.board.findMany();
for (const board of boards) {
  const postCount = await prisma.post.count({ where: { boardId: board.id } });
  // N+1 문제: 게시판 10개면 쿼리 11번
}

// 효율적 — _count로 한 번에 JOIN 집계
const boards = await prisma.board.findMany({
  select: {
    id: true,
    name: true,
    _count: { select: { posts: true } },
  },
});
// 결과: [{ id: "...", name: "공지사항", _count: { posts: 5 } }]
```

**생성되는 SQL:**

```sql
SELECT b.id, b.name, (
  SELECT COUNT(*) FROM "Post" p WHERE p."boardId" = b.id
) AS _count_posts
FROM "Board" b
```

Prisma는 `_count`를 **상관 서브쿼리(correlated subquery)**로 변환한다. 이는 `JOIN + GROUP BY`보다 단순하고, 대부분의 경우 PostgreSQL 옵티마이저가 효율적으로 처리한다.

**`include` vs `select`에서의 `_count`:**

```typescript
// include: 모든 필드 + _count 추가
prisma.board.findUnique({
  where: { id },
  include: { _count: { select: { posts: true } } },
});
// 결과: { id, name, slug, ...(모든 필드), _count: { posts: 5 } }

// select: 지정 필드만 + _count
prisma.board.findMany({
  select: {
    id: true,
    name: true,
    _count: { select: { posts: true } },
  },
});
// 결과: { id, name, _count: { posts: 5 } }  ← 다른 필드 없음
```

#### 이 프로젝트에서의 적용

- **목록 API**: `select`에 `_count: { select: { posts: true } }`를 포함하여 게시판별 게시글 수를 한 번의 쿼리로 조회
- **삭제 API**: `include`에 `_count: { select: { posts: true, navigationMenuItems: true } }`로 참조 카운트를 가져와 0인지 검사
- **상세 API**: `include`에 `_count: { select: { posts: true } }`로 뷰 페이지에 게시글 수 표시
- API 응답에서 `_count.posts`를 `postCount`로 매핑하여 API 계약을 깔끔하게 유지

### 4. displayOrder 서버 관리 패턴

#### 정의

목록의 표시 순서를 정수 필드(`displayOrder`)로 관리하되, 생성/삭제 시 서버에서 자동으로 값을 관리하여 클라이언트가 순서를 신경 쓸 필요가 없게 하는 패턴.

#### 동작 원리

**생성 시 — 자동 증가:**

```typescript
// 현재 최대값 조회
const maxOrder = await prisma.board.aggregate({
  _max: { displayOrder: true },
});
// 결과: { _max: { displayOrder: 2 } } 또는 { _max: { displayOrder: null } }

// null 처리: 레코드가 없으면 null → -1로 치환 → +1 = 0
const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
```

**삭제 시 — 재정규화:**

```
삭제 전:  A(0)  B(1)  C(2)  D(3)
          B 삭제
삭제 직후: A(0)       C(2)  D(3)   ← 갭 발생 (1이 빠짐)
재정규화:  A(0)       C(1)  D(2)   ← 연속 번호로 복구
```

```typescript
// 삭제 후 남은 레코드를 순서대로 조회
const remaining = await prisma.board.findMany({
  select: { id: true },
  orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }],
});

// 0부터 순차적으로 재부여
for (let i = 0; i < remaining.length; i++) {
  await prisma.board.update({
    where: { id: remaining[i].id },
    data: { displayOrder: i },
  });
}
```

**갭 없는 정렬을 유지하는 이유:**

1. UI에서 "몇 번째"라는 정보가 직관적
2. 향후 드래그&드롭 순서 변경 시 swap이 단순해짐
3. `ORDER BY displayOrder ASC`만으로 일관된 정렬 보장

**이 패턴의 한계와 대안:**

| 패턴 | 장점 | 단점 | 적합한 규모 |
|------|------|------|------------|
| 정수 재정규화 (현재) | 단순, 갭 없음 | 삭제 시 N번 UPDATE | ~100건 |
| 정수 간격 (1000, 2000...) | 삽입 시 UPDATE 불필요 | 갭 관리 복잡 | ~1000건 |
| 부동소수점 | 삽입 시 중간값 사용 | 정밀도 한계 | ~1000건 |
| 연결 리스트 (prev/next) | O(1) 삽입/삭제 | 전체 정렬 시 N번 조회 | 제한 없음 |

게시판은 보통 10~20개이므로 정수 재정규화가 가장 적합하다.

#### 이 프로젝트에서의 적용

- Board와 Subpage 모두 동일한 패턴 사용 (`displayOrder` 필드)
- 생성: `aggregate({ _max })` → 최대값 + 1
- 삭제: 삭제 후 전체 재정규화 (순서 보장)
- 목록 정렬: `orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }]` (같은 순서면 최근 수정이 먼저)
- 폼에서 displayOrder를 노출하지 않음 (서버 자동 관리)
- 향후 Stage 3d(메뉴 관리)에서 dnd-kit을 도입하면 클라이언트 기반 순서 변경을 추가할 수 있음

### 5. FSD 동일 레이어 격리 규칙과 의도적 중복

#### 정의

Feature-Sliced Design에서 같은 레이어의 슬라이스 간 직접 import를 금지하는 규칙. 코드 공유가 필요하면 하위 레이어(entities 또는 shared)로 추출해야 한다.

#### 동작 원리

**FSD 의존성 규칙:**

```
pages → features, entities, shared  ✅
features → entities, shared         ✅
entities → shared                   ✅

features/A → features/B             ❌ (같은 레이어 간 직접 import 금지)
```

**왜 이 규칙이 존재하는가:**

```
규칙 없을 때:
  features/board ──import──→ features/subpage/ui/SlugField
  features/post  ──import──→ features/subpage/ui/SlugField
  features/post  ──import──→ features/board/ui/BoardSelect

  → subpage를 수정하면 board와 post가 깨질 수 있음
  → 슬라이스 간 의존성 그래프가 복잡해짐
  → 독립적 개발/테스트가 불가능해짐

규칙 있을 때:
  features/board  ──import──→ shared/ui/SlugField (공통 추출)
  features/post   ──import──→ shared/ui/SlugField
  features/board  ──각자 관리──→ features/board/ui/SlugField (의도적 중복)

  → 각 슬라이스가 독립적으로 수정 가능
  → 의존성 방향이 항상 하위 레이어로만 향함
```

**의도적 중복 vs 공통 추출 판단 기준:**

| 기준 | 의도적 중복 | 공통 추출 (shared/entities) |
|------|-----------|---------------------------|
| 사용처 | 2개 이하 | 3개 이상 |
| 도메인 의미 | 다름 (isPublished vs isPublic) | 같음 |
| 변경 빈도 | 독립적으로 변할 가능성 높음 | 항상 함께 변함 |
| 크기 | 작은 컴포넌트 (50줄 이하) | 큰 유틸/컴포넌트 |

#### 이 프로젝트에서의 적용

- `SlugField`: subpage-management와 board-management에서 각각 별도 파일로 유지
  - 이유: prop 이름이 다름 (`isPublished` vs `isPublic`), 경고 메시지가 다름, 도메인 의미가 다름
  - 만약 Stage 3c(게시글)에서도 SlugField가 필요하면 그때 shared/ui로 추출 검토
- `BoardSkinTypeBadge`, `BoardVisibilityBadge`: board-management 전용 → 추출 불필요
- `SubpageStatusBadge`: subpage-management 전용 → 추출 불필요
- `fetchClient`, `queryKeys`, `auditHelpers`: 이미 shared 레이어에 위치 → 모든 feature에서 재사용

---

## 레거시 ↔ 모던 대조표

| 관점 | 레거시 환경에서는 | 이 프로젝트에서는 |
|------|------------------|------------------|
| 기능 추가 | 기존 코드에 if/else 분기를 추가하며 확장 | 확립된 슬라이스를 복제하여 독립적인 새 기능 생성 (기존 코드 수정 없음) |
| 삭제 안전성 | DB의 `ON DELETE CASCADE`에 의존하거나, PHP에서 `DELETE + DELETE` 직접 실행 | DB Cascade는 안전망, 앱에서 `_count`로 참조 확인 후 차단 → 운영자에게 선행 정리 요구 |
| 관련 레코드 수 조회 | `SELECT COUNT(*) FROM posts WHERE board_id = ?` 별도 쿼리 | Prisma `_count` 파라미터로 메인 쿼리에 포함 (서브쿼리 자동 생성) |
| 목록 정렬 순서 | `ORDER BY sort_order ASC` + 관리자가 직접 숫자 입력 | `displayOrder` 서버 자동 관리, UI에서 숫자 노출 안 함, 삭제 시 자동 재정규화 |
| 코드 재사용 | 공통 함수를 `common.js`에 모아두고 전역으로 사용 | FSD 레이어 규칙으로 의존 방향 통제, 공유가 필요하면 하위 레이어로만 추출 |
| 새 CRUD 기능 개발 | 처음부터 직접 작성하거나 기존 코드 복붙 후 수정 | 검증된 슬라이스 구조를 "차이 분석 → 선택적 적용"으로 체계적 복제 |
| 폼 필드 타입 | `<select>` 태그 직접 작성 + jQuery change 이벤트 | react-hook-form `Controller` + shadcn/ui `Select` + Zod enum 검증 |
| API 삭제 응답 | 성공/실패만 반환, 에러 원인은 서버 로그 확인 | 참조 관계별 구체적 에러 메시지 ("게시글이 있습니다", "메뉴 항목이 있습니다") |

---

## 구현 시 주의할 점

### 1. 참조 무결성 검사 순서

삭제 API에서 여러 참조를 검사할 때, **사용자에게 가장 유용한 에러를 먼저 반환**해야 한다:

```typescript
// ✅ posts를 먼저 검사 — 운영자가 먼저 정리해야 할 것
if (board._count.posts > 0) {
  return error('게시글이 있습니다. 먼저 게시글을 삭제해주세요.');
}
if (board._count.navigationMenuItems > 0) {
  return error('메뉴 항목이 있습니다. 먼저 메뉴 연결을 해제해주세요.');
}

// ❌ 순서가 뒤바뀌면 — posts 정리 후 다시 시도해야 메뉴 에러를 발견
```

### 2. displayOrder 재정규화의 동시성

현재 구현은 삭제 후 루프로 UPDATE하므로, 동시에 두 명이 다른 게시판을 삭제하면 race condition이 발생할 수 있다. 게시판 수가 적어 실질적 문제가 되지 않지만, 대규모 시스템에서는 트랜잭션 격리가 필요하다.

### 3. 도메인 치환 시 놓치기 쉬운 것들

슬라이스 복제 시 가장 흔한 실수:

- **에러 메시지 미치환**: "서브 페이지를 찾을 수 없습니다" → "게시판을 찾을 수 없습니다"
- **라우트 경로 미치환**: `/subpages?${params}` → `/boards?${params}` (페이지네이션, 필터)
- **queryKey 충돌**: 새 도메인용 key factory를 추가하지 않고 기존 키를 재사용하면 캐시 오염
- **entityType 미변경**: 감사 로그의 `entityType: 'SUBPAGE'` → `'BOARD'`
- **권한 resource 미변경**: `requirePermission('subpages', ...)` → `requirePermission('boards', ...)`

### 4. boolean 필드의 API 전송

`isPublic` 같은 boolean은 form에서 문자열로 다뤄질 수 있다:

```typescript
// Select의 value는 항상 문자열
<Select
  value={field.value ? 'true' : 'false'}
  onValueChange={(v) => field.onChange(v === 'true')}
>
```

Zod의 `z.boolean()`이 서버에서 타입을 보장하므로 JSON 직렬화 시 자동으로 boolean으로 전송된다.

### 5. `_count` 결과의 API 응답 매핑

Prisma가 반환하는 `_count` 필드를 API 응답에서 그대로 노출하지 않는다:

```typescript
// ❌ 내부 구조 노출
{ ...board, _count: { posts: 5 } }

// ✅ 깔끔한 API 계약
{ ...board, postCount: board._count.posts }
```

API 소비자(프론트엔드)가 Prisma의 내부 구조에 의존하지 않도록 DTO 변환을 거친다.

---

## 이 주제를 마치면 설명할 수 있어야 하는 것

- [ ] Prisma의 `onDelete: Cascade`가 DB에서 어떤 SQL로 변환되고, 왜 애플리케이션에서 추가로 삭제를 차단하는지?
- [ ] FSD에서 같은 레이어 슬라이스 간 import가 금지되는 이유와, 의도적 중복과 공통 추출의 판단 기준은?
- [ ] 확립된 CRUD 슬라이스를 새 도메인에 복제할 때 "구조 분석 → 차이 식별 → 선택적 적용"의 구체적 단계는?
- [ ] displayOrder 재정규화가 필요한 이유와, 이 패턴이 적합한 규모의 한계는?
- [ ] `_count`를 사용한 관계 카운팅이 N+1 문제를 어떻게 해결하고, `include` vs `select`에서의 동작 차이는?
