import type {
  PageBlockListItem,
  SubpageVersionSnapshotBlock,
} from '@simple-cms/types';

export interface BlockDiffSummary {
  added: number;
  removed: number;
  modified: number;
  /** displayOrder 기준 동일한 위치에서 blockType/configJson/isVisible만 바뀐 항목 수 */
  unchanged: number;
}

/**
 * 스냅샷 시점 블록 배열(`snapshotBlocks`)과 현재 블록 배열(`currentBlocks`)의 변경 요약.
 *
 * Tiptap ProseMirror JSON 단위의 정교한 diff는 범위 밖이므로, 이 함수는 간단한 heuristic만 제공:
 * - `displayOrder` 기준으로 매칭
 * - 매칭된 쌍 중 `blockType`이 다르면 modified로 취급
 * - 매칭된 쌍 중 `configJson`의 JSON 직렬화 결과나 `isVisible`이 다르면 modified
 * - 매칭되지 않은 스냅샷 블록 → removed (현재는 없음), 매칭되지 않은 현재 블록 → added (스냅샷엔 없음)
 *
 * **해석 관점**: "스냅샷이 현재로부터 얼마나 다른가"를 보여주므로
 *   added = 현재에만 존재, removed = 스냅샷에만 존재, modified = 양쪽 모두 있으나 내용 변경.
 */
export function summarizeBlockDiff(
  snapshotBlocks: SubpageVersionSnapshotBlock[],
  currentBlocks: PageBlockListItem[],
): BlockDiffSummary {
  const snapshotByOrder = new Map<number, SubpageVersionSnapshotBlock>();
  for (const b of snapshotBlocks) snapshotByOrder.set(b.displayOrder, b);

  const currentByOrder = new Map<number, PageBlockListItem>();
  for (const b of currentBlocks) currentByOrder.set(b.displayOrder, b);

  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  const allOrders = new Set<number>([
    ...snapshotByOrder.keys(),
    ...currentByOrder.keys(),
  ]);

  for (const order of allOrders) {
    const snap = snapshotByOrder.get(order);
    const curr = currentByOrder.get(order);
    if (snap && !curr) {
      removed += 1;
      continue;
    }
    if (!snap && curr) {
      added += 1;
      continue;
    }
    if (snap && curr) {
      const typeChanged = snap.blockType !== curr.blockType;
      const visibilityChanged = snap.isVisible !== curr.isVisible;
      const contentChanged =
        stableStringify(snap.configJson) !== stableStringify(curr.configJson);
      if (typeChanged || visibilityChanged || contentChanged) {
        modified += 1;
      } else {
        unchanged += 1;
      }
    }
  }

  return { added, removed, modified, unchanged };
}

/**
 * JSON 직렬화에서 객체 key 순서를 무시한 stable string. Tiptap JSON처럼 같은 구조를
 * 다른 key 순서로 표현하는 경우의 오탐을 줄인다.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
  );
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(',')}}`;
}
