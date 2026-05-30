# 학습정리: 특별편-KRDS Tailwind root 정규화

## 구현 요약

공개 web 앱에서 원본 `krds-react/dist/index.css`를 직접 import하지 않고, 빌드 전 생성되는 `apps/web/app/krds-normalized.css`를 사용하도록 바꿨다. 정규화 스크립트는 `krds-uiux`의 token/common/component CSS를 조합하고, KRDS root font-size를 100%로 바꾸고 rem 값을 0.625배로 변환해 KRDS 컴포넌트의 실제 크기를 유지한다. 생성 CSS는 `@layer krds-base`에 들어가 Tailwind utility가 필요한 곳에서 override할 수 있다. KRDS 컴포넌트 이미지 리소스는 `apps/web/public/assets/krds/img`로 publish하고 CSS URL을 `/assets/krds/img/...`로 정규화했다. Storybook도 같은 CSS를 import하도록 바꿔 앱과 문서 환경의 차이를 없앴다. `@krds-ui/tailwindcss-plugin`은 제거하고, KRDS 고정값이 필요한 UI는 arbitrary value로 명시했다.

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

`!important`로 `html`을 덮는 방법은 빠르지만 Storybook과 앱 사이에 보정 위치가 달라지고, KRDS 내부 rem 값이 16px root 기준으로 커지는 문제가 생긴다. 반대로 CSS 사전 변환은 한 번에 root 기준을 통일하면서 KRDS 컴포넌트의 px 크기를 유지한다. 이번 후속 작업에서는 `krds-react/dist/index.css` 전체 번들을 그대로 정규화하는 대신 `krds-uiux`의 token/common/component CSS만 조합했다. 이 선택으로 root 문제뿐 아니라 전역 `margin:0; padding:0` reset이 Tailwind spacing utility를 덮는 문제까지 함께 줄였다.

### KRDS CSS는 public asset publish 단계가 있어야 완성된다

#### 개념

패키지 내부 이미지 파일을 CSS에서 쓰려면 Next.js가 서빙하는 `public` 하위 경로로 복사해야 한다.

#### 동작 원리 심화

`krds-react`와 `krds-uiux` 패키지 안에는 `ico_sch.svg`, `ico_bread_home.svg`, `ico_logo_krds.svg` 같은 아이콘이 들어 있다. 하지만 CSS의 `url(...)`은 ESM import나 Node `require.resolve`가 아니라 브라우저가 요청하는 URL이다. Next.js는 `node_modules` 내부 파일을 임의 URL로 자동 노출하지 않고, `public` 아래 파일만 루트 기준 정적 파일로 제공한다. 따라서 생성 CSS가 `/assets/krds/img/component/icon/ico_sch.svg`를 참조하면 실제 파일이 `apps/web/public/assets/krds/img/component/icon/ico_sch.svg`에 있어야 한다.

#### 프로젝트 코드에서의 적용

- `apps/web/scripts/normalize-krds-css.mjs` — `krds-uiux/resources/img`를 `apps/web/public/assets/krds/img`로 복사
- `apps/web/scripts/normalize-krds-css.mjs` — 원본 `../../img/...`와 `../../img/img/...` URL을 `/assets/krds/img/...`로 정규화
- `apps/web/public/assets/krds/img/component/icon/*.svg` — KRDS 컴포넌트 CSS가 참조하는 실제 public 산출물
- `apps/web/AGENTS.md` — KRDS 이미지 리소스 공개 경로 정책 문서화

#### 설계 판단

처음에는 `/krds/img/...` 경로를 사용했지만, 프로젝트의 정적 자산 표준 경로를 `public/assets/...`로 맞추는 편이 낫다고 판단했다. 그래서 legacy `apps/web/public/krds`는 스크립트에서 삭제하고, 앞으로는 `/assets/krds/img/...`만 남기도록 했다. 필요한 아이콘만 선별 복사하는 방식도 가능하지만, 새 KRDS 컴포넌트를 추가할 때 누락과 404가 생길 위험이 크다. 전체 `resources/img` 동기화는 산출물이 조금 늘어나는 대신 컴포넌트 추가 시 안정성이 높다.

