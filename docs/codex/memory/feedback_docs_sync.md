<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Stage 완료 시 문서 정합성 확인
description: 각 Stage 커밋 전에 AGENTS.md 정합성 확인 + Stage 7c부터 결과 요약은 docs/stages/에 작성
type: feedback
originSessionId: 26de4a0e-10ad-4d02-a96c-631a7f3a31dc
---
Stage 개발 완료 후 커밋 전에 AGENTS.md 문서 정합성을 반드시 확인한다.

**Why:** Stage 2c 완료 후 감사에서 middleware 참조 3곳, 미구현 함수 참조 3곳이 발견됨. 문서가 설계 의도(미래 계획)를 현재 구현처럼 기술하여 혼란 초래.

**How to apply:**
- 각 Stage 커밋 전에 루트 AGENTS.md, apps/*/AGENTS.md, packages/*/AGENTS.md 확인
- 해당 Stage에서 변경된 패턴(예: middleware→layout), 새 파일 경로, 삭제된 파일이 문서에 반영되었는지 검증
- 미구현 함수/파일이 존재하는 것처럼 기술되어 있으면 "(Stage Xf에서 구현)" 같은 표시 추가
- 스킬(docs/codex/commands/)도 새로운 패턴과 충돌하지 않는지 확인

**Stage 결과 요약 작성 위치 (Stage 7c부터 확정):**

- 각 Stage의 상세 결과 요약은 루트 AGENTS.md 본문이 아닌 `docs/stages/stage-{id}.md` 개별 파일로 작성한다. 예: Stage 7n 완료 시 `docs/stages/stage-7n.md` 신규 작성.
- 루트 AGENTS.md는 `Stage 6–8 테이블`의 해당 행만 갱신 — 1~2문장 요약 + ` [[상세]](docs/stages/stage-{id}.md)` 링크. 본문에 `#### Stage {id} 결과 요약` 블록을 추가하지 않는다.
- **Why:** 루트 AGENTS.md는 매 세션 auto-load되므로 Stage가 누적될수록 context 토큰이 선형 증가. 역사적 의사결정 기록은 on-demand Read로 충분. 2026-04-24에 Stage 7c~7m 12개 블록(261줄, 전체의 29%)을 `docs/stages/`로 분리하면서 확정.
- 영구 운영 규칙(정책/패턴) 자체가 새로 생기면 "운영 정책" 섹션에 간결히 반영 가능. 결과 요약(구현 경험·일시적 의사결정)은 항상 `docs/stages/`에.
