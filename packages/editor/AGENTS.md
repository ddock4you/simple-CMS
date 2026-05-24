<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
# packages/editor — Tiptap 공유 확장

admin/web 양쪽에서 동일한 Tiptap 콘텐츠 렌더링을 보장하기 위한 공유 확장 정의 패키지.
앱에서는 `@simple-cms/editor`로 import하여 사용한다.

## 역할

- 공유 Tiptap 확장 정의 (`getSharedExtensions()`) — admin 편집 / web 렌더링이 동일한 노드/마크 사용
- Tiptap JSON → plain text 추출 유틸 (`extractTextFromTiptap()`) — PGroonga 검색 인덱싱용
- slug 생성 유틸 (`generateSlug()`)
- `@tiptap/html`의 `generateHTML` re-export

## 구조

```
packages/editor/
├── src/
│   ├── index.ts              # 패키지 진입점
│   ├── extensions.ts         # 공유 확장 모음 (getSharedExtensions)
│   ├── imageWithMediaId.ts   # 기본 Image 확장 + mediaId attr (Stage 5a-2)
│   ├── uploadPlugin.ts       # paste/drop 자동 업로드 ProseMirror plugin (Stage 5a-2)
│   ├── extractText.ts        # Tiptap JSON → plain text
│   └── generateSlug.ts       # 한글 슬러그 생성
└── package.json
```

## 공유 확장 (`getSharedExtensions()`)

- StarterKit (heading 1-3 제한)
- Underline, TextStyle, Color, TextAlign, Highlight, Link
- **ImageWithMediaId** (기본 Image 대체) — `mediaId` attr 보존
- Table + TableRow/Header/Cell (resizable)
- Subscript, Superscript
- TaskList + TaskItem (nested)
- Placeholder

## ImageWithMediaId (Stage 5a-2)

- 기본 `@tiptap/extension-image`를 `.extend()`로 확장하여 `mediaId` attribute 추가
- 직렬화: `<img data-media-id="cuid...">` (mediaId 없으면 attr 생략)
- 파싱: HTML의 `data-media-id` → ProseMirror `attrs.mediaId`
- 활용: `findMediaReferences`가 contentJson을 재귀 탐색하여 사용처 보고
- resize 등 Image 옵션은 그대로 상속 — `ImageWithMediaId.configure({ resize: { ... } })`

## ImageUploadExtension (Stage 5a-2)

- ProseMirror Plugin 기반. paste/drop 이벤트 인터셉트
- `uploadImage` 콜백을 옵션으로 받음 (프레임워크 독립):
  ```ts
  ImageUploadExtension.configure({
    uploadImage: async (file: File) => ({ src, mediaId, alt }),
    onError: (err) => toast.error(err.message),
  })
  ```
- 콜백이 null이면 paste/drop을 가로채지 않음 → web의 generateHTML에서도 안전
- admin: TiptapEditor에서 `/api/media/upload` 호출하는 콜백 주입
- 업로드 위치: paste 시점 cursor 위치 / drop 시점 좌표 위치

## generateHTML 사용 (web 렌더링)

- web의 `apps/web/src/shared/lib/renderContent.ts`가 `generateHTML(json, getSharedExtensions())` 호출
- DOMPurify로 새니타이징 (defense-in-depth)
- ALLOWED_ATTR에 `data-media-id` 포함 — Media 라이브러리 참조 보존

## 텍스트 추출 (`extractTextFromTiptap`)

- 검색 인덱싱용 plain text 생성 (PGroonga `content` 필드)
- 모든 노드를 재귀 순회하여 텍스트 노드만 수집
- 적용 대상: Subpage, Post, HomePopup(콘텐츠형) 저장 시점

## 주의사항

- `@tiptap/*` 의존성은 admin과 web 양쪽에서 사용 가능 (peer 아님)
- 런타임 코드 + 타입 모두 export
- 변경 시 admin TiptapEditor + web renderContent 양쪽 동작 확인 필요
