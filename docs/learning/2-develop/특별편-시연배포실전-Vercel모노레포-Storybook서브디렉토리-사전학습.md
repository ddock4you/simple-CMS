# 사전학습: 시연 배포 실전 — Vercel 모노레포 + Storybook sub-directory + Supabase 연결 함정

> 시연 PR1-7로 시연 모드 구현이 끝난 뒤 **실제 Vercel + Supabase에 배포하면서 마주친 함정 12종**을 한 곳에 정리한다. 시연 모드 격리 인프라(PR3) · 부트스트랩(PR4) · 시드/Snapshot 학습은 별도 문서이며, 이 문서는 **"코드는 모두 맞는데 배포 단계에서 깨지는" 운영 디버깅 영역**을 다룬다.

## 이 주제에서 다루는 기술

- **Vercel monorepo 배포** — Root Directory · Build Command · Install Command의 정합성, framework 자동 감지, environment variable 주입 시점
- **Turborepo env sandbox** — `turbo run task`에서 환경변수가 task에 전달되려면 `env` 화이트리스트 필요. 우회: `pnpm --filter ... build` 직접 호출
- **Prisma client lifecycle** — generator output이 gitignored일 때 `postinstall` 자동 생성 패턴
- **Next.js basePath + Vercel rewrites** — `:path*` 빈 매칭 + trailing slash 정규화 충돌, client-side `fetch`는 basePath 자동 prepend 안 함
- **Storybook v10 sub-directory 배포** — viteFinal (preview) + manager builder (별도) 두 layer, `<base href>` 안전망
- **URL Base 해석 메커니즘** — `./` relative path가 trailing slash 유무에 따라 부모/현재 디렉토리로 resolve. `<base href>`는 HTML element + `document.baseURI` 기반 fetch에 영향, CSS `url()`은 무관
- **Supabase 2024+ UI/API 변경** — Connect 패널, `sb_secret_*` 키, Transaction/Session pooler 구분, region별 cluster 번호

## 핵심 개념

### 1. Prisma client `postinstall` 패턴

#### 정의

Prisma의 generator output을 `.gitignore` 대상으로 두고, npm/pnpm lifecycle 스크립트 `postinstall`로 `prisma generate`를 자동 실행해 빌드 인프라가 별도 step 없이도 client를 받도록 만드는 패턴.

#### 동작 원리

1. `schema.prisma`의 `generator client { output = "../src/generated/prisma" }`로 클라이언트가 커스텀 경로에 출력
2. `.gitignore`에 `packages/db/src/generated/`를 등록 → bundle 크기 + 머지 충돌 회피
3. `packages/db/package.json`에 `"postinstall": "prisma generate"` 1줄
4. 어느 환경이든 `pnpm install` 직후 npm/pnpm이 `postinstall` 자동 실행 → `generated/` 자동 채워짐
5. 멱등 — schema 변경 없으면 캐시 hit, 변경되면 재생성

**pnpm v10의 build script 차단 정책**: pnpm은 보안상 일부 의존성의 install/build script를 차단한다. Prisma는 통과시키기 위해 `pnpm-workspace.yaml`의 `onlyBuiltDependencies`에 `prisma` + `@prisma/engines`를 등록해야 한다(이 프로젝트는 이미 등록됨).

#### 이 프로젝트에서의 적용

- Vercel admin 빌드가 `Module not found: Can't resolve './generated/prisma/client'` 6건으로 실패하던 원인이 정확히 `postinstall` 누락
- Dockerfile은 명시적 `RUN pnpm --filter @simple-cms/db generate`를 갖고 있어 영향 없었지만, Vercel은 Build Command 하나로 빌드 → install 단계에 자동 fallback 필요
- 추가 효과: 로컬 신규 clone + `pnpm install` 사용자도 별도 명령 없이 dev 진입 가능

---

### 2. Vercel monorepo 프로젝트 설정 정합성

#### 정의

Vercel 한 GitHub 레포에서 admin/web 두 프로젝트를 만들 때, 각 프로젝트의 **Root Directory · Build Command · Install Command** 세 설정이 한 묶음으로 동작한다는 원칙.

