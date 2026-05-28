# 사전학습: KRDS Footer 설정 — SiteSettings JSON · App Router ISR · 메뉴 슬롯 분리

## 왜 이 주제가 필요한가

공개 웹 Footer는 단순 마크업이 아니라 운영자가 계속 수정하는 사이트 정보다. 주소, 연락처, 하단 정책 링크, 퀵링크는 관리자에서 바뀌어야 하지만, 공개 웹은 SEO와 성능 때문에 정적 prerender/ISR 이점을 유지해야 한다. 따라서 **DB 기반 설정값을 정적 페이지에 안전하게 반영하는 경계**를 이해해야 한다.

## 핵심 개념

### 1. SiteSettings JSON 패턴

`SiteSettings`는 key-value 테이블이다. 새 컬럼이나 migration 없이 설정 키를 추가할 수 있다. 여러 필드가 하나의 UI 단위로 함께 저장되어야 할 때는 JSON 문자열을 하나의 key에 저장한다.

이번 구조:

- key: `SITE_FOOTER_CONFIG`
- value: `SiteFooterConfig` JSON 문자열
- 관리 필드: `address`, `contacts`, `quickLinks`, `socialLinks`, `bottomLinks`, `identifierText`, `copyright`, `hideQuickLinks`, `hideIdentifier`

장점:

- Prisma schema 변경 없이 설정 확장 가능
- admin API에서 Zod로 전체 payload 검증 가능
- web은 파싱 실패 시 기본값 fallback 가능

주의점:

- JSON 내부 필드 검색/관계 무결성은 DB가 보장하지 않는다
- 저장 전후 비교는 normalize 후 `JSON.stringify` 등으로 명시 처리해야 한다
- 타입 정의는 `packages/types`에 두어 admin/web이 같은 구조를 사용해야 한다

### 2. KRDS Footer 데이터 역할 분리

Footer에는 성격이 다른 링크가 섞이기 쉽다.

| 데이터 | 관리 위치 | 이유 |
|---|---|---|
| 일반 푸터 탐색 링크 | 메뉴 관리 `FOOTER` 슬롯 | 공개 메뉴 구조와 동일한 운영 흐름 유지 |
| 개인정보처리방침/저작권 정책 | `SITE_FOOTER_CONFIG.bottomLinks` | 정책 링크는 메뉴 트리보다 푸터 하단 고정 성격이 강함 |
| 관련 사이트/기관 바로가기 | `SITE_FOOTER_CONFIG.quickLinks` | KRDS `foot-quick` 영역 전용 데이터 |
| 주소/연락처/식별자/copyright | `SITE_FOOTER_CONFIG` | 사이트 전역 표시 정보 |

이 분리를 하지 않으면 메뉴 관리와 푸터 설정 화면에서 같은 링크를 중복 관리하게 된다.

### 3. App Router 정적화와 DB 설정값 고정 문제

Next.js App Router에서 운영 모드 layout/page가 dynamic API를 호출하지 않으면 정적 prerender가 가능하다. 성능에는 좋지만, DB에서 읽은 설정값이 빌드 시점 HTML에 포함되면 변경 후 재배포 전까지 안 바뀌는 문제가 생긴다.

해결책은 route segment revalidate다.

```ts
export const revalidate = 60;
```

의미:

- 정적 prerender 유지
- 최초 생성 후 60초마다 stale 판단
- stale 요청은 기존 HTML을 제공하고 백그라운드 재생성
- admin 변경이 공개 웹에 최대 1분 내 반영

`revalidate = 0`이나 `cache: 'no-store'`는 매 요청 dynamic SSR이 되어 성능 목표와 충돌한다.

### 4. 인메모리 캐시와 ISR의 관계

`footerConfigCache` 같은 모듈 레벨 인메모리 캐시는 한 서버 인스턴스 안에서 DB 조회를 줄인다. 하지만 이것만으로는 정적 HTML 재생성을 보장하지 않는다.

두 레이어 역할:

| 레이어 | 역할 |
|---|---|
| `footerConfigCache` TTL | 같은 서버 프로세스의 반복 DB 조회 감소 |
| `layout.tsx revalidate = 60` | prerender된 route HTML을 주기적으로 재생성 |

둘 중 하나만 있으면 부족하다. 인메모리 TTL만 있고 route가 완전 static이면 HTML이 갱신되지 않는다.

## 구현 전 체크리스트

- `packages/types`에 Footer config 타입과 기본값을 둔다
- admin API는 `settings:read|update` 권한과 audit log를 포함한다
- admin form은 배열 필드의 max 개수와 URL 정책을 UI + Zod 양쪽에서 검증한다
- web parse 실패 시 fallback하고 페이지 렌더를 막지 않는다
- 공개 footer 일반 링크는 `FOOTER` 슬롯 메뉴를 계속 사용한다
- Root layout에 `revalidate = 60`을 두어 운영 빌드에서 정적화와 갱신을 동시에 만족시킨다
- build route table에서 `/`가 `Revalidate 1m`로 표시되는지 확인한다

## 설명 가능 체크리스트

- SiteSettings JSON이 migration보다 적합한 이유를 설명할 수 있다
- `FOOTER` 슬롯 링크와 `bottomLinks`를 분리한 이유를 설명할 수 있다
- 인메모리 캐시만으로는 정적 HTML 갱신이 안 되는 이유를 설명할 수 있다
- `revalidate = 60`이 `force-dynamic`보다 나은 이유를 설명할 수 있다
- admin 변경 후 공개 웹 반영이 즉시가 아니라 최대 1분인 이유를 설명할 수 있다
