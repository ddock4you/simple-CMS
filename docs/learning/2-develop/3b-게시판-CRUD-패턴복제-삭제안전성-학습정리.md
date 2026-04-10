# 학습정리: 게시판 CRUD — 패턴 복제와 삭제 안전성

> **2-develop/8** | 사전학습: [3b-게시판-CRUD-패턴복제-삭제안전성-사전학습](3b-게시판-CRUD-패턴복제-삭제안전성-사전학습.md) | 이전: [3a. 서브 페이지 + Tiptap + 권한 UI](3a-서브페이지-Tiptap-권한UI-학습정리.md)

## 구현 요약

Stage 3a에서 확립한 서브 페이지 CRUD 슬라이스 패턴을 게시판(Board) 도메인에 체계적으로 복제했다. Board는 Subpage보다 단순한 엔티티(콘텐츠/상태/SEO 없음)이므로 Tiptap 에디터를 제거하고, 대신 `skinType`(목록형/갤러리형)과 `isPublic`(공개/비공개) 필드를 도입했다. API Route 2개, Feature 슬라이스 12개, Pages 레이어 4개, App Router 4개, 기존 수정 2개로 총 24개 파일을 생성/수정했다. 삭제 시 게시글·메뉴 참조를 `_count`로 검사하여 차단하는 애플리케이션 레벨 참조 무결성을 구현했다.

---

## 핵심 학습 포인트

### 1. CRUD 슬라이스 복제 — 원본 분석에서 선택적 적용까지

#### 개념

확립된 FSD feature 슬라이스(subpage-management)를 새 도메인(board-management)에 적용할 때, 파일을 단순 복사하는 것이 아니라 "구조 해체 → 차이 식별 → 조정 결정"의 3단계로 진행하는 방법론.

#### 동작 원리 심화

사전학습에서 3단계 방법론을 배웠지만, 실제 구현에서 발견한 것은 **"제거 판단이 추가 판단보다 중요하다"**는 점이다.

Board에서 제거해야 할 것들을 놓치면 불필요한 코드가 남고, 추가할 것을 과도하게 넣으면 복잡성이 증가한다. 실제로 Subpage 슬라이스에서 Board로 전환할 때의 변경 비율:

```
구조 그대로 + 값만 변경: 8개 파일 (fetchers, queries, mutations, pagination 등)
구조 유지 + 필드 추가/제거: 6개 파일 (schemas, filters, table, view, pages)
구조 변경: 1개 파일 (BoardForm — 사이드바 카드 구성 변경)
제거: 3개 항목 (TiptapEditor, StatusBadge, SEO 카드)
신규 추가: 3개 파일 (SkinTypeBadge, VisibilityBadge, VisibilityFilter)
```

약 66%의 파일이 구조를 거의 그대로 유지하며 도메인 값만 치환한다. 이것이 패턴 복제의 핵심 가치 — 검증된 구조를 반복 사용함으로써 일관성과 개발 속도를 동시에 확보한다.

#### 프로젝트 코드에서의 적용

**값만 치환한 대표 파일** — `boardFetchers.ts`:

```typescript
// apps/admin/src/features/board-management/api/boardFetchers.ts
export function getBoardList(filters: BoardListFilters): Promise<PaginatedResponse<BoardListItem>> {
  const params = new URLSearchParams();
  if (filters.visibility !== 'ALL') params.set('visibility', filters.visibility);
  // subpage: filters.status !== 'ALL' → params.set('status', ...)
  // board:   filters.visibility !== 'ALL' → params.set('visibility', ...)
  // 구조는 동일, 필터 이름과 엔드포인트만 변경
  return fetchClient<PaginatedResponse<BoardListItem>>(`/api/boards?${params.toString()}`);
}
```

**구조가 변경된 파일** — `BoardForm.tsx`의 사이드바 카드:

Subpage는 "발행(상태)" + "SEO" 두 개의 사이드바 카드가 있었지만, Board는 "설정(skinType + isPublic)" 하나로 대체했다:

```typescript
// apps/admin/src/features/board-management/ui/BoardForm.tsx:170-195
// Subpage: 발행 카드(status) + SEO 카드(seoTitle, seoDescription)
// Board:   설정 카드(skinType + isPublic) — 하나로 통합
<Card>
  <CardTitle>설정</CardTitle>
  <CardContent>
    <Controller name="skinType" ... />  {/* enum: LIST/GALLERY */}
    <Controller name="isPublic" ... />  {/* boolean → Select 변환 */}
  </CardContent>
</Card>
```