#### 동작 원리

- **Root Directory**: Vercel이 framework 자동 감지 + 빌드 cwd를 결정하는 기준 경로
- **Build/Install Command**: "Override" 토글로 자동 감지 무시 가능. **Override 꺼져 있으면 Vercel이 매번 새로 감지**해서 turbo가 있으면 `turbo run build` 형태로 실행
- **Root Directory만 수정 → Build/Install Command가 자동 reset**: Vercel UI가 framework preset에 따라 권장값을 다시 채움

#### 충돌 시나리오

| 수정 | 부작용 |
|---|---|
| Root Directory: `apps/admin` → `apps/web` | Build Command가 `cd ../.. && pnpm --filter @simple-cms/web build:demo` → `turbo run build`로 reset → Storybook 미동봉 + Turbo env sandbox로 DATABASE_URL 차단 |
| 환경변수만 수정 | Build/Install Command는 영향 없음. 하지만 Redeploy 필수 (저장만으론 기존 빌드물에 미반영) |
| Override 토글 끄고 저장 | 자동 감지 모드로 전환 → 위 시나리오와 동일 |

#### 이 프로젝트에서의 적용

시연 가이드 2-1/2-3절은 명시적으로 두 Command를 적어두고 "꼭 변경"이라고 강조. 실전 배포 중 운영자가 Root Directory를 수정한 뒤 Build Command가 reset되어 빌드 깨지는 케이스가 실제로 발생.

---

### 3. Turborepo env sandbox

#### 정의

`turbo run task`로 실행되는 task는 환경변수가 **sandbox**되어 `turbo.json`의 `env` 화이트리스트에 명시된 것만 task의 `process.env`로 전달된다. Vercel의 자동 감지는 monorepo에서 turbo를 인식하면 `turbo run build`로 호출하므로 이 영향을 받는다.

#### 동작 원리

```jsonc
// turbo.json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**"],
      "env": ["DATABASE_URL", "DEMO_MODE", ...]  // ← 화이트리스트
    }
  }
}
```

- `env` 미명시 → task에서 `process.env.DATABASE_URL`이 `undefined`
- Turbo가 친절하게 warning을 띄움:
  ```
  Warning - the following environment variables are set on your Vercel project,
  but missing from "turbo.json". These variables WILL NOT be available to your application
  [warn] - DATABASE_URL
  ```

#### 회피 방법

`turbo run build`를 거치지 않고 **pnpm으로 직접 task 호출**하면 sandbox를 건너뛰고 process.env 전체가 그대로 전달된다:

```bash
cd ../.. && pnpm --filter @simple-cms/web build:demo
```

이게 시연 가이드의 권장 Build Command. monorepo 환경에서 Vercel 자동 감지를 신뢰하지 말고 명시 지정이 안전.

#### 이 프로젝트에서의 적용

운영자가 Root Directory를 정정하면서 Build Command가 `turbo run build`로 reset되었을 때, web 빌드가 `Failed to collect page data ... DATABASE_URL environment variable is not set` 에러로 실패. Override 토글 + 명시 Command 입력으로 해소.

---

### 4. Next.js basePath + Vercel rewrites trailing slash 충돌

#### 정의

Vercel rewrites의 `:path*` catch-all 패턴이 **`path*=빈 값`** 으로 매칭될 때 destination이 trailing slash 형태로 만들어지고, admin Vercel CDN의 자동 trailing slash 정규화(`/admin/` → `/admin`)와 충돌해 자기 자신으로 308 무한 redirect가 발생하는 패턴.

#### 동작 원리

web의 rewrites:
```typescript
{ source: '/_cms/admin/:path*', destination: `${adminRewriteUrl}/_cms/admin/:path*` }
```

흐름:
1. visitor → `https://web/_cms/admin` (trailing slash 없음)
2. web rewrites가 매칭은 하되 path*=빈 매칭으로 destination이 `https://admin/_cms/admin/` (trailing slash 포함) 형태로 proxy
3. admin Vercel CDN의 정규화: `/_cms/admin/` → `/_cms/admin` 308 응답 + `Location: /_cms/admin`
4. browser는 web origin 기준 `/_cms/admin`로 다시 요청
5. → 1번부터 무한 루프

