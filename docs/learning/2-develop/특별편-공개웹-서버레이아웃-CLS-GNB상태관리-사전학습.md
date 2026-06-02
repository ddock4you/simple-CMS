# 사전학습: 공개 웹 서버 레이아웃 — CLS 방어 · KRDS DOM 차용 · 최소 클라이언트 island · GNB 상태 유지

## 이 주제에서 다루는 기술

- **Server Component 레이아웃** — 공통 헤더/푸터 HTML을 서버에서 먼저 내려 CLS와 늦은 표시를 줄이는 패턴
- **Hydration boundary** — 서버 렌더 마크업 위에 필요한 상호작용만 클라이언트 컴포넌트로 얹는 방식
- **KRDS DOM 클래스 차용** — KRDS React 컴포넌트 대신 KRDS CSS가 기대하는 class/구조를 직접 렌더하는 방식
- **GNB hover 상태 관리** — CSS `:hover` 한계와 `data-active` 기반 상태 유지
- **Tailwind v4 arbitrary value/variant** — KRDS CSS variable을 className 안에서 직접 사용하는 방식
- **CLS 관점 레이아웃 가드** — 로고, 헤더 높이, GNB dropdown 높이를 예측 가능한 값으로 만드는 방식

---

## 핵심 개념

### 1. 공통 레이아웃은 SSR HTML에 먼저 있어야 한다

헤더와 푸터는 모든 페이지에 반복되는 레이아웃 요소다. 페이지 전환 때 이 요소가 클라이언트 hydration 이후에 뒤늦게 생기면 사용자는 "메뉴가 늦게 뜬다"고 느끼고, 브라우저는 콘텐츠 위치가 바뀌었다고 판단해 CLS에 불리하게 기록할 수 있다.

Server Component로 공통 레이아웃을 렌더하면 다음 순서가 된다:

```txt
요청
→ 서버가 header/main/footer HTML 생성
→ 브라우저가 첫 HTML paint
→ 모바일 메뉴, 캐러셀 등 필요한 island만 hydration
```

반대로 공통 레이아웃 전체를 Client Component에 맡기면 다음 문제가 생긴다:

```txt
요청
→ 서버 HTML에는 placeholder 또는 빈 영역
→ JS 다운로드/실행
→ header/footer 렌더
→ 이미 그려진 main 영역이 밀림
```

공통 레이아웃은 Server Component가 기본이고, interaction이 필요한 부분만 island로 쪼개는 것이 안정적이다.

---

### 2. KRDS React 컴포넌트를 무조건 쓰는 것이 정답은 아니다

KRDS CSS는 특정 DOM 클래스와 구조를 기준으로 스타일을 적용한다. React 컴포넌트는 그 구조를 편하게 만들기 위한 도구지만, 프로젝트 요구와 DOM 구조가 충돌할 수 있다.

예를 들어 헤더 로고는 클릭 가능 영역 안에 이미지가 있어야 한다:

```html
<div class="header-branding">
  <h2 class="logo">
    <a href="/">
      <img />
    </a>
  </h2>
</div>
```

만약 KRDS React `Header.Branding`이 children을 `.logo` 밖에 렌더한다면, 로고 이미지를 링크 안에 넣기 어렵다. 이럴 때는 KRDS React 컴포넌트를 억지로 감싸기보다, KRDS CSS가 기대하는 DOM class를 서버 컴포넌트에서 직접 렌더하는 편이 더 명확하다.

주의할 점:

- KRDS 동작/아이콘에 필요한 class는 유지한다.
- 일반 spacing, 크기, 반응형 보정은 Tailwind utility로 컴포넌트에 붙인다.
- `globals.css`에는 해당 컴포넌트만을 위한 스타일을 늘리지 않는다.
- KRDS major update 때 차용한 DOM 구조를 다시 점검한다.

---

### 3. CSS `:hover`만으로 GNB 상태를 유지하면 gap에서 닫힌다

