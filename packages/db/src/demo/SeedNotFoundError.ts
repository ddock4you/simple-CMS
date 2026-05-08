/**
 * 시연 모드 `__SEED__` row가 없을 때 throw되는 에러.
 *
 * cloneSeedToSession이 시작 시점에 Role count = 0이면 throw하고,
 * bootstrap API는 이를 잡아 503 + `{ code: 'SEED_NOT_FOUND' }` 응답으로 변환한다.
 * splash UI가 운영자 안내 메시지를 표시한다.
 */
export class SeedNotFoundError extends Error {
  readonly code = 'SEED_NOT_FOUND';

  constructor(
    message = '시연 모드 seed 데이터가 없습니다. `pnpm --filter @simple-cms/db db:demo-seed`를 실행하세요.',
  ) {
    super(message);
    this.name = 'SeedNotFoundError';
  }
}
