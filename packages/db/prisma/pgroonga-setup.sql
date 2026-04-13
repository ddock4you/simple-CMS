-- PGroonga 확장 활성화
-- 로컬: Docker groonga/pgroonga 이미지에 포함
-- Supabase: Dashboard > Database > Extensions > pgroonga 활성화 후 실행
CREATE EXTENSION IF NOT EXISTS pgroonga;

-- Subpage 검색 인덱스 (title + content 별도)
CREATE INDEX IF NOT EXISTS idx_subpage_pgroonga_title
  ON "Subpage" USING pgroonga (title);
CREATE INDEX IF NOT EXISTS idx_subpage_pgroonga_content
  ON "Subpage" USING pgroonga (content);

-- Post 검색 인덱스 (title + content 별도)
CREATE INDEX IF NOT EXISTS idx_post_pgroonga_title
  ON "Post" USING pgroonga (title);
CREATE INDEX IF NOT EXISTS idx_post_pgroonga_content
  ON "Post" USING pgroonga (content);
