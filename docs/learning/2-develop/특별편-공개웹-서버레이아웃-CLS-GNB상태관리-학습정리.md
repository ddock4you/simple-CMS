# 학습정리: 공개 웹 서버 레이아웃 — CLS 방어 · KRDS DOM 차용 · 최소 클라이언트 island · GNB 상태 유지

## 구현 요약

공개 웹 페이지 전환 시 헤더 메뉴와 푸터가 늦게 나타나 CLS에 부정적일 수 있는 문제를 해결했다. `PageLayout`에서 KRDS React Header/Footer에 공통 레이아웃 전체를 위임하던 구조를 바꿔, `HeaderChrome`과 `FooterChrome` 서버 컴포넌트가 헤더/푸터 HTML을 직접 렌더하도록 했다. 모바일 전체메뉴는 `MobileMenuIsland`, 데스크톱 GNB hover 안정화는 `DesktopGnbBehavior`로 분리해 필요한 상호작용만 클라이언트 island로 남겼다. 이어서 3depth GNB가 잘리는 문제를 absolute panel 대신 정적 grid/flex 레이아웃으로 해결했고, GNB 항목 사이 gap에서 메뉴가 닫혔다 다시 열리는 문제는 nav 영역 기준 `data-active` 상태 유지로 해결했다. 헤더 관련 전역 CSS는 Tailwind utility로 컴포넌트에 옮겨 `globals.css` 부담을 줄였다.

---

## 핵심 학습 포인트

### 1. 공통 레이아웃은 Server Component가 기본값이어야 한다

#### 개념

헤더/푸터는 모든 페이지에서 반복되는 레이아웃 요소다. 공통 레이아웃이 client hydration 이후에 나타나면 첫 paint 이후 요소가 추가되어 레이아웃 이동과 시각적 깜빡임을 만든다.

#### 프로젝트 코드에서의 적용

- `apps/web/src/widgets/layout/ui/PageLayout.tsx`
- `apps/web/src/widgets/layout/ui/HeaderChrome.tsx`
- `apps/web/src/widgets/layout/ui/FooterChrome.tsx`

`PageLayout`은 서버 컴포넌트 상태를 유지하고, `HeaderChrome`/`FooterChrome`을 직접 렌더한다. 이로써 서버 HTML에 skip link, masthead, header, desktop GNB, footer가 포함된다. 실제 `curl -s http://localhost:3000`으로 SSR HTML에 `krds-main-menu`, 메뉴 label, `krds-footer`가 포함되는 것을 확인했다.

#### 설계 판단

대안은 KRDS React Header/Footer를 유지하고 placeholder 높이를 더 세밀하게 잡는 것이었다. 하지만 메뉴 내용 자체가 hydration 이후에 나타나는 구조라면 사용자는 여전히 늦게 뜬다고 느낀다. 공통 레이아웃은 서버에서 먼저 렌더하고, open/close 같은 상호작용만 client island로 두는 방향이 더 근본적이다.

---

### 2. KRDS DOM class를 직접 렌더하되, 일반 스타일은 Tailwind로 옮긴다

#### 개념

KRDS React 컴포넌트가 항상 프로젝트 요구에 맞는 DOM을 만들지는 않는다. 이럴 때는 KRDS CSS가 기대하는 class와 구조를 직접 렌더하고, 일반 spacing/크기/반응형 스타일은 Tailwind utility로 컴포넌트에 붙인다.

#### 프로젝트 코드에서의 적용

`HeaderBranding`은 서버 컴포넌트다:

```tsx
<div className="header-branding ...">
  <h2 className="logo ...">
    <Link href="/" ...>
      {branding.logoUrl ? <img ... /> : <span>{branding.siteName}</span>}
    </Link>
  </h2>
  <div className="web-header-desktop-menu-slot ..." />
  <div className="header-actions ...">
    <Link className="btn-navi sch navi-row" href="/search">통합검색</Link>
    <MobileMenuIsland ... />
  </div>
</div>
```