기본 CSS hover 구조:

```css
.dropdown:hover > .panel {
  display: block;
}
```

이 방식은 커서가 `.dropdown` 영역을 벗어나는 순간 panel이 닫힌다. GNB 항목 사이에 gap이 있으면 사용자는 같은 GNB 영역을 지나고 있다고 느끼지만, CSS 입장에서는 hover 대상이 사라진다. 그 결과 메뉴가 닫혔다가 다음 항목에서 다시 열리며 깜빡인다.

해결 방식:

```txt
nav pointerenter
→ 해당 dropdown을 data-active=true
→ nav 내부 gap 이동
→ data-active 유지
→ 다른 dropdown pointerenter
→ active 교체
→ nav pointerleave
→ active 제거
```

CSS는 `data-active`를 보고 표시한다:

```tsx
"[&[data-active='true']>.gnb-toggle-wrap]:!block"
```

이 패턴의 장점:

- SSR HTML은 그대로 유지된다.
- client state를 React render로 관리하지 않아 리렌더 비용이 없다.
- DOM attribute만 바꾸므로 GNB 같은 hover UI에 충분히 빠르다.
- keyboard focus도 `focusin/focusout`으로 같은 정책을 적용할 수 있다.

---

### 4. 3depth dropdown은 absolute panel보다 정적 레이아웃이 안전하다

KRDS 기본 GNB의 3depth panel은 absolute positioning을 사용할 수 있다:

```css
.gnb-sub-list {
  position: absolute;
  top: 0;
  left: var(--main-menu-width);
}
```

absolute 요소는 부모 높이 계산에 참여하지 않는다. 3depth 항목이 많거나 텍스트가 줄바꿈되면 panel 내용이 dropdown 배경 밖으로 튀거나 잘려 보일 수 있다.

안전한 구조:

```txt
dropdown
└─ grid: [2depth column] [3depth column]
   ├─ 2depth trigger
   └─ 3depth panel (정적 grid/flex)
```

이 구조에서는 3depth panel이 부모 높이 계산에 참여한다. 높이를 `min-height: 240px`처럼 추정하지 않아도 실제 콘텐츠 높이만큼 dropdown이 커진다.

---

## 구현 전 체크리스트

- 헤더/푸터가 첫 HTML에 포함되어야 하는가?
- 상호작용이 필요한 부분만 client island로 분리했는가?
- KRDS React 컴포넌트가 DOM 구조 요구사항과 충돌하지 않는가?
- KRDS CSS class와 Tailwind utility의 책임을 분리했는가?
- `globals.css`에 컴포넌트 전용 override를 추가하지 않아도 되는가?
- GNB hover는 nav 영역 기준으로 유지되어야 하는가?
- 3depth panel이 부모 dropdown 높이 계산에 참여하는가?
- Playwright로 실제 hover/gap/leave 좌표를 검증할 수 있는가?

---

## 설명 가능 체크리스트

- "왜 헤더/푸터를 Server Component로 렌더해야 CLS에 유리한가?"
- "왜 KRDS React 컴포넌트를 그대로 쓰지 않고 DOM class를 직접 렌더했는가?"
- "왜 GNB gap에서 CSS `:hover`만으로는 충분하지 않은가?"
- "왜 `data-active`가 React state 렌더보다 이 문제에 적합한가?"
- "왜 3depth menu는 absolute panel보다 정적 grid가 안전한가?"
- "왜 `globals.css` 대신 Tailwind class로 옮기는가?"

---

## 추가 학습 자료

- React Server Components: 서버에서 렌더할 수 있는 UI와 client boundary 구분
- Next.js App Router layout: 공통 레이아웃의 Server Component 기본값
- Tailwind v4 arbitrary values/variants: CSS variable과 data attribute 기반 스타일링
- CLS: late insertion, image/logo dimension, reserved space의 관계
