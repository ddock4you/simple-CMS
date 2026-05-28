# 학습정리: 특별편-KRDS Tailwind root 정규화

## 구현 요약

공개 web 앱에서 원본 `krds-react/dist/index.css`를 직접 import하지 않고, 빌드 전 생성되는 `apps/web/app/krds-normalized.css`를 사용하도록 바꿨다. 정규화 스크립트는 KRDS root font-size를 100%로 바꾸고 rem 값을 0.625배로 변환해 KRDS 컴포넌트의 실제 크기를 유지한다. Storybook도 같은 CSS를 import하도록 바꿔 앱과 문서 환경의 차이를 없앴다. `@krds-ui/tailwindcss-plugin`은 제거하고, KRDS 고정값이 필요한 UI는 arbitrary value로 명시했다.

## 핵심 학습 포인트

### CSS root 정책은 앱 전체의 단위 체계를 결정한다

#### 개념

`rem`은 해당 요소가 아니라 root element의 font-size에 의해 결정되는 단위다.

#### 동작 원리 심화

KRDS는 `--krds-font-size-base: 62.5%`와 `html{font-size:var(--krds-font-size-base)}` 조합으로 `1rem = 10px` 환경을 만든다. Tailwind는 기본적으로 `1rem = 16px` 전제를 갖고 `text-base`, `p-4`, `gap-6` 등을 생성한다. 따라서 KRDS root 정책이 전역에 남아 있으면 Tailwind utility의 의미가 바뀐다. import 순서로 Tailwind가 뒤에 와도 `rem` 계산 기준 자체가 바뀌었기 때문에 근본 해결이 되지 않는다.

#### 프로젝트 코드에서의 적용

- `apps/web/scripts/normalize-krds-css.mjs` — KRDS CSS를 읽어 root token과 rem 값을 변환
- `apps/web/app/krds-normalized.css` — 생성된 CSS 산출물
- `apps/web/app/layout.tsx` — `import './krds-normalized.css';`로 전환
- `apps/web/app/globals.css` — `html { font-size: 100%; }`, `body { font-size: 1rem; }` 명시

#### 설계 판단

`!important`로 `html`을 덮는 방법은 빠르지만 Storybook과 앱 사이에 보정 위치가 달라지고, KRDS 내부 rem 값이 16px root 기준으로 커지는 문제가 생긴다. 반대로 CSS 사전 변환은 한 번에 root 기준을 통일하면서 KRDS 컴포넌트의 px 크기를 유지한다. 외부 패키지를 patch하지 않기 때문에 버전 업그레이드도 `prepare:krds-css` 재실행으로 추적 가능하다.

### Storybook은 실제 앱 CSS 환경을 재현해야 문서 역할을 한다

#### 개념

Storybook의 preview iframe은 앱 layout과 독립적인 런타임이므로 전역 CSS를 명시적으로 import해야 한다.

#### 동작 원리 심화

이전 구조에서는 `.storybook/preview.tsx`가 KRDS 원본 CSS와 `globals.css`를 import하고, 일부 디자인 시스템 story는 `storyShellDecorator`에서 `useLayoutEffect`로 root font-size를 강제로 바꿨다. 이 방식은 첫 paint 이전 동기 실행까지 신경 써야 했고, 실제 Next.js 페이지에는 없는 보정이 Storybook에만 있었다. 이번 변경은 preview가 앱과 동일하게 `krds-normalized.css`를 쓰므로 별도 root 보정이 필요 없다.

#### 프로젝트 코드에서의 적용

- `apps/web/.storybook/preview.tsx` — `../app/krds-normalized.css` import
- `apps/web/src/_storybook/design-system/lib/storyShell.tsx` — `useLayoutEffect` root 보정 제거
- `apps/web/src/_storybook/design-system/Foundations.stories.tsx` — CSS import 정책 설명 갱신
- `apps/web/src/_storybook/design-system/KrdsSpacing.stories.tsx` — plugin override 대신 KRDS scale 참고표로 설명 변경

#### 설계 판단

Storybook이 실제 앱보다 특별한 보정을 많이 갖고 있으면 컴포넌트 문서가 회귀를 숨긴다. CSS 조건을 동일화하면 Storybook build가 앱 CSS 정책의 검증 지점이 된다. 이번 작업에서 `pnpm --filter @simple-cms/web build-storybook`이 통과한 것이 그 확인이다.

