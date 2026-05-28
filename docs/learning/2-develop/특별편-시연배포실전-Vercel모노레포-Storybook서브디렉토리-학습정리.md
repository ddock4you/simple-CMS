# 학습정리: 시연 배포 실전 — Vercel 모노레포 + Storybook sub-directory + Supabase 연결 함정

## 구현 요약

시연 PR1-7로 시연 모드 코드는 완성된 상태에서 **실제 Vercel + Supabase 배포 단계에서 마주친 12종 함정을 디버깅하고 7개 commit으로 fix**. push-and-pray 사이클(5회 이상)에 빠진 뒤 advisor 조언("로컬 ground truth 먼저 검증")을 수용해 디버깅 사이클을 단축한 경험. 최종적으로 4-layer Storybook patch + 모노레포 배포 정합성 문서를 정리해 다음 운영자가 같은 함정에 재현하지 않도록 메모리 + 가이드 + 사전/학습정리 4개 문서로 단일 출처화.

## 핵심 학습 포인트

### 1. Prisma `postinstall` lifecycle — gitignored generated client의 빌드 자동화

#### 개념

Prisma의 generator output을 `.gitignore` 대상으로 두고, npm/pnpm lifecycle 스크립트 `postinstall`로 `prisma generate`를 자동 실행시키는 패턴.

#### 동작 원리 심화

`packages/db/prisma/schema.prisma`의 generator 설정:
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}
```

→ `packages/db/src/generated/prisma/` 에 client.js, client.d.ts, runtime 디렉토리, schema.prisma 사본 등이 생성. 이 디렉토리를 `.gitignore`에 등록하면 bundle 크기·머지 충돌 회피 가능. 하지만 **runtime에 이 파일들이 없으면** `import { Prisma } from '../generated/prisma/client'` 호출이 모두 `Module not found`로 깨짐.

`postinstall: prisma generate`를 추가하면 npm/pnpm이 `pnpm install` 직후 자동 실행하여 빈 디렉토리를 채운다. pnpm v10은 보안상 일부 의존성의 build script를 차단하지만, `pnpm-workspace.yaml`의 `onlyBuiltDependencies`에 `prisma` + `@prisma/engines`가 등록되어 있어 통과.

#### 프로젝트 코드에서의 적용

`packages/db/package.json:11`:
```json
"scripts": {
  "postinstall": "prisma generate",
  "test": "vitest run",
  ...
}
```

`pnpm-workspace.yaml:4-7`:
```yaml
onlyBuiltDependencies:
  - "@prisma/engines"
  - "esbuild"
  - "prisma"
```

검증 시퀀스 (로컬):
```bash
rm -rf packages/db/src/generated
pnpm install --frozen-lockfile
# → packages/db postinstall$ prisma generate
# → ✔ Generated Prisma Client (v7.7.0) to ./src/generated/prisma in 590ms
ls packages/db/src/generated/prisma/  # client.js 등 존재
```

#### 설계 판단

대안 검토:
- **옵션 B (Vercel Build Command에 `pnpm db:generate` 명시)**: Vercel UI 수정 필요 + 시연 가이드 문서도 수정 필요 + 로컬 신규 clone 사용자가 별도 명령 필요
- **옵션 C (turbo build에 db:generate 통합)**: Vercel Build Command가 `pnpm --filter ... build`(`turbo run`이 아님)라 `^build` 의존성 트리거 위해 setup 필요
- **옵션 A 채택 (postinstall)** — pnpm/npm 에코시스템 표준, 단일 출처(`packages/db/package.json` 1줄), 모든 환경(로컬 + CI + Vercel + Docker) 자동 동작

Dockerfile은 명시적 `RUN pnpm --filter @simple-cms/db generate`를 별도로 갖고 있어 영향 없음(`pnpm install`에서 한 번, builder 단계에서 한 번, 총 2회 실행되지만 idempotent라 무해).

---

### 2. Vercel monorepo 프로젝트 설정 정합성

#### 개념

Vercel monorepo 프로젝트의 **Root Directory · Build Command · Install Command** 세 항목이 한 묶음으로 동작하며, 한쪽 수정이 다른 쪽을 자동 reset할 수 있다는 운영 원칙.

#### 동작 원리 심화

| 항목 | 역할 | 변경 영향 |
|---|---|---|
| Root Directory | framework 자동 감지 + 빌드 cwd | 수정 시 **Build/Install Command가 자동 감지 모드로 reset** |
| Build Command | task 호출 명령 | Override 토글 OFF면 매번 자동 감지 → turbo가 있으면 `turbo run build` |
| Install Command | 의존성 설치 명령 | 동일 — Override OFF면 자동 감지 |

Vercel의 자동 감지:
- monorepo + turbo 감지 → `turbo run build` 사용 → **Turborepo env sandbox 동작**
- monorepo + pnpm filter 명시 → `pnpm --filter ... build` 사용 → sandbox 우회

#### 프로젝트 코드에서의 적용

`docs/react-cms-시연모드-배포-가이드.md` 2-1/2-3절:

| 항목 | admin 프로젝트 | web 프로젝트 |
|---|---|---|
| Root Directory | `apps/admin` | `apps/web` |
| Build Command | `cd ../.. && pnpm --filter @simple-cms/admin build` | `cd ../.. && pnpm --filter @simple-cms/web build:demo` |
| Install Command | `cd ../.. && pnpm install --frozen-lockfile` | (동일) |

이번 배포 중 운영자가 Root Directory를 `apps/admin`(잘못된 값)에서 `apps/web`(올바른 값)으로 정정했을 때 Build/Install Command가 자동 reset되어 `turbo run build`로 변경 → web 빌드 실패. **Override 토글 켜고 두 Command 명시 재입력** 필수.

#### 설계 판단

monorepo Vercel 배포는 **자동 감지에 의존하지 말고 명시 지정**이 안전. 시연 가이드도 "꼭 변경"이라고 강조하고 있지만, 이번 디버깅 경험으로 가이드 부록 B에 "Root Directory 수정 시 Build/Install Command가 reset된다"는 함정을 명시 추가.

---

### 3. Next.js basePath ↔ Vercel rewrites trailing slash 충돌 → 308 무한 redirect

#### 개념

Vercel rewrites의 `:path*` catch-all 패턴이 **`path*=빈 값`** 매칭으로 destination을 trailing slash 형태로 만들고, admin Vercel CDN의 자동 trailing slash 정규화(`/admin/` → `/admin`)와 충돌해 자기 자신으로 308 무한 redirect되는 패턴.

#### 동작 원리 심화

web의 rewrites (수정 전):
```typescript
{ source: '/_cms/admin/:path*', destination: `${adminRewriteUrl}/_cms/admin/:path*` }
```

흐름 분석:
1. visitor → `https://web/_cms/admin` (trailing slash 없음)
2. web rewrites가 path*=빈 매칭 → destination이 `https://admin/_cms/admin/` (trailing slash 포함) 형태로 proxy
3. admin Vercel CDN의 자동 정규화: `HTTP/2 308 + Location: /_cms/admin` (slash 제거)
4. browser는 web origin 기준 `/_cms/admin`로 다시 요청
5. → 1번부터 무한 루프 → `ERR_TOO_MANY_REDIRECTS`

