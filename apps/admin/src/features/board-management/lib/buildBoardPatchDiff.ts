import type { Board } from '@simple-cms/db';

import type { UpdateBoardData } from '../model/boardSchemas';

type Diff = {
  before: Record<string, string | null>;
  after: Record<string, string | null>;
};

export function buildBoardPatchDiff(parsed: UpdateBoardData, prev: Board): Diff {
  const before: Diff['before'] = {};
  const after: Diff['after'] = {};

  if (parsed.name !== undefined && parsed.name !== prev.name) {
    before.name = prev.name;
    after.name = parsed.name;
  }
  if (parsed.slug !== undefined && parsed.slug !== prev.slug) {
    before.slug = prev.slug;
    after.slug = parsed.slug;
  }
  if (parsed.skinType !== undefined && parsed.skinType !== prev.skinType) {
    before.skinType = prev.skinType;
    after.skinType = parsed.skinType;
  }
  if (parsed.isPublic !== undefined && parsed.isPublic !== prev.isPublic) {
    before.isPublic = String(prev.isPublic);
    after.isPublic = String(parsed.isPublic);
  }
  if (parsed.description !== undefined) {
    const normalized = parsed.description ?? null;
    if (normalized !== prev.description) {
      before.description = prev.description;
      after.description = normalized;
    }
  }

  return { before, after };
}
