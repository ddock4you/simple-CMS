현재 대화 컨텍스트를 분석하여 FSD **feature 슬라이스**를 스캐폴딩해줘.

## 동작 순서

1. **대상 앱 감지**: 현재 대화에서 작업 중인 앱(admin/web) 자동 판별. 불분명하면 질문.
2. **도메인명 파악**: 대화 컨텍스트에서 도메인명 파악 (예: "페이지 CRUD를 만들자" → `page`). 불분명하면 질문.
3. **FSD 구조 확인**: 해당 앱의 CLAUDE.md에서 FSD 레이어 구조 참조
4. **디렉토리 + 파일 생성**: 아래 구조에 맞춰 스캐폴딩
5. **결과 보고**: 생성된 파일 목록 출력

## 생성 구조

### 기본 구조

```
src/features/{domain}/
├── ui/               # UI 컴포넌트 (Client Component 중심)
│   └── .gitkeep
├── model/            # 비즈니스 로직, 유효성 검사, 타입
│   └── .gitkeep
└── api/              # API fetcher, Query Key, Mutation 훅
    └── .gitkeep
```

### 외부에서의 import 방법

```ts
// 외부에서 직접 경로로 import (barrel export 사용하지 않음)
import { PageForm } from '@/features/{domain}/ui/PageForm';
import { useCreatePage } from '@/features/{domain}/api/usePageMutations';
import { pageSchema } from '@/features/{domain}/model/page.schema';
```

## 규칙

- 이미 존재하는 슬라이스면 생성하지 않고 현재 구조를 보여줌
- `ui/` 내 컴포넌트는 `'use client'` 선언 대상 (폼, 인터랙션)
- `model/`은 순수 로직 (서버/클라이언트 공용 가능)
- `api/`는 API Route 호출 fetcher, TanStack Query Key Factory, useMutation 훅
- 외부에서는 슬라이스 내부 파일을 직접 경로로 import (barrel export 사용하지 않음)
- 같은 레이어의 다른 feature를 직접 import하지 않음
- 새 도메인의 API Route가 권한 체크 대상이면 `packages/types`의 `RESOURCE_ACTIONS`에 리소스 등록 필요
- **권한 체크 필수 (API + UI 양쪽)**:
  - API Route: 모든 핸들러에 `requirePermission(resource, action)` 호출
  - Client Component: `usePermission(resource, action)` 훅으로 생성/편집/삭제 버튼 조건부 렌더링
  - Server Component: `hasPermission(user, resource, action)`으로 버튼 조건부 렌더링
  - 상세 페이지는 뷰(`/[id]`)와 편집(`/[id]/edit`) 분리 — update 권한 있을 때만 편집 버튼 표시

## 앱별 차이

### admin (경량 FSD)

- features 레이어가 폼/액션의 중심
- `api/`에 fetcher/query/mutation 정의가 주로 위치, API Route 핸들러는 `app/api/`에 배치

### web (정석 FSD)

- features 레이어는 인터랙티브 기능 (검색, 팝업 모달 등)
- 읽기 전용 데이터 표시는 entities 레이어가 더 적합할 수 있음

## 참고

- entity 슬라이스가 필요하면 `/create-entity` 사용
- 생성 후 `/check-fsd`로 아키텍처 규칙 검증 가능
- 생성 후 `/check-permissions`로 권한 정합성 검증 가능
