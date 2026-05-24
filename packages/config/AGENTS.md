<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
# packages/config — 공유 설정

ESLint, TypeScript 등 개발 도구의 공유 설정을 관리하는 패키지.
각 앱/패키지가 이 프리셋을 import하여 확장한다.

## 역할

- ESLint 9 flat config 공유 프리셋
- TypeScript config (tsconfig) 공유 베이스
- 필요 시 추가 도구 설정 공유

## 구조

```
packages/config/
├── eslint/
│   ├── base.js             # 공통 ESLint 규칙
│   ├── next.js             # Next.js 앱용 확장
│   └── react.js            # React 관련 규칙
├── tsconfig/
│   ├── base.json           # 공통 tsconfig
│   └── next.json           # Next.js 앱용 확장
└── package.json
```

## ESLint 컨벤션

- ESLint 9 flat config 사용 (`eslint.config.js`)
- 각 앱은 이 패키지의 프리셋을 import하여 확장
- `consistent-type-imports` 규칙 포함
- Prettier와 충돌 방지 (eslint-config-prettier)

## TypeScript 컨벤션

- `strict` 모드 필수
- 경로 별칭: `@/*` → `./src/*`
- 각 앱/패키지의 tsconfig는 이 패키지의 base를 `extends`

## 주의사항

- **이 패키지를 수정하면 모든 앱/패키지에 영향** — 변경 전 전체 `pnpm lint` + `pnpm typecheck` 통과 확인
- 앱 고유 규칙은 해당 앱의 설정 파일에서 override
- 새 규칙 추가 시 기존 코드와의 호환성 검토
