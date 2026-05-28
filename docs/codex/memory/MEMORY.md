<!--
Codex migration note: this file is a Codex-friendly instruction/reference file.
Codex automatically reads AGENTS.md files by directory scope.
-->

# Memory Index

- [User Profile](user_profile.md) — 레거시→모던 전환 중인 한국어 개발자, 실용적 접근 선호
- [CMS Setup Decisions](project_cms_setup.md) — 모노레포, AGENTS.md 전략, 12단계 로드맵 결정사항
- [Tech Stack Decisions](project_tech_decisions.md) — Next.js 16, Docker 배포, ESLint+Prettier, date-fns, 최신 버전 원칙
- [Approach Preference](feedback_approach.md) — 점진적 접근 선호, 한 세션에 너무 많이 넣지 말 것
- [Development Principles](feedback_dev_principles.md) — 운영 기준+책임 분리 우선, 그 다음 재사용성+단일 소스
- [Docs Sync on Stage Completion](feedback_docs_sync.md) — Stage 완료 시 AGENTS.md 정합성 확인 + Stage 7c부터 결과 요약은 docs/stages/에 작성
- [No Co-Authored-By](feedback_no_coauthor.md) — 커밋 메시지에 Co-Authored-By 표시 금지
- [Gallery Thumbnail Strategy](project_gallery_thumbnail.md) — Stage 4b: 갤러리 스킨 썸네일 = 대표이미지 > 첫 이미지 자동추출 > placeholder
- [Session Handoff via Plan Docs](feedback_session_handoff.md) — 대규모 Stage는 `docs/`에 인계 문서를 남기고 새 세션에서 재개
- [DB Migration Policy](project_db_migration_policy.md) — `pnpm db:push`만 사용, `migrate dev`는 reset 위험으로 금지 (Stage 8에서 이력 도입 예정)
- [Stage 7b HTML 블록 통합](project_stage_7b_html_block_unification.md) — 페이지 단위 customHtml/customCss 폐기 결정. HTML 블록이 { html, css? }로 흡수. 회귀 방지
- [Response Language Preference](feedback_language.md) — 작업 완료 후 리뷰/요약은 항상 한글로 작성
- [Search Form Submit Pattern](feedback_search_form_submit.md) — admin 검색은 Enter + [검색] 버튼 form submit. debounce 자동 검색 금지(서버 부담)
- [Stage 15 Design System](project_stage15_design_system.md) — 디자이너 부재로 design.md가 admin 시각 결정의 단일 진실원. export css-tailwind 금지, brand color 추가 금지
- [Demo Mode Master-merge Strategy](project_demo_mode.md) — DEMO_MODE 격리 인프라는 master에 통합. sentinel '**PROD**' + composite unique + findFirst/upsert 회피 관습
- [build:demo Storybook bundling](project_build_demo_bundling.md) — 시연 Storybook을 web 빌드에 동봉(2 Vercel 프로젝트). Windows self-nesting/EPERM/long-path 함정 회피 패턴
- [Stage 16 진행 현황](project_stage16_progress.md) — 16a/16c-1/16c-2/16d/16e/16b-1 완료. 다음: 16b-2(posts→boards→media 순 defineRoute 마이그레이션) + 16f(SettingsCardForm)
- [Stage 18 성능 최적화](project_stage18_perf_optimization.md) — Vercel Hobby + Supabase us-east 정렬, cachedSession/getMenusBySlots 패턴, force-dynamic 회피
- [Stage 20 콘텐츠 렌더링](project_stage20_content_rendering.md) — 게시글 중요 표시, 공개 목록 번호, TiptapContent Tailwind boundary, KRDS reset 회피
- [시연 배포 실전 함정](project_demo_deployment_pitfalls.md) — Vercel monorepo + Storybook sub-directory + Supabase 12종 함정 체크리스트 (배포 시작 전 확인)