KRDS 동작에 필요한 `header-branding`, `logo`, `btn-navi`, `sch`, `navi-row`는 유지했다. 반면 min-height, logo width/height, desktop slot height 같은 값은 Tailwind arbitrary value로 옮겼다:

```tsx
className="header-branding !flex !min-h-[var(--krds-size-height-6)] ... large:!min-h-[var(--krds-size-height-7)]"
```

#### 설계 판단

`globals.css`에 `.header-logo-image`, `.header-logo-text`, `.web-gnb-*` 같은 프로젝트 전용 class를 계속 추가하면 전역 CSS가 헤더 내부 구현 세부사항을 떠안는다. 이번 작업에서는 Tailwind class를 컴포넌트에 붙여 스타일 책임을 해당 컴포넌트 근처에 두었다. `globals.css`는 페이지 레이아웃 보조처럼 여러 컴포넌트가 공유하는 규칙 중심으로 남기는 것이 맞다.

---

### 3. 3depth GNB 잘림은 absolute positioning이 부모 높이에 참여하지 않아서 생겼다

#### 문제

3depth 메뉴가 있는 경우 하위 메뉴가 잘려 보였다. 원인은 KRDS 기본 `.gnb-sub-list`가 absolute panel로 동작하면서 부모 dropdown 높이 계산에 참여하지 않는 점이었다. 2depth column 높이만으로 dropdown 배경이 잡히고, 3depth panel이 그 밖으로 튀었다.

#### 프로젝트 코드에서의 적용

`HeaderChrome.tsx`에서 데스크톱 3depth는 `.gnb-sub-list`를 쓰지 않고 `web-gnb-depth3-panel`을 렌더한다:

```tsx
<li className={depth3SubgroupClassName}>
  <a className="gnb-sub-trigger ...">{item.label}</a>
  <div className={depth3PanelClassName}>
    <div className={depth3ContentClassName}>
      <h2 className={depth3TitleClassName}>{item.label}</h2>
      <ul className={depth3ListClassName}>...</ul>
    </div>
  </div>
</li>
```

부모 `ul`은 2열 grid다:

```tsx
className="large:grid large:grid-cols-[var(--krds-main-menu--main-menu-width)_minmax(0,1fr)] large:items-stretch"
```

이제 3depth panel이 정적 grid/flex 흐름에 들어가므로 dropdown 높이가 실제 콘텐츠를 포함한다.

#### 검증

Playwright + 시스템 Chrome으로 주요시설 GNB를 hover한 뒤 bounding box를 비교했다:

```json
{
  "main": { "height": 182 },
  "panel": { "height": 150 },
  "panelInsideMain": true
}
```

3depth panel 하단이 `gnb-main-list` 내부에 포함됨을 확인했다.

---

### 4. GNB gap 깜빡임은 nav 영역 기준 상태로 해결한다

#### 문제

기존 CSS hover는 `.web-gnb-dropdown:hover > .gnb-toggle-wrap` 기준이었다. 커서가 GNB 버튼 사이 gap을 지나면 특정 dropdown의 hover가 끊겨 하위 메뉴가 닫히고, 다음 항목에 닿으면 다시 열렸다.

#### 프로젝트 코드에서의 적용

`DesktopGnbBehavior.tsx`:

```tsx
const setActiveDropdown = (dropdown: HTMLElement | null) => {
  activeDropdown?.removeAttribute('data-active');
  activeDropdown?.querySelector('.gnb-main-trigger')?.setAttribute('aria-expanded', 'false');

  activeDropdown = dropdown;

  activeDropdown?.setAttribute('data-active', 'true');
  activeDropdown?.querySelector('.gnb-main-trigger')?.setAttribute('aria-expanded', 'true');
};
```

이벤트 정책:

- 각 dropdown `pointerenter` → active 교체
- 각 dropdown `focusin` → active 교체
- nav `pointerleave` → active 제거
- nav `focusout` → focus가 nav 밖이면 active 제거
- ESC → active 제거

