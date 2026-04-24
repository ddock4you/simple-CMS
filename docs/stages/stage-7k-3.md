# Stage 7k-3 — addon-vitest 30s cold start 탐사 (measure-first, findings-only · 코드 변경 0)

Stage 7j에서 `optimizeDeps.include` 시도가 실패로 revert된 뒤 근본 원인 없이 남아있던 `vitest run` setup time(이전 세션 31.56s)을 **measure-first** 원칙으로 재접근. 모든 현실적 후보를 검토 후 Stage 8+ 이연 결론.

- **Primary source 확인** (`node_modules/.pnpm/@storybook+addon-vitest@.../dist/vitest-plugin/index.d.ts`):
  - `storybookScript?: string` — **watch 모드 전용** ("when ran in watch mode"). `vitest run` cold start와 무관 → 후보에서 제외. Stage 7j에서 Agent가 "v10.3+에 없을 수 있음"으로 추정했던 것을 primary source로 교정
  - `disableAddonDocs?: boolean = true` — 기본값이 이미 true이므로 추가 개선 여지 0
  - 남는 유효 옵션은 `configDir`/`storybookUrl`/`tags`뿐. 어느 것도 cold start 단축 효과 없음
- **Baseline 3회 측정** (이 세션 기준): duration 49.50s / 50.85s / 53.56s → **평균 51.30s**. setup 62.75s / 64.93s / 70.13s → **평균 65.94s**. 7j 측정치(31.56s)에서 약 2배로 상승. 세션 간 환경 노이즈가 최적화 효과 측정을 **압도**하는 수준
- **`browser.isolate: false` 시도 3회**: duration 51.87s / 41.83s / 53.20s → 평균 **48.97s**(−2.33s, −4.5%). setup 58.25s / 56.85s / 67.25s → 평균 **60.78s**(−5.16s, −7.8%). 10초 기준 미달 + 변동폭(41.83~53.20s)이 개선폭을 초과 → **노이즈 범위**. 격리성 trade-off(test 간 browser context 공유로 fetch stub/전역 상태 누수 위험)까지 고려하면 이득 없음. revert
- **후보 (c) Playwright launch option(`--disable-gpu` 등)**: Linux 컨테이너에선 이득 있지만 Windows 로컬 headless에서 변동폭 대비 효과 낮을 것으로 판단 → 미시도. CI(ubuntu-latest)에서는 재측정 가치 있음
- **후보 (d) `deps.inline`/`deps.external` 튜닝**: 7j의 `optimizeDeps.include` 실패와 유사 영역 → 반복 회피
- **근본 원인 재정의**: `setup 60s+` 중 대부분은 **Playwright Chromium launch(Windows 프로세스 spawn 오버헤드) + Storybook preview bundle 초기화**. JS 레벨 옵션으로는 해결 불가. 체감 가능한 단축은 다음 중 하나 필요:
  1. `@storybook/addon-vitest` major 업그레이드 + 공식 성능 개선
  2. Vitest 5+ browser mode 재설계
  3. CI 환경에서 Playwright cache + 병렬 worker 튜닝
- **결론**: Stage 8+ 이연. 로컬 `vitest run`은 CI blast radius 밖이라 PR 게이트 속도에 영향 없음 — CI의 실제 wall clock(5분 이내)만 유지되면 실용상 문제 없음