curl로 직접 확인:
```bash
curl -IL https://simple-cms-admin-demo.vercel.app/_cms/admin/
# HTTP/2 308
# location: /_cms/admin
# refresh: 0;url=/_cms/admin     ← Vercel CDN의 trailing slash 정규화
```

#### 프로젝트 코드에서의 적용

`apps/web/next.config.ts:29-44` — root path 명시 룰을 catch-all 위에 추가:
```typescript
async rewrites() {
  return [
    // root path 명시 — 308 loop 차단
    { source: '/_cms/admin', destination: `${adminRewriteUrl}/_cms/admin/dashboard` },
    // 기존 catch-all (변경 없음)
    { source: '/_cms/admin/:path*', destination: `${adminRewriteUrl}/_cms/admin/:path*` },
  ];
}
```

visitor `/_cms/admin` 진입 시 첫 룰이 매칭되어 admin Vercel의 `/_cms/admin/dashboard`로 직행 → trailing slash 정규화 발동 안 함 → ensureDemoSession → splash → 정상 흐름.

#### 설계 판단

대안 검토:
- **`trailingSlash: true` 전역 설정**: web 전체 다른 라우트(`/p/about`, `/board/free` 등)에 영향. SEO + URL 정책 변경 큼
- **`skipTrailingSlashRedirect: true` + Next.js redirects()**: Vercel 정규화와의 충돌 회피이지만 설정 복잡도 증가
- **root path 명시 rewrite 추가 채택**: 영향 범위 최소 + 의도 명확 (visitor가 admin root 진입 시 dashboard로 직행)

---

### 4. Next.js client-side `fetch`의 basePath 미적용

#### 개념

Next.js의 `basePath: '/_cms/admin'` 설정은 server-side routing + server-side `redirect()`에는 자동 적용되지만, **client-side `fetch(url)`은 자동 prepend되지 않는다**. 모든 client fetch는 명시 prefix 필요.

#### 동작 원리 심화

```typescript
// ❌ 잘못된 코드 (이번 디버깅 전)
const BOOTSTRAP_ENDPOINT = '/api/demo/bootstrap';
await fetch(BOOTSTRAP_ENDPOINT, { method: 'POST' });
// → page origin 기준 → https://web/api/demo/bootstrap → 404
```

이전 코드의 주석에 "admin은 basePath 자동 prepend"라는 **잘못된 가정**이 박혀 있었음. admin AGENTS.md에는 명확히 "Next.js fetch는 basePath 자동 prepend 안 함"이 명시되어 있지만, 코드 주석이 반대로 적혀 있어 발견되기 어려운 함정.

#### 프로젝트 코드에서의 적용

`apps/admin/app/demo-bootstrap/DemoBootstrapClient.tsx:21-25`:
```typescript
// Next.js의 client-side fetch는 basePath를 자동 prepend하지 않으므로 명시 prefix 필수.
// admin Vercel 직접 접근(같은 origin) + web origin 통한 진입(web rewrites로 admin proxy)
// 양쪽 모두에서 정확히 admin의 bootstrap endpoint로 도달.
const BOOTSTRAP_ENDPOINT = '/_cms/admin/api/demo/bootstrap';
```

웹 origin 통한 호출:
- page origin: web URL
- fetch: `https://web/_cms/admin/api/demo/bootstrap`
- web rewrites가 admin proxy → admin이 bootstrap 처리 + Set-Cookie 응답
- browser는 web origin URL을 본 거라 cookie를 web 도메인에 저장 → 다음 요청에 자동 첨부

admin Vercel URL 직접 호출:
- page origin: admin URL
- fetch: `https://admin/_cms/admin/api/demo/bootstrap`
- admin basePath 적용된 endpoint → 정상

#### 설계 판단

