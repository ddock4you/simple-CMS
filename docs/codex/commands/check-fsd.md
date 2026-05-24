<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
현재 프로젝트의 FSD(Feature-Sliced Design) 아키텍처 규칙 준수 여부를 검사해줘.

## 동작 순서

1. **대상 앱 감지**: 현재 대화 컨텍스트 또는 최근 변경 파일(git diff)에서 대상 앱(admin/web) 자동 판별. 특정 앱이 불분명하면 양쪽 모두 검사.
2. **FSD 구조 확인**: 해당 앱의 AGENTS.md에서 FSD 레이어 구조를 참조
3. **import 분석**: `src/` 아래 모든 TypeScript/TSX 파일의 import문 분석
4. **위반 검사**: 아래 규칙 위반 여부 확인
5. **결과 출력**: 위반 목록 + 수정 제안

## 검사 규칙

### admin (경량 FSD)

레이어 순서 (상위 → 하위):

```
app → pages → features → entities → shared
```

- `widgets`는 존재 시에만 pages와 features 사이에 위치

### web (정석 FSD)

레이어 순서 (상위 → 하위):

```
app → pages → widgets → features → entities → shared
```

### 공통 규칙

#### 1. 역방향 레이어 import 금지

하위 레이어에서 상위 레이어를 import하면 위반.

위반 예시:

- `shared/`에서 `features/` import
- `entities/`에서 `pages/` import
- `features/`에서 `widgets/` import

#### 2. 같은 레이어 내 슬라이스 간 직접 import 금지

같은 레이어의 다른 슬라이스를 직접 import하면 위반.

위반 예시:

- `features/page/`에서 `features/board/` import
- `entities/post/`에서 `entities/user/` import

허용:

- 같은 슬라이스 내부 파일 간 import는 OK
- 공유가 필요하면 하위 레이어(entities 또는 shared)로 내려야 함

#### 3. app/ 라우팅 디렉토리 내 비즈니스 로직 금지

루트 `app/` 디렉토리(Next.js App Router)에는 라우팅 설정만 포함.

위반 예시:

- `app/pages/[id]/page.tsx`에 50줄 이상의 비즈니스 로직
- `app/` 내에서 Prisma 직접 호출 (BFF 로직은 features/entities에서)

허용:

- `app/` 내 layout.tsx, page.tsx에서 FSD pages 레이어 컴포넌트를 import하여 렌더링
- metadata export
- 간단한 데이터 fetching 후 FSD 컴포넌트에 props 전달

#### 4. 직접 import 패턴 (barrel export 사용 금지)

FSD 슬라이스에 `index.ts` barrel export 파일을 두지 않는다.
외부에서 슬라이스 내부 파일을 직접 import한다.

올바른 예시:

- `import { PageForm } from '@/features/page/ui/PageForm'`
- `import { updatePage } from '@/features/page/api/updatePage'`

위반 예시:

- `features/page/index.ts`가 존재하면서 re-export하고 있음
- `import { PageForm } from '@/features/page'` (barrel 경유 import)

예외:

- `packages/` 하위 패키지의 `index.ts`는 패키지 진입점이므로 허용

## 출력 형태

```
## FSD 아키텍처 검사 결과

### 검사 대상: {앱 이름}

### 위반 사항
| # | 파일 | 위반 유형 | 상세 | 수정 제안 |
|---|------|-----------|------|-----------|
| 1 | src/shared/ui/Button.tsx | 역방향 import | features/page를 import | shared에서 features 의존 제거, props로 전달 |
| ... | ... | ... | ... | ... |

### 통과
- 레이어 의존성: {위반 수} / {전체 import 수}
- 슬라이스 격리: {위반 수}
- app/ 라우팅 분리: {위반 수}

위반이 없으면:
✅ FSD 아키텍처 규칙을 모두 준수하고 있습니다.
```

## 참고

- 이 검사는 정적 분석이므로 동적 import나 lazy loading은 감지하지 못할 수 있음
- `@/*` 경로 별칭은 `./src/*`로 해석하여 분석
- node_modules, .next, test 파일은 검사 대상에서 제외