### KRDS CSS layer와 reset 제거는 Tailwind spacing 회귀를 막는다

#### 개념

외부 컴포넌트 CSS를 cascade layer에 배치하고 reset-heavy 규칙을 피해서 Tailwind utility가 의도대로 적용되게 하는 전략이다.

#### 동작 원리 심화

KRDS의 reset-heavy bundle에는 broad selector로 margin/padding을 초기화하는 규칙이 포함될 수 있다. 이런 규칙이 Tailwind utility보다 뒤에서 로드되거나 specificity가 높으면 `p-[24px]`, `space-y-[24px]`, `rounded-[12px]` 같은 클래스가 적용되지 않은 것처럼 보인다. 이번 구조에서는 생성 CSS를 `@layer krds-base`로 감싸고, `globals.css`에서 Tailwind `utilities`가 그 뒤 레이어에 오게 했다. layer 순서 덕분에 같은 specificity의 보조 스타일은 Tailwind utility가 이긴다.

#### 프로젝트 코드에서의 적용

- `apps/web/scripts/normalize-krds-css.mjs` — 생성 CSS를 `@layer krds-base { ... }`로 래핑
- `apps/web/app/globals.css` — `@layer theme, krds-base, components, utilities;` 선언
- `apps/web/app/globals.css` — Tailwind source 범위와 preflight 제외 정책 유지
- `apps/web/src/widgets/feedback/ui/SubpageFeedbackForm.tsx` — plugin 의존 class 대신 px/arbitrary spacing 사용

#### 설계 판단

전역 reset을 다시 넣는 것은 빠르게 화면을 맞출 수 있지만, CMS처럼 운영자가 작성한 본문·블록·KRDS 컴포넌트·Tailwind wrapper가 섞이는 환경에서는 회귀 지점이 많다. 외부 CSS는 낮은 layer에 두고, 앱이 명시한 utility는 높은 layer에서 이기게 하는 편이 더 예측 가능하다. KRDS 컴포넌트 자체 스타일은 유지하되, wrapper와 페이지 레이아웃은 Tailwind utility로 통제할 수 있다.

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
- 레거시 정적 파일 배포에서 `/assets/...` 경로를 명확히 관리하던 방식은 이번 KRDS 이미지 publish에도 그대로 연결된다. 패키지 안 파일과 브라우저 공개 URL은 같은 것이 아니라는 점을 명시적으로 분리했다.

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

### Q3. KRDS 아이콘이 패키지에 있는데 왜 public/assets로 복사했나요?

#### 답변 예시

KRDS 아이콘 파일은 `krds-react`와 `krds-uiux` 패키지 내부에 실제로 존재합니다. 하지만 CSS의 `url(...)`은 Node 모듈 경로가 아니라 브라우저가 요청하는 HTTP URL입니다. Next.js는 `node_modules` 내부 파일을 자동으로 정적 URL로 노출하지 않기 때문에, CSS가 참조할 파일은 `public` 아래에 있어야 합니다. 그래서 정규화 스크립트가 `krds-uiux/resources/img`를 `apps/web/public/assets/krds/img`로 복사하고, CSS URL을 `/assets/krds/img/...`로 변환하게 했습니다. 처음에는 `/krds/img/...` 경로를 썼지만, 프로젝트 정적 자산 경로를 `assets` 아래로 모으기 위해 `/assets/krds/img/...`로 바꿨습니다. 이 방식은 새 KRDS 컴포넌트를 추가해도 필요한 이미지 누락으로 404가 나는 위험을 줄입니다.

#### 꼬리 질문 대응