web splash의 `DemoBootstrapClient.tsx`는 처음부터 절대 path(`/_cms/admin/api/demo/bootstrap`)를 명시했지만, admin splash는 "같은 origin이라 basePath 자동 prepend"라는 (잘못된) 가정으로 `/api/demo/bootstrap`만 적었음. **admin/web 양쪽 splash가 fetch 코드 100% 동일해야** 한다는 합의가 부족했던 것. 이번 fix로 양쪽 모두 절대 path 사용.

---

### 5. Storybook sub-directory 4-layer fix

#### 개념

Storybook 빌드 산출물은 deployment-root 기준으로 가정되어 있어 sub-directory(`/_cms/storybook/{admin|web}/`)에 서빙할 때 **4가지 layer에서 path 깨짐**. 각 layer는 다른 메커니즘이라 별도 처리 필요.

#### 동작 원리 심화

**Layer 1: vite preview (iframe.html의 asset)**
- viteFinal에서 `config.base = process.env.STORYBOOK_BASE_PATH` 주입 → asset이 절대 path로 빌드됨
- 영향 범위: `/assets/iframe-XXX.js`, CSS 등 vite output

**Layer 2: HTML element 속성** (`<link href>`, `<script src>`)
- Storybook Manager 빌더(viteFinal 무영향, 별도 builder)가 `<link href="./sb-manager/runtime.js" rel="modulepreload" />` 형태로 박음
- 후처리 정규식 `((?:src|href)=["'])\.\/`로 `./` → 절대 path 치환

**Layer 3: inline ES module import 문** (`<script type="module">import './X.js'</script>`)
- `import` 문도 base URL 기준 resolve지만 정규식 (2)와 다른 위치
- 별도 정규식 `(\bimport[\s(]+["'])\.\/`로 처리

**Layer 4: JS `fetch()`, CSS `url()`, 기타 동적 URL**
- Storybook의 stories 목록용 `fetch('./index.json')` 같은 동적 호출은 정규식으로 못 잡음
- HTML `<base href="/_cms/storybook/admin/" />` 명시 주입으로 모든 미명시 relative URL을 sub-dir 기준으로 강제 resolve
- 절대 URL은 base href 무관 → 이미 patch된 (1)-(3)과 충돌 없음
- idempotent: `<base href=`가 이미 있으면 skip

#### 프로젝트 코드에서의 적용

`apps/web/scripts/bundle-storybooks.mjs`의 후처리 블록:
```javascript
for (const { name } of STORYBOOKS) {
  const dir = path.join(finalBase, name);
  const absBase = `/_cms/storybook/${name}`;
  for (const htmlFile of ['index.html', 'iframe.html']) {
    const file = path.join(dir, htmlFile);
    let content = await readFile(file, 'utf-8');
    
    // (a) HTML 속성
    content = content.replace(/((?:src|href)=["'])\.\//g, `$1${absBase}/`);
    
    // (b) inline ES module import
    content = content.replace(/(\bimport[\s(]+["'])\.\//g, `$1${absBase}/`);
    
    // (c) <base href> 주입 (idempotent)
    if (!content.includes('<base href=')) {
      if (content.match(/<base\s+target="_parent"\s*\/>/)) {
        // iframe.html: 기존 <base target="_parent" />를 확장
        content = content.replace(
          /<base\s+target="_parent"\s*\/>/,
          `<base href="${absBase}/" target="_parent" />`,
        );
      } else {
        // index.html: <head> 직후 새 <base href> 삽입
        content = content.replace(/<head>/, `<head>\n    <base href="${absBase}/" />`);
      }
    }
    
    await writeFile(file, content);
  }
}
```

`apps/admin/.storybook/main.ts` + `apps/web/.storybook/main.ts`:
```typescript
async viteFinal(viteConfig) {
  if (process.env.STORYBOOK_BASE_PATH) {
    viteConfig.base = process.env.STORYBOOK_BASE_PATH;
  }
  return viteConfig;
},
```

bundle-storybooks가 `STORYBOOK_BASE_PATH: '/_cms/storybook/${name}/'` env로 전달.

#### 설계 판단

처음엔 정규식만으로 모든 path를 잡으려 했음. 그러다 `vite-inject-mocker-entry.js`(누락) → 정규식 일반화 → 그 다음 `fetch('./index.json')`이 base URL 의존이라 정규식으로 못 잡음을 발견. **`<base href>` 명시 주입이 가장 광범위한 안전망**이라는 결론. 4-layer를 순서대로 누적 적용한 흐름은 4개 commit으로 기록(`9d4cfad → 214f230 → 7d27295 → d4b795c`).

advisor가 처음에 "advisor 시나리오 A/B/C 중 어느 것인지 로컬 진단부터" 라고 지적했지만, 실제 시나리오는 advisor의 3가지에 정확히 안 맞는 중간 형태(파일은 sub-dir에 존재 + relative path 사용)였음. 로컬 진단으로 정확히 판별한 뒤 처음부터 4-layer를 한 번에 design했어야 push 사이클이 짧았을 것.

---

### 6. URL Base 해석 메커니즘 + trailing slash 의존성

#### 개념

브라우저의 URL 해석은 base URL 기준이고, base URL은 현재 페이지 URL에서 마지막 segment를 제외한 디렉토리. **trailing slash 유무에 따라 결정적으로 갈라진다**. `<base href>` HTML 태그로 명시 override 가능.

#### 동작 원리 심화

| 페이지 URL | base URL | `./X.js` resolve |
|---|---|---|
| `/_cms/storybook/admin/` (slash O — 디렉토리로 해석) | `/_cms/storybook/admin/` | `/_cms/storybook/admin/X.js` ✅ |
| `/_cms/storybook/admin` (slash X — 파일로 해석) | `/_cms/storybook/` | `/_cms/storybook/X.js` ❌ |
| `<base href="/_cms/storybook/admin/">` 명시 | `/_cms/storybook/admin/` (강제) | 페이지 URL 무관 ✅ |