#### 설계 판단

슬라이스를 복제할 때 "공통 추상화를 먼저 만들까"와 "일단 복제하고 나중에 추출할까"의 선택이 있었다. 현재 사용처가 2개(subpage, board)뿐이므로 **의도적 중복을 선택**했다. 3개 이상(post, navigation 등)에서 같은 패턴이 반복되면 그때 공통 추출을 검토한다. 이는 FSD의 격리 규칙과도 일치하고, "premature abstraction" 안티패턴을 회피한다.

### 2. 애플리케이션 레벨 참조 무결성 — DB Cascade 위에 쌓는 방어층

#### 개념

Prisma 스키마에 `onDelete: Cascade`가 설정되어 있어도, API 핸들러에서 `_count`로 참조 레코드 수를 확인하고 0이 아니면 삭제를 차단하는 이중 방어 패턴.

#### 동작 원리 심화

실제 구현에서 드러난 핵심은 **두 종류의 관계를 하나의 DELETE 핸들러에서 순차 검사**해야 한다는 점이다:

```
Board의 관계:
  ├── Post (onDelete: Cascade)     → 삭제하면 게시글도 전부 사라짐 → 위험
  └── NavigationMenuItem (onDelete: SetNull) → 삭제하면 FK가 null → 안전하지만 의도 확인 필요

검사 전략:
  1. posts > 0 → 차단 (데이터 손실 위험)
  2. navigationMenuItems > 0 → 차단 (메뉴 연결 끊김 위험)
  3. 둘 다 0 → 삭제 허용
```

Subpage의 DELETE 핸들러는 `navigationMenuItems`만 검사했다(Subpage는 하위 관계가 없으므로). Board는 `posts`와 `navigationMenuItems` 두 관계를 모두 검사해야 한다는 차이가 있었다.

#### 프로젝트 코드에서의 적용

```typescript
// apps/admin/src/app/api/boards/[id]/route.ts:169-199
const board = await prisma.board.findUnique({
  where: { id },
  include: { _count: { select: { posts: true, navigationMenuItems: true } } },
  //                              ^^^^^^^       ^^^^^^^^^^^^^^^^^^^
  //                              Cascade 관계   SetNull 관계 — 양쪽 모두 검사
});

// posts를 먼저 검사 — 운영자에게 가장 중요한 정보
if (board._count.posts > 0) {
  return NextResponse.json({
    success: false,
    error: '이 게시판에 게시글이 있습니다. 먼저 게시글을 삭제해주세요.',
  }, { status: 400 });
}

if (board._count.navigationMenuItems > 0) {
  return NextResponse.json({
    success: false,
    error: '이 게시판을 참조하는 메뉴 항목이 있습니다. 먼저 메뉴 연결을 해제해주세요.',
  }, { status: 400 });
}
```

#### 설계 판단

"게시글이 있어도 Cascade로 함께 삭제하면 편하지 않나?"라는 의문이 있을 수 있다. 차단을 선택한 이유:

1. **감사 추적 완전성**: Cascade로 삭제된 게시글은 AuditLog에 개별 기록이 남지 않는다. 50개 게시글이 게시판과 함께 사라지면 "누가, 언제, 왜" 추적이 불가능하다.
2. **운영 실수 방지**: 이름이 비슷한 게시판을 실수로 삭제하는 경우에 대한 최후의 방어.
3. **단계적 정리 유도**: "먼저 게시글을 삭제해주세요"라는 메시지가 운영자에게 명시적인 행동 가이드를 제공한다.

DB의 Cascade는 "만약 앱 레벨 차단이 실패해도 고아 레코드가 생기지 않게"하는 안전망 역할을 한다.

### 3. `_count` 활용 — 목록·상세·삭제 세 가지 맥락

#### 개념

Prisma의 `_count` 파라미터를 `select`/`include`에 포함하여 관계 레코드 수를 메인 쿼리와 함께 가져오는 패턴. Board에서는 세 가지 맥락에서 각각 다른 방식으로 사용한다.

#### 동작 원리 심화

사전학습에서 `_count`가 상관 서브쿼리로 변환된다는 것을 배웠다. 실제 구현에서 발견한 것은 **`select` vs `include`에서의 사용 맥락이 목적에 따라 달라진다**는 점이다:

| 맥락 | 사용 방식 | 이유 |
|------|-----------|------|
| 목록 API | `select` 내부에 `_count` | 필요한 필드만 선택하여 전송량 최소화 |
| 상세 API | `include`에 `_count` | 모든 필드 + 관계 카운트 (뷰 페이지에 표시) |
| 삭제 API | `include`에 `_count` (복수 관계) | 삭제 가능 여부 판단용 |

#### 프로젝트 코드에서의 적용

**목록 API** — `select`로 필요한 필드만:

```typescript
// apps/admin/src/app/api/boards/route.ts:39-52
prisma.board.findMany({
  select: {
    id: true, name: true, slug: true, skinType: true,
    isPublic: true, displayOrder: true, updatedAt: true,
    _count: { select: { posts: true } },  // posts 카운트만
  },
})
// → API 응답에서 _count.posts를 postCount로 매핑
items.map((item) => ({ ...item, postCount: item._count.posts }))
```

**삭제 API** — `include`로 복수 관계 카운트:

```typescript
// apps/admin/src/app/api/boards/[id]/route.ts:169-171
prisma.board.findUnique({
  where: { id },
  include: { _count: { select: { posts: true, navigationMenuItems: true } } },
  // 두 관계 모두 카운트 — 삭제 차단 판단에 양쪽 필요
})
```

#### 설계 판단

API 응답에서 `_count` 내부 구조를 그대로 노출하지 않고 `postCount`로 매핑한다. 이유는 프론트엔드가 Prisma의 내부 구현에 의존하지 않도록 하기 위해서다. 만약 나중에 Prisma를 다른 ORM으로 교체하더라도, API 계약(`postCount: number`)은 변경되지 않는다.

### 4. boolean 필드의 Select 변환 — isPublic 처리

#### 개념

HTML `<select>` 요소는 값을 문자열로만 다루므로, boolean 필드(`isPublic`)를 Select 컴포넌트에서 사용할 때 `true/false` ↔ `'true'/'false'` 변환이 필요한 패턴.

#### 동작 원리 심화

react-hook-form의 `Controller`가 관리하는 `field.value`는 boolean이지만, shadcn/ui `Select`의 `value`는 반드시 string이어야 한다. 이 타입 불일치를 `Controller`의 `render` 함수 안에서 해결한다:

```
[Zod 스키마]  isPublic: z.boolean()      → boolean
[Form State]  field.value = true          → boolean
[Select UI]   value={field.value ? 'true' : 'false'}  → string
[사용자 선택] onValueChange('false')      → string
[Form Update] field.onChange(v === 'true') → boolean으로 변환
[API 전송]    JSON.stringify({ isPublic: false })     → boolean으로 직렬화
[서버 검증]   z.boolean().parse(false)    → boolean 확인
```

핵심은 **변환이 UI 레이어에서만 발생**하고, Form 상태와 API 전송에서는 항상 boolean으로 유지된다는 점이다.

#### 프로젝트 코드에서의 적용

```typescript
// apps/admin/src/features/board-management/ui/BoardForm.tsx:184-198
<Controller
  name="isPublic"
  control={control}
  render={({ field }) => (
    <Select
      value={field.value ? 'true' : 'false'}        // boolean → string
      onValueChange={(v) => field.onChange(v === 'true')}  // string → boolean
    >
      <SelectTrigger>
        <span>{field.value ? '공개' : '비공개'}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="true">공개</SelectItem>
        <SelectItem value="false">비공개</SelectItem>
      </SelectContent>
    </Select>
  )}
/>
```

#### 설계 판단

Switch 컴포넌트를 사용할 수도 있었지만, 프로젝트에 아직 shadcn/ui Switch가 설치되어 있지 않았다. boolean 하나를 위해 새 공유 컴포넌트를 추가하는 것보다, 기존 Select 패턴으로 통일하는 것이 더 경제적이다. 다른 feature에서도 Switch가 필요해지면 그때 도입한다.

### 5. 필터 교체 — status(DRAFT/PUBLISHED)에서 visibility(공개/비공개)로

#### 개념

Board에는 ContentStatus(DRAFT/PUBLISHED)가 없으므로, 목록 필터를 `isPublic` boolean 기반의 `visibility`(ALL/PUBLIC/PRIVATE)로 교체한 패턴.

#### 동작 원리 심화

