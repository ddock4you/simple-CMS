<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
# packages/types — 공용 DTO / 도메인 인터페이스

admin, web 양쪽에서 공유하는 타입을 정의하는 패키지.
앱에서는 `@simple-cms/types`로 import하여 사용한다.

## 역할

- 앱 간 공유 DTO (API 요청/응답 형태)
- 도메인 인터페이스 (비즈니스 로직용)
- 공용 enum / union type
- 유틸리티 타입

## 구조

```
packages/types/
├── src/
│   ├── index.ts            # 패키지 진입점 (앱에서 @simple-cms/types로 import)
│   ├── domain/             # 도메인별 인터페이스
│   │   ├── subpage.types.ts
│   │   ├── board.types.ts
│   │   ├── post.types.ts
│   │   ├── navigation.types.ts
│   │   ├── home.types.ts
│   │   ├── popup.types.ts         # HomePopupType, PopupLinkKind (Stage 5b)
│   │   ├── block.types.ts         # PageBlockType(RICH_TEXT/HTML/IMAGE/IFRAME/ACCORDION), RichTextBlockConfig, HtmlBlockConfig, ImageBlockConfig, IframeBlockConfig, AccordionBlockConfig, PAGE_BLOCK_MAX_PER_SUBPAGE (Stage 6 — 통합 블록 모델)
│   │   ├── media.types.ts
│   │   ├── user.types.ts
│   │   ├── role.types.ts          # Role 도메인 인터페이스
│   │   ├── permission.types.ts    # RESOURCE_ACTIONS 상수, Resource, Action, PermissionMap 타입 (home-popups 포함)
│   │   ├── feedback.types.ts      # FeedbackRating, FeedbackPositiveReason, FEEDBACK_POSITIVE_REASONS 상수 (Stage 10)
│   │   ├── auditLog.types.ts
│   │   └── siteSettings.types.ts
│   ├── dto/                # API 요청/응답 DTO
│   │   ├── subpage.dto.ts
│   │   ├── board.dto.ts
│   │   ├── user.dto.ts        # RegisterUserDto, UpdateProfileDto, ChangePasswordDto, UserListResponse
│   │   ├── role.dto.ts           # CreateRoleDto, UpdateRoleDto, UpdatePermissionsDto, RoleListResponse
│   │   ├── home.dto.ts        # HomeSectionListItem, HomeSectionDetail, UpdateHomeSectionDto, ReorderHomeSectionsDto, HomeReferencesDto
│   │   ├── popup.dto.ts       # HomePopupListItem, HomePopupDetail, CreateHomePopupDto, UpdateHomePopupDto, ReorderHomePopupsDto, HomePopupReferencesDto (Stage 5b)
│   │   ├── block.dto.ts       # PageBlockListItem, PageBlockDetail, CreatePageBlockDto, UpdatePageBlockDto, ReorderPageBlocksDto (Stage 6)
│   │   ├── media.dto.ts       # MediaListItem, MediaDetail, MediaListFilters, MediaListResponse, UpdateMediaDto, UploadMediaResponse, MediaReference, MediaReferencesResponse (MediaReferenceType에 PAGE_BLOCK_IMAGE 포함)
│   │   ├── feedback.dto.ts    # CreateFeedbackDto, FeedbackListItem/ListResponse, FeedbackStatsResponse (Stage 10)
│   │   ├── auditLog.dto.ts
│   │   └── ...
│   └── common.types.ts     # 공용 유틸리티 타입
└── package.json
```

## 타입 컨벤션

- `interface` 우선 (확장 가능성), 단순 union/교차는 `type`
- DTO 네이밍: `Create{Domain}Dto`, `Update{Domain}Dto`, `{Domain}ListResponse`
- 도메인 인터페이스 네이밍: `{Domain}` (예: `Subpage`, `Board`)
- `import type` 사용 (`consistent-type-imports` 규칙)

## Prisma 타입과의 관계

- Prisma가 생성하는 타입은 `packages/db`에서 관리
- 이 패키지는 앱 간 API 계약(DTO)과 비즈니스 로직용 인터페이스 담당
- **DB 모델 타입 ≠ API DTO 타입** (같은 도메인이더라도 분리)
- DTO는 클라이언트에 노출해도 안전한 필드만 포함

## 주의사항

- 런타임 코드가 아니므로 별도 단위 테스트 불필요
- 타입 정합성은 `pnpm typecheck` (tsc --noEmit)로 검증
- 앱 내부에서만 쓰이는 타입은 여기에 넣지 않고 해당 앱 내부에서 관리