**`<base href>` 영향 범위**:
- HTML element의 relative URL: `<a href>`, `<img src>`, `<script src>`, `<link href>`, form action 등
- `document.baseURI` 기반 fetch: `fetch('./X.json')`은 `document.baseURI` 사용 → base href 영향
- ES module `import './X.js'`: module URL 기준 (module 자신이 어디서 load됐는지)

**`<base href>` 영향 못 미치는 곳**:
- CSS `url()`: CSS 파일 자체 위치 기준 (HTML base 무관)
- 절대 URL (`/...`, `https://...`): base 무시

#### 프로젝트 코드에서의 적용

이번 디버깅 중 사용자가 보낸 콘솔 로그:
```
GET https://web/_cms/storybook/sb-manager/runtime.js 404 (Not Found)
                              ^^^^^^^^^^^^
                              /admin/ 누락!
```

진단:
1. 사용자가 `/_cms/storybook/admin` (trailing slash 없음)으로 접근
2. base URL이 `/_cms/storybook/`로 해석 (admin은 파일명)
3. JS 내부 `fetch('./index.json')` 호출 → `/_cms/storybook/index.json` → 404
4. 404 응답이 web Next.js layout gate를 거치며 `NEXT_REDIRECT;/demo-bootstrap...`로 인터셉트 → 사이드 메뉴 콘솔에 NEXT_REDIRECT 에러

해결: `<base href="/_cms/storybook/admin/" />` 주입 → 페이지 URL 무관하게 sub-dir 기준 resolve.

#### 설계 판단

가장 명확한 단서는 **사용자가 보낸 404 URL 패턴 자체**. `/admin/`이 누락된 형태는 base URL 의존을 시사 → 정규식 patch는 한계 → `<base href>` 안전망 필요.

이는 advisor가 처음에 "advisor 시나리오 A/B/C 중 어느 것인지 정확한 진단 먼저"라고 강조한 이유와 일치. 사용자의 실제 콘솔 URL 한 줄이 결정적 단서였음.

---

### 7. 로컬 ground truth 검증으로 push 사이클 단축

#### 개념

Vercel 빌드(5~8분) → 결과 확인 → 또 깨짐 → 다시 push 사이클은 한 번 진입하면 시간을 빠르게 소진. 로컬에서 정확히 같은 빌드를 한 번 돌리고 산출물을 직접 검증하면 시나리오를 좁히고 fix를 정확히 1번에 끝낼 수 있다.

#### 동작 원리 심화

advisor의 조언:
> Stop before next push. You've burned 5+ Vercel rebuilds already (each is 5-8 min). The cycle is: change → push → wait → check → still broken. Break that cycle by diagnosing locally first.

advisor가 제시한 3시나리오 진단표:

| Scenario | sb-manager files exist at sub-dir? | index.html references | Fix |
|---|---|---|---|
| A | Yes | `/sb-manager/...` (wrong) | HTML search-replace |
| B | No | `/sb-manager/...` | Manager builder doesn't honor base |
| C | Yes | references encoded inside JS | JS post-process |

> **Don't guess which scenario without checking.** Each leads to a different fix.

#### 프로젝트 코드에서의 적용

실제 검증 사이클 (push-and-pray 회피):
```bash
# 1. Vercel과 정확히 같은 스크립트
pnpm --filter @simple-cms/web exec node scripts/bundle-storybooks.mjs

# 2. 산출물 ground truth 확인 (30초)
ls apps/web/public/_cms/storybook/admin/sb-manager 2>&1   # 존재 여부
grep -nE '(src|href)="[^"]+"' apps/web/public/_cms/storybook/admin/index.html | head -10
grep -E 'import ' apps/web/public/_cms/storybook/admin/index.html | head -10
grep '<base' apps/web/public/_cms/storybook/admin/index.html
```

`bvjd8es7b` (재빌드 ID)로 background에 빌드 돌리고, 4분 ScheduleWakeup으로 결과 확인하는 패턴 정착.

검증이 모두 통과한 후에야 commit + push → Vercel 빌드 1회로 끝.

#### 설계 판단

advisor의 충고를 받기 전 5회 push 사이클 소진 → 약 30~40분 낭비. **advisor 조언을 받은 후로는 로컬 검증을 거친 commit만 push**, 그 결과 마지막 4-layer fix는 정확히 의도대로 동작.

또한 advisor가 "advisor 호출은 두 답변(빌드 결과)을 받은 뒤에 하는 게 낫다 — 지금 advisor를 부르면 같은 추측을 반복할 가능성이 큽니다 — advisor도 로그가 어디서 잘렸는지, env var 상태가 어떤지 모르니까요"라고 한 조언도 중요한 학습 포인트. **데이터 수집 → 분석 → action 순서**.

---

## 레거시 경험과의 연결

### Apache mod_rewrite vs Vercel rewrites

레거시: Apache의 `mod_rewrite`는 RewriteRule + RewriteCond로 path → file system path 매핑. trailing slash는 `DirectorySlash On/Off`로 명시 선택. 정적 파일 우선 매칭 후 fallback.

이번 프로젝트: Vercel은 `rewrites` (next.config.ts) + 자동 trailing slash 정규화 (CDN layer). 두 layer가 충돌하면 308 무한 redirect 같은 함정 발생. Apache처럼 단일 layer가 아님 → 양쪽 layer 모두 의식해야 함.

