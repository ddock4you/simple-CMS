import { createClient } from '@supabase/supabase-js';

import { SEED_SENTINEL } from '../sessionContext';
import type { ImportOptions } from '../importSnapshot';

export interface SupabaseSeedStorageConfig {
  url: string;
  serviceRoleKey: string;
  bucket: string;
}

export function createSupabaseSeedStorageCallbacks(
  config: SupabaseSeedStorageConfig,
): Required<Pick<ImportOptions, 'uploadMedia' | 'cleanupStorage'>> {
  const client = createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false },
  });
  const storage = client.storage.from(config.bucket);

  return {
    uploadMedia: async (storageKey, buffer, mimeType) => {
      if (!storageKey.startsWith(`${SEED_SENTINEL}/`)) {
        throw new Error(
          `uploadMedia는 ${SEED_SENTINEL}/ 경로에만 사용 가능: ${storageKey}`,
        );
      }

      const { error } = await storage.upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: true,
      });
      if (error) {
        throw new Error(
          `Supabase upload 실패 (${storageKey}): ${error.message}`,
        );
      }

      const {
        data: { publicUrl },
      } = storage.getPublicUrl(storageKey);
      return publicUrl;
    },
    cleanupStorage: async () => {
      const errors: string[] = [];
      let filesDeleted = 0;

      const { data: categories, error: listErr } = await storage.list(
        SEED_SENTINEL,
        { limit: 1000 },
      );
      if (listErr) {
        errors.push(`list(${SEED_SENTINEL}): ${listErr.message}`);
        return { filesDeleted, errors };
      }
      if (!categories || categories.length === 0) {
        return { filesDeleted, errors };
      }

      for (const cat of categories) {
        if (cat.id !== null) continue;
        const prefix = `${SEED_SENTINEL}/${cat.name}`;
        const { data: files, error: filesErr } = await storage.list(prefix, {
          limit: 1000,
        });
        if (filesErr) {
          errors.push(`list(${prefix}): ${filesErr.message}`);
          continue;
        }
        if (!files || files.length === 0) continue;

        const paths = files
          .filter((f) => f.id !== null)
          .map((f) => `${prefix}/${f.name}`);
        if (paths.length === 0) continue;

        for (let i = 0; i < paths.length; i += 1000) {
          const chunk = paths.slice(i, i + 1000);
          const { error: rmErr } = await storage.remove(chunk);
          if (rmErr) {
            errors.push(`remove(${prefix}): ${rmErr.message}`);
          } else {
            filesDeleted += chunk.length;
          }
        }
      }

      return { filesDeleted, errors };
    },
  };
}