### KRDS token은 utility가 아니라 값으로 참조한다

#### 개념

Tailwind plugin이 제공하던 `text-title-s`, `rounded-5`, `bg-primary-50` 같은 클래스 대신, 필요한 KRDS 값을 코드에 명시하는 전략이다.

#### 동작 원리 심화

KRDS plugin은 색상/타이포뿐 아니라 spacing과 screens까지 주입한다. 이 때문에 `p-7`이 Tailwind 기본 28px이 아니라 KRDS 24px이 되는 식의 혼동이 생긴다. plugin을 제거하면 Tailwind의 기본 spacing과 breakpoint 의미가 안정된다. KRDS 시안값을 정확히 맞춰야 하는 곳은 `text-[17px] leading-[1.5]`, `rounded-[12px]`, `bg-[#256ef4]`처럼 arbitrary value를 쓴다.

#### 프로젝트 코드에서의 적용

- `apps/web/src/widgets/feedback/ui/SubpageFeedbackForm.tsx` — `bg-gray-5`, `text-title-s`, `rounded-5` 제거
- `apps/web/src/features/home-section/ui/HeroSection.tsx` — `rounded-5` → `rounded-[12px]`
- `apps/web/package.json` / `pnpm-lock.yaml` — `@krds-ui/tailwindcss-plugin` 제거

#### 설계 판단

프로젝트의 공개 web UI는 KRDS 컴포넌트가 기준이지만, 신규 레이아웃은 Tailwind utility로 빠르게 구성한다. 이때 plugin이 Tailwind 기본 토큰을 바꾸면 두 체계가 모두 불안정해진다. plugin 제거 + arbitrary value는 코드가 조금 길어지는 대신, 각 값의 의미가 명확하고 Tailwind 생태계 기본값과 충돌하지 않는다.

## 레거시 경험과의 연결

- 레거시에서는 외부 CSS 충돌을 selector 우선순위와 `!important`로 해결하는 경우가 많았다. 이번에는 원인인 root 단위 체계를 변환해 충돌 범위를 줄였다.
- 기존 운영 경험에서 중요한 "실제 페이지와 문서/샘플 화면이 다르게 보이는 문제"를 Storybook preview CSS 동일화로 줄였다.
- px 값을 직접 확인하던 레거시 감각은 KRDS token을 arbitrary value로 옮길 때 오히려 도움이 된다. 단, 전역 단위 정책은 빌드 스크립트와 문서로 자동화한다.

## 면접 예상 질문 & 답변

### Q1. KRDS와 Tailwind를 같이 쓰면서 root font-size 충돌을 어떻게 해결했나요?

#### 답변 예시

KRDS 원본 CSS는 `html`의 font-size를 62.5%로 바꿔 `1rem`을 10px처럼 쓰는 전제를 갖고 있었습니다. Tailwind는 기본적으로 16px root를 기준으로 `text-base`, `p-4` 같은 utility를 생성하기 때문에, KRDS root가 전역에 남으면 Tailwind 크기 체계가 깨졌습니다. 처음에는 Tiptap 콘텐츠 영역에 `!important`로 px 값을 강제했지만, 새 컴포넌트가 늘어날수록 같은 문제가 반복될 구조였습니다. 그래서 KRDS CSS를 직접 import하지 않고, 빌드 전 스크립트로 root token을 100%로 바꾸고 KRDS 내부 rem 값을 0.625배로 변환한 CSS를 사용했습니다. 이렇게 하면 Tailwind는 16px root 기준으로 정상 동작하고, KRDS 컴포넌트는 기존과 같은 실제 px 크기를 유지합니다. Storybook도 같은 정규화 CSS를 import하게 해서 문서 환경과 실제 앱 환경을 맞췄습니다.

#### 꼬리 질문 대응

**"그냥 `html { font-size: 100% !important }`만 쓰면 안 되나요?"**
그렇게 하면 Tailwind 기준은 복구되지만 KRDS CSS의 `1.7rem`이 17px이 아니라 27.2px처럼 커질 수 있습니다. root만 바꾸는 것이 아니라 KRDS 내부 rem 값도 같이 보정해야 기존 KRDS 컴포넌트 크기가 유지됩니다.

**"KRDS 컴포넌트 내부 글자 크기를 Tailwind로 바꿀 때도 important가 필요 없나요?"**
root 문제는 해결됐지만, 컴포넌트 내부 selector specificity 문제는 별개입니다. KRDS가 더 구체적인 selector로 내부 span 등에 font-size를 주면 `text-[14px]!`나 `[&_span]:text-[14px]!` 같은 보정이 필요할 수 있습니다.

