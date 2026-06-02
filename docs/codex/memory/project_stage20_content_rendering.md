<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->

---

name: Stage 20 — 게시글 중요 표시와 Tiptap 렌더링 경계
description: isImportant 정렬, 공개 목록 번호, TiptapContent Tailwind boundary, KRDS reset 충돌 회피 결정
type: project

---

# Stage 20 결정 사항

- Post에 `isImportant Boolean @default(false)` 추가.
- 중요 정렬:
  - admin 목록: `isImportant DESC`, `updatedAt DESC`
  - public board/home latest: `isImportant DESC`, `publishedAt DESC`
  - search는 점수 기반 정렬 유지
- 공개 LIST 스킨은 번호 열을 표시한다. 중요글은 번호 대신 `중요`, 일반글 번호는 `isImportant=false` 공개글 총 개수 기준 역순.
- 신규 Post 작성 UX:
  - slug 입력 필드는 제거됨
  - 생성 시 서버가 opaque random slug를 자동 발급
  - 편집 저장 시 기존 slug 유지
  - `seoTitle`은 제목, `seoDescription`은 본문 plain text 160자 요약으로 자동 입력
  - 기존 데이터 backfill 없음
- 공개 Tiptap 렌더링:
  - `TiptapContent`가 게시글, 서브페이지 RICH_TEXT, 콘텐츠형 HomePopup의 단일 rich text wrapper
  - `.tiptap-content` 전역 CSS 블록 제거
  - Tailwind Typography + descendant utility로 본문 경계 형성
  - KRDS 전역 root `62.5%` 영향 회피: `text-[16px]!`
  - KRDS `ul,ol{list-style:none}` reset 회피: `prose-ul:list-disc!`, `prose-ol:list-decimal!`
  - 정렬 이미지: `[&_[style*="text-align:_center"]_img]:inline-block!` 계열 arbitrary variant
- 이 패턴은 CMS HTML 자식에 class를 붙일 수 없는 구조 때문에 wrapper class가 길어지는 트레이드오프가 있다. 새 rich text 렌더러를 만들지 말고 `TiptapContent`를 재사용한다.

상세: `docs/stages/stage-20.md`