#### 회피 방법

root path 단독 진입을 명시적으로 처리:
```typescript
{ source: '/_cms/admin', destination: `${adminRewriteUrl}/_cms/admin/dashboard` },  // 새로 추가
{ source: '/_cms/admin/:path*', destination: `${adminRewriteUrl}/_cms/admin/:path*` },
```

visitor `/_cms/admin` 진입 시 첫 룰이 `/_cms/admin/dashboard`로 직행 → trailing slash 정규화 발동 안 함.

#### 이 프로젝트에서의 적용

시연 web의 첫 진입점 검증 단계에서 `ERR_TOO_MANY_REDIRECTS` 발생 → curl로 admin Vercel 직접 호출 시 chain은 정상이지만 web 경유 시 loop. 위 root path 룰 추가로 해소.

---

### 5. Next.js client-side `fetch`의 basePath 미적용

#### 정의

Next.js의 `basePath: '/_cms/admin'` 설정은 **server-side routing과 server-side `redirect()`에는 자동 적용**되지만, **client-side `fetch(url)`은 자동 prepend되지 않는다**. 모든 client fetch는 명시 prefix 필요.

#### 동작 원리

```ts
// ❌ admin DemoBootstrapClient의 잘못된 코드
const BOOTSTRAP_ENDPOINT = '/api/demo/bootstrap';
await fetch(BOOTSTRAP_ENDPOINT, { method: 'POST' });
// → page origin 기준 절대 path → https://origin/api/demo/bootstrap → 404

// ✅ 올바른 코드
const BOOTSTRAP_ENDPOINT = '/_cms/admin/api/demo/bootstrap';
```

이는 admin AGENTS.md에 명시되어 있는 정책이지만, 코드 주석에 "admin은 basePath 자동 prepend"라는 잘못된 가정이 박혀 발견되기 어려운 함정.

#### 이 프로젝트에서의 적용

admin splash가 fetch 404로 인해 "일시적 오류" 표시. web origin에서 admin proxy를 거쳐 도달한 경우에도 page origin은 web이라 `https://web/api/demo/bootstrap` → web 라우트 없음 → 404. 양쪽 케이스 모두 명시 basePath prefix로 해결.

---

### 6. URL Base 해석 메커니즘 + Storybook sub-directory

#### 정의

브라우저의 URL 해석은 **base URL** 기준이고, base URL은 현재 페이지 URL에서 마지막 segment를 제외한 디렉토리. trailing slash 유무에 따라 결정적으로 갈라진다. `<base href>` HTML 태그로 명시 override 가능.

#### 동작 원리

| 페이지 URL | base URL | `./X.js` resolve |
|---|---|---|
| `/_cms/storybook/admin/` (slash O — 디렉토리) | `/_cms/storybook/admin/` | `/_cms/storybook/admin/X.js` ✅ |
| `/_cms/storybook/admin` (slash X — 파일로 해석) | `/_cms/storybook/` | `/_cms/storybook/X.js` ❌ |
| `<base href="/_cms/storybook/admin/">` 명시 | `/_cms/storybook/admin/` | 페이지 URL 무관하게 동일 ✅ |

**`<base href>`가 영향을 미치는 곳**:
- HTML element의 relative URL: `<a href>`, `<img src>`, `<script src>`, `<link href>`, form action 등
- `document.baseURI` 기반 fetch: `fetch('./X.json')`은 `document.baseURI` 사용 → base href 영향
- ES module의 `import './X.js'`: module URL 기준 (module 자신이 어디서 load됐는지)

**`<base href>`가 영향 못 미치는 곳**:
- CSS `url()`: CSS 파일 자체 위치 기준 (HTML base 무관)
- 절대 URL (`/...` 또는 `https://...`): base 무시

#### Storybook sub-directory 배포에 적용

Storybook은 deployment-root 기준으로 빌드되므로 sub-dir 서빙 시 **4가지 layer에서 path 깨짐**:

