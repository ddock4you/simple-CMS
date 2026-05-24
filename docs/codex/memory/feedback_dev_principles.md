<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Development Principles
description: 기능 추가/코드 작성 시 항상 적용할 우선순위 원칙
type: feedback
---

코드 작성 요청 시 항상 다음 우선순위로 접근할 것:
1. **운영 기준 + 책임 분리 우선**: 코드 경계를 명확히 나누고, 장애 추적/모니터링이 용이한 구조 선택
2. **코드 재사용성 + 단일 소스 원칙**: 동일 로직 중복 피하고, 하나의 정의가 하나의 진실 담당

**Why:** 사용자가 Server Actions vs API Route 비교 후, 보일러플레이트가 더 많더라도 경계 구분이 확실한 API Route를 선택함. 개발 편의보다 운영 안정성을 중시하는 가치관.
**How to apply:** 기능 구현 시 "운영에서 이 코드의 경계가 명확한가?" "장애 시 추적 가능한가?"를 먼저 판단. 그 다음 재사용성과 중복 제거 검토.
