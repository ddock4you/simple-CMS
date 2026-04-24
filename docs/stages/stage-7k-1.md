# Stage 7k-1 — 청소 (LinkTarget API 경로 rename + IFRAME_ALLOWED_HOSTS 공유 모듈 추출)

7 시리즈에서 이연된 청소 2건을 일괄 처리. Stage 8 진입 전 기술 부채 0 상태 목표.

- **API endpoint rename**: `/api/home-popups/references` → `/api/link-target/references` (route handler 파일 이동 + `linkTargetReferencesQueries.ts`의 fetch URL 1줄 수정). Stage 7i에서 LinkTargetInput을 `entities/link-target`으로 승격한 뒤에도 endpoint 경로만 옛 이름이던 의미 일관성 갭 해소. 권한 체크(`home-popups:read`)는 유지 — endpoint 권한 재설계는 별도 scope
- **`IFRAME_ALLOWED_HOSTS` 단일 출처 통합**: `packages/types/src/domain/block.types.ts`에 상수 + `isIframeHostAllowed(src)` 헬퍼 추가 후 `index.ts`에서 export. `RESOURCE_ACTIONS` 선례와 동일 패턴(types가 값/함수도 export)
  - admin `features/block-management/model/blockLabels.ts`: 두 심볼을 `@simple-cms/types`에서 re-export (기존 import 경로 호환). `normalizeIframeEmbedUrl`(YouTube `/watch?v=` → `/embed/` 변환 등 저장 시점 정규화)은 admin 전용 유지 — web은 이미 정규화된 URL만 받으므로 host 재검증만 필요
  - web `SubpageBlockRenderer.tsx` + `shared/lib/renderContent.ts`: 각 파일의 private `IFRAME_ALLOWED_HOSTS` + 자체 호스트 검증 헬퍼(`isIframeSrcAllowed`/`isAllowedIframeSrc`) 제거, `@simple-cms/types`의 `isIframeHostAllowed` import
  - 효과: 호스트 리스트 정책 변경 시 3곳 동기화 필요 → 1곳으로 수렴. Stage 7b "공유 모듈 추출은 Stage 8+ 과제" 약속을 실제로 이행
- **stale artifact 주의**: admin의 `.next/types/validator.ts`가 기존 `/api/home-popups/references/route.js` 참조를 캐싱하고 있어 rename 후 typecheck 실패. `rm -rf apps/admin/.next/types` 후 재검증으로 해소
- **검증**: `pnpm typecheck` + `pnpm lint` 모두 녹색 (admin 56 + web 33 = **89 tests 유지**). `rg "/api/home-popups/references"` 결과 CLAUDE.md/route.ts 주석 제외 실행 코드 0건, `rg "IFRAME_ALLOWED_HOSTS"` 정의 1곳(packages/types) + re-export/import만 남음
