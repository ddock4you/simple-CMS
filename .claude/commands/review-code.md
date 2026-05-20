현재 변경 내용을 대상으로 **커밋 전 코드 품질 체크리스트**를 수행해줘.

## 동작 순서

1. **변경 내용 분석**: git diff (staged + unstaged) 또는 현재 대화에서 작성/수정된 파일 분석
2. **프로젝트 규칙 참조**: Root CLAUDE.md, 해당 앱/패키지의 CLAUDE.md 참조
3. **체크리스트 수행**: 아래 항목별로 통과/주의/위반 판정
4. **결과 출력**: 항목별 결과 + 수정 필요 사항

## 체크리스트

### 아키텍처

- [ ] **FSD 레이어 규칙 준수**: 역방향 import 없음, 슬라이스 간 직접 import 없음
- [ ] **Server/Client Component 분리**: `'use client'`가 필요한 곳에만 선언, leaf 레벨 최소화
- [ ] **app/ 라우팅 분리**: app/ 디렉토리에 비즈니스 로직 없음 (FSD 레이어에 위임)

### 코드 품질

- [ ] **타입 안전성**: `any` 사용 없음 (불가피하면 주석으로 사유 명시)
- [ ] **console.log 잔존**: 디버깅용 console.log/warn/error 제거
- [ ] **하드코딩 문자열**: 사용자 노출 문자열 하드코딩 여부 확인
- [ ] **unused import/변수**: 사용하지 않는 import나 변수 잔존 여부

### 패턴 준수

- [ ] **import 순서**: React → 외부 → 공용 패키지 → FSD 레이어 → 내부
- [ ] **type-only import**: 타입만 import할 때 `import type` 사용
- [ ] **에러 처리**: API Route 핸들러가 `{ success, data?, error? }` 형태 반환
- [ ] **파일 네이밍**: 컴포넌트 PascalCase, 유틸 camelCase, 테스트 \*.test.ts(x)

### 감사 로그

- [ ] **감사 로그 포함**: 데이터 변경 API Route 핸들러에 `logAuditEvent()` 호출이 포함되어 있는가? (기본 포함 원칙)
- [ ] **감사 로그 생략 사유**: 로깅 생략 시 `// 감사 로그 생략: {사유}` 주석이 명시되어 있는가?

### 보안

- [ ] **XSS 방지**: 사용자 입력을 `dangerouslySetInnerHTML`로 렌더링하지 않음 (HTML 렌더링 시 DOMPurify 사용)
- [ ] **콘텐츠 렌더링 보안**: `generateHTML()` 출력에 DOMPurify 새니타이징 적용 여부 확인 (defense-in-depth)
- [ ] **SQL Injection**: Prisma ORM 사용 (raw query 시 파라미터 바인딩)
- [ ] **인증+인가 검사**: 데이터 변경 API Route 핸들러에 `requirePermission()` 호출 포함 (프로필 등 예외는 `getCurrentUser()`만 사용)
- [ ] **리소스 등록**: 새 도메인 추가 시 `packages/types`의 `RESOURCE_ACTIONS`에 리소스 등록 여부

### 링크/URL 입력 (admin, Stage 7i)

admin에 새 URL 입력 필드를 추가할 때:

- [ ] **LinkTargetInput 공용 컴포넌트 우선 검토**: `import { LinkTargetInput } from '@/entities/link-target/ui/LinkTargetInput'` 사용. NONE/SUBPAGE/BOARD/EXTERNAL 분기 자동 + slug 변경에 안전. raw `<Input {...register('url')} />` 직접 사용은 운영자가 slug 변경 시 깨지는 URL을 직접 추적해야 하므로 지양
- [ ] **react-hook-form Controller 패턴**: `<Controller name="url" control={control} render={({ field }) => <LinkTargetInput value={field.value ?? ''} onChange={field.onChange} />} />`. nullable 필드는 `field.value ?? ''`로 정규화
- [ ] **`allowNone` prop 결정**: Zod schema의 url이 `min(1)` 필수면 `allowNone={false}` 전달 (NONE 옵션이 select에서 hide되어 빈 값 진입 차단). 그 외는 default true
- [ ] **References prefetch (선택)**: 페이지 진입 시 `linkTargetReferencesOptions()`를 `prefetchQuery`하면 첫 렌더에 빈 Select 깜박임 제거 가능 (PopupEditPage 패턴)

### 입력 Dialog (admin)

