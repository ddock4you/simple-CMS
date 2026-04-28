# Stage 11a — 타입 안전성 강화

## 요약

`BlockEditDialog`, `TiptapEditor` 등 핵심 파일의 `as` 단언과 `Record<string, unknown>` 사용을 전수 점검했다.
위험한 런타임 단언은 발견되지 않았으며, `preprocessTiptapForAdmin` 반환 타입 구체화로 호출부 cast 2건을 제거했다.

typecheck ✅ (admin + web)

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `apps/admin/src/shared/lib/tiptapContentTransform.ts` | `preprocessTiptapForAdmin` 반환 타입 `unknown` → `Record<string, unknown> \| undefined`. 비-객체 입력 시 `undefined` 반환으로 명시화 |
| `apps/admin/src/entities/editor/ui/TiptapEditor.tsx` | `preprocessTiptapForAdmin(content) as Record<string, unknown>` cast 제거 |
| `apps/admin/src/shared/lib/renderContent.ts` | `transformed as Record<string, unknown>` cast 제거, `!transformed` null guard로 대체 |

---

## 점검 결과

### BlockEditDialog (`features/block-management/ui/BlockEditDialog.tsx`)

| 단언 | 위험도 | 판단 |
|------|--------|------|
| `block.configJson as BlockConfig` | 낮음 | Prisma JSON 컬럼 → 앱 타입. DB 저장 시 Zod 검증 완료 |
| `config as IframeBlockConfigData` (handleSubmit) | 낮음 | `activeType === 'IFRAME'` 가드 뒤 discriminated union 좁히기 |
| `parsed.data as IframeBlockConfigData` | 낮음 | Zod safeParse 후 `activeType === 'IFRAME'` 가드 뒤 좁히기 |
| `config as RichTextBlockConfigData` 등 JSX | 낮음 | `activeType === 'RICH_TEXT'` 등 가드 뒤 좁히기 |

→ 모두 **안전** — TypeScript가 discriminated union을 자동 좁히지 못하는 한계지만 가드가 보장

### TiptapEditor (`entities/editor/ui/TiptapEditor.tsx`)

| 단언 | 위험도 | 판단 |
|------|--------|------|
| `preprocessTiptapForAdmin(content) as Record<string, unknown>` | 낮음 | **제거됨** — 반환 타입 구체화로 해소 |
| `.setImage({ ... } as Record<string, unknown> & { src: string })` (3곳) | 낮음 | Tiptap 확장 타입 한계 (`mediaId` attr이 기본 타입에 없음). 라이브러리 경계 단언 |
| `res.json() as ApiResponse<UploadMediaResponse>` | 낮음 | API 응답 경계 단언. fetch + JSON parse는 항상 unknown |
| `e.target as HTMLElement` | 낮음 | 표준 DOM 이벤트 핸들러 패턴 |

### API Route `where: Record<string, unknown>` 패턴

Prisma의 `findMany/count({ where })` 인자에 `Record<string, unknown>`을 사용하는 패턴이 12곳에 있다.
Zod로 파싱된 필터 값만 해당 프로퍼티에 추가하므로 런타임 안전성은 확보되어 있다.
TypeScript strict 모드에서 typecheck 통과 확인.

→ `Prisma.*WhereInput` 타입으로 교체 시 partial 객체 빌드 방식 변경 필요 — 위험 대비 이점이 낮아 이번 단계에서 제외

---

## 타입 개선 상세

### `preprocessTiptapForAdmin` 반환 타입 구체화

**이전**:
```ts
export function preprocessTiptapForAdmin(json: unknown): unknown
```

**이후**:
```ts
export function preprocessTiptapForAdmin(json: unknown): Record<string, unknown> | undefined
```

- 비-객체 입력(null, undefined, 원시값) → `undefined` 반환 (이전: 원본 그대로 반환)
- 객체 입력 → `Record<string, unknown>` 반환 (내부 cast 1곳 남음 — transformImageSrc 반환값)
- 호출부(`TiptapEditor.tsx`, `renderContent.ts`) cast 2건 제거

### renderContent.ts null guard 추가

```ts
// 이전
return generateHTML(transformed as Record<string, unknown>, ...);

// 이후
if (!transformed) return null;
return generateHTML(transformed, ...);
```

`renderTiptapContentForAdmin`은 이미 `if (!json || typeof json !== 'object') return null` 가드가 있어
`transformed`가 `undefined`일 경우는 실제로 발생하지 않는다.
단, 타입 시스템에서도 명시적으로 처리하는 것이 더 정확하다.

---

## 다음 단계

Stage 11e → 11d 순서로 진행.