레거시 경험이 도움된 부분: Apache의 RewriteRule도 path*=빈 매칭에서 destination이 trailing slash 형태로 만들어지는 동작은 동일. URL 정규화 정책은 web server 종류와 무관하게 항상 검증 대상.

### Tomcat WAR 배포 vs Vercel monorepo 배포

레거시: 단일 WAR 파일에 모든 module이 묶여 배포. 한 모듈의 빌드 실패는 전체 배포 실패. 환경변수는 `context.xml` 또는 `web.xml`에 명시.

이번 프로젝트: Vercel은 admin/web 두 프로젝트가 독립 배포. 한쪽 빌드 실패가 다른 쪽에 영향 없음. **하지만** Root Directory · Build Command · Install Command의 정합성을 운영자가 직접 관리해야 함 → 휴먼 에러 증가.

레거시에서의 고민이 모던 환경에서는 어떻게 해결: WAR 단일 배포는 atomic이지만 partial deployment 어려움. Vercel monorepo는 partial deployment가 자연스러움 (admin만 또는 web만 재배포 가능) — 운영 유연성 증가 + 설정 정합성 책임도 운영자에게.

### JDBC connection pool vs Supabase Transaction/Session pooler

레거시: WAS의 JDBC connection pool은 단일 풀. 마이그레이션 SQL과 운영 트래픽이 같은 풀 공유.

이번 프로젝트: Supabase는 **Transaction pooler (port 6543, pgbouncer)**와 **Session pooler (port 5432)**가 별도. Prisma migrate/`db push` 같은 schema 작업은 Session, 운영 트래픽은 Transaction. pgbouncer transaction mode의 prepared statement 제약 때문에 분리.

레거시 경험: 마이그레이션 중 운영 트래픽이 연결 풀을 점유해 충돌하던 케이스가 모던에서는 pooler 분리로 자연 해결.

---

## 면접 예상 질문 & 답변

### Q1. Vercel 빌드가 "Module not found: Can't resolve './generated/prisma/client'"로 실패했는데 어떻게 해결하셨나요?

#### 답변 예시

Prisma의 generator output을 커스텀 경로(`packages/db/src/generated/prisma`)에 두고 `.gitignore`로 추적 제외한 구조였습니다. 로컬 개발에서는 `pnpm db:generate`로 client를 생성해 정상 동작했지만, Vercel 빌드 환경에서는 `pnpm install --frozen-lockfile`만 실행되고 그 디렉토리가 빈 채로 `next build`가 진행되어 import 실패가 6건 발생했습니다.

해결은 `packages/db/package.json`에 `"postinstall": "prisma generate"` 1줄 추가입니다. npm/pnpm 표준 lifecycle script라 Vercel/Docker/로컬 신규 clone 모두에서 자동 실행되고 멱등합니다. Dockerfile은 명시적으로 `pnpm db:generate`를 별도 실행하고 있어 무관했지만, Vercel처럼 표준 lifecycle만 거치는 환경은 postinstall 없이는 깨졌습니다.

대안으로 Vercel UI의 Build Command에 `pnpm db:generate && pnpm build`를 명시하는 방법도 검토했지만, 운영자 설정 의존성이 늘고 시연 가이드 문서도 동시 수정해야 해서 코드 단일 출처 원칙에 따라 postinstall 채택했습니다. pnpm v10의 build script 차단 정책은 `pnpm-workspace.yaml`의 `onlyBuiltDependencies`에 `prisma` + `@prisma/engines`가 이미 등록되어 있어 통과했습니다.

#### 꼬리 질문 대응

**"왜 generated/ 디렉토리를 git에 포함하지 않나요?"**
bundle 크기 + 머지 충돌 회피가 주 이유입니다. Prisma client는 모델당 ~수 KB지만 17개 모델 + runtime + engine binary까지 포함하면 빌드물이 크고, schema 변경 시마다 거대한 diff가 발생해 PR 리뷰가 어려워집니다. postinstall로 환경마다 자동 재생성하는 게 표준 패턴입니다.

**"postinstall이 매번 실행되면 빌드 시간이 늘지 않나요?"**
첫 install에서는 ~3-5초 추가됩니다. 다만 schema.prisma 변경 없으면 Prisma가 자체 cache로 통과시켜 거의 즉시 끝납니다. CI에서 캐시 적중 시 100ms 이내. 빌드 전체 시간 대비 무시 가능 수준입니다.

### Q2. `ERR_TOO_MANY_REDIRECTS` 무한 308 redirect를 어떻게 진단하고 해결했나요?

#### 답변 예시

증상은 web origin의 `/_cms/admin`에 접근하면 모든 응답이 status 308이고 Location 헤더가 자기 자신(`/_cms/admin`)을 가리켰습니다. browser DevTools Network 탭에서 redirect chain이 무한 반복으로 보였습니다. JS 실행 전 server-side에서 발생하므로 일반적인 client-side debugging이 적용 안 되는 상황이었습니다.

curl로 admin Vercel URL을 직접 호출해 정확한 동작을 추적했습니다. `/_cms/admin/` (trailing slash 있음)로 호출하면 admin Vercel CDN이 308로 `/_cms/admin` (slash 제거)로 redirect한 뒤 그 다음 chain은 정상이라는 사실을 발견했습니다. 즉 **Vercel의 자동 trailing slash 정규화**가 동작 중이었습니다.

원인은 web의 rewrites가 `{ source: '/_cms/admin/:path*', destination: '${adminRewriteUrl}/_cms/admin/:path*' }` 단일 패턴이었고, `path*=빈 값` 매칭에서 destination이 trailing slash 형태로 만들어져 admin Vercel에 도달하면 정규화 308이 발동해 browser가 web origin 기준 `/_cms/admin`로 다시 요청 → 무한 루프였습니다.

