<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: DB Migration Policy (db:push only)
description: 이 프로젝트는 migrations 디렉토리 없이 `pnpm db:push`로만 스키마를 반영한다. `migrate dev`는 실행하지 말 것
type: project
originSessionId: e63891e1-8caa-4988-af79-12db7e4ea709
---
이 프로젝트(simple-cms)는 **`pnpm db:push`(prisma db push)** 로만 스키마를 반영한다. `packages/db/prisma/migrations/` 디렉토리는 **존재하지 않으며**, 지금까지 마이그레이션 이력을 관리한 적이 없다.

**Why:** 개발 초기부터 빠른 iterate 목적으로 db push 방식을 채택. 프로덕션 배포 이력(migrate resolve 기반 baseline) 도입은 Stage 8(Docker + CI/CD) 시점으로 미뤄둠. 2026-04-16 Stage 7a 진행 중 `pnpm db:migrate --name add_preview_token` 실행 시 "We need to reset the public schema" 경고가 떴는데, 이는 migrations 폴더 공백 + `_prisma_migrations` 테이블 공백으로 Prisma가 drift로 판단한 결과. reset은 데이터 전부 손실.

**How to apply:**
- 스키마 변경 시 **`pnpm db:push`** 사용 (또는 `pnpm --filter @simple-cms/db push`)
- `pnpm db:migrate` 또는 `prisma migrate dev`는 **사용하지 말 것** — 실행 시 reset 프롬프트가 떠서 데이터 손실 위험
- Stage 8 단계에서 migrations 이력 도입을 정식 과제로 처리 (baseline 생성 + `migrate resolve`로 applied 마킹)
- AGENTS.md의 "명령어" 섹션에 `pnpm db:migrate`가 있지만 실제 사용은 권장하지 않음 — 현 시점에는 `pnpm db:push`만 안전
