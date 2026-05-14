import type { Post } from '@simple-cms/db';

import type { UpdatePostData } from '../model/postSchemas';

type Diff = {
  before: Record<string, string | null>;
  after: Record<string, string | null>;
};

export function buildPostPatchDiff(parsed: UpdatePostData, prev: Post): Diff {
  const before: Diff['before'] = {};
  const after: Diff['after'] = {};

  if (parsed.title !== undefined && parsed.title !== prev.title) {
    before.title = prev.title;
    after.title = parsed.title;
  }
  if (parsed.slug !== undefined && parsed.slug !== prev.slug) {
    before.slug = prev.slug;
    after.slug = parsed.slug;
  }
  if (parsed.boardId !== undefined && parsed.boardId !== prev.boardId) {
    before.boardId = prev.boardId;
    after.boardId = parsed.boardId;
  }
  if (parsed.status !== undefined && parsed.status !== prev.status) {
    before.status = prev.status;
    after.status = parsed.status;
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

  return { before, after };
}