표시는 Tailwind data attribute variant로 처리한다:

```tsx
"[&[data-active='true']>.gnb-toggle-wrap]:!block"
"[&[data-active='true']>.gnb-main-trigger::after]:rotate-[-180deg]"
```

#### 검증

Playwright로 첫 번째 GNB와 두 번째 GNB 사이의 실제 gap 좌표를 계산해 이동했다:

```json
{
  "afterGap": {
    "active": "소개",
    "activeCount": 1,
    "wrapDisplay": "block"
  },
  "afterLeave": {
    "activeCount": 0
  }
}
```

gap에서는 최근 메뉴가 유지되고, nav 영역을 벗어나면 닫히는 것을 확인했다.

---

### 5. Client island는 "렌더"가 아니라 "행동"만 맡긴다

#### 개념

Server Component로 이미 렌더한 DOM을 Client Component가 다시 렌더하면 데이터 직렬화와 hydration 비용이 커진다. 하지만 DOM에 이벤트를 붙이고 attribute만 바꾸는 작은 island는 비용이 작고 목적이 분명하다.

#### 프로젝트 코드에서의 적용

- `HeaderChrome`은 메뉴 트리를 서버에서 렌더한다.
- `DesktopGnbBehavior`는 렌더된 DOM에 이벤트를 붙인다.
- `MobileMenuIsland`는 모바일 overlay가 열렸을 때만 메뉴 dialog를 렌더한다.

이 구조에서는 desktop GNB의 메뉴 데이터가 client state로 다시 관리되지 않는다. hover 상태는 DOM attribute만 바꾼다.

---

## 레거시 경험과의 연결

- **PHP include header/footer**: 레거시 PHP에서 `header.php`, `footer.php`를 서버에서 include하던 방식과 목적이 같다. 공통 레이아웃은 첫 HTML에 있어야 안정적이다. 차이는 Next.js에서는 Server Component와 client island 경계를 명시적으로 설계해야 한다는 점이다.
- **jQuery hoverIntent류 플러그인**: 레거시에서 GNB gap 깜빡임을 막기 위해 hoverIntent나 delay를 썼던 경험과 유사하다. 이번에는 delay 대신 nav 영역 기준 `data-active`로 상태를 명확히 유지했다.
- **CSS absolute dropdown 문제**: 예전에도 absolute submenu가 부모 배경 밖으로 튀는 문제는 흔했다. 고정 height를 늘리는 임시 대응보다 콘텐츠가 레이아웃 흐름에 참여하도록 구조를 바꾸는 것이 장기적으로 안전하다.

---

## 면접 예상 질문 & 답변

### Q1. 왜 헤더와 푸터를 Server Component로 바꿨나요?

헤더와 푸터는 모든 페이지에 반복되는 공통 레이아웃이라 첫 HTML에 포함되는 것이 중요합니다. Client Component에서 hydration 이후 렌더되면 페이지 전환 때 메뉴와 푸터가 늦게 나타나고, 이미 그려진 main 콘텐츠 위치가 바뀌어 CLS에 불리할 수 있습니다. 그래서 `HeaderChrome`과 `FooterChrome` 서버 컴포넌트가 KRDS DOM 구조를 직접 렌더하도록 바꿨고, 모바일 메뉴 open/close나 데스크톱 GNB active 유지 같은 상호작용만 작은 client island로 분리했습니다.

### Q2. KRDS React 컴포넌트를 그대로 쓰지 않은 이유는 무엇인가요?

KRDS React 컴포넌트가 만드는 DOM 구조가 프로젝트 요구와 맞지 않는 부분이 있었습니다. 특히 `Header.Branding`은 children을 `.logo` 밖에 렌더해 로고 이미지를 클릭 가능한 `<a>` 안에 넣기 어려웠습니다. KRDS CSS는 class와 DOM 구조에 의존하므로, 필요한 class(`header-branding`, `logo`, `btn-navi`, `gnb-*`, `f-*`)를 직접 렌더하고 일반 스타일은 Tailwind utility로 처리하는 방식이 더 명확했습니다.

