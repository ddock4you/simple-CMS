<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: 커밋 시 Co-Authored-By 제거
description: git 커밋 메시지에 Co-Authored-By Codex 표시를 포함하지 않음
type: feedback
originSessionId: 26de4a0e-10ad-4d02-a96c-631a7f3a31dc
---
커밋 메시지에 `Co-Authored-By: Codex ...` 줄을 포함하지 않는다.

**Why:** 사용자가 커밋 히스토리에 AI 도구 사용 흔적을 남기지 않길 원함. 기존 커밋들에서 일괄 제거 작업을 수행함.

**How to apply:** git commit 시 HEREDOC 메시지에 Co-Authored-By 줄을 추가하지 않는다. 커밋 메시지는 제목 + 본문만 포함.