Subpage의 status 필터는 Prisma enum을 직접 사용했지만, Board의 visibility 필터는 **boolean 값을 3-way 선택으로 변환**하는 추가 매핑이 필요하다:

```
URL param          → Zod 파싱      → Prisma where 절
?visibility=ALL    → 'ALL'         → {}                    (필터 없음)
?visibility=PUBLIC → 'PUBLIC'      → { isPublic: true }
?visibility=PRIVATE→ 'PRIVATE'     → { isPublic: false }

vs Subpage:
?status=ALL        → 'ALL'         → {}
?status=DRAFT      → 'DRAFT'       → { status: 'DRAFT' }    (enum 직접 사용)
?status=PUBLISHED  → 'PUBLISHED'   → { status: 'PUBLISHED' }
```

#### 프로젝트 코드에서의 적용

**API Route의 where 절 변환:**

```typescript
// apps/admin/src/app/api/boards/route.ts:35-37
const where = visibility === 'ALL'
  ? {}
  : { isPublic: visibility === 'PUBLIC' };
// 'PUBLIC' → { isPublic: true }, 'PRIVATE' → { isPublic: false }
```

**필터 UI:**

```typescript
// apps/admin/src/features/board-management/ui/BoardVisibilityFilter.tsx
const FILTER_OPTIONS: { value: VisibilityFilterType; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'PUBLIC', label: '공개' },
  { value: 'PRIVATE', label: '비공개' },
];
// URL param 이름도 'status' → 'visibility'로 변경
```

#### 설계 판단

`skinType`(LIST/GALLERY) 필터를 추가할 수도 있었지만, 게시판 수가 보통 10~20개로 적어 필터가 오히려 UI 복잡성만 늘린다고 판단했다. 검색 기능도 같은 이유로 1차에서 생략했다. 필요 시 추가는 URL param에 `skinType` 키를 추가하고 where 절에 조건을 합성하면 된다.

---

## 레거시 경험과의 연결

- **기능 추가 방식의 차이**: 레거시에서는 게시판 기능을 추가할 때 기존 파일에 `if (type === 'board')` 분기를 넣거나, 기존 코드를 통째로 복사해서 수정했다. 이번에는 확립된 슬라이스 구조를 "차이 분석 → 선택적 적용"으로 체계적으로 복제했고, 기존 서브 페이지 코드는 한 줄도 수정하지 않았다. FSD의 슬라이스 격리가 이 독립성을 보장한다.

- **삭제 안전성 구현의 발전**: 레거시에서는 `DELETE FROM board WHERE id = ?`를 실행하고 DB의 CASCADE에 맡기거나, 아예 DELETE 기능을 제공하지 않는 경우가 많았다. 이번에는 `_count`로 참조 관계를 미리 확인하고, 구체적 에러 메시지("게시글이 있습니다")로 운영자에게 행동 가이드를 제공한다. DB Cascade는 최후의 안전망으로 남겨둔다.

- **정렬 순서 관리**: 레거시에서는 `sort_order` 칼럼을 관리자가 직접 숫자로 입력하거나, 삭제 후 "구멍"이 생겨도 무시하는 경우가 흔했다. 이번에는 서버가 자동으로 displayOrder를 증가시키고, 삭제 후 재정규화까지 수행한다. 운영자는 순서 번호를 전혀 신경 쓸 필요가 없다.

- **레거시 경험이 도움이 된 부분**: "게시판을 삭제하면 게시글은 어떻게 되나?"라는 운영 현실에 대한 감각은 레거시 유지보수 경험에서 온 것이다. 기술적으로 Cascade가 가능해도, 운영 관점에서 "실수로 50개 게시글이 사라지면 복구할 수 없다"는 판단은 실제 운영 경험이 없으면 내리기 어렵다.

---

## 면접 예상 질문 & 답변

### Q1. 기존 CRUD 패턴을 새 도메인에 복제할 때 어떤 과정을 거쳤나요?

#### 답변 예시

