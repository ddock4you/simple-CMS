# 사전학습: 특별편-KRDS Tailwind root 정규화

이 문서는 Stage 17 디자인 시스템 Storybook 문서화의 후속 실전 보완이다. 기존 `17-디자인시스템스토리-KRDS격리-useLayoutEffect-사전학습.md`가 Storybook 내부 보정에 초점을 맞췄다면, 이 문서는 공개 web 앱과 Storybook이 같은 CSS 조건을 쓰도록 KRDS 전역 root 정책을 빌드 전 정규화하는 방법을 다룬다.

## 이 주제에서 다루는 기술

- KRDS CSS — 공개 web의 공공 UI 컴포넌트 스타일 원본
- Tailwind CSS v4 — utility class와 `@theme` 기반 breakpoint 정의
- CSS `rem` 단위 — root font-size에 의존하는 상대 길이 단위
- Next.js App Router global CSS import — 앱 전역 CSS 로딩 경계
- Storybook preview CSS — 컴포넌트 문서 환경의 전역 CSS 재현
- pnpm script lifecycle — `prebuild`, `prestorybook` 같은 자동 생성 훅
- Next.js public assets — CSS `url(...)`이 참조하는 KRDS 이미지 리소스 공개 경로

## 핵심 개념

### KRDS root font-size와 rem 스케일

#### 정의

KRDS 원본 CSS는 `html { font-size: 62.5%; }` 방식으로 `1rem`을 10px처럼 계산하도록 만든다.

#### 동작 원리

브라우저 기본 root font-size가 16px일 때 `62.5%`는 10px이다. 따라서 KRDS CSS의 `1.7rem`은 `17px`이 되고, `4rem`은 `40px`이 된다. 문제는 Tailwind도 많은 기본 utility를 rem으로 출력한다는 점이다. 예를 들어 Tailwind의 `text-base`는 일반적으로 `1rem`이라서 16px을 기대하지만, KRDS root가 전역 적용되면 10px이 된다. `p-4` 같은 spacing도 같은 이유로 작아진다.

#### 이 프로젝트에서의 적용

Simple CMS 공개 web은 KRDS 컴포넌트를 유지해야 하지만, Tailwind utility도 정상적인 16px root 기준으로 사용해야 한다. 따라서 원본 KRDS CSS를 직접 import하지 않고, `apps/web/scripts/normalize-krds-css.mjs`가 생성한 `apps/web/app/krds-normalized.css`를 import한다. 생성 스크립트는 root token을 `100%`로 바꾸고 KRDS 내부 rem 값을 `0.625배`로 줄여 KRDS 컴포넌트의 실제 px 크기는 유지한다.

### CSS 사전 변환

#### 정의

런타임에서 `!important`로 덮는 대신, 외부 CSS를 앱 정책에 맞게 빌드 전 변환해 고정 산출물로 사용하는 방식이다.

#### 동작 원리

정규화 스크립트는 `krds-uiux`의 `resources/css/token/krds_tokens.css`, `resources/css/common/common.css`, `resources/css/component/component.css`를 순서대로 읽어 하나의 CSS로 조합한다. `krds-react/dist/index.css` 전체 번들은 사용하지 않는다. 해당 번들에는 `body, div, p, h1... { margin: 0; padding: 0; }` 같은 reset-heavy 규칙이 포함되어 Tailwind spacing utility를 다시 덮을 수 있기 때문이다. 조합된 CSS에서 `--krds-font-size-base: 62.5%`를 `100%`로 바꾼 뒤 `(-?\d*\.?\d+)rem` 패턴을 찾아 숫자에 `0.625`를 곱한다. 결과적으로 KRDS의 `1.7rem`은 `1.0625rem`이 되어 16px root에서도 17px로 렌더된다.

#### 이 프로젝트에서의 적용

`apps/web/package.json`의 `prepare:krds-css`가 이 변환을 수행한다. `predev`, `prebuild`, `prestorybook`, `prebuild-storybook`에 연결해 개발 서버, Next build, Storybook 모두 같은 CSS 산출물을 사용한다. 생성 파일은 Git에 포함해 설치 직후가 아니어도 CSS import가 깨지지 않도록 한다.

