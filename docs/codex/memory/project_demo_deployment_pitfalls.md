<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->
---
name: 시연 배포 실전 함정
description: Vercel monorepo + Supabase + Storybook sub-directory 배포 시 발견한 12종 함정 체크리스트
type: project
originSessionId: b26cb623-6d83-460d-bf9a-5067a890a5dd
---
시연 모드 배포 시 마주친 함정들. 동일 사이클을 반복하지 않도록 정리.

**Why:** 시연 PR1-7로 코드는 완성했지만 실제 Vercel + Supabase 배포 중 push-and-pray 사이클(5+ 회)에 빠짐. advisor가 "로컬 ground truth 검증을 먼저"라고 지적할 정도로 디버깅 비효율 발생.

**How to apply:** 시연 배포 또는 비슷한 monorepo Vercel 배포 작업 시작 전 이 체크리스트 확인. 같은 함정 회피.

---

### 코드 측 필수 확인 (배포 전)

1. **`packages/db/package.json`에 `postinstall: prisma generate` 있는가?** 없으면 Vercel 빌드가 `Module not found: ./generated/prisma/client`로 실패. `src/generated/`는 `.gitignore` 대상이라 Git에 없음
2. **`apps/web/next.config.ts` rewrites에 root path 명시 룰 있는가?** `/_cms/admin` 단독 진입 시 `:path*` empty match + admin Vercel trailing slash 정규화 충돌로 308 무한 loop
3. **`apps/admin/app/demo-bootstrap/DemoBootstrapClient.tsx`의 `BOOTSTRAP_ENDPOINT`가 `/_cms/admin/api/demo/bootstrap` (basePath 포함)인가?** Next.js client `fetch`는 basePath 자동 prepend 안 함

### Vercel 설정 정합성

4. **admin/web 양쪽 환경변수에 `DEMO_MODE=true` 등록 + Production 체크?** 한쪽만 빠지면 rewrites/basePath 미활성 → 404 또는 loop
5. **web에 `NEXT_PUBLIC_ADMIN_REWRITE_URL` 등록 (admin Production URL, 끝 슬래시 없이)?**
6. **Build/Install Command Override 토글 켜고 명시?** Root Directory 수정 시 자동 reset되어 `turbo run build`로 변경 + Turbo env sandbox로 DATABASE_URL 차단. 정답:
   - admin Build: `cd ../.. && pnpm --filter @simple-cms/admin build`
   - web Build: `cd ../.. && pnpm --filter @simple-cms/web build:demo` (build:demo!)
   - Install (양쪽): `cd ../.. && pnpm install --frozen-lockfile`

### Supabase URL 디버깅

7. **비밀번호에 특수문자 없음** (Reset password로 영숫자만) — `:`/`@`/`/`/`?`/`#` 포함 시 P1013
8. **hostname region 정확히** (Supabase Dashboard → Connect 패널에서 복사) — 가이드 예시 `aws-0-...` 그대로 쓰면 P1001. 본인 프로젝트는 `aws-1-...` 등일 수 있음
9. **shell env 잔존 제거**: `Remove-Item Env:DATABASE_URL`/`Remove-Item Env:DIRECT_URL` 후 새 PowerShell 창. shell env가 `.env`보다 우선

### Storybook sub-directory 4-layer (이미 적용됨)

10. **`bundle-storybooks.mjs`가 4단계 모두 처리하는가?**:
    - viteFinal로 base path 주입 (preview iframe asset)
    - HTML `src=`/`href=` 절대 path 치환
    - inline ES module `import './...'` 절대 path 치환
    - `<base href>` 명시 주입 (JS fetch / CSS url() 안전망 — 가장 중요)
11. **`.storybook/main.ts` 양쪽에 `viteFinal` 함수 있고 `STORYBOOK_BASE_PATH` 환경변수 처리하는가?**

### turbopack server-side 번들링 함정 (이미 적용됨)

12-extra. **`apps/web/next.config.ts`에 `serverExternalPackages: ['isomorphic-dompurify', 'jsdom']` 등록되어 있는가?** 미등록 시 Vercel runtime에서 `ERR_REQUIRE_ESM: require() of ES Module @exodus/bytes/encoding-lite.js` throw → 메인 페이지 500. Next.js turbopack이 jsdom 같이 dynamic require가 많은 native-leaning 패키지를 자체 번들링하려다 ESM/CJS interop 깨짐. `serverExternalPackages`는 번들링 건너뛰고 Node.js 표준 모듈 해석으로 fallback. **로컬 build 통과해도 production runtime에서 처음 발견되는 케이스라 반드시 Vercel preview/production 검증 필수**.

### 디버깅 사이클 단축

12. **로컬에서 정확히 같은 빌드 + 산출물 ground truth 확인** (push 전):
    ```bash
    pnpm --filter @simple-cms/web exec node scripts/bundle-storybooks.mjs
    grep '<base href=' apps/web/public/_cms/storybook/admin/index.html
    grep -oE '(src|href)="\./' apps/web/public/_cms/storybook/admin/*.html  # 0줄이어야 정상
    ```

### 정리 (시연 시작 전)

- `apps/web/public/screenshot*.png` 디버깅 산출물 삭제 — 운영 도메인 외부 노출
- `apps/{admin,web}/next-env.d.ts`는 `next build` 부산물 (`.gitignore:54`에 있지만 과거 commit으로 추적 중) — commit에 포함 금지

상세: `docs/learning/2-develop/특별편-시연배포실전-Vercel모노레포-Storybook서브디렉토리-사전학습.md`, `docs/react-cms-시연모드-배포-가이드.md` 부록 B의 "실전 배포 디버깅" 표