폼/필드를 담은 Dialog 추가/수정 시:

- [ ] **외부 클릭 닫기 차단**: `<Dialog ... disablePointerDismissal>` opt-in 여부 (AlertDialog는 Base-UI가 강제하므로 불필요)
- [ ] **Dirty 가드**: `useDialogDirtyGuard(isDirty, onOpenChange)` + `<ConfirmLeaveDialog {...confirmDialogProps} />` 연결 — 입력 중 ESC/취소 시 이탈 확인
- [ ] **오픈 시 폼 초기화**: 다음 중 하나가 반드시 구현되어 저장 성공 후 재오픈 시 이전 입력값이 남지 않음
  - (A) `useEffect(() => { if (!open) return; reset(...); }, [open, ...deps, reset])` — `open`이 의존성에 포함될 것
  - (B) mutation `onSuccess`에서 `reset()` 호출
  - (C) 부모에서 `<Dialog key={...} />`로 매번 새 마운트
- [ ] **중첩 흐림 자동 적용 확인**: 공용 `shared/ui/shadcn/dialog.tsx`/`alert-dialog.tsx`를 그대로 사용했는지 (개별 className 오버라이드로 `data-[nested-dialog-open]:*` 룰을 지우지 말 것)

### 폼 컨트롤 height (Stage 15c-3f — apps/admin)

- [ ] **폼 컨트롤 height**: design.md §4.5 baseline 준수 — `default` / `sm` size variant 사용 (둘 다 32px). `h-{n}` className 직접 override 금지

### 테스트

- [ ] **테스트 파일 존재**: 새로 작성한 유틸/로직에 대응하는 테스트 파일 존재 여부
- [ ] **테스트 파일 위치**: 대상 코드와 같은 디렉토리에 위치
- [ ] **트랙 분리 (Stage 7f 도입 후)**: 순수 함수/zod/훅 pure logic은 `*.test.ts`(jsdom), React 컴포넌트·폼 validation·hover/scroll·ResizeObserver·swiper 관련은 `*.stories.tsx`의 play function(browser). 한 컴포넌트에 `*.test.tsx` + `*.stories.tsx` 동시 작성 지양

### 공개 웹 스타일링 (Stage 7e — apps/web 한정)

- [ ] **KRDS Tailwind utility 우선**: 새 컴포넌트의 스타일은 globals.css 신규 클래스 추가 대신 KRDS plugin utility 우선 검토 (`bg-primary-50`/`text-display-s`/`rounded-5`/`p-7` 등)
- [ ] **KRDS 브레이크포인트만 사용**: `mobile:`(360+)/`tablet:`(601+)/`desktop:`(1025+)만 사용. `md:`/`lg:`/`xl:`/`sm:` 같은 default Tailwind 브레이크포인트는 KRDS plugin이 `theme.screens`를 override해서 **컴파일되지 않음** — 사용 시 런타임 무반응 버그
- [ ] **색상 매핑**: `var(--krds-color-*)` 또는 hex를 새로 쓰지 말고 plugin 토큰 사용. 정확 매핑이 없는 hex는 가까운 `gray-*`/`point-*`로. arbitrary `bg-[#XXX]`는 최후 수단
- [ ] **spacing scale 혼동 금지**: KRDS spacing은 `p-3`=8px, `p-7`=24px 등 **default Tailwind와 값이 다름** (admin은 default, web은 KRDS). 앱 간 코드 이동 시 spacing 숫자 재매핑
- [ ] **Tiptap/HTML 블록 자식 스타일 불가**: `.tiptap-content *` 및 `.subpage-block-html *`는 사용자 입력 HTML이므로 utility 적용 불가 — globals.css에서 유지

### 시연 모드 빌드 (apps/web — `build:demo`)

`apps/web/scripts/bundle-storybooks.mjs` 또는 `apps/{admin,web}/vercel.json` / `apps/web/app/robots.ts`의 `DEMO_MODE` 분기를 만지는 PR에서:

