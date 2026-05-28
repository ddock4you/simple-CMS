<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Session Handoff via Plan Docs
description: 대규모 Stage 단위 개발은 새 세션에서 재개하고, 인계용 개발 계획서를 docs/에 남기는 패턴을 선호
type: feedback
originSessionId: 9edca5ae-f6c4-406d-b65d-713c8fa30afb
---
Stage 규모의 큰 개발 작업은 한 세션에서 끝내지 않고, 설계·계획이 완료된 시점에 `docs/react-cms-stage{N}-*-개발계획서.md` 형태의 인계 문서를 남긴 뒤 새 세션에서 구현한다. 사용자가 "개발 계획서를 작성해줘"라고 하면 docs에 인계 문서만 생성하고 그 세션에서는 구현을 시작하지 않는다.

**Why**: 긴 컨텍스트는 정확도를 떨어뜨리고, 새 세션에서 깔끔한 상태로 시작하는 편이 품질에 유리하다는 사용자 판단. 실제로 "Stage 5b 진행 및 Stage 6 진행여부 논의" 세션에서 Stage 5b 구현·커밋·학습 문서까지 마친 뒤 Stage 6은 계획만 세우고 새 세션으로 넘기는 흐름을 요청함.

**How to apply**:
- 사용자가 "Stage N 개발 진행해줘"라고 하면 `docs/react-cms-stage{N}-*-개발계획서.md` 존재 여부 먼저 확인. 있으면 그 문서를 읽고 TaskCreate로 단계 등록 후 진행
- 사용자가 "개발 계획서를 작성해줘"라고 하면 구현 없이 docs/에 인계 문서만 생성하고 세션 종료. Plan mode가 활성이면 ExitPlanMode로 종료한 뒤 docs만 Write(구현 금지)
- 계획서는 반드시 "이 문서의 사용법" 섹션을 두어 다음 세션 Codex가 자기 완결적으로 읽고 시작할 수 있게 구성 (모든 결정 이력·재사용 자산 경로·구현 순서 포함)
- Plan 파일(`local plan files`)은 세션별 임시 위치이므로 장기 인계용으로 의존하지 말 것. 공식 인계 위치는 항상 `docs/`