### KRDS CSS layer와 Tailwind utility 우선순위

#### 정의

외부 컴포넌트 CSS를 Tailwind v4 layer 체계 안의 낮은 레이어에 배치해 앱 utility가 필요한 곳에서 정상 override되게 만드는 방식이다.

#### 동작 원리

Tailwind v4는 `@layer theme, base, components, utilities`처럼 cascade layer 순서를 명시할 수 있다. 이 프로젝트는 KRDS CSS를 `@layer krds-base { ... }`로 감싸고, `globals.css`에서 `@layer theme, krds-base, components, utilities;` 순서를 선언한다. 같은 specificity라면 뒤 레이어인 `utilities`가 앞 레이어인 `krds-base`보다 이긴다. 그래서 `p-[24px]`, `space-y-[24px]`, `text-[17px]` 같은 Tailwind utility가 KRDS 컴포넌트 보조 wrapper에서 정상 적용된다.

#### 이 프로젝트에서의 적용

`apps/web/app/layout.tsx`와 `.storybook/preview.tsx`는 모두 `krds-normalized.css`를 먼저 import하고 `globals.css`를 나중에 import한다. `globals.css`는 Tailwind preflight를 import하지 않아 KRDS form/button 기본 스타일과 충돌하지 않는다. 전역 `margin:0; padding:0` reset은 `krds-normalized.css`와 `globals.css` 양쪽 모두에서 금지한다.

### KRDS 이미지 자산 publish 경로

#### 정의

패키지 내부에 있는 SVG/이미지 파일을 Next.js가 브라우저에 서빙할 수 있는 `public` 하위 경로로 복사하고, 생성 CSS의 `url(...)`을 그 공개 경로로 정규화하는 것이다.

#### 동작 원리

CSS의 `url(...)`은 Node.js 모듈 해석이 아니라 브라우저 HTTP 요청이다. `krds-react`나 `krds-uiux` 패키지 내부에 아이콘 파일이 존재해도, Next.js가 `node_modules` 내부 파일을 public URL로 자동 노출하지 않는다. 따라서 생성 CSS가 `/assets/krds/img/component/icon/ico_sch.svg`를 참조하려면 실제 파일이 `apps/web/public/assets/krds/img/component/icon/ico_sch.svg`에 있어야 한다.

#### 이 프로젝트에서의 적용

`normalize-krds-css.mjs`는 `krds-uiux/resources/img`를 `apps/web/public/assets/krds/img`로 동기화한다. CSS URL은 `../../img/...`와 `../../img/img/...` 두 원본 패턴을 모두 `/assets/krds/img/...`로 정규화한다. 예전 산출물인 `apps/web/public/krds`는 스크립트 실행 시 삭제해 `/krds/img/...`와 `/assets/krds/img/...` 경로가 동시에 남지 않게 한다.

### Tailwind plugin 제거와 arbitrary value

#### 정의

`@krds-ui/tailwindcss-plugin`을 전역 Tailwind token provider로 쓰지 않고, 필요한 KRDS 값만 명시적으로 적는 전략이다.

#### 동작 원리

KRDS Tailwind plugin은 색상과 타이포뿐 아니라 spacing, radius, screens까지 Tailwind theme에 주입한다. 이때 `p-1`, `p-7`, `rounded-5`, `text-title-s` 같은 utility가 생기지만, Tailwind 기본 spacing 기대값과 충돌한다. plugin을 제거하면 `text-base`, `p-4`, `sm:` 같은 Tailwind 기본 의미가 유지된다. KRDS 시안 값과 정확히 맞춰야 하는 곳은 `text-[17px] leading-[1.5]`, `p-[24px]`, `rounded-[12px]`, `bg-[#256ef4]`처럼 값을 명시한다.

#### 이 프로젝트에서의 적용

`SubpageFeedbackForm`과 `HeroSection`은 기존 `rounded-5`, `bg-gray-5`, `text-title-s` 같은 plugin utility 대신 arbitrary value를 사용한다. Storybook 디자인 시스템 카탈로그는 plugin utility가 아니라 token label과 inline style로 KRDS 값을 문서화한다.

### Storybook과 앱 CSS 동일화

#### 정의