해결은 root path 단독 진입을 명시 처리하는 룰을 catch-all 위에 추가하는 것입니다. `{ source: '/_cms/admin', destination: '${adminRewriteUrl}/_cms/admin/dashboard' }`로 visitor가 root에 진입하면 admin Vercel의 `/dashboard` (trailing slash 없는 형태)로 직행시켜 정규화 발동을 차단했습니다. 영향 범위 최소 + 의도 명확이라는 점에서 trailingSlash 전역 설정보다 안전했습니다.

#### 꼬리 질문 대응

**"Vercel의 자동 trailing slash 정규화는 끄거나 변경할 수 있나요?"**
Next.js의 `trailingSlash: true` 설정으로 반대 방향 정규화(slash 추가)로 바꿀 수 있고, `skipTrailingSlashRedirect: true`로 Next.js 측 정규화는 끌 수 있습니다. 다만 Vercel CDN layer의 정규화는 별개라 양쪽을 함께 의식해야 합니다. 이번 케이스는 web 전체 라우트 영향 최소화를 위해 root path만 명시 처리하는 방향을 선택했습니다.

**"redirect loop를 사전에 자동 감지하는 방법은?"**
GitHub Actions CI에서 `curl -IL --max-redirs 5`로 주요 진입 path를 호출하고 200/3xx만 정상 처리, 그 외는 fail로 잡는 smoke test를 추가할 수 있습니다. 다만 cross-Vercel proxy 동작은 production 환경에서만 재현되므로 staging Vercel deploy 후 검증 단계가 가장 안전합니다.

### Q3. Storybook을 sub-directory에 배포할 때 빈 화면이 떴는데 어떻게 4단계로 fix하셨나요?

#### 답변 예시

Storybook은 deployment-root 기준으로 빌드된다는 가정을 하므로 sub-directory(`/_cms/storybook/admin/`)에 정적 서빙하면 4가지 layer에서 path가 깨집니다. 각 layer는 다른 mechanism이라 각각 별도 처리가 필요했습니다.

첫째는 vite preview iframe의 asset(`/assets/iframe-XXX.js`)입니다. `.storybook/main.ts`에 `viteFinal`을 추가해 `STORYBOOK_BASE_PATH` 환경변수로 vite의 `config.base`를 주입했고, bundle-storybooks 스크립트가 빌드별로 base path를 전달하도록 만들었습니다. 둘째는 HTML element 속성(`<link href="./sb-manager/runtime.js" rel="modulepreload" />`)입니다. Manager builder는 viteFinal 영향 받지 않는 별도 builder라 후처리 정규식으로 절대 path 치환했습니다.

셋째는 inline ES module import 문(`<script type="module">import './sb-manager/runtime.js'</script>`)입니다. 이건 HTML 속성과 다른 위치라 별도 정규식 `\bimport[\s(]+["']\.\/`로 처리했습니다. 넷째는 JS의 `fetch('./index.json')` 같은 동적 호출 + CSS `url()` 입니다. 정규식으로 모든 동적 호출을 잡기 어려워서 `<base href="/_cms/storybook/{name}/" />`를 HTML에 명시 주입해 모든 미명시 relative URL이 sub-dir 기준으로 강제 resolve되도록 안전망을 깔았습니다.

가장 중요한 학습은 4단계를 순차로 발견하며 4번 push한 게 아니라 advisor 조언을 따라 **로컬에서 산출물을 직접 검증한 뒤** 마지막 base href는 한 번에 처리했어야 했다는 점입니다. 실제 사용자가 보낸 404 URL `/_cms/storybook/sb-manager/...`에서 `/admin/`이 누락된 패턴이 결정적 단서였고, 이게 base URL 의존이라는 신호였습니다.

#### 꼬리 질문 대응

**"4-layer 중 가장 robust한 fix는 무엇이고, 처음부터 그것만 적용해도 됐나요?"**
`<base href>` 명시 주입이 가장 광범위한 안전망입니다. JS 동적 fetch까지 한 번에 해결합니다. 다만 CSS `url()`은 base href 영향을 받지 않으므로(CSS 파일 위치 기준 resolve) 완전한 single-bullet은 아닙니다. 또한 (1) viteFinal은 빌드 결과 자체를 절대 path로 만들어 base href 의존을 줄이는 보강이라 두 가지를 함께 두는 게 안전합니다. (2)(3) HTML/import 정규식은 base href와 중복이지만 idempotent라 무해합니다.

**"Storybook 공식 문서에 sub-directory 배포 가이드가 있나요?"**
Storybook v10 시점에서는 official 가이드가 약합니다. Vercel/Netlify/Chromatic 모두 deployment-root 가정. 커뮤니티 workaround는 빌드 후 산출물 post-process로 대부분 수렴합니다. 이번 fix도 그 패턴입니다. 미래에 Storybook이 base path를 직접 지원하면 더 깔끔해질 여지가 있습니다.

### Q4. 5회 이상 push 사이클로 디버깅한 경험이 있다면 그 사이클을 어떻게 끊었나요?

#### 답변 예시

advisor에게 자문을 구했을 때 정확히 그 지적을 받았습니다: "5+ Vercel rebuilds 소진했다. 사이클은 change → push → wait → check → still broken. 로컬 진단부터 먼저 하라"는 조언이었습니다. 그 조언이 결정적이었고, 그 후로는 모든 fix를 로컬 ground truth 검증 후 push했습니다.

