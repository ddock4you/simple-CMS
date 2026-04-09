변경된 파일의 **import 규칙 준수 여부**를 검사해줘.

## 동작 순서

1. **대상 파일 감지**: git diff 또는 현재 대화에서 변경/작성된 TypeScript/TSX 파일 자동 감지. 파일이 없으면 전체 `src/` 검사.
2. **프로젝트 규칙 참조**: Root CLAUDE.md의 "import 순서" 및 "코딩 컨벤션" 참조
3. **검사 수행**: 아래 규칙별로 위반 여부 확인
4. **결과 출력**: 위반 목록 + 자동 수정 제안

## 검사 규칙

### 1. import 순서

올바른 순서 (그룹 간 빈 줄 구분):

```ts
// 1. React / Next.js 내장
import { useState } from 'react';
import { notFound } from 'next/navigation';

// 2. 외부 라이브러리
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// 3. 공용 패키지
import { prisma } from '@simple-cms/db';
import type { Page } from '@simple-cms/types';

// 4. FSD 상위 레이어 → 하위 순 (슬라이스 내부 파일 직접 import)
import { PageForm } from '@/features/page/ui/PageForm';
import { formatSlug } from '@/entities/page/model/slugUtils';

// 5. 같은 슬라이스 내부
import { pageSchema } from '../model/page.schema';
```

### 2. type-only import

`consistent-type-imports` 규칙:

```ts
// ✅ 올바름
import type { Page } from '@simple-cms/types';
import type { PageFormProps } from './types';

// ❌ 위반 — 타입만 import하는데 type 키워드 누락
import { Page } from '@simple-cms/types'; // Page가 타입인 경우
```

### 3. 경로 별칭 사용

```ts
// ✅ 올바름 — @/* 경로 별칭
import { Button } from '@/shared/ui/Button';

// ❌ 위반 — 상대 경로로 FSD 레이어 횡단
import { Button } from '../../../shared/ui/Button';
```

- 같은 슬라이스 내부 파일 간 상대 경로는 허용 (`./`, `../`)
- FSD 레이어를 넘는 import는 `@/*` 경로 별칭 사용

### 4. FSD 슬라이스 직접 import

FSD 슬라이스는 내부 파일을 직접 경로로 import해야 한다 (barrel export 사용 금지):

```ts
// ✅ 올바름 — 슬라이스 내부 파일 직접 import
import { PageForm } from '@/features/page/ui/PageForm';
import { createPage } from '@/features/page/api/createPage';

// ❌ 위반 — 슬라이스 루트 import (barrel export 경유)
import { PageForm } from '@/features/page';
```

- `packages/` 패키지 import는 이 규칙의 대상 외 (`@simple-cms/db`, `@simple-cms/types` 등은 정상)

## 출력 형태

```
## import 규칙 검사 결과

### 검사 파일: {N}개

| # | 파일 | 위반 유형 | 상세 | 수정 제안 |
|---|------|-----------|------|-----------|
| 1 | src/features/page/ui/PageForm.tsx | import 순서 | 외부 라이브러리가 React 위에 위치 | React import을 최상단으로 |
| ... | ... | ... | ... | ... |

위반이 없으면:
✅ 모든 import 규칙을 준수하고 있습니다.
```

## 참고

- 이 검사는 ESLint의 import 관련 규칙과 보완적으로 동작
- node_modules, .next, 설정 파일(_.config._)은 검사 대상에서 제외
- 자동 수정이 가능한 위반은 수정 코드를 함께 제안