- [ ] **temp dir 패턴 보존**: bundle-storybooks가 `apps/web/.tmp-storybook/{admin,web}/` 에 먼저 빌드 후 `apps/web/public/_cms/storybook/{admin,web}/` 로 rename하는 흐름을 유지. public 안으로 직접 빌드하도록 바꾸면 web Storybook이 admin 산출물을 자기 staticDirs로 흡수해 무한 self-nesting (`/web/_cms/storybook/web/_cms/storybook/...`) → Windows long-path(260자) 한도 즉시 초과
- [ ] **`finalParent` cleanup 유지**: 빌드 시작 시 `apps/web/public/_cms` 디렉토리 **전체**를 `rm -rf`. `_cms/storybook`만 비우면 빈 `_cms/` 디렉토리가 web Storybook 산출물 안에 다시 복사되는 2차 self-nesting 발생
- [ ] **rename target 부모 mkdir**: `mkdir(finalBase, { recursive: true })`로 `public/_cms/storybook` 까지 생성해야 함. `path.dirname(finalBase)`만 만들면 `ENOENT` (Node fs.rename은 target의 부모가 존재해야 동작)
- [ ] **`moveWithRetry` 유지**: Windows에서 fs.rename이 Defender 스캔 / 잔여 file handle로 일시 `EPERM`/`EBUSY` 발생. 300ms × N backoff 5회 retry 패턴 변경 금지. cross-platform이라 Linux/macOS 영향 0
- [ ] **검색엔진 차단 defense-in-depth**: `apps/{admin,web}/vercel.json`의 `X-Robots-Tag: noindex, nofollow, noarchive` 헤더 + `apps/web/app/robots.ts`의 `process.env.DEMO_MODE === 'true'` 분기(`Disallow: /` early return) 두 곳이 함께 유지되어야 함. 한쪽만 두면 robots.txt를 무시하는 크롤러 / robots.txt가 차단되기 전 크롤된 캐시에 노출 위험
- [ ] **`apps/web/public/_cms/storybook/`는 `.gitignore`에 포함**: 시연 빌드 산출물이 실수로 commit되지 않도록 보존. Windows long-path 이슈로 cleanup이 어려운 디렉토리라 한 번 들어가면 빼기 어려움

### Swiper 캐러셀 사용 (Stage 7e — apps/web 한정)

- [ ] **Carousel 공용 컴포넌트 경유**: 새 슬라이드/캐러셀 UI는 반드시 `apps/web/src/shared/ui/Carousel.tsx`를 사용. 직접 `import { Swiper } from 'swiper/react'` 사용 금지 (width 측정 race 방어 미적용 상태가 됨)
- [ ] **slidesPerView 가변 시 CSS guard 필수**: `Carousel`에 `breakpoints` prop으로 viewport별 `slidesPerView`를 넘기는 경우 globals.css에 해당 섹션 전용 `.{섹션}-class .swiper-slide`의 breakpoint별 `calc()` width `!important` guard 추가. swiper formula `(container - spaceBetween*(n-1))/n`와 **1:1 동기화**
- [ ] **slidesPerView=1 단일 케이스**: `<section data-{hero|etc}-carousel>` 속성 + `[data-{hero|etc}-carousel] .swiper-slide { width: 100% !important }` guard 권장 (Hero 패턴 참조)
- [ ] **swiper observer 옵션 금지**: `observer`/`observeParents`/`observeSlideChildren` 활성화 금지 — 내부 observer + update race로 22M 회귀 재발. `watchOverflow`만 허용

## 출력 형태

```
## 코드 리뷰 결과

### 변경 파일: {N}개

| 항목 | 상태 | 상세 |
|------|------|------|
| FSD 레이어 규칙 | ✅ 통과 | |
| SC/CC 분리 | ⚠️ 주의 | PageForm.tsx에 'use client' 누락 가능성 |
| 타입 안전성 | ❌ 위반 | utils.ts:15에 any 사용 |
| ... | ... | ... |

### 수정 필요 사항
1. `src/features/page/ui/PageForm.tsx` — ...
2. ...

### 전체 판정
- 통과: {N}개 / 주의: {N}개 / 위반: {N}개
```

## 판정 기준

- **✅ 통과**: 규칙 준수
- **⚠️ 주의**: 위반은 아니지만 개선 권장 (예: 테스트 미작성, 하드코딩 문자열)
- **❌ 위반**: 반드시 수정 필요 (예: any 사용, FSD 위반, 보안 이슈)

## 참고

- 세부 검사가 필요하면 `/check-fsd`, `/check-imports`, `/check-permissions` 개별 실행
- UI 컴포넌트의 시각적 확인은 이 스킬 범위 밖 (Stage 7f 도입 후 Storybook `pnpm --filter @simple-cms/{admin|web} storybook` 또는 브라우저 `pnpm dev`)
- play function 상호작용 테스트는 `pnpm test`로 실행 (Stage 7f — Vitest browser project)