1. **vite preview (iframe)** — `.storybook/main.ts`의 `viteFinal`에서 `config.base = process.env.STORYBOOK_BASE_PATH` 주입. asset이 절대 path로 빌드됨
2. **HTML 속성** — manager builder는 viteFinal 영향 받지 않음. `index.html`의 `<link href="./sb-manager/runtime.js" rel="modulepreload" />` 등을 후처리 정규식으로 절대 path 치환
3. **inline ES module import** — `<script type="module">import './sb-manager/runtime.js'</script>` 형태도 별도 정규식 처리
4. **`<base href>` 명시 주입** — 위 3개로 못 잡는 JS `fetch()` / CSS `url()` 등 동적 URL을 sub-dir 기준으로 강제. 안전망

#### 이 프로젝트에서의 적용

`apps/web/scripts/bundle-storybooks.mjs`가 4-layer 모두 처리. 특히 (4)는 Storybook이 stories 목록용 `fetch('./index.json')`을 호출하는데 base URL 의존이라 trailing slash 없는 URL에서는 `/_cms/storybook/index.json`로 요청 → web Next.js layout gate가 `NEXT_REDIRECT;/demo-bootstrap...`로 인터셉트 → 사이드 메뉴 오류. `<base href>` 1줄로 해결.

---

### 7. Supabase 2024+ 변경사항 + 연결 디버깅

#### 변경사항

- **Connect 패널 신규**: 대시보드 상단 **[Connect]** 버튼이 connection string 단일 출처. 기존 `Project Settings → Database` 경로 폐기
- **API Key 체계 변경**: `eyJ...` JWT → `sb_publishable_*` / `sb_secret_*`. legacy 키는 2026년 말까지만 동작
- **Transaction pooler vs Session pooler**:
  - Transaction (port 6543, `?pgbouncer=true&connection_limit=1`): 운영 트래픽용, prepared statement 제약 있음
  - Session (port 5432): DDL/마이그레이션용. `prisma db push` 같은 schema 작업에 안정적
- **Region별 cluster 번호**: hostname이 `aws-0-...` (예시) vs `aws-1-...` (실제)로 다를 수 있음. 가이드 예시를 그대로 복사하면 region 오타 가능

#### 연결 에러 분류

| Prisma 에러 | 의미 | 원인 |
|---|---|---|
| **P1013** invalid port number | URL 파싱 단계 실패 | 비밀번호 특수문자(`:`, `@`, `/`, `?`, `#`) 미인코딩 또는 `[YOUR-PASSWORD]` placeholder 미치환 |
| **P1001** Can't reach server (TCP는 닿는데도) | 연결 단계 실패 | hostname region 오타 / pooler 미활성화 / network restriction |
| **여전히 동일 에러** (수정해도) | shell env 우선순위 | `$env:DATABASE_URL`이 export되어 있으면 `.env`보다 우선 → `Remove-Item Env:` 후 새 PowerShell 창 |

#### 진단 명령

```powershell
# TCP 닿는지 확인 (DNS + port listen)
Test-NetConnection -ComputerName aws-1-ap-northeast-2.pooler.supabase.com -Port 6543

# dotenv가 실제 읽는 값 확인 (Prisma와 동일 경로)
node -e "require('dotenv').config({path:'.env'}); console.log(process.env.DATABASE_URL?.replace(/(:)[^@]+(@)/,'$1****$2'))"

# shell env 잔존 확인 (PowerShell)
echo "shell env DATABASE_URL: $env:DATABASE_URL"
```

#### 이 프로젝트에서의 적용

실전 배포 중 DB push가 P1013 → P1001 → 동일 에러 반복으로 사이클이 길어졌음. 해결책: 비밀번호를 Supabase Dashboard에서 영숫자만으로 재설정, hostname을 Dashboard에서 정확히 다시 복사, shell env 잔존 제거 + 새 창. 시연 가이드 4장 + 부록 B에 절차 추가.

---

## 레거시 ↔ 모던 대조표

