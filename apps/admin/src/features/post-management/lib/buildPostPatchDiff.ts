import type { Post } from '@simple-cms/db';

import type { UpdatePostData } from '../model/postSchemas';

type Diff = {
  before: Record<string, string | boolean | null>;
  after: Record<string, string | boolean | null>;
};

export function buildPostPatchDiff(parsed: UpdatePostData, prev: Post): Diff {
  const before: Diff['before'] = {};
  const after: Diff['after'] = {};

  if (parsed.title !== undefined && parsed.title !== prev.title) {
    before.title = prev.title;
    after.title = parsed.title;
  }
  if (parsed.boardId !== undefined && parsed.boardId !== prev.boardId) {
    before.boardId = prev.boardId;
    after.boardId = parsed.boardId;
  }
  if (parsed.status !== undefined && parsed.status !== prev.status) {
    before.status = prev.status;
    after.status = parsed.status;
  }
  if (
    parsed.isImportant !== undefined &&
    parsed.isImportant !== prev.isImportant
  ) {
    before.isImportant = prev.isImportant;
    after.isImportant = parsed.isImportant;
  }
  if (parsed.seoTitle !== undefined) {
    const normalized = parsed.seoTitle?.trim() || null;
    if (normalized !== prev.seoTitle) {
      before.seoTitle = prev.seoTitle;
      after.seoTitle = normalized;
    }
  }
  if (parsed.seoDescription !== undefined) {
    const normalized = parsed.seoDescription?.trim() || null;
    if (normalized !== prev.seoDescription) {
      before.seoDescription = prev.seoDescription;
      after.seoDescription = normalized;
    }
  }
  if (parsed.featuredImageId !== undefined) {
    const normalized = parsed.featuredImageId || null;
    if (normalized !== prev.featuredImageId) {
      before.featuredImageId = prev.featuredImageId;
      after.featuredImageId = normalized;
    }
  }

  return { before, after };
}
