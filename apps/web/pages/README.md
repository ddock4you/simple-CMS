# pages (Next.js Pages Router placeholder)

이 폴더는 Next.js Pages Router 디렉토리를 "점유"하기 위한 빈 폴더입니다.

## 왜 필요한가?

Next.js는 `src/pages/` 디렉토리를 Pages Router로 인식합니다.
FSD(Feature-Sliced Design)의 pages 레이어도 `src/pages/`에 위치하므로 충돌이 발생합니다.

이 프로젝트는 `src/` 레이아웃을 사용하므로 Next.js의 "pages and app directories should be under the same folder" 제약을 충족해야 합니다.
`app/`(App Router)을 프로젝트 루트로 이동하고, 이 `pages/` 폴더도 루트에 배치하여:

1. 두 디렉토리가 같은 폴더(프로젝트 루트)에 위치 → Next.js 제약 충족
2. Next.js가 이 폴더를 Pages Router로 인식 → `src/pages/`는 일반 디렉토리로 취급
3. `src/pages/`를 FSD pages 레이어로 안전하게 사용 가능

참고: https://feature-sliced.design/kr/docs/guides/tech/with-nextjs

> **이 폴더에 라우트 파일을 추가하지 마세요.** 라우팅은 루트 `app/` (App Router)에서 관리합니다.