| 관점 | 레거시 (Apache + WAS + cgi-bin) | 시연 배포 (Vercel + Supabase) |
|---|---|---|
| **빌드 산출물 생성** | WAS가 source를 받아 자체 컴파일 | Vercel/Docker가 빌드 시점에 한 번 → 런타임은 정적 산출물 + 서버리스 함수 |
| **`postinstall` lifecycle** | Maven/Gradle 라이프사이클의 `compile` phase 자동 실행 | npm/pnpm `postinstall` 스크립트 — 빌드 시 자동 실행. 누락 시 빌드 전체 fail |
| **모노레포 빌드** | 단일 webroot에 모듈 통합 빌드 | Vercel monorepo는 Root Directory + Build Command + 환경변수가 프로젝트별 독립. 한쪽 수정이 다른 쪽에 영향 |
| **환경변수 주입** | Tomcat `context.xml`, `web.xml`, 환경별 properties 파일 | Vercel Dashboard UI에 등록 + Production/Preview/Development 환경 분리. Build/Runtime 양쪽에서 사용 |
| **Sub-directory 배포** | Apache Alias 또는 mod_rewrite RewriteRule로 path → file system mapping | Vercel rewrites + Next.js basePath. **HTML/JS 산출물의 path가 deployment-root 기준이라 sub-dir 서빙 시 별도 처리 필요** |
| **URL 정규화 (trailing slash)** | Apache `DirectorySlash On/Off` 명시 선택 | Vercel CDN이 자동 정규화 (`/admin/` → `/admin`). 이게 rewrites와 충돌 가능 |
| **Client-side routing** | Server URL = file system path (대부분) | basePath / rewrites로 가상 URL 가능. **client `fetch`는 자동 변환 안 됨** → 명시 prefix 필수 |
| **DB connection pool** | WAS의 JDBC connection pool 단일 풀 | Supabase Transaction(pgbouncer) / Session pooler 구분. 마이그레이션은 Session, 운영 트래픽은 Transaction |
| **배포 디버깅 사이클** | Tomcat 로그 + 직접 SSH | Vercel build log + Function log + GitHub commit/push → 자동 빌드 → 결과 확인 (5~8분 사이클) |

---

## 구현 시 주의할 점

### 안티패턴 1: push-and-pray 사이클

**문제**: "코드 변경 → git push → Vercel 빌드 대기 (5~8분) → 결과 확인 → 또 깨짐 → 다시 수정 → 또 push" 사이클은 한 번 진입하면 시간을 빠르게 소진한다.

**대안**: 로컬에서 정확히 같은 빌드를 한 번 돌리고 산출물을 직접 검증:

```bash
# Vercel과 정확히 같은 스크립트
pnpm --filter @simple-cms/web exec node scripts/bundle-storybooks.mjs

# 산출물 ground truth 확인
ls apps/web/public/_cms/storybook/admin/sb-manager 2>&1
grep -nE '(src|href)="\./' apps/web/public/_cms/storybook/admin/index.html
grep "import '\." apps/web/public/_cms/storybook/admin/index.html
```

advisor의 조언: "**Don't guess which scenario without checking.** 각 시나리오는 다른 fix가 필요하다." 로컬 검증 한 번으로 시나리오 A/B/C를 좁히면 Vercel 빌드 1회로 끝낼 수 있다.

### 안티패턴 2: 정규식으로 모든 path를 잡으려 함

**문제**: Storybook 빌드 산출물의 path는 (a) HTML 속성 (b) ES module import (c) JS fetch (d) CSS url() 등 layer가 많다. 정규식으로 모든 case를 잡으려 하면 새 layer가 나올 때마다 추가.

**대안**: 정규식으로 잡을 수 있는 것만 잡고, 나머지는 `<base href>`로 안전망. base href는 동적 fetch까지 안전하게 처리.

### 안티패턴 3: 배포 가이드를 신뢰만 하고 진단 안 함

**문제**: 시연 가이드에 적힌 hostname 예시(`aws-0-...`)를 그대로 `.env`에 복사 + 자기 프로젝트와 다른 region이라 P1001.