구체적 절차는 Vercel과 정확히 같은 스크립트를 로컬에서 background로 돌리고(5~8분), 완료 후 산출물을 grep/sed로 직접 확인하는 것입니다. 예를 들어 `grep '<base href=' apps/web/public/_cms/storybook/admin/index.html`로 patch가 적용됐는지, `grep -nE '(src|href)="\./'`로 누락된 relative path가 없는지 확인합니다. 모두 정상이 확인된 commit만 push했고, 마지막 Storybook 4-layer fix는 push 1회로 정상 동작했습니다.

또 다른 학습은 **데이터 수집 → 분석 → action 순서**입니다. advisor가 "지금 advisor를 부르면 같은 추측을 반복할 가능성이 큽니다 — advisor도 로그가 어디서 잘렸는지, env var 상태가 어떤지 모르니까요"라고 한 것처럼, 충분한 데이터(curl 응답, 환경변수 상태, 실제 404 URL) 없이는 어떤 자문도 추측에 불과합니다. 사용자에게 정확한 정보를 요청한 후에야 정확한 fix를 design할 수 있었습니다.

#### 꼬리 질문 대응

**"로컬 환경과 Vercel 환경이 다르면 로컬 검증이 의미 없지 않나요?"**
대부분의 경우 빌드 산출물은 환경 무관하게 동일합니다. 이번처럼 HTML/JS의 path 형태를 검증하는 작업은 로컬에서 100% 재현 가능했습니다. 환경 차이(Vercel CDN, edge cache, region 등)가 영향을 미치는 영역은 별도로 production curl로 검증했습니다. 즉 **검증 가능한 부분은 로컬에서, 환경 의존 부분은 production에서**로 영역을 분리하는 게 핵심입니다.

**"push 사이클을 단축하기 위해 PR + preview deploy를 활용하는 방법은?"**
Vercel은 모든 PR에 preview deploy를 자동 생성합니다. master에 push하지 않고 별도 branch로 push → preview URL에서 검증 → 통과하면 master merge하는 방식이 더 안전합니다. 다만 이번은 시연 일정 급한 hotfix 모드라 master direct push로 진행했고, 그 대신 로컬 검증으로 안전망을 깔았습니다. 일반적 운영에서는 PR + preview가 표준입니다.

---

## 트러블슈팅 로그

| 문제 | 원인 | 해결 | 관련 commit |
|---|---|---|---|
| Vercel admin 빌드: `Module not found: Can't resolve './generated/prisma/client'` 6건 | `packages/db/src/generated/`는 `.gitignore` 대상이고 `postinstall` 누락 | `packages/db/package.json`에 `"postinstall": "prisma generate"` 추가. 로컬 `rm -rf generated && pnpm install`로 자동 생성 검증 | c88f61c |
| `pnpm db:push` P1013 invalid port number | 비밀번호 특수문자(`:`, `@` 등) 미인코딩 또는 `[YOUR-PASSWORD]` placeholder 미치환 | Supabase Dashboard → Reset password → 영숫자만 사용. URL 인코딩 변환 또는 영숫자 비밀번호 채택 | (코드 변경 없음) |
| `pnpm db:push` P1001 Can't reach (TCP는 닿는데) | hostname region 오타 (가이드 예시 `aws-0-...` vs 실제 프로젝트 `aws-1-...`) | `Test-NetConnection`으로 정확한 host 확인 후 Supabase Dashboard Connect 패널에서 정확한 connection string 재복사 | (코드 변경 없음) |
| hostname 수정해도 P1001 반복 | shell 환경변수 우선순위 — `$env:DATABASE_URL`이 `.env`보다 우선 | `Remove-Item Env:DATABASE_URL` + 새 PowerShell 창에서 재시도 | (코드 변경 없음) |
| Vercel web 빌드: `routes-manifest.json couldn't be found` + path가 admin을 가리킴 | web 프로젝트의 Root Directory가 `apps/admin`으로 잘못 설정 | Vercel UI → Settings → General → Root Directory를 `apps/web`으로 변경 | (코드 변경 없음) |
| Vercel web 빌드: `DATABASE_URL environment variable is not set` + Turbo warning | Root Directory 수정 시 Build/Install Command가 자동 reset되어 `turbo run build`로 변경 → Turborepo env sandbox가 차단 | Override 토글 켜고 `cd ../.. && pnpm --filter @simple-cms/web build:demo` + `cd ../.. && pnpm install --frozen-lockfile` 명시 입력 | (코드 변경 없음) |
| admin Vercel URL 직접 접속 시 404 | admin은 basePath `/_cms/admin`이라 root 라우트 없음 — 정상 동작 | visitor는 시연 web URL로만 접근. admin Vercel URL은 backend 전용 | (코드 변경 없음, 정책 안내) |
| `/_cms/admin` 접속 시 ERR_TOO_MANY_REDIRECTS (모두 308 + Location `/_cms/admin`) | web rewrites `:path*` empty match + admin Vercel CDN trailing slash 정규화 충돌 | `apps/web/next.config.ts` rewrites에 `{ source: '/_cms/admin', destination: ... /dashboard }` 첫 룰 명시 | ebdde65 |
| admin splash 진입 시 console 404 + "일시적 오류" | `apps/admin/app/demo-bootstrap/DemoBootstrapClient.tsx`의 fetch endpoint가 basePath 누락 (`/api/demo/bootstrap`) | `/_cms/admin/api/demo/bootstrap`로 명시 (web splash와 동일) | 981177a |
| Storybook 빈 화면 + manager asset 404 (1차 push) | Storybook build에 base path 미설정 | `.storybook/main.ts`에 viteFinal + STORYBOOK_BASE_PATH 환경변수 처리 | 9d4cfad |
| Storybook 여전히 404 (2차 push) | manager builder는 viteFinal 무영향 → `./sb-manager/...` relative path | bundle-storybooks 후처리에서 HTML `src=`/`href=` 절대 path 치환 | 214f230 |
| Storybook 여전히 404 (3차 push) | inline ES module `import './...'` 문 누락 | 정규식 `\bimport[\s(]+["']\.\/` 추가 | 7d27295 |
| Storybook 사이드 메뉴 오류 NEXT_REDIRECT + 폰트 404 (4차 push) | JS `fetch('./index.json')` / CSS `url()` 등 동적 URL은 정규식 미적용 | HTML `<head>` 직후 `<base href>` 명시 주입 (idempotent + iframe.html은 기존 `<base target>`에 href 확장) | d4b795c |
| 4-layer 모두 적용했는데 사용자 console에 같은 404 표시 | browser cache 또는 stale Vercel deploy | curl로 production 검증 우선 + 시크릿 창 + DevTools Disable cache | (코드 변경 없음, 진단 안내) |
| 시연 web 메인 `/` 500 Internal Server Error + Vercel function logs에 `Failed to load external module jsdom: ERR_REQUIRE_ESM` | `renderContent.ts`의 `isomorphic-dompurify` → jsdom lazy load → `html-encoding-sniffer@6` (CJS) → `@exodus/bytes/encoding-lite.js` (ESM only) → Next.js turbopack의 server-side 번들링 중 ESM/CJS interop 깨짐 | `apps/web/next.config.ts`에 `serverExternalPackages: ['isomorphic-dompurify', 'jsdom']` 등록 → Node.js 표준 모듈 해석으로 fallback. 로컬 production build 통과 + 정적화(`/` Static) 유지 확인 | be627a0 |

