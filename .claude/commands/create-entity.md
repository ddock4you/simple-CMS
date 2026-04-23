현재 대화 컨텍스트를 분석하여 FSD **entity 슬라이스**를 스캐폴딩해줘.

## 동작 순서

1. **대상 앱 감지**: 현재 대화에서 작업 중인 앱(admin/web) 자동 판별. 불분명하면 질문.
2. **도메인명 파악**: 대화 컨텍스트에서 도메인명 파악 (예: "게시글 표시 컴포넌트" → `post`). 불분명하면 질문.
3. **FSD 구조 확인**: 해당 앱의 CLAUDE.md에서 FSD 레이어 구조 참조
4. **디렉토리 + 파일 생성**: 아래 구조에 맞춰 스캐폴딩
5. **결과 보고**: 생성된 파일 목록 출력

## 생성 구조

### 기본 구조

```
src/entities/{domain}/
├── model/            # 도메인 로직, 유틸, 타입
│   └── .gitkeep
├── api/              # 도메인 데이터 fetch / queryOptions (선택, 여러 features에서 공유 시)
│   └── .gitkeep
└── ui/               # 도메인 표시용 컴포넌트 (선택)
    └── .gitkeep
```

### 외부에서의 import 방법

```ts
// 외부에서 직접 경로로 import (barrel export 사용하지 않음)
import { PostCard } from '@/entities/{domain}/ui/PostCard';
import { formatPostDate } from '@/entities/{domain}/model/postUtils';
import type { PostType } from '@/entities/{domain}/model/{domain}.types';
import { postReferencesOptions } from '@/entities/{domain}/api/postReferencesQueries';
```

## 규칙

- 이미 존재하는 슬라이스면 생성하지 않고 현재 구조를 보여줌
- `model/`은 도메인 관련 순수 로직, 유틸, `@simple-cms/types` re-export
- `api/`는 도메인 데이터 페칭이 **여러 features에서 공유**될 때 신설 (예: `linkTargetReferencesQueries.ts` — popup + home-management 공용. 단일 feature 전용이면 `features/{x}/api/`에 두는 것이 적절)
- `ui/`는 도메인 데이터를 표시하는 컴포넌트 (카드, 리스트 아이템 등) 또는 여러 features에서 공유하는 도메인 인지 입력 컴포넌트(예: `LinkTargetInput`)
- 외부에서는 슬라이스 내부 파일을 직접 경로로 import (barrel export 사용하지 않음)
- 같은 레이어의 다른 entity를 직접 import하지 않음
- entities는 `shared`만 의존 가능 (features, pages 의존 금지)

## features → entities 승격 시점

다음 신호가 보이면 features 슬라이스의 코드를 entities로 하강 검토:

- 같은 컴포넌트/쿼리를 **다른 feature 슬라이스에서 import하고 싶다** (FSD 위반 — features 간 직접 import 금지)
- 도메인 데이터(예: subpages/boards 참조)를 다루지만 특정 인터랙션에 묶이지 않음
- 사례: Stage 7i의 `LinkTargetInput`은 popup-management 내부에 있다가 home-management도 사용해야 해서 `entities/link-target`로 승격됨. 쿼리 이름도 `homePopupReferencesOptions` → `linkTargetReferencesOptions`로 도메인 중립화

## features vs entities 판단 기준

| 기준  | entities                 | features                  |
| ----- | ------------------------ | ------------------------- |
| 역할  | 도메인 데이터 표현/변환  | 사용자 인터랙션/액션      |
| 예시  | 게시글 카드, 날짜 포맷터 | 게시글 작성 폼, 검색 기능 |
| 상태  | 주로 stateless           | 주로 stateful             |
| SC/CC | 대부분 Server Component  | 대부분 Client Component   |

## 참고

- feature 슬라이스가 필요하면 `/create-feature` 사용
- 생성 후 `/check-fsd`로 아키텍처 규칙 검증 가능