### Q2. KRDS Tailwind plugin을 제거한 이유는 무엇인가요?

#### 답변 예시

KRDS Tailwind plugin은 색상과 타이포 utility를 제공하는 장점이 있지만, spacing과 screens까지 Tailwind theme에 주입합니다. 그 결과 `p-7` 같은 클래스가 Tailwind 기본 기대값과 달라지고, 개발자가 Tailwind 문서 기준으로 코드를 읽을 때 혼동이 생겼습니다. 프로젝트에서는 KRDS 컴포넌트 CSS 자체는 유지하되, Tailwind 기본 utility 의미는 보존하는 편이 더 안전하다고 판단했습니다. KRDS 값이 꼭 필요한 경우에는 `text-[17px] leading-[1.5]`, `rounded-[12px]`, `bg-[#256ef4]`처럼 명시적인 값을 사용합니다. 이 방식은 클래스가 조금 길어지지만, 코드 리뷰에서 실제 px 의도가 바로 보이고 Tailwind 생태계 기본값과 충돌하지 않습니다.

#### 꼬리 질문 대응

**"토큰을 utility로 쓰지 않으면 디자인 시스템 일관성이 약해지지 않나요?"**
그래서 Storybook의 KRDS 디자인 시스템 카탈로그는 유지했습니다. 단, 런타임 utility가 아니라 token label과 실제 값을 문서화하는 방식으로 바꿔, 값의 출처는 유지하면서 Tailwind 충돌은 피했습니다.

**"나중에 token utility가 많이 필요하면 어떻게 확장할 수 있나요?"**
Tailwind 기본 토큰을 덮지 않는 `krds-` prefix utility를 별도로 정의하는 방식이 좋습니다. 예를 들어 `text-krds-title-s`, `bg-krds-primary-50`처럼 충돌 없는 이름을 쓰면 됩니다.

## 트러블슈팅 로그

| 문제 | 원인 | 해결 |
| ---- | ---- | ---- |
| Tailwind 크기 utility가 의도보다 작게 보임 | KRDS root `62.5%`로 `1rem`이 10px이 됨 | KRDS CSS 정규화로 root 100% + rem 0.625배 변환 |
| Storybook design-system stories만 별도 보정 필요 | Storybook이 원본 KRDS CSS를 import하고 `useLayoutEffect`로 root를 강제 보정 | Storybook preview도 `krds-normalized.css`를 import하도록 통일 |
| `pnpm --filter @simple-cms/web test` 실패 | 현재 환경의 Playwright Chromium 실행 파일 없음 | unit project는 `pnpm --filter @simple-cms/web exec vitest run --project unit`로 통과 확인. `playwright install chromium`은 ubuntu26.04 미지원으로 실패 |
| `pnpm --filter @simple-cms/web build` 실패 | `/sitemap.xml` prerender 중 로컬 PostgreSQL 미기동 | CSS/TypeScript compile은 통과. DB 필요 빌드는 로컬 DB 기동 후 재실행 필요 |

## 한 줄 요약 카드

- **root rem 정규화**: KRDS의 10px root 전제를 앱 전역에 퍼뜨리지 않고, 생성 CSS에서 root 100%와 rem 0.625배 변환으로 흡수했다.
- **Tailwind 기본값 보존**: KRDS Tailwind plugin을 제거해 `text-base`, `p-4`, `sm:` 같은 기본 의미를 유지한다.
- **KRDS 값 표현**: KRDS 고정값은 `text-[17px]`, `p-[24px]`, `rounded-[12px]`, `bg-[#256ef4]`처럼 명시한다.
- **Storybook 동일화**: Storybook도 앱과 같은 정규화 CSS를 import해 문서 환경의 별도 root 보정을 제거했다.

## 추가 학습 자료

- Tailwind CSS Docs — Functions and directives: https://tailwindcss.com/docs/functions-and-directives
- Tailwind CSS Docs — Adding custom styles / arbitrary values: https://tailwindcss.com/docs/adding-custom-styles
- MDN — rem unit: https://developer.mozilla.org/en-US/docs/Web/CSS/length#rem
- Storybook Docs — Styling and CSS: https://storybook.js.org/docs/configure/styling-and-css