**"필요한 아이콘만 복사하면 안 되나요?"**
가능하지만 KRDS 컴포넌트 추가나 내부 CSS 변경 때 누락을 추적해야 합니다. 현재는 전체 `resources/img`를 동기화해 약간의 정적 파일 증가를 감수하고 안정성을 택했습니다.

**"왜 rewrite로 node_modules를 직접 서빙하지 않았나요?"**
배포 환경에서 `node_modules` 경로를 public contract로 삼는 것은 깨지기 쉽습니다. Next.js의 정적 파일 모델에 맞게 `public/assets`에 명시적으로 publish하는 편이 예측 가능합니다.

## 트러블슈팅 로그

| 문제 | 원인 | 해결 |
| ---- | ---- | ---- |
| Tailwind 크기 utility가 의도보다 작게 보임 | KRDS root `62.5%`로 `1rem`이 10px이 됨 | KRDS CSS 정규화로 root 100% + rem 0.625배 변환 |
| Storybook design-system stories만 별도 보정 필요 | Storybook이 원본 KRDS CSS를 import하고 `useLayoutEffect`로 root를 강제 보정 | Storybook preview도 `krds-normalized.css`를 import하도록 통일 |
| `pnpm --filter @simple-cms/web test` 실패 | 현재 환경의 Playwright Chromium 실행 파일 없음 | unit project는 `pnpm --filter @simple-cms/web exec vitest run --project unit`로 통과 확인. `playwright install chromium`은 ubuntu26.04 미지원으로 실패 |
| `pnpm --filter @simple-cms/web build` 실패 | `/sitemap.xml` prerender 중 로컬 PostgreSQL 미기동 | CSS/TypeScript compile은 통과. DB 필요 빌드는 로컬 DB 기동 후 재실행 필요 |
| Tailwind padding/margin utility가 적용되지 않음 | `krds-react/dist/index.css` bundle의 broad reset이 spacing을 덮음 | `krds-uiux` token/common/component CSS 조합으로 reset-heavy bundle 제거 + `@layer krds-base` 적용 |
| KRDS 아이콘 404 | CSS URL은 `/krds/img/...`를 요청하지만 public 산출물이 없거나 경로가 `/krds/img/img/...`로 중복됨 | 이미지 산출물을 `public/assets/krds/img`로 publish하고 CSS URL을 `/assets/krds/img/...`로 정규화 |

## 한 줄 요약 카드

- **root rem 정규화**: KRDS의 10px root 전제를 앱 전역에 퍼뜨리지 않고, 생성 CSS에서 root 100%와 rem 0.625배 변환으로 흡수했다.
- **Tailwind 기본값 보존**: KRDS Tailwind plugin을 제거해 `text-base`, `p-4`, `sm:` 같은 기본 의미를 유지한다.
- **KRDS 값 표현**: KRDS 고정값은 `text-[17px]`, `p-[24px]`, `rounded-[12px]`, `bg-[#256ef4]`처럼 명시한다.
- **Storybook 동일화**: Storybook도 앱과 같은 정규화 CSS를 import해 문서 환경의 별도 root 보정을 제거했다.
- **asset publish**: KRDS 아이콘은 패키지 안에 있어도 브라우저 URL로 자동 노출되지 않으므로 `public/assets/krds/img`로 복사한다.
- **CSS layer 격리**: KRDS 컴포넌트 CSS는 `krds-base` layer에 두고 Tailwind `utilities`가 뒤에서 필요한 override를 맡는다.

## 추가 학습 자료

- Tailwind CSS Docs — Functions and directives: https://tailwindcss.com/docs/functions-and-directives
- Tailwind CSS Docs — Adding custom styles / arbitrary values: https://tailwindcss.com/docs/adding-custom-styles
- MDN — rem unit: https://developer.mozilla.org/en-US/docs/Web/CSS/length#rem
- Storybook Docs — Styling and CSS: https://storybook.js.org/docs/configure/styling-and-css
