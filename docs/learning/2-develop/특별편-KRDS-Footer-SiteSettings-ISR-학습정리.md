# 학습정리: KRDS Footer 설정 — SiteSettings JSON · admin 폼 · web 캐시 · ISR 반영

## 구현 요약

공개 웹 Footer를 KRDS Default 구조로 확장하고, 관리자 `/settings/footer`에서 주소·연락처·퀵링크·소셜 링크·하단 정책 링크·식별자·copyright를 관리할 수 있게 했다. 일반 푸터 탐색 링크는 새 설정으로 중복 관리하지 않고 기존 메뉴 관리의 `FOOTER` 슬롯을 유지했다. web은 `SITE_FOOTER_CONFIG`를 인메모리 TTL 캐시로 읽고, `apps/web/app/layout.tsx`에 `revalidate = 60`을 추가해 운영 모드 정적 prerender와 설정 변경 반영을 함께 만족시켰다.

## 프로젝트 코드 기반 설명

### 1. 공용 타입과 기본값

`packages/types/src/domain/footer.types.ts`에 `SiteFooterConfig`와 `DEFAULT_SITE_FOOTER_CONFIG`를 추가했다. admin과 web이 같은 필드 구조를 공유하므로 API 응답, form schema, web parser가 어긋날 가능성을 줄였다.

핵심 필드:

- `contacts[]`: 대표전화/이용문의 같은 제목+설명 쌍
- `quickLinks[]`: KRDS `foot-quick` 버튼 목록
- `socialLinks[]`: instagram/youtube/x/facebook/blog 플랫폼 링크
- `bottomLinks[]`: 개인정보처리방침 등 하단 정책 링크
- `hideQuickLinks`, `hideIdentifier`: 영역 표시 토글

### 2. admin `/settings/footer`

추가 파일:

- `apps/admin/app/(authenticated)/settings/footer/page.tsx`
- `apps/admin/app/api/settings/footer/route.ts`
- `apps/admin/src/pages/site-settings/ui/FooterSettingsPage.tsx`
- `apps/admin/src/features/site-settings/ui/FooterSettingsForm.tsx`

기존 사이트 설정 패턴을 그대로 따랐다.

- Server Page에서 query prefetch + HydrationBoundary
- API Route에서 `requirePermission('settings', 'read|update')`
- `updateFooterSchema`로 Zod 검증
- `setSiteSetting(SITE_FOOTER_CONFIG, JSON.stringify(nextValue))`
- 변경 시 `SITE_SETTINGS UPDATE` audit log 기록

설계상 중요한 점은 `FOOTER` 슬롯 메뉴를 이 화면에 넣지 않은 것이다. 운영자가 탐색 메뉴를 메뉴 관리에서 이미 관리하고 있으므로, 푸터 설정 화면은 기관 정보와 정책 링크만 담당한다.

### 3. web Footer 렌더링

`apps/web/src/shared/lib/footerConfigCache.ts`가 `SITE_FOOTER_CONFIG`를 읽고 Zod로 파싱한다. 실패하면 `DEFAULT_SITE_FOOTER_CONFIG`를 반환해 공개 페이지 렌더를 막지 않는다.

`apps/web/src/widgets/layout/ui/PageLayout.tsx`는 다음 데이터를 KRDS `Footer` props로 매핑한다.

- `quickLinks` → `FooterQuickLink[]`, `onClick`에서 `window.open` 또는 `window.location.href`
- `footerMenuItems` → `links`
- `socialLinks` → `FooterSocialLink[]`
- `bottomLinks` → `FooterBottomLink[]`
- `copyright` 미설정 → `© ${branding.siteName}. All rights reserved.` fallback
- `identifierText` 미설정 → 중립 문구 fallback

`PageLayout`은 Client Component라 quickLink `onClick`에서 browser API를 사용할 수 있다.

### 4. 퀵링크 미노출 원인과 해결

증상: admin에서 퀵링크를 저장해도 공개 페이지에서 `foot-quick` 영역이 보이지 않았다.

확인한 사실:

- `krds-react`의 `FooterQuickLinks`는 `quickLinks` 배열이 비어 있지 않고 `hideQuickLinks !== true`이면 `.foot-quick`을 렌더한다
- `PageLayout`은 `quickLinks` prop을 정상적으로 넘기고 있었다
- 문제는 운영 모드 RootLayout 정적화로 인해 DB 설정이 빌드 시점 값으로 고정될 수 있다는 점이었다

해결:

```ts
// apps/web/app/layout.tsx
export const revalidate = 60;
```