기존 서브 페이지 CRUD 슬라이스를 게시판 도메인에 적용할 때, 단순 복사가 아닌 3단계 분석을 진행했습니다. 먼저 원본 슬라이스의 각 파일을 "도메인 무관 구조"(fetch 패턴, queryOptions 구조, 테이블 렌더링 골격)와 "도메인 특화 로직"(필드 목록, 검증 규칙, 뱃지 종류)으로 분류했습니다. 다음으로 Board와 Subpage의 구조적 차이를 식별했는데, Board에는 콘텐츠(Tiptap)와 상태(DRAFT/PUBLISHED)가 없고 대신 skinType과 isPublic이 있습니다. 마지막으로 파일별 조정 결정을 내렸는데, 약 66%는 구조를 유지하고 값만 치환, 나머지는 제거/추가/변경했습니다. 이 과정에서 기존 서브 페이지 코드는 한 줄도 수정하지 않았는데, FSD의 슬라이스 격리 규칙이 이 독립성을 보장합니다. "공통 추상화를 먼저 만들까"와 "복제 후 나중에 추출할까"의 선택에서는 현재 사용처가 2개뿐이므로 의도적 중복을 선택했고, 3개 이상으로 늘어나면 shared 레이어로 추출을 검토할 계획입니다.

#### 꼬리 질문 대응

**"SlugField처럼 거의 같은 컴포넌트를 왜 공유하지 않았나요?"**
FSD에서 같은 레이어의 슬라이스 간 직접 import는 금지입니다. SlugField는 prop 의미도 다릅니다 — 서브 페이지는 `isPublished`(발행 상태)로 경고 여부를 판단하고, 게시판은 `isPublic`(공개 여부)으로 판단합니다. 도메인 의미가 다르면 향후 독립적으로 변경될 가능성이 높아 의도적 중복이 더 안전합니다.

**"66%가 구조 유지라면 코드 생성기를 만드는 게 낫지 않나요?"**
좋은 접근이지만, 나머지 34%의 조정(제거, 추가, 구조 변경)이 도메인마다 달라서 생성기의 투자 대비 효과가 떨어집니다. 현재 수준에서는 검증된 템플릿을 참고하며 분석적으로 복제하는 방식이 유연성과 효율 사이의 적절한 균형점입니다.

### Q2. DB에 Cascade가 설정되어 있는데도 애플리케이션에서 삭제를 차단한 이유는 무엇인가요?

#### 답변 예시

Prisma 스키마에서 Post → Board 관계에 `onDelete: Cascade`를 설정해두었지만, API 핸들러에서는 `_count.posts > 0`이면 삭제를 400 에러로 차단합니다. 이렇게 이중 방어를 적용한 이유는 세 가지입니다. 첫째, Cascade로 삭제된 게시글은 감사 로그(AuditLog)에 개별 기록이 남지 않아 감사 추적의 완전성이 훼손됩니다. 둘째, 운영자가 실수로 게시글이 많은 게시판을 삭제할 경우 복구가 불가능합니다. 셋째, "먼저 게시글을 삭제해주세요"라는 메시지가 운영자에게 명시적인 행동 가이드를 제공하여 의도하지 않은 데이터 손실을 방지합니다. DB의 Cascade는 앱 레벨 차단이 실패하는 예외 상황에서 고아 레코드가 생기지 않도록 하는 안전망 역할을 합니다. 참조 검사 순서도 의도적인데, posts를 먼저 검사합니다 — 게시글을 정리한 후에야 메뉴 연결 해제를 안내하는 것이 운영 흐름에 맞기 때문입니다.

#### 꼬리 질문 대응

**"Restrict 액션을 쓰면 DB에서도 차단할 수 있지 않나요?"**
맞습니다. `onDelete: Restrict`로 설정하면 DB 레벨에서도 차단됩니다. 하지만 DB 에러는 Prisma가 throw하는 PrismaClientKnownRequestError로 전달되어, 운영자에게 의미 있는 한글 메시지를 제공하기 어렵습니다. 앱에서 먼저 차단하고 구체적 메시지를 반환한 뒤, DB에는 Cascade로 안전망을 남기는 것이 UX와 안전성 양쪽을 만족합니다.

**"삭제 시 `_count`를 포함하면 성능에 문제가 없나요?"**
`_count`는 상관 서브쿼리로 변환됩니다. 삭제는 단일 레코드 대상이므로 서브쿼리가 2개(`posts`, `navigationMenuItems`)여도 성능 영향은 미미합니다. 목록 조회에서는 N개 레코드마다 서브쿼리가 실행되지만, 게시판 수가 보통 10~20개이므로 문제되지 않습니다.

### Q3. 같은 프로젝트에서 status 필터와 visibility 필터를 도메인별로 다르게 설계한 이유는?

#### 답변 예시