Storybook preview iframe이 실제 Next.js layout과 같은 전역 CSS 조건을 쓰도록 맞추는 것이다.

#### 동작 원리

Storybook은 App Router의 `layout.tsx`를 그대로 실행하지 않는다. 그래서 `.storybook/preview.tsx`에서 앱과 동일한 CSS import 순서를 재현해야 한다. 이전에는 Storybook design-system stories가 `useLayoutEffect`로 `html/body font-size: 16px !important` style을 주입했지만, 이 방식은 Storybook에만 존재하는 보정이라 실제 앱과 조건이 달랐다.

#### 이 프로젝트에서의 적용

`.storybook/preview.tsx`도 `../app/krds-normalized.css` 다음 `../app/globals.css`를 import한다. `storyShellDecorator`의 root font-size 보정은 제거하고, 시각적 padding만 inline style로 유지한다.

## 레거시 ↔ 모던 대조표

| 관점 | 레거시 환경에서는 | 이 프로젝트에서는 |
| ---- | ----------------- | ----------------- |
| 외부 CSS 충돌 | 전역 CSS 뒤에 더 강한 selector나 `!important`를 추가 | 원본 CSS를 앱 root 정책에 맞게 사전 변환 |
| px 기준 관리 | 대부분 px 직접 지정이라 root rem 영향이 작음 | Tailwind와 KRDS 모두 rem을 쓰므로 root 기준을 명확히 통제 |
| 디자인 토큰 | 문서나 SCSS 변수에서 수동 참조 | Storybook token catalog와 arbitrary value 정책으로 문서화 |
| 문서 환경 | 실제 페이지와 별도 스타일로 깨지는 경우가 많음 | Storybook preview가 앱과 같은 `krds-normalized.css`를 사용 |
| 이미지 자산 | 서버 정적 폴더에 수동 복사하거나 상대경로를 맞춤 | `prepare:krds-css`가 `/assets/krds/img`로 자동 publish |

## 구현 시 주의할 점

- KRDS 원본 CSS를 다시 직접 import하면 root 62.5% 문제가 재발한다.
- `krds-react/dist/index.css` 전체 번들을 다시 쓰면 root 문제뿐 아니라 전역 margin/padding reset으로 Tailwind spacing utility가 다시 깨질 수 있다.
- `@krds-ui/tailwindcss-plugin`을 되살리면 Tailwind spacing/screens 충돌이 다시 생긴다.
- CSS `url(...)`은 패키지 내부 파일을 직접 읽지 않는다. KRDS 아이콘이 패키지에 있어도 `public/assets/krds/img` publish 단계가 필요하다.
- 원본 CSS에는 `../../img/...`와 `../../img/img/...` 패턴이 섞일 수 있으므로 URL 정규화에서 중복 `img/img`를 방지해야 한다.
- KRDS 컴포넌트 내부 텍스트를 바꾸는 것은 root 문제와 별개로 selector specificity 문제라서 필요 시 `text-[14px]!` 또는 child selector가 필요할 수 있다.
- 생성 CSS는 `@charset`이 파일 첫 줄이어야 한다. banner comment가 먼저 오면 CSS parser 경고가 날 수 있다.
- KRDS 버전 업그레이드 시 `prepare:krds-css`를 실행하고 Storybook KRDS showcase를 확인해야 한다.

## 이 주제를 마치면 설명할 수 있어야 하는 것

- [ ] KRDS의 `html { font-size: 62.5%; }`가 Tailwind `text-base`와 `p-4`를 왜 깨뜨리는가?
- [ ] KRDS rem 값을 `0.625배`로 변환하면 왜 기존 KRDS 컴포넌트 px 크기가 유지되는가?
- [ ] `!important` 보정과 CSS 사전 변환의 차이는 무엇인가?
- [ ] KRDS Tailwind plugin을 제거한 뒤 KRDS 색상/간격/타이포 값을 어떻게 코드에 표현하는가?
- [ ] Storybook preview와 Next.js layout의 CSS import 순서를 왜 맞춰야 하는가?
- [ ] KRDS 아이콘이 패키지 안에 있는데도 왜 `public/assets/krds/img`로 복사해야 하는가?
- [ ] `@layer krds-base`가 Tailwind utility override에 어떤 도움을 주는가?