이 변경으로 `/` 빌드 결과가 `Revalidate 1m`로 표시되어, 정적 prerender를 유지하면서 admin 변경이 최대 1분 내 반영된다.

## 동작 원리 심화

### 인메모리 TTL과 ISR은 서로 다른 캐시다

`footerConfigCache`는 서버 프로세스 안에서 DB 조회 결과를 60초 보관한다. 하지만 이미 생성된 정적 HTML을 다시 만들지는 않는다. 반대로 `revalidate = 60`은 route HTML을 재생성하지만, 재생성 시점의 DB 조회가 매번 비싸질 수 있다. 그래서 둘을 같이 사용했다.

| 장치 | 해결하는 문제 |
|---|---|
| `footerConfigCache` | 반복 요청의 DB round-trip 감소 |
| `revalidate = 60` | 정적 HTML의 주기적 재생성 |

### 왜 `force-dynamic`이 아니었나

Footer 설정은 초 단위 실시간성이 필요하지 않다. 운영자가 변경 후 1분 내 반영이면 충분하다. `force-dynamic`은 매 요청마다 서버 렌더링을 강제해 Stage 18에서 확보한 정적화 이점을 없앤다. ISR은 운영 UX와 성능 사이의 균형점이다.

## 트러블슈팅 로그

| 증상 | 확인 | 결론 |
|---|---|---|
| 퀵링크 저장 후 공개 웹 미노출 | `krds-react` dist 구현 확인 | `quickLinks` prop 자체는 맞음 |
| `FooterQuickLink`에 `href` 없음 | 타입 확인 | `onClick`으로 이동 처리 필요 |
| 인메모리 TTL이 있는데도 미반영 | App Router 정적 prerender 검토 | HTML 재생성에는 route segment revalidate 필요 |
| Next route config 동적 표현 불가 | Stage 18 학습 재사용 | 정적 리터럴 `export const revalidate = 60` 사용 |

## 검증

- `pnpm --filter @simple-cms/admin typecheck`
- `pnpm --filter @simple-cms/web typecheck`
- `pnpm --filter @simple-cms/admin lint`
- `pnpm --filter @simple-cms/web lint`
- `pnpm --filter @simple-cms/web build-storybook`
- `pnpm --filter @simple-cms/web build`

web build route table에서 `/`가 `Revalidate 1m`로 표시됨을 확인했다.

## 면접 예상 질문

### Q1. 왜 Footer 설정을 별도 테이블이나 컬럼이 아니라 SiteSettings JSON으로 저장했나요?

Footer 설정은 전역 singleton 성격이고, 검색/조인/정렬 대상이 아니다. 하나의 화면에서 통째로 읽고 저장하므로 key-value JSON이 migration 비용 없이 가장 단순하다. 단, 타입 안전성은 `packages/types`와 Zod schema로 보완했다.

### Q2. `FOOTER` 슬롯 메뉴와 `bottomLinks`를 왜 분리했나요?

탐색 링크와 정책 링크는 운영 목적이 다르다. 탐색 링크는 메뉴 구조와 연결 대상 관리가 중요해서 기존 메뉴 관리가 맞고, 개인정보처리방침 같은 정책 링크는 Footer 하단 고정 데이터라 Footer 설정이 맞다. 분리하지 않으면 같은 링크를 두 화면에서 중복 관리하게 된다.

### Q3. 인메모리 캐시가 있는데 왜 `revalidate = 60`이 필요했나요?

인메모리 캐시는 DB 조회 결과만 줄인다. App Router가 route를 정적으로 prerender하면 HTML 자체가 빌드 시점 값으로 남을 수 있다. `revalidate = 60`은 route HTML 재생성을 지시하므로 설정 변경 반영에 필요하다.

### Q4. 왜 매 요청 SSR로 바꾸지 않았나요?

Footer 설정은 즉시성이 낮고 공개 웹은 성능/SEO가 중요하다. 매 요청 SSR은 필요 이상의 비용이다. ISR 60초는 정적 응답 성능과 운영 변경 반영 사이의 균형이다.

## 한 줄 요약 카드

- `SITE_FOOTER_CONFIG`는 Footer 전역 설정을 SiteSettings JSON으로 관리하는 패턴이다
- 일반 푸터 탐색은 기존 `FOOTER` 슬롯, 정책 링크는 `bottomLinks`로 분리한다
- `footerConfigCache`는 DB 조회 캐시이고, `revalidate = 60`은 정적 HTML 재생성 장치다
- 퀵링크 미반영은 prop 문제가 아니라 App Router 정적화/ISR 경계 문제였다
