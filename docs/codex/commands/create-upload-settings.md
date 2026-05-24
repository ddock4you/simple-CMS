<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
현재 대화 컨텍스트를 분석하여 **업로드 제한 설정 기능 (허용 확장자, MIME 타입, 최대 파일 크기)**을 구현해줘.

## 동작 순서

1. **현재 상태 파악**: 아래 Phase 중 어디까지 구현되었는지 확인한다.
   - SiteSettings 모델 존재 여부 → `packages/db/prisma/schema.prisma`
   - 업로드 제한 타입 키 존재 여부 → `packages/types/src/domain/siteSettings.types.ts` (`UPLOAD_ALLOWED_EXTENSIONS` 등)
   - 업로드 검증 헬퍼 존재 여부 → `packages/db/src/uploadRestriction.ts`
   - 업로드 설정 UI 존재 여부 → `apps/admin/src/features/site-settings/ui/UploadSettingsForm.tsx`
   - 업로드 설정 라우트 존재 여부 → `apps/admin/app/settings/upload/page.tsx`
2. **다음 Phase 구현**: 미완료된 가장 앞 Phase의 코드를 생성한다.
3. **컨벤션 검증**: FSD 구조, 감사 로그 연동, import 규칙을 확인한다.

## 전제 조건

- SiteSettings 모델이 이미 존재해야 한다
- `features/site-settings/` 슬라이스가 존재해야 한다 (도메인 또는 보안 설정에서 생성)
- `SettingsNav.tsx`가 존재해야 한다 (탭 추가 대상)
- 전제 조건이 충족되지 않으면 먼저 구현해야 할 항목을 안내한다

## Phase별 생성 대상

### Phase A: 업로드 검증 헬퍼 + 타입 (단계 2 시점, DB/인증 구현과 함께)

| 대상             | 파일                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 업로드 검증 헬퍼 | `packages/db/src/uploadRestriction.ts`                                                                                                          |
| 타입             | `packages/types/src/domain/siteSettings.types.ts` (`UPLOAD_ALLOWED_EXTENSIONS`, `UPLOAD_ALLOWED_MIME_TYPES`, `UPLOAD_MAX_FILE_SIZE_MB` 키 추가) |

헬퍼 함수:

- `getUploadRestrictions()`: 3개 키 일괄 조회 → `JSON.parse()` → 기본값 폴백
- `validateFileUpload(fileName, mimeType, fileSizeBytes)`: 확장자 + MIME 타입 + 파일 크기 검증

### Phase B: Admin 업로드 설정 UI (단계 3 시점)

| 대상             | 파일                                                                                                                                         |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Zod 스키마       | `apps/admin/src/features/site-settings/model/upload.schema.ts`                                                                               |
| API Route        | `apps/admin/app/api/settings/upload/route.ts`                                                                                                |
| Fetcher/Mutation | `apps/admin/src/features/site-settings/api/siteSettingsFetchers.ts`, `apps/admin/src/features/site-settings/api/useSiteSettingsMutations.ts` |
| UI               | `apps/admin/src/features/site-settings/ui/UploadSettingsForm.tsx`                                                                            |
| 페이지           | `apps/admin/src/pages/settings/UploadSettingsPage.tsx`                                                                                       |
| 라우트           | `apps/admin/app/settings/upload/page.tsx`                                                                                                    |
| 설정 네비게이션  | `apps/admin/src/features/site-settings/ui/SettingsNav.tsx` (upload 탭 추가)                                                                  |

감사 로그: `SITE_SETTINGS` entityType으로 `logAuditEvent()` 호출 필수.

## 핵심 패턴 참조

### SiteSettings 키 정의

| 키                          | 값 형식          | 기본값                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UPLOAD_ALLOWED_EXTENSIONS` | JSON 배열 문자열 | `'[".jpg",".jpeg",".png",".gif",".webp",".svg",".pdf",".doc",".docx",".xls",".xlsx",".hwp",".hwpx",".pptx",".zip"]'`                                                                                                                                                                                                                                                                                                                |
| `UPLOAD_ALLOWED_MIME_TYPES` | JSON 배열 문자열 | `'["image/jpeg","image/png","image/gif","image/webp","image/svg+xml","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","application/x-hwp","application/haansofthwp","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/zip"]'` |
| `UPLOAD_MAX_FILE_SIZE_MB`   | 숫자 문자열      | `"10"`                                                                                                                                                                                                                                                                                                                                                                                                                              |

### API Route 핸들러 템플릿

`/create-api` 스킬의 API Route 생성 패턴과 동일:

- `NextRequest`/`NextResponse` 기반 Route Handler
- 인증 확인 → Zod 검증 → DB 처리 → 감사 로그
- 결과: `NextResponse.json({ success: true, data })` | `NextResponse.json({ success: false, error }, { status })`

### 업로드 검증 헬퍼 패턴

```ts
// packages/db/src/uploadRestriction.ts
import { getSiteSettings } from './repositories/siteSettings';

