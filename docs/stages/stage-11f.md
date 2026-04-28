# Stage 11f — `/check-fsd` CI 통합

## 요약

`scripts/check-fsd.mjs` Node.js 스크립트를 완성하고 GitHub Actions CI에 독립 job으로 추가했다.
PR마다 FSD 의존성 규칙 위반을 자동 감지하여 main 브랜치 진입을 차단한다.

lint ✅ typecheck ✅ check-fsd ✅ (admin 0건 / web 0건)

---

## 변경 파일 목록

| 파일 | 내용 |
|------|------|
| `scripts/check-fsd.mjs` | FSD 정적 분석 스크립트. `@fsd-allow` 주석 블록 메커니즘 추가 |
| `.github/workflows/ci.yml` | `check-fsd` job 추가 (pnpm install 불필요 — Node 내장 모듈만 사용) |
| `apps/admin/src/entities/editor/ui/TiptapEditor.tsx` | `// @fsd-allow` 주석 추가 (entities/auth, entities/media cross-slice) |
| `apps/admin/src/entities/media/ui/ImageUrlInput.tsx` | `// @fsd-allow` 주석 추가 (entities/auth cross-slice) |
| `apps/admin/src/entities/media/ui/MediaPicker.tsx` | `// @fsd-allow` 주석 추가 (entities/auth cross-slice) |
| `apps/admin/src/features/subpage-management/ui/SubpageView.tsx` | `// @fsd-allow` 주석 추가 (block-management, subpage-version cross-feature) |
| `apps/admin/src/features/subpage-version/ui/VersionDetailDialog.tsx` | `// @fsd-allow` 주석 추가 (block-management, subpage-management cross-feature) |

---

## 스크립트 검사 규칙

| 규칙 | 내용 |
|------|------|
| 역방향 레이어 import | 하위 레이어(shared)가 상위 레이어(features)를 import하면 위반 |
| 슬라이스 간 직접 import | 같은 레이어 내 다른 슬라이스를 직접 import하면 위반 (features/entities/widgets 대상) |
| barrel export 금지 | `src/` 내 `index.ts`에 re-export 구문이 있으면 위반 |

## `@fsd-allow` 메커니즘

```ts
// @fsd-allow: 사유 — import 블록 단위로 허용
import { Something } from '@/features/other-feature/ui/Something';
import { Another } from '@/features/other-feature/ui/Another';
```

- `// @fsd-allow`를 포함하는 독립 주석 줄 다음에 오는 연속 `import` 문은 모두 허용된다.
- 허용 블록은 비어 있지 않은 비-import 비-주석 줄(코드 시작)에서 종료된다.
- 인라인(`import ... // @fsd-allow`)도 지원한다.
- 허용된 import는 결과 카운트에서 제외되어 CI를 차단하지 않는다.

## CI 구성

```yaml
check-fsd:
  name: FSD 아키텍처 검사
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
    - name: FSD 아키텍처 검사
      run: node scripts/check-fsd.mjs
```

pnpm install 단계가 없어 다른 job보다 훨씬 빠르게 실행된다 (Node 내장 `fs`/`path`만 사용).

## 기존 위반 처리 (16건 → 0건)

스크립트 실행 시 발견된 16건은 모두 개발 과정에서 누적된 기술 부채다.
`@fsd-allow` 주석으로 문서화하여 CI를 통과시키되, 이유를 코드에 명시했다.

| 파일 | 위반 유형 | 허용 이유 |
|------|-----------|-----------|
| `entities/editor` → `entities/auth` | cross-entity | `PermissionProvider`가 auth에 있지만 cross-cutting 성격 — 추후 `shared/ui`로 이전 |
| `entities/media` → `entities/auth` | cross-entity | 동일 |
| `features/subpage-management` → `features/block-management` | cross-feature | `SubpageView`가 여러 feature를 조립하는 pages급 컴포넌트 — 추후 `pages/` 레이어로 이전 |
| `features/subpage-management` → `features/subpage-version` | cross-feature | 동일 |
| `features/subpage-version` → `features/block-management` | cross-feature | `VersionDetailDialog`가 버전 diff 표시를 위해 블록 콘텐츠 참조 — `BlockContentView` 추후 `shared/ui`로 이전 |
| `features/subpage-version` → `features/subpage-management` | cross-feature | 동일 |

## 다음 단계

Stage 11b → 11a → 11e → 11d 순서로 진행 후 Stage 8 (Docker + CI/CD).
