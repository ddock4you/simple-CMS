# 특별편 — KRDS Header GNB 클릭 토글 + 백드롭 학습정리

## 구현 요약

공개 웹 데스크톱 Header GNB를 KRDS 공식 동작에 맞게 수정했다. 하위 메뉴가 있는 1depth는 클릭으로 펼쳐지고, 펼쳐진 동안 `.gnb-backdrop.active`가 적용되어 헤더를 제외한 영역이 어둡게 표시된다.

관리자 메뉴 관리에는 링크 없는 `GROUP` 타입을 추가했다. HEADER 슬롯에서 하위 메뉴를 가진 1depth는 `GROUP`을 기본으로 만들고, 실제 이동 링크는 2depth 이하 메뉴에 배치한다.

## 프로젝트 코드 기준 설명

- `packages/db/prisma/schema.prisma`: `NavigationMenuItemType.GROUP` 추가.
- `apps/admin/src/features/navigation-management/ui/MenuItemDialog.tsx`: 루트 메뉴 추가 기본값을 `GROUP`으로 설정하고, 그룹 타입에서는 URL/새 탭 필드를 숨김.
- `apps/admin/app/api/navigation/[menuId]/items/*`: `GROUP` 저장 시 `subpageId`, `boardId`, `url`, `openInNewTab`을 서버에서 null/false로 정규화.
- `apps/web/src/widgets/layout/ui/HeaderChrome.tsx`: 하위 메뉴가 있는 1depth를 anchor가 아니라 button trigger로 렌더링하고, header sibling으로 `.gnb-backdrop` 렌더링.
- `apps/web/src/widgets/layout/ui/DesktopGnbBehavior.tsx`: click/Esc/외부 클릭/backdrop 클릭 상태 제어와 `aria-expanded`, `.is-open`, `.active` 동기화.
- `apps/web/src/entities/navigation/lib/filterMenuItems.ts`: 하위 메뉴가 없는 `GROUP`은 공개 메뉴에서 제외.

## 동작 원리 심화

`HeaderChrome`은 서버 컴포넌트로 메뉴 DOM을 렌더한다. 이 덕분에 초기 HTML에 헤더가 바로 포함되어 CLS와 깜빡임을 줄일 수 있다. 반면 GNB 열림/닫힘은 브라우저 이벤트가 필요하므로 `DesktopGnbBehavior`라는 작은 Client Island가 담당한다.

열림 상태는 하나의 React state로 다시 렌더링하지 않고 DOM class/attribute로 동기화한다. 서버 렌더링된 KRDS DOM을 유지하면서 필요한 상호작용만 붙이는 방식이다.

Backdrop은 커스텀 div가 아니라 KRDS CSS가 이미 정의한 `.gnb-backdrop`을 쓴다. KRDS CSS는 header의 z-index를 backdrop보다 높게 두므로, backdrop이 화면 전체를 덮어도 header는 그대로 밝게 보인다.

## 트러블슈팅 로그

| 문제 | 원인 | 해결 |
| --- | --- | --- |
| dim이 보이지 않음 | 커스텀 `data-open` selector와 실제 attribute 값이 불일치 | KRDS `.gnb-backdrop.active` 토글로 변경 |
| 하위 메뉴가 아래로 밀림 | JS가 header bottom을 계산해 `.gnb-toggle-wrap` top에 직접 주입 | KRDS 기본 `top: 100%` 유지 |
| 하위 메뉴 폭이 inner에 묶임 | `.gnb-toggle-wrap` width가 상위 레이아웃 기준 | `left: 50%`, `width: 100vw`, `translateX(-50%)`로 viewport 폭 보정 |
| 1depth 링크와 토글 충돌 | 같은 클릭이 이동과 펼침을 동시에 수행할 수 없음 | 관리자 `GROUP` 타입 추가 |

## 레거시 경험 연결

예전 jQuery 기반 GNB에서는 DOM을 직접 열고 닫는 방식이 흔했다. 이 구현도 DOM class를 직접 토글한다는 점은 비슷하다. 차이는 Next.js/React 환경에서 데이터 렌더링은 서버 컴포넌트에 남기고, 브라우저 이벤트만 client island로 분리했다는 점이다.

또한 단순히 `display: block`을 직접 쓰지 않고 KRDS가 정의한 `.is-open`, `.active`, `.gnb-backdrop` 상태를 맞춘다. 디자인 시스템을 쓰는 프로젝트에서는 “보이는 결과”보다 “디자인 시스템이 기대하는 상태 계약”을 맞추는 것이 유지보수에 유리하다.

## 면접 예상 질문 & 답변

**Q. 왜 1depth를 링크가 아니라 button으로 렌더링했나요?**

A. 하위 메뉴가 있는 1depth는 클릭 시 펼침 동작이 우선이기 때문입니다. anchor로 두면 클릭 이동과 메뉴 토글이 충돌합니다. 이동은 2depth 이하 링크에서 처리하고, 1depth는 `GROUP` 타입으로 분리했습니다.

**Q. 왜 backdrop을 직접 만들지 않고 KRDS `.gnb-backdrop`을 썼나요?**

A. KRDS CSS가 header와 backdrop의 z-index, 색상 토큰, high contrast 모드까지 이미 정의합니다. 공식 클래스를 쓰면 디자인 시스템 업데이트와 접근성 모드 대응에 더 안전합니다.

**Q. Server Component와 Client Component 경계는 어떻게 잡았나요?**

A. 메뉴 데이터 조회와 DOM 렌더링은 서버 컴포넌트가 맡고, 클릭/Esc/backdrop 이벤트와 ARIA 상태 동기화만 client island가 맡습니다. 이렇게 하면 초기 렌더 안정성과 클라이언트 JS 최소화를 동시에 얻습니다.

**Q. 하위 메뉴 위치가 밀린 문제는 왜 생겼나요?**

A. 커스텀 fixed layer로 바꾸면서 JS가 header bottom을 계산해 panel top에 직접 주입했기 때문입니다. KRDS 기본 구조에서는 `.gnb-toggle-wrap`이 nav 아래 `top: 100%`로 붙어야 해서, top 계산을 제거했습니다.

## 한 줄 요약 카드

KRDS Header GNB는 “하위 메뉴가 있는 1depth는 `GROUP` button trigger, 펼침 상태는 `.gnb-toggle-wrap.is-open`, dim은 `.gnb-backdrop.active`”로 맞춰야 한다.