서브 페이지는 ContentStatus 열거형(DRAFT/PUBLISHED)을 가지고 있어서 status 필터가 자연스럽지만, 게시판에는 발행 상태 개념이 없습니다. 대신 게시판의 핵심 속성인 `isPublic`(boolean)을 기반으로 visibility(ALL/PUBLIC/PRIVATE)라는 3-way 필터를 설계했습니다. boolean을 3-way 선택으로 변환할 때는 URL param과 Prisma where 절 사이의 매핑이 필요한데, `'PUBLIC'`은 `{ isPublic: true }`, `'PRIVATE'`은 `{ isPublic: false }`로 변환합니다. skinType(LIST/GALLERY) 필터는 추가하지 않았는데, 게시판 수가 보통 10~20개로 적어 필터가 오히려 UI를 복잡하게 만든다고 판단했습니다. 이러한 도메인별 필터 설계가 가능한 이유는 TanStack Query의 queryKey에 필터 객체를 포함하기 때문입니다 — `boardKeys.list(filters)`처럼 필터 조합이 달라지면 자동으로 캐시가 분리됩니다.

#### 꼬리 질문 대응

**"나중에 skinType 필터를 추가하려면 어떻게 하나요?"**
`boardFilters.ts`에 `skinType` 필드를 추가하고, API의 Zod 스키마에 해당 param을 추가한 뒤, where 절에 조건을 합성하면 됩니다. queryKey에 filters 객체가 통째로 들어가므로 캐시 분리는 자동으로 처리됩니다. 복합 필터가 늘어나도 TanStack Query 패턴 덕분에 추가 작업이 최소화됩니다.

---

## 트러블슈팅 로그

| 문제 | 원인 | 해결 |
|------|------|------|
| `BoardForm.tsx` lint warning: "Compilation Skipped: Use of incompatible library" | react-hook-form의 `watch()` API가 React Compiler의 memoization과 호환되지 않음 | SubpageForm에도 동일한 warning이 존재하는 기존 이슈. react-hook-form이 React Compiler를 공식 지원하면 해소될 예정. 기능에는 영향 없음 |
| 기존 `roles/route.ts`, `UserRoleSelect.tsx` lint 에러 | 이전 Stage에서 남아있던 미사용 변수 에러 | Board 코드와 무관한 기존 이슈로 이번 Stage에서는 수정 범위 밖 |

---

## 한 줄 요약 카드

- **CRUD 슬라이스 복제**: 원본을 "도메인 무관 구조"와 "도메인 특화 로직"으로 분류한 뒤, 66%는 값만 치환하고 나머지는 제거/추가/변경하여 기존 코드 수정 없이 새 도메인을 독립 생성한다.
- **애플리케이션 레벨 참조 무결성**: DB Cascade가 있어도 앱에서 `_count`로 참조를 확인하고 차단하는 이유는 감사 로그 완전성, 운영 실수 방지, 구체적 에러 메시지 제공 세 가지다.
- **Prisma `_count`**: `select`/`include`에 `_count`를 포함하면 상관 서브쿼리로 변환되어 N+1 없이 관계 레코드 수를 조회하고, API 응답에서는 `postCount`로 매핑하여 내부 구조를 감춘다.
- **boolean의 Select 변환**: `Controller`의 render 안에서 `value={bool ? 'true' : 'false'}` + `onChange(v === 'true')`로 UI에서만 문자열 변환이 일어나고, Form/API에서는 boolean을 유지한다.
- **FSD 의도적 중복**: 같은 레이어 슬라이스 간 import 금지 규칙에 따라 SlugField를 복제하되, 사용처가 3개 이상이면 shared로 추출을 검토한다.

---

## 추가 학습 자료

- [Prisma — Referential Actions](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions) — onDelete: Cascade/SetNull/Restrict 공식 문서
- [Prisma — Aggregation, Grouping, Summarizing](https://www.prisma.io/docs/orm/prisma-client/queries/aggregation-grouping-summarizing) — `_count`, `_avg`, `_sum` 등 집계 함수
- [Feature-Sliced Design — Isolation](https://feature-sliced.design/docs/reference/isolation) — 슬라이스 간 격리 규칙과 공유 전략
- [TanStack Query — Query Keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys) — 필터 객체를 키에 포함하여 캐시 자동 분리
- [react-hook-form — Controller](https://react-hook-form.com/docs/usecontroller/controller) — 외부 UI 라이브러리와 통합 시 Controller 패턴
