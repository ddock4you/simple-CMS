<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: Search uses form submit, not debounce
description: admin 검색 UX는 항상 Enter + [검색] 버튼 form submit 패턴. debounce 자동 검색 금지.
type: feedback
originSessionId: 72c5efb9-7eb8-45c6-bcb8-fd539445b01e
---
admin의 모든 검색 input은 debounce 자동 fetch 대신 **`<form>` + Enter 키 + 명시적 [검색] 버튼**의 form submit 패턴을 사용한다. Cmd+K Command Palette도 같은 정책을 따른다.

**Why:** 사용자가 명시적으로 결정 — admin은 조회할 데이터가 많아 debounce 자동 검색이 서버 성능에 부담을 줄 수 있음. 검색 시점은 사용자가 명확하게 통제해야 함.

**How to apply:**
- 새 검색 UI 도입 시 `<form>` + `<Input>` + `<Button type="submit">검색</Button>` 패턴으로 구현
- `useDebouncedValue`/setTimeout 기반 자동 trigger 도입 금지
- 빈 input 제출 시 URL `q` 파라미터 제거 (clean URL)
- 페이지 검색·CommandPalette·향후 추가될 모든 검색 입력에 동일하게 적용
