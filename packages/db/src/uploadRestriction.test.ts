import { describe, expect, it } from 'vitest';

import { validateFileUpload } from './uploadRestriction';
import type { UploadRestrictions } from './uploadRestriction';

const DEFAULT_RESTRICTIONS: UploadRestrictions = {
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
  ],
  maxFileSizeMb: 10,
};

describe('validateFileUpload', () => {
  it('allows a valid file matching extension, MIME and size', () => {
    expect(
      validateFileUpload('photo.jpg', 'image/jpeg', 1024 * 1024, DEFAULT_RESTRICTIONS),
    ).toEqual({ allowed: true });
  });

  it('rejects a file with a disallowed extension', () => {
    const result = validateFileUpload(
      'malware.exe',
      'application/octet-stream',
      1024,
      DEFAULT_RESTRICTIONS,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('.exe');
  });

  it('rejects a file when the MIME type does not match the whitelist', () => {
    const result = validateFileUpload(
      'image.jpg',
      'application/octet-stream',
      1024,
      DEFAULT_RESTRICTIONS,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('application/octet-stream');
  });

  it('rejects a file that exceeds the max size', () => {
    const result = validateFileUpload(
      'large.pdf',
      'application/pdf',
      11 * 1024 * 1024,
      DEFAULT_RESTRICTIONS,
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('10MB');
  });

  it('allows a file exactly at the max size boundary', () => {
    expect(
      validateFileUpload(
        'exact.png',
        'image/png',
        10 * 1024 * 1024,
        DEFAULT_RESTRICTIONS,
      ),
    ).toEqual({ allowed: true });
  });

  it('rejects a file one byte over the max size', () => {
    const result = validateFileUpload(
      'over.png',
      'image/png',
      10 * 1024 * 1024 + 1,
      DEFAULT_RESTRICTIONS,
    );
    expect(result.allowed).toBe(false);
  });

  it('performs case-insensitive extension comparison', () => {
    expect(
      validateFileUpload('photo.JPG', 'image/jpeg', 1024, DEFAULT_RESTRICTIONS),
    ).toEqual({ allowed: true });
    expect(
      validateFileUpload('photo.PNG', 'image/png', 1024, DEFAULT_RESTRICTIONS),
    ).toEqual({ allowed: true });
  });

  it('allows a 0-byte file when extension and MIME are valid', () => {
    expect(
      validateFileUpload('empty.png', 'image/png', 0, DEFAULT_RESTRICTIONS),
    ).toEqual({ allowed: true });
  });

  it('rejects a filename with no dot (full name treated as extension)', () => {
    // 'malware'.split('.').pop() = 'malware' → ext = '.malware'
    const result = validateFileUpload(
      'malware',
      'application/octet-stream',
      1024,
      DEFAULT_RESTRICTIONS,
    );
    expect(result.allowed).toBe(false);
  });

  it('extracts the last segment after a dot when the name has multiple dots', () => {
    // 'archive.tar.gz' → pop() = 'gz' → ext = '.gz' (not in whitelist)
    const result = validateFileUpload(
      'archive.tar.gz',
      'application/gzip',
      1024,
      DEFAULT_RESTRICTIONS,
    );
    expect(result.allowed).toBe(false);
  });

  it('respects the caller-supplied restrictions object', () => {
    const strict: UploadRestrictions = {
      allowedExtensions: ['.png'],
      allowedMimeTypes: ['image/png'],
      maxFileSizeMb: 1,
    };
    expect(
      validateFileUpload('image.jpg', 'image/jpeg', 512, strict).allowed,
    ).toBe(false);
    expect(
      validateFileUpload('image.png', 'image/png', 512, strict),
    ).toEqual({ allowed: true });
  });

  it('rejects when file size exceeds the custom max', () => {
    const tight: UploadRestrictions = {
      allowedExtensions: ['.png'],
      allowedMimeTypes: ['image/png'],
      maxFileSizeMb: 1,
    };
    expect(
      validateFileUpload(
        'big.png',
        'image/png',
        2 * 1024 * 1024,
        tight,
      ).allowed,
    ).toBe(false);
  });
});
