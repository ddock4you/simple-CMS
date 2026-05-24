<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: 갤러리형 게시판 썸네일 전략
description: Stage 4b에서 갤러리 스킨 게시판의 썸네일 이미지 결정 로직 구현 필요
type: project
originSessionId: 11fd8a63-a37b-40d2-a5eb-584d4d4ac744
---
갤러리형(skinType=GALLERY) 게시판의 게시글 썸네일 표시 전략이 결정됨.

**썸네일 결정 순서 (우선순위):**
1. `featuredImage`가 있으면 → 대표 이미지 사용
2. 없으면 → `contentJson`에서 첫 번째 이미지 자동 추출
3. 둘 다 없으면 → 기본 placeholder 표시

**Why:** 운영자가 의도한 이미지를 직접 지정할 수 있되, 매번 수동 업로드 부담 없이 콘텐츠 내 이미지로 자동 폴백하여 운영 편의와 표현 품질을 동시에 확보.

**How to apply:**
- Stage 4b (Web 게시판/게시글 렌더링)에서 구현
- `@simple-cms/editor`에 `extractFirstImageFromTiptap(contentJson)` 유틸 추가 — 기존 `extractTextFromTiptap()`과 동일 패턴
- Media CRUD 완성 전까지는 자동 추출만 동작, Media 관리 도입 후 대표 이미지 업로드 추가
- Post 모델에 `featuredImageId` FK가 이미 존재하므로 스키마 변경 불필요
