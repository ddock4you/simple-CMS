import { getSiteSettings } from './siteSettings';

const DEFAULT_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.hwp', '.hwpx', '.pptx',
  '.zip',
];

const DEFAULT_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/haansofthwp', 'application/x-hwp',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
];

const DEFAULT_MAX_FILE_SIZE_MB = 10;

export interface UploadRestrictions {
  allowedExtensions: string[];
  allowedMimeTypes: string[];
  maxFileSizeMb: number;
}

export async function getUploadRestrictions(): Promise<UploadRestrictions> {
  const settings = await getSiteSettings([
    'UPLOAD_ALLOWED_EXTENSIONS',
    'UPLOAD_ALLOWED_MIME_TYPES',
    'UPLOAD_MAX_FILE_SIZE_MB',
  ]);

  let allowedExtensions = DEFAULT_EXTENSIONS;
  let allowedMimeTypes = DEFAULT_MIME_TYPES;
  let maxFileSizeMb = DEFAULT_MAX_FILE_SIZE_MB;

  try {
    if (settings.UPLOAD_ALLOWED_EXTENSIONS) {
      allowedExtensions = JSON.parse(settings.UPLOAD_ALLOWED_EXTENSIONS);
    }
  } catch { /* use default */ }

  try {
    if (settings.UPLOAD_ALLOWED_MIME_TYPES) {
      allowedMimeTypes = JSON.parse(settings.UPLOAD_ALLOWED_MIME_TYPES);
    }
  } catch { /* use default */ }

  if (settings.UPLOAD_MAX_FILE_SIZE_MB) {
    const parsed = Number(settings.UPLOAD_MAX_FILE_SIZE_MB);
    if (!isNaN(parsed) && parsed > 0) {
      maxFileSizeMb = parsed;
    }
  }

  return { allowedExtensions, allowedMimeTypes, maxFileSizeMb };
}

export function validateFileUpload(
  fileName: string,
  mimeType: string,
  fileSizeBytes: number,
  restrictions: UploadRestrictions,
): { allowed: boolean; reason?: string } {
  const ext = '.' + fileName.split('.').pop()?.toLowerCase();

  if (!restrictions.allowedExtensions.includes(ext)) {
    return { allowed: false, reason: `허용되지 않는 확장자입니다: ${ext}` };
  }

  if (!restrictions.allowedMimeTypes.includes(mimeType)) {
    return { allowed: false, reason: `허용되지 않는 파일 형식입니다: ${mimeType}` };
  }

  const maxBytes = restrictions.maxFileSizeMb * 1024 * 1024;
  if (fileSizeBytes > maxBytes) {
    return { allowed: false, reason: `파일 크기가 ${restrictions.maxFileSizeMb}MB를 초과합니다.` };
  }

  return { allowed: true };
}
