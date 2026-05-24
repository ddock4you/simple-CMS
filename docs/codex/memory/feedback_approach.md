<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Approach Preference - Incremental
description: 한번에 많이 하기보다 최소 환경 먼저 구축 후 점진적으로 세부화하는 접근 선호
type: feedback
---

한번에 34개 파일을 만드는 큰 세션보다, 최소 환경 → 세부 설계 → 구현 순서로 점진적 접근을 선호.

**Why:** 설계서가 통합 문서(955줄)라 바로 구현하기보다 앱별로 세부화하는 단계가 필요함.

**How to apply:**
- 플랜을 세울 때 한 세션에 너무 많은 결과물을 넣지 말고, 의존성 순서대로 작은 단위로 나눌 것.
- 명령어/스킬은 인자 없이 컨텍스트에서 자동 파악하는 방식 선호. 사용자에게 불필요한 입력을 요구하지 말 것.
- 개발 단계가 유동적이므로 고정된 단계 번호에 의존하는 구조 피할 것.