## 한 줄 요약 카드

- **Prisma postinstall**: "`packages/db/package.json`에 `postinstall: prisma generate` 1줄로 gitignored generated client를 Vercel install 단계에서 자동 생성. Dockerfile은 별도 명시 실행으로 무관."
- **Vercel monorepo 정합성**: "Root Directory · Build Command · Install Command가 한 묶음. Root Directory 수정 시 다른 둘이 자동 reset되니 Override 토글 켜고 명시 재입력 필수."
- **Turborepo env sandbox**: "`turbo run task`는 `env` 화이트리스트만 task에 전달. 우회는 `pnpm --filter ... build` 직접 호출."
- **basePath ↔ rewrites 308 loop**: "`/_cms/admin/:path*` 단일 패턴 + `path*=빈 매칭` + admin Vercel 자동 trailing slash 정규화가 자기 자신 308 무한 redirect 유발. root path 명시 룰을 catch-all 위에 추가해 해결."
- **client fetch basePath 미적용**: "Next.js client-side `fetch`는 basePath 자동 prepend 안 함. 모든 client fetch endpoint는 절대 prefix(`/_cms/admin/...`) 명시 필수."
- **Storybook 4-layer fix**: "(1) viteFinal `config.base` (2) HTML `src=`/`href=` 정규식 (3) inline ES module import 정규식 (4) `<base href>` 명시 주입(가장 광범위한 안전망). 4단계 누적 적용."
- **URL Base 해석**: "trailing slash 유무로 `./X`가 부모/현재 디렉토리로 갈라짐. `<base href>`로 페이지 URL 무관하게 강제 고정. CSS `url()`은 base href 영향 없음(CSS 파일 위치 기준)."
- **push-and-pray 회피**: "5+ Vercel rebuild 사이클 빠지면 advisor 조언처럼 `pnpm exec node scripts/bundle-storybooks.mjs` 로컬 빌드 + grep/sed로 산출물 직접 검증 후 push. 검증 가능한 건 로컬, 환경 의존은 production curl."
- **Supabase 디버깅 3종**: "P1013(URL parse)은 비밀번호 특수문자 또는 placeholder 미치환, P1001(연결)은 hostname region 오타 또는 shell env 우선순위, TCP는 닿는데 P1001 반복이면 `Remove-Item Env:` + 새 PowerShell 창."

## 추가 학습 자료

- **이 프로젝트의 단일 출처**:
  - `docs/learning/2-develop/특별편-시연배포실전-Vercel모노레포-Storybook서브디렉토리-사전학습.md` — 개념 + 동작 원리 + 레거시 대조표
  - `docs/react-cms-시연모드-배포-가이드.md` 부록 B "실전 배포 디버깅" — 11종 함정 표
  - 루트 `AGENTS.md` "Storybook 시연 동봉" + "실전 Vercel 배포 함정" 섹션
  - 메모리 `project_demo_deployment_pitfalls.md` — 배포 전 체크리스트
- **외부 문서**:
  - [Vercel Monorepos 가이드](https://vercel.com/docs/monorepos) — Root Directory · Build Command 동작
  - [Turborepo env 화이트리스트](https://turborepo.com/docs/crafting-your-repository/using-environment-variables) — env / globalEnv / pass-through
  - [Next.js basePath](https://nextjs.org/docs/app/api-reference/config/next-config-js/basePath) — server vs client 적용 차이
  - [HTML `<base>` element MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/base) — `href` + `target` 동작
  - [URL resolution algorithm](https://url.spec.whatwg.org/#concept-basic-url-parser) — base URL + relative path resolution
  - [Storybook v10 builder configuration](https://storybook.js.org/docs/builders) — viteFinal · manager builder 차이
  - [Supabase Connection Pooler](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler) — Transaction vs Session pooler
  - [Prisma P1001 P1013 에러 레퍼런스](https://www.prisma.io/docs/orm/reference/error-reference)
