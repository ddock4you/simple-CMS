# 특별편 — KRDS Header GNB 클릭 토글 + 백드롭 사전학습

## 핵심 개념

KRDS Header의 PC GNB는 1depth 메뉴에 2depth 이하 하위 메뉴가 있을 때 hover가 아니라 클릭으로 하위 메뉴를 펼치는 구조다. 열린 동안에는 `gnb-backdrop`이 활성화되어 헤더를 제외한 나머지 화면을 어둡게 처리한다.

이 프로젝트는 KRDS React 컴포넌트를 그대로 쓰지 않고 `HeaderChrome`이 KRDS DOM 클래스와 의미 구조를 직접 렌더한다. 따라서 KRDS가 기대하는 클래스와 상태를 직접 맞춰야 한다.

## 주요 용어

- GNB(Global Navigation Bar): 사이트 전역 주요 메뉴 영역.
- 1depth/2depth/3depth: 메뉴 트리의 깊이. PC Header에서는 1depth가 상단 메뉴, 2depth 이하가 펼쳐지는 하위 메뉴다.
- Backdrop: 펼침 메뉴 뒤에 깔리는 dim 영역. KRDS Header에서는 `.gnb-backdrop` 클래스가 담당한다.
- ARIA expanded: `aria-expanded` 속성으로 메뉴가 열린 상태인지 보조기술에 알려준다.
- Server Component + Client Island: 메뉴 HTML은 서버에서 렌더하고, 클릭/키보드 상태 제어만 작은 Client Component가 맡는 패턴.

## KRDS Header 동작 원리

- 하위 메뉴가 있는 1depth trigger는 링크 이동보다 메뉴 열기 동작이 우선이다.
- 열린 1depth는 `aria-expanded="true"`를 갖고, 닫히면 `false`로 돌아간다.
- 하위 메뉴 wrapper는 `.gnb-toggle-wrap.is-open` 상태에서 표시된다.
- dim 처리는 커스텀 레이어가 아니라 `.gnb-backdrop.active`를 사용한다.
- KRDS CSS는 `#krds-header`의 z-index가 backdrop보다 높다는 전제에서 헤더는 밝게 두고 본문만 어둡게 만든다.

## 레거시 ↔ KRDS 기준 대조

| 구분 | 기존 구현 | KRDS 기준 구현 |
| --- | --- | --- |
| 열림 방식 | hover/focus 진입 | click/Enter 토글 |
| 닫힘 방식 | nav pointerleave/focusout | 재클릭, 외부 클릭, Esc, backdrop 클릭 |
| dim 영역 | 별도 커스텀 fixed layer | `.gnb-backdrop.active` |
| 1depth 링크 | 하위 메뉴가 있어도 href 유지 | 하위 메뉴가 있으면 trigger 전용 |
| 관리자 입력 | 모든 항목이 링크 대상 보유 | 1depth 그룹은 `GROUP` 타입 |

## 구현 시 주의할 점

- 하위 메뉴 위치는 KRDS 기본 `.gnb-toggle-wrap { top: 100% }`를 유지한다. JS로 header bottom을 계산해 `top`을 넣으면 메뉴가 아래로 밀릴 수 있다.
- 하위 메뉴 폭만 viewport 기준으로 보정한다. `left: 50%`, `width: 100vw`, `translateX(-50%)` 조합이면 상위 `.inner` 폭에 묶이지 않는다.
- Backdrop은 header 내부가 아니라 header sibling으로 둔다. header 내부에 넣으면 stacking context와 클릭 영역이 꼬일 수 있다.
- Client Component는 상태만 DOM attribute/class로 동기화하고, 메뉴 데이터 fetch나 렌더링 책임을 가져오지 않는다.
- 하위 메뉴가 있는 1depth는 관리자에서 `GROUP` 타입을 기본으로 만든다. 1depth 클릭을 토글로 쓰는 순간 같은 클릭으로 페이지 이동까지 처리할 수 없기 때문이다.

## 설명 가능 체크리스트

- 왜 hover 대신 click 토글로 바꿨는가?
- 왜 `.gnb-backdrop`을 재사용해야 하는가?
- 왜 1depth에 링크 없는 `GROUP` 타입이 필요한가?
- 왜 하위 메뉴 위치를 JS로 계산하면 안 되는가?
- Server Component와 Client Island 경계를 어디에 두었는가?
