import type { SnapshotModelName } from '../modelRegistry';

export type CloneStats = Record<SnapshotModelName, number>;

export interface CloneResult {
  stats: CloneStats;
  /** 새 sessionId 안의 demo admin User id. bootstrap API가 즉시 createSession에 사용. */
  demoAdminId: string;
}
