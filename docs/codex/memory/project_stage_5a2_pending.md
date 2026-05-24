<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Stage 5a-2 Completed (Media Management)
description: Stage 5a-2 미디어 라이브러리 구현 완료 (2026-04-14). 이 메모리는 더 이상 추적할 일이 없으며 보관용. 미디어 관련 후속 작업 시 코드/AGENTS.md를 직접 참조.
type: project
originSessionId: 0b2debbc-5f09-4510-9a75-bdf26901a3f8
---
Stage 5a-2 미디어 관리(Media Library + Picker + 중복 방지 + Tiptap 통합)가 2026-04-14에 구현 완료되었다.

**구현 결과** (Stage 5a-2):
- Prisma Media 모델에 `contentHash` (SHA-256 unique) + `uploadedById` (User FK) 추가
- 새 `media` 권한 리소스 + 사이드바 메뉴 + `/media` 페이지
- SHA-256 기반 업로드 중복 방지 (`reused: true` 응답)
- 참조 추적 (`findMediaReferences`) — Subpage/Post FK + HomeSection JSONB + Tiptap contentJson 재귀
- 삭제 차단 (참조 시 409 + 사용처 목록)
- MediaPicker 컴포넌트 (3곳에서 재사용: `/media`, ImageUrlInput, Tiptap 본문 툴바)
- packages/editor의 `ImageWithMediaId` + `ImageUploadExtension` (paste/drop 자동 업로드)
- Tiptap 본문 이미지에 `mediaId` attr → `<img data-media-id="...">` 직렬화
- web `renderContent.ts`의 DOMPurify ALLOWED_ATTR에 `data-media-id` 추가

**Why**: Stage 5a 완료 후 이미지 중복 저장 + 재사용 불가 + Media 미연동 문제 해결.

**How to apply**: 이 작업은 종료되었음. 미디어 관련 후속 작업(Stage 5b 팝업의 mediaId 통합 등)은 코드와 AGENTS.md를 직접 참조. 이 메모리는 보관용으로만 유지.

세션 ID(원본): 5a952c8e-a77f-41dd-9633-38d149347c78. 완료 세션: cfa631c8-ebc0-4735-9d81-b25714a42943.