**대안**: Supabase Dashboard → Connect 패널에서 **본인 프로젝트의 connection string을 직접 복사**. 가이드는 형식 참고만.

### 안티패턴 4: turbopack의 server-side 번들링을 무조건 신뢰

**문제**: Next.js turbopack(또는 webpack)은 server-side 의존성을 자체 번들링하려 시도하지만, **dynamic `require()`가 많거나 ESM/CJS 혼용 chain이 깊은 패키지**(`jsdom`, `isomorphic-dompurify` 등)는 번들링 과정에서 interop가 깨진다. 로컬 dev에서는 통과해도 Vercel serverless 환경에서 `ERR_REQUIRE_ESM`으로 throw.

**증상**: Vercel function logs에 `Failed to load external module <package>: ERR_REQUIRE_ESM: require() of ES Module ... not supported` 형태.

**대안**: Next.js 공식 옵션 `serverExternalPackages`에 해당 패키지를 등록 → 번들링 건너뛰고 Node.js 표준 모듈 해석으로 fallback → ESM/CJS interop native 호환.

```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['isomorphic-dompurify', 'jsdom'],
  // ...
};
```

이 패턴은 SSR HTML sanitize(DOMPurify), MDX 처리, 일부 Markdown parser, image processing 패키지(sharp 등)에서 흔히 필요. 로컬 build 통과해도 production에서 처음 발견되는 경우가 많아 **반드시 Vercel preview deploy 또는 production runtime에서 검증** 필수.

### 안티패턴 5: 정리 작업 미루기

**문제**: 디버깅용 screenshot.png를 `apps/web/public/`에 두면 운영 도메인(`https://web/screenshot1.png`)에 외부 노출. cleanup 안 하면 시연 시작 시 발견.

**대안**: 디버깅 산출물은 `.gitignore` 폴더 또는 PR 닫기 전 정리.

---

## 이 주제를 마치면 설명할 수 있어야 하는 것

- [ ] **`postinstall: prisma generate`가 Vercel 빌드를 살리는 메커니즘**을 generator output gitignore + npm lifecycle + Dockerfile 비교로 설명할 수 있는가? `pnpm-workspace.yaml`의 `onlyBuiltDependencies`가 이 패턴에 어떻게 관여하는가?
- [ ] **Vercel monorepo Root Directory · Build Command · Install Command 정합성**의 의미와, Root Directory만 수정해도 다른 두 항목이 reset되어 turbo sandbox 환경변수 차단으로 빌드가 깨지는 경로를 설명할 수 있는가?
- [ ] **`/_cms/admin` 자기 자신 308 무한 redirect**가 web rewrites `:path*`의 empty match와 admin Vercel CDN의 trailing slash 정규화 충돌로 발생하는 메커니즘을 그릴 수 있는가? root path 명시 rewrite 룰이 어떻게 이를 해소하는가?
- [ ] **Next.js client-side `fetch`가 basePath를 자동 prepend하지 않는다**는 정책의 출처와, server-side `redirect()`/routing은 자동 prepend하는 차이를 설명할 수 있는가?
- [ ] **Storybook sub-directory 배포 4-layer fix** (viteFinal · HTML 속성 · ES module import · `<base href>`)가 각각 어떤 path resolution layer를 처리하는지, 그리고 `<base href>`가 왜 가장 광범위한 안전망인지 설명할 수 있는가?
- [ ] **URL trailing slash 유무에 따라 `./X` resolve가 부모/현재 디렉토리로 갈라지는 메커니즘**과, `<base href>`가 어떻게 페이지 URL 무관하게 강제 고정하는지 설명할 수 있는가? CSS `url()`이 `<base href>` 영향을 받지 않는 이유는?
- [ ] **Prisma P1013 vs P1001의 차이** (URL parse 실패 vs 연결 실패)와 각각의 흔한 원인(비밀번호 특수문자 · placeholder 미치환 · region 오타 · shell env 우선순위)을 분류할 수 있는가?
- [ ] **push-and-pray 사이클 대신 로컬 ground truth 검증**으로 디버깅 사이클을 단축하는 방법을 구체적인 명령으로 제시할 수 있는가?
