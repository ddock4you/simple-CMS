<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: CMS Project Setup Decisions
description: Simple CMS 프로젝트 초기 설정 결정사항 - 모노레포, AGENTS.md 전략, 21단계 세분화 로드맵
type: project
---

모노레포 기반 CMS 프로젝트. admin(관리자)과 web(공개) 두 Next.js 앱으로 분리.

**Why:** 레거시→모던 전환을 보여주는 포트폴리오 프로젝트. 실무 구조 경험 + 면접 준비 목적.

**How to apply:**
- PRD는 별도 파일 없이 AGENTS.md에 통합
- AGENTS.md는 루트 + apps/admin + apps/web (3개, 계층적)
- 스킬은 개발 진행 중 패턴이 보이면 추가
- 21단계 세분화 로드맵 (2026-04-06 변경): 수직 슬라이싱 — 매 단계마다 백엔드+UI 함께 개발
  - Stage 1(환경) → 2a~2e(인증/사용자) → 3a~3f(admin CMS) → 4a~4e(공개 웹) → 5a~5b(메인) → 6~8(확장/인프라)
  - **변경 정책**: 기능 보강/추가/삭제가 언제든 가능. 단계 번호는 논리적 그룹이며 고정 순서 아님
- 설계 문서 8개는 docs/에 유지, 코딩에 필요한 핵심만 AGENTS.md에 추출