### Q3. GNB gap에서 메뉴가 닫히는 문제를 어떻게 해결했나요?

CSS `:hover`는 현재 hover 중인 요소를 벗어나는 순간 해제됩니다. GNB 항목 사이 gap을 지나면 dropdown hover가 끊겨 하위 메뉴가 닫히는 것이 문제였습니다. 해결은 nav 영역 기준으로 최근 active dropdown을 유지하는 것입니다. 각 dropdown의 `pointerenter`에서 `data-active=true`를 붙이고, nav의 `pointerleave`에서 제거합니다. gap은 nav 내부이므로 active가 유지되고, 다른 dropdown에 들어가면 active가 교체됩니다.

### Q4. 3depth 메뉴 잘림은 왜 발생했고 어떻게 고쳤나요?

KRDS 기본 3depth panel이 absolute positioning으로 렌더되면 부모 높이 계산에 참여하지 않습니다. 3depth 항목이 많거나 줄바꿈이 생기면 dropdown 배경보다 panel이 더 커져 잘려 보일 수 있습니다. 그래서 데스크톱 3depth는 `.gnb-sub-list` absolute panel을 쓰지 않고, 2depth column과 3depth column을 같은 grid 흐름에 넣었습니다. 이 방식은 콘텐츠 높이가 부모 dropdown 높이에 반영되어 hardcoded min-height 없이도 안전합니다.

---

## 트러블슈팅 로그

| 문제 | 원인 | 해결 |
| ---- | ---- | ---- |
| 페이지 전환 시 헤더 메뉴가 늦게 나타남 | 공통 헤더가 client hydration 이후 렌더되는 구조 | `HeaderChrome` 서버 컴포넌트로 KRDS header DOM 직접 렌더 |
| 페이지 전환 시 푸터도 공통 레이아웃인데 늦게 렌더될 수 있음 | 푸터도 같은 공통 레이아웃 요소 | `FooterChrome` 서버 컴포넌트로 KRDS footer DOM 직접 렌더 |
| 3depth 메뉴가 잘림 | absolute `.gnb-sub-list`가 부모 높이 계산에 참여하지 않음 | 정적 grid/flex `web-gnb-depth3-panel`로 변경 |
| GNB gap 이동 시 메뉴가 닫혔다 다시 열림 | dropdown 개별 `:hover` 기준이라 gap에서 hover 해제 | `DesktopGnbBehavior`가 nav 영역 기준 `data-active` 유지 |
| `127.0.0.1` Playwright 검증에서 hydration 확인이 흔들림 | Next dev의 allowed origin/HMR 보호와 localhost origin 차이 | 실제 dev 안내 URL인 `http://localhost:3000` 기준으로 검증 |
| `globals.css` 헤더 보정 증가 | 컴포넌트 전용 스타일을 전역에 둠 | Tailwind arbitrary value/variant를 컴포넌트 className으로 이전 |

---

## 한 줄 요약 카드

- **공통 레이아웃 SSR**: "헤더/푸터는 첫 HTML에 있어야 CLS와 늦은 표시를 줄일 수 있다."
- **KRDS DOM 차용**: "KRDS React 컴포넌트가 DOM 요구와 충돌하면 KRDS class 구조를 서버에서 직접 렌더한다."
- **최소 client island**: "서버가 마크업을 렌더하고, 클라이언트는 open/close·active attribute 같은 행동만 맡는다."
- **GNB gap 안정화**: "개별 dropdown `:hover`가 아니라 nav 영역 기준 `data-active`로 최근 메뉴를 유지한다."
- **3depth 높이 안전성**: "absolute panel 대신 정적 grid/flex로 3depth가 부모 높이 계산에 참여하게 한다."
- **globals.css 축소**: "컴포넌트 전용 스타일은 Tailwind class로 옮기고 전역 CSS는 공유 규칙 중심으로 남긴다."