const DEFAULT_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.hwp',
  '.hwpx',
  '.pptx',
  '.zip',
];

const DEFAULT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/x-hwp',
  'application/haansofthwp',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
];

const DEFAULT_MAX_SIZE_MB = 10;

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function getUploadRestrictions() {
  const settings = await getSiteSettings([
    'UPLOAD_ALLOWED_EXTENSIONS',
    'UPLOAD_ALLOWED_MIME_TYPES',
    'UPLOAD_MAX_FILE_SIZE_MB',
  ]);
  return {
    allowedExtensions: safeJsonParse<string[]>(
      settings.UPLOAD_ALLOWED_EXTENSIONS,
      DEFAULT_EXTENSIONS,
    ),
    allowedMimeTypes: safeJsonParse<string[]>(
      settings.UPLOAD_ALLOWED_MIME_TYPES,
      DEFAULT_MIME_TYPES,
    ),
    maxFileSizeMb: parseInt(
      settings.UPLOAD_MAX_FILE_SIZE_MB ?? String(DEFAULT_MAX_SIZE_MB),
      10,
    ),
  };
}

export async function validateFileUpload(
  fileName: string,
  mimeType: string,
  fileSizeBytes: number,
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const restrictions = await getUploadRestrictions();
  const ext = '.' + fileName.split('.').pop()?.toLowerCase();

  if (!restrictions.allowedExtensions.includes(ext)) {
    return {
      allowed: false,
      reason: `허용되지 않는 파일 확장자입니다: ${ext}`,
    };
  }
  if (!restrictions.allowedMimeTypes.includes(mimeType)) {
    return {
      allowed: false,
      reason: `허용되지 않는 파일 형식입니다: ${mimeType}`,
    };
  }
  const maxBytes = restrictions.maxFileSizeMb * 1024 * 1024;
  if (fileSizeBytes > maxBytes) {
    return {
      allowed: false,
      reason: `파일 크기가 ${restrictions.maxFileSizeMb}MB를 초과합니다`,
    };
  }
  return { allowed: true };
}
```

### Zod 스키마 패턴

```ts
// apps/admin/src/features/site-settings/model/upload.schema.ts
import { z } from 'zod';

const extensionPattern = /^\.[a-z0-9]+$/;
const mimeTypePattern = /^[a-z]+\/[a-z0-9\-\.+]+$/;

export const uploadSettingsSchema = z.object({
  allowedExtensions: z
    .array(
      z
        .string()
        .regex(extensionPattern, '확장자는 .으로 시작하고 소문자여야 합니다'),
    )
    .min(1, '최소 하나의 확장자를 허용해야 합니다'),
  allowedMimeTypes: z
    .array(
      z.string().regex(mimeTypePattern, '올바른 MIME 타입 형식이어야 합니다'),
    )
    .min(1, '최소 하나의 MIME 타입을 허용해야 합니다'),
  maxFileSizeMb: z.number().int().min(1, '최소 1MB').max(100, '최대 100MB'),
});
```

### UploadSettingsForm UI 패턴

- 태그(chip) 입력으로 확장자/MIME 타입 개별 추가/삭제
- shadcn/ui Badge로 태그 표시, Input으로 새 항목 입력, X 버튼으로 삭제
- 최대 파일 크기: shadcn/ui Input (type="number", MB 단위)
- 현재 설정값을 Server Component에서 조회하여 props 전달
- 변경은 Client Component에서 useMutation → API Route 호출

## 참고

- `/create-domain-settings` — 같은 SiteSettings 도메인의 도메인 설정 구현 스킬
- `/create-security-settings` — 같은 SiteSettings 도메인의 보안 설정 구현 스킬
- `/create-api` — API Route 생성 패턴
- `/create-feature` — FSD feature 슬라이스 스캐폴딩
- `/check-fsd` — FSD 아키텍처 규칙 검증
- `/review-code` — 코드 품질 체크리스트 (감사 로그 포함 여부 확인)
