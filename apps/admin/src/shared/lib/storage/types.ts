/**
 * 스토리지 어댑터 인터페이스.
 *
 * Local(파일시스템) / Supabase Storage / S3 등을 동일한 API로 추상화.
 * 환경변수 `STORAGE_PROVIDER`로 구현체를 선택한다.
 */
export interface StorageUploadInput {
  /** 업로드될 파일 바이너리 */
  buffer: Buffer;
  /** 원본 파일명 (확장자 포함) */
  originalFilename: string;
  /** MIME 타입 */
  mimeType: string;
  /** 저장 카테고리 (서브 디렉토리) — 예: 'home' */
  category: string;
}

export interface StorageUploadResult {
  /** 공개 웹에서 접근 가능한 URL */
  url: string;
  /** 어댑터별 식별자 (로컬: 상대 경로, Supabase: storage object key) */
  storageKey: string;
  /** 실제 저장된 파일명 (타임스탬프 + UUID + 확장자) */
  filename: string;
}

export interface StorageAdapter {
  upload(input: StorageUploadInput): Promise<StorageUploadResult>;
  /**
   * 저장된 파일 삭제. 미디어 라이브러리에서 Media 레코드 삭제 시 호출.
   * 실패 시 throw하지 않고 내부적으로 로깅만 — 고아 파일은 별도 배치로 정리 가능.
   */
  delete(storageKey: string): Promise<void>;
  /**
   * 공개 URL에서 storageKey를 역계산. 어댑터가 만든 URL이 아니면 null.
   * Media 레코드는 URL만 저장하므로 삭제 시 이 메서드로 storageKey를 복구한다.
   */
  urlToStorageKey(url: string): string | null;
}
